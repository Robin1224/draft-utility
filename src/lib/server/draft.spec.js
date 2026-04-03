// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';

vi.mock('$lib/server/rooms.js', () => ({
	getRoomByPublicCode: vi.fn(),
	loadLobbySnapshot: vi.fn()
}));

import {
	writeDraftAction,
	loadDraftSnapshot,
	completeDraft,
	updateDraftState,
	advanceTurnIfCurrent
} from './draft.js';
import { getRoomByPublicCode, loadLobbySnapshot } from '$lib/server/rooms.js';

describe('draft DB layer', () => {
	describe('writeDraftAction', () => {
		it('inserts a row with room_id, turn_index, team, action, champion_id', async () => {
			/** @type {Record<string, unknown> | undefined} */
			let inserted;
			const db = {
				insert: () => ({
					values: (v) => {
						inserted = v;
						return Promise.resolve();
					}
				})
			};
			await writeDraftAction(db, {
				roomId: 'room-1',
				turnIndex: 0,
				team: 'A',
				action: 'ban',
				championId: 'zander'
			});
			expect(inserted).toMatchObject({
				room_id: 'room-1',
				turn_index: 0,
				team: 'A',
				action: 'ban',
				champion_id: 'zander'
			});
		});

		it('unique constraint violation (room_id, turn_index) is re-thrown as DUPLICATE_TURN', async () => {
			const err = new Error('duplicate key');
			err.code = '23505';
			const db = {
				insert: () => ({
					values: () => Promise.reject(err)
				})
			};
			await expect(
				writeDraftAction(db, { roomId: 'room-1', turnIndex: 0, team: 'A', action: 'ban', championId: null })
			).rejects.toBe('DUPLICATE_TURN');
		});

		it('rethrows non-unique errors', async () => {
			const err = new Error('connection error');
			const db = {
				insert: () => ({
					values: () => Promise.reject(err)
				})
			};
			await expect(
				writeDraftAction(db, { roomId: 'room-1', turnIndex: 0, team: 'A', action: 'ban', championId: null })
			).rejects.toThrow('connection error');
		});

		it('detects unique violation nested in cause', async () => {
			const cause = new Error('unique');
			cause.code = '23505';
			const err = new Error('wrapped');
			err.cause = cause;
			const db = {
				insert: () => ({
					values: () => Promise.reject(err)
				})
			};
			await expect(
				writeDraftAction(db, { roomId: 'room-1', turnIndex: 0, team: 'A', action: 'ban', championId: null })
			).rejects.toBe('DUPLICATE_TURN');
		});
	});

	describe('loadDraftSnapshot', () => {
		it('returns null when room not found', async () => {
			getRoomByPublicCode.mockResolvedValue(null);
			const db = {};
			await expect(loadDraftSnapshot(db, 'NOTFOUND')).resolves.toBeNull();
		});

		it('returns snapshot with draftState and actions array when phase is drafting', async () => {
			const roomRow = {
				id: 'room-1',
				public_code: 'ABC1234',
				phase: 'drafting',
				draft_state: { script: [], turnIndex: 2, turnEndsAt: '2026-01-01T00:00:00Z', timerMs: 30000 }
			};
			const baseSnapshot = {
				publicCode: 'ABC1234',
				roomId: 'room-1',
				phase: 'drafting',
				hostUserId: 'host-1',
				teams: { A: [], B: [] },
				spectators: []
			};
			const actionRows = [
				{ id: 'a1', room_id: 'room-1', turn_index: 0, team: 'A', action: 'ban', champion_id: 'zander', created_at: new Date() },
				{ id: 'a2', room_id: 'room-1', turn_index: 1, team: 'B', action: 'ban', champion_id: 'sirius', created_at: new Date() }
			];
			getRoomByPublicCode.mockResolvedValue(roomRow);
			loadLobbySnapshot.mockResolvedValue(baseSnapshot);
			const db = {
				select: () => ({
					from: () => ({
						where: () => ({
							orderBy: () => Promise.resolve(actionRows)
						})
					})
				})
			};
			const result = await loadDraftSnapshot(db, 'ABC1234');
			expect(result).toMatchObject({
				publicCode: 'ABC1234',
				roomId: 'room-1',
				phase: 'drafting',
				draftState: { script: [], turnIndex: 2, turnEndsAt: '2026-01-01T00:00:00Z', timerMs: 30000 },
				actions: actionRows
			});
		});

		it('returns snapshot with draftState=null when room has no draft_state', async () => {
			const roomRow = { id: 'room-1', public_code: 'ABC1234', phase: 'lobby', draft_state: null };
			const baseSnapshot = {
				publicCode: 'ABC1234',
				roomId: 'room-1',
				phase: 'lobby',
				hostUserId: 'host-1',
				teams: { A: [], B: [] },
				spectators: []
			};
			getRoomByPublicCode.mockResolvedValue(roomRow);
			loadLobbySnapshot.mockResolvedValue(baseSnapshot);
			const db = {
				select: () => ({
					from: () => ({
						where: () => ({
							orderBy: () => Promise.resolve([])
						})
					})
				})
			};
			const result = await loadDraftSnapshot(db, 'ABC1234');
			expect(result.draftState).toBeNull();
			expect(result.actions).toEqual([]);
		});
	});

	describe('completeDraft', () => {
		it('sets room phase to ended and ended_at to now', async () => {
			/** @type {Record<string, unknown> | undefined} */
			let setPayload;
			const db = {
				update: () => ({
					set: (v) => {
						setPayload = v;
						return {
							where: () => Promise.resolve()
						};
					}
				})
			};
			await completeDraft(db, 'room-1');
			expect(setPayload).toMatchObject({ phase: 'ended' });
			expect(setPayload).toHaveProperty('ended_at');
			expect(setPayload).toHaveProperty('updated_at');
		});
	});

	describe('updateDraftState', () => {
		it('updates draft_state and updated_at on the room row', async () => {
			/** @type {Record<string, unknown> | undefined} */
			let setPayload;
			const db = {
				update: () => ({
					set: (v) => {
						setPayload = v;
						return {
							where: () => Promise.resolve()
						};
					}
				})
			};
			const newState = { script: [], turnIndex: 3, turnEndsAt: '2026-01-01T00:00:00Z', timerMs: 30000 };
			await updateDraftState(db, 'room-1', newState);
			expect(setPayload).toMatchObject({ draft_state: newState });
			expect(setPayload).toHaveProperty('updated_at');
		});
	});

	describe('advanceTurnIfCurrent', () => {
		it('returns true when 1 row updated (expected turn matches)', async () => {
			const db = {
				update: () => ({
					set: () => ({
						where: () => ({
							returning: () => Promise.resolve([{ id: 'room-1' }])
						})
					})
				})
			};
			const result = await advanceTurnIfCurrent(db, 'room-1', 0, 1, '2026-01-01T00:01:00Z');
			expect(result).toBe(true);
		});

		it('returns false when 0 rows updated (turn already advanced)', async () => {
			const db = {
				update: () => ({
					set: () => ({
						where: () => ({
							returning: () => Promise.resolve([])
						})
					})
				})
			};
			const result = await advanceTurnIfCurrent(db, 'room-1', 0, 1, '2026-01-01T00:01:00Z');
			expect(result).toBe(false);
		});
	});
});
