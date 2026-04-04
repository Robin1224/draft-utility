---
phase: quick
plan: 260404-lk6
subsystem: disconnect-resilience
tags: [bug-fix, disconnect, grace-timer, cancelled-team-banner]
dependency_graph:
  requires: [04-02, 04-04]
  provides: [second-disconnect-grace-cancel, correct-cancelled-team-label]
  affects: [src/live/room.js, src/lib/components/molecules/DraftBoard.svelte]
tech_stack:
  added: []
  patterns: [reconnectCount tracking in draftState JSONB, IIFE $derived for multi-branch derivations]
key_files:
  modified:
    - src/live/room.js
    - src/lib/components/molecules/DraftBoard.svelte
decisions:
  - "disconnectGraceExpiredCancelOnly skips promoteCaptain — on second disconnect there is no eligible replacement path (captain already consumed their reconnect opportunity)"
  - "reconnectCount stored in draftState JSONB alongside other disconnect fields — no schema migration needed"
  - "cancelledTeam reads ds.script[ds.turnIndex].team not isCaptain scan — member rows persist in snapshot after cancellation making isCaptain scan unreliable"
  - "DraftState typedef updated with reconnectCount optional field to satisfy svelte-check type checking"
metrics:
  duration: 5min
  completed_date: "2026-04-04"
  tasks_completed: 2
  files_modified: 2
---

# Quick Fix 260404-lk6: Fix Second-Disconnect Grace Timer and Cancelled Team Banner

**One-liner:** Second-disconnect now fires a 10s cancel-only grace timer via `disconnectGraceExpiredCancelOnly`, and the cancelled banner reads the active script turn team instead of scanning isCaptain.

## What Was Fixed

### Bug 1 — Second disconnect never schedules a grace timer (room.js)

After a captain reconnected (DISC-04) and disconnected again, `onUnsubscribe` always used the DISC-01 path: 30s grace with `disconnectGraceExpired` which attempts `promoteCaptain`. However the captain had already consumed their reconnect, so the draft would hang with no timer active.

**Fix:** Added `reconnectCount` field incremented on each DISC-04 reconnect. `onUnsubscribe` now branches: when `reconnectCount >= 1` it uses a 10s grace window and schedules `disconnectGraceExpiredCancelOnly` which skips `promoteCaptain` entirely and goes straight to the DISC-03 cancel block.

New function `disconnectGraceExpiredCancelOnly`:
- Loads room, returns early if not drafting or not paused
- Calls `clearRoomTimer`, `loadDraftSnapshot`, `cancelDraftNoCaption`, publishes `{ ...snap, phase: 'cancelled' }`

### Bug 2 — Cancelled draft banner shows "Unknown" (DraftBoard.svelte)

`cancelledTeam` was derived by scanning `isCaptain` on team members. After cancellation the captain's member row still exists in the snapshot (draft_action rows are not removed), so both teams appeared to have a captain and the fallback returned `'Unknown'`.

**Fix:** Replaced the `isCaptain` scan with `ds.script[ds.turnIndex]?.team ?? 'Unknown'` — the script entry for the turn active at cancellation is the correct team.

Also fixed `PauseOverlay timerMs`: was hardcoded `30000`, now uses `(snapshot.draftState.reconnectCount ?? 0) >= 1 ? 10_000 : 30_000` so the progress ring displays the correct total duration on second-disconnect pauses.

## Tasks

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Track reconnect count and add cancel-only grace expiry | 6ca5bf6 | src/live/room.js |
| 2 | Fix cancelledTeam derived and PauseOverlay timerMs | 3ebd06f | src/lib/components/molecules/DraftBoard.svelte |

## Deviations from Plan

**1. [Rule 2 - Missing Critical] Added reconnectCount to DraftState typedef**
- **Found during:** Task 2 verification (svelte-check)
- **Issue:** `reconnectCount` was not declared in the local `@typedef {DraftState}` in DraftBoard.svelte, causing a type error on the `timerMs` expression
- **Fix:** Added `reconnectCount?: number` to the DraftState typedef in DraftBoard.svelte
- **Files modified:** src/lib/components/molecules/DraftBoard.svelte
- **Commit:** 3ebd06f

## Known Stubs

None — all changes wire live data from the snapshot.

## Self-Check: PASSED

- `src/live/room.js` — modified, committed 6ca5bf6
- `src/lib/components/molecules/DraftBoard.svelte` — modified, committed 3ebd06f
- `npm run check` — 0 errors, 0 warnings
- `disconnectGraceExpiredCancelOnly` exists at line 119, called at line 221
- `reconnectCount` incremented at line 160, read at line 204
- `ds.script[ds.turnIndex]` at line 82 of DraftBoard.svelte
- `reconnectCount` in PauseOverlay timerMs at line 111 of DraftBoard.svelte
