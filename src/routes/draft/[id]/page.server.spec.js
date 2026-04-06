// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/db', () => ({ db: {} }));
vi.mock('$lib/server/rooms', () => ({
	getRoomByPublicCode: vi.fn()
}));
vi.mock('$lib/server/draft.js', () => ({
	loadDraftSnapshot: vi.fn()
}));
vi.mock('$lib/join-parse.js', () => ({
	parseRoomCode: vi.fn((code) => code)
}));

import { load } from './+page.server.js';
import { getRoomByPublicCode } from '$lib/server/rooms';
import { loadDraftSnapshot } from '$lib/server/draft.js';

const makeEvent = ({ phase = 'lobby', userId = 'user-1', params = { id: 'ABC1234' } } = {}) => ({
	params,
	locals: { user: userId ? { id: userId } : null },
	url: { origin: 'https://example.com' }
});

describe('+page.server load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns base object for lobby phase (no actions/teams in response)', async () => {
		getRoomByPublicCode.mockResolvedValue({
			public_code: 'ABC1234',
			phase: 'lobby',
			host_user_id: 'host-1'
		});
		const result = await load(makeEvent({ phase: 'lobby' }));
		expect(result.room.phase).toBe('lobby');
		expect(result).not.toHaveProperty('actions');
		expect(result).not.toHaveProperty('teams');
	});

	it('returns actions and teams for review phase', async () => {
		const actionRows = [
			{ id: 'a1', room_id: 'r1', turn_index: 0, team: 'A', action: 'ban', champion_id: 'zander' },
			{ id: 'a2', room_id: 'r1', turn_index: 1, team: 'B', action: 'ban', champion_id: 'sirius' }
		];
		getRoomByPublicCode.mockResolvedValue({
			public_code: 'ABC1234',
			phase: 'review',
			host_user_id: 'host-1'
		});
		loadDraftSnapshot.mockResolvedValue({
			actions: actionRows,
			teams: { A: [{ userId: 'u1' }], B: [{ userId: 'u2' }] }
		});
		const result = await load(makeEvent({ phase: 'review' }));
		expect(result.room.phase).toBe('review');
		expect(result.actions).toEqual(actionRows);
		expect(result.teams).toMatchObject({ A: [{ userId: 'u1' }], B: [{ userId: 'u2' }] });
	});

	it('returns userId=null for unauthenticated visitor on review phase (POST-02)', async () => {
		getRoomByPublicCode.mockResolvedValue({
			public_code: 'ABC1234',
			phase: 'review',
			host_user_id: 'host-1'
		});
		loadDraftSnapshot.mockResolvedValue({ actions: [], teams: { A: [], B: [] } });
		const result = await load(makeEvent({ phase: 'review', userId: null }));
		expect(result.userId).toBeNull();
		expect(result.actions).toEqual([]);
	});

	it('returns empty actions when loadDraftSnapshot returns null (graceful degradation)', async () => {
		getRoomByPublicCode.mockResolvedValue({
			public_code: 'ABC1234',
			phase: 'review',
			host_user_id: 'host-1'
		});
		loadDraftSnapshot.mockResolvedValue(null);
		const result = await load(makeEvent({ phase: 'review' }));
		expect(result.actions).toEqual([]);
		expect(result.teams).toEqual({ A: [], B: [] });
	});
});
