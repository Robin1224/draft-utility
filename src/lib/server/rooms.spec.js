// @ts-nocheck
import { describe, it, expect } from 'vitest';
import {
	ROOM_CODE_ALPHABET,
	CODE_LENGTH,
	generatePublicCode,
	topicForRoom,
	createRoom,
	getRoomByPublicCode
} from './rooms.js';
import * as rooms from './rooms.js';

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
});

describe('host immutability (API)', () => {
	it('does not export host transfer or update helpers', () => {
		expect(rooms.transferHost).toBeUndefined();
		expect(rooms.updateHostUserId).toBeUndefined();
		expect(rooms.setRoomHost).toBeUndefined();
	});
});
