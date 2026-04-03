// @ts-check
import { describe, it, expect } from 'vitest';
import { DEFAULT_SCRIPT, DEFAULT_TIMER_MS } from './draft-script.js';

describe('DEFAULT_SCRIPT (DRAFT-01)', () => {
	it('has exactly 10 turns', () => {
		expect(DEFAULT_SCRIPT).toHaveLength(10);
	});

	it('first 4 turns are bans (2 per team alternating: A,B,A,B)', () => {
		const bans = DEFAULT_SCRIPT.slice(0, 4);
		expect(bans[0]).toEqual({ team: 'A', action: 'ban' });
		expect(bans[1]).toEqual({ team: 'B', action: 'ban' });
		expect(bans[2]).toEqual({ team: 'A', action: 'ban' });
		expect(bans[3]).toEqual({ team: 'B', action: 'ban' });
	});

	it('last 6 turns are picks in snake order: A,B,B,A,A,B', () => {
		const picks = DEFAULT_SCRIPT.slice(4);
		expect(picks[0]).toEqual({ team: 'A', action: 'pick' });
		expect(picks[1]).toEqual({ team: 'B', action: 'pick' });
		expect(picks[2]).toEqual({ team: 'B', action: 'pick' });
		expect(picks[3]).toEqual({ team: 'A', action: 'pick' });
		expect(picks[4]).toEqual({ team: 'A', action: 'pick' });
		expect(picks[5]).toEqual({ team: 'B', action: 'pick' });
	});

	it('every turn has shape { team: "A"|"B", action: "pick"|"ban" }', () => {
		const validTeams = ['A', 'B'];
		const validActions = ['pick', 'ban'];
		for (const turn of DEFAULT_SCRIPT) {
			expect(validTeams).toContain(turn.team);
			expect(validActions).toContain(turn.action);
		}
	});

	it('DEFAULT_TIMER_MS is 30000', () => {
		expect(DEFAULT_TIMER_MS).toBe(30_000);
	});
});
