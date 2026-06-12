import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CyShader from './CyShader.svelte';

describe('CyShader.svelte — FX-01/FX-02 plasma shader (D-03)', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('mounts a canvas with cy-shader + aria-hidden, ambient default has no hot class', async () => {
		render(CyShader);
		const canvas = document.querySelector('canvas.cy-shader');
		expect(canvas).not.toBeNull();
		expect(canvas?.getAttribute('aria-hidden')).toBe('true');
		expect(canvas?.classList.contains('cy-shader-hot')).toBe(false);
	});

	it('adds cy-shader-hot when hot', async () => {
		render(CyShader, { hot: true });
		const canvas = document.querySelector('canvas.cy-shader');
		expect(canvas).not.toBeNull();
		expect(canvas?.classList.contains('cy-shader')).toBe(true);
		expect(canvas?.classList.contains('cy-shader-hot')).toBe(true);
	});

	it('tears down rAF + observers on unmount', async () => {
		const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame');
		const ioSpy = vi.spyOn(IntersectionObserver.prototype, 'disconnect');
		const roSpy = vi.spyOn(ResizeObserver.prototype, 'disconnect');

		const { unmount } = render(CyShader);
		expect(document.querySelector('canvas.cy-shader')).not.toBeNull();
		unmount();

		expect(cancelSpy).toHaveBeenCalled();
		expect(ioSpy).toHaveBeenCalled();
		expect(roSpy).toHaveBeenCalled();
	});

	it('does not schedule an ongoing rAF loop under reduced-motion', async () => {
		// Force prefers-reduced-motion to match before render.
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
		const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame');

		render(CyShader);

		// Canvas still mounts (static texture preserved)...
		expect(document.querySelector('canvas.cy-shader')).not.toBeNull();
		// ...but D-04 hard rule: zero ongoing animation — no rAF scheduled.
		expect(rafSpy).not.toHaveBeenCalled();
	});
});
