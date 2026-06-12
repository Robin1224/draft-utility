# Phase 8: Cyber Foundation & App Shell - Context

**Gathered:** 2026-06-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the plain-CSS Cyber design system and the persistent terminal chrome that every later screen sits inside. Concretely: remove Tailwind entirely, port the `cyber.css` tokens/foundation, load JetBrains Mono, enforce zero border-radius, and build the persistent app shell — fixed header (bracketed brand + blinking cursor, centered phase tracker, room-code meta + working copy button) and scanline overlay over a scrolling body.

**In scope:** tokens, font, global CSS foundation, the `.cy-app` shell + header + phase tracker + scanlines + copy-code button, and the blinking cursor (FX-05).

**Out of scope (later phases):** the plasma shader itself (Phase 9, FX-01/02 — Phase 8 only leaves a mount point), individual screen reskins (Phase 10), modals (Phase 11), access-control + secondary screens (Phase 12). Requirements covered: DS-01, DS-02, DS-03, DS-04, DS-05, FX-05.
</domain>

<decisions>
## Implementation Decisions

### CSS architecture (Hybrid)
- **D-01:** Plain CSS, **no Tailwind**. Organize as a **hybrid**: a global stylesheet holds the design tokens and the shared/structural `.cy-*` vocabulary ported from `cyber.css` (chrome, buttons, cards, inputs, modal/field primitives, etc.); component-scoped Svelte `<style>` blocks are used only for genuinely one-off styling a component needs.
- **D-02:** Design tokens (colors, glow shadows, `--cy-mono`, gradients) are declared scoped under the `.cy-app` shell root, mirroring the prototype — not on bare `:root`. The `.cy-app` wrapper is the single styling root the whole app renders inside.
- **D-03:** Port token/foundation values **verbatim** from `design_handoff_pickban_cyber/prototype/variants/cyber.css` (hex values, glow shadows `--cy-lime-glow`/`--cy-violet-glow`, the two background radial gradients, the scanline `rgba(196,75,255,0.04)` gradient). These values are load-bearing for fidelity — do not approximate.

### Tailwind removal (Hard cutover in Phase 8)
- **D-04:** Remove Tailwind completely in Phase 8: the `tailwindcss` + `@tailwindcss/vite` dependencies (and `prettier-plugin-tailwindcss`), the `tailwindcss()` plugin in `vite.config.js`, and the `@import 'tailwindcss';` + `@theme {…}` block in `src/routes/layout.css`. This satisfies DS-03 within Phase 8.
- **D-05:** Existing screens/components keep their utility-class strings but will render **plain/unstyled** between Phase 8 and their Phase 10 reskin. This visually-degraded interim is accepted. **Hard constraint:** the app must still build cleanly (no leftover Tailwind directives, no `@apply`, no broken imports) and all 130 unit tests must keep passing (tests assert behavior/text, not visuals).

### Brand & phase tracker
- **D-06:** Header brand wordmark = **`[ DRAFT_EM ]`** (the registered domain), with the blinking block cursor `▮` after it. This replaces the prototype's `DRAFT_NET`.
- **D-07:** Phase tracker is **3 phases: `LOBBY · DRAFTING · REVIEW`**, mapped 1:1 to `snapshot.phase` (`lobby`/`drafting`/`review`). Active phase gets the lime glow, prior phases dimmed. Zero-padded numbering (`01_LOBBY`…) per prototype. The `cancelled` room phase is NOT a tracker step — it's a terminal screen handled in Phase 12.

### Fonts
- **D-08:** Self-host **JetBrains Mono** (woff2, weights 400/500/600/700) under `src/lib/assets/fonts/`, loaded via `@font-face` — mirroring the existing Manrope setup. No Google Fonts CDN / external runtime dependency. Remove the old `Manrope.ttf` and its `@font-face`. `--cy-mono: "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace;`

### Shell behavior
- **D-09:** The room-code copy button writes the current room code to the clipboard (`navigator.clipboard`). On screens with no room (Home/Login) the code meta shows `—` per the prototype.
- **D-10:** The blinking cursor (FX-05) animates via `@keyframes cy-blink` (1s step-end) and is **suppressed under `prefers-reduced-motion`**.

### Claude's Discretion
- The Phase 8 shell renders on `cyber.css`'s `.cy-app` radial-gradient background and leaves a **mount point** (e.g. an empty `cy-shader` slot/component) for the Phase 9 plasma shader — no shader rendered yet.
- How the persistent shell is wired into SvelteKit (e.g. `.cy-app` + header in `+layout.svelte` vs a `CyChrome` component the layout renders) — planner's call, as long as it's a single persistent chrome and the phase/room-code props derive from route/snapshot state.
- woff2 file sourcing/subsetting and exact `font-display` strategy.
- Where the global stylesheet lives / how it's imported (e.g. `src/app.css` imported in `+layout.svelte`, replacing `layout.css`).
- Whether the header reads phase/room-code via props from each route or from a shared store — as long as the snapshot shape is untouched.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design source (authoritative — port verbatim)
- `design_handoff_pickban_cyber/prototype/variants/cyber.css` — All Cyber tokens, glow shadows, gradients, the scanline gradient, and every `.cy-*` class. THE source of truth for all values. The `.cy-app`, `.cy-shader`, `.cy-scanlines`, `.cy-body`, `.cy-header`, `.cy-brand*`, `.cy-phase*`, `.cy-meta*`, and `.cy-btn*` rules define the Phase 8 shell/foundation.
- `design_handoff_pickban_cyber/prototype/variants/cyber.jsx` §`CYChrome` (lines ~153–182) — Shell structure: `.cy-app` > `CYShader` + `.cy-scanlines` + `.cy-header` (brand / phases / meta) + `.cy-body`. §`useTypedLog` (lines ~35–57) and §`CYShader` (lines ~65–151) are Phase 9 refs but show the reduced-motion pattern and the shader mount point Phase 8 leaves room for.
- `design_handoff_pickban_cyber/README.md` — §"Design System / Tokens" (colors, typography, spacing, zero-radius), §"Screens / Views" chrome description. NOTE: README prose says brand "DRAFT" and a 4-phase `LOBBY · BAN · PICK · REVIEW` tracker — both OVERRIDDEN by D-06 (`DRAFT_EM`) and D-07 (3-phase) here.

### Current code being replaced/modified
- `src/routes/layout.css` — current Tailwind `@import` + `@theme` + Manrope `@font-face`; replaced by the global Cyber stylesheet (D-01, D-04, D-08).
- `src/routes/+layout.svelte` — current global layout; the persistent `.cy-app` shell + header is wired here (or via a chrome component it renders).
- `vite.config.js` — remove the `tailwindcss()` plugin (line 2 import, line 10 usage); leave sveltekit/uws/realtime/devtoolsJson plugins intact.
- `src/app.html` — global HTML shell.
- `package.json` — remove `tailwindcss`, `@tailwindcss/vite`, `prettier-plugin-tailwindcss`.

### Project guardrails
- `.planning/REQUIREMENTS.md` — DS-01..05, FX-05; milestone constraint banner (snapshot frozen, 130 tests pass).
- `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/STRUCTURE.md`, `.planning/codebase/STACK.md` — existing patterns/structure to stay consistent with.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Self-hosted font pattern**: `src/routes/layout.css:13` already loads Manrope via `@font-face` from `src/lib/assets/fonts/` — replicate exactly for JetBrains Mono (D-08).
- **Global layout entry**: `src/routes/+layout.svelte` already imports a global CSS file and renders `children()` — the natural home for the `.cy-app` shell.
- **Prototype shell**: `CYChrome` in `cyber.jsx` is a direct structural template to port to Svelte (header three-column grid: brand / phases / meta).

### Established Patterns
- **Svelte 5 runes** (`$props`, `$state`, `$derived`, `$effect`) — used throughout; the shell's phase/room-code are derived values.
- **Tailwind is currently wired in 3 places** (vite plugin, layout.css `@import`+`@theme`, package.json) — all three must be removed for a clean cutover (D-04).
- **Components style via Tailwind utility classes today** — after cutover they render unstyled until Phase 10 (D-05).

### Integration Points
- The persistent shell wraps all routes via `+layout.svelte` → every later phase's screens render inside `.cy-body`.
- Header `phase` prop derives from the route/snapshot (`snapshot.phase`); `code` from the room's public code (route param / snapshot). Must read state without altering the frozen snapshot shape.
- `vitest` runs both a browser (svelte component) project and a node (server) project — removing Tailwind must not break either test project's build.
</code_context>

<specifics>
## Specific Ideas

- Brand is `[ DRAFT_EM ]` — the registered domain — not the prototype's `DRAFT_NET`.
- Reproduce the exact `cyber.css` values; the aesthetic depends on them (zero border-radius everywhere, 1px borders, the specific hex/glow/gradient values).
- Phase tracker mirrors actual room state (3 phases) rather than the README's aspirational 4-phase BAN/PICK split.
</specifics>

<deferred>
## Deferred Ideas

- **Plasma shader (FX-01/02)** — Phase 9. Phase 8 only leaves a mount point in the shell.
- **Hero shaded-ASCII wordmark** — Phase 9 (FX-04). The block-art currently spells `DRAFT`; since the brand is now `DRAFT_EM`, regenerating the ASCII block-art to read `DRAFT_EM` (or deciding to keep the hero as `DRAFT` while the header reads `DRAFT_EM`) is a Phase 9 decision. Flagged so it's not lost.
- **Screen reskins (UI-01..06)** — Phase 10. Phase 8 leaves existing screens unstyled.
- **Typed boot/connect logs (FX-03)** — Phase 9.

### Reviewed Todos (not folded)
None — no pending todos matched Phase 8.
</deferred>

---

*Phase: 08-cyber-foundation-app-shell*
*Context gathered: 2026-06-12*
