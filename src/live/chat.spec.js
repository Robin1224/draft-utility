// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock declarations (hoisted by vitest) ──────────────────────────────────

vi.mock('svelte-realtime/server', () => ({
	live: Object.assign(vi.fn((handler) => handler), { stream: vi.fn(() => ({})) }),
	LiveError: class LiveError extends Error {
		constructor(code, message) {
			super(message);
			this.code = code;
		}
	}
}));

vi.mock('$lib/server/rooms.js', () => ({
	getRoomByPublicCode: vi.fn(),
	topicForRoom: vi.fn((code) => `lobby:${code}`),
	loadLobbySnapshot: vi.fn()
}));

vi.mock('$lib/server/db', () => ({ db: {} }));

vi.mock('$lib/slur-list.json', () => ({ default: ['ass', 'damn', 'hell', 'crap', 'piss'] }), {
	with: { type: 'json' }
});

vi.mock('$lib/server/db/schema.js', () => ({
	room_member: {
		room_id: 'rm.room_id',
		user_id: 'rm.user_id',
		team: 'rm.team'
	}
}));

vi.mock('drizzle-orm', () => ({
	and: vi.fn((...args) => ({ _and: args })),
	eq: vi.fn((col, val) => ({ _eq: [col, val] }))
}));

vi.mock('$lib/join-parse.js', () => ({
	parseRoomCode: vi.fn((code) => code)
}));

// ── Fixtures ────────────────────────────────────────────────────────────────

const baseRoom = {
	id: 'room-001',
	public_code: 'abc1234',
	host_user_id: 'host-1',
	phase: 'lobby'
};

/**
 * Build a db.select mock that returns `rows` after `.from().where()`.
 * @param {any[]} rows
 */
function mockSelectReturning(rows) {
	const queryResult = {
		then: (resolve) => Promise.resolve(rows).then(resolve),
		catch: (reject) => Promise.resolve(rows).catch(reject),
		finally: (fn) => Promise.resolve(rows).finally(fn)
	};
	return {
		from: vi.fn().mockReturnValue({
			where: vi.fn().mockReturnValue(queryResult)
		})
	};
}

/**
 * Load a fresh chat module and extract handler functions by position.
 * Positions in chat.js:
 *   live.stream: [0]=chatAll, [1]=chatTeamA, [2]=chatTeamB, [3]=chatSpectators
 *   live():      [0]=sendMessage, [1]=muteMember, [2]=unmuteMember
 *
 * @returns {{ mod, LiveError, rooms, db, streamHandlers, rpcHandlers }}
 */
async function loadFreshChat() {
	vi.resetModules();
	vi.clearAllMocks();
	const mod = await import('./chat.js');
	const { live, LiveError } = await import('svelte-realtime/server');
	const rooms = await import('$lib/server/rooms.js');
	const { db } = await import('$lib/server/db');

	const streamCalls = vi.mocked(live.stream).mock.calls;
	const liveCalls = vi.mocked(live).mock.calls;

	return {
		mod,
		LiveError,
		rooms,
		db,
		// Stream init functions (2nd arg of each live.stream call)
		streamHandlers: {
			chatAll: streamCalls[0]?.[1],
			chatTeamA: streamCalls[1]?.[1],
			chatTeamB: streamCalls[2]?.[1],
			chatSpectators: streamCalls[3]?.[1]
		},
		// RPC handler functions (1st arg of each live() call)
		rpcHandlers: {
			sendMessage: liveCalls[0]?.[0],
			muteMember: liveCalls[1]?.[0],
			unmuteMember: liveCalls[2]?.[0]
		}
	};
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('chat — channel authorization (CHAT-01, CHAT-02)', () => {
	it('Team A player cannot subscribe to chatTeamB topic', async () => {
		const { streamHandlers, LiveError, rooms, db } = await loadFreshChat();

		vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(baseRoom);
		db.select = vi.fn().mockReturnValue(mockSelectReturning([{ team: 'A' }]));

		const ctx = { user: { role: 'player', id: 'player-1', name: 'Player 1' } };
		const err = await streamHandlers.chatTeamB(ctx, 'abc1234').catch((e) => e);

		expect(err).toBeInstanceOf(LiveError);
		expect(err.code).toBe('FORBIDDEN');
	});

	it('Team B player cannot subscribe to chatTeamA topic', async () => {
		const { streamHandlers, LiveError, rooms, db } = await loadFreshChat();

		vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(baseRoom);
		db.select = vi.fn().mockReturnValue(mockSelectReturning([{ team: 'B' }]));

		const ctx = { user: { role: 'player', id: 'player-2', name: 'Player 2' } };
		const err = await streamHandlers.chatTeamA(ctx, 'abc1234').catch((e) => e);

		expect(err).toBeInstanceOf(LiveError);
		expect(err.code).toBe('FORBIDDEN');
	});

	it('Guest spectator cannot subscribe to chatTeamA or chatTeamB topic', async () => {
		const { streamHandlers, LiveError, rooms, db } = await loadFreshChat();

		vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(baseRoom);
		db.select = vi.fn().mockReturnValue(mockSelectReturning([]));

		const ctx = { user: { role: 'guest', guestId: 'g-001' } };

		const errA = await streamHandlers.chatTeamA(ctx, 'abc1234').catch((e) => e);
		expect(errA).toBeInstanceOf(LiveError);
		expect(errA.code).toBe('FORBIDDEN');

		const errB = await streamHandlers.chatTeamB(ctx, 'abc1234').catch((e) => e);
		expect(errB).toBeInstanceOf(LiveError);
		expect(errB.code).toBe('FORBIDDEN');
	});

	it('Player cannot subscribe to chatSpectators topic', async () => {
		const { streamHandlers, LiveError, rooms, db } = await loadFreshChat();

		vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(baseRoom);
		db.select = vi.fn().mockReturnValue(mockSelectReturning([{ team: 'A' }]));

		const ctx = { user: { role: 'player', id: 'player-1', name: 'Player 1' } };
		const err = await streamHandlers.chatSpectators(ctx, 'abc1234').catch((e) => e);

		expect(err).toBeInstanceOf(LiveError);
		expect(err.code).toBe('FORBIDDEN');
	});

	it('Team A player sendMessage publishes only to room:{code}:chat:teamA', async () => {
		const { rpcHandlers, rooms, db } = await loadFreshChat();

		vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(baseRoom);
		db.select = vi.fn().mockReturnValue(mockSelectReturning([{ team: 'A' }]));

		const publishMock = vi.fn();
		const ctx = {
			user: { role: 'player', id: 'player-1', name: 'Player 1', chatTeam: 'A' },
			id: 'conn-1',
			publish: publishMock
		};

		await rpcHandlers.sendMessage(ctx, 'abc1234', { body: 'Go team!', channel: 'teamA' });

		expect(publishMock).toHaveBeenCalledWith(
			'room:abc1234:chat:teamA',
			'set',
			expect.objectContaining({
				messages: expect.arrayContaining([expect.objectContaining({ sender: 'Player 1', body: 'Go team!' })])
			})
		);
		// Must NOT publish to any other topic
		const publishedTopics = publishMock.mock.calls.map((c) => c[0]);
		expect(publishedTopics.every((t) => t === 'room:abc1234:chat:teamA')).toBe(true);
	});

	it('Guest spectator sendMessage publishes only to room:{code}:chat:spectators', async () => {
		const { rpcHandlers, rooms, db } = await loadFreshChat();

		vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(baseRoom);
		db.select = vi.fn().mockReturnValue(mockSelectReturning([]));

		const publishMock = vi.fn();
		const ctx = {
			user: { role: 'guest', guestId: 'g-001' },
			id: 'conn-2',
			publish: publishMock
		};

		await rpcHandlers.sendMessage(ctx, 'abc1234', { body: 'Hello!', channel: 'spectators' });

		expect(publishMock).toHaveBeenCalledWith(
			'room:abc1234:chat:spectators',
			'set',
			expect.objectContaining({
				messages: expect.arrayContaining([expect.objectContaining({ body: 'Hello!' })])
			})
		);
	});
});

describe('chat — rate limiting (CHAT-03)', () => {
	it('5 messages in 5 seconds are allowed', async () => {
		const { rpcHandlers, rooms, db } = await loadFreshChat();

		vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(baseRoom);
		db.select = vi.fn().mockReturnValue(mockSelectReturning([]));

		const publishMock = vi.fn();
		const ctx = {
			user: { role: 'guest', guestId: 'g-rate-1' },
			id: 'conn-rate-1',
			publish: publishMock
		};

		for (let i = 0; i < 5; i++) {
			await rpcHandlers.sendMessage(ctx, 'abc1234', { body: `msg${i}`, channel: 'spectators' });
		}

		expect(publishMock).toHaveBeenCalledTimes(5);
	});

	it('6th message in 5-second window is silently dropped (no publish, no error)', async () => {
		const { rpcHandlers, rooms, db } = await loadFreshChat();

		vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(baseRoom);
		db.select = vi.fn().mockReturnValue(mockSelectReturning([]));

		const publishMock = vi.fn();
		const ctx = {
			user: { role: 'guest', guestId: 'g-rate-2' },
			id: 'conn-rate-2',
			publish: publishMock
		};

		for (let i = 0; i < 6; i++) {
			await rpcHandlers.sendMessage(ctx, 'abc1234', { body: `msg${i}`, channel: 'spectators' });
		}

		expect(publishMock).toHaveBeenCalledTimes(5);
	});

	it('rate limit key includes userId + connectionId + roomId — different rooms not shared', async () => {
		const { rpcHandlers, rooms, db } = await loadFreshChat();

		db.select = vi.fn().mockReturnValue(mockSelectReturning([]));

		const baseRoom2 = { ...baseRoom, id: 'room-002', public_code: 'xyz5678' };
		vi.mocked(rooms.getRoomByPublicCode)
			.mockResolvedValueOnce(baseRoom)
			.mockResolvedValueOnce(baseRoom)
			.mockResolvedValueOnce(baseRoom)
			.mockResolvedValueOnce(baseRoom)
			.mockResolvedValueOnce(baseRoom) // 5th
			.mockResolvedValueOnce(baseRoom2); // different room

		const publishMock = vi.fn();
		const ctx = {
			user: { role: 'guest', guestId: 'g-rate-3' },
			id: 'conn-rate-3',
			publish: publishMock
		};

		// Fill rate limit bucket for room 1
		for (let i = 0; i < 5; i++) {
			await rpcHandlers.sendMessage(ctx, 'abc1234', { body: `msg${i}`, channel: 'spectators' });
		}
		// 6th call goes to a DIFFERENT room — should NOT be rate limited
		await rpcHandlers.sendMessage(ctx, 'xyz5678', { body: 'different room', channel: 'spectators' });

		expect(publishMock).toHaveBeenCalledTimes(6);
	});

	it('rate limit resets after window expires', async () => {
		const { rpcHandlers, rooms, db } = await loadFreshChat();

		vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(baseRoom);
		db.select = vi.fn().mockReturnValue(mockSelectReturning([]));

		const publishMock = vi.fn();
		const ctx = {
			user: { role: 'guest', guestId: 'g-rate-4' },
			id: 'conn-rate-4',
			publish: publishMock
		};

		// Inject old timestamps by mocking Date.now for first 5 calls
		const originalNow = Date.now.bind(Date);
		const pastTime = Date.now() - 6000; // 6 seconds ago (outside 5s window)

		let callCount = 0;
		vi.spyOn(Date, 'now').mockImplementation(() => {
			callCount++;
			return callCount <= 5 ? pastTime : originalNow();
		});

		try {
			for (let i = 0; i < 5; i++) {
				await rpcHandlers.sendMessage(ctx, 'abc1234', {
					body: `old-msg${i}`,
					channel: 'spectators'
				});
			}
			// Now send after window — old timestamps are outside window
			await rpcHandlers.sendMessage(ctx, 'abc1234', {
				body: 'new msg after reset',
				channel: 'spectators'
			});
		} finally {
			vi.restoreAllMocks();
		}

		expect(publishMock).toHaveBeenCalledTimes(6);
	});
});

describe('chat — filter pipeline (CHAT-04 integration)', () => {
	it('message over 500 chars throws VALIDATION LiveError', async () => {
		const { rpcHandlers, LiveError, rooms, db } = await loadFreshChat();

		vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(baseRoom);
		db.select = vi.fn().mockReturnValue(mockSelectReturning([]));

		const publishMock = vi.fn();
		const ctx = {
			user: { role: 'guest', guestId: 'g-filter-1' },
			id: 'conn-f1',
			publish: publishMock
		};

		const err = await rpcHandlers
			.sendMessage(ctx, 'abc1234', { body: 'a'.repeat(501), channel: 'spectators' })
			.catch((e) => e);

		expect(err).toBeInstanceOf(LiveError);
		expect(err.code).toBe('VALIDATION');
		expect(publishMock).not.toHaveBeenCalled();
	});

	it('message containing slur after NFKC normalization is silently dropped', async () => {
		const { rpcHandlers, rooms, db } = await loadFreshChat();

		vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(baseRoom);
		db.select = vi.fn().mockReturnValue(mockSelectReturning([]));

		const publishMock = vi.fn();
		const ctx = {
			user: { role: 'guest', guestId: 'g-filter-2' },
			id: 'conn-f2',
			publish: publishMock
		};

		// fullwidth "damn" — NFKC normalizes to "damn"
		const fullwidthDamn = '\uFF44\uFF41\uFF4D\uFF4E';
		const result = await rpcHandlers.sendMessage(ctx, 'abc1234', {
			body: fullwidthDamn,
			channel: 'spectators'
		});

		expect(result).toBeUndefined(); // silent drop
		expect(publishMock).not.toHaveBeenCalled();
	});

	it('message with zero-width chars stripped before slur check', async () => {
		const { rpcHandlers, rooms, db } = await loadFreshChat();

		vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(baseRoom);
		db.select = vi.fn().mockReturnValue(mockSelectReturning([]));

		const publishMock = vi.fn();
		const ctx = {
			user: { role: 'guest', guestId: 'g-filter-3' },
			id: 'conn-f3',
			publish: publishMock
		};

		// Zero-width chars in a clean message — they are stripped but message passes
		await rpcHandlers.sendMessage(ctx, 'abc1234', {
			body: 'hello\u200Bworld',
			channel: 'spectators'
		});

		expect(publishMock).toHaveBeenCalledWith(
			'room:abc1234:chat:spectators',
			'set',
			expect.objectContaining({
				messages: expect.arrayContaining([expect.objectContaining({ body: 'helloworld' })])
			})
		);
	});
});

describe('chat — mute (HOST-04)', () => {
	it('muteMember RPC adds userId/guestId to muteMap for the room', async () => {
		const { mod, rpcHandlers, rooms, db } = await loadFreshChat();

		vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(baseRoom);
		db.select = vi.fn().mockReturnValue(mockSelectReturning([]));

		const publishMock = vi.fn();
		const ctx = {
			user: { role: 'player', id: 'host-1', name: 'Host' },
			id: 'conn-host',
			publish: publishMock
		};

		await rpcHandlers.muteMember(ctx, 'abc1234', { guestId: 'g-mute-1' });

		expect(mod.muteMap.get('room-001')?.has('g-mute-1')).toBe(true);
	});

	it('unmuteMember RPC removes userId/guestId from muteMap for the room', async () => {
		const { mod, rpcHandlers, rooms, db } = await loadFreshChat();

		// Pre-populate mute map
		mod.muteMap.set('room-001', new Set(['g-mute-2']));

		vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(baseRoom);
		db.select = vi.fn().mockReturnValue(mockSelectReturning([]));

		const publishMock = vi.fn();
		const ctx = {
			user: { role: 'player', id: 'host-1', name: 'Host' },
			id: 'conn-host',
			publish: publishMock
		};

		await rpcHandlers.unmuteMember(ctx, 'abc1234', { guestId: 'g-mute-2' });

		expect(mod.muteMap.get('room-001')?.has('g-mute-2')).toBe(false);
	});

	it('muted spectator sendMessage is silently dropped before publish', async () => {
		const { mod, rpcHandlers, rooms, db } = await loadFreshChat();

		// Pre-populate mute map with the spectator
		mod.muteMap.set('room-001', new Set(['g-muted']));

		vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(baseRoom);
		db.select = vi.fn().mockReturnValue(mockSelectReturning([]));

		const publishMock = vi.fn();
		const ctx = {
			user: { role: 'guest', guestId: 'g-muted' },
			id: 'conn-g-muted',
			publish: publishMock
		};

		const result = await rpcHandlers.sendMessage(ctx, 'abc1234', {
			body: 'Hello from muted user',
			channel: 'spectators'
		});

		expect(result).toBeUndefined();
		expect(publishMock).not.toHaveBeenCalled();
	});

	it('non-host calling muteMember throws FORBIDDEN LiveError', async () => {
		const { rpcHandlers, LiveError, rooms, db } = await loadFreshChat();

		vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(baseRoom);
		db.select = vi.fn().mockReturnValue(mockSelectReturning([]));

		const publishMock = vi.fn();
		const ctx = {
			user: { role: 'player', id: 'not-host', name: 'Not Host' },
			id: 'conn-nothost',
			publish: publishMock
		};

		const err = await rpcHandlers.muteMember(ctx, 'abc1234', { guestId: 'g-001' }).catch((e) => e);

		expect(err).toBeInstanceOf(LiveError);
		expect(err.code).toBe('FORBIDDEN');
	});

	it('muted spectator is not notified they are muted', async () => {
		const { mod, rpcHandlers, LiveError, rooms, db } = await loadFreshChat();

		mod.muteMap.set('room-001', new Set(['g-silent']));

		vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(baseRoom);
		db.select = vi.fn().mockReturnValue(mockSelectReturning([]));

		const publishMock = vi.fn();
		const ctx = {
			user: { role: 'guest', guestId: 'g-silent' },
			id: 'conn-g-silent',
			publish: publishMock
		};

		// Must not throw — silent drop
		const result = await rpcHandlers
			.sendMessage(ctx, 'abc1234', { body: 'Anyone there?', channel: 'spectators' })
			.catch((e) => e);

		expect(result).not.toBeInstanceOf(LiveError);
		expect(publishMock).not.toHaveBeenCalled();
	});
});
