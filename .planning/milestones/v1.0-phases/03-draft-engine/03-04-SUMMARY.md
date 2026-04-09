---
phase: 03-draft-engine
plan: "04"
subsystem: api
tags: [svelte-realtime, drizzle, pick-ban, draft-engine, timer, server-rpc]

# Dependency graph
requires:
  - phase: 03-draft-engine-03
    provides: writeDraftAction, completeDraft, updateDraftState, advanceTurnIfCurrent, loadDraftSnapshot, startDraftWithSettings
  - phase: 03-draft-engine-02
    provides: draft_action table, draft_state jsonb column on room
  - phase: 03-draft-engine-01
    provides: draft.spec.js scaffold with it.todo stubs
provides:
  - pickBan live RPC — validates captain/champion, writes draft_action, manages timer, publishes snapshot
  - autoAdvanceTurn — server-side timeout that advances turns race-safely
  - clearRoomTimer / scheduleTimer — shared timer Map in draft-timers.js
  - startDraft updated to call startDraftWithSettings with resolved script+timer settings
  - cancelRoom updated to clear draft timer before ending room
affects:
  - 03-05 (draft UI hydration needs pickBan RPC and draftState in snapshot)
  - 03-06 (settings panel sends payload to startDraft)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - pickBan RPC: validate caller -> fetch room -> validate draft state -> captain check via DB -> champion dedup via DB -> cancel timer -> write action -> advance/complete -> publish snapshot
    - draft-timers.js: shared module-level Map<roomId, setTimeout> with clearRoomTimer/scheduleTimer to avoid circular imports
    - autoAdvanceTurn: exported from draft.js for room.js to call without circular dependency
    - TDD RED/GREEN: spec stubs written first (fail), then draft.js created to make them pass

key-files:
  created:
    - src/live/draft.js
    - src/live/draft-timers.js
  modified:
    - src/live/room.js
    - src/live/draft.spec.js
    - src/live/room.spec.js

key-decisions:
  - "draft-timers.js extracted as shared module to prevent circular import: room.js -> draft.js -> rooms.js"
  - "autoAdvanceTurn exported from draft.js; room.js imports it statically (no circular dep since draft.js only imports from $lib/server/*)"
  - "clearRoomTimer re-exported from draft.js (delegates to draft-timers.js) so plan requirement artifact is satisfied"
  - "startDraft RPC now calls startDraftWithSettings (not startDraftIfReady) and schedules first turn timer"
  - "room.spec.js mocks updated: startDraftIfReady -> startDraftWithSettings, added mocks for draft.js/draft-timers.js"

patterns-established:
  - "Timer pattern: module-level Map keyed by roomId; clearRoomTimer called before new timer scheduled; always cleared on cancelRoom"
  - "Race-safe turn advance: advanceTurnIfCurrent returns false if turn already moved — autoAdvanceTurn exits silently"

requirements-completed:
  - DRAFT-02
  - DRAFT-03
  - DRAFT-04
  - DRAFT-05
  - DRAFT-06

# Metrics
duration: 10min
completed: 2026-04-03
---

# Phase 03 Plan 04: Draft Engine — Live RPC + Timer Summary

**Server-authoritative pickBan RPC with race-safe timer machinery, captain/champion validation, and startDraft wired to settings payload via shared draft-timers module**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-03T15:40:52Z
- **Completed:** 2026-04-03T15:51:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Created `src/live/draft.js` with `pickBan` RPC that validates captain, champion catalog membership, and champion uniqueness within the room — then cancels the turn timer, writes the action, and advances/completes the draft
- Extracted `draft-timers.js` as a zero-dependency shared timer helper (clearRoomTimer/scheduleTimer/roomTimers) to break the potential circular import between room.js and draft.js
- Updated `startDraft` in room.js to accept optional `{script, timerMs}` payload, validate it, fall back to defaults, call `startDraftWithSettings`, and schedule the first turn timer
- Added `clearRoomTimer` to `cancelRoom` so stale timers cannot fire after a room is ended
- Full server test suite: 74 tests pass, 0 fail, 5 todo (DRAFT-02/06 stubs preserved for room.js startDraft tests)

## Task Commits

1. **Task 1 (RED):** `7f5b298` test(03-04): add failing tests for pickBan RPC and timer machinery
2. **Task 1 (GREEN):** `5e9549a` feat(03-04): create draft.js with pickBan RPC and timer machinery
3. **Task 2:** `fb16190` feat(03-04): update room.js startDraft to use settings payload; cancelRoom clears timer
4. **Task 3:** `06db96b` chore(03-04): full server test suite verified green

## Files Created/Modified

- `src/live/draft.js` — pickBan RPC, autoAdvanceTurn, clearRoomTimer re-export
- `src/live/draft-timers.js` — shared roomTimers Map, clearRoomTimer, scheduleTimer (no live imports)
- `src/live/room.js` — startDraft updated with settings payload + first timer; cancelRoom clears timer
- `src/live/draft.spec.js` — activated DRAFT-03/04/05 tests (6 passing, 5 todo)
- `src/live/room.spec.js` — updated mocks + 3 new tests for script validation, timerMs range, cancelRoom timer

## Decisions Made

- **draft-timers.js as shared module:** Extracted timer helpers to avoid circular import at module evaluation time. draft.js imports from `$lib/server/*` only; room.js can safely import `autoAdvanceTurn` from draft.js via static import.
- **autoAdvanceTurn exported from draft.js:** Allows room.js to call it for the first turn timer via static import (no dynamic import needed since there is no circular dep).
- **startDraftIfReady preserved in rooms.js:** Not removed — kept for backward compatibility. Plan 04 RPCs use `startDraftWithSettings` exclusively.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test mock pattern needed adjustment for direct db.select queries**
- **Found during:** Task 1 (draft.spec.js GREEN phase)
- **Issue:** Initial spec used per-test `db.select = vi.fn()` override which didn't work because the captains query in draft.js awaits the `.where()` result directly (no `.limit()`), while the duplicate champion query uses `.limit(1)`. The mock chain needed to handle both awaitable `.where()` results and `.limit()` calls.
- **Fix:** Changed `vi.mock('$lib/server/db')` to return `{ db: { select: vi.fn() } }` and built a `mockSelectReturning(rows)` helper that attaches Promise-like `.then`/`.catch`/`.finally` to the `.where()` result so both patterns resolve correctly.
- **Files modified:** src/live/draft.spec.js
- **Committed in:** 5e9549a (Task 1 GREEN commit)

**2. [Rule 1 - Bug] room.spec.js mocks referenced startDraftIfReady which is no longer called**
- **Found during:** Task 2 (room.spec.js updates)
- **Issue:** Existing test at line 93 asserted `expect(rooms.startDraftIfReady).toHaveBeenCalled()` but the updated startDraft RPC calls `startDraftWithSettings` instead.
- **Fix:** Updated mock declaration to include `startDraftWithSettings: vi.fn()`, changed assertion to use the new function, added mocks for `$lib/server/draft.js`, `./draft-timers.js`, and `./draft.js`.
- **Files modified:** src/live/room.spec.js
- **Committed in:** fb16190 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 × Rule 1 — bug fixes in test mocks)
**Impact on plan:** Both fixes were in test infrastructure only. No production code scope changes.

## Issues Encountered

None in production code. Test mock setup for the mixed `await db.select()...where()` / `await db.select()...where().limit()` pattern required a single iteration to get right.

## Known Stubs

`draft.spec.js` still has 5 `it.todo` stubs:
- DRAFT-02: 3 stubs for `startDraft with settings` (covered by room.spec.js since startDraft lives in room.js)
- DRAFT-06: 2 stubs for `startDraft with custom script` (also covered by new room.spec.js tests)

These stubs are intentional: the tests they describe are now in `room.spec.js` (where startDraft lives). The stubs do not prevent any plan goal from being achieved — all behaviors are tested in the correct file.

## Self-Check: PASSED

All created files found on disk. All task commits verified in git log (`7f5b298`, `5e9549a`, `fb16190`, `06db96b`).

## Next Phase Readiness

- Full draft FSM runs server-side: captain picks/bans validated, turns advance via timer, draft completion triggers ended transition
- Phase 03-05 (draft UI hydration) can import `pickBan` from `$live/draft` and use `draftState` + `actions` from the snapshot
- Phase 03-06 (settings panel) can send `{script, timerMs}` payload to `startDraft` — validation is in place

---
*Phase: 03-draft-engine*
*Completed: 2026-04-03*
