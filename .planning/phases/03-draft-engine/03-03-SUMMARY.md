---
phase: 03-draft-engine
plan: 03
subsystem: database
tags: [drizzle, draft-actions, jsonb, server-functions, tdd, vitest]

# Dependency graph
requires:
  - phase: 03-02
    provides: draft_action table with unique(room_id, turn_index) and room.draft_state JSONB column

provides:
  - src/lib/server/draft.js with 5 exported DB functions (writeDraftAction, loadDraftSnapshot, completeDraft, updateDraftState, advanceTurnIfCurrent)
  - startDraftWithSettings in rooms.js that bakes resolved script + timer into room.draft_state
  - Full test coverage for draft DB layer (11 tests in draft.spec.js)
  - New startDraftWithSettings tests in rooms.spec.js (5 tests)

affects:
  - 03-04 (live RPC layer calls writeDraftAction, advanceTurnIfCurrent, completeDraft, startDraftWithSettings)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - isUniqueViolation helper copied into draft.js for 23505 error detection with nested cause traversal
    - Race-safe conditional SQL update using jsonb_set + WHERE turnIndex cast check
    - TDD: RED (spec with todo stubs converted to real tests) -> GREEN (implementation) pattern

key-files:
  created:
    - src/lib/server/draft.js
  modified:
    - src/lib/server/draft.spec.js
    - src/lib/server/rooms.js
    - src/lib/server/rooms.spec.js

key-decisions:
  - "draft.js imports getRoomByPublicCode + loadLobbySnapshot from rooms.js to compose loadDraftSnapshot — avoids duplicating lobby query logic"
  - "startDraftWithSettings added alongside startDraftIfReady (not replacing it) — backward compat for existing tests"
  - "advanceTurnIfCurrent uses jsonb_set SQL fragment for atomic JSONB field update without full replace"

patterns-established:
  - "Pattern: draft DB functions use mock db objects (chained method stubs) in tests — no real DB connections"
  - "Pattern: vi.mock factory for $lib/server/rooms.js in draft.spec.js — module doesn't exist at vi.mock time"

requirements-completed: [DRAFT-01, DRAFT-02, DRAFT-05]

# Metrics
duration: 3min
completed: 2026-04-03
---

# Phase 03 Plan 03: Draft DB Layer Summary

**Drizzle DB layer for draft operations — writeDraftAction, loadDraftSnapshot, completeDraft, updateDraftState, advanceTurnIfCurrent in draft.js; startDraftWithSettings added to rooms.js baking script + timer into room.draft_state JSONB**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-03T15:35:44Z
- **Completed:** 2026-04-03T15:38:29Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Created `src/lib/server/draft.js` with 5 exported async functions; all covered by 11 passing unit tests
- Added `startDraftWithSettings` to `rooms.js` with host/phase/captain validation, baking resolved draft config into `room.draft_state`; 5 new unit tests cover all error branches and the success path
- Full server test suite passes: 65 tests green, 0 failed, 0 regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create draft.js DB layer** - `c066865` (feat)
2. **Task 2: Add startDraftWithSettings to rooms.js** - `2e5b6cc` (feat)
3. **Task 3: Full server test suite green** - no code changes (verification only)

**Plan metadata:** (docs commit — see below)

_Note: TDD tasks followed RED -> GREEN flow; no REFACTOR pass needed._

## Files Created/Modified

- `src/lib/server/draft.js` — 5 DB functions: writeDraftAction (with DUPLICATE_TURN), loadDraftSnapshot (extends lobby snapshot with draftState + actions), completeDraft, updateDraftState, advanceTurnIfCurrent (race-safe conditional JSONB update)
- `src/lib/server/draft.spec.js` — converted from 3 it.todo stubs to 11 active passing tests using mock db objects
- `src/lib/server/rooms.js` — added startDraftWithSettings after startDraftIfReady; startDraftIfReady unchanged
- `src/lib/server/rooms.spec.js` — added 5 new tests for startDraftWithSettings (NOT_HOST, LOBBY_PHASE_REQUIRED, DRAFT_NOT_READY x2, success)

## Decisions Made

- `draft.js` composes `loadDraftSnapshot` on top of `getRoomByPublicCode` + `loadLobbySnapshot` from rooms.js — avoids duplicating lobby query logic
- `startDraftWithSettings` is added alongside `startDraftIfReady` rather than replacing it — backward compat for existing tests; Plan 04 live RPCs will call the new function
- `advanceTurnIfCurrent` uses `jsonb_set` SQL template for atomic field-level JSONB update

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tests passed first run after implementation.

## Known Stubs

None - all functions are fully implemented with real DB calls. The 11 `it.todo` items in `src/live/draft.spec.js` and 5 in `DraftSettingsPanel.svelte.spec.js` are pre-existing Plan 01 scaffolds for Plans 04 and UI plans respectively, not from this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 04 (live RPC layer) can now import and call all 5 draft DB functions from `draft.js`
- `startDraftWithSettings` replaces `startDraftIfReady` in the Plan 04 `startDraft` RPC handler
- No blockers

---
*Phase: 03-draft-engine*
*Completed: 2026-04-03*
