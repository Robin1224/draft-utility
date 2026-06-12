import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CyShell from './CyShell.svelte';

describe('CyShell.svelte — DS-05 chrome', () => {
	it('renders the DRAFT_EM brand, the 3 tracker labels, the room meta and copy button', async () => {
		render(CyShell, { phase: 'lobby', code: 'K7-MIRA' });
		await expect.element(page.getByText('DRAFT_EM')).toBeInTheDocument();
		await expect.element(page.getByText('01_LOBBY')).toBeInTheDocument();
		await expect.element(page.getByText('02_DRAFTING')).toBeInTheDocument();
		await expect.element(page.getByText('03_REVIEW')).toBeInTheDocument();
		await expect.element(page.getByText('$ ROOM=')).toBeInTheDocument();
		await expect.element(page.getByText('K7-MIRA')).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: '[copy]' })).toBeInTheDocument();
	});

	it('renders the scanline overlay', async () => {
		render(CyShell, { phase: 'lobby', code: 'K7-MIRA' });
		expect(document.querySelector('.cy-scanlines')).not.toBeNull();
	});

	it('leaves an empty .cy-shader mount point (no canvas) for Phase 9', async () => {
		render(CyShell, { phase: 'lobby', code: 'K7-MIRA' });
		expect(document.querySelector('.cy-shader')).not.toBeNull();
		expect(document.querySelector('.cy-shader canvas')).toBeNull();
	});

	it('DS-05/D-09: shows — and disables copy when there is no room', async () => {
		render(CyShell, { phase: 'lobby', code: null });
		await expect.element(page.getByText('—')).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: '[copy]' })).toBeDisabled();
	});

	it('DS-05/D-09: clicking copy writes the room code to the clipboard', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		// ensure a clipboard object exists in the test browser context
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
		render(CyShell, { phase: 'lobby', code: 'K7-MIRA' });
		await page.getByRole('button', { name: '[copy]' }).click();
		expect(writeText).toHaveBeenCalledWith('K7-MIRA');
	});
});

describe('CyShell.svelte — D-07 tracker mapping', () => {
	it('marks the active phase with is-active', async () => {
		render(CyShell, { phase: 'drafting', code: 'K7-MIRA' });
		const active = document.querySelector('.cy-phase.is-active');
		expect(active).not.toBeNull();
		expect(active?.textContent).toContain('02_DRAFTING');
	});

	it('cancelled/unknown phase → no active step, no crash', async () => {
		expect(() => render(CyShell, { phase: 'cancelled', code: 'K7-MIRA' })).not.toThrow();
		expect(document.querySelector('.cy-phase.is-active')).toBeNull();
	});
});
