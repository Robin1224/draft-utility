// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LiveError } from 'svelte-realtime/server';
import { createTestEnv } from 'svelte-realtime/test';

// ── Mock declarations (hoisted by vitest) ──────────────────────────────────

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

// Mock db as an object with a select method we can reconfigure per test
vi.mock('$lib/server/db', () => {
	const mockDb = {
		select: vi.fn()
	};
	return { db: mockDb };
});

vi.mock('$lib/server/db/schema.js', () => ({
	room_member: {
		room_id: 'rm.room_id',
		user_id: 'rm.user_id',
		team: 'rm.team',
		is_captain: 'rm.is_captain'
	},
	draft_action: {
		room_id: 'da.room_id',
		champion_id: 'da.champion_id',
		id: 'da.id'
	}
}));

vi.mock('drizzle-orm', () => ({
	and: vi.fn((...args) => ({ _and: args })),
	eq: vi.fn((col, val) => ({ _eq: [col, val] })),
	isNotNull: vi.fn((col) => ({ _isNotNull: col }))
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

// ── Imports (after mocks) ───────────────────────────────────────────────────

import * as draftDb from '$lib/server/draft.js';
import * as rooms from '$lib/server/rooms.js';
import * as timers from './draft-timers.js';
import { db } from '$lib/server/db';

// ── Fixtures ────────────────────────────────────────────────────────────────

const THREE_TURN_SCRIPT = [
	{ team: 'A', action: 'ban' },
	{ team: 'B', action: 'ban' },
	{ team: 'A', action: 'pick' }
];

const baseRoom = {
	id: 'room-001',
	public_code: 'abc1234',
	host_user_id: 'host-1',
	phase: 'drafting',
	draft_state: {
		script: THREE_TURN_SCRIPT,
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

/**
 * Build a db.select mock that returns `rows` on `.where()` or `.limit()`.
 *
 * @param {any[]} rows
 */
function mockSelectReturning(rows) {
	const whereResult = {
		limit: vi.fn().mockResolvedValue(rows),
		then: (resolve) => Promise.resolve(rows).then(resolve),
		[Symbol.iterator]: rows[Symbol.iterator].bind(rows)
	};
	// Make whereResult itself thenable so `await db.select()...where()` works
	Object.defineProperty(whereResult, Symbol.toStringTag, { value: 'Promise' });
	const self = Promise.resolve(rows);
	whereResult.then = self.then.bind(self);
	whereResult.catch = self.catch.bind(self);
	whereResult.finally = self.finally.bind(self);

	return {
		from: vi.fn().mockReturnValue({
			where: vi.fn().mockReturnValue(whereResult)
		})
	};
}

// ── Tests ───────────────────────────────────────────────────────────────────

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
			// captains query returns empty — no captain found for this user
			vi.mocked(db.select).mockReturnValue(mockSelectReturning([]));

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
			// First db.select: captains query — caller IS captain
			// Second db.select: duplicate champion check — champion exists
			let selectCallCount = 0;
			vi.mocked(db.select).mockImplementation(() => {
				selectCallCount++;
				if (selectCallCount === 1) {
					return mockSelectReturning([{ userId: 'captain-a' }]);
				}
				return mockSelectReturning([{ id: 'existing-action' }]);
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
			vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(baseRoom);
			// captains query returns a different user — caller is not on the list
			vi.mocked(db.select).mockReturnValue(mockSelectReturning([{ userId: 'captain-a-real' }]));

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

	describe('autoAdvanceTurn platform.publish (DISC-pitfall-2)', () => {
		it('calls platform.publish with draft snapshot when platform is provided and turn advanced', async () => {
			vi.mocked(draftDb.advanceTurnIfCurrent).mockResolvedValue(true);
			vi.mocked(draftDb.writeDraftAction).mockResolvedValue(undefined);
			vi.mocked(draftDb.loadDraftSnapshot).mockResolvedValue(baseSnap);
			vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(baseRoom);

			const mockPublish = vi.fn();
			const mockPlatform = { publish: mockPublish };

			const { autoAdvanceTurn } = await import('./draft.js');
			await autoAdvanceTurn('abc1234', 0, mockPlatform);

			expect(mockPublish).toHaveBeenCalledWith(
				expect.stringContaining('abc1234'),
				'set',
				baseSnap
			);
		});

		it('does not call platform.publish when platform is null', async () => {
			vi.mocked(draftDb.advanceTurnIfCurrent).mockResolvedValue(true);
			vi.mocked(draftDb.writeDraftAction).mockResolvedValue(undefined);
			vi.mocked(draftDb.loadDraftSnapshot).mockResolvedValue(baseSnap);
			vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(baseRoom);

			const { autoAdvanceTurn } = await import('./draft.js');
			// Should not throw when platform is null, and should not call loadDraftSnapshot
			// (since platform is null, the publish block is skipped entirely)
			await expect(autoAdvanceTurn('abc1234', 0, null)).resolves.toBeUndefined();
			// loadDraftSnapshot is not called when platform is null
			expect(draftDb.loadDraftSnapshot).not.toHaveBeenCalled();
		});
	});

	describe('pickBan — draft completion (DRAFT-05)', () => {
		it('pickBan on last turn calls completeDraft and sets phase to ended', async () => {
			const lastTurnRoom = {
				...baseRoom,
				draft_state: {
					...baseRoom.draft_state,
					turnIndex: 2 // last index in 3-turn script
				}
			};
			vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(lastTurnRoom);
			vi.mocked(draftDb.writeDraftAction).mockResolvedValue(undefined);
			vi.mocked(draftDb.completeDraft).mockResolvedValue(undefined);
			vi.mocked(draftDb.loadDraftSnapshot).mockResolvedValue({ ...baseSnap, phase: 'ended' });

			let selectCallCount = 0;
			vi.mocked(db.select).mockImplementation(() => {
				selectCallCount++;
				if (selectCallCount === 1) {
					// captains query — caller is captain
					return mockSelectReturning([{ userId: 'captain-a' }]);
				}
				// duplicate champion check — no existing action
				return mockSelectReturning([]);
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
