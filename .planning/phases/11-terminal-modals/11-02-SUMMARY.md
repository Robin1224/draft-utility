---
phase: 11-terminal-modals
plan: 02
subsystem: ui
tags: [svelte5, cyber, modal, draft-settings, vitest-browser, tdd]

# Dependency graph
requires:
  - phase: 11-terminal-modals
    plan: 01
    provides: CyModal native-<dialog> wrapper (open $bindable, title, onAttemptClose veto, children/footer snippets) + Phase 11 modal/stepper/script CSS
  - phase: 08-cyber-foundation-app-shell
    provides: .cy-app token scope, cy-btn/cy-input vocabulary
provides:
  - DraftSettingsPanel as the full ~/draft/config.sh Settings modal (MOD-01) with D-04 draft-copy/commit semantics and D-05/D-06 dirty-dismiss footer swap
  - ScriptTurnRow Cyber 7-column row with D-11 ↑/↓ reorder buttons sharing the drag splice data path
  - Stable Plan 03 contract — <DraftSettingsPanel bind:open bind:script bind:timerSeconds />
  - 9-behavior browser spec incl. explicit 320px script-row fit check
affects: [11-03 host-console-modal]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Draft-copy editing (D-04): $effect on open → structuredClone($state.snapshot({script, timerSeconds})) into local draft (untrack'd so parent writes don't clobber mid-edit); bindables written ONLY in SAVE_CONFIG()"
    - "Dirty check compares semantic [team, action] tuples + timer — id churn is not dirty (ids stripped before startDraft)"
    - "$derived.by for closure-assigned nullable locals: TS narrows a let assigned only inside $effect callbacks to its null initializer in straight-line $derived expressions (never-narrowing); a function body re-enters with the declared union type"
    - "One reorder data path (D-11): drag drop, ↑ and ↓ all route through moveTurn(from, to) splice"

key-files:
  created:
    - src/lib/components/molecules/DraftSettingsPanelHost.test.svelte
  modified:
    - src/lib/components/atoms/ScriptTurnRow.svelte
    - src/lib/components/molecules/DraftSettingsPanel.svelte
    - src/lib/components/molecules/DraftSettingsPanel.svelte.spec.js
    - src/app.css

key-decisions:
  - "dirty derived implemented as $derived.by with early null-return — plain $derived expression hit TS closure-narrowing ('never') against the non-reactive base snapshot"
  - ".cy-script ul got the list-style/margin/padding reset (prototype relied on Tailwind preflight, removed this milestone) and select tracks became minmax(0, 1fr) + width:100%/min-width:0 so the 7-column row fits at 320px"
  - "Discard-confirm footer keeps a cy-grow spacer between the // discard unsaved config? text and [DISCARD]/[KEEP_EDITING] so buttons stay right-aligned"

patterns-established:
  - "Fixture with committed-state readout: <pre data-testid=committed>{JSON.stringify(...)}</pre> lets specs assert commit-on-save vs discard without reaching into component internals"

requirements-completed: [MOD-01]

# Metrics
duration: 11min
completed: 2026-08-21
---

# Phase 11 Plan 02: Draft Settings Modal Summary

**Draft Settings rebuilt as the `~/draft/config.sh` CyModal composition: 10–120 step-5 stepper, drag + ↑/↓ + add/remove script editor on a D-04 draft copy, D-05/D-06 dirty-dismiss footer swap, 320px-safe rows**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-08-21T12:35:10Z
- **Completed:** 2026-08-21T12:46:30Z
- **Tasks:** 2 (1 standard + 1 TDD)
- **Files modified:** 5

## Accomplishments

- `ScriptTurnRow.svelte` reworked to the Cyber 7-column row (cyber.jsx 758–776): `⠿` grip, zero-padded index, `TEAM_A`/`TEAM_B` + `ban()`/`pick()` selects with semantic color classes, D-11 `↑`/`↓` move buttons (disabled at ends), `rm` — drag wiring and local dragging/dragOver state behavior-identical, all Tailwind deleted
- `DraftSettingsPanel.svelte` became the full Settings modal composing CyModal: open-time `structuredClone($state.snapshot(...))` draft copy, canon `[team, action]` dirty check, one `attemptClose()` veto path shared by esc/scrim/✕ (via `onAttemptClose`) and CANCEL, footer swap to `// discard unsaved config?` + `[DISCARD]`/`[KEEP_EDITING]`, `SAVE_CONFIG()` as the sole writer of the bindables
- Spec rewritten to 9 machine-verified behaviors (old spinbutton suite was 5/5 RED against the new component); full suite 187 passed
- 320px fit made real: `.cy-script` list reset + `minmax(0, 1fr)` select tracks in app.css (found by the new viewport test)

## Task Commits

Each task was committed atomically:

1. **Task 1: ScriptTurnRow + DraftSettingsPanel rework** - `e67f96c` (feat)
2. **Task 2: spec + fixture rewrite** - `2b7fce2` (test)
3. **Task 2: 320px script-row fit fix (RED→GREEN)** - `56342e0` (fix)

## Files Created/Modified

- `src/lib/components/atoms/ScriptTurnRow.svelte` - Cyber row, D-11 move buttons, zero Tailwind
- `src/lib/components/molecules/DraftSettingsPanel.svelte` - full `~/draft/config.sh` modal, D-04/D-05/D-06 state machine
- `src/lib/components/molecules/DraftSettingsPanelHost.test.svelte` - fixture: launcher + bound state + committed readout
- `src/lib/components/molecules/DraftSettingsPanel.svelte.spec.js` - 9-behavior rewrite (stepper clamp, add/rm, ↑/↓, save/discard, dirty footer, clean close, 320px)
- `src/app.css` - `.cy-script` list reset + shrinkable select tracks (documented deviation)

## TDD Gate Compliance

- RED evidence: the pre-existing spec was guaranteed-red by plan design — confirmed 5/5 failing against the Task 1 component before the rewrite; additionally the new 320px test was RED (scrollWidth 319 > 233) against the shipped CSS
- test commit `2b7fce2` precedes fix commit `56342e0` (GREEN: 9/9)
- Note: plan structure deliberately placed implementation in Task 1 (`e67f96c`) before the spec rewrite task — the plan-level type is `execute`, not `tdd`

## Decisions Made

- `$derived.by` with early null-return for the dirty check (see Deviations 1)
- Kept a `cy-grow` spacer in the discard-confirm footer so `[DISCARD]`/`[KEEP_EDITING]` right-align like the normal footer
- The open-effect snapshot is wrapped in `untrack()` so only `open` is a dependency — a parent write to `script`/`timerSeconds` while the modal is open cannot clobber in-progress edits

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Planned `$derived` dirty expression fails svelte-check (closure narrowing)**
- **Found during:** Task 1
- **Issue:** `base` is assigned only inside the `$effect` callback; in a straight-line `$derived(...)` expression TS narrows it from its `null` initializer, so `base !== null` collapses to `never` (2 new svelte-check errors)
- **Fix:** `$derived.by(() => { if (base === null) return false; ... })` — a function body re-enters with the declared union type
- **Files modified:** src/lib/components/molecules/DraftSettingsPanel.svelte
- **Commit:** e67f96c

**2. [Rule 1 - Bug] Latent eslint `no-unused-vars` on `handleDragOver(e, _i)`**
- **Found during:** Task 1
- **Issue:** The ported-verbatim signature carried an unused `_i` param the old file already had (masked by repo-wide lint debt); eslint config has no `argsIgnorePattern`
- **Fix:** Dropped the unused param — `(e) => void` stays type-compatible with the `(e, i) => void` prop contract
- **Files modified:** src/lib/components/molecules/DraftSettingsPanel.svelte
- **Commit:** e67f96c

**3. [Rule 1 - Bug] Script row overflows at 320px — app.css fix outside the plan's files_modified**
- **Found during:** Task 2 (new 320px test RED: scrollWidth 319 vs clientWidth 232)
- **Issue:** Two causes: the `.cy-script` `<ul>` had no list reset (prototype relied on Tailwind preflight, removed this milestone → UA `padding-left: 40px`), and the `1fr` grid tracks bottom out at `auto` min-content so the selects could not shrink
- **Fix:** `.cy-script { list-style: none; margin: 0; padding: 0; }` (same reset `.cy-kick-list` already carries) + `minmax(0, 1fr)` select tracks + `select { width: 100%; min-width: 0; }` — must-have truth "script row fits at 320px" required it
- **Files modified:** src/app.css
- **Commit:** 56342e0

---

**Total deviations:** 3 auto-fixed (all Rule 1)
**Impact on plan:** All MOD-01 behaviors delivered exactly as specified; app.css touch was mandated by a must-have truth and is 8 lines with documented rationale.

## Issues Encountered

- **Svelte MCP `svelte-autofixer` unavailable** in this executor environment — used `npx prettier --write` + `npm run check` per the Phase 9/10 precedent. All touched `.svelte` files are prettier-clean and eslint-clean.
- **Repo-wide `npm run lint` / `npm run check` exit non-zero from pre-existing debt** (789 prettier-unformatted files incl. the deliberately compact-formatted `src/app.css`; 10 svelte-check errors in 4 files tracked in Phase 10 `deferred-items.md`). Scoped verification passed: all 5 touched/created files pass eslint, the 4 non-CSS files pass `prettier --check`, and the svelte-check count is byte-identical to the pre-plan baseline (10 errors / 4 files, none in Phase 11 files) — same gate treatment as Plans 8-01…11-01.
- `svelte-ignore` comments do not support `-- explanation` suffixes (each token parses as an ignore code, tripping `svelte/no-unused-svelte-ignore`); rationale moved to a separate comment line in the fixture.

## Known Stubs

None — the modal is fully wired to its bindables; Plan 03 mounts it from LobbyHostBar.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03 (Host Console + LobbyHostBar rework) can invoke `<DraftSettingsPanel bind:open={settingsOpen} bind:script bind:timerSeconds />` — the contract is proven by the green spec, including commit-on-save/discard-on-dismiss observed through the bound props
- The component has no phase awareness and makes no server calls; the `{#if isHost}` guard and launcher are Plan 03's responsibility (T-11-01 mitigation)

## Self-Check: PASSED

- src/lib/components/molecules/DraftSettingsPanelHost.test.svelte — FOUND
- src/lib/components/molecules/DraftSettingsPanel.svelte — FOUND
- src/lib/components/atoms/ScriptTurnRow.svelte — FOUND
- src/lib/components/molecules/DraftSettingsPanel.svelte.spec.js — FOUND
- Commit e67f96c — FOUND
- Commit 2b7fce2 — FOUND
- Commit 56342e0 — FOUND

---
*Phase: 11-terminal-modals*
*Completed: 2026-08-21*
