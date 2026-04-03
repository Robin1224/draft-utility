import { and, asc, count, eq, isNotNull, sql } from 'drizzle-orm';
import { customAlphabet } from 'nanoid';
import { parseRoomCode } from '$lib/join-parse.js';
import {
	shouldAbandonLobby,
	shouldHideRoomFromPublic
} from './room-lifecycle.js';
import { room, room_member, user } from './db/schema.js';

export const ROOM_CODE_ALPHABET =
	'23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
export const CODE_LENGTH = 7;

const genPublicCode = customAlphabet(ROOM_CODE_ALPHABET, CODE_LENGTH);

export function generatePublicCode() {
	return genPublicCode();
}

/** @param {string} publicCode */
export function topicForRoom(publicCode) {
	return 'lobby:' + publicCode;
}

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

const CREATE_ROOM_MAX_ATTEMPTS = 5;

/**
 * @param {any} db Drizzle database instance
 * @param {string} hostUserId
 */
export async function createRoom(db, hostUserId) {
	for (let attempt = 0; attempt < CREATE_ROOM_MAX_ATTEMPTS; attempt++) {
		const public_code = generatePublicCode();
		try {
			const [row] = await db
				.insert(room)
				.values({
					public_code,
					host_user_id: hostUserId,
					phase: 'lobby'
				})
				.returning({
					id: room.id,
					public_code: room.public_code,
					host_user_id: room.host_user_id,
					phase: room.phase
				});
			return row;
		} catch (e) {
			if (isUniqueViolation(e) && attempt < CREATE_ROOM_MAX_ATTEMPTS - 1) {
				continue;
			}
			throw e;
		}
	}
}

/**
 * Resolve a room by public join code for HTTP loads and lobby snapshots.
 *
 * **ROOM-08 closure:** Rows with `phase === 'ended'` or non-null `ended_at` are not returned.
 * Lobby rows idle for 24h+ since `created_at` are lazily ended here (see `room-lifecycle.js`).
 *
 * **Host cancel:** {@link cancelRoomAsHost} (plan 02-04) sets `phase` to `ended` and `ended_at`.
 * **Phase 3 — draft completion:** When a draft finishes, the server must set `phase` and `ended_at`
 * (same shape as cancel) so join-by-code stays closed for finished rooms.
 *
 * @param {any} db Drizzle database instance
 * @param {string} code
 */
export async function getRoomByPublicCode(db, code) {
	const normalized = parseRoomCode(code);
	const rows = await db.select().from(room).where(eq(room.public_code, normalized)).limit(1);
	const row = rows[0];
	if (row == null) return null;

	const now = new Date();
	if (shouldHideRoomFromPublic(row, now)) {
		return null;
	}
	if (shouldAbandonLobby(row, now)) {
		const endNow = new Date();
		await db
			.update(room)
			.set({ phase: 'ended', ended_at: endNow, updated_at: endNow })
			.where(and(eq(room.id, row.id), eq(room.phase, 'lobby')));
		return null;
	}
	return row;
}

/** Error code thrown by {@link joinTeamForUser} when a team already has 3 players. */
export const TEAM_FULL = 'TEAM_FULL';

/** Caller is not the room host. */
export const NOT_HOST = 'NOT_HOST';

/** No matching member row for kick target. */
export const KICK_TARGET_MISSING = 'KICK_TARGET_MISSING';

/** Kick payload must set exactly one of userId or guestId. */
export const INVALID_KICK_TARGET = 'INVALID_KICK_TARGET';

/** Operation requires room.phase === 'lobby'. */
export const LOBBY_PHASE_REQUIRED = 'LOBBY_PHASE_REQUIRED';

/** startDraft: each team needs ≥1 signed-in player and ≥1 captain. */
export const DRAFT_NOT_READY = 'DRAFT_NOT_READY';

/** movePlayer: target must be on team A or B. */
export const PLAYER_NOT_ON_TEAM = 'PLAYER_NOT_ON_TEAM';

/**
 * @param {{ host_user_id: string }} roomRow
 * @param {string} userId
 */
export function assertHost(roomRow, userId) {
	if (roomRow.host_user_id !== userId) {
		throw NOT_HOST;
	}
}

/**
 * @typedef {object} LobbyMember
 * @property {string | null} userId
 * @property {string | null} guestId
 * @property {string} displayName
 * @property {boolean} isCaptain
 * @property {boolean} isHost
 */

/**
 * @typedef {object} LobbySnapshot
 * @property {string} publicCode
 * @property {string} roomId
 * @property {string} phase
 * @property {string} hostUserId
 * @property {{ A: LobbyMember[], B: LobbyMember[] }} teams
 * @property {LobbyMember[]} spectators
 */

/**
 * @param {any} db
 * @param {string} publicCode
 * @returns {Promise<LobbySnapshot | null>}
 */
export async function loadLobbySnapshot(db, publicCode) {
	const normalized = parseRoomCode(publicCode);
	const roomRow = await getRoomByPublicCode(db, normalized);
	if (!roomRow) return null;

	const rows = await db
		.select({
			userId: room_member.user_id,
			guestId: room_member.guest_id,
			team: room_member.team,
			isCaptain: room_member.is_captain,
			joinedAt: room_member.joined_at,
			userName: user.name
		})
		.from(room_member)
		.leftJoin(user, eq(room_member.user_id, user.id))
		.where(eq(room_member.room_id, roomRow.id));

	const sorted = [...rows].sort(
		(a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
	);

	/** @type {LobbyMember[]} */
	const teamA = [];
	/** @type {LobbyMember[]} */
	const teamB = [];
	/** @type {LobbyMember[]} */
	const spectators = [];

	for (const r of sorted) {
		const member = {
			userId: r.userId,
			guestId: r.guestId,
			displayName: r.userName ?? 'Guest',
			isCaptain: r.isCaptain,
			isHost: r.userId != null && r.userId === roomRow.host_user_id
		};
		if (r.team === 'A') teamA.push(member);
		else if (r.team === 'B') teamB.push(member);
		else spectators.push(member);
	}

	return {
		publicCode: roomRow.public_code,
		roomId: roomRow.id,
		phase: roomRow.phase,
		hostUserId: roomRow.host_user_id,
		teams: { A: teamA, B: teamB },
		spectators
	};
}

/**
 * @param {any} db
 * @param {string} roomId
 * @param {string} guestId
 */
export async function upsertGuestSpectator(db, roomId, guestId) {
	await db
		.insert(room_member)
		.values({
			room_id: roomId,
			guest_id: guestId,
			user_id: null,
			team: null,
			is_captain: false
		})
		.onConflictDoNothing({ target: [room_member.room_id, room_member.guest_id] });
}

/**
 * @param {any} db
 * @param {string} roomId
 * @param {'A' | 'B'} team
 */
export async function countTeamMembers(db, roomId, team) {
	const [row] = await db
		.select({ n: count() })
		.from(room_member)
		.where(and(eq(room_member.room_id, roomId), eq(room_member.team, team)));
	return Number(row?.n ?? 0);
}

/**
 * Count players on `team` excluding a specific user (for cap check before join/move).
 *
 * @param {any} db
 * @param {string} roomId
 * @param {'A' | 'B'} team
 * @param {string} userId
 */
async function countTeamMembersExcludingUser(db, roomId, team, userId) {
	const [row] = await db
		.select({ n: count() })
		.from(room_member)
		.where(
			and(
				eq(room_member.room_id, roomId),
				eq(room_member.team, team),
				sql`${room_member.user_id} IS DISTINCT FROM ${userId}`
			)
		);
	return Number(row?.n ?? 0);
}

/**
 * Recompute captain flags: earliest `joined_at` on each team is captain.
 *
 * @param {any} db
 * @param {string} roomId
 */
async function recomputeTeamCaptains(db, roomId) {
	for (const team of /** @type {const} */ (['A', 'B'])) {
		const ordered = await db
			.select({ id: room_member.id })
			.from(room_member)
			.where(and(eq(room_member.room_id, roomId), eq(room_member.team, team)))
			.orderBy(asc(room_member.joined_at));

		const captainId = ordered[0]?.id;
		for (const row of ordered) {
			await db
				.update(room_member)
				.set({ is_captain: row.id === captainId })
				.where(eq(room_member.id, row.id));
		}
	}
}

/**
 * Signed-in player joins or moves to a team (max 3 per team). Captain = earliest `joined_at` on that team.
 * Uses sequential queries (Neon HTTP driver has no interactive transactions — see plan 02-03 deviation).
 *
 * @param {any} db
 * @param {{ roomId: string, userId: string, team: 'A' | 'B' }} args
 */
export async function joinTeamForUser(db, { roomId, userId, team }) {
	const [existing] = await db
		.select()
		.from(room_member)
		.where(and(eq(room_member.room_id, roomId), eq(room_member.user_id, userId)))
		.limit(1);

	if (existing?.team === team) {
		await recomputeTeamCaptains(db, roomId);
		return;
	}

	const othersOnTarget = await countTeamMembersExcludingUser(db, roomId, team, userId);
	if (othersOnTarget >= 3) {
		throw TEAM_FULL;
	}

	if (existing) {
		await db
			.update(room_member)
			.set({ team })
			.where(eq(room_member.id, existing.id));
	} else {
		await db.insert(room_member).values({
			room_id: roomId,
			user_id: userId,
			team,
			is_captain: false,
			guest_id: null
		});
	}

	await recomputeTeamCaptains(db, roomId);
}

/**
 * Host removes a signed-in member or guest spectator from the room.
 * Sequential writes (Neon HTTP — no interactive transaction).
 *
 * @param {any} db
 * @param {{ roomId: string, hostUserId: string, targetUserId?: string | null, targetGuestId?: string | null }} args
 */
export async function kickMember(db, { roomId, hostUserId, targetUserId, targetGuestId }) {
	const [roomRow] = await db.select().from(room).where(eq(room.id, roomId)).limit(1);
	if (!roomRow) {
		throw new Error('ROOM_NOT_FOUND');
	}
	assertHost(roomRow, hostUserId);

	const hasUser = targetUserId != null && targetUserId !== '';
	const hasGuest = targetGuestId != null && targetGuestId !== '';
	if (hasUser === hasGuest) {
		throw INVALID_KICK_TARGET;
	}

	const targetCond = hasUser
		? eq(room_member.user_id, /** @type {string} */ (targetUserId))
		: eq(room_member.guest_id, /** @type {string} */ (targetGuestId));

	const removed = await db
		.delete(room_member)
		.where(and(eq(room_member.room_id, roomId), targetCond))
		.returning({ id: room_member.id });

	if (!removed.length) {
		throw KICK_TARGET_MISSING;
	}

	await recomputeTeamCaptains(db, roomId);
}

/**
 * Host moves a signed-in player between teams (lobby only). Recomputes captains (ROOM-05).
 *
 * @param {any} db
 * @param {{ roomId: string, hostUserId: string, userId: string, toTeam: 'A' | 'B' }} args
 */
export async function movePlayer(db, { roomId, hostUserId, userId, toTeam }) {
	const [roomRow] = await db.select().from(room).where(eq(room.id, roomId)).limit(1);
	if (!roomRow) {
		throw new Error('ROOM_NOT_FOUND');
	}
	assertHost(roomRow, hostUserId);
	if (roomRow.phase !== 'lobby') {
		throw LOBBY_PHASE_REQUIRED;
	}

	const [existing] = await db
		.select()
		.from(room_member)
		.where(and(eq(room_member.room_id, roomId), eq(room_member.user_id, userId)))
		.limit(1);

	if (!existing?.team || (existing.team !== 'A' && existing.team !== 'B')) {
		throw PLAYER_NOT_ON_TEAM;
	}

	if (existing.team === toTeam) {
		await recomputeTeamCaptains(db, roomId);
		return;
	}

	const othersOnTarget = await countTeamMembersExcludingUser(db, roomId, toTeam, userId);
	if (othersOnTarget >= 3) {
		throw TEAM_FULL;
	}

	await db.update(room_member).set({ team: toTeam }).where(eq(room_member.id, existing.id));
	await recomputeTeamCaptains(db, roomId);
}

/**
 * Host starts draft when both teams have at least one signed-in player and one captain each.
 *
 * @param {any} db
 * @param {{ roomId: string, hostUserId: string }} args
 */
export async function startDraftIfReady(db, { roomId, hostUserId }) {
	const [roomRow] = await db.select().from(room).where(eq(room.id, roomId)).limit(1);
	if (!roomRow) {
		throw new Error('ROOM_NOT_FOUND');
	}
	assertHost(roomRow, hostUserId);
	if (roomRow.phase !== 'lobby') {
		throw LOBBY_PHASE_REQUIRED;
	}

	for (const team of /** @type {const} */ (['A', 'B'])) {
		const members = await db
			.select()
			.from(room_member)
			.where(
				and(
					eq(room_member.room_id, roomId),
					eq(room_member.team, team),
					isNotNull(room_member.user_id)
				)
			);
		if (members.length < 1 || !members.some((/** @type {{ is_captain: boolean }} */ m) => m.is_captain)) {
			throw DRAFT_NOT_READY;
		}
	}

	const [updated] = await db
		.update(room)
		.set({ phase: 'drafting', updated_at: new Date() })
		.where(eq(room.id, roomId))
		.returning();

	return updated;
}

/**
 * Host ends the room (lazy purge later). Sets phase ended and ended_at.
 *
 * @param {any} db
 * @param {{ roomId: string, hostUserId: string }} args
 */
export async function cancelRoomAsHost(db, { roomId, hostUserId }) {
	const [roomRow] = await db.select().from(room).where(eq(room.id, roomId)).limit(1);
	if (!roomRow) {
		throw new Error('ROOM_NOT_FOUND');
	}
	assertHost(roomRow, hostUserId);

	const now = new Date();
	const [updated] = await db
		.update(room)
		.set({ phase: 'ended', ended_at: now, updated_at: now })
		.where(eq(room.id, roomId))
		.returning();

	return updated;
}
