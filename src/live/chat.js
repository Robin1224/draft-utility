// @ts-nocheck
import { live, LiveError } from 'svelte-realtime/server';
import { parseRoomCode } from '$lib/join-parse.js';
import { db } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { room_member } from '$lib/server/db/schema.js';
import { getRoomByPublicCode, topicForRoom } from '$lib/server/rooms.js';
import { filterMessage } from '$lib/chat-filter.js';

// ── Module-scope in-memory state (Pattern 1, mirrors draft-timers.js Map approach) ──

/**
 * Sliding window rate limiter state.
 * Key: `${userId|guestId}:${connectionId}:${roomId}` → array of timestamps
 * @type {Map<string, number[]>}
 */
const rateLimitMap = new Map();

/**
 * In-memory mute set per room.
 * Key: roomId → Set of userId|guestId strings
 * Exported so room.js can clear it on room cancellation (Pitfall 2 mitigation).
 * @type {Map<string, Set<string>>}
 */
export const muteMap = new Map();

// ── Rate limiter helpers (Pattern 4) ──

const RATE_WINDOW_MS = 5_000; // 5 second sliding window (D-13)
const RATE_MAX = 5; // max 5 messages per window (D-13)

/**
 * Returns true if the sender is rate-limited (silent drop).
 * Mutates rateLimitMap to record this message attempt.
 * @param {string} key
 * @returns {boolean}
 */
function isRateLimited(key) {
	const now = Date.now();
	const timestamps = rateLimitMap.get(key) ?? [];
	const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
	if (recent.length >= RATE_MAX) return true;
	recent.push(now);
	rateLimitMap.set(key, recent);
	return false;
}

// ── Chat topic helpers (D-05) ──

/**
 * @param {string} code  normalized public room code
 * @param {'all'|'teamA'|'teamB'|'spectators'} channel
 * @returns {string}
 */
function chatTopic(code, channel) {
	return `room:${code}:chat:${channel}`;
}

/** @param {unknown} code */
function normalizePublicCode(code) {
	return parseRoomCode(typeof code === 'string' ? code : String(code));
}

// ── Channel authorization helper (D-06) ──

/**
 * Verify the caller's ctx.user is authorized to publish/subscribe to `channel`.
 * Team information is cached on ctx.user.chatTeam at stream init time (Pitfall 1 avoidance).
 *
 * @param {{ role?: string, id?: string, guestId?: string, chatTeam?: string }} user
 * @param {'all'|'teamA'|'teamB'|'spectators'} channel
 * @throws {LiveError} FORBIDDEN if not authorized
 */
function assertChannelAuth(user, channel) {
	if (channel === 'all') return; // anyone can access 'all' during lobby phase
	if (channel === 'teamA') {
		if (user?.role !== 'player' || user?.chatTeam !== 'A') {
			throw new LiveError('FORBIDDEN', 'Team A players only');
		}
		return;
	}
	if (channel === 'teamB') {
		if (user?.role !== 'player' || user?.chatTeam !== 'B') {
			throw new LiveError('FORBIDDEN', 'Team B players only');
		}
		return;
	}
	if (channel === 'spectators') {
		// Spectators: guests OR players not assigned to any team
		if (user?.role === 'player' && (user?.chatTeam === 'A' || user?.chatTeam === 'B')) {
			throw new LiveError('FORBIDDEN', 'Spectators only');
		}
		return;
	}
	throw new LiveError('VALIDATION', 'Unknown channel');
}

// ── Team lookup helper (Pitfall 1 — cache team on ctx.user.chatTeam at stream init) ──

/**
 * Look up the player's team in room_member and cache it on ctx.user.chatTeam.
 * Avoids per-message DB reads (Pitfall 1).
 * @param {object} ctx
 * @param {string} roomId
 */
async function cachePlayerTeam(ctx, roomId) {
	if (ctx.user?.role !== 'player' || !ctx.user?.id) return;
	const rows = await db
		.select({ team: room_member.team })
		.from(room_member)
		.where(and(eq(room_member.room_id, roomId), eq(room_member.user_id, ctx.user.id)));
	if (rows.length > 0) ctx.user.chatTeam = rows[0].team ?? null;
}

// ── Live streams (Pattern 6) — one per channel topic (D-05) ──

export const chatAll = live.stream(
	(ctx, publicCode) => chatTopic(normalizePublicCode(publicCode), 'all'),
	async (ctx, publicCode) => {
		const code = normalizePublicCode(publicCode);
		const roomRow = await getRoomByPublicCode(db, code);
		if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');
		await cachePlayerTeam(ctx, roomRow.id);
		return { messages: [] }; // no history (D-07)
	},
	{ merge: 'set', access: () => true }
);

export const chatTeamA = live.stream(
	(ctx, publicCode) => chatTopic(normalizePublicCode(publicCode), 'teamA'),
	async (ctx, publicCode) => {
		if (ctx.user?.role !== 'player') throw new LiveError('FORBIDDEN', 'Players only');
		const code = normalizePublicCode(publicCode);
		const roomRow = await getRoomByPublicCode(db, code);
		if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');
		await cachePlayerTeam(ctx, roomRow.id);
		if (ctx.user.chatTeam !== 'A') throw new LiveError('FORBIDDEN', 'Team A players only');
		return { messages: [] };
	},
	{ merge: 'set', access: () => true }
);

export const chatTeamB = live.stream(
	(ctx, publicCode) => chatTopic(normalizePublicCode(publicCode), 'teamB'),
	async (ctx, publicCode) => {
		if (ctx.user?.role !== 'player') throw new LiveError('FORBIDDEN', 'Players only');
		const code = normalizePublicCode(publicCode);
		const roomRow = await getRoomByPublicCode(db, code);
		if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');
		await cachePlayerTeam(ctx, roomRow.id);
		if (ctx.user.chatTeam !== 'B') throw new LiveError('FORBIDDEN', 'Team B players only');
		return { messages: [] };
	},
	{ merge: 'set', access: () => true }
);

export const chatSpectators = live.stream(
	(ctx, publicCode) => chatTopic(normalizePublicCode(publicCode), 'spectators'),
	async (ctx, publicCode) => {
		const code = normalizePublicCode(publicCode);
		const roomRow = await getRoomByPublicCode(db, code);
		if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');
		await cachePlayerTeam(ctx, roomRow.id);
		// Reject players on a team — they must use their team channel (D-06)
		if (ctx.user?.chatTeam === 'A' || ctx.user?.chatTeam === 'B') {
			throw new LiveError('FORBIDDEN', 'Spectators only');
		}
		return { messages: [] };
	},
	{ merge: 'set', access: () => true }
);

// ── sendMessage RPC (CHAT-01, CHAT-02, CHAT-03, CHAT-04) ──

export const sendMessage = live(async (ctx, publicCode, payload) => {
	const p = payload && typeof payload === 'object' ? payload : {};
	const rawBody = typeof p.body === 'string' ? p.body : '';
	const channel = typeof p.channel === 'string' ? p.channel : 'all';

	// 1. Filter pipeline (CHAT-04) — length cap, NFKC normalize, zero-width strip, slur check
	const filtered = filterMessage(rawBody);
	if (filtered.blocked) {
		if (filtered.reason === 'TOO_LONG') {
			throw new LiveError('VALIDATION', 'Message too long. Max 500 characters.');
		}
		return; // slur: silent drop (D-11, never broadcast raw message)
	}

	const code = normalizePublicCode(publicCode);
	const roomRow = await getRoomByPublicCode(db, code);
	if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');

	// Ensure chatTeam is cached (Pitfall 1 — may not be set if user joined without using the stream)
	if (ctx.user?.role === 'player' && ctx.user.chatTeam === undefined) {
		await cachePlayerTeam(ctx, roomRow.id);
	}

	// 2. Authorization check (D-06) — caller must be authorized for the requested channel
	assertChannelAuth(ctx.user, channel);

	// 3. Mute check (D-16, HOST-04) — muted spectators silently dropped
	const senderId = ctx.user?.id ?? ctx.user?.guestId;
	const muteSet = muteMap.get(roomRow.id);
	if (senderId && muteSet?.has(senderId)) {
		return; // silent drop — muted user not notified (D-16)
	}

	// 4. Rate limit check (CHAT-03, D-12) — key: userId|guestId + connectionId + roomId
	// svelte-realtime ctx may not expose a connection-specific ID; use senderId + roomId
	// as the key (acceptable for v1 per RESEARCH.md Open Question 2)
	const rlKey = `${senderId ?? 'anon'}:${ctx.id ?? 'conn'}:${roomRow.id}`;
	if (isRateLimited(rlKey)) {
		return; // silent drop — rate limited (D-12, D-13)
	}

	// 5. Publish to the authorized channel topic (CHAT-01, CHAT-02)
	const topic = chatTopic(code, channel);
	const senderName =
		ctx.user?.name ??
		(ctx.user?.guestId ? `Guest ${ctx.user.guestId.slice(0, 6)}` : 'Unknown');
	ctx.publish(topic, 'message', {
		sender: senderName,
		body: filtered.body,
		ts: Date.now()
	});
});

// ── muteMember RPC (HOST-04) ──

export const muteMember = live(async (ctx, publicCode, payload) => {
	// Only authenticated players (and specifically the host) can mute
	if (ctx.user?.role !== 'player' || !ctx.user?.id) {
		throw new LiveError('UNAUTHORIZED', 'Sign in required');
	}
	const code = normalizePublicCode(publicCode);
	const roomRow = await getRoomByPublicCode(db, code);
	if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');
	if (roomRow.host_user_id !== ctx.user.id) {
		throw new LiveError('FORBIDDEN', 'Host only');
	}
	const p = payload && typeof payload === 'object' ? payload : {};
	const targetId =
		(typeof p.userId === 'string' && p.userId) ||
		(typeof p.guestId === 'string' && p.guestId) ||
		null;
	if (!targetId) throw new LiveError('VALIDATION', 'Specify userId or guestId');

	if (!muteMap.has(roomRow.id)) muteMap.set(roomRow.id, new Set());
	muteMap.get(roomRow.id).add(targetId);

	// Publish muteUpdated to the lobby topic so host's spectator panel reflects new mute state (D-17)
	// Only publish the mutedIds set — the client merges into local state (Pattern 5 Option A)
	ctx.publish(topicForRoom(code), 'patch', { mutedIds: [...muteMap.get(roomRow.id)] });
});

export const unmuteMember = live(async (ctx, publicCode, payload) => {
	if (ctx.user?.role !== 'player' || !ctx.user?.id) {
		throw new LiveError('UNAUTHORIZED', 'Sign in required');
	}
	const code = normalizePublicCode(publicCode);
	const roomRow = await getRoomByPublicCode(db, code);
	if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');
	if (roomRow.host_user_id !== ctx.user.id) {
		throw new LiveError('FORBIDDEN', 'Host only');
	}
	const p = payload && typeof payload === 'object' ? payload : {};
	const targetId =
		(typeof p.userId === 'string' && p.userId) ||
		(typeof p.guestId === 'string' && p.guestId) ||
		null;
	if (!targetId) throw new LiveError('VALIDATION', 'Specify userId or guestId');

	muteMap.get(roomRow.id)?.delete(targetId);

	ctx.publish(topicForRoom(code), 'patch', { mutedIds: [...(muteMap.get(roomRow.id) ?? [])] });
});
