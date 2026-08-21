import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
// Live cascade so the ported dialog styles apply in the browser context
// (padding: 0 makes the target===dialog scrim-click check reliable) …
import '../../../app.css';
// … and raw source for the reduced-motion CSS contract (D-09): this
// vitest-browser provider lacks page.emulateMedia (Phase 9 precedent).
import appCssSource from '../../../app.css?raw';
import CyModalHost from './CyModalHost.test.svelte';

const TITLE = '~/draft/config.sh';

/** Click the fixture launcher and wait for the dialog to be visible. */
async function openModal() {
	await page.getByRole('button', { name: 'CONFIG()' }).click();
	const dialog = page.getByRole('dialog');
	await expect.element(dialog).toBeVisible();
	return dialog;
}

/** @returns {HTMLDialogElement} */
function dialogNode() {
	return /** @type {HTMLDialogElement} */ (document.querySelector('dialog.cy-modal'));
}

/**
 * A closed <dialog> drops out of the a11y tree entirely, so the role-based
 * locator matches nothing and expect.element(...) would throw ("cannot find
 * element") instead of passing .not.toBeVisible(). Poll the DOM state instead.
 */
async function expectClosed() {
	await expect.poll(() => dialogNode().open).toBe(false);
	expect(dialogNode().checkVisibility()).toBe(false);
}

describe('CyModal.svelte — native <dialog> terminal modal (D-07/D-08)', () => {
	it('stays closed until launched, then opens in the top layer with the title as aria-label', async () => {
		render(CyModalHost, { title: TITLE });
		// Always-mounted dialog: present in the DOM but not open/visible.
		expect(dialogNode()).not.toBeNull();
		expect(dialogNode().open).toBe(false);
		expect(dialogNode().checkVisibility()).toBe(false);

		const dialog = await openModal();
		expect(dialogNode().getAttribute('aria-label')).toBe(TITLE);
		await expect.element(dialog).toBeVisible();
	});

	it('renders three aria-hidden titlebar dots (r/a/g order), the title and an esc ✕ button that closes', async () => {
		render(CyModalHost, { title: TITLE });
		await openModal();

		const dots = document.querySelectorAll('.cy-modal-bar .cy-dot');
		expect(dots.length).toBe(3);
		expect(dots[0].classList.contains('cy-dot-r')).toBe(true);
		expect(dots[1].classList.contains('cy-dot-a')).toBe(true);
		expect(dots[2].classList.contains('cy-dot-g')).toBe(true);
		for (const dot of dots) expect(dot.getAttribute('aria-hidden')).toBe('true');
		expect(document.querySelector('.cy-modal-title')?.textContent).toBe(TITLE);

		await page.getByRole('button', { name: 'esc ✕' }).click();
		await expectClosed();
	});

	it('closes on Escape (native cancel path)', async () => {
		render(CyModalHost, { title: TITLE });
		await openModal();
		await userEvent.keyboard('{Escape}');
		await expectClosed();
	});

	it('closes on scrim click (click whose target is the dialog element itself)', async () => {
		render(CyModalHost, { title: TITLE });
		await openModal();
		// A programmatic click on the dialog element has target === dialog — the
		// backdrop region case (inner chrome covers the whole box since padding is 0).
		dialogNode().click();
		await expectClosed();
	});

	it('onAttemptClose returning false vetoes esc ✕ / Escape / scrim; returning true allows dismissal (D-05)', async () => {
		let allow = false;
		const onAttemptClose = vi.fn(() => allow);
		render(CyModalHost, { title: TITLE, onAttemptClose });
		const dialog = await openModal();

		await page.getByRole('button', { name: 'esc ✕' }).click();
		await expect.element(dialog).toBeVisible();

		await userEvent.keyboard('{Escape}');
		await expect.element(dialog).toBeVisible();

		dialogNode().click();
		await expect.element(dialog).toBeVisible();

		expect(onAttemptClose).toHaveBeenCalledTimes(3);

		allow = true;
		await page.getByRole('button', { name: 'esc ✕' }).click();
		await expectClosed();
	});

	it('returns focus to the launcher button on close (browser-owned focus return)', async () => {
		render(CyModalHost, { title: TITLE });
		await openModal();
		await userEvent.keyboard('{Escape}');
		await expectClosed();
		expect(document.activeElement?.textContent).toContain('CONFIG()');
	});

	it('renders the footer snippet inside .cy-modal-foot and no foot element without it', async () => {
		const withFooter = render(CyModalHost, { title: TITLE });
		await openModal();
		const foot = document.querySelector('.cy-modal-foot');
		expect(foot).not.toBeNull();
		expect(foot?.textContent).toContain('OK()');
		withFooter.unmount();

		render(CyModalHost, { title: TITLE, withFooter: false });
		await openModal();
		expect(document.querySelector('.cy-modal-foot')).toBeNull();
	});

	it('D-09: reduced-motion suppresses the modal + backdrop entrance animation (CSS contract)', () => {
		const reducedBlock = appCssSource
			.split('@media (prefers-reduced-motion: reduce) {')
			.slice(1)
			.join('@media (prefers-reduced-motion: reduce) {');
		expect(reducedBlock).toMatch(/dialog\.cy-modal\[open\] \{\s*animation: none;/);
		expect(reducedBlock).toMatch(/dialog\.cy-modal::backdrop \{\s*animation: none;/);
	});
});
