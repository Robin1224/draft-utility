---
phase: 06-post-draft-review
plan: 01
subsystem: api
tags: [drizzle, sveltekit, server-load, draft, review-phase, vitest]

# Dependency graph
requires:
  - phase: 03-draft-engine
    provides: completeDraft, loadDraftSnapshot, pickBan, autoAdvanceTurn in draft.js
provides:
  - completeDraft transitions to phase='review' without setting ended_at
  - +page.server.js load returns actions and teams for review phase
  - Unauthenticated review page access (POST-02)
  - 4 new server-side tests for review-phase load behaviour
affects:
  - 06-02 (review UI — reads actions/teams from server load)
  - 06-03 (any plan consuming completeDraft or review phase state)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "completeDraft sets phase='review'; never sets ended_at — preserves getRoomByPublicCode visibility"
    - "SSR load branches on row.phase === 'review' to call loadDraftSnapshot and attach actions/teams"
    - "Graceful degradation: snap?.actions ?? [] handles loadDraftSnapshot returning null"

key-files:
  created:
    - src/routes/draft/[id]/page.server.spec.js
  modified:
    - src/lib/server/draft.js
    - src/lib/server/draft.spec.js
    - src/routes/draft/[id]/+page.server.js

key-decisions:
  - "06-01: completeDraft sets phase='review' (not 'ended') and omits ended_at so shouldHideRoomFromPublic returns false"
  - "06-01: +page.server.js load branches on row.phase === 'review' to attach actions and teams to SSR payload"
  - "06-01: Unauthenticated visitors (userId=null) are allowed on review-phase rooms — no auth guard in load()"

patterns-established:
  - "review branch in load(): if (row.phase === 'review') { const snap = await loadDraftSnapshot(db, code); return { ...base, actions: snap?.actions ?? [], teams: snap?.teams ?? { A: [], B: [] } }; }"

requirements-completed:
  - POST-01
  - POST-02

# Metrics
duration: 2min
completed: 2026-04-06
---

# Phase 06 Plan 01: Server Layer for Post-Draft Review Summary

**completeDraft writes phase='review' (not 'ended') without ended_at, keeping rooms visible; +page.server.js SSR load now returns actions and teams for review-phase rooms including unauthenticated visitors**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-06T20:05:30Z
- **Completed:** 2026-04-06T20:07:19Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Fixed `completeDraft` to set `phase='review'` without `ended_at` — prevents `shouldHideRoomFromPublic` from hiding rooms after draft completion (Pitfall 1 from RESEARCH.md)
- Extended `+page.server.js` load to call `loadDraftSnapshot` for review-phase rooms and attach `actions` and `teams` arrays to the SSR payload
- Unauthenticated visitors (`userId: null`) can access review-phase rooms without auth errors (POST-02)
- Existing `pickBan` and `autoAdvanceTurn` publish paths in `src/live/draft.js` now work correctly since `loadDraftSnapshot` can find the room again (no structural change needed)

## Task Commits

1. **Task 1: Fix completeDraft + update spec** - `0dc560b` (feat)
2. **Task 2: Extend +page.server.js for review phase + add spec** - `4315e90` (feat)

## Files Created/Modified

- `src/lib/server/draft.js` - completeDraft: phase='review', no ended_at, updated JSDoc
- `src/lib/server/draft.spec.js` - Updated completeDraft test to expect review phase and no ended_at
- `src/routes/draft/[id]/+page.server.js` - Added review branch: loadDraftSnapshot + actions/teams in return
- `src/routes/draft/[id]/page.server.spec.js` - New spec with 4 tests for review-phase load behaviour

## Decisions Made

- `completeDraft` sets `phase='review'` instead of `phase='ended'` and omits `ended_at` entirely — rooms with `ended_at=null` pass the `shouldHideRoomFromPublic` check so the shareable URL remains accessible
- `+page.server.js` reuses `loadDraftSnapshot` (already orders actions by `turn_index asc`) rather than writing a separate query
- `userId: null` is not guarded in load — review pages are intentionally public (spectators, recipients of shareable links)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The plan's `<verify>` command used escaped brackets `"src/routes/draft/\[id\]/page.server.spec.js"` which did not expand correctly in zsh glob. Used `page.server.spec.js` as the pattern instead, which matched the correct file via vitest's internal matching.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Server layer complete for review phase: completeDraft transitions correctly, page load serves snapshot data
- Plan 06-02 can proceed: it needs `data.actions` and `data.teams` from load, which are now provided
- No blockers

---
*Phase: 06-post-draft-review*
*Completed: 2026-04-06*

## Self-Check: PASSED

- src/lib/server/draft.js: FOUND
- src/lib/server/draft.spec.js: FOUND
- src/routes/draft/[id]/+page.server.js: FOUND
- src/routes/draft/[id]/page.server.spec.js: FOUND
- .planning/phases/06-post-draft-review/06-01-SUMMARY.md: FOUND
- Commit 0dc560b (Task 1): FOUND in git log
- Commit 4315e90 (Task 2): FOUND in git log
