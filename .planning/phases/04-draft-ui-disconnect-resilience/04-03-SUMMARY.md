---
phase: 04-draft-ui-disconnect-resilience
plan: 03
subsystem: ui
tags: [svelte5, tailwind, components, atoms, molecules, draft, champion-grid, timer]

# Dependency graph
requires:
  - phase: 04-draft-ui-disconnect-resilience
    provides: UI-SPEC.md design contract with color tokens, typography, layout, and state matrix

provides:
  - ChampionCard atom with 5 state variants (default/selected/picked/banned/disabled) and WCAG touch target
  - TimerDisplay atom with setInterval cleanup, urgency at ≤10s (red-600), and progress bar
  - DraftSlot atom with empty (dashed border) and filled states for pick/ban slots
  - StatusBanner atom with auto-dismiss after 3s and green-600/red-600 variant styles
  - TurnIndicator molecule composing TimerDisplay with "Team X — Pick/Ban" heading format
  - TeamDraftColumn molecule rendering DraftSlot atoms in BANS/PICKS sections per team
  - ChampionGrid molecule with responsive grid (4-col mobile / 7-col desktop), single-select, and Submit button

affects:
  - 04-04 (DraftBoard assembles these molecules)
  - 04-05 (PauseOverlay uses TimerDisplay for grace countdown)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "$state + $derived + $effect runes for reactive Svelte 5 components"
    - "$effect returning cleanup function () => clearInterval/clearTimeout for timer leak prevention"
    - "Tailwind v4 color tokens (bg-bg-primary, text-text-primary, amber-500, red-600, green-600)"
    - "min-h-[44px] enforced on interactive cards for WCAG 2.5.5 touch target compliance"
    - "$derived with arrow function for slots requiring filtered array computation"

key-files:
  created:
    - src/lib/components/atoms/ChampionCard.svelte
    - src/lib/components/atoms/TimerDisplay.svelte
    - src/lib/components/atoms/DraftSlot.svelte
    - src/lib/components/atoms/StatusBanner.svelte
    - src/lib/components/molecules/TurnIndicator.svelte
    - src/lib/components/molecules/TeamDraftColumn.svelte
    - src/lib/components/molecules/ChampionGrid.svelte
  modified: []

key-decisions:
  - "ChampionCard uses <button> element with disabled attribute for picked/banned/disabled states — screen reader accessible"
  - "TimerDisplay derives secondsLeft via $effect+setInterval at 250ms tick for smooth progress bar; cleanup via return () => clearInterval"
  - "TeamDraftColumn passes champion_id as championName for now — Plan 04 (DraftBoard) resolves ids to names via catalog"
  - "ChampionGrid single-select: clicking selected card deselects it (toggle), no double-click shortcut per D-03"
  - "StatusBanner uses role=status aria-live=polite for screen reader announcements"

patterns-established:
  - "Timer pattern: $effect with setInterval+clearInterval cleanup for countdown components"
  - "Disabled state pattern: opacity-40 cursor-not-allowed pointer-events-none (no color change per UI-SPEC)"
  - "Single-select pattern: $state(null) selectedId toggled on click, Submit button conditionally shown"

requirements-completed: [DRAFT-07]

# Metrics
duration: 2min
completed: 2026-04-04
---

# Phase 04 Plan 03: Draft UI Atoms and Molecules Summary

**7 Svelte 5 rune-based draft UI components — 4 atoms (ChampionCard, TimerDisplay, DraftSlot, StatusBanner) and 3 molecules (TurnIndicator, TeamDraftColumn, ChampionGrid) — built to UI-SPEC with all state variants and timer cleanup**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-04T10:46:47Z
- **Completed:** 2026-04-04T10:48:35Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- All 4 atoms built with exact state variants from UI-SPEC; setInterval cleanup prevents interval leaks
- TurnIndicator and TeamDraftColumn compose atoms correctly with em-dash heading format and BANS/PICKS labels
- ChampionGrid implements responsive 4-col/7-col grid with single-select confirm pattern (no double-click per D-03)

## Task Commits

Each task was committed atomically:

1. **Task 1: Atom components — ChampionCard, TimerDisplay, DraftSlot, StatusBanner** - `2e4cb1c` (feat)
2. **Task 2: Molecule components — TurnIndicator, TeamDraftColumn, ChampionGrid** - `1cc3f54` (feat)

## Files Created/Modified
- `src/lib/components/atoms/ChampionCard.svelte` - Champion card with 5 state variants, aria-pressed, WCAG touch target
- `src/lib/components/atoms/TimerDisplay.svelte` - Countdown display with setInterval/clearInterval cleanup, red-600 urgency at ≤10s
- `src/lib/components/atoms/DraftSlot.svelte` - Pick/ban slot with dashed-border empty state and filled state
- `src/lib/components/atoms/StatusBanner.svelte` - Fixed-position auto-dismissing banner with green-600/red-600 variants
- `src/lib/components/molecules/TurnIndicator.svelte` - Turn heading + captain name + embedded TimerDisplay
- `src/lib/components/molecules/TeamDraftColumn.svelte` - Team ban/pick columns using DraftSlot atoms
- `src/lib/components/molecules/ChampionGrid.svelte` - Responsive champion grid with single-select and Submit button

## Decisions Made
- ChampionCard uses `<button>` with `disabled` attribute and `aria-pressed` for proper accessibility
- TimerDisplay `$effect` returns `() => clearInterval(id)` — Svelte 5 cleanup syntax prevents interval accumulation
- TeamDraftColumn passes `champion_id` as `championName` for now; DraftBoard (Plan 04) will resolve ids to display names via the classes.json catalog
- ChampionGrid selectedId toggles on re-click (deselect if same champion clicked again)
- StatusBanner `role="status" aria-live="polite"` for screen-reader announcement of reconnect/promotion events

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 7 building blocks ready for DraftBoard assembly in Plan 04
- TeamDraftColumn expects catalog resolution in DraftBoard (champion_id → display name) — documented in component JSDoc
- PauseOverlay (Plan 05) can use TimerDisplay atom directly for grace countdown

---
*Phase: 04-draft-ui-disconnect-resilience*
*Completed: 2026-04-04*
