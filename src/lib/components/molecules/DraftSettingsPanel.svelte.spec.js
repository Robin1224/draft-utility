// @ts-nocheck
import { describe, it } from 'vitest';

// DraftSettingsPanel.svelte does not exist yet
describe('DraftSettingsPanel (HOST-01)', () => {
	it.todo('renders turn timer input with default value 30');
	it.todo('renders script editor list with default 10-turn script');
	it.todo('renders "Add turn" button that appends a turn to the list');
	it.todo('renders "Remove" button on each row that removes that turn');
	it.todo('does not render when phase is not lobby (panel is removed, not disabled)');
});
