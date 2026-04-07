// @ts-nocheck
import { live, LiveError } from 'svelte-realtime/server';
import { and, eq, isNotNull } from 'drizzle-orm';
import { parseRoomCode } from '$lib/join-parse.js';
import { db } from '$lib/server/db';
import { room_member, draft_action } from '$lib/server/db/schema.js';
import { getRoomByPublicCode, topicForRoom } from '$lib/server/rooms.js';
import {
	writeDraftAction,
	loadDraftSnapshot,
	completeDraft,
	updateDraftState,
	advanceTurnIfCurrent
} from '$lib/server/draft.js';
import classes from '$lib/catalog/classes.json' with { type: 'json' };
export { clearRoomTimer } from './draft-timers.js';
import { clearRoomTimer, scheduleTimer } from './draft-timers.js';

/**
 * Auto-advance turn after timer expiry. No-op if the turn was already resolved
 * by a real pick/ban (advanceTurnIfCurrent returns false).
 *
 * Exported so room.js can reference it for the first turn timer via dynamic import.
 *
 * @param {string} publicCode
 * @param {number} expectedTurnIndex
 * @param {any} [platform]  - svelte-realtime platform for reactive publish; null when called from grace timer
 * @param {Function|null} [publishFn]  - raw publish callable threaded from disconnectGraceExpired (ctx.publish); used when platform is null
 */
export async function autoAdvanceTurn(publicCode, expectedTurnIndex, platform = null, publishFn = null) {
	const code = parseRoomCode(publicCode);
	const roomRow = await getRoomByPublicCode(db, code);
	if (!roomRow || roomRow.phase !== 'drafting') return;

	const draftState =
		typeof roomRow.draft_state === 'string'
			? JSON.parse(roomRow.draft_state)
			: roomRow.draft_state;
	if (!draftState) return;

	const nextIndex = expectedTurnIndex + 1;
	const isLast = nextIndex >= draftState.script.length;
	const newTurnEndsAt = isLast ? null : new Date(Date.now() + draftState.timerMs).toISOString();

	const advanced = await advanceTurnIfCurrent(
		db,
		roomRow.id,
		expectedTurnIndex,
		nextIndex,
		newTurnEndsAt
	);
	if (!advanced) return; // real pick/ban already advanced — no-op

	// Record the timeout action
	try {
		await writeDraftAction(db, {
			roomId: roomRow.id,
			turnIndex: expectedTurnIndex,
			team: draftState.script[expectedTurnIndex].team,
			action: 'timeout',
			championId: null
		});
	} catch (e) {
		if (e === 'DUPLICATE_TURN') return; // race: someone else won this turn
		throw e;
	}

	if (isLast) {
		await completeDraft(db, roomRow.id);
		// Publish review snapshot unconditionally — platform may be null (grace-timer path).
		// publishFn is threaded from disconnectGraceExpired which holds ctx.publish.
		const pub = platform ? platform.publish.bind(platform) : publishFn;
		if (pub) {
			try {
				const snap = await loadDraftSnapshot(db, code);
				if (snap) pub(topicForRoom(code), 'set', snap);
			} catch {
				// publish failure is non-fatal — clients hydrate on reconnect
			}
		}
	} else {
		scheduleTimer(roomRow.id, draftState.timerMs, () => autoAdvanceTurn(code, nextIndex, platform));
		// DISC-pitfall-2: publish snapshot reactively when platform context is available,
		// so timer-driven advances reach all subscribers without waiting for next interaction.
		if (platform) {
			try {
				const snap = await loadDraftSnapshot(db, code);
				if (snap) platform.publish(topicForRoom(code), 'set', snap);
			} catch {
				// publish failure is non-fatal — clients hydrate on reconnect
			}
		}
	}
}

export const pickBan = live(async (ctx, publicCode, payload) => {
	if (ctx.user?.role !== 'player' || !ctx.user?.id) {
		throw new LiveError('UNAUTHORIZED', 'Sign in required');
	}
	const code = parseRoomCode(typeof publicCode === 'string' ? publicCode : String(publicCode));
	const roomRow = await getRoomByPublicCode(db, code);
	if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');
	if (roomRow.phase !== 'drafting') throw new LiveError('FORBIDDEN', 'Draft not in progress');

	const p = payload && typeof payload === 'object' ? payload : {};
	const championId = typeof p.championId === 'string' ? p.championId : null;
	const actionType = p.action === 'pick' || p.action === 'ban' ? p.action : null;
	if (!championId || !actionType) {
		throw new LiveError('VALIDATION', 'championId and action required');
	}

	// Validate champion exists in catalog
	if (!classes.some((c) => c.id === championId)) {
		throw new LiveError('VALIDATION', 'Unknown champion');
	}

	const draftState =
		typeof roomRow.draft_state === 'string'
			? JSON.parse(roomRow.draft_state)
			: roomRow.draft_state;
	if (!draftState) throw new LiveError('FORBIDDEN', 'Draft state not initialized');

	const currentTurn = draftState.script[draftState.turnIndex];
	if (!currentTurn) throw new LiveError('FORBIDDEN', 'Draft already complete');

	// Validate caller is captain of the active turn's team
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
	if (!isCaptain) throw new LiveError('FORBIDDEN', 'Not your turn');

	// Validate champion not already used in this room's draft
	const existing = await db
		.select({ id: draft_action.id })
		.from(draft_action)
		.where(and(eq(draft_action.room_id, roomRow.id), eq(draft_action.champion_id, championId)))
		.limit(1);
	if (existing.length > 0) throw new LiveError('FORBIDDEN', 'Champion already used');

	// Cancel the timer — pick/ban wins this turn
	clearRoomTimer(roomRow.id);

	// Write the action
	try {
		await writeDraftAction(db, {
			roomId: roomRow.id,
			turnIndex: draftState.turnIndex,
			team: currentTurn.team,
			action: actionType,
			championId
		});
	} catch (e) {
		if (e === 'DUPLICATE_TURN') throw new LiveError('FORBIDDEN', 'Turn already resolved');
		throw e;
	}

	const nextIndex = draftState.turnIndex + 1;
	const isLast = nextIndex >= draftState.script.length;

	if (isLast) {
		await completeDraft(db, roomRow.id);
	} else {
		const turnEndsAt = new Date(Date.now() + draftState.timerMs).toISOString();
		await updateDraftState(db, roomRow.id, { ...draftState, turnIndex: nextIndex, turnEndsAt });
		scheduleTimer(roomRow.id, draftState.timerMs, () => autoAdvanceTurn(code, nextIndex, ctx.platform));
	}

	const snap = await loadDraftSnapshot(db, code);
	ctx.publish(topicForRoom(code), 'set', snap);
	return snap;
});
