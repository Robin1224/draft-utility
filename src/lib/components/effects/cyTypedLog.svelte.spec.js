import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { createTypedLog, CY_BOOT_LINES } from './cyTypedLog.svelte.js';

/**
 * D-03 typed-log verification — browser component tests only.
 *
 * The factory uses `$state` / `$effect.root`, so the rune-driven timer chain is
 * exercised under the vitest browser (chromium) project where the Svelte runtime
 * is live. `vi.useFakeTimers()` drives the setTimeout chain deterministically;
 * `flushSync()` flushes the `$effect` that owns the timer chain after creation.
 */

describe('cyTypedLog — FX-03 typed terminal log (D-03)', () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('types out character-by-character then flips done', () => {
		vi.useFakeTimers();
		const log = createTypedLog(['ab']);
		flushSync(); // let the $effect schedule the initial setTimeout(step, 300)

		// Before the initial 300ms delay elapses: nothing typed, not done.
		expect(log.text).toBe('');
		expect(log.done).toBe(false);

		// Initial 300ms delay → first char.
		vi.advanceTimersByTime(300);
		flushSync();
		expect(log.text).toBe('a');
		expect(log.done).toBe(false);

		// speed = 9ms/char → second (final) char.
		vi.advanceTimersByTime(9);
		flushSync();
		expect(log.text).toBe('ab');
		expect(log.done).toBe(true);

		log.stop();
	});

	it('grows monotonically toward the full text', () => {
		vi.useFakeTimers();
		const log = createTypedLog(['hello']);
		flushSync();

		vi.advanceTimersByTime(300);
		flushSync();
		let prev = log.text.length;
		expect(prev).toBe(1);

		for (let i = 0; i < 10; i++) {
			vi.advanceTimersByTime(9);
			flushSync();
			expect(log.text.length).toBeGreaterThanOrEqual(prev);
			expect('hello'.startsWith(log.text)).toBe(true);
			prev = log.text.length;
		}
		expect(log.text).toBe('hello');
		expect(log.done).toBe(true);
		log.stop();
	});

	it('applies lineGap after a newline', () => {
		// full = "a\nb" → indices: 0:'a' 1:'\n' 2:'b'
		vi.useFakeTimers();
		const log = createTypedLog(['a', 'b']);
		flushSync();

		vi.advanceTimersByTime(300); // → n=1 → text "a", next scheduled after speed (full[0] !== "\n")
		flushSync();
		expect(log.text).toBe('a');

		vi.advanceTimersByTime(9); // → n=2 → text "a\n", next scheduled after lineGap (full[1] === "\n")
		flushSync();
		expect(log.text).toBe('a\n');

		// The char after the newline must wait lineGap (60ms), NOT speed (9ms).
		vi.advanceTimersByTime(9);
		flushSync();
		expect(log.text).toBe('a\n'); // still — speed alone does not reveal "b"

		vi.advanceTimersByTime(60 - 9); // total lineGap elapsed → reveal "b"
		flushSync();
		expect(log.text).toBe('a\nb');
		expect(log.done).toBe(true);
		log.stop();
	});

	it('jumps straight to full text + done under reduced motion (no typing)', () => {
		// Stub reduced motion BEFORE creating the factory.
		vi.stubGlobal('matchMedia', (/** @type {string} */ q) => ({
			matches: /reduce/.test(q),
			media: q,
			onchange: null,
			addEventListener() {},
			removeEventListener() {},
			addListener() {},
			removeListener() {},
			dispatchEvent() {
				return false;
			}
		}));
		const log = createTypedLog(['hello', 'world']);
		flushSync();

		// SYNCHRONOUS — no timer advance.
		expect(log.text).toBe('hello\nworld');
		expect(log.done).toBe(true);
		log.stop();
	});

	it('clears the pending timer on stop()/teardown', () => {
		vi.useFakeTimers();
		const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
		const log = createTypedLog(['hello world']);
		flushSync();

		vi.advanceTimersByTime(300); // a follow-up timer is now pending
		flushSync();

		clearSpy.mockClear();
		log.stop(); // dispose the $effect.root → clearTimeout teardown runs
		expect(clearSpy).toHaveBeenCalled();
	});

	it('exports CY_BOOT_LINES verbatim (6 lines)', () => {
		expect(CY_BOOT_LINES).toHaveLength(6);
		expect(CY_BOOT_LINES[0]).toBe('$ draft --connect');
		expect(CY_BOOT_LINES[2]).toContain('syncing champion catalog');
		expect(CY_BOOT_LINES[5]).toBe('> ready_');
	});
});
