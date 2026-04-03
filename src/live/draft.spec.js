// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LiveError } from 'svelte-realtime/server';
import { createTestEnv } from 'svelte-realtime/test';

vi.mock('$lib/server/rooms.js', () => ({
	getRoomByPublicCode: vi.fn(),
	topicForRoom: vi.fn((code) => 'lobby:' + code),
	NOT_HOST: 'NOT_HOST',
	LOBBY_PHASE_REQUIRED: 'LOBBY_PHASE_REQUIRED',
	DRAFT_NOT_READY: 'DRAFT_NOT_READY',
	PLAYER_NOT_ON_TEAM: 'PLAYER_NOT_ON_TEAM',
	TEAM_FULL: 'TEAM_FULL',
	KICK_TARGET_MISSING: 'KICK_TARGET_MISSING',
	INVALID_KICK_TARGET: 'INVALID_KICK_TARGET',
	loadLobbySnapshot: vi.fn(),
	startDraftWithSettings: vi.fn(),
	cancelRoomAsHost: vi.fn()
}));

vi.mock('$lib/server/draft.js', () => ({
	writeDraftAction: vi.fn(),
	loadDraftSnapshot: vi.fn(),
	completeDraft: vi.fn(),
	updateDraftState: vi.fn(),
	advanceTurnIfCurrent: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
	db: {}
}));

vi.mock('$lib/server/db/schema.js', () => ({
	room_member: { room_id: 'room_id', user_id: 'user_id', team: 'team', is_captain: 'is_captain' },
	draft_action: { room_id: 'room_id', champion_id: 'champion_id', id: 'id' }
}));

vi.mock('drizzle-orm', () => ({
	and: vi.fn((...args) => ({ type: 'and', args })),
	eq: vi.fn((col, val) => ({ type: 'eq', col, val })),
	isNotNull: vi.fn((col) => ({ type: 'isNotNull', col }))
}));

vi.mock('$lib/catalog/classes.json', () => ({
	default: [
		{ id: 'bakko', name: 'Bakko', role: 'melee' },
		{ id: 'jamila', name: 'Jamila', role: 'melee' },
		{ id: 'croak', name: 'Croak', role: 'melee' }
	]
}));

vi.mock('./draft-timers.js', () => ({
	roomTimers: new Map(),
	clearRoomTimer: vi.fn(),
	scheduleTimer: vi.fn()
}));

import * as draftDb from '$lib/server/draft.js';
import * as rooms from '$lib/server/rooms.js';
import * as timers from './draft-timers.js';

const baseRoom = {
	id: 'room-001',
	public_code: 'abc1234',
	host_user_id: 'host-1',
	phase: 'drafting',
	draft_state: {
		script: [
			{ team: 'A', action: 'ban' },
			{ team: 'B', action: 'ban' },
			{ team: 'A', action: 'pick' }
		],
		turnIndex: 0,
		turnEndsAt: new Date(Date.now() + 30000).toISOString(),
		timerMs: 30000
	},
	created_at: new Date(),
	updated_at: new Date(),
	ended_at: null
};

const baseSnap = {
	publicCode: 'abc1234',
	roomId: 'room-001',
	phase: 'drafting',
	hostUserId: 'host-1',
	teams: { A: [], B: [] },
	spectators: [],
	draftState: baseRoom.draft_state,
	actions: []
};

// Mock db with chainable query builder
function makeDb(overrides = {}) {
	const chain = {
		select: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		limit: vi.fn().mockResolvedValue([]),
		...overrides
	};
	return chain;
}

describe('draft live RPCs (DRAFT-02 through DRAFT-06)', () => {
	const env = createTestEnv();

	afterEach(() => {
		env.cleanup();
		vi.clearAllMocks();
	});

	describe('startDraft with settings (DRAFT-02)', () => {
		it.todo('writes draft_state with turnIndex=0 and turnEndsAt timestamp to room');
		it.todo('publishes snapshot with phase:drafting and draftState');
		it.todo('non-host startDraft rejects with FORBIDDEN');
	});

	describe('pickBan — captain validation (DRAFT-03)', () => {
		let draftModule;

		beforeEach(async () => {
			draftModule = await import('./draft.js');
		});

		it('non-captain pickBan rejects with FORBIDDEN', async () => {
			vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(baseRoom);
			// db.select chain returns no captains for the active team
			const { db } = await import('$lib/server/db');
			db.select = vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]),  // no captains
						then: undefined
					})
				})
			});

			env.register('draft', draftModule);
			const client = env.connect({ role: 'player', id: 'not-a-captain', name: 'X' });
			const err = await client
				.call('draft/pickBan', 'abc1234', { championId: 'bakko', action: 'ban' })
				.catch((e) => e);
			expect(err).toBeInstanceOf(LiveError);
			expect(err.code).toBe('FORBIDDEN');
		});

		it('duplicate champion (already in draft_action) rejects with FORBIDDEN', async () => {
			vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(baseRoom);
			const { db } = await import('$lib/server/db');
			// First select (captains) returns this user as captain
			// Second select (existing actions) returns a match
			let callCount = 0;
			db.select = vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					// captains query
					return {
						from: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								limit: vi.fn().mockResolvedValue([{ userId: 'captain-a' }])
							})
						})
					};
				}
				// duplicate champion query
				return {
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValue([{ id: 'existing-action' }])
						})
					})
				};
			});

			env.register('draft', draftModule);
			const client = env.connect({ role: 'player', id: 'captain-a', name: 'Captain A' });
			const err = await client
				.call('draft/pickBan', 'abc1234', { championId: 'bakko', action: 'ban' })
				.catch((e) => e);
			expect(err).toBeInstanceOf(LiveError);
			expect(err.code).toBe('FORBIDDEN');
		});

		it('wrong team captain pickBan rejects with FORBIDDEN', async () => {
			vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue({
				...baseRoom,
				draft_state: { ...baseRoom.draft_state, turnIndex: 0 } // team A turn
			});
			const { db } = await import('$lib/server/db');
			// Captains query returns team B captain (not the caller)
			db.select = vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ userId: 'captain-a-real' }])
					})
				})
			});

			env.register('draft', draftModule);
			const client = env.connect({ role: 'player', id: 'captain-b', name: 'Captain B' });
			const err = await client
				.call('draft/pickBan', 'abc1234', { championId: 'bakko', action: 'ban' })
				.catch((e) => e);
			expect(err).toBeInstanceOf(LiveError);
			expect(err.code).toBe('FORBIDDEN');
		});
	});

	describe('pickBan — timer interaction (DRAFT-04)', () => {
		it('timer callback is a no-op when turn already advanced (conditional update returns 0 rows)', async () => {
			// advanceTurnIfCurrent returns false => no-op
			vi.mocked(draftDb.advanceTurnIfCurrent).mockResolvedValue(false);
			vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(baseRoom);

			const { autoAdvanceTurn } = await import('./draft.js');
			await autoAdvanceTurn('abc1234', 0);

			expect(draftDb.writeDraftAction).not.toHaveBeenCalled();
			expect(draftDb.completeDraft).not.toHaveBeenCalled();
		});

		it('timer callback advances turn and publishes when still current', async () => {
			vi.mocked(draftDb.advanceTurnIfCurrent).mockResolvedValue(true);
			vi.mocked(draftDb.writeDraftAction).mockResolvedValue(undefined);
			vi.mocked(draftDb.loadDraftSnapshot).mockResolvedValue(baseSnap);
			vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(baseRoom);

			const { autoAdvanceTurn } = await import('./draft.js');
			await autoAdvanceTurn('abc1234', 0);

			expect(draftDb.writeDraftAction).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ turnIndex: 0, action: 'timeout', championId: null })
			);
		});
	});

	describe('pickBan — draft completion (DRAFT-05)', () => {
		it('pickBan on last turn calls completeDraft and sets phase to ended', async () => {
			// Set up room with turnIndex at the last turn (index 2 of 3-turn script)
			const lastTurnRoom = {
				...baseRoom,
				draft_state: {
					script: [
						{ team: 'A', action: 'ban' },
						{ team: 'B', action: 'ban' },
						{ team: 'A', action: 'pick' }
					],
					turnIndex: 2, // last turn (index 2)
					turnEndsAt: new Date(Date.now() + 30000).toISOString(),
					timerMs: 30000
				}
			};
			vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(lastTurnRoom);
			vi.mocked(draftDb.writeDraftAction).mockResolvedValue(undefined);
			vi.mocked(draftDb.completeDraft).mockResolvedValue(undefined);
			vi.mocked(draftDb.loadDraftSnapshot).mockResolvedValue({ ...baseSnap, phase: 'ended' });

			const { db } = await import('$lib/server/db');
			let callCount = 0;
			db.select = vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					return {
						from: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								limit: vi.fn().mockResolvedValue([{ userId: 'captain-a' }])
							})
						})
					};
				}
				// no duplicate
				return {
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValue([])
						})
					})
				};
			});

			const draftModule = await import('./draft.js');
			env.register('draft', draftModule);
			const client = env.connect({ role: 'player', id: 'captain-a', name: 'Captain A' });
			await client.call('draft/pickBan', 'abc1234', { championId: 'bakko', action: 'pick' });

			expect(draftDb.completeDraft).toHaveBeenCalledWith(expect.anything(), 'room-001');
		});
	});

	describe('startDraft with custom script (DRAFT-06)', () => {
		it.todo('startDraft with custom script payload uses that script instead of DEFAULT_SCRIPT');

		it.todo('startDraft with invalid script payload rejects with VALIDATION error');
	});
});
