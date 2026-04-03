// @ts-nocheck — ctx.user shape comes from hooks.ws.js upgrade(); guestId added in 02-04.
import { live, LiveError } from 'svelte-realtime/server';
import { parseRoomCode } from '$lib/join-parse.js';
import { db } from '$lib/server/db';
import {
	TEAM_FULL,
	getRoomByPublicCode,
	joinTeamForUser,
	loadLobbySnapshot,
	topicForRoom,
	upsertGuestSpectator
} from '$lib/server/rooms.js';

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
