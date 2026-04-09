---
phase: 03-draft-engine
plan: 05
subsystem: ui
tags: [svelte5, runes, bindable, drag-and-drop, vitest-browser, playwright]

# Dependency graph
requires:
  - phase: 03-draft-engine
    provides: Plan 04 draft settings RPC (startDraftWithSettings) and script/timer types

provides:
  - ScriptTurnRow atom: draggable turn row with team/action selects and remove button
  - DraftSettingsPanel molecule: bindable script + timerSeconds props, timer input, script editor with add/remove/drag-reorder
  - DraftSettingsPanel spec: 5 passing browser tests (vitest-browser-svelte + Playwright)

affects:
  - 03-06 (LobbyHostBar wires DraftSettingsPanel; reads bindable script + timerSeconds for startDraft RPC)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "$bindable() props for lifting state to parent without custom events"
    - "Native HTML DnD (draggable/ondragstart/ondragover/ondrop) in Svelte 5 runes"
    - "Stable nanoid(8) key per turn for {#each ... (turn.id)} keyed iteration"
    - "vitest-browser-svelte render() + page.getByRole() for Svelte 5 component tests"

key-files:
  created:
    - src/lib/components/atoms/ScriptTurnRow.svelte
    - src/lib/components/molecules/DraftSettingsPanel.svelte
  modified:
    - src/lib/components/molecules/DraftSettingsPanel.svelte.spec.js

key-decisions:
  - "$bindable() used for script and timerSeconds so LobbyHostBar can read final values for startDraft RPC (Plan 06 wire-up)"
  - "Drag state (dragging, dragOver) kept local in ScriptTurnRow — no upward event needed"
  - "Playwright Chromium installed during execution (npx playwright install) — was missing from CI setup"
  - "Regex /remove turn 1/i also matched 'Remove turn 10'; fixed test to use exact: true match"

patterns-established:
  - "ScriptTurnRow pattern: $state(false) for dragging/dragOver visual feedback, all callbacks as props"
  - "DraftSettingsPanel pattern: $bindable arrays mutated by spread/filter/map (never direct mutation)"

requirements-completed: [HOST-01, DRAFT-06]

# Metrics
duration: 12min
completed: 2026-04-03
---

# Phase 3 Plan 05: Settings Panel Components Summary

**ScriptTurnRow atom and DraftSettingsPanel molecule with native HTML drag-to-reorder, bindable script/timer props, and 5 passing browser tests**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-03T15:48:04Z
- **Completed:** 2026-04-03T16:00:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `ScriptTurnRow.svelte` — draggable `<li>` with grip handle SVG, 1-based index, team/action selects, remove button, amber-400 drop-target highlight, opacity-50 dragging source
- `DraftSettingsPanel.svelte` — panel with turn timer input (default 30, min 10, max 120, step 5), script editor list via `{#each ... (turn.id)}`, add/remove/drag-reorder, empty state message
- Spec activated: 5 browser tests passing (timer default, 10-turn list, add turn, remove turn, panel visibility)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ScriptTurnRow.svelte** - `593e656` (feat)
2. **Task 2: Create DraftSettingsPanel.svelte and activate spec** - `16d43ef` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `src/lib/components/atoms/ScriptTurnRow.svelte` - Draggable turn row atom with Svelte 5 runes
- `src/lib/components/molecules/DraftSettingsPanel.svelte` - Settings panel molecule with $bindable script/timerSeconds
- `src/lib/components/molecules/DraftSettingsPanel.svelte.spec.js` - 5 activated browser tests (was it.todo stubs)

## Decisions Made

- Used `$bindable()` for both `script` and `timerSeconds` so the parent (`LobbyHostBar` / `+page.svelte`) can read final values when constructing the `startDraft` RPC payload in Plan 06.
- Drag state (`dragging`, `dragOver`) is local to `ScriptTurnRow` — no bubbling needed since DraftSettingsPanel owns the array mutation via `onDragStart`/`onDrop` callbacks.
- Playwright Chromium was not installed; installed during execution via `npx playwright install chromium` (Rule 3 — blocking issue).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing Playwright Chromium browser**
- **Found during:** Task 2 (running DraftSettingsPanel spec)
- **Issue:** `browserType.launch: Executable doesn't exist at .../chromium_headless_shell-1208/...` — Playwright was installed but browser binary was missing
- **Fix:** Ran `npx playwright install chromium`
- **Files modified:** none (binary download only)
- **Verification:** Tests ran successfully after install
- **Committed in:** 16d43ef (part of Task 2 work)

**2. [Rule 1 - Bug] Fixed strict-mode violation in Remove button test**
- **Found during:** Task 2 (first test run)
- **Issue:** `getByRole('button', { name: /remove turn 1/i })` matched both "Remove turn 1" and "Remove turn 10" (regex substring match)
- **Fix:** Changed to `{ name: 'Remove turn 1', exact: true }` in spec
- **Files modified:** src/lib/components/molecules/DraftSettingsPanel.svelte.spec.js
- **Verification:** 5/5 tests pass
- **Committed in:** 16d43ef

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for tests to run. No scope creep.

## Issues Encountered

- Playwright Chromium binary absent from CI/dev environment — handled as Rule 3 blocking issue.
- Regex locator false-positive in spec (turn 1 vs turn 10) — corrected with exact match.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `DraftSettingsPanel` and `ScriptTurnRow` are complete and ready to be imported in Plan 06 (`LobbyHostBar` wire-up)
- Parent must initialize `script` with the default 10-turn array (each turn needs a `nanoid(8)` id added) before binding
- `timerSeconds` defaults to 30 via `$bindable(30)` — parent can override

---
*Phase: 03-draft-engine*
*Completed: 2026-04-03*

## Self-Check: PASSED

- FOUND: src/lib/components/atoms/ScriptTurnRow.svelte
- FOUND: src/lib/components/molecules/DraftSettingsPanel.svelte
- FOUND: .planning/phases/03-draft-engine/03-05-SUMMARY.md
- FOUND: commit 593e656 (ScriptTurnRow)
- FOUND: commit 16d43ef (DraftSettingsPanel + spec)
- FOUND: commit 114282e (plan metadata)
