---
phase: 09-signature-effects-infrastructure
plan: 01
subsystem: ui
tags: [svelte5, canvas, shader, requestAnimationFrame, IntersectionObserver, ResizeObserver, prefers-reduced-motion, effects]

# Dependency graph
requires:
  - phase: 08-cyber-foundation-app-shell
    provides: ".cy-app token scope, JetBrains Mono, persistent CyShell chrome with empty .cy-shader mount slot, .cy-shader/.cy-shader-hot positioning CSS, reduced-motion pattern in src/app.css"
provides:
  - "CyShader.svelte — ASCII plasma shader canvas (intensity/hot props, rAF loop, IntersectionObserver off-screen pause, ResizeObserver re-measure, reduced-motion single static frame, full $effect teardown)"
  - "Ambient CyShader mounted app-wide in CyShell at the ambient default (D-02) — shader renders behind content on every route"
  - "Browser component test pattern for canvas/rAF effects (spying cancelAnimationFrame + observer disconnect, matchMedia stub for reduced-motion)"
affects: [10-home, 12-access-control-secondary-screens, signature-effects, CyLogo, typed-log]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Canvas effect as Svelte 5 $effect: React useEffect(fn,[deps]) -> $effect reading deps + returning teardown (cancelAnimationFrame + observer.disconnect)"
    - "SSR guard (typeof window !== 'undefined') + matchMedia guard before browser-only API access"
    - "Procedural per-level color palette precomputed once outside the rAF loop"
    - "components/effects/ grouping for reusable presentational effect components"

key-files:
  created:
    - src/lib/components/effects/CyShader.svelte
    - src/lib/components/effects/CyShader.svelte.spec.js
  modified:
    - src/lib/components/chrome/CyShell.svelte
    - src/lib/components/chrome/CyShell.svelte.spec.js

key-decisions:
  - "CyShader mounted into CyShell at ambient default (hot=false, intensity=1) — no hot prop from the shell; Home wires hot in Phase 10 (D-02)"
  - "Under prefers-reduced-motion the shader draws exactly one static frame (at t=0) and never schedules requestAnimationFrame (D-04 / FX-02 hard rule)"
  - "All shader constants/formulas ported verbatim from cyber.jsx (CY_RAMP, cell 14/16, fps 30/60, sp 1/1.25, color-ramp RGB+clamps, 4-sin plasma field, normalize (v+3.7)/7.4, shaping pow(v,1.5)/v*v*v, lvl<=0 skip, DPR clamp 2, IO threshold 0.01)"

patterns-established:
  - "Reusable presentational effect components live under src/lib/components/effects/"
  - "Canvas/rAF teardown lives in the $effect return; closures capture non-null el/ctx aliased after the null guard for type-safety"

requirements-completed: [FX-01, FX-02]

# Metrics
duration: 9min
completed: 2026-06-12
---

# Phase 9 Plan 01: Signature Effects Infrastructure — ASCII Plasma Shader Summary

**Verbatim Svelte 5 port of the cyber.jsx ASCII plasma shader as a `<canvas>` component with IntersectionObserver off-screen pause, frame-capped rAF loop, reduced-motion single static frame (D-04), and full `$effect` teardown — mounted app-wide in CyShell at the ambient default (D-02).**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-06-12T14:25:53Z
- **Completed:** 2026-06-12T14:35:05Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- `CyShader.svelte`: domain-warped plasma field rendered as monospace `CY_RAMP` glyphs on a procedural violet→lime brightness ramp, with `intensity`/`hot` props matching the React signature exactly.
- Off-screen pause via `IntersectionObserver` (threshold 0.01), `ResizeObserver` re-measure, 30/60 fps frame cap, DPR clamp to 2 — all ported verbatim.
- D-04 reduced-motion: draws one static frame at `t=0` and never schedules `requestAnimationFrame`; observers still attach but no loop runs.
- Full `$effect` teardown: `cancelAnimationFrame` + `ro.disconnect()` + `io.disconnect()`, re-created on `intensity`/`hot` change.
- Mounted `<CyShader />` into `CyShell` at the ambient default (no `hot`/`intensity` props), making the shader app-wide immediately (D-02).
- Browser component spec proving canvas mount + classes + `aria-hidden`, teardown on unmount, and the reduced-motion no-loop path.

## Task Commits

1. **Task 1 (RED): CyShader browser spec** — `a3dd06b` (test)
2. **Task 1 (GREEN): CyShader plasma shader implementation** — `3974cea` (feat)
3. **Task 2: Mount CyShader into CyShell + update CyShell spec** — `53691da` (feat)

_Task 1 is TDD: failing spec (RED) then implementation (GREEN). The Task 1 spec file IS the D-03 verification spec referenced by Task 2._

## Files Created/Modified
- `src/lib/components/effects/CyShader.svelte` — ASCII plasma shader canvas; verbatim constants/formulas; rAF loop, IO/RO, reduced-motion static frame, full teardown. No `<style>` block (positioning reused from app.css). Does not touch the realtime/snapshot layer.
- `src/lib/components/effects/CyShader.svelte.spec.js` — Browser component tests (4): mount + aria-hidden + ambient no-hot, hot class, rAF/observer teardown on unmount, reduced-motion no-loop.
- `src/lib/components/chrome/CyShell.svelte` — Imports CyShader; replaced the empty `<div class="cy-shader">` with `<CyShader />` (ambient default).
- `src/lib/components/chrome/CyShell.svelte.spec.js` — Updated the stale "empty mount, no canvas" assertion to assert `canvas.cy-shader` is mounted without the hot class (Phase 9 D-02).

## Decisions Made
- Followed plan as specified. Ambient mount (no hot prop) per D-02; one static reduced-motion frame at `t=0` per D-04; all numeric constants/formulas transcribed verbatim per the verbatim-port mandate.

## Deviations from Plan

None — plan executed exactly as written.

The only minor implementation refinement (not a behavior deviation): inside the `$effect`, `el`/`ctx` are aliased to non-null `const` locals immediately after the null guards so closures capture them with correct types (resolves `svelte-check` "possibly null" inference across deferred closures). No runtime behavior changed.

## Issues Encountered
- The Svelte MCP `svelte-autofixer`/`list-sections` tools were not available in this session. Fell back to the project's own quality tooling: `prettier --check` (passes), `svelte-check --threshold error` (0 errors in the new `effects/` files), and the full vitest browser suite. Pre-existing `svelte-check` errors in `CyShell.svelte` and `phase8-foundation.spec.js` are Phase 8 debt (documented in PROJECT.md) and out of scope.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- FX-01/FX-02 shipped and app-wide. Phase 10 Home can pass `hot` to the shader (the prop is wired and tested) and compose it with the typed boot log + `CyLogo` wordmark (Plans 09-02/09-03).
- Regression check green: full client project 17 passed / 8 todo; full server project 137 passed / 1 skipped / 26 todo — the realtime/snapshot layer and 130+ baseline remain untouched.

## Self-Check: PASSED

All claimed files exist on disk and all task commits (`a3dd06b`, `3974cea`, `53691da`) are present in git history.

---
*Phase: 09-signature-effects-infrastructure*
*Completed: 2026-06-12*
