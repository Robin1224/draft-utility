---
phase: 03-draft-engine
plan: 01
subsystem: testing
tags: [vitest, tdd, wave-0, draft, catalog, spec-stubs]

# Dependency graph
requires:
  - phase: 02-room-lobby
    provides: existing test patterns (room.spec.js, rooms.spec.js, createTestEnv, vi.mock db pattern)
provides:
  - Wave 0 spec stub files for all Phase 3 requirements
  - RED state test scaffold for DRAFT-01 through DRAFT-06, LIST-01, HOST-01
  - classes.json premade Battlerite catalog (28 entries — also delivered by parallel agent 03-02)
affects: [03-02, 03-03, 03-04, 03-05, 03-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 TDD scaffold: it.todo stubs run without import errors before implementation exists"
    - "vi.mock('$lib/server/draft.js') hoisted factory pattern for non-existent modules"
    - "createTestEnv + vi.mock pattern extended to draft live RPCs"

key-files:
  created:
    - src/lib/catalog/classes.spec.js
    - src/lib/catalog/classes.json
    - src/lib/draft-script.spec.js
    - src/lib/server/draft.spec.js
    - src/live/draft.spec.js
    - src/lib/components/molecules/DraftSettingsPanel.svelte.spec.js
  modified: []

key-decisions:
  - "Wave 0 stubs use it.todo (not it.skip) so vitest reports them as todo, not skipped failures"
  - "classes.spec.js promoted to real assertions by parallel agent (03-02) — kept since LIST-01 data was correct"
  - "DraftSettingsPanel.svelte.spec.js targets client project (browser); todo stubs do not fail without Playwright"

patterns-established:
  - "Pattern: Mock non-existent modules with vi.mock factory returning vi.fn() stubs — enables spec files to import cleanly at Wave 0"

requirements-completed:
  - LIST-01
  - DRAFT-01
  - DRAFT-02
  - DRAFT-03
  - DRAFT-04
  - DRAFT-05
  - DRAFT-06
  - HOST-01

# Metrics
duration: 2min
completed: 2026-04-03
---

# Phase 03 Plan 01: Wave 0 Test Scaffold Summary

**5 spec stub files covering all Phase 3 requirements (DRAFT-01 through DRAFT-06, LIST-01, HOST-01) with 16 server todo stubs + 5 client todo stubs — RED state established before any implementation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-03T15:29:47Z
- **Completed:** 2026-04-03T15:31:41Z
- **Tasks:** 3
- **Files modified:** 6 created

## Accomplishments

- Created all 5 Wave 0 spec files at their exact paths per VALIDATION.md
- Server test suite runs cleanly: 49 passing + 16 todo + 0 failures
- `vi.mock('$lib/server/draft.js')` factory stub allows `src/live/draft.spec.js` to import without "Cannot find module" errors
- `src/lib/catalog/classes.json` (28-champion Battlerite catalog) delivered — tests promoted to real assertions by parallel agent

## Task Commits

1. **Task 1: Create catalog + draft-script + DB layer spec stubs** - `47cc44b` (test)
2. **Task 2: Create live draft RPC spec stubs + settings panel spec stub** - `2509162` (test)
3. **Task 3: Full test suite green with todo stubs** - verification only, no new files

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/lib/catalog/classes.spec.js` - LIST-01 assertions (6 green tests — parallel agent promoted from todo to real)
- `src/lib/catalog/classes.json` - 28 Battlerite champions (9 melee, 10 ranged, 9 support)
- `src/lib/draft-script.spec.js` - DRAFT-01 stubs (parallel agent promoted to real assertions at 5 tests)
- `src/lib/server/draft.spec.js` - DB layer stubs: writeDraftAction, loadDraftSnapshot, completeDraft (5 todo)
- `src/live/draft.spec.js` - DRAFT-02 through DRAFT-06 + timer stubs (11 todo, uses createTestEnv + vi.mock)
- `src/lib/components/molecules/DraftSettingsPanel.svelte.spec.js` - HOST-01 stubs (5 todo, client project)

## Decisions Made

- Used `it.todo` throughout so vitest counts them as "todo" not "skipped failures" — cleaner RED state signal
- `vi.mock('$lib/server/draft.js')` uses plain factory (not `importOriginal`) since the module does not exist yet
- Parallel agent (03-02) promoted `classes.spec.js` and `draft-script.spec.js` from todo stubs to real passing tests — kept since data is correct and this advances Wave 0 into green state for those requirements

## Deviations from Plan

### Auto-promoted by parallel agent

**1. [External - Parallel Agent] classes.spec.js and draft-script.spec.js promoted from todo stubs to real assertions**
- **Found during:** Task 2 (observed via linter notification)
- **Issue:** Parallel agent 03-02 ran simultaneously and created `classes.json`, `draft-script.js`, and updated both spec files with real assertions
- **Fix:** Kept the promoted state — tests pass (6 + 5 = 11 green), no regressions
- **Files modified:** `src/lib/catalog/classes.spec.js`, `src/lib/catalog/classes.json`, `src/lib/draft-script.spec.js`, `src/lib/draft-script.js`
- **Verification:** `npm run test -- --project=server` shows 49 passing, 16 todo, 0 failed
- **Committed in:** `2812b23` (parallel agent 03-02 commit)

---

**Total deviations:** 1 (parallel agent coordination — positive outcome)
**Impact on plan:** LIST-01 and DRAFT-01 effectively advanced from Wave 0 stubs to passing state. No scope creep for this plan's deliverables.

## Issues Encountered

- Playwright not installed — prevents `npm run test` (full suite) from running client project. This is pre-existing infrastructure. Server project (`--project=server`) runs cleanly with 0 failures.

## Next Phase Readiness

- All 5 Wave 0 spec files exist and run without import errors
- Server test suite: 49 passing, 16 todo (draft stubs), 0 failed
- Executor agents for waves 1 and 2 can now activate todo stubs as implementation completes
- `src/lib/server/draft.spec.js` and `src/live/draft.spec.js` remain in todo state, ready for implementation plans

## Self-Check: PASSED

- FOUND: src/lib/catalog/classes.spec.js
- FOUND: src/lib/draft-script.spec.js
- FOUND: src/lib/server/draft.spec.js
- FOUND: src/live/draft.spec.js
- FOUND: src/lib/components/molecules/DraftSettingsPanel.svelte.spec.js
- FOUND: commit 47cc44b (Task 1)
- FOUND: commit 2509162 (Task 2)

---
*Phase: 03-draft-engine*
*Completed: 2026-04-03*
