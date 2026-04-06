// @ts-nocheck
import { describe, it } from 'vitest';

// Wave 0 stubs — DraftReview.svelte is created in Plan 02.
// These are it.todo placeholders; convert to full tests after the component exists.

describe('DraftReview.svelte', () => {
	it.todo('renders "Team A" and "Team B" column headings');

	it.todo('renders "Bans" section label in Team A column when Team A has bans');

	it.todo('renders "Picks" section label in Team A column when Team A has picks');

	it.todo('resolves champion_id to display name via classes.json');

	it.todo('skips null champion_id entries — no DraftSlot rendered for timeout rows');

	it.todo('hides the Bans section when Team A has no bans');

	it.todo('hides the Picks section when Team A has no picks');

	it.todo('renders fallback text "Draft ended without picks or bans." when all actions have null champion_id');
});
