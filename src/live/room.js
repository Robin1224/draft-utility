// @ts-nocheck — ctx.user shape comes from hooks.ws.js upgrade(); guestId added in 02-04.
import { live, LiveError } from 'svelte-realtime/server';
import { parseRoomCode } from '$lib/join-parse.js';
import { db } from '$lib/server/db';
import {
	DRAFT_NOT_READY,
	INVALID_KICK_TARGET,
	KICK_TARGET_MISSING,
	LOBBY_PHASE_REQUIRED,
	NOT_HOST,
	PLAYER_NOT_ON_TEAM,
	TEAM_FULL,
	cancelRoomAsHost,
	getRoomByPublicCode,
	joinTeamForUser,
	kickMember as kickMemberDb,
	loadLobbySnapshot,
	movePlayer as movePlayerDb,
	startDraftIfReady,
	topicForRoom,
	upsertGuestSpectator
} from '$lib/server/rooms.js';

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

export const lobby = live.stream(
	(ctx, publicCode) => topicForRoom(normalizePublicCode(publicCode)),
	async (ctx, publicCode) => {
		const code = normalizePublicCode(publicCode);
		const roomRow = await getRoomByPublicCode(db, code);
		if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');
		if (ctx.user?.role === 'guest' && ctx.user?.guestId) {
			await upsertGuestSpectator(db, roomRow.id, ctx.user.guestId);
		}
		const snap = await loadLobbySnapshot(db, code);
		if (!snap) throw new LiveError('NOT_FOUND', 'Room not found');
		return snap;
	},
	{ merge: 'set', access: () => true }
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

export const startDraft = live(async (ctx, publicCode) => {
	if (ctx.user?.role !== 'player' || !ctx.user?.id) {
		throw new LiveError('UNAUTHORIZED', 'Sign in required');
	}
	const code = normalizePublicCode(publicCode);
	const roomRow = await getRoomByPublicCode(db, code);
	if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');
	if (roomRow.host_user_id !== ctx.user.id) {
		throw new LiveError('FORBIDDEN', 'Host only');
	}
	try {
		await startDraftIfReady(db, { roomId: roomRow.id, hostUserId: ctx.user.id });
	} catch (e) {
		const mapped = mapRoomMutationError(e);
		if (mapped) throw mapped;
		throw e;
	}
	const snap = await loadLobbySnapshot(db, code);
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
