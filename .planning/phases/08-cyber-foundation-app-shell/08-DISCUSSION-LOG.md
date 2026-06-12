# Phase 8: Cyber Foundation & App Shell - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-12
**Phase:** 08-cyber-foundation-app-shell
**Areas discussed:** CSS architecture, Tailwind cutover timing, Brand & phase tracker, Font delivery

---

## CSS architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Global cyber.css + .cy-* classes | Port cyber.css near-verbatim into one global stylesheet; components use .cy-* class names directly. 1:1 with prototype. | |
| Global tokens + Svelte scoped styles | Tokens global; each component re-expresses cyber styles in its own scoped <style>. More idiomatic, more work, diverges from prototype. | |
| Hybrid | Global tokens + global structural/shared classes (chrome, buttons, cards); component-scoped <style> only for one-offs. | ✓ |

**User's choice:** Hybrid
**Notes:** Tokens scoped under `.cy-app` root (as prototype). Shared/structural `.cy-*` vocabulary lives global; one-off styling goes in component `<style>`.

---

## Tailwind cutover timing

| Option | Description | Selected |
|--------|-------------|----------|
| Coexist, remove at end of Phase 10 | Tailwind stays alongside cyber.css through Phases 8–10; removed as final step of Phase 10. main never visibly broken. | |
| Hard cutover in Phase 8 | Rip out Tailwind (deps/config/@import) in Phase 8; screens look plain until Phase 10. Satisfies DS-03 in Phase 8. | ✓ |

**User's choice:** Hard cutover in Phase 8
**Notes:** Accepted that screens render unstyled between Phase 8 and Phase 10. Hard constraint: app still builds + 130 tests pass.

---

## Brand & phase tracker

### Phase tracker

| Option | Description | Selected |
|--------|-------------|----------|
| 3-phase: LOBBY · DRAFTING · REVIEW | Matches snapshot phases + prototype CYChrome code. 1:1 mapping. | ✓ |
| 4-phase: LOBBY · BAN · PICK · REVIEW | Matches README prose; BAN/PICK are per-turn actions, not room phases — needs custom derivation. | |

**User's choice:** 3-phase: LOBBY · DRAFTING · REVIEW

### Brand wordmark

| Option | Description | Selected |
|--------|-------------|----------|
| DRAFT_NET | Matches prototype CYChrome header exactly. | |
| DRAFT | Matches README prose; consistent with hero ASCII art. | |
| **DRAFT_EM (user free-text)** | The registered domain. | ✓ |

**User's choice:** "Other" → **DRAFT_EM** — "The domain is registered under DRAFT_EM. Could we make that the title please"
**Notes:** Header brand = `[ DRAFT_EM ]`. Hero ASCII block-art (currently "DRAFT") regeneration deferred to Phase 9.

---

## Font delivery

| Option | Description | Selected |
|--------|-------------|----------|
| Self-host via @font-face | Bundle JetBrains Mono woff2 (400/500/600/700) under src/lib/assets/fonts; load via @font-face. Mirrors current Manrope. No CDN. | ✓ |
| Google Fonts CDN | <link> in app.html, matches README literally. External runtime dependency. | |

**User's choice:** Self-host via @font-face
**Notes:** Remove Manrope.ttf and its @font-face.

---

## Claude's Discretion

- Phase 8 shell renders on `.cy-app` radial-gradient background with a mount point left for the Phase 9 plasma shader.
- `cancelled` room phase handled as a terminal screen (Phase 12), not a tracker step.
- Shell wiring (`+layout.svelte` vs a chrome component), global stylesheet location/import, font-display strategy, and whether phase/room-code are read via props or a store — left to the planner.

## Deferred Ideas

- Plasma shader (FX-01/02) — Phase 9.
- Hero shaded-ASCII wordmark + possible `DRAFT_EM` regeneration (FX-04) — Phase 9.
- Screen reskins (UI-01..06) — Phase 10.
- Typed boot/connect logs (FX-03) — Phase 9.
