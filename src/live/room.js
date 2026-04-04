// @ts-nocheck — ctx.user shape comes from hooks.ws.js upgrade(); guestId added in 02-04.
import { live, LiveError } from 'svelte-realtime/server';
import { parseRoomCode } from '$lib/join-parse.js';
import { db } from '$lib/server/db';
import { and, eq, isNotNull } from 'drizzle-orm';
import {
	DRAFT_NOT_READY,
	INVALID_KICK_TARGET,
	KICK_TARGET_MISSING,
	LOBBY_PHASE_REQUIRED,
	NOT_HOST,
	PLAYER_NOT_ON_TEAM,
	TEAM_FULL,
	cancelDraftNoCaption,
	cancelRoomAsHost,
	getRoomByPublicCode,
	joinTeamForUser,
	kickMember as kickMemberDb,
	loadLobbySnapshot,
	movePlayer as movePlayerDb,
	promoteCaptain,
	startDraftIfReady,
	startDraftWithSettings,
	topicForRoom,
	upsertGuestSpectator
} from '$lib/server/rooms.js';
import { loadDraftSnapshot, updateDraftState } from '$lib/server/draft.js';
import { room_member } from '$lib/server/db/schema.js';
import { DEFAULT_SCRIPT, DEFAULT_TIMER_MS } from '$lib/draft-script.js';
import { clearRoomTimer, scheduleTimer } from './draft-timers.js';
import { autoAdvanceTurn } from './draft.js';

/** @param {unknown} e */
function mapRoomMutationError(e) {
	if (e === NOT_HOST) {
		return new LiveError('FORBIDDEN', 'Host only');
	}
	if (e === KICK_TARGET_MISSING) {
		return new LiveError('NOT_FOUND', 'Member not found');
	}
	if (e === INVALID_KICK_TARGET) {
		return new LiveError('VALIDATION', 'Specify exactly one of userId or guestId');
	}
	if (e === LOBBY_PHASE_REQUIRED) {
		return new LiveError('FORBIDDEN', 'Only allowed in lobby');
	}
	if (e === DRAFT_NOT_READY) {
		return new LiveError('FORBIDDEN', 'Each team needs a captain before draft');
	}
	if (e === PLAYER_NOT_ON_TEAM) {
		return new LiveError('FORBIDDEN', 'Player is not on a team');
	}
	if (e === TEAM_FULL) {
		return new LiveError('FORBIDDEN', 'Team is full');
	}
	if (e instanceof Error && e.message === 'ROOM_NOT_FOUND') {
		return new LiveError('NOT_FOUND', 'Room not found');
	}
	return null;
}

/** @param {unknown} code */
function normalizePublicCode(code) {
	return parseRoomCode(typeof code === 'string' ? code : String(code));
}

/**
 * Called when the 30-second grace timer expires without the captain reconnecting.
 * Promotes an eligible team member or cancels the draft (DISC-02, DISC-03).
 *
 * @param {string} publicCode
 * @param {string} disconnectedUserId
 * @param {Function} publish - ctx.publish from onUnsubscribe context
 */
async function disconnectGraceExpired(publicCode, disconnectedUserId, publish) {
	const code = normalizePublicCode(publicCode);
	const roomRow = await getRoomByPublicCode(db, code);
	if (!roomRow || roomRow.phase !== 'drafting') return; // draft already ended
	const ds = typeof roomRow.draft_state === 'string'
		? JSON.parse(roomRow.draft_state)
		: roomRow.draft_state;
	if (!ds || !ds.paused) return; // captain already reconnected

	const currentTurn = ds.script[ds.turnIndex];
	if (!currentTurn) return;

	const promoted = await promoteCaptain(db, roomRow.id, currentTurn.team, disconnectedUserId);

	if (promoted) {
		// DISC-02: clear pause, restart turn timer from full timerMs
		const newTurnEndsAt = new Date(Date.now() + ds.timerMs).toISOString();
		await updateDraftState(db, roomRow.id, {
			...ds,
			paused: false,
			pausedUserId: undefined,
			graceEndsAt: undefined,
			turnEndsAt: newTurnEndsAt
		});
		scheduleTimer(roomRow.id, ds.timerMs, () => autoAdvanceTurn(code, ds.turnIndex));
		const snap = await loadDraftSnapshot(db, code);
		if (snap) publish(topicForRoom(code), 'set', snap);
	} else {
		// DISC-03: no eligible member — cancel draft
		// Load snapshot BEFORE cancellation: getRoomByPublicCode hides rooms once ended_at is set
		clearRoomTimer(roomRow.id);
		const snapBeforeCancel = await loadDraftSnapshot(db, code);
		await cancelDraftNoCaption(db, roomRow.id);
		if (snapBeforeCancel) publish(topicForRoom(code), 'set', { ...snapBeforeCancel, phase: 'cancelled' });
	}
}

export const lobby = live.stream(
	(ctx, publicCode) => topicForRoom(normalizePublicCode(publicCode)),
	async (ctx, publicCode) => {
		const code = normalizePublicCode(publicCode);
		const roomRow = await getRoomByPublicCode(db, code);
		if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');
		if (ctx.user?.role === 'guest' && ctx.user?.guestId) {
			await upsertGuestSpectator(db, roomRow.id, ctx.user.guestId);
		}
		// DISC-04: return full draft snapshot when drafting, lobby snapshot otherwise
		if (roomRow.phase === 'drafting') {
			const snap = await loadDraftSnapshot(db, code);
			if (!snap) throw new LiveError('NOT_FOUND', 'Room not found');
			// DISC-04: if captain reconnects, clear pause and resume draft
			if (
				snap.draftState?.paused &&
				snap.draftState?.pausedUserId === ctx.user?.id
			) {
				const ds = snap.draftState;
				const newTurnEndsAt = new Date(Date.now() + ds.timerMs).toISOString();
				clearRoomTimer(roomRow.id + ':grace');
				await updateDraftState(db, roomRow.id, {
					...ds,
					paused: false,
					pausedUserId: undefined,
					graceEndsAt: undefined,
					turnEndsAt: newTurnEndsAt
				});
				scheduleTimer(roomRow.id, ds.timerMs, () => autoAdvanceTurn(code, ds.turnIndex));
				const resumed = await loadDraftSnapshot(db, code);
				if (resumed) ctx.publish(topicForRoom(code), 'set', resumed);
				return resumed ?? snap;
			}
			return snap;
		}
		const snap = await loadLobbySnapshot(db, code);
		if (!snap) throw new LiveError('NOT_FOUND', 'Room not found');
		return snap;
	},
	{
		merge: 'set',
		access: () => true,
		onUnsubscribe: async (ctx, topic) => {
			// Only react to authenticated players
			if (ctx.user?.role !== 'player' || !ctx.user?.id) return;
			// Derive publicCode from topic ('lobby:' + code)
			const code = topic.replace(/^lobby:/, '');
			const roomRow = await getRoomByPublicCode(db, code);
			if (!roomRow || roomRow.phase !== 'drafting') return;
			const ds = typeof roomRow.draft_state === 'string'
				? JSON.parse(roomRow.draft_state)
				: roomRow.draft_state;
			if (!ds) return;
			// Check if disconnecting user is captain of the active turn's team
			const currentTurn = ds.script[ds.turnIndex];
			if (!currentTurn) return;
			const captains = await db
				.select({ userId: room_member.user_id })
				.from(room_member)
				.where(
					and(
						eq(room_member.room_id, roomRow.id),
						eq(room_member.team, currentTurn.team),
						eq(room_member.is_captain, true),
						isNotNull(room_member.user_id)
					)
				);
			const isCaptain = captains.some((c) => c.userId === ctx.user.id);
			if (!isCaptain) return;
			// DISC-01: pause draft, start grace timer
			const graceMs = 30_000;
			const graceEndsAt = new Date(Date.now() + graceMs).toISOString();
			clearRoomTimer(roomRow.id); // cancel current turn timer
			await updateDraftState(db, roomRow.id, {
				...ds,
				paused: true,
				pausedUserId: ctx.user.id,
				graceEndsAt
			});
			const snap = await loadDraftSnapshot(db, code);
			if (snap) ctx.publish(topic, 'set', snap);
			// Schedule grace expiry
			scheduleTimer(
				roomRow.id + ':grace',
				graceMs,
				() => disconnectGraceExpired(code, ctx.user.id, ctx.publish)
			);
		}
	}
);

export const joinTeam = live(async (ctx, publicCode, team) => {
	if (ctx.user?.role !== 'player' || !ctx.user?.id) {
		throw new LiveError('UNAUTHORIZED', 'Sign in to join a team');
	}
	if (team !== 'A' && team !== 'B') throw new LiveError('VALIDATION', 'Invalid team');
	const code = normalizePublicCode(publicCode);
	const roomRow = await getRoomByPublicCode(db, code);
	if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');
	if (roomRow.phase !== 'lobby') throw new LiveError('FORBIDDEN', 'Team changes are locked');
	try {
		await joinTeamForUser(db, { roomId: roomRow.id, userId: ctx.user.id, team });
	} catch (e) {
		if (e === TEAM_FULL) {
			throw new LiveError('FORBIDDEN', 'Team is full');
		}
		throw e;
	}
	const snap = await loadLobbySnapshot(db, code);
	ctx.publish(topicForRoom(code), 'set', snap);
	return snap;
});

export const kickMember = live(async (ctx, publicCode, payload) => {
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
	const targetUserId =
		p.userId != null && p.userId !== '' ? String(/** @type {unknown} */ (p.userId)) : undefined;
	const targetGuestId =
		p.guestId != null && p.guestId !== '' ? String(/** @type {unknown} */ (p.guestId)) : undefined;
	try {
		await kickMemberDb(db, {
			roomId: roomRow.id,
			hostUserId: ctx.user.id,
			targetUserId,
			targetGuestId
		});
	} catch (e) {
		const mapped = mapRoomMutationError(e);
		if (mapped) throw mapped;
		throw e;
	}
	const snap = await loadLobbySnapshot(db, code);
	ctx.publish(topicForRoom(code), 'set', snap);
	return snap;
});

export const movePlayer = live(async (ctx, publicCode, payload) => {
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
	if (p.toTeam !== 'A' && p.toTeam !== 'B') {
		throw new LiveError('VALIDATION', 'Invalid team');
	}
	if (!p.userId || typeof p.userId !== 'string') {
		throw new LiveError('VALIDATION', 'userId required');
	}
	try {
		await movePlayerDb(db, {
			roomId: roomRow.id,
			hostUserId: ctx.user.id,
			userId: p.userId,
			toTeam: p.toTeam
		});
	} catch (e) {
		const mapped = mapRoomMutationError(e);
		if (mapped) throw mapped;
		throw e;
	}
	const snap = await loadLobbySnapshot(db, code);
	ctx.publish(topicForRoom(code), 'set', snap);
	return snap;
});

export const startDraft = live(async (ctx, publicCode, payload) => {
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

	// Resolve script: validate custom or fall back to default
	let script = DEFAULT_SCRIPT;
	if (Array.isArray(p.script) && p.script.length > 0) {
		const valid = p.script.every(
			(t) => (t.team === 'A' || t.team === 'B') && (t.action === 'pick' || t.action === 'ban')
		);
		if (!valid) {
			throw new LiveError(
				'VALIDATION',
				'Invalid script: each turn needs team A|B and action pick|ban'
			);
		}
		script = p.script;
	}

	// Resolve timer
	let timerMs = DEFAULT_TIMER_MS;
	if (typeof p.timerMs === 'number') {
		if (p.timerMs < 10_000 || p.timerMs > 120_000) {
			throw new LiveError('VALIDATION', 'timerMs must be between 10000 and 120000');
		}
		timerMs = p.timerMs;
	}

	try {
		await startDraftWithSettings(db, { roomId: roomRow.id, hostUserId: ctx.user.id, script, timerMs });
	} catch (e) {
		const mapped = mapRoomMutationError(e);
		if (mapped) throw mapped;
		throw e;
	}

	// Schedule the first turn timer; pass ctx.platform for reactive publish on timer advance (DISC-pitfall-2)
	scheduleTimer(roomRow.id, timerMs, () => autoAdvanceTurn(code, 0, ctx.platform));

	const snap = await loadDraftSnapshot(db, code);
	ctx.publish(topicForRoom(code), 'set', snap);
	return snap;
});

export const cancelRoom = live(async (ctx, publicCode) => {
	if (ctx.user?.role !== 'player' || !ctx.user?.id) {
		throw new LiveError('UNAUTHORIZED', 'Sign in required');
	}
	const code = normalizePublicCode(publicCode);
	const roomRow = await getRoomByPublicCode(db, code);
	if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');
	if (roomRow.host_user_id !== ctx.user.id) {
		throw new LiveError('FORBIDDEN', 'Host only');
	}
	clearRoomTimer(roomRow.id); // Cancel draft timer if active (prevents stale timer firing after room ends)
	try {
		await cancelRoomAsHost(db, { roomId: roomRow.id, hostUserId: ctx.user.id });
	} catch (e) {
		const mapped = mapRoomMutationError(e);
		if (mapped) throw mapped;
		throw e;
	}
	const snap = await loadLobbySnapshot(db, code);
	ctx.publish(topicForRoom(code), 'set', snap);
	return snap;
});
