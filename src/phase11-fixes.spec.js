import { readFileSync, existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

// Source-contract regression guards for the Phase 11 review fixes that live in
// +page.svelte — the draft page imports $live/* directly, so there is no
// browser render harness for it (phase10-screens.spec.js precedent).

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

const pageSrc = read('src/routes/draft/[id]/+page.svelte');

describe('Phase 11 review fixes — draft page contracts', () => {
	it('WR-04: chat effect drops the previous channel buffer before resubscribing', () => {
		// The reset must sit between deriving the active store and subscribing —
		// otherwise the old channel's messages render under the new tab.
		expect(pageSrc).toMatch(
			/const store = activeChatStream\(code\);[\s\S]*?chatStreamVal = undefined;[\s\S]*?store\.subscribe/
		);
	});
});
