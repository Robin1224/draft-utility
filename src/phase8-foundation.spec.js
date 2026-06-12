import { readFileSync, existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

describe('Phase 8 — Cyber foundation (app.css)', () => {
	const css = read('src/app.css');

	it('DS-02: declares the 12 Cyber color tokens verbatim under .cy-app', () => {
		expect(css).toContain('.cy-app');
		expect(css).toContain('--cy-bg: #050409');
		expect(css).toContain('--cy-bg-2: #0a0814');
		expect(css).toContain('--cy-bg-3: #110d22');
		expect(css).toContain('--cy-line: #2a1f4a');
		expect(css).toContain('--cy-line-2: #4a3580');
		expect(css).toContain('--cy-text: #e8e0ff');
		expect(css).toContain('--cy-text-2: #9080c0');
		expect(css).toContain('--cy-text-3: #5a4880');
		expect(css).toContain('--cy-lime: #b3ff3d');
		expect(css).toContain('--cy-violet: #c44bff');
		expect(css).toContain('--cy-amber: #ffaa00');
		expect(css).toContain('--cy-red: #ff2255');
	});

	it('DS-02: declares both glow shadows verbatim incl. the 80 alpha suffix', () => {
		expect(css).toContain('--cy-lime-glow: 0 0 12px #b3ff3d80');
		expect(css).toContain('--cy-violet-glow: 0 0 12px #c44bff80');
	});

	it('DS-02: declares the --cy-mono font stack and both radial gradients', () => {
		expect(css).toContain('--cy-mono: "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace');
		expect(css).toContain('radial-gradient(ellipse at top, #1a0f2a, transparent 60%)');
		expect(css).toContain('radial-gradient(ellipse at bottom right, #1a0a30, transparent 60%)');
	});

	it('DS-05: declares the scanline gradient verbatim', () => {
		expect(css).toContain(
			'repeating-linear-gradient(0deg, transparent 0 2px, rgba(196, 75, 255, 0.04) 2px 3px)'
		);
	});

	it('DS-01: declares exactly four JetBrains Mono @font-face blocks (400/500/600/700)', () => {
		const faces = css.split('@font-face').length - 1;
		expect(faces).toBe(4);
		expect((css.match(/JetBrains Mono/g) || []).length).toBeGreaterThanOrEqual(4);
		expect(css).toContain('font-weight: 400');
		expect(css).toContain('font-weight: 500');
		expect(css).toContain('font-weight: 600');
		expect(css).toContain('font-weight: 700');
		expect(css).toContain('JetBrainsMono-Regular.woff2');
		expect(css).toContain('JetBrainsMono-Medium.woff2');
		expect(css).toContain('JetBrainsMono-SemiBold.woff2');
		expect(css).toContain('JetBrainsMono-Bold.woff2');
	});

	it('DS-04: contains zero border-radius anywhere', () => {
		expect(css).not.toMatch(/border-radius/);
	});

	it('FX-05: declares cy-blink keyframe and suppresses it under reduced motion', () => {
		expect(css).toContain('@keyframes cy-blink');
		expect(css).toContain('prefers-reduced-motion: reduce');
		// the reduced-motion block must set animation: none on the brand cursor
		const idx = css.indexOf('prefers-reduced-motion');
		expect(css.slice(idx)).toMatch(/\.cy-brand-cur\s*\{\s*animation:\s*none/);
	});
});

describe('Phase 8 — fonts vendored & Manrope removed', () => {
	it('DS-01: the four JetBrains Mono woff2 files exist', () => {
		expect(existsSync('src/lib/assets/fonts/JetBrainsMono-Regular.woff2')).toBe(true);
		expect(existsSync('src/lib/assets/fonts/JetBrainsMono-Medium.woff2')).toBe(true);
		expect(existsSync('src/lib/assets/fonts/JetBrainsMono-SemiBold.woff2')).toBe(true);
		expect(existsSync('src/lib/assets/fonts/JetBrainsMono-Bold.woff2')).toBe(true);
	});

	it('DS-01: Manrope.ttf is removed', () => {
		expect(existsSync('src/lib/assets/fonts/Manrope.ttf')).toBe(false);
	});
});

describe('Phase 8 — Tailwind fully removed (DS-03)', () => {
	const pkg = read('package.json');
	const vite = read('vite.config.js');
	const prettier = read('.prettierrc');
	const layoutCss = read('src/routes/layout.css');

	it('DS-03: no tailwind deps in package.json', () => {
		expect(pkg).not.toContain('tailwindcss');
		expect(pkg).not.toContain('@tailwindcss/vite');
		expect(pkg).not.toContain('prettier-plugin-tailwindcss');
	});

	it('DS-03: vite.config.js has no tailwind plugin/import', () => {
		expect(vite).not.toContain('tailwindcss');
	});

	it('DS-03: .prettierrc has no tailwind plugin or tailwindStylesheet', () => {
		expect(prettier).not.toContain('tailwind');
	});

	it('DS-03: no tailwindcss/@apply/@theme directive in app.css or old layout.css', () => {
		expect(read('src/app.css')).not.toMatch(/@import\s+['"]tailwindcss/);
		expect(read('src/app.css')).not.toMatch(/@apply|@theme/);
		// layout.css should be gone or emptied (no tailwind directives left)
		expect(layoutCss).not.toMatch(/@import\s+['"]tailwindcss/);
		expect(layoutCss).not.toMatch(/@theme/);
	});
});
