---
phase: 09-signature-effects-infrastructure
plan: 03
subsystem: signature-effects
tags: [svelte5, css, ascii-art, wordmark, motion-safety, browser-test]
requires:
  - "src/app.css .cy-app token root + structural section (Phase 8 / 09-02)"
provides:
  - "src/lib/components/effects/CyLogo.svelte — <CyLogo rendered={...} /> shaded-ASCII DRAFT wordmark"
  - "src/app.css .cy-logo* cascade + cy-logo-in/cy-glitch keyframes + reduced-motion suppression"
affects:
  - "Phase 10 Home hero (will compose <CyLogo rendered={bootLog.done} />)"
tech-stack:
  added: []
  patterns:
    - "role=img + aria-label on a div to expose decorative-as-text ASCII art as a single labelled image (D-01)"
    - "rendered prop → class:is-rendered driving a pure-CSS staggered reveal (no JS animation)"
    - "Reveal animates transform + filter:brightness only (never opacity) so the base art can never get stuck hidden"
    - "Browser spec imports app.css (live cascade) + app.css?raw (reduced-motion CSS contract) to assert behavior without page.emulateMedia"
key-files:
  created:
    - "src/lib/components/effects/CyLogo.svelte"
    - "src/lib/components/effects/CyLogo.svelte.spec.js"
  modified:
    - "src/app.css"
decisions:
  - "[Phase 09]: CyLogo reveal is pure CSS (is-rendered class + cy-logo-in stagger) animating transform+brightness only — the base .cy-logo carries no opacity:0 so the wordmark is always visible (fidelity guardrail)."
  - "[Phase 09]: Reduced-motion suppression asserted via the app.css?raw CSS contract because this vitest-browser provider does not expose page.emulateMedia; the DOM (9 spans, opacity 1) is still asserted behaviorally."
metrics:
  duration: 3min
  completed: 2026-06-12
  tasks: 2
  files: 3
---

# Phase 09 Plan 03: Shaded-ASCII DRAFT Wordmark Summary

Shaded-ASCII `DRAFT` wordmark as a Svelte 5 component (`CyLogo.svelte`) rendering the 9 verbatim `CY_LOGO_LINES` block-art rows as `cy-logo-line` spans inside a `role=img`/`aria-label="DRAFT"` wrap, with a pure-CSS line-by-line slide+glow reveal driven by a `rendered` prop — plus the verbatim `.cy-logo*` cascade, `cy-logo-in`/`cy-glitch` keyframes, and reduced-motion suppression appended to `src/app.css`.

## What Was Built

- **Task 1 — app.css `.cy-logo*` CSS (commit `439dbac`):** Appended the `.cy-logo-wrap`/`.cy-logo`/`.cy-logo-line` rules, the 9 `nth-child` reveal delays (0.02s..0.5s), `@keyframes cy-logo-in` (transform + `filter: brightness` only, no opacity), the `.cy-logo-glitch` ghost overlay, and `@keyframes cy-glitch` — all verbatim from `cyber.css` 131–178. Extended the existing reduced-motion `@media` block with the logo-line and glitch `animation: none` suppression while preserving the existing `.cy-brand-cur { animation: none; }` rule. Inserted in source order (right after `.cy-boot`, before `.cy-scanlines`).
- **Task 2 — CyLogo.svelte + browser tests (commit `2ef2299`):** Component ports the 9 `CY_LOGO_LINES` strings byte-for-byte (verified against `cyber.jsx` 11–19), mirrors the `CYHome` reveal markup (242–251): `<div class="cy-logo-wrap" class:is-rendered={rendered} role="img" aria-label="DRAFT">`, a `<pre class="cy-logo">` of 9 `cy-logo-line` spans (each `line + '\n'`), and an `aria-hidden` `.cy-logo-glitch` ghost of the joined art. No `<style>` block, no opacity animation, no realtime/snapshot import. The browser spec (4 tests) asserts the 9 spans + `role=img`/name DRAFT, base `.cy-logo` opacity not 0, the `rendered` prop toggling `is-rendered`, opacity locked at `'1'` under reveal, and the reduced-motion CSS contract leaving the static wordmark.

## Key Decisions

- **Pure-CSS reveal, never opacity (fidelity guardrail):** The reveal is driven entirely by `is-rendered` + `cy-logo-in` animating `transform` and `filter: brightness()`. The base `.cy-logo` carries no `opacity:0`, so the logo is always visible and can never get stuck hidden.
- **D-01 honored:** The wordmark stays `DRAFT` (no new ASCII-art authoring); `role="img"` + `aria-label="DRAFT"` exposes the block-art as a single labelled image.
- **Reduced-motion verified via CSS contract:** This `vitest-browser` Playwright provider does not expose `page.emulateMedia` (confirmed at runtime — `page.emulateMedia is not a function`). Per the plan's documented fallback, the reduced-motion test imports `app.css?raw` and asserts the `@media (prefers-reduced-motion: reduce)` block sets `.cy-logo-wrap.is-rendered .cy-logo-line { animation: none }` and `.cy-logo-glitch { animation: none !important }`, while still asserting the DOM (9 spans, opacity 1) for the static-wordmark behavior.

## Deviations from Plan

None — plan executed as written. The one anticipated provider limitation (`page.emulateMedia` unavailable) was handled by the plan's own documented fallback (assert the reduced-motion CSS contract), not a deviation.

## Tooling Note (svelte-autofixer)

The Svelte MCP `svelte-autofixer` tool was unavailable in this session (`No such tool available: svelte:svelte-autofixer`), matching the two prior plans' experience. Substituted the project's own gates: `prettier --check` (both new files pass) and `npx svelte-check --threshold error` (zero errors in the new effects files — the 9 reported errors are all pre-existing in `phase8-foundation.spec.js` and `CyShell*`, out of scope). No playground link generated.

## Verification

- `npx vitest run --project client src/lib/components/effects/CyLogo.svelte.spec.js` → 4 passed.
- `npx vitest run --project server src/phase8-foundation.spec.js` → 13 passed (app.css edit safe; Phase 8 grep assertions still green).
- `grep -c 'border-radius' src/app.css` → 0 (DS-04).
- `@keyframes cy-logo-in` body contains no `opacity`; all 9 `nth-child` delays present; `.cy-logo` text-shadow + `@keyframes cy-glitch` (6.5s steps(1) infinite, delay 1.2s) present; reduced-motion suppression present; `.cy-brand-cur { animation: none; }` preserved.
- CyLogo: no `<style>` block, no opacity animation (only in a doc comment), no realtime/snapshot import.

## For the Next Phase

Phase 10 Home composes the hero as `<CyLogo rendered={bootLog.done} />` — the reveal fires when the typed boot log finishes. The CSS cascade and keyframes are already live in `app.css` under `.cy-app`; no further CSS work needed for the wordmark.

This is the LAST plan of Phase 09 — all three plans (CyShader, typed log, CyLogo) are complete and the signature-effects infrastructure (FX-01/02/03/04, FX-05 motion-safety) is established for the Phase 10+ screen reskins to consume.

## Self-Check: PASSED

- FOUND: src/lib/components/effects/CyLogo.svelte
- FOUND: src/lib/components/effects/CyLogo.svelte.spec.js
- FOUND: src/app.css (.cy-logo* cascade appended)
- FOUND: .planning/phases/09-signature-effects-infrastructure/09-03-SUMMARY.md
- FOUND commit: 439dbac (Task 1 — app.css)
- FOUND commit: 2ef2299 (Task 2 — CyLogo + spec)
