// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LiveError } from 'svelte-realtime/server';
import { createTestEnv } from 'svelte-realtime/test';
import * as rooms from '$lib/server/rooms.js';
import { db } from '$lib/server/db';
import * as roomModule from './room.js';

vi.mock('$lib/server/rooms.js', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		getRoomByPublicCode: vi.fn(),
		loadLobbySnapshot: vi.fn(),
		kickMember: vi.fn(),
		movePlayer: vi.fn(),
		startDraftIfReady: vi.fn(),
		cancelRoomAsHost: vi.fn()
	};
});

const baseRoom = {
	id: '00000000-0000-0000-0000-000000000099',
	public_code: 'abc1234',
	host_user_id: 'host-1',
	phase: 'lobby',
	created_at: new Date(),
	updated_at: new Date(),
	ended_at: null
};

const baseSnapshot = {
	publicCode: 'abc1234',
	roomId: baseRoom.id,
	phase: 'lobby',
	hostUserId: 'host-1',
	teams: { A: [], B: [] },
	spectators: []
};

describe('room live (ROOM-03 guest; captain/cap in rooms.spec.js)', () => {
	const env = createTestEnv();

	afterEach(() => {
		env.cleanup();
	});

	it('guest joinTeam rejects with UNAUTHORIZED before hitting the database', async () => {
		env.register('room', roomModule);
		const client = env.connect({ role: 'guest', guestId: 'g1' });
		const err = await client.call('room/joinTeam', 'anycode', 'A').catch((e) => e);
		expect(err).toBeInstanceOf(LiveError);
		expect(err.code).toBe('UNAUTHORIZED');
	});
});

describe('room live host RPCs (02-04)', () => {
	const env = createTestEnv();

	beforeEach(() => {
		vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(/** @type {any} */ (baseRoom));
		vi.mocked(rooms.loadLobbySnapshot).mockResolvedValue(/** @type {any} */ (baseSnapshot));
		vi.mocked(rooms.kickMember).mockResolvedValue(undefined);
		vi.mocked(rooms.movePlayer).mockResolvedValue(undefined);
		vi.mocked(rooms.startDraftIfReady).mockResolvedValue(/** @type {any} */ (baseRoom));
		vi.mocked(rooms.cancelRoomAsHost).mockResolvedValue(/** @type {any} */ (baseRoom));
	});

	afterEach(() => {
		env.cleanup();
		vi.clearAllMocks();
	});

	it('non-host startDraft rejects with FORBIDDEN and does not call startDraftIfReady', async () => {
		vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(
			/** @type {any} */ ({ ...baseRoom, host_user_id: 'real-host' })
		);
		env.register('room', roomModule);
		const client = env.connect({ role: 'player', id: 'imposter', name: 'X' });
		const err = await client.call('room/startDraft', 'abc1234').catch((e) => e);
		expect(err).toBeInstanceOf(LiveError);
		expect(err.code).toBe('FORBIDDEN');
		expect(rooms.startDraftIfReady).not.toHaveBeenCalled();
	});

	it('host startDraft rejects when a team lacks captain (mock DB)', async () => {
		vi.mocked(rooms.startDraftIfReady).mockRejectedValue(rooms.DRAFT_NOT_READY);
		env.register('room', roomModule);
		const client = env.connect({ role: 'player', id: 'host-1', name: 'Host' });
		const err = await client.call('room/startDraft', 'abc1234').catch((e) => e);
		expect(err).toBeInstanceOf(LiveError);
		expect(err.code).toBe('FORBIDDEN');
		expect(rooms.startDraftIfReady).toHaveBeenCalled();
	});

	it('movePlayer rejects when phase is drafting (mock)', async () => {
		vi.mocked(rooms.movePlayer).mockRejectedValue(rooms.LOBBY_PHASE_REQUIRED);
		env.register('room', roomModule);
		const client = env.connect({ role: 'player', id: 'host-1', name: 'Host' });
		const err = await client
			.call('room/movePlayer', 'abc1234', { userId: 'u2', toTeam: 'B' })
			.catch((e) => e);
		expect(err).toBeInstanceOf(LiveError);
		expect(err.code).toBe('FORBIDDEN');
	});

	it('host kickMember succeeds for signed-in userId (mock DB)', async () => {
		env.register('room', roomModule);
		const client = env.connect({ role: 'player', id: 'host-1', name: 'Host' });
		await client.call('room/kickMember', 'abc1234', { userId: 'u-target' });
		expect(rooms.kickMember).toHaveBeenCalledWith(db, {
			roomId: baseRoom.id,
			hostUserId: 'host-1',
			targetUserId: 'u-target',
			targetGuestId: undefined
		});
		expect(rooms.loadLobbySnapshot).toHaveBeenCalled();
	});

	it('host kickMember succeeds for guestId spectator (mock DB)', async () => {
		env.register('room', roomModule);
		const client = env.connect({ role: 'player', id: 'host-1', name: 'Host' });
		await client.call('room/kickMember', 'abc1234', { guestId: 'guest-spectator' });
		expect(rooms.kickMember).toHaveBeenCalledWith(db, {
			roomId: baseRoom.id,
			hostUserId: 'host-1',
			targetUserId: undefined,
			targetGuestId: 'guest-spectator'
		});
	});

	it('non-host kickMember rejects with FORBIDDEN', async () => {
		vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(
			/** @type {any} */ ({ ...baseRoom, host_user_id: 'real-host' })
		);
		env.register('room', roomModule);
		const client = env.connect({ role: 'player', id: 'not-host', name: 'X' });
		const err = await client
			.call('room/kickMember', 'abc1234', { userId: 'u2' })
			.catch((e) => e);
		expect(err).toBeInstanceOf(LiveError);
		expect(err.code).toBe('FORBIDDEN');
		expect(rooms.kickMember).not.toHaveBeenCalled();
	});
});
