---
phase: 10-core-screen-reskins
plan: 04
subsystem: ui
tags: [svelte5, sveltekit, cyber, lobby, css, tailwind-removal]

# Dependency graph
requires:
  - phase: 10-01
    provides: ".cy-lobby / .cy-banner / .cy-team / .cy-host-panel / .cy-spec CSS foundation in src/app.css"
  - phase: 09
    provides: "CyShell persistent header + app-wide .cy-phases tracker (derives phase from $live/room)"
provides:
  - "Cyber Lobby screen (UI-03): LOBBY.INIT() banner with PLAYERS/SPECTATORS/TURNS stats"
  - "Reskinned TeamColumn (.cy-team lime/violet, <EMPTY> slots, CAPTAIN tag, JOIN_TEAM_x() CTA)"
  - "Reskinned LobbyHostBar (.cy-host-panel: EXEC/CONFIG/CANCEL/▶ START_DRAFT())"
  - "Reskinned SpectatorsPanel (.cy-spec pills with host mute/unmute)"
  - "Tailwind-free src/routes/draft/[id]/+page.svelte route wrappers (phase-switched route owned by this plan)"
affects: [10-05, 10-06, 10-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route file is Tailwind-free; per-screen Cyber structure lives in molecules + app.css .cy-* classes"
    - "Header/Phases removed from route; CyShell (layout) renders the phase tracker app-wide from the live lobby snapshot"

key-files:
  created:
    - .planning/phases/10-core-screen-reskins/10-04-SUMMARY.md
  modified:
    - src/lib/components/molecules/TeamColumn.svelte
    - src/lib/components/molecules/LobbyHostBar.svelte
    - src/lib/components/molecules/SpectatorsPanel.svelte
    - src/routes/draft/[id]/+page.svelte

key-decisions:
  - "Removed route-level <Header><Phases/></Header> + mainClass derive — CyShell renders the tracker app-wide, so re-rendering it in the route double-rendered the brand wordmark"
  - "TURNS stat falls back to 10 when snapshot.draftState?.script?.length is unavailable in the lobby phase"
  - "Empty slots render dashed .cy-slot-empty with <EMPTY> (per cyber.jsx; UI-SPEC permits either <EMPTY> or [ open slot ])"

patterns-established:
  - "Phase-switched route (+page.svelte) keeps a plain <main> wrapper; each branch wraps its content in the matching .cy-* container"

requirements-completed: [UI-03]

# Metrics
duration: ~45min (across two executor sessions, interrupted by socket error mid-Task-4)
completed: 2026-06-15
---

# Phase 10 Plan 04: Lobby reskin (UI-03) Summary

**Cyber Lobby screen: LOBBY.INIT() banner + stats, lime/violet team columns with `<EMPTY>` slots and CAPTAIN tags, the [HOST_CONSOLE] bar (EXEC/CONFIG/CANCEL/▶ START_DRAFT()), and the // SPECTATORS strip — all `$live` wiring byte-for-byte unchanged (D-01).**

## Performance

- **Duration:** ~45 min (two sessions — first executor cut off by a socket error mid-Task-4; continuation finished Task 4)
- **Completed:** 2026-06-15
- **Tasks:** 4
- **Files modified:** 4

## Accomplishments
- TeamColumn restyled to the Cyber `.cy-team` column (lime A / violet B, `[NN]` numbered slots, dashed `<EMPTY>` placeholders, CAPTAIN/HOST tags, `JOIN_TEAM_x()` CTA with guest/full gating preserved)
- LobbyHostBar restyled to `[HOST_CONSOLE]` with EXEC/CONFIG/CANCEL (danger)/▶ START_DRAFT() (primary), captain-gated Start, kick list, DraftSettingsPanel toggle intact
- SpectatorsPanel restyled to the `// SPECTATORS [n]` strip of `.cy-spec-pill`s with host mute/unmute preserved
- Lobby route branch wrapped in `.cy-lobby` with the LOBBY.INIT() banner (PLAYERS/SPECTATORS/TURNS stats) + `.cy-lobby-grid`; route-level Tailwind wrappers and the `mainClass` derive removed; route `<Header>`/`<Phases>` removed (CyShell renders the tracker app-wide)

## Task Commits

Each task was committed atomically:

1. **Task 1: Reskin TeamColumn** - `4ea751a` (feat)
2. **Task 2: Reskin LobbyHostBar** - `5091b33` (feat)
3. **Task 3: Reskin SpectatorsPanel** - `122d00e` (feat)
4. **Task 4: Wrap lobby branch in cy-lobby banner + grid, strip route Tailwind** - `714eb1b` (feat)

**Plan metadata:** committed with this SUMMARY + STATE/ROADMAP/REQUIREMENTS updates.

## Files Created/Modified
- `src/lib/components/molecules/TeamColumn.svelte` - Cyber team column (.cy-team, slots, captain tag, JOIN_TEAM_x() CTA)
- `src/lib/components/molecules/LobbyHostBar.svelte` - Cyber [HOST_CONSOLE] bar
- `src/lib/components/molecules/SpectatorsPanel.svelte` - Cyber // SPECTATORS strip
- `src/routes/draft/[id]/+page.svelte` - Lobby branch wrapped in .cy-lobby + banner + grid; route-level Tailwind + mainClass derive + duplicate Header/Phases removed

## Decisions Made
- **Removed the route's `<Header><Phases/></Header>` and `mainClass` derive.** Verified safe: `src/routes/+layout.svelte` derives `phase` live from the `$live/room` lobby snapshot and feeds it to CyShell, which renders the `.cy-phases` tracker app-wide. Re-rendering it in the route double-rendered the bracketed brand wordmark. The route must NOT re-add Header/Phases.
- **TURNS stat** uses `snapshot.draftState?.script?.length ?? 10` — falls back to 10 because the configured script length is not present on the lobby snapshot before the draft starts.
- **Empty slots** render `<EMPTY>` inside dashed `.cy-slot-empty` (per cyber.jsx; UI-SPEC allows either form).

## Deviations from Plan

None - plan executed as written. The Header/Phases removal called for in Task 4 step 1 was applied after confirming against CyShell that the layout renders the tracker (the plan's stated decision criterion: avoid a duplicate bracketed wordmark on screen).

## Issues Encountered
- **Socket-interruption recovery:** the first executor session was cut off by a socket error partway through Task 4 (route-level Header/wrapper edits done and left uncommitted in the working tree; the lobby `{:else}` branch not yet converted). A continuation session read the working-tree state, finished the lobby branch conversion (`.cy-lobby` + banner + `.cy-lobby-grid` + `$ COPY_LINK()` button), and committed the full Task 4 as `714eb1b`. No work was lost or duplicated.

## Verification
- `grep -cE "flex-1|min-w-0|max-w-3xl|grid-cols|text-text-|rounded-|bg-bg-|px-4|py-6" src/routes/draft/[id]/+page.svelte` → **0**
- `grep -cE "flex-row|grid-cols-|max-w-3xl|max-w-6xl|text-text-primary|mainClass" src/routes/draft/[id]/+page.svelte` → **0**
- `npm run check` → **10 errors, 0 new** — all 10 are PRE-EXISTING failures in unrelated files (`phase8-foundation.spec.js`, `phase10-screens.spec.js`, `CyShell.svelte`, `CyShell.svelte.spec.js`), tracked in `.planning/phases/10-core-screen-reskins/deferred-items.md`. This plan introduced zero new errors.

## Known Stubs
None. The lobby renders real snapshot values (teams, spectators, mutedIds). The TURNS stat fallback to 10 is intentional (script length is not on the pre-start lobby snapshot) and is not a stub.

## Next Phase Readiness
- Plan 05 (Drafting + Chat, UI-04) owns ChatPanel — the `<ChatPanel … bind:activeTab/>` element in the lobby and drafting branches was left untouched.
- The drafting/cancelled and review route branches had their Tailwind wrappers stripped to bare `<div>`/elements; Plans 05/07 restyle their inner content.
- Route file is Tailwind-free; Plans 05-07 only touch their molecules.

## Self-Check: PASSED

All 4 modified files exist; all 4 task commits (4ea751a, 5091b33, 122d00e, 714eb1b) verified present.

---
*Phase: 10-core-screen-reskins*
*Completed: 2026-06-15*
