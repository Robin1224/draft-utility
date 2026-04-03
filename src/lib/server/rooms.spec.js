// @ts-nocheck
import { describe, it, expect } from 'vitest';
import {
	ROOM_CODE_ALPHABET,
	CODE_LENGTH,
	generatePublicCode,
	topicForRoom,
	createRoom,
	getRoomByPublicCode,
	joinTeamForUser,
	TEAM_FULL,
	loadLobbySnapshot,
	startDraftWithSettings,
	NOT_HOST,
	LOBBY_PHASE_REQUIRED,
	DRAFT_NOT_READY
} from './rooms.js';
import * as rooms from './rooms.js';
import { room } from './db/schema.js';
import { eq } from 'drizzle-orm';

describe('generatePublicCode', () => {
	it('returns a string of CODE_LENGTH from ROOM_CODE_ALPHABET', () => {
		const code = generatePublicCode();
		expect(code).toHaveLength(CODE_LENGTH);
		for (const ch of code) {
			expect(ROOM_CODE_ALPHABET.includes(ch)).toBe(true);
		}
	});
});

describe('topicForRoom', () => {
	it('returns lobby-prefixed topic for realtime', () => {
		expect(topicForRoom('abc12XY')).toBe('lobby:abc12XY');
	});
});

describe('createRoom', () => {
	it('inserts host_user_id and returns row with 7-char public_code', async () => {
		/** @type {Record<string, unknown> | undefined} */
		let inserted;
		const db = {
			insert: () => ({
				values: (v) => {
					inserted = v;
					return {
						returning: () =>
							Promise.resolve([
								{
									id: '00000000-0000-0000-0000-000000000001',
									public_code: v.public_code,
									host_user_id: v.host_user_id,
									phase: v.phase
								}
							])
					};
				}
			})
		};
		const result = await createRoom(db, 'user-host');
		expect(inserted?.host_user_id).toBe('user-host');
		expect(inserted?.phase).toBe('lobby');
		expect(result.public_code).toHaveLength(7);
		expect(result.host_user_id).toBe('user-host');
	});

	it('retries on unique violation then succeeds', async () => {
		let attempts = 0;
		const db = {
			insert: () => ({
				values: () => {
					attempts++;
					if (attempts < 3) {
						const err = new Error('duplicate key');
						err.code = '23505';
						return { returning: () => Promise.reject(err) };
					}
					return {
						returning: () =>
							Promise.resolve([
								{
									id: '00000000-0000-0000-0000-000000000002',
									public_code: '2345678',
									host_user_id: 'h',
									phase: 'lobby'
								}
							])
					};
				}
			})
		};
		const result = await createRoom(db, 'h');
		expect(attempts).toBe(3);
		expect(result.phase).toBe('lobby');
	});
});

describe('getRoomByPublicCode', () => {
	it('returns null when no row', async () => {
		const db = {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: () => Promise.resolve([])
					})
				})
			})
		};
		await expect(getRoomByPublicCode(db, 'nope')).resolves.toBeNull();
	});

	it('returns the first row when present', async () => {
		const row = {
			id: '00000000-0000-0000-0000-000000000003',
			public_code: 'Ab3xY9z',
			host_user_id: 'host',
			phase: 'lobby',
			created_at: new Date(),
			updated_at: new Date(),
			ended_at: null
		};
		const db = {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: () => Promise.resolve([row])
					})
				})
			})
		};
		await expect(getRoomByPublicCode(db, 'Ab3xY9z')).resolves.toEqual(row);
	});

	it('returns null when phase is ended', async () => {
		const row = {
			id: '00000000-0000-0000-0000-000000000004',
			public_code: 'enddlob',
			host_user_id: 'host',
			phase: 'ended',
			created_at: new Date(0),
			updated_at: new Date(),
			ended_at: null
		};
		const db = {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: () => Promise.resolve([row])
					})
				})
			})
		};
		await expect(getRoomByPublicCode(db, 'enddlob')).resolves.toBeNull();
	});

	it('returns null and ends stale lobby in one update', async () => {
		const created = new Date('2020-01-01T00:00:00.000Z');
		const row = {
			id: '00000000-0000-0000-0000-000000000005',
			public_code: 'stalexx',
			host_user_id: 'host',
			phase: 'lobby',
			created_at: created,
			updated_at: created,
			ended_at: null
		};
		/** @type {unknown} */
		let setPayload;
		const db = {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: () => Promise.resolve([row])
					})
				})
			}),
			update: () => ({
				set: (/** @type {unknown} */ v) => {
					setPayload = v;
					return {
						where: () => Promise.resolve(undefined)
					};
				}
			})
		};
		await expect(getRoomByPublicCode(db, 'stalexx')).resolves.toBeNull();
		expect(setPayload).toMatchObject({
			phase: 'ended'
		});
		expect(setPayload).toHaveProperty('ended_at');
		expect(setPayload).toHaveProperty('updated_at');
	});
});

describe('host immutability (API)', () => {
	it('does not export host transfer or update helpers', () => {
		expect(rooms.transferHost).toBeUndefined();
		expect(rooms.updateHostUserId).toBeUndefined();
		expect(rooms.setRoomHost).toBeUndefined();
	});
});

/**
 * Minimal drizzle-shaped DB for joinTeamForUser: tracks query order and mutates `rows`.
 *
 * @param {{ rows: object[] }} state
 */
function createJoinTeamMockDb(state) {
	let selectWhereCall = 0;
	return {
		select(_fields) {
			return {
				from() {
					return {
						where() {
							selectWhereCall++;
							const call = selectWhereCall;
							return {
								limit() {
									if (call === 1) {
										const u = state.rows.find(
											(m) => m.room_id === 'r1' && m.user_id === 'u-new'
										);
										return Promise.resolve(u ? [u] : []);
									}
									return Promise.reject(new Error(`unexpected limit at ${call}`));
								},
								orderBy() {
									const team = call === 3 ? 'A' : call === 4 ? 'B' : null;
									if (!team) return Promise.reject(new Error(`unexpected orderBy at ${call}`));
									const ordered = state.rows
										.filter((m) => m.room_id === 'r1' && m.team === team)
										.sort((a, b) => a.joined_at - b.joined_at);
									return Promise.resolve(ordered.map((m) => ({ id: m.id })));
								},
								then(onF, onR) {
									if (call === 2) {
										const n = state.rows.filter(
											(m) =>
												m.room_id === 'r1' &&
												m.team === 'A' &&
												m.user_id !== 'u-new'
										).length;
										return Promise.resolve([{ n }]).then(onF, onR);
									}
									return Promise.reject(new Error(`unexpected then at ${call}`)).then(
										onF,
										onR
									);
								}
							};
						}
					};
				}
			};
		},
		insert(_table) {
			return {
				values(v) {
					const row = {
						id: 'm-new',
						room_id: v.room_id,
						user_id: v.user_id,
						guest_id: v.guest_id,
						team: v.team,
						is_captain: false,
						joined_at: v.joined_at ?? new Date('2020-01-01T00:00:00Z')
					};
					state.rows.push(row);
					return Promise.resolve();
				}
			};
		},
		update(_table) {
			return {
				set(s) {
					return {
						where() {
							const cap = s.is_captain;
							const target = state.rows.find((m) => m.id === 'm-new');
							if (target && typeof cap === 'boolean') target.is_captain = cap;
							return Promise.resolve();
						}
					};
				}
			};
		}
	};
}

describe('joinTeamForUser (ROOM-04 captain + cap)', () => {
	it('throws TEAM_FULL when team A already has 3 other players (cap)', async () => {
		let q = 0;
		const db = {
			select() {
				return {
					from() {
						return {
							where() {
								q++;
								const i = q;
								return {
									limit() {
										expect(i).toBe(1);
										return Promise.resolve([]);
									},
									then(onF, onR) {
										expect(i).toBe(2);
										return Promise.resolve([{ n: 3 }]).then(onF, onR);
									}
								};
							}
						};
					}
				};
			}
		};
		await expect(
			joinTeamForUser(db, { roomId: 'r1', userId: 'u-new', team: 'A' })
		).rejects.toBe(TEAM_FULL);
	});

	it('first player on team A becomes captain after join (captain)', async () => {
		const state = { rows: [] };
		const db = createJoinTeamMockDb(state);
		await joinTeamForUser(db, { roomId: 'r1', userId: 'u-new', team: 'A' });
		expect(state.rows).toHaveLength(1);
		expect(state.rows[0].is_captain).toBe(true);
	});
});

// ─── startDraftWithSettings ───────────────────────────────────────────────────

const DEFAULT_SCRIPT = [{ team: 'A', action: 'ban' }, { team: 'B', action: 'ban' }];
const TIMER_MS = 30000;

/**
 * Minimal mock db for startDraftWithSettings tests.
 *
 * @param {{ roomRow: object, membersA?: object[], membersB?: object[] }} opts
 * @param {{ updatedRow?: object, capturedSet?: { value?: unknown } }} captures
 */
function createStartDraftMockDb(opts, captures = {}) {
	const { roomRow, membersA = [], membersB = [] } = opts;
	let selectCall = 0;

	return {
		select() {
			return {
				from() {
					return {
						where() {
							selectCall++;
							const call = selectCall;
							return {
								limit() {
									// First select: room row
									return Promise.resolve(roomRow ? [roomRow] : []);
								},
								// member selects (no limit, resolves directly)
								then(onF, onR) {
									if (call === 2) return Promise.resolve(membersA).then(onF, onR);
									if (call === 3) return Promise.resolve(membersB).then(onF, onR);
									return Promise.reject(new Error(`unexpected select at call ${call}`)).then(onF, onR);
								}
							};
						}
					};
				}
			};
		},
		update() {
			return {
				set(v) {
					if (captures.capturedSet) captures.capturedSet.value = v;
					return {
						where() {
							return {
								returning() {
									const updated = opts.updatedRow ?? { ...roomRow, ...v };
									return Promise.resolve([updated]);
								}
							};
						}
					};
				}
			};
		}
	};
}

describe('startDraftWithSettings', () => {
	it('throws NOT_HOST when caller is not host', async () => {
		const roomRow = { id: 'r1', host_user_id: 'host-1', phase: 'lobby' };
		const db = createStartDraftMockDb({ roomRow, membersA: [], membersB: [] });
		await expect(
			startDraftWithSettings(db, { roomId: 'r1', hostUserId: 'not-host', script: DEFAULT_SCRIPT, timerMs: TIMER_MS })
		).rejects.toBe(NOT_HOST);
	});

	it('throws LOBBY_PHASE_REQUIRED when room phase is not lobby', async () => {
		const roomRow = { id: 'r1', host_user_id: 'host-1', phase: 'drafting' };
		const db = createStartDraftMockDb({ roomRow, membersA: [], membersB: [] });
		await expect(
			startDraftWithSettings(db, { roomId: 'r1', hostUserId: 'host-1', script: DEFAULT_SCRIPT, timerMs: TIMER_MS })
		).rejects.toBe(LOBBY_PHASE_REQUIRED);
	});

	it('throws DRAFT_NOT_READY when team A has no captain', async () => {
		const roomRow = { id: 'r1', host_user_id: 'host-1', phase: 'lobby' };
		// Team A has members but no captain
		const membersA = [{ id: 'm1', room_id: 'r1', user_id: 'u1', team: 'A', is_captain: false }];
		const membersB = [{ id: 'm2', room_id: 'r1', user_id: 'u2', team: 'B', is_captain: true }];
		const db = createStartDraftMockDb({ roomRow, membersA, membersB });
		await expect(
			startDraftWithSettings(db, { roomId: 'r1', hostUserId: 'host-1', script: DEFAULT_SCRIPT, timerMs: TIMER_MS })
		).rejects.toBe(DRAFT_NOT_READY);
	});

	it('throws DRAFT_NOT_READY when team B has no members', async () => {
		const roomRow = { id: 'r1', host_user_id: 'host-1', phase: 'lobby' };
		const membersA = [{ id: 'm1', room_id: 'r1', user_id: 'u1', team: 'A', is_captain: true }];
		const membersB = [];
		const db = createStartDraftMockDb({ roomRow, membersA, membersB });
		await expect(
			startDraftWithSettings(db, { roomId: 'r1', hostUserId: 'host-1', script: DEFAULT_SCRIPT, timerMs: TIMER_MS })
		).rejects.toBe(DRAFT_NOT_READY);
	});

	it('sets phase=drafting and returns updated row with draft_state on success', async () => {
		const roomRow = { id: 'r1', host_user_id: 'host-1', phase: 'lobby' };
		const membersA = [{ id: 'm1', room_id: 'r1', user_id: 'u1', team: 'A', is_captain: true }];
		const membersB = [{ id: 'm2', room_id: 'r1', user_id: 'u2', team: 'B', is_captain: true }];
		/** @type {{ value?: unknown }} */
		const capturedSet = {};
		const db = createStartDraftMockDb({ roomRow, membersA, membersB }, { capturedSet });
		const result = await startDraftWithSettings(db, {
			roomId: 'r1',
			hostUserId: 'host-1',
			script: DEFAULT_SCRIPT,
			timerMs: TIMER_MS
		});
		expect(capturedSet.value).toMatchObject({
			phase: 'drafting',
			draft_state: expect.objectContaining({
				script: DEFAULT_SCRIPT,
				turnIndex: 0,
				timerMs: TIMER_MS
			})
		});
		expect(capturedSet.value.draft_state).toHaveProperty('turnEndsAt');
		expect(result).toBeDefined();
	});
});

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)('joinTeamForUser integration (optional DATABASE_URL)', () => {
	let db;

	it('loads lobby snapshot with one captain on A after real join', async () => {
		const { db: realDb } = await import('./db/index.js');
		db = realDb;
		const hostId = 'rooms-spec-host-' + Date.now();
		const row = await createRoom(db, hostId);
		try {
			const uid = 'rooms-spec-user-' + Date.now();
			await joinTeamForUser(db, { roomId: row.id, userId: uid, team: 'A' });
			const snap = await loadLobbySnapshot(db, row.public_code);
			expect(snap.teams.A).toHaveLength(1);
			expect(snap.teams.A[0].isCaptain).toBe(true);
		} finally {
			await db.delete(room).where(eq(room.id, row.id));
		}
	});
});
