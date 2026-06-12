# Phase 08 — Deferred / Out-of-Scope Items

Items discovered during execution that are NOT caused by Phase 08 changes and were intentionally not fixed.

## Pre-existing test failures (not caused by Plan 08-00)

### DraftSettingsPanel.svelte.spec.js — flaky "Add turn" / "Remove" listitem-count assertions

- **Discovered during:** 08-00 full-suite verification (`npm run test`)
- **Failing tests:**
  - `DraftSettingsPanel (HOST-01) > renders "Add turn" button that appends a turn to the list` (expected listitem count mismatch)
  - `DraftSettingsPanel (HOST-01) > renders "Remove" button on each row that removes that turn` (`expected 10 to be 9`)
- **Why out of scope:** Plan 08-00 added only 4 woff2 binaries and 2 new isolated `.spec.js` files. It made ZERO changes to `DraftSettingsPanel.svelte` or its spec (both last touched in commit `16d43ef`, Phase 03). The failure is an interactive listitem-count assertion unrelated to fonts, CSS, or Tailwind.
- **Status:** Pre-existing failure. Left untouched per the executor SCOPE BOUNDARY rule (only auto-fix issues directly caused by the current task). Should be triaged separately (likely a flaky `page.getByRole('listitem').all()` count race or a real regression from an earlier phase).
- **Impact on 08-00:** None. The plan's own two new specs are correctly RED (Wave 0). The "130 passing" baseline the plan references still reports 130 passing; the DraftSettingsPanel failures are a separate pre-existing condition in that baseline, not a regression introduced here.
