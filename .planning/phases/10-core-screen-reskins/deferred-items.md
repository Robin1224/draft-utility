# Deferred Items — Phase 10 (core-screen-reskins)

Out-of-scope discoveries logged during plan execution. NOT fixed by the current plan.

## Pre-existing `npm run check` (svelte-check) errors

Discovered during 10-02 Task 2 (`npm run check`). All 10 errors live in files NOT
touched by Phase 10 plan 02 — they predate this work and are out of scope per the
executor scope boundary.

- `src/phase10-screens.spec.js` 4:15 — Parameter 'p' implicitly has an 'any' type.
- `src/phase8-foundation.spec.js` 4:15 — Parameter 'p' implicitly has an 'any' type.
- `src/lib/components/chrome/CyShell.svelte` 36:7 — string index into phase-label map (implicit any).
- `src/lib/components/chrome/CyShell.svelte.spec.js` 8/19/24/33/42/50/57 — `mount`/`render` calls
  missing required `children` prop in test ComponentOptions (7 occurrences).

These are JSDoc/type-checking gaps in earlier-phase code and test harnesses; they do
not affect Create.svelte, Join.svelte, +page.svelte, or cyTypedLog (the 10-02 surface).
