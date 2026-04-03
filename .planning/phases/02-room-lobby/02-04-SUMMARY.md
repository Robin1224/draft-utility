---
phase: 02-room-lobby
plan: 04
subsystem: api
tags: [svelte-realtime, drizzle, websocket, host-controls, lobby]

requires:
  - phase: 02-room-lobby
    provides: Room schema, lobby snapshot, joinTeam, parseRoomCode, Neon HTTP patterns from 02-01–02-03
provides:
  - Stable draft_guest cookie and WS guestId for spectator kick targets
  - refreshSession preserves guestId after OAuth
  - DB helpers assertHost, kickMember, movePlayer, startDraftIfReady, cancelRoomAsHost
  - Live RPCs kickMember, movePlayer, startDraft, cancelRoom with host checks and snapshot publish
affects:
  - phase 02-room-lobby (02-05 UI host grouping)
  - phase 03 (drafting phase transition)

tech-stack:
  added: []
  patterns:
    - "Host-only mutations throw string error codes mapped to LiveError in live layer"
    - "Neon HTTP: multi-step room mutations stay sequential (no db.transaction)"

key-files:
  created: []
  modified:
    - src/hooks.server.js
    - src/hooks.ws.js
    - src/lib/server/rooms.js
    - src/live/room.js
    - src/live/room.spec.js

key-decisions:
  - "Kick RPC payload: exactly one of userId or guestId; rooms.kickMember validates XOR"
  - "startDraftIfReady requires each team to have ≥1 signed-in player and ≥1 captain (ROOM-06)"

patterns-established:
  - "mapRoomMutationError centralizes rooms.js string throws to LiveError codes"

requirements-completed: [ROOM-06, HOST-02, HOST-03]

duration: 25min
completed: 2026-04-03
---

# Phase 2 Plan 4: Host lobby controls & guest identity Summary

**Stable `draft_guest` cookie and WS `guestId`, host-only kick/move/startDraft/cancelRoom RPCs with DB helpers and unit tests — lobby can transition to `drafting` or `ended` server-side.**

## Performance

- **Duration:** ~25 min (estimated)
- **Started:** 2026-04-03T14:55:00Z
- **Completed:** 2026-04-03T15:01:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- HTTP layer sets `draft_guest` before auth; WebSocket upgrade exposes `guestId` for guests; `refreshSession` copies `guestId` from Cookie header when missing on the player object.
- `rooms.js` encapsulates host assertions, kick (user or guest member), lobby-only move with captain recompute, gated start draft, and host cancel/end room.
- `room.js` exports four live RPCs with FORBIDDEN/UNAUTHORIZED/VALIDATION mapping; tests cover non-host paths, DRAFT_NOT_READY, LOBBY_PHASE_REQUIRED, and kick payloads.

## Task Commits

1. **Task 1: draft_guest cookie + upgrade() guestId** — `a8db89e` (feat)
2. **Task 2: rooms.js mutations for kick, move, startDraft, cancel** — `836fcad` (feat)
3. **Task 3: live RPCs + tests** — `bc8d391` (feat)

**Plan metadata:** `docs(02-04): complete host lobby controls plan` (STATE/ROADMAP/REQUIREMENTS + this file)

## Files Created/Modified

- `src/hooks.server.js` — `sequence(guestCookieHandle, handleBetterAuth)`; `draft_guest` cookie defaults
- `src/hooks.ws.js` — Cookie parse; guest `guestId`; `refreshSession` guestId preservation
- `src/lib/server/rooms.js` — Host mutations and error codes; captain recompute after kick/move
- `src/live/room.js` — `kickMember`, `movePlayer`, `startDraft`, `cancelRoom` RPCs
- `src/live/room.spec.js` — Mocked `rooms.js` integration tests for host RPC behavior

## Decisions Made

- Preserved sequential writes for Neon HTTP instead of `db.transaction` (consistent with 02-03); documented as pattern in frontmatter.
- Live layer maps `rooms.js` string errors to `LiveError` via `mapRoomMutationError` for consistent client-facing codes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Vitest `createTestEnv` userData must include `role: 'player'` for signed-in RPC tests (matches `upgrade()` shape); adjusted tests accordingly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Server can end room (`cancelRoom`) and move to `drafting` (`startDraft`); Phase 3 can consume `phase` in snapshots.
- UI for host controls remains for 02-05/02-06; RPCs are ready to wire.

## Self-Check: PASSED

- `02-04-SUMMARY.md` exists at `.planning/phases/02-room-lobby/02-04-SUMMARY.md`
- Task commits `a8db89e`, `836fcad`, `bc8d391` and docs commit for this SUMMARY present on branch

---
*Phase: 02-room-lobby*
*Completed: 2026-04-03*
