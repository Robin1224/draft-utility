# Phase 8: Cyber Foundation & App Shell - Research

**Researched:** 2026-06-12
**Domain:** SvelteKit 2 / Svelte 5 global-CSS foundation, Tailwind v4 removal, persistent layout shell, self-hosted webfont, clipboard, reduced-motion
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Plain CSS, **no Tailwind**. Hybrid org: one global stylesheet holds design tokens + shared/structural `.cy-*` vocabulary ported from `cyber.css`; component-scoped `<style>` only for genuine one-offs.
- **D-02:** Tokens (colors, glow shadows, `--cy-mono`, gradients) declared scoped under `.cy-app`, NOT bare `:root`. `.cy-app` is the single styling root the whole app renders inside.
- **D-03:** Port token/foundation values **verbatim** from `cyber.css` (hex, glow shadows `--cy-lime-glow`/`--cy-violet-glow`, the two `.cy-app` radial gradients, scanline `rgba(196,75,255,0.04)` gradient). Load-bearing — do not approximate.
- **D-04:** Remove Tailwind completely in Phase 8: `tailwindcss` + `@tailwindcss/vite` + `prettier-plugin-tailwindcss` deps, the `tailwindcss()` plugin in `vite.config.js`, and the `@import 'tailwindcss';` + `@theme {…}` block in `src/routes/layout.css`.
- **D-05:** Existing screens keep their utility-class strings but render **plain/unstyled** until Phase 10 — accepted. Hard constraint: app builds cleanly (no leftover Tailwind directives / `@apply` / broken imports) and all 130 unit tests keep passing.
- **D-06:** Header brand wordmark = **`[ DRAFT_EM ]`** (not `DRAFT_NET`, not `DRAFT`), then blinking block cursor `▮`.
- **D-07:** Phase tracker = **3 phases** `LOBBY · DRAFTING · REVIEW`, mapped 1:1 to `snapshot.phase` (`lobby`/`drafting`/`review`). Active = lime glow, prior = dimmed. Zero-padded numbering (`01_LOBBY`…). `cancelled` is NOT a tracker step (terminal screen in Phase 12) — do not crash on unknown phase.
- **D-08:** Self-host **JetBrains Mono** woff2 weights 400/500/600/700 under `src/lib/assets/fonts/`, via `@font-face`, mirroring the Manrope setup. No Google Fonts CDN. Remove `Manrope.ttf` + its `@font-face`. `--cy-mono: "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace;`
- **D-09:** Room-code copy button writes current room code to clipboard (`navigator.clipboard`). No-room screens (Home/Login) show `—`.
- **D-10:** Blinking cursor (FX-05) animates via `@keyframes cy-blink` (1s step-end), **suppressed under `prefers-reduced-motion`**.

### Claude's Discretion
- Phase 8 shell renders on the `.cy-app` radial-gradient background and leaves an **empty `.cy-shader` mount point** for the Phase 9 plasma shader — no shader rendered.
- How the persistent shell is wired into SvelteKit (`.cy-app` + header directly in `+layout.svelte` vs a `CyChrome` component the layout renders) — as long as it's a single persistent chrome and phase/room-code props derive from route/snapshot state.
- woff2 file sourcing/subsetting and exact `font-display` strategy.
- Where the global stylesheet lives / how it's imported (e.g. `src/app.css` imported in `+layout.svelte`, replacing `layout.css`).
- Whether the header reads phase/room-code via per-route props or a shared store — as long as the snapshot shape is untouched.

### Deferred Ideas (OUT OF SCOPE)
- Plasma shader (FX-01/02) — Phase 9 (Phase 8 leaves a mount point only).
- Hero shaded-ASCII wordmark (FX-04) — Phase 9.
- Screen reskins (UI-01..06) — Phase 10 (existing screens stay unstyled).
- Typed boot/connect logs (FX-03) — Phase 9.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DS-01 | All UI in JetBrains Mono (400/500/600/700), no other UI font | `## Font Self-Hosting`; 4 `@font-face` blocks + `font-family` on `.cy-app`; remove Manrope |
| DS-02 | Cyber color tokens + glow shadows available app-wide as CSS custom props scoped under `.cy-app` | `## Standard Stack`, `## Code Examples` (token block ported verbatim from cyber.css:2–17) |
| DS-03 | Tailwind fully removed (dep, config, `@import 'tailwindcss'`); no component renders via Tailwind utility classes | `## Tailwind v4 Removal (exact files/lines)`; 4 wiring points incl. `.prettierrc` |
| DS-04 | Squared corners (zero border-radius) + 1px borders per Cyber spec | `## Architecture Patterns` (no `border-radius` anywhere; ported `.cy-*` rules already 0-radius/1px) |
| DS-05 | Persistent app shell: fixed header (bracketed wordmark + blinking cursor, centered phase tracker lime-glowed, room-code meta + working copy button) + scanline overlay over scrolling body | `## Persistent Shell Wiring`, `## Clipboard Copy`, `## Code Examples` |
| FX-05 | Blinking block cursor (header brand), 1s step-end, disabled under reduced motion | `## Reduced-Motion (CSS-only)`; `cy-blink` keyframe + media query |
</phase_requirements>

## Summary

This is a foundation/refactor phase with three intertwined workstreams: (1) cleanly excise Tailwind v4 from a SvelteKit 2.50 + Svelte 5.51 app, (2) stand up a plain-CSS Cyber design system whose tokens are ported byte-for-byte from `cyber.css`, self-host JetBrains Mono, and (3) build a single persistent terminal "chrome" in `+layout.svelte` that wraps every route. The realtime layer and the lobby/draft snapshot shape are frozen, and all 130 existing unit tests assert behavior/text (not visuals), so the work is almost entirely additive CSS + one layout component — with the one genuine risk being the four Tailwind wiring points (vite plugin, `layout.css`, `package.json`, **and `.prettierrc`** — which the CONTEXT/UI-SPEC omit).

Tailwind v4 in this project is pure-Vite-plugin based (no `tailwind.config.js`, no `postcss.config.*` — verified absent). Removal is mechanical: drop the `tailwindcss()` plugin from `vite.config.js`, delete the `@import 'tailwindcss';` + `@theme {…}` block from `layout.css`, remove three npm deps, and strip the `prettier-plugin-tailwindcss` plugin + `tailwindStylesheet` key from `.prettierrc`. Because `vite.config.js` is the source the dual vitest projects (`client` browser + `server` node) both `extends`, removing the plugin there fixes both test environments at once — there is no separate test-only Tailwind wiring.

The persistent shell goes in the root `+layout.svelte` (the SvelteKit-blessed home for global CSS and persistent chrome). The header's `phase` and `code` derive **read-only** from existing reactive sources without touching the snapshot: room `code` from `page.params.id` (`$app/state`), and `phase` from the live `lobby(code)` snapshot's existing `.phase` field — no new fields, no shape change. Home/Login have no `[id]` param, so `code` falls back to `—` (D-09) and `phase` defaults to `lobby`.

**Primary recommendation:** Create `src/app.css` (tokens scoped under `.cy-app` + all shared `.cy-*` rules + 4 JetBrains Mono `@font-face` blocks + `cy-blink` keyframe + reduced-motion media query, all ported verbatim from `cyber.css`). Import it in `+layout.svelte` (replacing `layout.css`), render a `<CyShell>` component there that wraps `{@render children()}` in `.cy-app > [shader slot] + .cy-scanlines + header.cy-header + .cy-body`, deriving `phase`/`code` from `$app/state` + the live lobby store. Remove all four Tailwind wiring points in the same phase.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SvelteKit | `^2.50.2` (installed) | Routing + root `+layout.svelte` shell | Already the app framework; layout is the canonical persistent-chrome home |
| Svelte 5 | `^5.51.0` (installed) | Runes (`$props`/`$derived`/`$state`) for the shell | Runes enabled project-wide via `svelte.config.js` |
| Plain CSS | — | Design tokens + `.cy-*` vocabulary | D-01 mandates no Tailwind, no component library |
| `$app/state` (`page`) | SvelteKit ≥2.12 (have 2.50) | Read `page.params.id` (room code) reactively in layout | Modern rune-based replacement for `$app/stores`; works in layouts via `$derived` |
| JetBrains Mono (self-hosted woff2) | OFL-1.1, latest release | The single UI typeface (DS-01) | Free, open, ships static per-weight woff2 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `navigator.clipboard.writeText` | platform API | Copy room code (D-09) | The `[copy]` button; already used in this repo at `draft/[id]/+page.svelte:92` |
| `svelte/store` `fromStore` / store `.subscribe` | Svelte 5 | Read the live `lobby(code)` snapshot in the layout to derive `phase` | Only if deriving phase from the live snapshot vs. SSR `data.room.phase` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `src/app.css` imported in `+layout.svelte` | Keep `layout.css` filename | Cosmetic; `app.css` is the SvelteKit-idiomatic name. Either works — discretion (D). Renaming requires updating the `import` in `+layout.svelte`. |
| `<CyShell>` component rendered by layout | Inline `.cy-app` markup directly in `+layout.svelte` | A component is cleaner to unit-test (`CyShell.svelte.spec.js`) and isolates props; inline is fewer files. Recommend the **component** so the shell is independently testable. |
| Phase from live `lobby(code)` snapshot | Phase from SSR `data.room.phase` (page load) | The live snapshot is authoritative + updates on phase transitions; `data.room.phase` is stale after transitions. But the layout has no `data.room`. Recommend deriving phase from the live store keyed by `page.params.id`, falling back to `lobby`. |
| Self-hosted static woff2 (4 files) | Variable woff2 (1 file) | Variable saves a request but DS-01 specifies the 4 discrete weights; static per-weight mirrors the existing Manrope `@font-face` pattern exactly. Recommend **4 static woff2**. |

**Installation:** No new npm packages. Net dependency change is **removal only**:
```bash
npm uninstall tailwindcss @tailwindcss/vite prettier-plugin-tailwindcss
```
(Then place 4 woff2 files under `src/lib/assets/fonts/` — assets, not packages.)

**Version verification (npm registry, 2026-06-12):**
| Package | Installed | Latest | Note |
|---------|-----------|--------|------|
| @sveltejs/kit | ^2.50.2 | 2.64.0 | `$app/state` available (≥2.12) ✓ |
| svelte | ^5.51.0 | 5.56.3 | runes OK |
| vite | ^7.3.1 | 8.0.16 | no change needed |
| vitest | ^4.1.0 | 4.1.8 | no change needed |
| tailwindcss | ^4.1.18 | 4.3.0 | **being removed** |
| @tailwindcss/vite | ^4.1.18 | 4.3.0 | **being removed** |
| prettier-plugin-tailwindcss | ^0.7.2 | 0.8.0 | **being removed** |

No upgrades are required for this phase; the work removes packages, not adds.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app.css                          # NEW — global Cyber stylesheet (replaces layout.css):
│                                     #   tokens scoped under .cy-app, all shared .cy-* rules,
│                                     #   4 @font-face (JetBrains Mono), cy-blink + reduced-motion
├── routes/
│   ├── +layout.svelte               # EDIT — import '../app.css'; render <CyShell>{@render children()}</CyShell>
│   └── layout.css                   # DELETE (after app.css exists)
├── lib/
│   ├── assets/fonts/
│   │   ├── JetBrainsMono-Regular.woff2     # NEW (400)
│   │   ├── JetBrainsMono-Medium.woff2      # NEW (500)
│   │   ├── JetBrainsMono-SemiBold.woff2    # NEW (600)
│   │   ├── JetBrainsMono-Bold.woff2        # NEW (700)
│   │   └── Manrope.ttf                      # DELETE
│   └── components/
│       └── chrome/                          # NEW folder (or molecules/)
│           ├── CyShell.svelte               # NEW — .cy-app shell + header + scanlines + body slot
│           └── CyShell.svelte.spec.js       # NEW — browser test (header/brand/tracker/scanlines)
vite.config.js                        # EDIT — remove tailwindcss import + plugin
package.json                          # EDIT — remove 3 deps
.prettierrc                           # EDIT — remove tailwind plugin + tailwindStylesheet key
```

### Pattern 1: Global CSS via root +layout.svelte (NOT app.html)
**What:** Import the global stylesheet in `src/routes/+layout.svelte`, not in `app.html`.
**When to use:** Always, for app-wide CSS in SvelteKit.
**Why:** Importing in the layout registers the file with Vite, enabling HMR; styles in `app.html` require a dev-server restart on every change. This is exactly what the repo does today (`import './layout.css'`).
```svelte
<!-- Source: https://svelte.dev/docs/svelte/global-styles + joyofcode.xyz/global-styles-in-sveltekit -->
<script>
  import '../app.css';
  import CyShell from '$lib/components/chrome/CyShell.svelte';
  let { children } = $props();
</script>
<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<CyShell>{@render children()}</CyShell>
```

### Pattern 2: Tokens scoped under `.cy-app`, not `:root` (D-02)
**What:** Declare all `--cy-*` custom properties on the `.cy-app` selector. Because `.cy-app` wraps the whole app, every descendant inherits the tokens — exactly like `:root` but namespaced. This is verbatim how `cyber.css` does it (lines 2–27).
**When to use:** All token declarations.
**Why it matters:** Keeps the cascade contained to the Cyber root and matches the prototype 1:1 (fidelity guard). `font-family: var(--cy-mono)` on `.cy-app` makes the whole tree inherit the mono font (DS-01).

### Pattern 3: Persistent chrome reads route/snapshot read-only (no shape change)
**What:** The shell derives its `phase`/`code` props from existing state, never mutating the snapshot.
- `code`: `import { page } from '$app/state'; const code = $derived(page.params.id ?? null);` → on `/draft/[id]` this is the room code; on `/`, `/login` it's `undefined` → show `—`.
- `phase`: read the live `lobby(code)` snapshot's existing `.phase` (`'lobby'|'drafting'|'review'|'cancelled'`). The snapshot already carries `phase` (verified in `src/live/room.js` and consumed at `draft/[id]/+page.svelte:52`). Map to the 3-phase tracker; treat `cancelled`/unknown as "no active step."
**When to use:** Always — the frozen-snapshot constraint forbids adding fields.

### Anti-Patterns to Avoid
- **Declaring tokens on `:root`** — violates D-02 and breaks fidelity with the prototype. Use `.cy-app`.
- **Any `border-radius`** — DS-04 is a hard zero-radius rule. The ported `.cy-*` rules already have none; do not introduce any.
- **Putting global CSS in `app.html`** — kills HMR; SvelteKit anti-pattern.
- **Adding a field to the snapshot to carry the phase/code** — violates the frozen-snapshot constraint. Derive read-only from `page.params` + existing `.phase`.
- **Leaving any `@import 'tailwindcss'`, `@theme`, or `@apply`** — DS-03/D-05 require a clean build. Grep-assert their absence.
- **Approximating any color/glow/gradient value** — D-03 requires verbatim port; the scanline `rgba(196,75,255,0.04)` and `0 0 12px …80` glow alphas are load-bearing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reading the room code in the layout | A custom route-param parser or prop-drilling through every page | `page.params.id` from `$app/state` (`$derived`) | Reactive, official, zero plumbing; works in layouts |
| Suppressing blink under reduced motion | A JS `matchMedia` listener that toggles a class | A CSS `@media (prefers-reduced-motion: reduce) { .cy-brand-cur { animation: none } }` | Pure CSS is simpler, SSR-safe, no JS, matches D-10 + cyber.css precedent |
| Copy-to-clipboard | A textarea+`execCommand('copy')` hack | `navigator.clipboard.writeText(code)` in a `try/catch` | Modern standard; repo already uses it at `draft/[id]/+page.svelte:92`; copy that pattern |
| Tailwind detection (config/postcss) | Searching for / authoring a `tailwind.config.js` or `postcss.config.js` to edit | Nothing — neither file exists | Tailwind v4 here is plugin-only; the 4 wiring points are the complete surface |
| The phase tracker index math | A bespoke state machine | Direct map: `['lobby','drafting','review'].indexOf(phase)` (matches cyber.jsx §154-155) | The prototype already does exactly this; port it |

**Key insight:** Almost everything in this phase is a *port* of existing, verified code — `cyber.css` rules (port verbatim), the `CYChrome` DOM (`cyber.jsx:153-182`), the repo's own clipboard pattern, and the repo's own `@font-face` pattern. The only net-new logic is the read-only phase/code derivation in the layout, which uses stock SvelteKit/Svelte runes.

## Tailwind v4 Removal (exact files/lines)

Tailwind is wired in **four** places (CONTEXT/UI-SPEC list three — `.prettierrc` is the missed fourth). Verified: **no `tailwind.config.*` and no `postcss.config.*` exist** in the repo (`postcss.config.*` glob returned no matches).

| # | File | Exact change |
|---|------|--------------|
| 1 | `vite.config.js` | Delete line 2 `import tailwindcss from '@tailwindcss/vite';` and remove `tailwindcss()` from the `plugins: [...]` array (line 10). Leave `sveltekit()`, `uws()`, `realtime()`, `devtoolsJson()` intact. Because both vitest projects `extends: './vite.config.js'` (lines 23, 37), this single edit fixes the client (browser) and server (node) test builds — no separate test wiring. |
| 2 | `src/routes/layout.css` | Delete the entire file (lines 1–11: `@import 'tailwindcss';` + `@theme {…}`, plus lines 13–17 Manrope `@font-face`). Its replacement is `src/app.css`. |
| 3 | `package.json` | Remove `"tailwindcss": "^4.1.18"` (line 48), `"@tailwindcss/vite": "^4.1.18"` (line 32), `"prettier-plugin-tailwindcss": "^0.7.2"` (line 45) from `devDependencies`. Run `npm install` to update the lockfile. |
| 4 | `.prettierrc` | **(Missed by CONTEXT/UI-SPEC.)** Remove `"prettier-plugin-tailwindcss"` from the `plugins` array (line 6 → leaves `["prettier-plugin-svelte"]`) and delete the `"tailwindStylesheet": "./src/routes/layout.css"` key (line 15). If left, `prettier --check`/`npm run lint` (and CI) will fail because the plugin package is uninstalled and the stylesheet path no longer exists. |

**`@import` path note:** `layout.css:15` uses `url('$lib/assets/fonts/Manrope.ttf')`. The `$lib` alias resolves inside CSS because the file is processed by Vite/SvelteKit via the layout import. The new `app.css` `@font-face` `src` should likewise use `url('$lib/assets/fonts/JetBrainsMono-Regular.woff2')` (relative path also works since `app.css` sits at `src/`; `$lib` is safest and matches the existing precedent).

**No `svelte.config.js` change needed** — it has no Tailwind reference (verified). **No `eslint.config.js` change needed** — no Tailwind plugin there (verified).

**Post-removal verification (grep-able):**
```bash
grep -rn "tailwind\|@apply\|@theme" src/ vite.config.js .prettierrc   # → expect: no matches
npm run build                                                          # → must succeed
npm run test -- --run                                                  # → 130 pass (browser + node projects)
npm run lint                                                           # → prettier + eslint clean
```
> Note: `src/routes/+page.svelte`, `login/+page.svelte`, `draft/[id]/+page.svelte` and many components still contain Tailwind **utility-class strings** (e.g. `class="flex h-16…"`). That is intentional and accepted (D-05) — those are plain strings with no styling effect once Tailwind is gone; they are not Tailwind *directives* and will not break the build. Do NOT strip them in this phase (that's Phase 10).

## Persistent Shell Wiring

**DOM to port** (from `cyber.jsx` §CYChrome lines 153–182, with D-06/D-07 overrides), reimplemented as Svelte 5:
```
.cy-app  (token root; flex column; overflow hidden; relative; radial-gradient bg)
├── .cy-shader        ← EMPTY mount point (Phase 9). Render an empty <div class="cy-shader"> or omitted slot; NO canvas.
├── .cy-scanlines     ← ported verbatim; always on; pointer-events:none; z-index 5
├── header.cy-header  (grid 1fr auto 1fr; border-bottom 1px; bg --cy-bg-2; 12px 20px)
│   ├── .cy-brand     [ violet "[" · lime "DRAFT_EM" (700+glow) · violet "]" · lime ▮ blinking ]
│   ├── .cy-phases    01_LOBBY 02_DRAFTING 03_REVIEW  (active → .is-active lime glow; prior → .is-done)
│   └── .cy-meta      "$ ROOM=" · {code|—} (violet+glow) · <button.cy-meta-copy>[copy]</button>
└── .cy-body          (flex:1; overflow:auto; relative; z-index 1)  ← {@render children()}
```

**Phase/code derivation (read-only, no snapshot change):**
- `code` via `$app/state`: `const code = $derived(page.params.id ?? null)`. `page.params.id` is the room code on `/draft/[id]`; `undefined` on `/`, `/login` → render `—` and make `[copy]` a no-op (D-09).
- `phase`: subscribe to the existing live `lobby(code)` store **only when `code` exists**, read its `.phase`. The snapshot already has `phase` (frozen field; see `src/live/room.js` + `draft/[id]/+page.svelte:52`). Map:
  ```js
  const phases = ['lobby', 'drafting', 'review'];      // matches cyber.jsx:154
  const idx = $derived(phases.indexOf(snapshotPhase)); // -1 for cancelled/unknown → no active step (D-07)
  ```
  When there's no room (Home/Login), default `phase = 'lobby'` (index 0), or render the tracker with no active step — discretion. Recommend defaulting to `'lobby'` so the tracker isn't blank on Home (matches the prototype, which passes `phase="lobby"` on Home/Login).
- **Important:** the live store is keyed by room code and is a server/browser realtime stream. In the layout, guard against `undefined`/error snapshots exactly like the draft page does (`typeof === 'object' && !('error' in v)`). If subscribing in the layout proves awkward, the simpler fallback is: keep the tracker, but feed `phase` from each route via a layout-data or context value. The cleanest minimal approach that satisfies "single persistent chrome" + "no shape change" is the `page.params` + live-store derivation; the planner has discretion (D) on the exact wiring.

**Existing duplicate chrome to retire:** `src/lib/components/molecules/Header.svelte` (renders `<h1>DRAFT</h1>` + a theme toggle) and `src/lib/components/atoms/Phases.svelte` (the old Lobby/Drafting/Review strip) are currently rendered **inside each page** (`+page.svelte`, `login/+page.svelte`, `draft/[id]/+page.svelte`). Once the persistent shell owns the header + tracker, those per-page `<Header>`/`<Phases>` usages are redundant. **Caution:** removing/altering them risks the existing tests and is screen-level work — Phase 8's mandate is the shell + foundation, and D-05 says existing screens stay as-is until Phase 10. **Recommendation:** in Phase 8, add the persistent shell and DO NOT touch the per-page `<Header>`/`<Phases>` (they'll render unstyled below the new header — visually doubled but harmless, consistent with the accepted D-05 interim). Defer their removal to Phase 10 to avoid touching tests this phase. Flag for planner: confirm no test asserts on the *old* header/phases text in a way the doubled render would violate (none found — see Validation).

## Font Self-Hosting (DS-01, D-08)

**Source the woff2 files** from one of (all OFL-1.1, self-hosting permitted):
- Official: https://github.com/JetBrains/JetBrainsMono (releases ship static `.woff2` per weight; or generate via `scripts/`)
- google-webfonts-helper: https://gwfh.mranftl.com/fonts/jetbrains-mono (pick weights 400/500/600/700, latin subset, "Modern Browsers" → woff2 + CSS snippet)
- Fontsource: https://fontsource.org/fonts/jetbrains-mono (npm or CDN download; offers all four weights as static woff2)

Place under `src/lib/assets/fonts/` (mirrors the existing Manrope location). Provide **four** `@font-face` blocks (one per weight, `font-style: normal`), `font-display: swap` (fast first paint — discretion D, recommended). Remove `Manrope.ttf` and its `@font-face`.

```css
/* Source: svelte/joyofcode global-styles + fontfyi @font-face guide */
@font-face {
  font-family: 'JetBrains Mono';
  src: url('$lib/assets/fonts/JetBrainsMono-Regular.woff2') format('woff2');
  font-weight: 400; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'JetBrains Mono';
  src: url('$lib/assets/fonts/JetBrainsMono-Medium.woff2') format('woff2');
  font-weight: 500; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'JetBrains Mono';
  src: url('$lib/assets/fonts/JetBrainsMono-SemiBold.woff2') format('woff2');
  font-weight: 600; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'JetBrains Mono';
  src: url('$lib/assets/fonts/JetBrainsMono-Bold.woff2') format('woff2');
  font-weight: 700; font-style: normal; font-display: swap;
}
```
Then `.cy-app { font-family: var(--cy-mono); }` (already in the ported token block) makes the whole app inherit it — no other UI font remains (DS-01). Ligatures (`font-feature-settings: "liga" 1, "calt" 1`) are optional and not required by the spec; the terminal aesthetic may or may not want them — leave default unless a screen explicitly needs them (out of scope for the shell).

## Clipboard Copy (D-09)

Use the same pattern the repo already ships (`draft/[id]/+page.svelte:89-102`): `navigator.clipboard.writeText` in `try/catch`. For the `[copy]` button, only fire when a real code exists (skip when `—`). Optional `[copied]` feedback is discretion (UI-SPEC) — the hard requirement is a successful write + keyboard-focusable `<button>`.
```svelte
<!-- Source: repo precedent draft/[id]/+page.svelte:89 + MDN Clipboard API -->
<script>
  let { code = null } = $props();
  let copied = $state(false);
  async function copyCode() {
    if (!code) return;                 // no-op when no room (—)
    try {
      await navigator.clipboard.writeText(code);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      /* clipboard unavailable / denied — silent or surface a hint */
    }
  }
</script>
<button class="cy-meta-copy" type="button" onclick={copyCode} disabled={!code}>
  {copied ? '[copied]' : '[copy]'}
</button>
```
**No-clipboard fallback:** if `navigator.clipboard` is undefined (insecure context / old browser) the `try/catch` swallows it; the button stays functional-but-inert rather than throwing. A textarea+`execCommand` fallback is unnecessary for this app's modern target (HTTPS, current browsers) — do not hand-roll one.

## Reduced-Motion (CSS-only) (FX-05, D-10)

A **CSS media query in `app.css` is sufficient** — no JS needed for the cursor. The cursor stays *visible* (not animated) under reduced motion. Port verbatim from cyber.css + UI-SPEC:
```css
/* Source: cyber.css:50-51 + UI-SPEC §Interaction */
.cy-brand-cur { color: var(--cy-lime); animation: cy-blink 1s infinite step-end; margin-left: 4px; }
@keyframes cy-blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .cy-brand-cur { animation: none; }
}
```
Declare `cy-blink` **once** at the foundation level (it's reused by the Phase-10 chat-input cursor, `cyber.css:423`). The React `useTypedLog` JS reduced-motion check (`cyber.jsx:35-57`) is only for the *typed logs* (Phase 9, FX-03) — not needed in Phase 8. The shell's blink is pure CSS.

## Common Pitfalls

### Pitfall 1: `.prettierrc` left referencing Tailwind → lint/CI failure
**What goes wrong:** `npm run lint` (`prettier --check .`) crashes loading the uninstalled `prettier-plugin-tailwindcss`, or warns on the dangling `tailwindStylesheet: ./src/routes/layout.css` (deleted file).
**Why:** CONTEXT/UI-SPEC enumerate only 3 Tailwind wiring points; `.prettierrc` is the 4th.
**How to avoid:** Edit `.prettierrc` in the same commit as the dep removal (remove the plugin + the `tailwindStylesheet` key).
**Warning signs:** `npm run lint` errors `Cannot find package 'prettier-plugin-tailwindcss'`.

### Pitfall 2: Removing Tailwind plugin breaks vitest builds
**What goes wrong:** Forgetting that both vitest projects `extends: './vite.config.js'`.
**Why:** If the plugin were referenced elsewhere it'd half-break. It isn't — but verify.
**How to avoid:** The single `vite.config.js` edit covers both projects. After it, run `npm run test -- --run` and confirm both `client` and `server` projects boot.
**Warning signs:** Vitest "failed to resolve `@tailwindcss/vite`" → a stale import remained.

### Pitfall 3: Snapshot shape drift via the shell
**What goes wrong:** Trying to thread `phase`/`code` into the shell by adding a field to the lobby/draft snapshot.
**Why:** Convenience temptation; the snapshot is frozen and 130 tests + the realtime layer depend on its exact shape.
**How to avoid:** Derive read-only from `page.params.id` + the existing `.phase`. Add nothing to the snapshot. The `draftSnapshot.test.js` shape tests (currently `it.todo` stubs) and `room.spec.js`/`draft.spec.js` must stay green.
**Warning signs:** Any edit under `src/live/` or `src/lib/server/` in this phase is a red flag — Phase 8 should not touch them.

### Pitfall 4: `$app/state` `page` read at the wrong time on the server
**What goes wrong:** Reading `page.params` outside rendering on the server, or using legacy `$:` reactivity.
**Why:** `page` exposes runes only client-side; values are read during render on the server. Legacy `$:` never updates.
**How to avoid:** Use `const code = $derived(page.params.id ?? null)` inside the component (this is the documented, supported pattern for layouts). Don't read `page` in a `load`/module scope.
**Warning signs:** `code` stuck at initial value after navigation, or SSR errors about reading page state.

### Pitfall 5: Doubled header (new shell + old per-page `<Header>`)
**What goes wrong:** The persistent shell header renders, and each page still renders the old `<Header>`/`<Phases>`, producing two headers.
**Why:** Old chrome lives inside pages, not the layout.
**How to avoid:** Accept the visual doubling as part of the D-05 unstyled interim (recommended — keeps tests untouched), OR if the planner chooses to remove the per-page `<Header>` now, re-check the login/draft page tests (they don't assert header text — verified) before doing so. Recommend **defer to Phase 10**.
**Warning signs:** Two "DRAFT…" wordmarks on screen — expected/acceptable interim, not a bug this phase.

### Pitfall 6: Approximated token values
**What goes wrong:** Re-typing hex/glow/gradient values and dropping the `80` alpha suffix or rounding `rgba(196,75,255,0.04)`.
**Why:** Manual transcription error.
**How to avoid:** Copy the token block + `.cy-scanlines` + gradients **verbatim** from `cyber.css:2-37`. Use the UI-SPEC "Verbatim-Port Checklist" as the gate.
**Warning signs:** Glows look flat / scanlines invisible or too strong.

## Code Examples

### Token block — port verbatim (cyber.css:2-27)
```css
/* Source: design_handoff_pickban_cyber/prototype/variants/cyber.css:2-27 */
.cy-app {
  --cy-bg: #050409; --cy-bg-2: #0a0814; --cy-bg-3: #110d22;
  --cy-line: #2a1f4a; --cy-line-2: #4a3580;
  --cy-text: #e8e0ff; --cy-text-2: #9080c0; --cy-text-3: #5a4880;
  --cy-lime: #b3ff3d; --cy-lime-glow: 0 0 12px #b3ff3d80;
  --cy-violet: #c44bff; --cy-violet-glow: 0 0 12px #c44bff80;
  --cy-amber: #ffaa00; --cy-red: #ff2255;
  --cy-mono: "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace;
  background: var(--cy-bg); color: var(--cy-text); font-family: var(--cy-mono);
  width: 100%; height: 100%;
  display: flex; flex-direction: column; overflow: hidden; position: relative;
  background-image:
    radial-gradient(ellipse at top, #1a0f2a, transparent 60%),
    radial-gradient(ellipse at bottom right, #1a0a30, transparent 60%);
}
```

### Shell header markup — Svelte 5 port of CYChrome (cyber.jsx:153-182, D-06/D-07 applied)
```svelte
<!-- Source: cyber.jsx:153-182 reimplemented as Svelte 5; brand/tracker per D-06/D-07 -->
<script>
  import { page } from '$app/state';
  let { children } = $props();

  const TRACKER = ['lobby', 'drafting', 'review'];           // cyber.jsx:154
  const LABEL = { lobby: '01_LOBBY', drafting: '02_DRAFTING', review: '03_REVIEW' };

  const code = $derived(page.params.id ?? null);
  // phase: feed from the live lobby(code) snapshot's existing .phase (read-only),
  // or default 'lobby' when no room. See "Persistent Shell Wiring".
  let phase = $state('lobby');
  const idx = $derived(TRACKER.indexOf(phase));               // -1 → no active step (cancelled/unknown, D-07)
</script>

<div class="cy-app">
  <div class="cy-shader"></div>                               <!-- Phase 9 mount point; empty -->
  <div class="cy-scanlines"></div>
  <header class="cy-header">
    <div class="cy-brand">
      <span class="cy-brand-bracket">[</span>
      <span class="cy-brand-name">DRAFT_EM</span>
      <span class="cy-brand-bracket">]</span>
      <span class="cy-brand-cur" aria-hidden="true">▮</span>
    </div>
    <div class="cy-phases">
      {#each TRACKER as p, i (p)}
        <span class="cy-phase" class:is-active={i === idx} class:is-done={i < idx}>
          {LABEL[p]}
        </span>
      {/each}
    </div>
    <div class="cy-meta">
      <span class="cy-meta-key">$ ROOM=</span>
      <span class="cy-meta-val">{code ?? '—'}</span>
      <button class="cy-meta-copy" type="button" disabled={!code}
        onclick={() => code && navigator.clipboard?.writeText(code)}>[copy]</button>
    </div>
  </header>
  <div class="cy-body">{@render children()}</div>
</div>
```

### Scanlines + reduced-motion — port verbatim (cyber.css:34-37, 50-51)
```css
.cy-scanlines {
  position: absolute; inset: 0; pointer-events: none; z-index: 5;
  background: repeating-linear-gradient(0deg, transparent 0 2px, rgba(196, 75, 255, 0.04) 2px 3px);
}
.cy-brand-cur { color: var(--cy-lime); animation: cy-blink 1s infinite step-end; margin-left: 4px; }
@keyframes cy-blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .cy-brand-cur { animation: none; } }
```

### Svelte MCP check
Per CLAUDE.md, the implementer MUST run the Svelte MCP server before finalizing the shell component: `list-sections` → `get-documentation` for the global-styles / layout / `$app/state` / runes sections, then run `svelte-autofixer` on `CyShell.svelte` until clean. (This research used WebSearch against svelte.dev docs to confirm: global CSS belongs in root `+layout.svelte`; `{@render children()}` + `$props()` is the Svelte 5 layout pattern; `page` from `$app/state` is the rune-based way to read `page.params` reactively in a layout via `$derived`.)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `<slot />` in layout | `{@render children()}` + `let { children } = $props()` | Svelte 5 | The shell uses `{@render children()}` (repo already does) |
| `$app/stores` `$page` | `$app/state` `page` (rune, read via `$derived`) | SvelteKit 2.12 | Use `$app/state` to read `page.params.id` in the layout |
| Tailwind v3 (`tailwind.config.js` + PostCSS) | Tailwind v4 (Vite plugin, `@theme` in CSS) | TW v4 (2024) | This repo is v4 (plugin-only, no config file) — removal is plugin + CSS only |
| Google Fonts CDN | Self-hosted woff2 `@font-face` | ongoing best practice | D-08 mandates self-host; no runtime external dep |

**Deprecated/outdated:**
- `app.html` for global CSS — kills HMR; use the layout import.
- Legacy `$:` reactivity for `page.params` — never updates after initial load; use `$derived`.

## Open Questions

1. **Exact mechanism to feed `phase` into the persistent shell.**
   - What we know: the room `code` is cleanly available via `page.params.id`; the live `lobby(code)` snapshot already carries `.phase` (frozen field). The draft page subscribes to `lobby(code)` already.
   - What's unclear: whether to subscribe to the live store *inside the layout/shell* (keyed by `page.params.id`, guarding undefined/error like the draft page does) vs. passing `phase` down from each route. The layout has no `data.room` of its own.
   - Recommendation: subscribe in the shell to `lobby(code)` only when `code` exists, read `.phase`, default `'lobby'` otherwise. This keeps one persistent chrome and changes no snapshot shape. Planner has discretion (D-09 discretion note). Mark the subscription guard as a verification step.

2. **Retire vs. keep the per-page `<Header>`/`<Phases>` this phase.**
   - What we know: they're rendered inside `+page.svelte`, `login/+page.svelte`, `draft/[id]/+page.svelte`; no test asserts their text (verified by grep of spec files).
   - What's unclear: whether the doubled-header interim is acceptable to stakeholders for the Phase 8→10 window.
   - Recommendation: **keep them** (don't touch screens, per D-05) → defer removal to Phase 10. Avoids risk to tests this phase.

3. **woff2 acquisition step.**
   - What we know: three reputable OFL-1.1 sources; 4 static weights needed.
   - What's unclear: whether to vendor the files into the repo (recommended — no runtime dep) and subset to latin (smaller). 
   - Recommendation: download latin-subset static woff2 for 400/500/600/700 from google-webfonts-helper or Fontsource, commit under `src/lib/assets/fonts/`. This is a manual asset step the plan must call out explicitly (it can't be `npm install`-ed if vendored).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node + npm | Build, dep removal, tests | ✓ | (project toolchain) | — |
| Vite / SvelteKit toolchain | Build + dev | ✓ | vite ^7.3.1, kit ^2.50.2 | — |
| Vitest (+ Playwright Chromium) | 130-test gate + new shell test | ✓ | vitest ^4.1.0, playwright ^1.58.2 | — |
| JetBrains Mono woff2 files | DS-01 self-host | ✗ (not yet vendored) | — | Download from JetBrains GH / gwfh / Fontsource and commit under `src/lib/assets/fonts/` |
| `navigator.clipboard` | D-09 copy button | runtime (browser) | — | `try/catch` no-op when unavailable (insecure context); no polyfill needed |

**Missing dependencies with no fallback:** none (all blocking deps present).
**Missing dependencies with fallback:** JetBrains Mono woff2 — must be downloaded/vendored as a manual asset step (not an npm install). The plan must include this explicitly.

## Validation Architecture

Nyquist validation is **enabled** (`workflow.nyquist_validation: true`). All success criteria are verifiable via the existing vitest browser+node setup plus grep/build checks.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `^4.1.0` (config embedded in `vite.config.js`, dual projects) |
| Config file | `vite.config.js` (both `client` browser + `server` node projects `extends` it) |
| Quick run command | `npm run test:unit -- --run` (or scope to one file) |
| Full suite command | `npm run test` (= `vitest --run`, both projects) |
| Build check | `npm run build` |
| Lint check | `npm run lint` (`prettier --check .` + `eslint .`) |
| Component test deps | `vitest-browser-svelte` `render` + `vitest/browser` `page` (browser project, Playwright Chromium) |

### Phase Requirements → Test Map
| Req | Behavior | Test Type | Automated Command | File Exists? |
|-----|----------|-----------|-------------------|-------------|
| DS-03 | No `@import 'tailwindcss'` / `@theme` / `@apply` anywhere in `src` + configs | grep assertion | `! grep -rn "tailwindcss\|@apply\|@theme" src/ vite.config.js .prettierrc` | ❌ Wave 0 (script/test) |
| DS-03 | Tailwind deps absent from package.json | grep/node assertion | `! grep -n "tailwindcss" package.json` | ❌ Wave 0 |
| DS-03 | App builds with Tailwind gone | build (smoke) | `npm run build` | ✅ (existing) |
| DS-03/D-05 | All 130 tests still pass; snapshot shape unchanged | full suite | `npm run test` | ✅ (existing 130) |
| DS-01 | 4 JetBrains Mono `@font-face` (400/500/600/700) present; no Manrope | grep on app.css + file existence | `grep -c "JetBrains Mono" src/app.css` == 4; fonts exist; `! test -f src/lib/assets/fonts/Manrope.ttf` | ❌ Wave 0 |
| DS-02 | `--cy-*` tokens declared under `.cy-app` (verbatim values) | grep on app.css | `grep -n "\-\-cy-lime: #b3ff3d" src/app.css` etc. (verbatim-port checklist) | ❌ Wave 0 |
| DS-04 | Zero `border-radius` in app.css | grep assertion | `! grep -n "border-radius" src/app.css` | ❌ Wave 0 |
| DS-05 | Shell renders brand `DRAFT_EM`, the 3 tracker labels, `$ ROOM=`, `[copy]` button, scanlines | component DOM test | `CyShell.svelte.spec.js` via `render` + `page.getByText('DRAFT_EM')`, `getByText('01_LOBBY')`, `getByRole('button', {name:'[copy]'})`, `.cy-scanlines` present | ❌ Wave 0 |
| DS-05/D-07 | Active phase gets `.is-active`; `cancelled`/unknown → no active step (no crash) | component test | render shell with `phase='drafting'` → `02_DRAFTING` has `is-active`; render `phase='cancelled'` → no `.is-active`, no throw | ❌ Wave 0 |
| DS-05/D-09 | `[copy]` writes code via clipboard; disabled/no-op when no room (`—`) | component test | mock `navigator.clipboard.writeText` (vi.spyOn), click `[copy]` with code → called with code; with `code=null` → button disabled / not called, shows `—` | ❌ Wave 0 |
| FX-05/D-10 | `cy-blink` keyframe declared; suppressed under reduced motion | grep on app.css (CSS-only, JSDOM can't assert media reliably) | `grep -n "@keyframes cy-blink" src/app.css` && `grep -A1 "prefers-reduced-motion" src/app.css | grep "animation: none"` | ❌ Wave 0 |

> Note on FX-05: `prefers-reduced-motion` behavior is CSS-driven and not reliably togglable in the Vitest/Playwright unit context; assert via grep that the media query + `animation: none` exist (structural test). A manual visual check (DevTools "Emulate prefers-reduced-motion") is the human confirmation.

### Sampling Rate
- **Per task commit:** the relevant new spec (e.g. `vitest run src/lib/components/chrome/CyShell.svelte.spec.js`) + the grep assertions touched by that task.
- **Per wave merge:** `npm run test` (full 130 + new) + `npm run build` + `npm run lint`.
- **Phase gate:** full suite green + build + lint clean + grep assertions all pass before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `src/lib/components/chrome/CyShell.svelte.spec.js` — DOM tests for DS-05/D-07/D-09 (brand, tracker, active-phase mapping, copy button, scanlines). Browser project (`*.svelte.spec.js`), uses `vitest-browser-svelte` `render` + `page` queries (mirror `Welcome.svelte.spec.js`).
- [ ] A grep/assertion harness for DS-01/02/03/04/FX-05 — either a Node-project spec (`src/phase8-foundation.spec.js`) that reads `src/app.css`/`vite.config.js`/`package.json`/`.prettierrc` as strings and asserts (no Tailwind tokens, 4 font-faces, verbatim token values, no border-radius, cy-blink + reduced-motion present), or shell grep steps in the plan's verification. A Node spec is preferable so it runs in CI with the suite.
- [ ] No framework install needed — Vitest browser+node infra already covers everything. (Net dep change is removal only.)
- [ ] JetBrains Mono woff2 files vendored under `src/lib/assets/fonts/` — asset prerequisite for the DS-01 tests.

## Sources

### Primary (HIGH confidence)
- Repo source (read directly): `cyber.css`, `cyber.jsx`, `+layout.svelte`, `layout.css`, `app.html`, `vite.config.js`, `package.json`, `.prettierrc`, `svelte.config.js`, `eslint.config.js`, `src/routes/draft/[id]/+page.{svelte,server.js}`, `src/live/room.js`, component & test inventory, `src/lib/components/molecules/Header.svelte`, `src/lib/components/atoms/Phases.svelte`.
- Svelte / SvelteKit official docs (via WebSearch on svelte.dev): https://svelte.dev/docs/svelte/global-styles , https://svelte.dev/docs/kit/$app-state — global CSS in root layout; `page` rune + `$derived(page.params)` in layouts.
- npm registry (`npm view … version`, 2026-06-12) — current versions of kit/svelte/vite/vitest/tailwind/prettier-plugin-tailwindcss.
- Verified-absent: no `tailwind.config.*`, no `postcss.config.*` (glob returned no matches).

### Secondary (MEDIUM confidence)
- Global CSS in SvelteKit guidance: https://joyofcode.xyz/global-styles-in-sveltekit , https://www.closingtags.com/blog/global-css-in-sveltekit (HMR rationale for layout import).
- JetBrains Mono self-host: https://github.com/JetBrains/JetBrainsMono , https://gwfh.mranftl.com/fonts/jetbrains-mono , https://fontsource.org/fonts/jetbrains-mono ; @font-face guidance https://fontfyi.com/blog/font-face-complete-guide/ (OFL-1.1, per-weight woff2, `font-display: swap`).

### Tertiary (LOW confidence)
- None relied upon; all load-bearing claims cross-checked against repo source or official docs.

## Metadata

**Confidence breakdown:**
- Tailwind removal (4 wiring points): HIGH — all four files read directly; no config/postcss files exist (verified). `.prettierrc` is the one CONTEXT/UI-SPEC missed; confirmed present.
- Standard stack / token port: HIGH — values read verbatim from `cyber.css`; no new packages.
- Shell wiring (phase/code derivation): HIGH on `code` (`page.params.id`), MEDIUM on the exact `phase` plumbing (live-store subscribe vs. per-route prop is a discretion call; snapshot already carries `.phase` — verified).
- Font self-host: HIGH on approach, MEDIUM on exact source (3 valid OFL-1.1 sources; manual vendor step).
- Validation architecture: HIGH — maps to the existing dual-project vitest setup; grep/build/lint gates are concrete and runnable.

**Research date:** 2026-06-12
**Valid until:** 2026-07-12 (stable stack; SvelteKit/Svelte minor bumps won't change these patterns)
