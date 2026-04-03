// @ts-nocheck
import { describe, it, expect } from 'vitest';

// draft-script.js does not exist yet — stub with todo
describe('DEFAULT_SCRIPT (DRAFT-01)', () => {
	it.todo('has exactly 10 turns');
	it.todo('first 4 turns are bans (2 per team alternating: A,B,A,B)');
	it.todo('last 6 turns are picks in snake order: A,B,B,A,A,B');
	it.todo('every turn has shape { team: "A"|"B", action: "pick"|"ban" }');
	it.todo('DEFAULT_TIMER_MS is 30000');
});
