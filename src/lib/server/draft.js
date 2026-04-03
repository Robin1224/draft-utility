// @ts-nocheck
import { eq, asc, sql } from 'drizzle-orm';
import { draft_action, room } from './db/schema.js';
import { getRoomByPublicCode, loadLobbySnapshot } from '$lib/server/rooms.js';

/** @param {unknown} err */
function isUniqueViolation(err) {
	if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
		return true;
	}
	if (err && typeof err === 'object' && 'cause' in err && err.cause) {
		return isUniqueViolation(err.cause);
	}
	return false;
}

/**
 * Insert a draft action row. Throws 'DUPLICATE_TURN' on unique constraint violation.
 *
 * @param {any} db
 * @param {{ roomId: string, turnIndex: number, team: string, action: string, championId: string | null }} args
 */
export async function writeDraftAction(db, { roomId, turnIndex, team, action, championId }) {
	try {
		await db.insert(draft_action).values({
			room_id: roomId,
			turn_index: turnIndex,
			team,
			action,
			champion_id: championId ?? null
		});
	} catch (e) {
		if (isUniqueViolation(e)) throw 'DUPLICATE_TURN';
		throw e;
	}
}

/**
 * Load a draft snapshot — lobby snapshot extended with draftState and actions array.
 * Returns null if room not found.
 *
 * @param {any} db
 * @param {string} publicCode
 */
export async function loadDraftSnapshot(db, publicCode) {
	const roomRow = await getRoomByPublicCode(db, publicCode);
	if (!roomRow) return null;
	const base = await loadLobbySnapshot(db, publicCode);
	if (!base) return null;
	const rawState = roomRow.draft_state;
	const draftState =
		rawState != null ? (typeof rawState === 'string' ? JSON.parse(rawState) : rawState) : null;
	const actions = await db
		.select()
		.from(draft_action)
		.where(eq(draft_action.room_id, roomRow.id))
		.orderBy(asc(draft_action.turn_index));
	return { ...base, draftState, actions };
}

/**
 * Mark a draft as ended. Sets phase='ended', ended_at=now, updated_at=now.
 *
 * @param {any} db
 * @param {string} roomId
 */
export async function completeDraft(db, roomId) {
	const now = new Date();
	await db
		.update(room)
		.set({ phase: 'ended', ended_at: now, updated_at: now })
		.where(eq(room.id, roomId));
}

/**
 * Overwrite room.draft_state JSONB and bump updated_at.
 *
 * @param {any} db
 * @param {string} roomId
 * @param {import('./db/schema.js').DraftState} draftState
 */
export async function updateDraftState(db, roomId, draftState) {
	await db
		.update(room)
		.set({ draft_state: draftState, updated_at: new Date() })
		.where(eq(room.id, roomId));
}

/**
 * Race-safe turn advance. Updates draft_state only when turnIndex still matches expectedTurnIndex.
 * Returns true if 1 row updated, false if 0 (already advanced by another writer).
 *
 * @param {any} db
 * @param {string} roomId
 * @param {number} expectedTurnIndex
 * @param {number} newTurnIndex
 * @param {string} newTurnEndsAt
 * @returns {Promise<boolean>}
 */
export async function advanceTurnIfCurrent(db, roomId, expectedTurnIndex, newTurnIndex, newTurnEndsAt) {
	const result = await db
		.update(room)
		.set({
			draft_state: sql`jsonb_set(jsonb_set(draft_state, '{turnIndex}', ${String(newTurnIndex)}::text::jsonb), '{turnEndsAt}', ${JSON.stringify(newTurnEndsAt)}::jsonb)`,
			updated_at: new Date()
		})
		.where(
			sql`${room.id} = ${roomId} AND (${room.draft_state}->>'turnIndex')::int = ${expectedTurnIndex}`
		)
		.returning({ id: room.id });
	return result.length > 0;
}
