---
phase: 02-room-lobby
plan: 03
subsystem: api
tags: [svelte-realtime, websocket, drizzle, neon, vitest, lobby]

requires:
  - phase: 02-room-lobby
    provides: room schema, topicForRoom, getRoomByPublicCode
provides:
  - loadLobbySnapshot, upsertGuestSpectator, countTeamMembers, joinTeamForUser, TEAM_FULL in rooms.js
  - src/live/room.js lobby stream (merge set) + joinTeam RPC with LiveError mapping
  - Unit tests for guest join denial, cap-3, captain; optional DB integration when DATABASE_URL set
affects:
  - 02-04 (host controls, guestId on upgrade)
  - 02-05 (lobby UI subscribes to snapshot)

tech-stack:
  added: []
  patterns:
    - "Dynamic live.stream topic via topicForRoom(parseRoomCode(...)) so URL-shaped codes match DB"
    - "Lobby snapshot as plain object; mutations publish ctx.publish(topic, 'set', snap)"
    - "joinTeamForUser throws string TEAM_FULL; live maps to LiveError FORBIDDEN"

key-files:
  created:
    - src/live/room.js
    - src/live/room.spec.js
  modified:
    - src/lib/server/rooms.js
    - src/lib/server/rooms.spec.js

key-decisions:
  - "Neon HTTP Drizzle driver cannot run interactive transactions or SELECT FOR UPDATE; joinTeamForUser uses sequential queries with documented concurrency tradeoff"
  - "Public code normalized in live layer for topic + DB lookups to avoid lobby topic mismatch (pitfall 2)"

patterns-established:
  - "Realtime module under src/live/ auto-registered by svelte-realtime/vite"

requirements-completed: [ROOM-03, ROOM-04, ROOM-05]

duration: 18min
completed: 2026-04-03
---

# Phase 2 Plan 3: Lobby stream & joinTeam Summary

**Authoritative lobby snapshot over svelte-realtime (`merge: 'set'`) with `joinTeam` enforcing player-only mutations, lobby phase, max 3 per team, and earliest-join captain; guests rejected on team RPC and upserted as spectators when `guestId` is present.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-04-03T14:45:00Z
- **Completed:** 2026-04-03T15:05:00Z
- **Tasks:** 3
- **Files modified:** 4 implementation/test files (+ planning metadata commit)

## Accomplishments

- `loadLobbySnapshot` builds teams A/B and spectators with display names, host and captain flags, sorted by `joined_at`.
- `joinTeamForUser` enforces roster cap and recomputes captains per team; `TEAM_FULL` maps to `LiveError` in `joinTeam`.
- `room.spec.js` proves guest `joinTeam` returns `UNAUTHORIZED` before DB access; `rooms.spec.js` mocks prove cap and captain paths.

## Task Commits

1. **Task 1: rooms.js snapshot + DB helpers** — `595c997` (feat)
2. **Task 2: src/live/room.js — lobby stream + joinTeam** — `649b168` (feat)
3. **Task 3: room.spec.js + rooms.spec.js tests** — `01f7aa8` (test)

**Plan metadata:** same commit as `.planning/STATE.md` / `ROADMAP.md` / `REQUIREMENTS.md` updates (`docs(02-03): complete lobby stream plan`).

## Files Created/Modified

- `src/lib/server/rooms.js` — `loadLobbySnapshot`, `upsertGuestSpectator`, `countTeamMembers`, `joinTeamForUser`, `TEAM_FULL`
- `src/live/room.js` — `lobby` stream, `joinTeam` RPC
- `src/live/room.spec.js` — `createTestEnv` guest `joinTeam` rejection
- `src/lib/server/rooms.spec.js` — mock DB tests for cap/captain; optional integration with `DATABASE_URL`

## Decisions Made

- Normalized public codes in `room.js` for both the stream topic resolver and `ctx.publish` so clients can pass URLs or bare codes consistently.
- Left `hooks.ws.js` unchanged: production `guestId` on guests is deferred to plan 02-04; tests pass `guestId` explicitly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Transaction / FOR UPDATE not available on neon-http**

- **Found during:** Task 1
- **Issue:** `drizzle-orm/neon-http` throws on `db.transaction`; no interactive transaction for `SELECT … FOR UPDATE`.
- **Fix:** Implemented `joinTeamForUser` as sequential Drizzle operations; documented concurrency limitation in this summary.
- **Files modified:** `src/lib/server/rooms.js`
- **Verification:** `npm run check`; server unit tests pass.

**2. [Rule 1 - Bug] Stream topic vs stored public_code mismatch**

- **Found during:** Task 2
- **Issue:** Subscriptions could use raw URL segments while DB keys use parsed codes, breaking topic alignment (02-RESEARCH pitfall 2).
- **Fix:** Applied `parseRoomCode` in the live module before `topicForRoom` and before room lookups/publish.
- **Files modified:** `src/live/room.js`
- **Verification:** `npm run check`

---

**Total deviations:** 2 (1 blocking infra, 1 correctness)
**Impact on plan:** Same behavior for single-connection flows; concurrent joins may race without row-level locking until a transactional driver or batched SQL is adopted.

## Issues Encountered

- Vitest/svelte-realtime logged a spurious warning about `message` export from `hooks.ws.js` during transforms; `hooks.ws.js` does export `message` — no code change required.

## User Setup Required

None for code paths; optional integration test in `rooms.spec.js` runs when `DATABASE_URL` is set.

## Known Stubs

- **Guest spectator upsert in production:** `lobby` calls `upsertGuestSpectator` only when `ctx.user.guestId` is set; `upgrade()` does not yet attach `guestId` (plan **02-04**). Until then, guests can still subscribe but are not persisted as spectators.

## Next Phase Readiness

- 02-04 can add `guestId` in `upgrade`, host RPCs, and wire client lobby UI to `room/lobby` + `room/joinTeam`.

## Self-Check: PASSED

- `src/live/room.js`, `src/live/room.spec.js` exist.
- Task commits `595c997`, `649b168`, `01f7aa8` and the `docs(02-03): complete lobby stream plan` commit present on branch.
- `npm run test:unit -- --run --project server` passed (1 test skipped without `DATABASE_URL`).

---
*Phase: 02-room-lobby*
*Completed: 2026-04-03*
