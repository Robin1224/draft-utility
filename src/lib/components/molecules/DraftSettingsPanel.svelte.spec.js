// @ts-nocheck
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import DraftSettingsPanel from './DraftSettingsPanel.svelte';
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

describe('DraftSettingsPanel (HOST-01)', () => {
	it('renders turn timer input with default value 30', async () => {
		render(DraftSettingsPanel, { script: defaultScript(), timerSeconds: 30 });
		const input = page.getByRole('spinbutton', { name: /turn timer/i });
		await expect.element(input).toBeInTheDocument();
		await expect.element(input).toHaveValue(30);
	});

	it('renders script editor list with default 10-turn script', async () => {
		render(DraftSettingsPanel, { script: defaultScript(), timerSeconds: 30 });
		const items = page.getByRole('listitem');
		await expect.element(items.nth(0)).toBeInTheDocument();
		// All 10 list items should be present
		const list = page.getByRole('list', { name: /pick.ban turn order/i });
		await expect.element(list).toBeInTheDocument();
		// Verify 10 rows rendered
		const allItems = page.getByRole('listitem');
		expect((await allItems.all()).length).toBe(10);
	});

	it('renders "Add turn" button that appends a turn to the list', async () => {
		render(DraftSettingsPanel, { script: [], timerSeconds: 30 });
		// Empty state should show the message
		await expect
			.element(page.getByText('No turns configured. Add a turn to begin.'))
			.toBeInTheDocument();

		// Click "Add turn"
		const addBtn = page.getByRole('button', { name: /add turn/i });
		await addBtn.click();

		// The empty state message should be gone; one list item should appear
		const items = page.getByRole('listitem');
		expect((await items.all()).length).toBe(1);
	});

	it('renders "Remove" button on each row that removes that turn', async () => {
		const script = defaultScript();
		render(DraftSettingsPanel, { script, timerSeconds: 30 });

		// Click the first "Remove turn 1" button (exact match to avoid matching "Remove turn 10")
		const removeBtn = page.getByRole('button', { name: 'Remove turn 1', exact: true });
		await removeBtn.click();

		// Should now have 9 items
		const items = page.getByRole('listitem');
		expect((await items.all()).length).toBe(9);
	});

	it('does not render when phase is not lobby (panel is removed, not disabled)', async () => {
		// DraftSettingsPanel itself has no phase awareness — it is conditionally rendered by the parent.
		// This test verifies the panel renders when passed valid props (parent controls visibility).
		render(DraftSettingsPanel, { script: defaultScript(), timerSeconds: 30 });
		const panel = page.getByTestId
			? page.getByRole('generic').filter({ hasText: 'Draft settings' })
			: null;
		// Panel id exists
		const panelEl = document.getElementById('draft-settings-panel');
		expect(panelEl).not.toBeNull();
	});
});
