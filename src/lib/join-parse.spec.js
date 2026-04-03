// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { parseRoomCode } from './join-parse.js';

const ALPHABET =
	'23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';

describe('parseRoomCode', () => {
	it('trims bare code with surrounding whitespace', () => {
		expect(parseRoomCode('  abc123x ')).toBe('abc123x');
	});

	it('extracts code from https URL with /draft/<code>', () => {
		expect(parseRoomCode('https://example.com/draft/XYZ789a')).toBe('XYZ789a');
	});

	it('extracts code when draft is not the first path segment', () => {
		expect(parseRoomCode('http://localhost:5173/foo/draft/CODE123/bar')).toBe('CODE123');
	});

	it('returns trimmed input when string is not a valid URL', () => {
		expect(parseRoomCode('  not-a-url  ')).toBe('not-a-url');
	});

	it('accepts a 7-character code from the allowed alphabet', () => {
		const code = '2Ab3Xyz';
		expect(code).toHaveLength(7);
		for (const ch of code) {
			expect(ALPHABET.includes(ch)).toBe(true);
		}
		expect(parseRoomCode(`  ${code}  `)).toBe(code);
	});
});
