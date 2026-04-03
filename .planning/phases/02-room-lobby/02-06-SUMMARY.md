---
phase: 02-room-lobby
plan: 06
subsystem: database
tags: [drizzle, postgres, room-lifecycle, ROOM-08]

requires:
  - phase: 02-room-lobby
    provides: room schema, getRoomByPublicCode, cancelRoomAsHost (02-04)
provides:
  - Pure helpers shouldHideRoomFromPublic / shouldAbandonLobby + LOBBY_ABANDON_TTL_MS
  - getRoomByPublicCode lazy lobby expiry and ended-row filtering
  - JSDoc contract for Phase 3 draft completion closure
affects:
  - phase-03-draft-engine
  - loadLobbySnapshot / any caller of getRoomByPublicCode

tech-stack:
  added: []
  patterns:
    - Lazy lobby abandon on read via single atomic UPDATE (Neon HTTP–friendly)
    - ROOM-08 visibility rules centralized in room-lifecycle.js

key-files:
  created:
    - src/lib/server/room-lifecycle.js
    - src/lib/server/room-lifecycle.spec.js
  modified:
    - src/lib/server/rooms.js
    - src/lib/server/rooms.spec.js

key-decisions:
  - "24h LOBBY_ABANDON_TTL_MS from created_at for phase === lobby (plan-locked)"
  - "Single UPDATE with id + phase = lobby guard instead of drizzle transaction (Neon HTTP)"

patterns-established:
  - "Public code resolution must run hide + abandon checks before returning a row"

requirements-completed: [ROOM-08]

duration: 5min
completed: 2026-04-03
---

# Phase 2 Plan 6: ROOM-08 lifecycle summary

**Ended, cancelled, and 24h-abandoned lobby rooms no longer resolve through `getRoomByPublicCode`; rules live in tested `room-lifecycle` helpers and one atomic UPDATE on abandon.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-03T13:02:29Z
- **Completed:** 2026-04-03T13:07:22Z
- **Tasks:** 3 (Task 1 TDD = 2 commits: RED test + GREEN feat)
- **Files modified:** 4

## Accomplishments

- Unit-tested `shouldHideRoomFromPublic` and `shouldAbandonLobby` with Date/number `created_at` normalization
- `getRoomByPublicCode` returns null for hidden rows and lazily ends stale lobbies before join
- `loadLobbySnapshot` inherits behavior via existing `getRoomByPublicCode` call
- JSDoc on `getRoomByPublicCode` ties `cancelRoomAsHost` and Phase 3 draft completion to `ended_at` / `phase`

## Task Commits

1. **Task 1 (RED):** `44ce73e` — test(02-06): failing room-lifecycle specs + stub
2. **Task 1 (GREEN):** `58a4e2b` — feat(02-06): room-lifecycle helpers
3. **Task 2:** `b86537e` — feat(02-06): integrate into getRoomByPublicCode + rooms.spec
4. **Task 3:** `f87f1dd` — docs(02-06): JSDoc contract on getRoomByPublicCode

**Plan metadata:** `docs(02-06): complete ROOM-08 lifecycle plan` (STATE, ROADMAP, REQUIREMENTS, this file)

## Files Created/Modified

- `src/lib/server/room-lifecycle.js` — `LOBBY_ABANDON_TTL_MS`, hide/abandon predicates
- `src/lib/server/room-lifecycle.spec.js` — table-driven unit tests
- `src/lib/server/rooms.js` — lifecycle integration + JSDoc
- `src/lib/server/rooms.spec.js` — ended + stale-lobby mock coverage

## Decisions Made

- Followed plan’s 24h abandon TTL and soft-end (no row deletion)
- Used one Drizzle `update().where(and(eq(id), eq(phase,'lobby')))` as the atomic unit; no `db.transaction` (consistent with Neon HTTP constraints from 02-03/02-04)

## Deviations from Plan

### Auto-fixed Issues

None blocking.

### Planned wording vs implementation

**1. [Documentation] “Single transaction” wording**

- **Found during:** Task 2
- **Issue:** Plan text asked for a SQL transaction; `drizzle-orm/neon-http` does not use interactive `db.transaction` in this codebase (prior phase notes).
- **Fix:** Single `UPDATE` with `id` + `phase === 'lobby'` is atomic in PostgreSQL and matches existing sequential-write pattern.
- **Files modified:** `src/lib/server/rooms.js`
- **Committed in:** `b86537e`

**2. [Naming] Frontmatter artifact vs task text**

- **Found during:** Task 1
- **Issue:** Plan YAML mentions `applyLazyLobbyExpiry`; tasks specify inline integration in `getRoomByPublicCode` and function names `shouldHideRoomFromPublic` / `shouldAbandonLobby`.
- **Fix:** Implemented per task body (no separate `applyLazyLobbyExpiry` export).
- **Files modified:** `src/lib/server/room-lifecycle.js`, `src/lib/server/rooms.js`

---

**Total deviations:** 2 (both documentation/naming alignment; no behavior drift from ROOM-08 policy)

## Issues Encountered

None — `npm run check` and `npm run test:unit -- --run --project server` passed after integration.

## User Setup Required

None.

## Next Phase Readiness

Phase 3 should set `phase` and `ended_at` when a draft completes so the same filter applies; contract is documented on `getRoomByPublicCode`.

---

_Phase: 02-room-lobby_  
_Completed: 2026-04-03_

## Self-Check: PASSED

- `02-06-SUMMARY.md` exists at `.planning/phases/02-room-lobby/02-06-SUMMARY.md`
- Task commits: `44ce73e`, `58a4e2b`, `b86537e`, `f87f1dd` resolve via `git rev-parse`; planning bundle is the tip commit with message `docs(02-06): complete ROOM-08 lifecycle plan`
