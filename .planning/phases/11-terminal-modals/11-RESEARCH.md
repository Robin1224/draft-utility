# Phase 11: Terminal Modals - Research

**Researched:** 2026-08-21
**Domain:** Native `<dialog>` modals in Svelte 5 (runes/snippets), Cyber CSS port, vitest-browser testing
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Bar ↔ modal split (lobby host surface)**
- **D-01:** The inline `LobbyHostBar` becomes a **slim launcher bar**: COPY_LINK (existing lobby banner behavior stays), `CONFIG()` → opens Draft Settings modal, `HOST_CONSOLE()` → opens Host Console modal, `▶ START_DRAFT()`, and the captain hint. The inline move-player selects, kick-pill list, and inline `DraftSettingsPanel` expansion are **removed from the bar** and live only inside the Host Console / Settings modals.
- **D-02:** `▶ START_DRAFT()` appears in **both** the slim bar and the Host Console modal footer. Both instances share the same disabled-until-both-captains gating from a single `$derived` source (existing `startDisabled` logic).
- **D-03:** `CANCEL_ROOM` moves to the **Host Console modal footer only** (left side, `cy-btn-danger`, per prototype) — removed from the inline bar so the destructive action isn't one stray click away in the lobby.

**Settings save semantics**
- **D-04:** Draft Settings edits a **local draft copy** of `{ script, timerSeconds }`. `SAVE_CONFIG()` commits the copy back to page state; `CANCEL` discards. No server RPC — settings still apply only at `START_DRAFT()`, so the frozen `startDraft(code, { script, timerMs })` wiring is untouched. (The current `$bindable` pass-through gets replaced by open-with-snapshot / commit-on-save.)
- **D-05:** Dismissing a **dirty** Settings modal (esc / scrim / ✕) triggers a confirm; a clean modal closes silently. Host Console has no dirty state and always closes freely.
- **D-06:** The dirty confirm is an **inline footer swap** — footer becomes `// discard unsaved config?` with `[DISCARD]` / `[KEEP_EDITING]`; pressing esc again = discard. No nested modals, no native `confirm()`.

**Dismissal & keyboard behavior**
- **D-07:** Build **one shared `CyModal.svelte`** wrapper on the **native `<dialog>` element** (`showModal()`): esc handling, focus trap, and focus-return come from the browser. The scrim is `::backdrop` styled to match `.cy-modal-scrim`. Both modals compose it (Svelte 5 snippets for bar-title/body/footer). Note: `<dialog>`'s cancel event is the interception point for the Settings dirty-check.
- **D-08:** **esc + scrim-click + ✕ all dismiss** (prototype-faithful). Settings routes every dismissal through the D-05 dirty-check first.
- **D-09:** The `cy-modal-in` entrance animation follows the established reduced-motion rule (Phase 8 D-10): under `prefers-reduced-motion: reduce` the modal appears without the translate/scale animation.

**Narrow screens & touch reorder**
- **D-10:** Below the responsive breakpoint, modals become a **full-screen takeover**: titlebar pinned top, footer pinned bottom, body scrolls. Desktop keeps the centered `.cy-modal` box with max-height scroll. (Breakpoint value: Claude's discretion, consistent with Phase 10's chat sidebar↔drawer convention.)
- **D-11:** Every script row gets **`[↑]`/`[↓]` reorder buttons** alongside the `⠿` grip — one code path that works for touch, keyboard, and mouse (HTML5 drag never fires on touch). The existing HTML5 grip-drag stays as a desktop enhancement.

**Hard constraint (carried from Phase 10 D-01): NO change to draft behavior.** The `$live/*` wiring, RPCs (`kickMember`, `movePlayer`, `startDraft`, `cancelRoom`), snapshot shape, and script data shape are FROZEN. Settings remain client-side page state sent only at `startDraft(code, { script, timerMs })` — no new server calls. Existing tests must keep passing.

### Claude's Discretion
- Exact responsive breakpoint value for the full-screen takeover (follow `cyber.css` / Phase 10 conventions).
- CSS placement per Phase 8 hybrid org: structural `.cy-modal*`, `.cy-field`, `.cy-stepper`, `.cy-script*`, `.cy-hc-*`, `.cy-kick-*` blocks ported verbatim into `src/app.css` under `.cy-app`; genuine one-offs scoped.
- Whether the slim launcher bar keeps the `[HOST_CONSOLE]` head label or gets a lighter treatment now that it's a launcher.
- Stepper ergonomics beyond clamp/step (e.g., hold-to-repeat) — optional, not required.
- What the lobby/shader does visually behind the scrim (scrim dimming alone is acceptable).

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. (Phase 12 items — access control, secondary screens — were already deferred in Phase 10's context.)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MOD-01 | Draft Settings opens as a terminal modal over the dimmed lobby with a timer stepper (10–120s, step 5) and a drag-to-reorder pick/ban script editor (add/remove turns) | CyModal `<dialog>` pattern (§Architecture Patterns), verified `.cy-stepper`/`.cy-script*` CSS inventory (§Design Source Verification), draft-copy `$state.snapshot` + `structuredClone` pattern (§Code Examples), stepper clamp logic verbatim from `cyber.jsx` ~810 |
| MOD-02 | Host Console opens as a terminal modal with move-player and kick controls plus the amber captain-gating hint; `START_DRAFT()` disabled until both teams have a captain | `.cy-hc-*`/`.cy-kick-*` CSS inventory (§Design Source Verification), existing `LobbyHostBar` derives (`hasCaptainA/B`, `startDisabled`, `rosterForKick`, `movableUsers`) reused unchanged (§Architecture Patterns), D-02 shared `$derived` gating |
</phase_requirements>

## Summary

This phase is pure view-layer work with **zero new dependencies**: build one shared `CyModal.svelte` on the native `<dialog>` element, port the verified `.cy-modal*` / `.cy-field` / `.cy-stepper` / `.cy-script*` / `.cy-hc-*` / `.cy-kick-*` CSS blocks (cyber.css lines 520–599, all confirmed present) into `src/app.css`, and recompose the existing `LobbyHostBar` / `DraftSettingsPanel` / `ScriptTurnRow` logic into two modal compositions. All the reactive logic the modals need (`startDisabled`, `rosterForKick`, `movableUsers`, add/remove/update/drag handlers) already exists and is reused unchanged — the frozen RPC wiring is untouched.

The platform research resolved every open question favorably. `::backdrop` inherits custom properties from its originating element in all evergreen browsers since early 2024 (Chrome 122 / Safari 17.4 / Firefox 120), and the scrim values are literal rgba anyway, so `::backdrop` can carry the `.cy-modal-scrim` look verbatim. The `<dialog>` `cancel` event is the dirty-check interception point per D-07; notably, Chromium's CloseWatcher force-closes on a *second* Escape without new user activation — which happens to exactly match D-06's "esc again = discard," provided the `close` event handler (not the `cancel` handler) owns discard cleanup. One genuine design-source gap surfaced: the prototype **defines** the `cy-modal-in` and `cy-fade-in` keyframes but never applies them to any element, so Phase 11 must choose the animation duration/easing itself (flagged as an assumption).

Testing is straightforward in the existing vitest-browser (Playwright chromium) project: native `showModal()` works in a real browser, `page.getByRole('dialog')` targets it, `userEvent.keyboard('{Escape}')` exercises the cancel path, and reduced-motion suppression is asserted via the established `app.css?raw` CSS-contract technique (Phase 9 precedent — this provider lacks `page.emulateMedia`). The existing `DraftSettingsPanel.svelte.spec.js` asserts a `spinbutton` (number input) that the stepper redesign removes, so that spec must be rewritten in the same plan that reskins the panel.

**Primary recommendation:** One `CyModal.svelte` (in `atoms/`) wrapping `<dialog class="cy-modal">` with `open` as `$bindable`, an `onAttemptClose` veto callback, and `title`/`children`/`footer` snippet props; both modals live inside `LobbyHostBar.svelte` so the existing derives and the page's `bind:script`/`bind:timerSeconds` wiring stay exactly where they are.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Modal open/close, focus trap, esc, scrim | Browser / Client (native `<dialog>` top layer) | — | D-07 locks native `<dialog>`; browser owns focus/esc/inert semantics |
| Draft-copy edit + dirty check + commit | Browser / Client (component state) | — | D-04 locks client-side page state; no server involvement |
| Timer clamp 10–120 step 5 | Browser / Client (stepper handlers) | API (frozen, existing) | Client UX clamp; server-side validation of `startDraft` payload already exists and is frozen |
| move-player / kick / start / cancel | API / Backend (frozen RPCs) | Client (buttons call existing handlers) | RPCs `movePlayer`/`kickMember`/`startDraft`/`cancelRoom` are FROZEN; modals only re-house existing calls |
| Captain gating (`startDisabled`) | Browser / Client (`$derived` from snapshot) | — | Pure derivation from the live lobby snapshot, already implemented in `LobbyHostBar` |
| Host-only visibility | Browser / Client (`{#if isHost}`) | API (authoritative) | UI guard only; server already rejects non-host RPC calls (frozen behavior) |

## Standard Stack

### Core

No new libraries. The phase is built entirely on already-installed packages and web platform features.

| Library / Feature | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `svelte` | ^5.51.0 (installed) | Runes, snippets-as-props, `$state.snapshot` | Already the project framework [VERIFIED: package.json] |
| Native `<dialog>` + `::backdrop` | Baseline widely available | Modal top layer, focus trap, esc, scrim | D-07 locked; Baseline since March 2022 [CITED: developer.mozilla.org/en-US/docs/Web/CSS/::backdrop] |
| `nanoid` | ^5.1.7 (installed) | Client-only ids for new script rows | Already used by `DraftSettingsPanel.addTurn` [VERIFIED: codebase grep] |
| `vitest` + `vitest-browser-svelte` + Playwright chromium | 4.1.0 / 2.0.2 (installed) | Browser-mode component specs | Existing `client` project in vite.config.js [VERIFIED: vite.config.js] |

### Supporting

| Feature | Purpose | When to Use |
|---------|---------|-------------|
| `$state.snapshot()` + `structuredClone()` | Draft copy of `{ script, timerSeconds }` on modal open | D-04 open-with-snapshot; documented Svelte pattern [CITED: svelte.dev/docs/svelte/$state] |
| Snippet props (`Snippet` type via JSDoc) | CyModal `children`/`footer` regions | D-07 composition [CITED: svelte.dev/docs/svelte/snippet] |
| `dialog` `cancel` event | Intercept esc for the dirty-check | D-05/D-06/D-07 [CITED: developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/cancel_event] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual scrim-click handler (`e.target === dialog`) | `closedby="any"` attribute (native light dismiss) | `closedby` is too new for cross-browser confidence and routes dismissal outside our veto path; manual handler is 4 lines and fully controlled [ASSUMED — `closedby` support matrix not verified this session] |
| Own `requestDismiss()` function calling `dialog.close()` | Native `dialog.requestClose()` | `requestClose()` is Baseline 2025 (newly available) — recent Safari/Firefox only; our own function is equivalent and works everywhere [CITED: developer.mozilla.org/docs/Web/API/HTMLDialogElement/requestClose] |
| Always-mounted `<dialog>` + `$effect` open/close sync | `{#if open}<dialog>` conditional mount | Conditional mount risks losing native focus-return (focus restore is tied to `close()`, not DOM removal); always-mounted is the safe pattern |

**Installation:** none — `npm install` adds nothing this phase.

## Package Legitimacy Audit

**No new packages are installed in this phase.** All work uses `svelte`, `nanoid`, and `vitest`/`vitest-browser-svelte` already present in `package.json`. slopcheck run not required; there is nothing to audit.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Design Source Verification

Both canonical refs verified on disk. Exact inventory for the verbatim port list:

### `cyber.css` (599 lines total) — blocks to port, lines 520–599 [VERIFIED: file read]

| Lines | Selector(s) | Notes |
|-------|-------------|-------|
| 521–526 | `.cy-modal-scrim` | `rgba(5,4,9,0.78)` + `backdrop-filter: blur(2px)` + grid-centering + `padding: 32px`; **adapt to `dialog.cy-modal::backdrop`** (centering/padding come from dialog UA margins instead) |
| 527 | `@keyframes cy-fade-in` | **Defined but never applied anywhere in the prototype** (grep confirmed) |
| 528–533 | `.cy-modal` | `max-width: 560px; max-height: 86%;` flex column, `--cy-bg-2` background, violet triple box-shadow |
| 534 | `@keyframes cy-modal-in` | **Defined but never applied anywhere in the prototype** — Phase 11 must pick duration/easing (see Assumptions A1) |
| 535–546 | `.cy-modal-bar`, `.cy-dot`/`-r`/`-a`/`-g`, `.cy-modal-title`, `.cy-modal-x` (+`:hover`) | Titlebar: three bordered dots, title, `esc ✕` button |
| 547–551 | `.cy-modal-body`, `.cy-modal-head h3/p`, `.cy-modal-foot` (+ `.cy-grow`) | Body scrolls (`overflow-y: auto`), lime-glow `h3`, footer top border |
| 554–555 | `.cy-field`, `.cy-field-label` | Shared field blocks |
| 558–562 | `.cy-stepper`, `.cy-stepper button` (+`:hover`), `.cy-stepper-val` (+ `span`) | 38px −/+ buttons, tabular-nums value, `sec` unit span |
| 565–585 | `.cy-script`, `.cy-script-row` (+`:hover`, `.is-drag`), `.cy-script-grip`, `.cy-script-idx`, `.cy-script-row select` (+`.is-ban`/`.is-pick`/`.team-a`/`.team-b`), `.cy-script-rm` (+`:hover`), `.cy-script-add` | Row grid is `18px 22px 1fr 1fr auto` — **D-11's ↑/↓ buttons require extra columns** (justified deviation, see Pitfall 7) |
| 588–599 | `.cy-hc-section`, `.cy-hc-row` (+ nested `.cy-field`), `.cy-kick-list`, `.cy-kick-item`, `.cy-kick-name`, `.cy-kick-team`, `.cy-kick-btn` (+`:hover`), `.cy-hc-hint` (+`::before` `"!"` badge) | Host console blocks |

None of these classes exist in `src/app.css` yet (grep confirmed) — clean append, no duplication risk. `cyber.css` contains **no width media queries at all**; the full-screen takeover query is new authored CSS.

### `cyber.jsx` behavior reference [VERIFIED: file read]

- `CYScriptEditor` (~726): rows `{ id, team, action }`, `update`/`remove`/`add` (add = `{ team:'A', action:'ban' }`), drag via index refs, zero-padded index `String(i+1).padStart(2,'0')`, grip `⠿`, options `TEAM_A/TEAM_B` and `ban()`/`pick()`, `rm` button, `+ ADD_TURN` (`cy-btn cy-btn-sm cy-script-add`).
- `CYSettings` (~785): title `~/draft/config.sh`, head `> DRAFT_SETTINGS` + `// configure turn timer and the pick/ban execution order`, stepper `Math.max(10, t-5)` / `Math.min(120, t+5)` with `aria-label="decrease"/"increase"`, label `turn_timer`, script field label `pick / ban order — drag ⠿ to reorder`, footer: `.cy-grow` spacer + `CANCEL` + `SAVE_CONFIG()` (primary).
- `CYHostControls` (~833): title `~/draft/host_console`, head `> HOST_CONSOLE` + `// root@K7-MIRA — manage rosters before launch`, `move_player` row (player select + `→ A`/`→ B` select at `flex: 0 0 90px` + `EXEC`), `kick` list (name, `team_A · cap` meta, `kick()` button), hint `both teams need a captain before START_DRAFT() unlocks`, footer: `CANCEL_ROOM` (danger, left) + `.cy-grow` + disabled `▶ START_DRAFT()` (primary).
- Prototype scrim-click closes (`onClick` on scrim, `stopPropagation` on modal) — mapped to the `e.target === dialog` technique.

## Architecture Patterns

### System Architecture Diagram

```
+page.svelte (draft/[id])                          [state owner — unchanged]
  draftScript ($state)  timerSeconds ($state)  handleStart/handleKick/handleMove/handleCancel
        │ bind:script / bind:timerSeconds / callback props (frozen wiring)
        ▼
LobbyHostBar.svelte  {#if isHost}                  [reworked: slim launcher + modal state]
  ├─ derives (unchanged): hasCaptainA/B → startDisabled, showCaptainHint,
  │                        rosterForKick, movableUsers
  ├─ slim bar: CONFIG() ──sets──> settingsOpen = true
  │            HOST_CONSOLE() ──> consoleOpen = true
  │            ▶ START_DRAFT() (disabled={startDisabled})   [captain hint]
  │
  ├─ <CyModal bind:open={settingsOpen} title="~/draft/config.sh"
  │           onAttemptClose={settingsGuard}>               ← dirty-check veto (D-05/06)
  │     body: stepper + script editor editing DRAFT COPY    ← $state.snapshot on open (D-04)
  │     footer: CANCEL / SAVE_CONFIG()  ⇄  swap: // discard unsaved config? [DISCARD]/[KEEP_EDITING]
  │     SAVE_CONFIG() ──commits──> script/timerSeconds (bound to page)
  │
  └─ <CyModal bind:open={consoleOpen} title="~/draft/host_console">
        body: move_player row → onMove · kick list → onKick · captain hint
        footer: CANCEL_ROOM → onCancelRoom · ▶ START_DRAFT() → onStartDraft (same startDisabled)

CyModal.svelte (new, atoms/)                        [dialog lifecycle owner]
  <dialog class="cy-modal"> in TOP LAYER — ::backdrop = scrim
  open ($bindable) ──$effect──> showModal()/close()
  esc ──cancel event──> onAttemptClose?() === false ? preventDefault : close
  scrim click ──click e.target===dialog──> same veto path
  ✕ button ──> same veto path
  close event ──> open = false (single source of "it closed" truth; discard cleanup hangs here)
```

### Recommended Project Structure

```
src/lib/components/
├── atoms/
│   ├── CyModal.svelte              # NEW — shared <dialog> wrapper (D-07)
│   └── ScriptTurnRow.svelte        # REWORK — Cyber classes + [↑]/[↓] buttons (D-11)
├── molecules/
│   ├── LobbyHostBar.svelte         # REWORK — slim launcher + owns both modals + modal open state
│   ├── DraftSettingsPanel.svelte   # REWORK — Settings modal body+footer content, draft-copy semantics (D-04)
│   └── DraftSettingsPanel.svelte.spec.js  # REWRITE — spinbutton asserts break (stepper has no input)
src/app.css                          # APPEND — modal/field blocks + takeover query + reduced-motion additions
```

`atoms/` is the right home for CyModal per STRUCTURE.md ("Shared UI: atoms/ or molecules/ depending on size/reuse"); `chrome/` is shell-only. [VERIFIED: .planning/codebase/STRUCTURE.md]

### Pattern 1: Always-mounted `<dialog>` driven by `$bindable` open state

**What:** Keep the `<dialog>` in the DOM permanently; sync `open` prop ↔ native state with one `$effect`; treat the native `close` event as the single source of truth for "closed."
**When to use:** CyModal core. Closing via `dialog.close()` (never DOM removal) preserves native focus-return to the launcher button.

```svelte
<!-- CyModal.svelte — pattern skeleton (JSDoc style per project conventions) -->
<script>
	/** @import { Snippet } from 'svelte' */
	/**
	 * @type {{
	 *   open?: boolean,
	 *   title: string,
	 *   onAttemptClose?: () => boolean,  // return false to veto dismissal (D-05)
	 *   children: Snippet,               // modal body
	 *   footer?: Snippet
	 * }}
	 */
	let { open = $bindable(false), title, onAttemptClose, children, footer } = $props();

	/** @type {HTMLDialogElement} */
	let dialogEl;

	$effect(() => {
		if (open && !dialogEl.open) dialogEl.showModal();
		else if (!open && dialogEl.open) dialogEl.close();
	});

	function requestDismiss() {
		if (onAttemptClose && onAttemptClose() === false) return;
		dialogEl.close();
	}
</script>

<dialog
	bind:this={dialogEl}
	class="cy-modal"
	aria-label={title}
	oncancel={(e) => {
		// esc → route through the veto (D-07: cancel is the interception point)
		if (onAttemptClose && onAttemptClose() === false) e.preventDefault();
	}}
	onclose={() => (open = false)}
	onclick={(e) => {
		// backdrop clicks target the dialog element itself; with padding:0 the
		// inner chrome covers the whole box, so target===dialog ⇒ scrim click
		if (e.target === dialogEl) requestDismiss();
	}}
>
	<div class="cy-modal-bar">
		<span class="cy-dot cy-dot-r"></span>
		<span class="cy-dot cy-dot-a"></span>
		<span class="cy-dot cy-dot-g"></span>
		<span class="cy-modal-title">{title}</span>
		<button type="button" class="cy-modal-x" onclick={requestDismiss}>esc ✕</button>
	</div>
	<div class="cy-modal-body">{@render children()}</div>
	{#if footer}
		<div class="cy-modal-foot">{@render footer()}</div>
	{/if}
</dialog>
```

Snippet-prop syntax and the `Snippet` type are per official docs [CITED: svelte.dev/docs/svelte/snippet]. Implicit declaration also works — callers can write `{#snippet footer()}…{/snippet}` directly inside `<CyModal>`.

### Pattern 2: Dialog CSS adaptation (UA-style overrides + `[open]` guard)

**What:** Port `.cy-modal` values verbatim, then add the deviations `<dialog>` requires.
**When to use:** The app.css append task. UA styles that must be explicitly neutralized: `padding: 1em`, `color: CanvasText`, `max-width/max-height: calc(100% - 6px - 2em)`, and `dialog:not([open]) { display: none }` (author styles beat UA styles regardless of specificity, so an unguarded `display: flex` would make a *closed* dialog visible).

```css
/* Source: cyber.css 528-533 adapted for native <dialog> */
dialog.cy-modal {
  width: 100%; max-width: 560px; max-height: 86%;   /* verbatim; resolves vs viewport = prototype scrim inset 0 */
  background: var(--cy-bg-2); border: 1px solid var(--cy-line-2);
  box-shadow: 0 0 0 1px rgba(196,75,255,0.15), 0 24px 80px rgba(0,0,0,0.7), inset 0 0 80px rgba(196,75,255,0.05);
  padding: 0;              /* UA default is 1em */
  color: inherit;          /* UA default is CanvasText */
  /* centering: UA `margin: auto` in the top layer — keep it */
}
dialog.cy-modal[open] {
  display: flex; flex-direction: column;            /* [open] guard — see Pitfall 1 */
  animation: cy-modal-in 0.18s ease-out;            /* keyframes verbatim from cyber.css 534; duration OURS (A1) */
}
/* Source: .cy-modal-scrim values (cyber.css 521-526) → ::backdrop */
dialog.cy-modal::backdrop {
  background: rgba(5, 4, 9, 0.78);
  backdrop-filter: blur(2px);
  animation: cy-fade-in 0.18s ease-out;             /* keyframes verbatim from cyber.css 527 */
}
```

`::backdrop` note: since Chrome 122 / Safari 17.4 / Firefox 120 (early 2024) `::backdrop` inherits custom properties from its originating element, so `var(--cy-*)` would also work (the dialog sits inside `.cy-app`) — but the scrim values are literal rgba, so no inheritance is even needed [CITED: developer.chrome.com/blog/css-backdrop-inheritance, caniuse.com/mdn-css_selectors_backdrop_inherit_from_originating_element].

Reduced-motion (D-09) — append to the existing Phase 10 suppression block in app.css, same style as `cy-pulse`:

```css
@media (prefers-reduced-motion: reduce) {
  dialog.cy-modal[open] { animation: none; }
  dialog.cy-modal::backdrop { animation: none; }
}
```

### Pattern 3: Full-screen takeover below 640px (D-10)

**What:** A plain CSS media query flips the dialog to viewport-filling; the flex column already pins bar (top) and foot (bottom) with `.cy-modal-body { overflow-y: auto }` scrolling between them.
**Breakpoint recommendation (discretionary):** `max-width: 640px`, derived from the design: 560px modal + 2×32px prototype scrim gutter = 624px — below ~640px the centered box no longer fits with its gutters. Phase 10's 1100px chat breakpoint governs a sidebar↔drawer *layout* change and lives in JS (`matchMedia`) because it swaps component structure; the modal takeover is CSS-only, so a plain `@media` block follows the "structural CSS in app.css" convention. Note this is the **first width media query in app.css** — the prototype has none.

```css
@media (max-width: 640px) {
  dialog.cy-modal {
    max-width: none; max-height: none;
    width: 100vw; height: 100dvh;   /* dvh: correct under mobile URL-bar collapse */
    margin: 0;
  }
}
```

### Pattern 4: Draft-copy editing with `$state.snapshot` (D-04)

**What:** On open, snapshot the bound page state into a local `$state` draft; edit the draft; commit on SAVE_CONFIG; dirty = semantic comparison of what `startDraft` would actually receive.

```js
// Source: svelte.dev/docs/svelte/$state — "$state.snapshot ... use with structuredClone"
// On modal open:
let draft = $state({ script: [], timerSeconds: 30 });
let base = null; // plain object, non-reactive

function openSettings() {
	base = structuredClone($state.snapshot({ script, timerSeconds }));
	draft.script = structuredClone(base.script);
	draft.timerSeconds = base.timerSeconds;
	settingsOpen = true;
}

// Dirty check — compare the SEMANTIC payload (team/action order + timer), not ids:
const canon = (s) => JSON.stringify(s.map((t) => [t.team, t.action]));
const dirty = $derived(
	draft.timerSeconds !== (base?.timerSeconds ?? draft.timerSeconds) ||
		canon(draft.script) !== canon(base?.script ?? draft.script)
);

// Commit (SAVE_CONFIG): write draft back to the $bindable pair — page wiring untouched
function save() {
	script = draft.script.map((t) => ({ ...t }));
	timerSeconds = draft.timerSeconds;
	settingsOpen = false; // effect closes the dialog; close event fires; nothing to discard
}
```

Ids are client-only (stripped before `startDraft` at `+page.svelte:128`), so comparing `[team, action]` tuples in order is exactly the "would the launch payload differ" question — reorders count, id churn doesn't. [VERIFIED: codebase read]

### Pattern 5: Dirty-dismiss state machine (D-05/D-06)

**What:** Settings tracks `confirmingDiscard` state; the CyModal `onAttemptClose` veto flips it; the footer snippet swaps content on it; the `close` event is discard.

```
dismiss attempt (esc / scrim / ✕)
  ├─ !dirty            → allow close  (clean modal closes silently)
  ├─ dirty, !confirming → veto (return false / preventDefault), confirmingDiscard = true
  │                        footer renders: // discard unsaved config? [DISCARD] [KEEP_EDITING]
  ├─ dirty, confirming  → allow close (esc again = discard)  ← D-06
  └─ [KEEP_EDITING]     → confirmingDiscard = false (footer swaps back)
close event (always) → open=false, confirmingDiscard=false; draft copy simply abandoned
```

Because Chromium may force-close on a second Escape regardless of `preventDefault` (see Pitfall 3), **discard semantics must live on the `close` event, never on the `cancel` event** — then the force-close path and the intentional-discard path converge on identical behavior, which is exactly what D-06 wants.

### Pattern 6: ↑/↓ reorder buttons alongside HTML5 drag (D-11)

**What:** `ScriptTurnRow` gains `onMoveUp(i)` / `onMoveDown(i)` callbacks (disabled at the ends: `i === 0` / `i === length-1`); the parent reuses the exact splice logic from the existing `handleDrop`. Existing drag handlers stay as-is (desktop enhancement). One data path (`script = spliced copy`), three input methods.

### Anti-Patterns to Avoid

- **Hand-rolled focus trap / esc handler / `role="dialog"` div:** D-07 explicitly picks native `<dialog>` — the browser provides focus trapping, inert background, esc, and focus return. Adding focus-trap code on top would fight the platform.
- **`{#if open}<dialog>`+`showModal` on mount:** loses guaranteed focus-return (restore is specified on `close()`, not on element removal) and re-runs entrance animation logic awkwardly. Keep the dialog mounted.
- **Discard cleanup in the `cancel` handler:** `cancel` can be skipped by Chromium (force-close, and historically not fired at all without prior dialog interaction — crbug 41484805). `close` always fires when the dialog closes; put cleanup there.
- **Unscoped `display: flex` on `.cy-modal`:** overrides the UA's `dialog:not([open]) { display:none }` (author origin wins) — the closed dialog becomes permanently visible. Always guard with `[open]`.
- **Re-binding `script`/`timerSeconds` into the modal body (`$bindable` pass-through):** D-04 replaces live binding with snapshot/commit; a `bind:` into the modal would make every keystroke instantly live and destroy dirty semantics.
- **New server calls:** everything is frozen. The modals move existing calls; they add none.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Focus trap + esc + scrim + focus return | Custom overlay div + keydown listeners + tabindex walking | Native `<dialog>.showModal()` | Browser-owned inertness/top layer covers edge cases (iframe focus, screen readers, back button on mobile as close request) — D-07 locked |
| Scrim rendering above all content | z-index management vs `.cy-scanlines` (z 5) / chat (z 4) | Top layer + `::backdrop` | Top layer paints above ALL z-indexes by definition; matches prototype layering (scrim z-20 was above scanlines too) |
| Deep clone of reactive state | Manual `{...spread}` recursion | `structuredClone($state.snapshot(x))` | Officially documented pairing; `$state.snapshot` unwraps proxies that would trip `structuredClone` [CITED: svelte.dev/docs/svelte/$state] |
| Touch reorder | Pointer-event drag simulation / dnd library | `[↑]`/`[↓]` buttons (D-11) | Locked decision; buttons are keyboard-accessible for free; HTML5 drag stays for desktop |
| Unique row ids | Counter/Math.random | `nanoid(8)` | Already the established pattern in `DraftSettingsPanel.addTurn` |

**Key insight:** every "modal infrastructure" concern in this phase has a native platform answer; the entire custom surface is ~30 lines of CyModal glue plus CSS.

## Common Pitfalls

### Pitfall 1: `display: flex` on the dialog class makes the closed dialog visible
**What goes wrong:** `.cy-modal` (prototype) sets `display: flex`. Author-origin styles beat UA styles, so this overrides `dialog:not([open]) { display: none }` — the "closed" modal renders inline permanently.
**How to avoid:** move `display: flex; flex-direction: column;` into `dialog.cy-modal[open]`.
**Warning signs:** modal content visible at the bottom of the lobby on first render.

### Pitfall 2: UA dialog styles corrupt the verbatim port
**What goes wrong:** `<dialog>` ships `padding: 1em`, `color: CanvasText` (black text), and `max-width/max-height: calc(100% - 6px - 2em)`. The 1em padding also breaks the `e.target === dialog` scrim-click check (clicks on padding count as the dialog, closing it while pointer is visually "inside" the modal).
**How to avoid:** `padding: 0; color: inherit;` and explicit `max-width: 560px; max-height: 86%;` on `dialog.cy-modal`. With `padding: 0` and the bar/body/foot children filling the full width, `e.target === dialog` is a reliable backdrop test.
**Warning signs:** black text, double padding around the titlebar, modal closing when clicking near its inner edge.

### Pitfall 3: Chromium force-closes on the second Escape (CloseWatcher user-activation rule)
**What goes wrong:** After `preventDefault()` on one `cancel` event, a second Escape without new user activation closes the dialog regardless of `preventDefault` — spec-sanctioned anti-trap behavior [CITED: issues.chromium.org/issues/351867704]. Related: `cancel` historically didn't fire at all if the user never interacted with the dialog [CITED: issues.chromium.org/issues/41484805].
**Why it's fine here:** D-06 wants "esc again = discard" — the force-close matches the desired UX **if** discard cleanup lives on `close`, not `cancel`. The never-interacted case can't be dirty, so a skipped `cancel` there is harmless (clean modals close freely per D-05).
**How to avoid:** `close` handler resets `open`, `confirmingDiscard`, and abandons the draft copy. Never assume `cancel` fired before `close`.
**Warning signs:** a dirty modal that "escapes" past the confirm leaving stale `confirmingDiscard = true` for the next open.

### Pitfall 4: Rewritten stepper breaks the existing browser spec
**What goes wrong:** `DraftSettingsPanel.svelte.spec.js` asserts `getByRole('spinbutton', { name: /turn timer/i })` and "Remove turn N" / "Add turn" button names. The Cyber redesign replaces the number input with −/+ buttons (`aria-label="decrease"/"increase"` per prototype) and renames buttons to `rm` / `+ ADD_TURN`.
**How to avoid:** rewrite the spec in the same plan/wave as the panel reskin (context explicitly allows updating it). Keep accessible names deliberate: give `rm` an `aria-label` like `remove turn N` and the stepper buttons the prototype's `decrease`/`increase` labels so locators stay role-based.
**Warning signs:** `client` project failures on `spinbutton` immediately after the reskin lands. (The frozen "130 tests" constraint refers to the node/server suite — browser component specs are expected to evolve with the UI.)

### Pitfall 5: `::backdrop` custom-property doubt
**What goes wrong:** older guidance says `::backdrop` inherits nothing, so `var(--cy-*)` inside it silently resolves to nothing on old engines.
**Reality:** spec changed; Chrome 122 / Safari 17.4 / Firefox 120 (all early 2024) inherit from the originating element [CITED: developer.chrome.com/blog/css-backdrop-inheritance]. Moot anyway: the scrim is literal `rgba(5,4,9,0.78)` + `blur(2px)` — port literals and there is zero inheritance surface.
**How to avoid:** keep `::backdrop` free of `var()`.

### Pitfall 6: Entrance animation was never wired in the prototype
**What goes wrong:** a "verbatim port" of cyber.css 520–599 yields keyframes that nothing uses — silently failing D-09's requirement that the animation exists.
**How to avoid:** explicitly apply `animation: cy-modal-in …` on `dialog.cy-modal[open]` (re-triggers on every `showModal()` since the element re-enters layout from `display:none`). Duration/easing are Phase 11's choice — recommend `0.18s ease-out` (short, terminal-snappy, consistent with the small 10px translate) and mirror `cy-fade-in` on `::backdrop`. Flagged as Assumption A1.

### Pitfall 7: D-11 buttons change the script-row grid
**What goes wrong:** `.cy-script-row` is `grid-template-columns: 18px 22px 1fr 1fr auto`; adding `[↑]` `[↓]` buttons overflows the `auto` cell or wraps badly.
**How to avoid:** extend to `18px 22px 1fr 1fr auto auto auto` (or wrap the three action buttons in one `auto` flex cell). Document as a justified deviation from verbatim in the plan. Style ↑/↓ like `.cy-script-rm` (same border/hover language). On the takeover width, verify the row still fits — selects are `1fr` and shrink.

### Pitfall 8: Scroll chaining behind the modal
**What goes wrong:** wheel/touch scrolling over the backdrop can chain to the page's scroll container (`.cy-body`) since the dialog's DOM ancestors include it.
**How to avoid:** `overscroll-behavior: contain;` on `.cy-modal-body` (and the app shell already has `overflow: hidden` on `.cy-app`, so exposure is minimal). Low severity. [ASSUMED — engine-specific chaining behavior not tested this session]

### Pitfall 9: Losing the host-only guard or the frozen wiring during the bar split
**What goes wrong:** moving kick/move UI into a modal component can accidentally (a) render launchers/modals for non-hosts, or (b) change callback signatures (`onKick({ userId | guestId })`, `onMove(userId, toTeam)`).
**How to avoid:** keep everything inside `LobbyHostBar`'s existing `{#if isHost}`; pass the existing handlers through unchanged; keep `kickPayload()` as-is. The page-level invocation (`+page.svelte` ~327) should not need to change at all.

## Code Examples

### Testing dialogs in vitest-browser-svelte (Playwright chromium)

```js
// Pattern verified against existing project conventions (DraftSettingsPanel.svelte.spec.js
// imports `page` from 'vitest/browser'; vitest 4 exposes userEvent there too).
import { page, userEvent } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CyModalHost from './CyModalHost.test.svelte'; // tiny fixture: button + <CyModal>

it('opens as a modal dialog and closes on esc', async () => {
	render(CyModalHost, { title: '~/draft/config.sh' });

	await page.getByRole('button', { name: 'CONFIG()' }).click();
	// native <dialog> opened via showModal() has implicit role="dialog"
	const dialog = page.getByRole('dialog');
	await expect.element(dialog).toBeVisible();

	await userEvent.keyboard('{Escape}');
	await expect.element(dialog).not.toBeVisible(); // closed dialog is display:none, still in DOM
});

it('returns focus to the launcher on close', async () => {
	render(CyModalHost, { title: '~/draft/config.sh' });
	const launcher = page.getByRole('button', { name: 'CONFIG()' });
	await launcher.click();
	await userEvent.keyboard('{Escape}');
	// direct DOM access is an accepted pattern in this suite (see DraftSettingsPanel spec)
	expect(document.activeElement?.textContent).toContain('CONFIG()');
});
```

Notes for the planner:
- Real chromium: `showModal()`, top layer, `cancel`/`close` events all behave natively (no jsdom caveats).
- Scrim-click test: dispatch a click on the dialog element itself (`dialogEl.click()` hits target===dialog) or click at backdrop coordinates via `page` — the former is more deterministic.
- Reduced-motion (D-09) cannot be emulated (no `page.emulateMedia` in this provider — Phase 9 precedent); assert via the CSS-contract technique: `import css from '../../app.css?raw'` and regex that the reduced-motion block contains `dialog.cy-modal[open] { animation: none; }` (mirror `CyLogo.svelte.spec.js`'s approach).
- Dirty-confirm test: edit stepper → `{Escape}` → assert footer text `// discard unsaved config?` and buttons `[DISCARD]`/`[KEEP_EDITING]` → `{Escape}` again → dialog closed and page state unchanged.

### Stepper (verbatim behavior from cyber.jsx ~810)

```svelte
<div class="cy-field">
	<span class="cy-field-label">turn_timer</span>
	<div class="cy-stepper">
		<button type="button" aria-label="decrease"
			onclick={() => (draft.timerSeconds = Math.max(10, draft.timerSeconds - 5))}>−</button>
		<div class="cy-stepper-val">{draft.timerSeconds}<span>sec</span></div>
		<button type="button" aria-label="increase"
			onclick={() => (draft.timerSeconds = Math.min(120, draft.timerSeconds + 5))}>+</button>
	</div>
</div>
```

Note the minus glyph is `−` (U+2212), not hyphen — copy from the prototype. If page state can ever hold an off-grid value, clamping on open (`Math.min(120, Math.max(10, round-to-5))`) keeps the invariant; current defaults (30s) are on-grid.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| div-overlay modals + focus-trap libs | Native `<dialog>` + top layer | Baseline widely available since 2022 | D-07's choice is the modern default; no library needed |
| `::backdrop` inherits nothing | `::backdrop` inherits from originating element | Chrome 122 / Safari 17.4 / Firefox 120 (early 2024) | `var(--cy-*)` in `::backdrop` is safe in evergreens (unneeded here) |
| `dialog.close()` only | `dialog.requestClose()` (fires cancelable `cancel`) | Baseline 2025 (newly available) | Too new to rely on; our own `requestDismiss()` is equivalent |
| JS light-dismiss handlers | `closedby="any"` attribute | Chromium 2025+, cross-browser status immature | Keep the manual `e.target === dialog` handler this phase |

**Deprecated/outdated:** none relevant. No libraries to version-check — zero new dependencies.

## Project Constraints (from CLAUDE.md)

- **Language:** JavaScript with JSDoc (`checkJs`) — CyModal and reworked components use `/** @type {...} */ $props()` typedefs, `@import { Snippet } from 'svelte'` JSDoc import for snippet props.
- **Svelte MCP server mandated** for Svelte questions and `svelte-autofixer` before finalizing Svelte code. The MCP tools were not exposed in this research agent's environment; findings were cited from official svelte.dev docs instead. **Planner: instruct executors to run `svelte-autofixer` on every new/modified `.svelte` file** (the tool is available in the main session).
- **Tooling:** prettier (tabs, single quotes, printWidth 100) + eslint must pass (`npm run lint`); vitest for tests; Tailwind is gone (DS-03) — the dead Tailwind classes still in `DraftSettingsPanel`/`ScriptTurnRow` get deleted by this reskin, closing that remnant.
- **Playground-link tool:** never for code written into the project — not applicable.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `cy-modal-in`/`cy-fade-in` duration+easing chosen by us (`0.18s ease-out` recommended) since the prototype defines but never applies the keyframes | Patterns 2, Pitfall 6 | Cosmetic only; any short duration satisfies D-09 |
| A2 | `userEvent` is importable from `'vitest/browser'` in vitest 4.1 (existing spec imports `page` from there) | Code Examples | Trivial fix at Wave 0: adjust import path per vitest 4 docs |
| A3 | 640px takeover breakpoint (derived: 560px modal + 2×32px gutters = 624px) | Pattern 3 | Discretionary per D-10; one-line CSS change |
| A4 | Scroll chaining from backdrop to `.cy-body` is possible in some engines; `overscroll-behavior: contain` guard suggested | Pitfall 8 | Cosmetic; guard is one declaration |
| A5 | Playwright headless chromium delivers Escape through CloseWatcher so `cancel` fires in tests | Code Examples | If flaky, test the veto path by calling the ✕/scrim path instead; esc coverage becomes manual |

## Open Questions

1. **Does the slim launcher bar keep the `[HOST_CONSOLE]` head label?** (explicitly Claude's discretion) — Recommendation: keep `.cy-host-panel`/`.cy-host-row` shell and the amber head label; it reads as the console *launcher* and reuses shipped Phase 10 CSS with zero new classes. Planner may decide otherwise; no research blocker.
2. **Where does modal open-state live — `LobbyHostBar` or the page?** CONTEXT says planner's call. Research recommendation: `LobbyHostBar` (it already owns `settingsOpen` and every derive both modals need; the page's frozen invocation then needs no changes). No downside found.
3. **Lobby banner copy `configure script via [SETTINGS]`** references the old inline panel; `CONFIG()` is the new launcher name. Cosmetic string in `+page.svelte:316` — planner may align it or leave it (not covered by MOD-01/02 acceptance).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node / npm | build + tests | ✓ (used by Phases 8–10) | per repo | — |
| Playwright chromium | `client` vitest project | ✓ (existing browser specs run) | playwright ^1.58.2 | — |
| svelte 5 / vitest 4 / vitest-browser-svelte | components + specs | ✓ | 5.51 / 4.1 / 2.0.2 | — |

**Missing dependencies with no fallback:** none. No external services, no new packages — this phase is code/CSS only.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0, browser mode via `@vitest/browser-playwright` (chromium, headless) + node project |
| Config file | `vite.config.js` (projects: `client` = `src/**/*.svelte.{test,spec}.{js,ts}`, `server` = other specs) |
| Quick run command | `npx vitest run <file>` (project auto-selected by filename pattern) |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MOD-01 | Settings opens as `role=dialog` over lobby; esc/scrim/✕ dismiss | browser | `npx vitest run src/lib/components/atoms/CyModal.svelte.spec.js` | ❌ Wave 0 |
| MOD-01 | Stepper clamps 10–120 step 5 (− at 10 stays 10, + at 120 stays 120) | browser | `npx vitest run src/lib/components/molecules/DraftSettingsPanel.svelte.spec.js` | ✅ exists, **rewrite required** (spinbutton asserts break — Pitfall 4) |
| MOD-01 | ↑/↓ reorder + add/remove preserve `{id,team,action}` shape; SAVE commits, CANCEL/esc discards; dirty footer swap (D-05/06) | browser | same spec file | ✅ exists, rewrite/extend |
| MOD-02 | Host Console modal: move-player calls `onMove(userId, team)`, kick calls `onKick(payload)`, amber hint renders when a captain is missing | browser | `npx vitest run src/lib/components/molecules/LobbyHostBar.svelte.spec.js` | ❌ Wave 0 |
| MOD-02 | `START_DRAFT()` disabled in BOTH bar and modal footer until both captains (D-02) | browser | same LobbyHostBar spec | ❌ Wave 0 |
| D-09 | Reduced-motion suppresses `cy-modal-in`/backdrop animation | node (CSS contract via `app.css?raw`) or browser | included in CyModal spec | ❌ Wave 0 |
| Frozen constraint | Server/node suite stays green (130 tests) | unit (existing) | `npm run test` | ✅ |

### Sampling Rate
- **Per task commit:** `npx vitest run <touched spec file>`
- **Per wave merge:** `npm run test` + `npm run lint`
- **Phase gate:** `npm run test` fully green (both projects) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/components/atoms/CyModal.svelte.spec.js` — dialog open/esc/scrim/✕/focus-return/veto (MOD-01/02 shared)
- [ ] `src/lib/components/molecules/LobbyHostBar.svelte.spec.js` — launcher buttons, modal contents, move/kick callbacks, dual START_DRAFT gating (MOD-02)
- [ ] Rewrite `src/lib/components/molecules/DraftSettingsPanel.svelte.spec.js` — stepper/script-editor/draft-copy semantics (MOD-01); the current spinbutton-based assertions are guaranteed-red against the reskin
- Framework install: none needed

## Security Domain

UI-only phase; no new endpoints, storage, or auth surface. `security_enforcement` treated as enabled (absent from config).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Unchanged (better-auth, frozen) |
| V3 Session Management | no | Unchanged |
| V4 Access Control | yes (minor) | `{#if isHost}` is a UI convenience only — authoritative host checks live server-side in the frozen RPCs (`kickMember`/`movePlayer`/`startDraft`/`cancelRoom`); the phase must not weaken or rely on the client guard |
| V5 Input Validation | yes (minor) | Stepper clamp + select-constrained team/action values are client UX; server-side `startDraft` payload validation is existing/frozen. No free-text inputs added |
| V6 Cryptography | no | — |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Non-host invoking host RPCs via console | Elevation of privilege | Already mitigated server-side (frozen); phase adds no new RPC surface |
| XSS via player display names in kick list | Tampering | Svelte auto-escapes `{m.displayName}` text interpolation — do not introduce `{@html}` |

## Sources

### Primary (HIGH confidence)
- `design_handoff_pickban_cyber/prototype/variants/cyber.css` (lines 520–599 read in full) and `cyber.jsx` (`CYScriptEditor` 726, `CYSettings` 785, `CYHostControls` 833) — class inventory, behaviors, copy strings
- Codebase reads: `src/app.css`, `LobbyHostBar.svelte`, `DraftSettingsPanel.svelte(+spec)`, `ScriptTurnRow.svelte`, `src/routes/draft/[id]/+page.svelte`, `vite.config.js`, `package.json`, `.planning/codebase/{CONVENTIONS,STRUCTURE,TESTING}.md`
- svelte.dev/docs/svelte/snippet — snippet props, `Snippet` type, implicit/optional snippets
- svelte.dev/docs/svelte/$state — `$state.snapshot` + `structuredClone` pairing
- developer.mozilla.org — `::backdrop`, `HTMLDialogElement` `cancel` event, `requestClose()`

### Secondary (MEDIUM confidence)
- developer.chrome.com/blog/css-backdrop-inheritance + caniuse (mdn-css_selectors_backdrop_inherit_from_originating_element) — `::backdrop` inheritance shipped Chrome 122 / Safari 17.4 / Firefox 120
- issues.chromium.org/issues/351867704 — second-Escape force-close (CloseWatcher user-activation)
- issues.chromium.org/issues/41484805 — `cancel` not fired without prior dialog interaction (historical Chromium behavior)

### Tertiary (LOW confidence)
- `closedby` attribute maturity — not verified this session; recommended against regardless

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies; everything verified installed
- Design source / port list: HIGH — every class block read from disk with line numbers
- `<dialog>` platform behavior: HIGH for core lifecycle (MDN); MEDIUM for CloseWatcher edge cases (Chromium tracker, aligns with desired UX either way)
- Testing approach: HIGH for pattern (existing specs prove the harness); MEDIUM on `userEvent` import path (A2, trivially verified at Wave 0)
- Pitfalls: HIGH — dominated by well-documented UA-style and cascade-origin facts

**Research date:** 2026-08-21
**Valid until:** ~2026-09-21 (stable domain: native platform APIs + frozen internal wiring)
