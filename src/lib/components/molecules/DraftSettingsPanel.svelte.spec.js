// @ts-nocheck
import { page, userEvent } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
// Live cascade so the ported dialog/stepper/script styles apply in the browser
// context (needed for the scrim-click contract and the 320px fit check).
import '../../../app.css';
import DraftSettingsPanelHost from './DraftSettingsPanelHost.test.svelte';
import { nanoid } from 'nanoid';

/**
 * @returns {Array<{id: string, team: 'A'|'B', action: 'pick'|'ban'}>}
 */
function defaultScript() {
	return [
		{ team: 'A', action: 'ban' },
		{ team: 'B', action: 'ban' },
		{ team: 'A', action: 'ban' },
		{ team: 'B', action: 'ban' },
		{ team: 'A', action: 'pick' },
		{ team: 'B', action: 'pick' },
		{ team: 'B', action: 'pick' },
		{ team: 'A', action: 'pick' },
		{ team: 'A', action: 'pick' },
		{ team: 'B', action: 'pick' }
	].map((t) => ({ ...t, id: nanoid(8) }));
}

/** Click the fixture launcher and wait for the dialog to be visible. */
async function openModal() {
	await page.getByRole('button', { name: 'CONFIG()' }).click();
	const dialog = page.getByRole('dialog');
	await expect.element(dialog).toBeVisible();
	return dialog;
}

/** @returns {HTMLDialogElement} */
function dialogNode() {
	return document.querySelector('dialog.cy-modal');
}

/**
 * A closed <dialog> drops out of the a11y tree entirely, so role locators
 * match nothing and expect.element would throw. Poll the DOM state instead
 * (Plan 01 precedent).
 */
async function expectClosed() {
	await expect.poll(() => dialogNode().open).toBe(false);
	expect(dialogNode().checkVisibility()).toBe(false);
}

/** Parsed committed-state readout from the fixture (D-04 commit boundary). */
function committed() {
	return JSON.parse(document.querySelector('[data-testid="committed"]').textContent);
}

/** Current stepper display text, e.g. "30sec". */
function stepperText() {
	return document.querySelector('.cy-stepper-val')?.textContent;
}

async function listItemCount() {
	return (await page.getByRole('listitem').all()).length;
}

describe('DraftSettingsPanel (MOD-01) — ~/draft/config.sh terminal modal', () => {
	it('opens via launcher as a terminal modal with title and heading', async () => {
		render(DraftSettingsPanelHost, { script: defaultScript(), timerSeconds: 30 });
		await openModal();
		expect(document.querySelector('.cy-modal-title')?.textContent).toBe('~/draft/config.sh');
		await expect
			.element(page.getByRole('heading', { name: '> DRAFT_SETTINGS' }))
			.toBeInTheDocument();
	});

	it('stepper shows value + sec, steps by 5 and clamps at 10 and 120', async () => {
		const a = render(DraftSettingsPanelHost, { script: [], timerSeconds: 30 });
		await openModal();
		expect(stepperText()).toBe('30sec');
		await page.getByRole('button', { name: 'decrease' }).click();
		await expect.poll(() => stepperText()).toBe('25sec');
		a.unmount();

		const b = render(DraftSettingsPanelHost, { script: [], timerSeconds: 10 });
		await openModal();
		await page.getByRole('button', { name: 'decrease' }).click();
		await expect.poll(() => stepperText()).toBe('10sec');
		b.unmount();

		render(DraftSettingsPanelHost, { script: [], timerSeconds: 120 });
		await openModal();
		await page.getByRole('button', { name: 'increase' }).click();
		await expect.poll(() => stepperText()).toBe('120sec');
	});

	it('+ ADD_TURN replaces the empty-script line with a TEAM_A ban() row', async () => {
		render(DraftSettingsPanelHost, { script: [], timerSeconds: 30 });
		await openModal();
		await expect.element(page.getByText('// empty script — add at least one turn')).toBeVisible();

		await page.getByRole('button', { name: '+ ADD_TURN' }).click();

		await expect.poll(listItemCount).toBe(1);
		expect(document.body.textContent).not.toContain('// empty script — add at least one turn');
		const selects = document.querySelectorAll('.cy-script-row select');
		expect(selects[0].value).toBe('A');
		expect(selects[1].value).toBe('ban');
	});

	it('rm removes a turn (10 → 9 rows)', async () => {
		render(DraftSettingsPanelHost, { script: defaultScript(), timerSeconds: 30 });
		await openModal();
		await expect.poll(listItemCount).toBe(10);
		await page.getByRole('button', { name: 'remove turn 1', exact: true }).click();
		await expect.poll(listItemCount).toBe(9);
	});

	it('↑/↓ reorder swaps rows and disables at the ends (D-11)', async () => {
		render(DraftSettingsPanelHost, { script: defaultScript(), timerSeconds: 30 });
		await openModal();

		await expect
			.element(page.getByRole('button', { name: 'move turn 1 up', exact: true }))
			.toBeDisabled();
		await expect
			.element(page.getByRole('button', { name: 'move turn 10 down', exact: true }))
			.toBeDisabled();

		// Rows 1/2 are A/ban then B/ban — swapping puts team B first.
		await page.getByRole('button', { name: 'move turn 2 up', exact: true }).click();
		await expect.poll(() => document.querySelector('.cy-script-row select')?.value).toBe('B');
		const firstRowSelects = document.querySelectorAll('.cy-script-row select');
		expect(firstRowSelects[1].value).toBe('ban');
	});

	it('SAVE_CONFIG() commits to page state; esc-discard leaves it untouched (D-04)', async () => {
		const a = render(DraftSettingsPanelHost, { script: defaultScript(), timerSeconds: 30 });
		await openModal();
		await page.getByRole('button', { name: 'increase' }).click();
		await expect.poll(() => stepperText()).toBe('35sec');
		await page.getByRole('button', { name: 'SAVE_CONFIG()' }).click();
		await expectClosed();
		expect(committed().timerSeconds).toBe(35);
		a.unmount();

		render(DraftSettingsPanelHost, { script: defaultScript(), timerSeconds: 30 });
		await openModal();
		await page.getByRole('button', { name: 'increase' }).click();
		await userEvent.keyboard('{Escape}'); // dirty → veto + confirm footer
		await userEvent.keyboard('{Escape}'); // esc again discards (D-06)
		await expectClosed();
		expect(committed().timerSeconds).toBe(30);
	});

	it('dirty dismissal swaps the footer to the discard confirm; KEEP_EDITING restores it (D-05/D-06)', async () => {
		render(DraftSettingsPanelHost, { script: defaultScript(), timerSeconds: 30 });
		const dialog = await openModal();
		const before = committed();

		await page.getByRole('button', { name: 'increase' }).click();
		await userEvent.keyboard('{Escape}');
		await expect.element(dialog).toBeVisible();
		await expect.element(page.getByText('// discard unsaved config?')).toBeVisible();
		await expect.element(page.getByRole('button', { name: '[DISCARD]' })).toBeVisible();

		await page.getByRole('button', { name: '[KEEP_EDITING]' }).click();
		await expect.element(page.getByRole('button', { name: 'SAVE_CONFIG()' })).toBeVisible();
		expect(document.body.textContent).not.toContain('// discard unsaved config?');

		await userEvent.keyboard('{Escape}');
		await userEvent.keyboard('{Escape}');
		await expectClosed();
		expect(committed()).toEqual(before); // nothing committed
	});

	it('a clean modal closes silently on Escape (D-05)', async () => {
		render(DraftSettingsPanelHost, { script: defaultScript(), timerSeconds: 30 });
		await openModal();
		await userEvent.keyboard('{Escape}');
		await expectClosed();
		expect(document.body.textContent).not.toContain('// discard unsaved config?');
	});

	it('script rows fit without horizontal overflow at 320px viewport width', async () => {
		await page.viewport(320, 640);
		render(DraftSettingsPanelHost, { script: defaultScript(), timerSeconds: 30 });
		await openModal();
		await expect.poll(listItemCount).toBe(10);

		const row = document.querySelector('.cy-script-row');
		expect(row).not.toBeNull();
		expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth + 1);
		expect(row.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth);
	});
});
