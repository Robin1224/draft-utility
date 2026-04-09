---
phase: 07-tech-debt-cleanup
plan: "01"
subsystem: api
tags: [svelte-realtime, draft-engine, timer, publish, disconnect-resilience]

# Dependency graph
requires:
  - phase: 04-draft-ui-disconnect-resilience
    provides: disconnectGraceExpired, autoAdvanceTurn, grace-timer scheduling pattern
  - phase: 03-draft-engine
    provides: completeDraft, loadDraftSnapshot, advanceTurnIfCurrent
provides:
  - autoAdvanceTurn publishes review snapshot unconditionally on final turn regardless of platform availability
  - grace-timer path (platform=null) now delivers reactive push to live clients via threaded publishFn
affects: [post-draft-review, draft-ui-disconnect-resilience]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Thread callable down call chain: when outer context holds ctx.publish, pass it as optional fn parameter to inner async function rather than importing standalone (svelte-realtime has no standalone publish export)"

key-files:
  created: []
  modified:
    - src/live/draft.js
    - src/live/room.js
    - src/live/draft.spec.js

key-decisions:
  - "07-01: publishFn threaded from disconnectGraceExpired into autoAdvanceTurn as optional fourth parameter — avoids invalid svelte-realtime standalone publish import"
  - "07-01: isLast branch restructured to publish unconditionally (platform or publishFn); non-last-turn publish remains platform-gated (DISC-pitfall-2 preserved)"

patterns-established:
  - "isLast publish pattern: resolve pub = platform ? platform.publish.bind(platform) : publishFn; if (pub) { try { snap; pub(...) } catch {} }"

requirements-completed: [DRAFT-04, POST-01]

# Metrics
duration: 8min
completed: 2026-04-07
---

# Phase 07 Plan 01: Fix grace-timer auto-advance publish gap Summary

**autoAdvanceTurn threads ctx.publish from disconnectGraceExpired so final-turn grace-timer expiry delivers reactive review-phase push to connected clients without page reload**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-07T07:30:00Z
- **Completed:** 2026-04-07T07:38:21Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added optional `publishFn` fourth parameter to `autoAdvanceTurn`; `disconnectGraceExpired` promotes branch now passes `publish` as fourth arg
- Restructured `isLast` branch: `completeDraft` fires then publishes review snapshot unconditionally via `platform?.publish` or the threaded `publishFn`
- Non-last-turn mid-draft publish remains platform-gated inside `else` branch (DISC-pitfall-2 preserved, no regression)
- Added new test proving `platform=null, publishFn=fn, isLast=true` path calls `completeDraft`, `loadDraftSnapshot`, and `publishFn`

## Task Commits

1. **Task 1: Thread publish into autoAdvanceTurn via optional publishFn parameter** - `d217380` (feat)
2. **Task 2: Add grace-timer completion test to draft.spec.js** - `438605d` (test)

## Files Created/Modified

- `src/live/draft.js` - Added `publishFn` fourth param; restructured `isLast` branch to publish unconditionally; moved mid-draft publish into `else` block
- `src/live/room.js` - `disconnectGraceExpired` promoted branch: `autoAdvanceTurn(code, ds.turnIndex, null, publish)` — passes `publish` as fourth arg
- `src/live/draft.spec.js` - Added clarifying comment on non-last-turn null-platform test; added new grace-timer completion publish test

## Decisions Made

- `publishFn` threaded via parameter (not module-level import) because `svelte-realtime/server` does not export a standalone `publish` function — the only callable is the one injected into handler context via `ctx.publish`. Threading is the correct pattern here.
- `isLast` branch publish uses `platform ? platform.publish.bind(platform) : publishFn` — explicit bind to preserve `this` context on the platform object; publishFn from `ctx.publish` is already unbound so no bind needed there.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Grace-timer publish gap is closed; connected clients now receive the review snapshot reactively when draft ends via disconnect grace expiry
- Plan 07-02 can proceed independently

---
*Phase: 07-tech-debt-cleanup*
*Completed: 2026-04-07*

## Self-Check: PASSED

- FOUND: src/live/draft.js
- FOUND: src/live/room.js
- FOUND: src/live/draft.spec.js
- FOUND: 07-01-SUMMARY.md
- FOUND commit: d217380 (feat: thread publishFn)
- FOUND commit: 438605d (test: grace-timer completion test)
