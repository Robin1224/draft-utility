// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { filterMessage } from '$lib/chat-filter.js';

// NOTE: slur-list.json includes ["ass", "damn", "hell", "crap", "piss"]
// "ass" appears inside "assassin" as a substring — used for Scunthorpe test

describe('chat-filter — length cap (CHAT-04)', () => {
	it('message of exactly 500 chars passes length check', () => {
		const result = filterMessage('a'.repeat(500));
		expect(result).toEqual({ blocked: false, body: 'a'.repeat(500) });
	});

	it('message of 501 chars returns { blocked: true, reason: "TOO_LONG" }', () => {
		const result = filterMessage('a'.repeat(501));
		expect(result).toEqual({ blocked: true, reason: 'TOO_LONG' });
	});

	it('empty message passes length check', () => {
		const result = filterMessage('');
		expect(result).toEqual({ blocked: false, body: '' });
	});
});

describe('chat-filter — NFKC normalization and zero-width strip (CHAT-04)', () => {
	it('body is NFKC-normalized before slur check', () => {
		// '\uFB01' is the NFKC representation of 'fi' ligature → normalizes to 'fi'
		const result = filterMessage('\uFB01ne weather');
		expect(result.blocked).toBe(false);
		if (!result.blocked) {
			// After NFKC, '\uFB01' becomes 'fi'
			expect(result.body).toBe('fine weather');
		}
	});

	it('zero-width space \\u200B is stripped before slur check', () => {
		const result = filterMessage('hello\u200Bworld');
		expect(result.blocked).toBe(false);
		if (!result.blocked) {
			expect(result.body).toBe('helloworld');
		}
	});

	it('zero-width non-joiner \\u200C is stripped before slur check', () => {
		const result = filterMessage('hello\u200Cworld');
		expect(result.blocked).toBe(false);
		if (!result.blocked) {
			expect(result.body).toBe('helloworld');
		}
	});

	it('zero-width joiner \\u200D is stripped before slur check', () => {
		const result = filterMessage('hello\u200Dworld');
		expect(result.blocked).toBe(false);
		if (!result.blocked) {
			expect(result.body).toBe('helloworld');
		}
	});

	it('BOM \\uFEFF is stripped before slur check', () => {
		const result = filterMessage('\uFEFFhello');
		expect(result.blocked).toBe(false);
		if (!result.blocked) {
			expect(result.body).toBe('hello');
		}
	});

	it('soft hyphen \\u00AD is stripped before slur check', () => {
		const result = filterMessage('hel\u00ADlo');
		expect(result.blocked).toBe(false);
		if (!result.blocked) {
			expect(result.body).toBe('hello');
		}
	});
});

describe('chat-filter — slur matching (CHAT-04)', () => {
	it('message containing a listed slur returns { blocked: true, reason: "SLUR" }', () => {
		// "damn" is a standalone slur word
		const result = filterMessage('what the damn');
		expect(result).toEqual({ blocked: true, reason: 'SLUR' });
	});

	it('message containing slur after NFKC normalization is blocked', () => {
		// Use a message where NFKC normalization would expose a slur character
		// "ｈｅｌｌ" is fullwidth — NFKC normalizes to "hell"
		const result = filterMessage('\uFF48\uFF45\uFF4C\uFF4C');
		expect(result).toEqual({ blocked: true, reason: 'SLUR' });
	});

	it('word containing slur as substring but not at word boundary passes (Scunthorpe)', () => {
		// "assassin" contains "ass" but at a non-word boundary position within the word
		const result = filterMessage('The assassin crept silently');
		expect(result.blocked).toBe(false);
	});

	it('clean message returns { blocked: false, body: normalizedBody }', () => {
		const result = filterMessage('Hello, this is a clean message!');
		expect(result).toEqual({ blocked: false, body: 'Hello, this is a clean message!' });
	});

	it('slur check is case-insensitive', () => {
		// "DAMN" should be blocked even though slur list has lowercase "damn"
		const result = filterMessage('DAMN it all');
		expect(result).toEqual({ blocked: true, reason: 'SLUR' });
	});
});
