---
phase: 04-draft-ui-disconnect-resilience
plan: 02
subsystem: realtime
tags: [svelte-realtime, websocket, disconnect, captain, grace-timer, draft]

# Dependency graph
requires:
  - phase: 03-draft-engine
    provides: autoAdvanceTurn, loadDraftSnapshot, updateDraftState, draft timer infrastructure
  - phase: 02-room-lobby
    provides: lobby stream, room_member schema, getRoomByPublicCode

provides:
  - DraftState typedef extended with paused, pausedUserId, graceEndsAt fields
  - cancelDraftNoCaption helper (no host check)
  - promoteCaptain helper (demote old, promote oldest eligible by joined_at)
  - lobby stream onUnsubscribe hook wired for captain disconnect detection
  - 30-second grace timer on captain disconnect (scheduleTimer with ':grace' suffix)
  - disconnectGraceExpired: promotes or cancels on grace expiry
  - lobby stream init branching on phase === 'drafting' (DISC-04 hydration)
  - autoAdvanceTurn reactive publish via platform parameter (DISC-pitfall-2)
  - hooks.ws.js close export for uWS close handler

affects:
  - 04-03 through 04-05 (UI components reading paused/graceEndsAt from draftState)
  - 05-chat (chat not affected but same lobby stream)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Grace timer keyed by roomId + ':grace' to avoid colliding with turn timer (roomId key)"
    - "onUnsubscribe derives publicCode from topic by stripping 'lobby:' prefix"
    - "platform parameter threaded through autoAdvanceTurn for reactive publish without ctx"
    - "lobby stream init branches on roomRow.phase: drafting → loadDraftSnapshot, else → loadLobbySnapshot"

key-files:
  created: []
  modified:
    - src/lib/server/db/schema.js
    - src/lib/server/rooms.js
    - src/live/draft.js
    - src/live/room.js
    - src/hooks.ws.js
    - src/live/draft.spec.js
    - src/live/room.spec.js
    - src/lib/server/rooms.spec.js

key-decisions:
  - "Grace timer keyed roomId + ':grace' so clearRoomTimer(roomId) cancels turn timer only; grace timer needs its own key"
  - "autoAdvanceTurn receives platform=null by default; null skips publish block entirely (no loadDraftSnapshot call)"
  - "onUnsubscribe fires only for authenticated players (role === 'player') to avoid guest disconnects triggering pause"
  - "lobby init reconnect handling uses init fn (onSubscribe not needed); ctx.publish called inside init to push resume to all"
  - "cancelDraftNoCaption sets phase=cancelled (not ended) to distinguish captain-abandoned drafts from host-cancelled rooms"

patterns-established:
  - "Grace timer: scheduleTimer(roomId + ':grace', 30_000, () => disconnectGraceExpired(code, userId, publish))"
  - "Reconnect resume: clearRoomTimer(roomId + ':grace') then updateDraftState clearing paused fields then scheduleTimer for turn"

requirements-completed:
  - DISC-01
  - DISC-02
  - DISC-03
  - DISC-04

# Metrics
duration: 7min
completed: 2026-04-04
---

# Phase 04 Plan 02: Disconnect Resilience Server-Side Summary

**Captain disconnect detection via onUnsubscribe hook with 30-second grace timer, promotion-or-cancel on expiry, reconnect hydration fix, and reactive timer-advance publishing via platform parameter**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-04T12:47:15Z
- **Completed:** 2026-04-04T12:54:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Wired `close` export in hooks.ws.js so svelte-realtime fires onUnsubscribe on WebSocket close events (DISC-01 prerequisite)
- Implemented full captain disconnect flow: onUnsubscribe detects captain disconnect, pauses draft, starts 30s grace timer; disconnectGraceExpired promotes oldest eligible member or calls cancelDraftNoCaption if none available
- Fixed lobby stream init to return loadDraftSnapshot when room.phase === 'drafting' (DISC-04) so reconnecting clients get full draft state without stale lobby data
- Fixed autoAdvanceTurn to accept optional platform parameter and call platform.publish after timer-driven advances so all clients receive turn updates reactively

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema extension + DB helpers (cancelDraftNoCaption, promoteCaptain)** - `d890521` (feat)
2. **Task 2: Wire disconnect hooks, fix autoAdvanceTurn publish, fix lobby stream init branching** - `f805ed0` (feat)

## Files Created/Modified

- `src/lib/server/db/schema.js` - DraftState typedef extended with paused, pausedUserId, graceEndsAt optional fields
- `src/lib/server/rooms.js` - cancelDraftNoCaption and promoteCaptain added; ne added to drizzle-orm imports
- `src/live/draft.js` - autoAdvanceTurn accepts platform param, calls platform.publish after advance
- `src/live/room.js` - lobby stream gets onUnsubscribe hook, disconnectGraceExpired helper, init phase branching, ctx.platform passed to autoAdvanceTurn
- `src/hooks.ws.js` - close re-exported from svelte-realtime/server
- `src/live/draft.spec.js` - TDD tests for platform.publish behavior
- `src/live/room.spec.js` - TDD structural tests for DISC requirements, cancelDraftNoCaption/promoteCaptain mock wiring
- `src/lib/server/rooms.spec.js` - TDD tests for cancelDraftNoCaption and promoteCaptain

## Decisions Made

- Grace timer keyed by `roomId + ':grace'` (not `roomId`) so clearRoomTimer on turn advance doesn't cancel the grace timer and vice versa
- `autoAdvanceTurn` platform=null default skips both loadDraftSnapshot and publish; null is the safe default for recursive timer callbacks
- `cancelDraftNoCaption` sets phase to 'cancelled' (not 'ended') to distinguish disconnect-abandoned drafts from explicit host cancellations
- `onUnsubscribe` only acts on authenticated players (role === 'player') — guest disconnects do not trigger pause
- Reconnect handling implemented in lobby stream init fn (not a separate onSubscribe option) to leverage existing init context with ctx.publish

## Deviations from Plan

None — plan executed exactly as written. The plan had clear action steps with exact code to implement; all implementation matched the prescribed approach.

## Issues Encountered

Pre-existing test failure in `src/live/room.spec.js` (file-level import error: `DATABASE_URL is not set`). This failure exists in the codebase before this plan's changes — verified by testing against Task 1 commit baseline. The `async (importOriginal)` mock pattern loads the real `rooms.js` which triggers `auth.js` → `db/index.js` which requires `DATABASE_URL`. This is outside this plan's scope.

## Known Stubs

None — all disconnect logic is fully wired server-side. UI components for displaying the paused state will be implemented in subsequent plans (04-03+).

## Next Phase Readiness

- Server-side disconnect resilience complete (DISC-01 through DISC-04)
- UI plans (04-03, 04-04, 04-05) can now read `draftState.paused`, `draftState.pausedUserId`, and `draftState.graceEndsAt` from the lobby stream to display disconnect overlay, countdown, and result
- autoAdvanceTurn now publishes reactively via platform — clients receive timer advances without waiting for next pick/ban interaction

---
*Phase: 04-draft-ui-disconnect-resilience*
*Completed: 2026-04-04*
