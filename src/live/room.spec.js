// @ts-nocheck
import { describe, it, expect, afterEach } from 'vitest';
import { LiveError } from 'svelte-realtime/server';
import { createTestEnv } from 'svelte-realtime/test';
import * as roomModule from './room.js';

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
