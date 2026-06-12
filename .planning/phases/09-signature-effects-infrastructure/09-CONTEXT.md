# Phase 9: Signature Effects Infrastructure - Context

**Gathered:** 2026-06-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the three reusable, motion-safe Cyber signature treatments as Svelte 5 building blocks that Phase 10+ screens drop in:

1. **ASCII plasma shader** — a `<canvas>` component (`CyShader.svelte`) rendering a domain-warped plasma field as monospace glyphs on a violet→lime brightness ramp, with `ambient`/`hot` intensities, IntersectionObserver off-screen pause, and reduced-motion disable.
2. **Typed terminal-log** — a rune-based reusable utility that prints `string[]` character-by-character and exposes reactive `{ text, done }`, jumping to full text under reduced motion. Consumed by Home boot log (Phase 10) and connect log (Phase 12).
3. **Shaded-ASCII `DRAFT` wordmark** — `CyLogo.svelte` rendering the 9-line `CY_LOGO_LINES` block-art with a line-by-line slide/glow reveal (driven by a `rendered` prop), motion-safe.

**In scope:** the three components/utility, their CSS (`.cy-boot`, `.cy-logo*` ported into `src/app.css`), wiring `CyShader` into the existing `.cy-shader` mount slot in `CyShell.svelte` (ambient default), and browser component tests proving each effect + its reduced-motion behavior.

**Out of scope (later phases):** screen reskins / Home composition (Phase 10, UI-01..06), the connect log content `CY_CONNECT_LINES` and SIGKILL log (Phase 12), finalizing boot-log copy `./draftnet` vs a `draftem` flavor (Phase 10 copy decision). Requirements covered: FX-01, FX-02, FX-03, FX-04.

</domain>

<decisions>
## Implementation Decisions

### Wordmark text (UI-SPEC FLAG resolved)
- **D-01:** The hero shaded-ASCII wordmark **stays `DRAFT`** — port `CY_LOGO_LINES` (9 lines) verbatim from `cyber.jsx`. The header brand already carries the full `[ DRAFT_EM ]` mark on every screen (Phase 8 D-06); the long-form-in-chrome / short-form-in-hero split is intentional and accepted. No new ASCII-art authoring. `aria-label="DRAFT"`.

### Shader wire-in timing
- **D-02:** Phase 9 **mounts `<CyShader />` into `CyShell.svelte` now**, replacing the empty `<div class="cy-shader">`. It renders at the **ambient** default (`hot=false`, `intensity=1`). Because `CyShell` is the global persistent chrome, the ambient shader becomes app-wide immediately — even behind still-unstyled (pre-Phase-10) screens. This makes FX-01/FX-02 directly verifiable in Phase 9. The `hot` variant is wired by Home in Phase 10; do NOT pass `hot` from the shell in Phase 9.

### Verification approach
- **D-03:** Prove the effects with **browser component tests only** (the existing `vitest` browser/chromium project that already renders `CyShell.svelte.spec.js`). Drive `CyLogo` and the typed-log utility in isolation. **No throwaway demo route / dev playground** — visual confirmation of the typed log + wordmark lands naturally when Phase 10 Home composes them.
  - Typed log: assert character-by-character progression and `done` flip; assert reduced-motion → `text === full` and `done === true` immediately (no typing); assert `clearTimeout` teardown.
  - Wordmark: assert `is-rendered` triggers the reveal classes / 9 `cy-logo-line` spans; assert base `.cy-logo` is always visible (reveal animates transform+brightness, never opacity); assert reduced-motion suppresses reveal/glitch leaving the static wordmark.
  - Shader: assert canvas mounts with `cy-shader` (+ `aria-hidden`), rAF/observer teardown on unmount, and reduced-motion path renders without scheduling an ongoing loop (see D-04). Use the existing browser test harness; do not introduce new test infra.

### Reduced-motion shader behavior
- **D-04:** Under `(prefers-reduced-motion: reduce)` the shader **renders exactly one static plasma frame** (draw once at a fixed `t`, then never schedule `requestAnimationFrame`). This preserves the violet→lime ASCII texture behind content for reduced-motion users — consistent with the wordmark's "final static state visible" approach (D-01 / UI-SPEC Effect 3). The hard rule (FX-02): **zero ongoing animation** under reduced motion. The IntersectionObserver/ResizeObserver may still attach, but no animating rAF loop runs.

### Claude's Discretion
- **Typed-log form:** rune-based `.svelte.js` `createTypedLog(lines, opts)` factory vs a thin component wrapper — planner's call (UI-SPEC explicitly defers this). Must be reusable across Home boot log and the Phase 12 connect log.
- Exact test file placement/naming, following the existing `*.svelte.spec.js` convention.
- How the single static reduced-motion frame is produced (fixed `t=0` vs one representative `t`), as long as it's deterministic and non-animating.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 9 design contract (authoritative for this phase)
- `.planning/phases/09-signature-effects-infrastructure/09-UI-SPEC.md` — The approved visual/interaction contract. Transcribes every constant verbatim: shader `CY_RAMP`/cell sizes/fps/speed/color-ramp RGB formula + clamps/plasma field math/DPR clamp, typed-log timing (`speed 9`, `lineGap 60`, `300ms` initial, connect-log override `speed 7 lineGap 120`), `CY_LOGO_LINES` 9-line block-art, `cy-logo-in` keyframe + 9 nth-child delays, `.cy-boot` CSS, and all motion-safety/lifecycle obligations per effect. Includes a Verbatim-Port Checklist (fidelity guard). **This is the primary spec — follow it exactly.**

### Design source (port VERBATIM — the values are load-bearing)
- `design_handoff_pickban_cyber/prototype/variants/cyber.jsx` — Behavior reference (React → reimplement as Svelte 5): §`CYShader` (~lines 65–151) plasma shader, §`useTypedLog` (~lines 35–57) typed log, §`CY_LOGO_LINES` (~lines 10–20) block-art, §`CYHome` (~lines 231–289) composition showing the reveal wired to `boot.done`. React `useEffect` cleanup maps 1:1 to the Svelte `$effect` teardown return.
- `design_handoff_pickban_cyber/prototype/variants/cyber.css` — Value source: `.cy-boot` (lines 126–129), `.cy-logo*` + `cy-logo-in` + `cy-glitch` + reduced-motion block (lines 131–178). Port verbatim into `src/app.css` under `.cy-app` (Phase 8 hybrid CSS org).

### Phase 8 foundation (already shipped — do NOT contradict)
- `.planning/phases/08-cyber-foundation-app-shell/08-CONTEXT.md` — Locked decisions this phase builds on: plain CSS no Tailwind (D-01), `.cy-app` token scope (D-02), verbatim cyber.css values (D-03), zero border-radius (DS-04), JetBrains Mono self-hosted (D-08), `cy-blink` keyframe + reduced-motion suppression (D-10).
- `src/lib/components/chrome/CyShell.svelte` — The global shell with the empty `<div class="cy-shader">` mount slot (D-02 wires the shader here) and the existing `cy-brand-cur` blinking cursor.
- `src/app.css` — Already contains `.cy-shader` (opacity 0.9, absolute, z-index 0, pointer-events none) + `.cy-shader-hot` (opacity 1) positioning, `cy-blink`, and the `@media (prefers-reduced-motion: reduce)` block. Phase 9 ADDS `.cy-boot` + `.cy-logo*` here; do NOT duplicate the existing `.cy-shader` positioning rules.

### Project guardrails
- `.planning/REQUIREMENTS.md` — FX-01, FX-02, FX-03, FX-04 acceptance text; milestone constraint banner (realtime/snapshot shape FROZEN, 130+ unit tests must keep passing — these effects are presentational and must not touch the realtime layer).
- `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/STRUCTURE.md`, `.planning/codebase/STACK.md` — existing patterns (Svelte 5 runes, component layout under `src/lib/components/`, vitest browser+node projects).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`CyShell.svelte` mount slot**: the empty `<div class="cy-shader"></div>` (line ~24) is the exact target for `<CyShader />` (D-02). Its CSS positioning already exists in `src/app.css`.
- **`.cy-shader` / `.cy-shader-hot` CSS**: already present (`src/app.css:66`, `:75`) — opacity 0.9 / 1, absolute inset, z-index 0, pointer-events none. Phase 9 fills the canvas; positioning is untouched.
- **`cy-blink` keyframe + reduced-motion block**: `src/app.css:117`, `:120`, `:256` — the foundation reduced-motion pattern to mirror for the shader/typed-log; a consumer's trailing `▮` cursor reuses `cy-blink`.
- **Browser component test harness**: `src/lib/components/chrome/CyShell.svelte.spec.js` and other `*.svelte.spec.js` files run under the vitest chromium browser project — the established pattern for D-03 (component tests, no new infra).

### Established Patterns
- **Svelte 5 runes** (`$props`, `$state`, `$derived`, `$effect`) used throughout. The shader's rAF loop + both observers MUST be torn down in the `$effect` cleanup return; recreate on `intensity`/`hot` change. Guard `window`/`matchMedia` for SSR (`typeof window !== "undefined"`).
- **Hybrid CSS org** (Phase 8 D-01): structural `.cy-*` classes go in global `src/app.css` under `.cy-app`; component-scoped `<style>` only for genuine one-offs.
- **Components live under `src/lib/components/`** (atoms/molecules/organisms/chrome). New effect components fit this tree (e.g. chrome or a new `effects` grouping — planner's call).

### Integration Points
- Wiring `<CyShader />` into the global `CyShell` makes the ambient shader app-wide for every route immediately (D-02) — verify it sits behind content (z-index 0, pointer-events none) and does not regress the 130+ tests.
- The typed-log utility and `CyLogo` have NO runtime consumer in Phase 9 (D-03) — they are validated by component tests and consumed by Phase 10 Home / Phase 12 Connecting. The Consumption Map in the UI-SPEC documents the exact wiring for those phases.
- `vitest` runs browser (svelte) + node (server) projects — new components/tests must not break either build; effects are presentational and must not import or touch the realtime/snapshot layer.

</code_context>

<specifics>
## Specific Ideas

- This is a **verbatim-port** phase: glyph strings, numeric constants, color-ramp formulas, and CSS keyframes are load-bearing for fidelity — transcribe, do not approximate (PROJECT D-03; UI-SPEC Verbatim-Port Checklist).
- The shader's per-pixel color is **procedural RGB** (the violet→lime ramp formula), intentionally NOT token-driven — the formula IS the contract. Do not substitute `--cy-lime`/`--cy-violet`.
- The wordmark reveal animates **transform + brightness only, never opacity**, and the base `.cy-logo` is always visible — a deliberate guardrail so the logo can never get stuck hidden.

</specifics>

<deferred>
## Deferred Ideas

- **`DRAFT_EM` hero block-art** — considered (UI-SPEC FLAG) and declined for Phase 9 (D-01). If the brand short-form is ever revisited, regenerating `░▒▓█` block-art for `DRAFT_EM` is its own ASCII-authoring task, not a transcription.
- **Boot-log copy finalization** (`./draftnet` / `28 found` → a `draftem`-flavored command) — Phase 10 copy decision. Phase 9 ships `CY_BOOT_LINES` verbatim as the reference default.
- **Connect log + SIGKILL log content** (`CY_CONNECT_LINES`, `speed:7 lineGap:120`) — Phase 12. The typed-log utility built here is generic enough to serve them.
- **Temporary dev demo route** — considered for live eyeballing (Verify question) and declined (D-03) in favor of component tests + natural Phase 10 visual confirmation.

### Reviewed Todos (not folded)
None — no pending todos matched Phase 9.

</deferred>

---

*Phase: 09-signature-effects-infrastructure*
*Context gathered: 2026-06-12*
