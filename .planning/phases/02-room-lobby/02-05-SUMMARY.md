---
phase: 02-room-lobby
plan: 05
subsystem: ui
tags: [svelte-5, svelte-realtime, tailwind, lobby, websocket]

requires:
  - phase: 02-room-lobby
    provides: loadLobbySnapshot shape, $live/room RPCs, parseRoomCode routes
provides:
  - Lobby UI on /draft/[id] with team columns, spectators panel, Phases strip, host bar
  - Full absolute copy-link via appOrigin + resolve()
  - Realtime lobby snapshot subscription and mutation handlers
affects:
  - phase-03-draft-flow
  - verification/UAT for ROOM-03, ROOM-06, ROOM-07

tech-stack:
  added: []
  patterns:
    - "fromStore(lobby(code)).current in $derived.by for reactive stream without stale $props capture"
    - "Phases future steps: opacity + pointer-events-none + aria-disabled on inner span (not li)"

key-files:
  created:
    - src/lib/components/molecules/TeamColumn.svelte
    - src/lib/components/molecules/SpectatorsPanel.svelte
    - src/lib/components/molecules/LobbyHostBar.svelte
  modified:
    - src/lib/components/atoms/Phases.svelte
    - src/routes/draft/[id]/+page.svelte
    - src/routes/draft/[id]/+page.server.js
    - .env.example

key-decisions:
  - "Phases aria-disabled on child span to satisfy a11y (implicit listitem role does not support aria-disabled)."
  - "Reactive lobby subscription uses fromStore(lobby(code)) with code from $derived(data.room.public_code)."

patterns-established:
  - "Draft room page composes Header + Phases + host-only LobbyHostBar + copy link + grid + SpectatorsPanel."

requirements-completed: [ROOM-03, ROOM-06, ROOM-07]

duration: 25m
completed: 2026-04-03
---

# Phase 02 Plan 05: Lobby UI Summary

**Realtime lobby at `/draft/[id]` with two team columns, collapsible spectators, phased strip (future steps disabled in lobby), host moderation bar, captain-gated Start draft, and absolute copy-link using request origin.**

## Performance

- **Duration:** 25m (estimated wall time for execution)
- **Started:** 2026-04-03 (session)
- **Completed:** 2026-04-03
- **Tasks:** 3
- **Files modified:** 9 (including planning artifact)

## Accomplishments

- `Phases` now takes `roomPhase` and dims/disables segments after the active phase per D-06.
- `TeamColumn` and `SpectatorsPanel` implement D-05/D-07 roster and spectator UX (guest sign-in link, join buttons, collapsed spectators by default).
- Draft page subscribes to `lobby(publicCode)`, wires join/kick/move/start/cancel, exposes `appOrigin` for clipboard URL, and implements `LobbyHostBar` per D-08.

## Task Commits

Each task was committed atomically:

1. **Task 1: Phases.svelte — active step + disabled future steps** - `360a8f5` (feat)
2. **Task 2: TeamColumn + SpectatorsPanel molecules** - `4e41f46` (feat)
3. **Task 3: LobbyHostBar + draft page wire-up + copy link + load appOrigin** - `bb02431` (feat)

**Plan metadata:** `docs(02-05): complete lobby UI plan` (planning/state/roadmap/requirements)

## Files Created/Modified

- `src/lib/components/atoms/Phases.svelte` — `roomPhase` mapping; disabled future steps; accessible disabled state
- `src/lib/components/molecules/TeamColumn.svelte` — roster slots, badges, join vs guest copy
- `src/lib/components/molecules/SpectatorsPanel.svelte` — collapsible spectators list
- `src/lib/components/molecules/LobbyHostBar.svelte` — host move/kick/start/cancel and captain gating
- `src/routes/draft/[id]/+page.svelte` — stream wiring, layout, copy link, error line
- `src/routes/draft/[id]/+page.server.js` — `appOrigin: url.origin`
- `.env.example` — optional `PUBLIC_APP_URL` comment for production documentation

## Decisions Made

- Used `fromStore(lobby(code)).current` inside `$derived.by` so `code` stays tied to reactive `data` and the stream updates correctly (fixes “captures initial value of `data`” warning).
- Placed `aria-disabled` on a `span` inside each phase `li` because `aria-disabled` is not valid on implicit `listitem`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Draft page updated in Task 1 for new `Phases` API**

- **Found during:** Task 1 (Phases refactor)
- **Issue:** `+page.svelte` still passed `phase={1}`; `npm run check` would fail on unknown prop.
- **Fix:** Switched to `roomPhase="lobby"` until Task 3 wired live phase; Task 3 replaced with `roomPhaseForStrip`.
- **Files modified:** `src/routes/draft/[id]/+page.svelte`
- **Committed in:** `360a8f5` / finalized in `bb02431`

**2. [Rule 1 - Bug] Implicit `listitem` + `aria-disabled`**

- **Found during:** Task 1 (`npm run check` a11y warnings)
- **Issue:** `aria-disabled` on `<li>` triggered `a11y_role_supports_aria_props_implicit`.
- **Fix:** Wrapped labels in `<span aria-disabled="...">` inside each `<li>`.
- **Files modified:** `src/lib/components/atoms/Phases.svelte`
- **Committed in:** `360a8f5`

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug/a11y)  
**Impact on plan:** No scope change; required for check and accessibility.

## Issues Encountered

- `npm run build` completes Vite SSR/client bundles then fails at **svelte-adapter-uws** with missing native **uWebSockets.js** (`Could not load uWebSockets.js`). This is an environment/dependency constraint, not introduced by this plan. **`npm run check` exits 0.**

## User Setup Required

None beyond existing `.env.example` (optional `PUBLIC_APP_URL` is documented only; copy-link uses `appOrigin` from the request).

## Next Phase Readiness

- Lobby structure and RPC wiring are in place for Phase 3 draft flow and further host rules.
- End-to-end verification still depends on WebSocket + uWS dev runtime for live streams.

## Self-Check: PASSED

- **Created file:** `.planning/phases/02-room-lobby/02-05-SUMMARY.md` — present
- **Task commits present in git:** `360a8f5`, `4e41f46`, `bb02431`
- **Docs commit:** `git log -1 --oneline` matches `docs(02-05): complete lobby UI plan`

---
_Phase: 02-room-lobby_  
_Completed: 2026-04-03_
