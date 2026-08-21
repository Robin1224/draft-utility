---
phase: 11-terminal-modals
plan: 03
subsystem: ui
tags: [svelte5, cyber, modal, host-console, lobby, vitest-browser]

# Dependency graph
requires:
  - phase: 11-terminal-modals
    plan: 01
    provides: CyModal native-<dialog> wrapper (open $bindable, title, onAttemptClose, children/footer snippets) + .cy-hc-*/.cy-kick-* CSS
  - phase: 11-terminal-modals
    plan: 02
    provides: DraftSettingsPanel full Settings modal — <DraftSettingsPanel bind:open bind:script bind:timerSeconds /> contract
provides:
  - LobbyHostBar as slim launcher bar (CONFIG() / HOST_CONSOLE() / gated ▶ START_DRAFT()) per D-01
  - Host Console ~/draft/host_console terminal modal (MOD-02) — move_player, kick list, amber captain hint, CANCEL_ROOM, second gated START
  - LobbyHostBar.svelte.spec.js — 8-behavior browser spec locking the frozen callback signatures
affects: [12-access-control-secondary-screens]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two always-mounted CyModal compositions in one component: closed dialogs are display:none/out of the a11y tree, so getByRole('dialog') resolves only the open one"
    - "Dual gated action: both ▶ START_DRAFT() instances read the single startDisabled $derived (D-02) — no state duplication"
    - "page.elementLocator(domNode).click() disambiguates duplicate-name buttons when one lives in an open dialog footer"

key-files:
  created:
    - src/lib/components/molecules/LobbyHostBar.svelte.spec.js
  modified:
    - src/lib/components/molecules/LobbyHostBar.svelte
    - src/routes/draft/[id]/+page.svelte

key-decisions:
  - "Launcher buttons (CONFIG()/HOST_CONSOLE()) sit inside the lobby-phase gate where the old CONFIG toggle was; START_DRAFT() stays outside it, gated by startDisabled (which already includes the phase check) — preserves old bar behavior"
  - "Added removableMembers $derived (rosterForKick minus hosts) so the kick list and its // no removable players empty state share one source; frozen derives untouched"
  - "Console modal passes NO onAttemptClose — no dirty state, always dismisses freely (D-05)"

patterns-established:
  - "Host Console CyModal composition: .cy-modal-head + .cy-hc-section blocks + footer snippet with danger-left / primary-right layout"

requirements-completed: [MOD-02]

# Metrics
duration: 7min
completed: 2026-08-21
---

# Phase 11 Plan 03: Host Console Modal & Launcher Split Summary

**LobbyHostBar split per D-01..D-03: slim CONFIG()/HOST_CONSOLE()/START_DRAFT() launcher bar plus a `~/draft/host_console` CyModal housing move_player, kick list, amber captain hint, CANCEL_ROOM and a second START — all gated by the single `startDisabled` derive, everything inside `{#if isHost}`**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-08-21T12:47:45Z
- **Completed:** 2026-08-21T12:54:32Z
- **Tasks:** 2 (1 standard + 1 TDD)
- **Files modified:** 3

## Accomplishments

- LobbyHostBar reworked: frozen script block survives verbatim (typedefs, five derives, `kickPayload`, `submitMove`); bar reduced to `CONFIG()` + `HOST_CONSOLE()` launchers (lobby-gated), `.cy-grow`, gated `▶ START_DRAFT()` and the `// both teams need a captain` hint — inline selects/EXEC/CANCEL/kick pills all removed (D-01, D-03)
- Host Console CyModal (`~/draft/host_console`, MOD-02) per cyber.jsx 856–901: `> HOST_CONSOLE` head with `// root@{code}` line, move_player `.cy-hc-row` (player select, `→ A`/`→ B` target, EXEC), kick `.cy-kick-list` with `team_X · cap` meta and `// no removable players` empty state, `.cy-hc-hint`, and a footer with `CANCEL_ROOM` (danger, left) + second gated `▶ START_DRAFT()` (D-02)
- Plan 02 Settings modal wired to the `CONFIG()` launcher via `bind:open={settingsOpen}`; both modals always mounted inside `{#if isHost}` (T-11-01 — non-hosts get zero DOM)
- +page.svelte touched minimally: `{code}` prop added to the invocation, banner copy now `configure script via [CONFIG()].`; handlers at lines 106–143 byte-identical (verified via git diff)
- New 8-behavior browser spec green; full suite 195 passed (23 files + 3 skipped) — phase gate

## Task Commits

Each task was committed atomically:

1. **Task 1: slim launcher + Host Console modal + Settings wiring + page touch** - `e14664d` (feat)
2. **Task 2: LobbyHostBar browser spec (8 behaviors) + phase gate** - `1ee5517` (test)

## Files Created/Modified

- `src/lib/components/molecules/LobbyHostBar.svelte` - slim launcher bar + Host Console CyModal + Settings modal invocation, all behind `{#if isHost}`
- `src/lib/components/molecules/LobbyHostBar.svelte.spec.js` - host-only guard, launcher set, dual START gating, move/kick frozen signatures, CANCEL_ROOM, console chrome, CONFIG() launch
- `src/routes/draft/[id]/+page.svelte` - `{code}` prop + `[CONFIG()]` banner copy only

## TDD Gate Compliance

- Task 2 carried `tdd="true"` but the plan (type: `execute`) deliberately placed the implementation in Task 1 — same structure Plan 02 documented. The brand-new spec therefore had no meaningful RED phase: all 8 behaviors passed on first run against the Task 1 implementation (`e14664d`)
- test commit `1ee5517` follows feat commit `e14664d`; no refactor needed

## Decisions Made

- Lobby-phase gate wraps only the two launcher buttons (where the old CONFIG toggle's gate was); `▶ START_DRAFT()` stays always-rendered in the bar, disabled via `startDisabled` which already folds in the phase check
- Added one new derive (`removableMembers`) on top of the frozen five so the kick list and empty state share a single filter; iteration key kept the old `${userId}-${guestId}-${side}` composite
- Test 3 asserts both START instances at the DOM level (`startButtons()` helper) and clicks the footer one via `page.elementLocator(...)` — with the console open, role queries for the duplicated name would be ambiguous

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Svelte MCP `svelte-autofixer` unavailable** in this executor environment (only Read/Write/Edit/Bash tools exposed) — used `npx prettier --write` + `npm run check` per the Phase 9/10 precedent. Both touched `.svelte` files and the new spec are prettier-clean and eslint-clean.
- **Repo-wide `npm run lint` / `npm run check` exit non-zero from pre-existing debt** (≈792 prettier-unformatted files predating the milestone; 10 svelte-check errors in 4 files tracked in Phase 10 `deferred-items.md`; 2 pre-existing `svelte/no-navigation-without-resolve` errors on +page.svelte lines 256/306 — byte-identical at HEAD, untouched by this plan). Scoped verification passed: all 3 touched/created files pass `prettier --check` + `eslint`, and the svelte-check count is byte-identical to the pre-plan baseline (10 errors / 4 files, none in Phase 11 files) — same gate treatment as Plans 8-01…11-02.

## Known Stubs

None — both modals are fully wired: the console routes through the frozen page handlers, the Settings modal commits through its bindables.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes. T-11-01 (isHost guard, spec Test 1) and T-11-02 (text interpolation only, no `{@html}`) mitigations applied as registered.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 11 is fully executed (3/3 plans): CyModal foundation, Settings modal, Host Console modal all green — ROADMAP SC-3/SC-4 machine-verified by spec Tests 3–7
- Manual UAT items for /gsd:verify-work (non-blocking, per 11-VALIDATION.md): reduced-motion entrance suppression, real-mouse drag reorder persistence through SAVE_CONFIG(), ≤640px full-screen takeover with pinned titlebar/footer
- Phase 12 (access control + secondary screens) can reuse the CyModal contract and the launcher-bar pattern

## Self-Check: PASSED

- src/lib/components/molecules/LobbyHostBar.svelte — FOUND
- src/lib/components/molecules/LobbyHostBar.svelte.spec.js — FOUND
- Commit e14664d — FOUND
- Commit 1ee5517 — FOUND

---
*Phase: 11-terminal-modals*
*Completed: 2026-08-21*
