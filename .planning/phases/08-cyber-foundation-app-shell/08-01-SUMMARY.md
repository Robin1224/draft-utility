---
phase: 08-cyber-foundation-app-shell
plan: 01
subsystem: ui
tags: [css, design-system, cyber, tokens, jetbrains-mono, tailwind-removal, prettier]

# Dependency graph
requires:
  - phase: 08-cyber-foundation-app-shell (Plan 00, Wave 0)
    provides: Four vendored JetBrains Mono woff2 files + the RED node foundation spec (src/phase8-foundation.spec.js)
provides:
  - src/app.css — the global Cyber stylesheet: 12 --cy-* color tokens + 2 glow shadows + 2 radial gradients + scanline under .cy-app
  - Four JetBrains Mono @font-face faces (400/500/600/700) wired to the Wave 0 woff2 files
  - Shell/chrome .cy-* classes (.cy-shader, .cy-scanlines, .cy-body, .cy-header, .cy-brand*, .cy-phase*, .cy-meta*)
  - Shared .cy-btn* button family and .cy-input primitives
  - cy-blink keyframe + prefers-reduced-motion suppression of .cy-brand-cur
  - Tailwind fully excised at all four wiring points (package.json, vite.config.js, .prettierrc, src/routes/layout.css)
affects: [08-02 (CyShell.svelte + layout import swap consumes app.css), Phase 09 (shader mounts into .cy-shader), Phase 10 (screen-specific .cy-* classes), all Phase 8+ screens]

# Tech tracking
tech-stack:
  added: [self-hosted JetBrains Mono woff2 via $lib alias @font-face]
  removed: [tailwindcss, "@tailwindcss/vite", prettier-plugin-tailwindcss, Manrope.ttf]
  patterns: [Plain-CSS design system with --cy-* custom properties scoped under .cy-app; verbatim port from design_handoff cyber.css; zero border-radius; prefers-reduced-motion gating of decorative animation]

key-files:
  created:
    - src/app.css
  modified:
    - package.json
    - package-lock.json
    - vite.config.js
    - .prettierrc
    - src/routes/layout.css
  deleted:
    - src/lib/assets/fonts/Manrope.ttf

key-decisions:
  - "Plain CSS replaces Tailwind entirely (DS-03); tokens reproduced byte-for-byte from cyber.css (D-03)"
  - "Single /* prettier-ignore */ on --cy-mono preserves the verbatim double-quoted font stack the Wave 0 spec asserts, despite the project's singleQuote prettier rule"
  - "layout.css emptied (not deleted) — +layout.svelte still imports it until Plan 02 swaps to app.css"

patterns-established:
  - "Cyber design tokens: 12 colors + 2 glows + scanline + radial gradients as CSS custom properties under .cy-app"
  - "Decorative animation (cy-blink) always paired with a prefers-reduced-motion: reduce suppression block"
  - "Zero border-radius across the Cyber system (DS-04) — grep-asserted"

requirements-completed: [DS-01, DS-02, DS-03, DS-04, FX-05]

# Metrics
duration: 7min
completed: 2026-06-12
---

# Phase 8 Plan 01: Cyber Foundation + Tailwind Excision Summary

**Plain-CSS Cyber design system (src/app.css) with 12 verbatim --cy-* tokens, four self-hosted JetBrains Mono faces, shell/button/input vocabulary, and reduced-motion-safe blink — turning the Wave 0 foundation spec GREEN (13/13) while removing Tailwind from all four wiring points.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-06-12T12:04:55Z
- **Completed:** 2026-06-12T12:12:16Z
- **Tasks:** 2
- **Files modified:** 6 (1 created, 4 edited, 1 deleted) + lockfile

## Accomplishments
- Created `src/app.css` (260 lines) with the verbatim cyber.css token root, four JetBrains Mono `@font-face` blocks, shell/chrome `.cy-*` classes, `.cy-btn*`/`.cy-input` primitives, `cy-blink` keyframe, and a `prefers-reduced-motion` suppression block — zero border-radius throughout.
- Removed Tailwind at all FOUR wiring points: `package.json` devDeps (+ lockfile manifest), `vite.config.js` import + plugin, `.prettierrc` plugin + `tailwindStylesheet`, and `src/routes/layout.css` (`@import 'tailwindcss'`/`@theme`/Manrope `@font-face`).
- Deleted `src/lib/assets/fonts/Manrope.ttf` (DS-01); the node foundation spec `src/phase8-foundation.spec.js` is now GREEN (13/13). Full server suite stays green (137 passed, 0 failed).
- Both Vite environments compile cleanly with Tailwind gone (`✓ 263 + 196 modules transformed`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove Tailwind at all four wiring points** - `65b0ac7` (chore)
2. **Task 2: Create src/app.css + remove Manrope** - `60acc18` (feat)

**Plan metadata:** (docs commit — see final commit)

## Files Created/Modified
- `src/app.css` — created; global Cyber stylesheet (tokens, 4 @font-face, shell/chrome + button/input classes, cy-blink, reduced-motion)
- `package.json` / `package-lock.json` — removed tailwindcss, @tailwindcss/vite, prettier-plugin-tailwindcss
- `vite.config.js` — removed tailwindcss import + plugin (kept sveltekit/uws/realtime/devtoolsJson)
- `.prettierrc` — removed prettier-plugin-tailwindcss plugin + tailwindStylesheet key
- `src/routes/layout.css` — emptied to a placeholder comment (Tailwind directives + Manrope gone)
- `src/lib/assets/fonts/Manrope.ttf` — deleted (DS-01)

## Decisions Made
- **prettier-ignore on --cy-mono:** The Wave 0 spec asserts the font stack with **double quotes** (`"JetBrains Mono", ...`), which is also the verbatim cyber.css value (D-03). The project's prettier config (`singleQuote: true`) rewrites it to single quotes, breaking the spec. A single `/* prettier-ignore */` above the declaration keeps app.css both spec-green AND prettier-clean.
- **layout.css emptied, not deleted:** `+layout.svelte` still imports `./layout.css` until Plan 02 swaps the import to `../app.css`. Emptying neutralizes the Tailwind directives so the build is clean now without breaking the import.
- **Two additive `.cy-meta-copy:disabled` rules:** Carried from the plan (supports D-09 disabled no-room state); introduce no border-radius.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] prettier-ignore added to --cy-mono so app.css is both spec-green and prettier-clean**
- **Found during:** Task 2 (app.css verification)
- **Issue:** Prettier (`singleQuote: true`) rewrote the verbatim double-quoted `--cy-mono` font stack to single quotes, which failed the Wave 0 spec's exact `toContain('--cy-mono: "JetBrains Mono", ...')` assertion. Conflict between "prettier-clean" and "verbatim/spec-green".
- **Fix:** Added `/* prettier-ignore */` directly above the `--cy-mono` declaration and restored the double-quoted value. The rest of app.css was run through `prettier --write` so the whole file is prettier-conformant.
- **Files modified:** src/app.css
- **Verification:** `prettier --check src/app.css` clean; `vitest run --project server src/phase8-foundation.spec.js` 13/13 green.
- **Committed in:** `60acc18` (Task 2 commit)

**2. [Rule 2 - Missing Critical] Pruned the three top-level Tailwind entries from package-lock.json**
- **Found during:** Task 1 (Tailwind removal)
- **Issue:** `npm install` (which would normally reconcile the lockfile) cannot run in this environment (see Issues Encountered). The lockfile's root dependency manifest still listed the three tailwind packages, diverging from package.json.
- **Fix:** Hand-removed the three top-level `@tailwindcss/vite`/`prettier-plugin-tailwindcss`/`tailwindcss` entries from the lockfile's `packages.""` manifest so it matches package.json; validated the lockfile is still valid JSON. The now-unreachable transitive tailwind entries will be garbage-collected by a future successful `npm install`.
- **Files modified:** package-lock.json
- **Verification:** `node -e JSON.parse(...)` valid; spec's package.json tailwind-absence assertions green.
- **Committed in:** `65b0ac7` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing-critical). No scope creep.
**Impact on plan:** Both auto-fixes were necessary to satisfy the plan's own contract (spec-green app.css + lockfile consistent with package.json). No new behavior beyond the plan's intent.

## Issues Encountered

**Pre-existing environment / repo conditions block the two HARD CONSTRAINTS (`npm run build` and `npm run lint` exit 0) — neither is caused by this plan.** Both proven pre-existing by re-running against the pristine tree; both documented in `deferred-items.md`:

1. **`uWebSockets.js` native addon not installed.** `npm install` exits 1 (`Invalid Version:` during arborist dedupe of the `svelte-adapter-uws` github dependency), and `npm run build` — though the **Vite/Rollup compile fully succeeds** (`✓ 263 + 196 modules transformed`, `✓ built in 1.31s`) — fails at the final `adapter-uws` adapt step (`Could not load uWebSockets.js`). Reproduces identically on committed HEAD. The portion of the build this plan affects (Tailwind-free Vite compilation) is clean.
2. **Project-wide lint debt.** `npm run lint` exits 1 with 590 prettier warnings + 142 eslint problems on the pristine tree (files this plan never touched). Plan 08-01's own five files are all prettier-clean and add **zero** new lint failures.

## Deferred Issues
None within plan scope. Out-of-scope items logged to `.planning/phases/08-cyber-foundation-app-shell/deferred-items.md` (uWebSockets.js env gap, project-wide lint debt, the Phase-03 DraftSettingsPanel spec failure).

## Known Stubs
None. `src/app.css` is a complete foundation stylesheet; no placeholder/empty data flows. (Screen-specific `.cy-*` classes are intentionally deferred to Phase 10 per the plan; the layout import swap is Plan 02 — both are planned hand-offs, not stubs.)

## User Setup Required
None - no external service configuration required for this plan.

## Next Phase Readiness
- `src/app.css` is ready for Plan 02 to import (swap `+layout.svelte` from `./layout.css` to `../app.css`) and for CyShell.svelte to consume the `.cy-*` chrome classes.
- The `.cy-shader` mount-point rule is in place for the Phase 9 shader canvas.
- **Concern for CI:** Before `npm run build`/`npm run lint` can gate CI, the `uWebSockets.js` native addon must be installed and the repo-wide lint debt cleared (both tracked in deferred-items.md). These are environment/infra tasks, not Phase 8 work.

## Self-Check: PASSED

- FOUND: src/app.css
- FOUND: .planning/phases/08-cyber-foundation-app-shell/08-01-SUMMARY.md
- CONFIRMED: src/lib/assets/fonts/Manrope.ttf removed
- FOUND commit: 65b0ac7 (Task 1 — Tailwind removal)
- FOUND commit: 60acc18 (Task 2 — app.css + Manrope removal)

---
*Phase: 08-cyber-foundation-app-shell*
*Completed: 2026-06-12*
