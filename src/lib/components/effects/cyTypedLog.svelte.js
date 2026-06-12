/**
 * Typed terminal-log mechanism (FX-03).
 *
 * VERBATIM PORT of `cyber.jsx` §`useTypedLog` (React hook → Svelte 5 rune
 * factory). Prints an array of lines character-by-character and exposes the
 * reactive visible prefix plus a `done` flag once the whole buffer has printed.
 *
 * Under `prefers-reduced-motion: reduce` it jumps straight to the full text
 * (`done === true`) with NO typing — mirroring React's `reduced ? full.length : 0`
 * branch and the early `return` that skips the timer.
 *
 * The timing constants are load-bearing fidelity values — do not approximate:
 *   speed = 9 (ms/char), lineGap = 60 (ms after a newline), initial delay = 300ms.
 *
 * Presentational only — does NOT import or touch the realtime/snapshot layer.
 * Reusable across the Home boot log (Phase 10, default opts) and the Phase 12
 * connect log (`{ speed: 7, lineGap: 120 }`).
 */

/**
 * Boot-sequence log content, copied VERBATIM from `cyber.jsx` (the reference
 * default consumed by Phase 10 Home; final boot copy is a Phase 10 decision).
 *
 * @type {string[]}
 */
export const CY_BOOT_LINES = [
	'$ ./draftnet --init',
	'[ OK ] mounting entity catalog ......... 28 found',
	'[ OK ] websocket bridge ................ connected',
	'[ OK ] chat filter ..................... armed',
	'[ OK ] render protocol ................. ready',
	'> booting interface_'
];

/**
 * @typedef {object} TypedLog
 * @property {string} text  The visible prefix `full.slice(0, n)` (reactive).
 * @property {boolean} done `n >= full.length` (reactive).
 * @property {() => void} stop Disposes the internal `$effect.root`, clearing any
 *   pending timer (mirrors React's `() => clearTimeout(timer)` cleanup).
 */

/**
 * Create a reactive typed-log instance.
 *
 * @param {string[]} lines The lines to type out; joined with `"\n"`.
 * @param {{ speed?: number, lineGap?: number }} [opts]
 *   `speed` — per-character delay (ms, default 9).
 *   `lineGap` — delay applied after a newline (ms, default 60).
 * @returns {TypedLog}
 */
export function createTypedLog(lines, { speed = 9, lineGap = 60 } = {}) {
	const full = lines.join('\n');
	const reduced =
		typeof window !== 'undefined' &&
		window.matchMedia &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	let n = $state(reduced ? full.length : 0);

	// Own the timer chain inside an $effect.root so the factory can be called
	// outside component init and disposed deterministically.
	const dispose = $effect.root(() => {
		$effect(() => {
			if (reduced) return; // jump-to-full already set via initial n
			let i = 0;
			/** @type {ReturnType<typeof setTimeout> | undefined} */
			let timer;
			const step = () => {
				i += 1;
				n = i;
				if (i >= full.length) return;
				const justTypedNewline = full[i - 1] === '\n';
				timer = setTimeout(step, justTypedNewline ? lineGap : speed);
			};
			timer = setTimeout(step, 300); // initial 300ms delay
			return () => clearTimeout(timer); // teardown — mirror React cleanup
		});
	});

	return {
		get text() {
			return full.slice(0, n);
		},
		get done() {
			return n >= full.length;
		},
		stop: dispose
	};
}
