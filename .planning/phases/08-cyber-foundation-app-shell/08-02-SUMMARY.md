---
phase: 08-cyber-foundation-app-shell
plan: 02
subsystem: ui
tags: [svelte5, app-shell, chrome, clipboard, runes, cyber-css]

# Dependency graph
requires:
  - phase: 08-cyber-foundation-app-shell (Plan 01)
    provides: src/app.css with all .cy-* chrome classes, tokens, cy-blink keyframe, reduced-motion suppression; Tailwind removed
  - phase: 08-cyber-foundation-app-shell (Plan 00)
    provides: vendored JetBrains Mono woff2 + RED Wave 0 specs (CyShell.svelte.spec.js)
provides:
  - Persistent CyShell terminal chrome wrapping every route (.cy-app > shader mount + scanlines + header + .cy-body)
  - Root +layout.svelte importing app.css and rendering all routes inside <CyShell> with read-only phase/code
  - GREEN CyShell.svelte.spec.js (DS-05 / D-07 / D-09 browser contract satisfied)
affects: [phase-09-shader, phase-10-screen-reskins, phase-12-access-control]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Persistent app shell as a Svelte 5 component rendered from +layout.svelte wrapping {@render children()}"
    - "Read-only state derivation in layout: page.params.id ($app/state) + guarded fromStore(lobby(code)).current.phase — snapshot shape untouched"
    - "Chrome component consumes global .cy-* classes from app.css; declares no component-scoped styles"

key-files:
  created:
    - src/lib/components/chrome/CyShell.svelte
  modified:
    - src/routes/+layout.svelte
  deleted:
    - src/routes/layout.css

key-decisions:
  - "Tracker labels rendered from an explicit LABEL map (01_LOBBY/02_DRAFTING/03_REVIEW) rather than the prototype's lowercase ${p}, matching the Wave 0 spec's exact getByText queries"
  - "phase/code derived read-only in the layout and passed as props; CyShell stays store-agnostic so the browser spec can render it standalone with literal props"
  - "layout.css deleted (not just emptied) — the foundation spec's read() helper tolerates a missing file, so all its negative assertions stay green"

patterns-established:
  - "Single persistent chrome: +layout.svelte owns state derivation, CyShell owns presentation"
  - "Decorative ASCII glyphs (▮) marked aria-hidden; animation/reduced-motion live in global CSS, not the component"

requirements-completed: [DS-05]

# Metrics
duration: 9min
completed: 2026-06-12
---

# Phase 8 Plan 02: Persistent CyShell App Shell Summary

**Svelte 5 CyShell terminal chrome — [ DRAFT_EM ] brand + blinking cursor, 3-phase tracker, room-code [copy] meta — wired into the root layout so every route renders inside it, with phase/code derived read-only from page params and the frozen lobby snapshot.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-06-12T14:46:00Z
- **Completed:** 2026-06-12T15:20:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 1 modified, 1 deleted)

## Accomplishments
- Created `CyShell.svelte` porting the `CYChrome` DOM to Svelte 5 with the D-06/D-07/D-09 overrides: violet-bracketed lime `DRAFT_EM` wordmark + blinking `▮`, the 3-phase tracker with `is-active`/`is-done` mapping via `indexOf` (cancelled/unknown → no active step, no crash), and the `$ ROOM=` meta with `—` fallback plus a `[copy]` button that writes to the clipboard and is disabled when there is no code.
- Left an empty `.cy-shader` mount point (no canvas) for the Phase 9 plasma shader, plus the always-on `.cy-scanlines` overlay.
- Rewired `+layout.svelte` to import `../app.css` (Plan 01 foundation), derive `code` from `page.params.id` and `phase` read-only from the existing lobby snapshot's `.phase`, and wrap `{@render children()}` in `<CyShell>`.
- Deleted the orphaned `src/routes/layout.css`; all 7 CyShell spec tests went GREEN and the full suite (150 passed / 1 skipped / 34 todo, 0 failed) stayed green with the snapshot shape untouched.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CyShell.svelte (persistent chrome)** - `05cca41` (feat)
2. **Task 2: Wire CyShell into the root layout with read-only phase/code** - `0474b5b` (feat)

**Plan metadata:** (final docs commit — see git log)

## Files Created/Modified
- `src/lib/components/chrome/CyShell.svelte` - Persistent terminal chrome: `.cy-app` > shader mount + scanlines + header(brand/phases/meta) + `.cy-body{children}`. Props `{ phase='lobby', code=null, children }`; clipboard copy handler; no component styles.
- `src/routes/+layout.svelte` - Imports `../app.css`, derives read-only `code`/`phase`, wraps children in `<CyShell>`.
- `src/routes/layout.css` - Deleted (orphaned after the import switch to `app.css`).

## Decisions Made
- Rendered tracker labels from an explicit `LABEL` map so the visible text is `01_LOBBY`/`02_DRAFTING`/`03_REVIEW` (uppercase), matching the Wave 0 spec's exact `getByText` queries — the prototype's `${p}` would have produced lowercase.
- Kept CyShell store-agnostic (state arrives via `$props()`); the layout owns derivation. This lets the browser spec render the component standalone with literal `{ phase, code }`.
- Deleted `layout.css` outright rather than emptying it; the foundation spec's `read()` helper returns `''` for a missing file and all its `layout.css` assertions are negative, so the spec stays green.

## Deviations from Plan

### Auto-fixed Issues

None affecting code. One mandated-process deviation noted below.

**1. [Rule 3 - Blocking/Environment] Svelte MCP tools unavailable in this executor**
- **Found during:** Task 1 (before writing CyShell.svelte)
- **Issue:** CLAUDE.md and the plan mandate the Svelte MCP server (`list-sections` → `get-documentation` → iterate `svelte-autofixer` until clean) for every `.svelte` file. Those MCP tools are configured for the project but are NOT exposed as callable tools in this execution environment (`list-sections` returned "No such tool available").
- **Fix:** Could not invoke the MCP autofixer. Applied Svelte 5 best practices directly (`$props` with defaults, `$derived`, keyed `{#each}` with `class:` directives, `{@render children?.()}` optional-chaining, `onclick`) and relied on the Svelte compiler as the equivalent gate: the component compiles cleanly through both `vitest` (7/7 spec tests GREEN) and `vite build` (Svelte/Rollup compile `✓ built`), and both Svelte files are `prettier --check` clean. No compiler warnings or suggestions surfaced.
- **Files modified:** none beyond the planned files
- **Verification:** `vitest run --project client src/lib/components/chrome/CyShell.svelte.spec.js` exits 0; full `npm run test` green; `vite build` Svelte compile succeeds; prettier clean on both files.
- **Committed in:** n/a (process note)

---

**Total deviations:** 1 (process/environment — MCP autofixer unavailable, compiler used as equivalent gate)
**Impact on plan:** No scope creep. All acceptance criteria met except the literal MCP-autofixer invocation, which is environmentally impossible here; equivalent compile/lint gates were satisfied.

## Issues Encountered
- **`npm run build` exits non-zero** at the `svelte-adapter-uws` *finalise* step (`Could not load uWebSockets.js` — native addon not installed in this environment). This is the documented pre-existing / out-of-scope condition: the Vite/Rollup/Svelte compile itself succeeds (`✓ built in 1.32s`, all chunks including the new layout emitted). Not a regression from this plan.
- **`npm run lint`** carries ~590 prettier + 142 eslint pre-existing repo-wide issues (out of scope). The two files touched by this plan are individually `prettier --check` clean and add no new failures.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Persistent chrome is live; Phase 9 can mount the plasma shader into the empty `.cy-shader` div without restructuring the shell.
- Per-page `<Header>`/`<Phases>` remain (D-05 accepted interim doubling) and render unstyled below the new header until Phase 10 reskins remove them.
- Snapshot shape and `src/live/` / `src/lib/server/` are untouched; the 130+ behavior tests remain green.

## Self-Check: PASSED

- FOUND: src/lib/components/chrome/CyShell.svelte
- FOUND: src/routes/+layout.svelte (modified)
- CONFIRMED DELETED: src/routes/layout.css
- FOUND: .planning/phases/08-cyber-foundation-app-shell/08-02-SUMMARY.md
- FOUND commit: 05cca41 (Task 1)
- FOUND commit: 0474b5b (Task 2)

---
*Phase: 08-cyber-foundation-app-shell*
*Completed: 2026-06-12*
