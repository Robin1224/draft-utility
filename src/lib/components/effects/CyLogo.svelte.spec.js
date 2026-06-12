import { page } from 'vitest/browser';
import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
// Load the global stylesheet so the .cy-logo* cascade (Task 1, app.css) is live
// in the browser test context — the reveal/reduced-motion assertions read
// computed styles, which require the real CSS rules to be applied.
import '../../../app.css';
// Raw CSS source so the reduced-motion contract can be asserted directly when
// the browser provider lacks page.emulateMedia (Playwright media emulation is
// not exposed by this vitest-browser provider — see the reduced-motion test).
import appCssSource from '../../../app.css?raw';
import CyLogo from './CyLogo.svelte';

describe('CyLogo.svelte — FX-04 shaded-ASCII DRAFT wordmark (D-03)', () => {
	it('renders 9 cy-logo-line spans inside role=img aria-label DRAFT, base always visible', async () => {
		render(CyLogo);
		// The wrap is exposed to AT as a single image labelled DRAFT (D-01).
		await expect.element(page.getByRole('img', { name: 'DRAFT' })).toBeInTheDocument();
		// All 9 block-art rows render as individual reveal lines.
		expect(document.querySelectorAll('.cy-logo-line').length).toBe(9);
		// The base .cy-logo carries no opacity:0 — it must always be visible.
		const logo = /** @type {HTMLElement} */ (document.querySelector('.cy-logo'));
		expect(logo).not.toBeNull();
		expect(getComputedStyle(logo).opacity).not.toBe('0');
		// The glitch ghost overlay is decorative — hidden from AT.
		const glitch = document.querySelector('.cy-logo-glitch');
		expect(glitch?.getAttribute('aria-hidden')).toBe('true');
	});

	it('rendered prop toggles is-rendered to fire the reveal', async () => {
		const notRendered = render(CyLogo, { rendered: false });
		expect(document.querySelector('.cy-logo-wrap.is-rendered')).toBeNull();
		notRendered.unmount();

		render(CyLogo, { rendered: true });
		expect(document.querySelector('.cy-logo-wrap.is-rendered')).not.toBeNull();
	});

	it('reveal never animates opacity — base wordmark stays visible', async () => {
		render(CyLogo, { rendered: true });
		// Fidelity guardrail: cy-logo-in animates transform + brightness only, so
		// the wordmark's opacity is locked at 1 and can never get stuck hidden.
		const logo = /** @type {HTMLElement} */ (document.querySelector('.cy-logo'));
		expect(logo).not.toBeNull();
		expect(getComputedStyle(logo).opacity).toBe('1');
	});

	it('reduced-motion suppresses reveal/glitch leaving the static wordmark', async () => {
		render(CyLogo, { rendered: true });

		// FX-04 motion-safety: the fully-formed static wordmark is still present
		// and visible regardless of the motion preference (the suppression only
		// removes the reveal/glitch animation, never the wordmark itself).
		expect(document.querySelectorAll('.cy-logo-line').length).toBe(9);
		const logo = /** @type {HTMLElement} */ (document.querySelector('.cy-logo'));
		expect(getComputedStyle(logo).opacity).toBe('1');

		// True behavioral emulation would use page.emulateMedia, but this
		// vitest-browser provider does not expose it (it is not a function here).
		// The suppression is pure CSS, so assert the reduced-motion contract
		// directly: under prefers-reduced-motion the reveal and glitch animations
		// are set to none, leaving the static wordmark.
		const reducedBlock = appCssSource
			.split('@media (prefers-reduced-motion: reduce) {')
			.slice(1)
			.join('@media (prefers-reduced-motion: reduce) {');
		expect(reducedBlock).toContain('.cy-logo-wrap.is-rendered .cy-logo-line');
		expect(reducedBlock).toMatch(
			/\.cy-logo-wrap\.is-rendered \.cy-logo-line \{\s*animation: none;/
		);
		expect(reducedBlock).toMatch(/\.cy-logo-glitch \{\s*animation: none !important;/);
	});
});
