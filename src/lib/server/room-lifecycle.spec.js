// @ts-nocheck
import { describe, it, expect } from 'vitest';
import {
	LOBBY_ABANDON_TTL_MS,
	shouldHideRoomFromPublic,
	shouldAbandonLobby
} from './room-lifecycle.js';

describe('LOBBY_ABANDON_TTL_MS', () => {
	it('is 24 hours in milliseconds', () => {
		expect(LOBBY_ABANDON_TTL_MS).toBe(24 * 60 * 60 * 1000);
	});
});

describe('shouldHideRoomFromPublic', () => {
	const now = new Date('2026-01-01T12:00:00.000Z');

	it.each([
		{
			name: 'phase ended',
			row: { phase: 'ended', ended_at: null, created_at: now },
			expected: true
		},
		{
			name: 'ended_at set (cancelled)',
			row: { phase: 'lobby', ended_at: new Date(), created_at: now },
			expected: true
		},
		{
			name: 'active lobby',
			row: { phase: 'lobby', ended_at: null, created_at: now },
			expected: false
		},
		{
			name: 'drafting',
			row: { phase: 'drafting', ended_at: null, created_at: now },
			expected: false
		}
	])('$name', ({ row, expected }) => {
		expect(shouldHideRoomFromPublic(row, now)).toBe(expected);
	});
});

describe('shouldAbandonLobby', () => {
	const base = new Date('2026-01-01T12:00:00.000Z');

	it.each([
		{
			name: 'fresh lobby',
			row: { phase: 'lobby', created_at: base },
			now: new Date(base.getTime() + LOBBY_ABANDON_TTL_MS - 1000),
			expected: false
		},
		{
			name: 'lobby at 25h',
			row: { phase: 'lobby', created_at: base },
			now: new Date(base.getTime() + LOBBY_ABANDON_TTL_MS + 60 * 60 * 1000),
			expected: true
		},
		{
			name: 'exactly at TTL boundary',
			row: { phase: 'lobby', created_at: base },
			now: new Date(base.getTime() + LOBBY_ABANDON_TTL_MS),
			expected: true
		},
		{
			name: 'not lobby phase',
			row: { phase: 'drafting', created_at: new Date(0) },
			now: new Date(base.getTime() + LOBBY_ABANDON_TTL_MS * 2),
			expected: false
		},
		{
			name: 'numeric created_at (ms)',
			row: { phase: 'lobby', created_at: base.getTime() },
			now: base.getTime() + LOBBY_ABANDON_TTL_MS + 1,
			expected: true
		}
	])('$name', ({ row, now, expected }) => {
		expect(shouldAbandonLobby(row, now)).toBe(expected);
	});
});
