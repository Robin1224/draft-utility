---
phase: 04-draft-ui-disconnect-resilience
plan: 04
subsystem: ui
tags: [svelte5, tailwind, draft-board, pause-overlay, pick-ban, rpc, disconnect-resilience]

# Dependency graph
requires:
  - phase: 04-02
    provides: "Server-side disconnect resilience: paused/pausedUserId/graceEndsAt in draftState, cancelDraftNoCaption, grace timer"
  - phase: 04-03
    provides: "UI atoms/molecules: TurnIndicator, TeamDraftColumn, ChampionGrid, TimerDisplay, StatusBanner, DraftSlot, ChampionCard"
provides:
  - "PauseOverlay molecule: full-screen fixed bg-slate-900/70 overlay with grace countdown via TimerDisplay"
  - "DraftBoard molecule: 3-column grid (TeamDraftColumn A | ChampionGrid | TeamDraftColumn B) with TurnIndicator and conditional PauseOverlay"
  - "Phase-conditional rendering in +page.svelte: DraftBoard when drafting/cancelled, lobby layout otherwise"
  - "pickBan RPC wired from ChampionGrid submit through DraftBoard to +page.svelte handler"
  - "Promotion and reconnect StatusBanner shown for 3s with auto-dismiss"
  - "Cancellation state with Draft cancelled heading and Return to lobby button"
affects: [phase-05-chat, phase-06-post-draft-review]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "IIFE pattern for $derived with complex logic: const x = $derived((() => { ... })())"
    - "Phase-conditional main class: $derived for max-w-6xl (draft) vs max-w-4xl (lobby)"
    - "justReconnected prop pattern: parent detects reconnect and passes down to DraftBoard"

key-files:
  created:
    - src/lib/components/molecules/PauseOverlay.svelte
    - src/lib/components/molecules/DraftBoard.svelte
  modified:
    - src/routes/draft/[id]/+page.svelte

key-decisions:
  - "DraftBoard.svelte uses isCaptain and displayName (not is_captain/name) matching the actual rooms.js snapshot shape"
  - "pausedCaptainName resolved in DraftBoard from teams lookup by pausedUserId — no prop-threading"
  - "cancelledTeam derived by scanning teams for the one without a captain — handles both teams consistently"
  - "promotionBanner: prevPaused $state tracks transition from true to false to trigger banner"
  - "TeamDraftColumn receives champions={classes} prop for future name resolution (accepted silently, no behavior change in Plan 04)"

patterns-established:
  - "Pattern 1: IIFE immediately invoked in $derived for multi-line derived logic without $derived.by"
  - "Pattern 2: Phase-gated main width via $derived mainClass — conditional Tailwind class on main element"

requirements-completed:
  - DRAFT-07
  - DISC-01
  - DISC-04

# Metrics
duration: 12min
completed: 2026-04-04
---

# Phase 4 Plan 04: Draft UI Assembly Summary

**3-column DraftBoard with PauseOverlay grace countdown, pickBan RPC, and phase-conditional +page.svelte rendering for drafting/cancelled/lobby states**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-04T11:18:58Z
- **Completed:** 2026-04-04T11:30:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- PauseOverlay molecule with fixed inset-0 bg-slate-900/70 backdrop, grace countdown via TimerDisplay, and exact UI-SPEC copy ("Draft paused", captain name, "Waiting for reconnect...")
- DraftBoard molecule assembling TurnIndicator + 3-column grid (TeamDraftColumn A | ChampionGrid | TeamDraftColumn B) with conditional PauseOverlay, promotion banner, reconnect banner, and cancellation state
- +page.svelte updated with phase-conditional rendering: DraftBoard inside max-w-6xl for drafting/cancelled, existing lobby layout (LobbyHostBar, TeamColumn, SpectatorsPanel) unchanged in else branch

## Task Commits

Each task was committed atomically:

1. **Task 1: PauseOverlay molecule** - `9409e6d` (feat)
2. **Task 2: DraftBoard molecule + +page.svelte wiring** - `6ada008` (feat)

**Plan metadata:** (pending)

## Files Created/Modified

- `src/lib/components/molecules/PauseOverlay.svelte` - Full-screen pause overlay with bg-slate-900/70, TimerDisplay grace countdown, "Draft paused" heading, disconnected captain name, "Waiting for reconnect..." copy
- `src/lib/components/molecules/DraftBoard.svelte` - Root draft view: TurnIndicator, 3-col grid, PauseOverlay conditional, StatusBanner for promotion/reconnect, cancellation state with Return to lobby
- `src/routes/draft/[id]/+page.svelte` - Phase-conditional branch: DraftBoard (drafting/cancelled) or lobby layout; added pickBan import, handlePickBan handler, mainClass derived

## Decisions Made

- Used IIFE pattern inside `$derived((() => { ... })())` for multi-line derived computations (isActiveCaptain, pausedCaptainName, cancelledTeam) — avoids $derived.by verbosity for pure expressions
- `isCaptain` and `displayName` used in DraftBoard (matching actual rooms.js snapshot shape), not `is_captain`/`name` as noted in the plan interface
- `justReconnected` prop pattern chosen over window.online listener for cleaner control flow in v1
- Pre-existing test failures in room.spec.js (2 failures) confirmed pre-existing before these changes — out of scope

## Deviations from Plan

None - plan executed exactly as written. The plan's interface annotations used `is_captain`/`name` but the code adapted to the actual snapshot shape (`isCaptain`/`displayName`) — this is a spec-to-code alignment, not a deviation from intent.

## Issues Encountered

- The plan's interface description used `is_captain` and `name` for team members, but the actual `rooms.js` snapshot shape uses `isCaptain` and `displayName`. Applied the correct property names from the running code.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All Phase 4 UI requirements are now connected: server disconnect logic (Plan 02) flows through UI atoms (Plan 03) into DraftBoard (Plan 04)
- Phase 5 (Chat) and Phase 6 (Post-Draft Review) can proceed independently
- Known: TeamDraftColumn displays raw champion_id strings in DraftSlot (champion name resolution deferred — pre-existing from Plan 03); pick/ban flows are functional, cosmetic fix can be addressed in Phase 6 or a patch

---
*Phase: 04-draft-ui-disconnect-resilience*
*Completed: 2026-04-04*
