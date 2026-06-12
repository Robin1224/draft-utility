---
phase: 08-cyber-foundation-app-shell
plan: 00
subsystem: testing
tags: [vitest, vitest-browser-svelte, jetbrains-mono, woff2, tdd, wave-0, design-system]

# Dependency graph
requires: []
provides:
  - Four self-hosted JetBrains Mono woff2 assets (weights 400/500/600/700) under src/lib/assets/fonts/ (DS-01 prerequisite)
  - src/phase8-foundation.spec.js — node-project string-grep harness encoding DS-01/02/03/04/FX-05 (red until Plan 01)
  - src/lib/components/chrome/CyShell.svelte.spec.js — browser-project DOM harness encoding DS-05/D-07/D-09 (red until Plan 02)
affects: [08-01-app-css-tailwind-removal, 08-02-cyshell-component]

# Tech tracking
tech-stack:
  added: [JetBrains Mono woff2 (OFL-1.1, latin subset)]
  patterns:
    - "Wave 0 (Nyquist) TDD: specs written first and committed red before implementation exists"
    - "Vitest project routing by filename: *.spec.js → node 'server' project (node:fs string-grep); *.svelte.spec.js → 'client' browser project (Playwright Chromium render)"
    - "Browser specs mirror Welcome.svelte.spec.js: vitest/browser page queries + vitest-browser-svelte render; document.querySelector for class-based assertions"

key-files:
  created:
    - src/lib/assets/fonts/JetBrainsMono-Regular.woff2
    - src/lib/assets/fonts/JetBrainsMono-Medium.woff2
    - src/lib/assets/fonts/JetBrainsMono-SemiBold.woff2
    - src/lib/assets/fonts/JetBrainsMono-Bold.woff2
    - src/phase8-foundation.spec.js
    - src/lib/components/chrome/CyShell.svelte.spec.js
  modified: []

key-decisions:
  - "Vendored JetBrains Mono from Fontsource CDN (OFL-1.1, ~21KB/weight latin subset) since fonts cannot be npm-installed into the vendored path"
  - "Manrope.ttf intentionally retained (Plan 01 removes it with its @font-face); the spec asserting its removal is correctly red now"

patterns-established:
  - "Wave 0 measurement-first: every DS/FX requirement has an automated verify command that exists before the feature does"
  - "Node spec uses readFileSync string-contains on verbatim cyber.css token literals as the fidelity guard"

requirements-completed: [DS-01, DS-02, DS-03, DS-04, DS-05, FX-05]

# Metrics
duration: 2min
completed: 2026-06-12
---

# Phase 8 Plan 00: Wave 0 Scaffolding Summary

**Vendored four self-hosted JetBrains Mono woff2 weights and wrote the two failing-first Vitest specs (node string-grep + browser DOM) that encode every Phase 8 success criterion — DS-01/02/03/04/05 and FX-05.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-06-12T11:56:44Z
- **Completed:** 2026-06-12T11:58:59Z
- **Tasks:** 3
- **Files modified:** 6 created

## Accomplishments
- Vendored JetBrains Mono woff2 for weights 400/500/600/700 (real WOFF2 binaries, ~21KB each, latin subset, OFL-1.1) — the DS-01 asset prerequisite that cannot be `npm install`-ed.
- Wrote `src/phase8-foundation.spec.js` (node `server` project) asserting the 12 verbatim color tokens, both glow shadows incl. the `80` alpha suffix, both radial gradients, the scanline gradient, exactly four `@font-face` blocks, zero `border-radius`, the `cy-blink` keyframe + reduced-motion `animation: none`, and full Tailwind removal across package.json/vite.config.js/.prettierrc/app.css.
- Wrote `src/lib/components/chrome/CyShell.svelte.spec.js` (browser `client` project) asserting the `DRAFT_EM` brand, the 3 zero-padded tracker labels, `$ ROOM=` meta + room-code, the `[copy]` clipboard write, no-room `—` + disabled copy, `.cy-scanlines` and empty `.cy-shader` mount, and the `is-active` mapping for `phase=drafting` plus no-crash for `phase=cancelled`.
- Confirmed both specs run in their correct Vitest project and fail RED — the correct Wave 0 state (they pass after Plans 01/02). The original 130-test baseline still reports 130 passing.

## Task Commits

Each task was committed atomically:

1. **Task 1: Vendor JetBrains Mono woff2 (checkpoint pre-satisfied)** - `bc5ace3` (chore)
2. **Task 2: Write node-project foundation spec (red)** - `e9ff2b5` (test)
3. **Task 3: Write CyShell browser spec (red)** - `70b274d` (test)

**Plan metadata:** see final docs commit below.

## Files Created/Modified
- `src/lib/assets/fonts/JetBrainsMono-Regular.woff2` - Self-hosted 400-weight font asset (DS-01)
- `src/lib/assets/fonts/JetBrainsMono-Medium.woff2` - Self-hosted 500-weight font asset (DS-01)
- `src/lib/assets/fonts/JetBrainsMono-SemiBold.woff2` - Self-hosted 600-weight font asset (DS-01)
- `src/lib/assets/fonts/JetBrainsMono-Bold.woff2` - Self-hosted 700-weight font asset (DS-01)
- `src/phase8-foundation.spec.js` - Node string-grep harness for DS-01/02/03/04/FX-05 (13 tests; 11 red, 2 green for now-present fonts)
- `src/lib/components/chrome/CyShell.svelte.spec.js` - Browser DOM harness for DS-05/D-07/D-09 (7 tests; suite red via unresolved CyShell.svelte import)

## Decisions Made
- Vendored fonts from the Fontsource CDN (OFL-1.1 latin subset) — the only viable route since woff2 binaries cannot be npm-installed into the vendored path or generated from code.
- Left `Manrope.ttf` in place; the node spec's "Manrope.ttf is removed" assertion is correctly red and flips green when Plan 01 removes it alongside its `@font-face`.

## Deviations from Plan
None - plan executed exactly as written. (Task 1 was a `checkpoint:human-action`; the orchestrator pre-satisfied the vendor step, so the four woff2 files were verified as real WOFF2 binaries and committed as Task 1's atomic commit per the pre-satisfied checkpoint instruction — no pause required.)

## Issues Encountered
- The full-suite run (`npm run test`) surfaced a PRE-EXISTING failure in `src/lib/components/molecules/DraftSettingsPanel.svelte.spec.js` (listitem-count assertions, e.g. `expected 10 to be 9`). This file was last modified in Phase 03 (`16d43ef`) and is untouched by this plan, which added only 4 font binaries and 2 isolated new spec files. Per the executor SCOPE BOUNDARY rule it was NOT fixed; it is logged in `.planning/phases/08-cyber-foundation-app-shell/deferred-items.md` for separate triage. The Phase 8 success criterion ("original 130 passing PLUS the new specs failing") still holds — the run reports 130 passing, and the only NEW red files are the two Wave 0 specs this plan added.

## Known Stubs
None. This plan ships test specs and font assets only — no UI stubs or placeholder data. The two specs are intentionally RED (Wave 0 measurement-first convention); their failure is the expected, documented state until Plans 01 and 02 implement `src/app.css` and `CyShell.svelte`.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DS-01 font assets are in place; Plan 01 can wire the four `@font-face` blocks and remove Tailwind + Manrope, then watch `npx vitest run src/phase8-foundation.spec.js` flip green.
- Plan 02 can build `src/lib/components/chrome/CyShell.svelte` against the frozen prop contract `{ phase, code, children }` and watch `npx vitest run src/lib/components/chrome/CyShell.svelte.spec.js` flip green.
- Pre-existing DraftSettingsPanel spec failure is flagged in deferred-items.md; it does not block Plans 01/02 (unrelated component).

## Self-Check: PASSED

All 6 created files verified present on disk; all 3 task commits (`bc5ace3`, `e9ff2b5`, `70b274d`) verified in git history.

---
*Phase: 08-cyber-foundation-app-shell*
*Completed: 2026-06-12*
