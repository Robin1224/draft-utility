# Phase 11: Terminal Modals - Pattern Map

**Mapped:** 2026-08-21
**Files analyzed:** 9 new/modified files
**Analogs found:** 8 / 9 (native `<dialog>` lifecycle has no codebase analog — use RESEARCH.md Pattern 1)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/components/atoms/CyModal.svelte` (NEW) | component (wrapper) | event-driven (open/close lifecycle) | `src/lib/components/molecules/ChatPanel.svelte` (snippets + $bindable) + `cyber.jsx` 795–801 (chrome markup) | role-match (no native `<dialog>` exists yet) |
| `src/lib/components/atoms/CyModal.svelte.spec.js` (NEW) | test (browser) | request-response (render → interact → assert) | `src/lib/components/chrome/CyShell.svelte.spec.js` + `src/lib/components/effects/CyLogo.svelte.spec.js` | exact |
| `src/lib/components/molecules/LobbyHostBar.svelte` (REWORK) | component (host surface) | event-driven (callback props → frozen RPCs) | itself (derives/handlers reused verbatim) + `cyber.jsx` CYHostControls 833–907 | exact |
| `src/lib/components/molecules/LobbyHostBar.svelte.spec.js` (NEW) | test (browser) | request-response | `src/lib/components/chrome/CyShell.svelte.spec.js` | exact |
| `src/lib/components/molecules/DraftSettingsPanel.svelte` (REWORK) | component (modal body) | CRUD on local draft copy | itself (add/remove/update/drag logic) + `cyber.jsx` CYSettings 785–830 | exact |
| `src/lib/components/molecules/DraftSettingsPanel.svelte.spec.js` (REWRITE) | test (browser) | request-response | existing spec (structure) + `CyShell.svelte.spec.js` (vi.fn callbacks) | exact |
| `src/lib/components/atoms/ScriptTurnRow.svelte` (REWORK) | component (list row) | event-driven (drag + callbacks) | itself (drag wiring) + `cyber.jsx` CYScriptEditor 747–781 | exact |
| `src/routes/draft/[id]/+page.svelte` (MODIFY) | route/page | request-response (`$live` stream + RPCs) | itself — only lines 327–336 touched | exact |
| `src/app.css` (APPEND) | config/styles | — | Phase 10 append block (lines 385–715) + `cyber.css` 520–599 (verbatim source) | exact |

## Pattern Assignments

### `src/lib/components/atoms/CyModal.svelte` (component, event-driven)

**Analogs:** `ChatPanel.svelte` (snippet + $bindable conventions), `cyber.jsx` (chrome markup), RESEARCH.md Pattern 1 (dialog lifecycle — no codebase precedent; PauseOverlay uses a non-native `role="dialog"` div and is NOT the model — D-07 mandates native `<dialog>`).

**JSDoc-typed props pattern** — copy from `src/lib/components/molecules/ChatPanel.svelte` lines 10–27 (block `@type` comment on destructured `$props()` with `$bindable` default):

```javascript
/**
 * @type {{
 *   phase: string,
 *   role: 'player' | 'guest',
 *   messages?: ChatMsg[],
 *   currentUserName?: string | null,
 *   onSend: (p: { body: string }) => void,
 *   activeTab?: string
 * }}
 */
let { phase, role, messages = [], currentUserName = null, onSend, activeTab = $bindable('all') } = $props();
```

For CyModal add the snippet types: `/** @import { Snippet } from 'svelte' */` then `children: Snippet, footer?: Snippet` (RESEARCH.md Pattern 1 skeleton, lines 196–252, is the authoritative implementation reference).

**Snippet-as-prop render pattern** — copy from `src/lib/components/chrome/CyShell.svelte` line 46 (optional-chained render of implicit `children`):

```svelte
<div class="cy-body">{@render children?.()}</div>
```

and named-snippet declaration/render from `ChatPanel.svelte` lines 70 + 124: `{#snippet panelBody()}…{/snippet}` … `{@render panelBody()}`. Callers of CyModal declare `{#snippet footer()}…{/snippet}` inline the same way.

**Titlebar markup (verbatim target)** — port from `design_handoff_pickban_cyber/prototype/variants/cyber.jsx` lines 795–801:

```jsx
<div className="cy-modal-bar">
  <span className="cy-dot cy-dot-r"></span>
  <span className="cy-dot cy-dot-a"></span>
  <span className="cy-dot cy-dot-g"></span>
  <span className="cy-modal-title">~/draft/config.sh</span>
  <button className="cy-modal-x" onClick={() => setOpen(false)}>esc ✕</button>
</div>
```

Body/foot wrappers: `cy-modal-body` / `cy-modal-foot` (cyber.jsx 802, 820). The prototype's scrim-div + `stopPropagation` (cyber.jsx 793–794) maps to `<dialog>` + `e.target === dialogEl` check per RESEARCH.md Pattern 1.

**Button conventions** — every button in the codebase is `type="button"` with `onclick={handler}` (see `LobbyHostBar.svelte` lines 81–88); keep that on `cy-modal-x`.

---

### `src/lib/components/molecules/LobbyHostBar.svelte` (component, event-driven)

**Analog:** itself — `src/lib/components/molecules/LobbyHostBar.svelte` (current). The derives, payload helper, and callback wiring are FROZEN-adjacent and move unchanged into the new composition.

**Props/typedef block to keep verbatim** (lines 4–31): `LobbyMember`/`LobbySnap`/`ScriptTurn` typedefs, callback props `onKick/onMove/onStartDraft/onCancelRoom`, and `script = $bindable([])`, `timerSeconds = $bindable(30)`.

**Derives to reuse unchanged** (lines 40–52):

```javascript
const hasCaptainA = $derived(snapshot.teams.A.some((m) => m.isCaptain));
const hasCaptainB = $derived(snapshot.teams.B.some((m) => m.isCaptain));
const startDisabled = $derived(snapshot.phase !== 'lobby' || !hasCaptainA || !hasCaptainB);
const showCaptainHint = $derived(snapshot.phase === 'lobby' && (!hasCaptainA || !hasCaptainB));
const rosterForKick = $derived([
	...snapshot.teams.A.map((m) => ({ ...m, side: 'A' })),
	...snapshot.teams.B.map((m) => ({ ...m, side: 'B' }))
]);
const movableUsers = $derived([...snapshot.teams.A, ...snapshot.teams.B].filter((m) => m.userId));
```

`startDisabled` is the single `$derived` source for BOTH the slim-bar and modal-footer START_DRAFT buttons (D-02).

**Kick payload + move submit to keep verbatim** (lines 54–64):

```javascript
function kickPayload(m) {
	if (m.userId) return { userId: m.userId };
	if (m.guestId) return { guestId: m.guestId };
	return {};
}
function submitMove() {
	if (!moveUserId) return;
	onMove(moveUserId, moveTarget);
}
```

**Host-only guard** (line 67): everything — launchers AND both `<CyModal>` instances — stays inside the existing `{#if isHost}` (Pitfall 9).

**START_DRAFT button pattern** (lines 107–115) — reuse for both instances:

```svelte
<button type="button" class="cy-btn cy-btn-primary" disabled={startDisabled}
	aria-disabled={startDisabled} onclick={onStartDraft}>▶ START_DRAFT()</button>
```

**Host Console modal body markup (verbatim target)** — `cyber.jsx` CYHostControls lines 856–901: `cy-hc-section` + `cy-field-label` (`move_player`, `kick`), `cy-hc-row` with player select + `→ A`/`→ B` select (`flex: 0 0 90px`) + `EXEC`, `cy-kick-list`/`cy-kick-item` (`cy-kick-name`, `cy-kick-team` `team_{side}{isCaptain ? ' · cap' : ''}`, `cy-grow`, `cy-kick-btn` `kick()`), hint `<div class="cy-hc-hint">both teams need a captain before START_DRAFT() unlocks</div>`, footer `CANCEL_ROOM` (`cy-btn cy-btn-sm cy-btn-danger`, left) + `cy-grow` + `▶ START_DRAFT()` (`cy-btn cy-btn-primary cy-btn-sm`, disabled).

Existing selects keep their current `class="cy-input"` + `aria-label` pattern (current lines 71–80) so role-based test locators keep working.

---

### `src/lib/components/molecules/DraftSettingsPanel.svelte` (component, CRUD on draft copy)

**Analogs:** itself (script mutation logic), `cyber.jsx` CYSettings 785–830 (presentation), RESEARCH.md Pattern 4 (draft-copy semantics — new; no codebase analog for snapshot/commit).

**Script mutation handlers to keep verbatim** (current lines 14–53) — `addTurn` (nanoid(8), `{ team: 'A', action: 'ban' }` matching cyber.jsx 735), `removeTurn`, `updateTurn`, `handleDragStart/Over/Drop` splice logic:

```javascript
function addTurn() {
	script = [...script, { id: nanoid(8), team: 'A', action: 'ban' }];
}
function handleDrop(e, dropIndex) {
	e.preventDefault();
	if (dragSrcIndex === -1 || dragSrcIndex === dropIndex) return;
	const next = [...script];
	const [moved] = next.splice(dragSrcIndex, 1);
	next.splice(dropIndex, 0, moved);
	script = next;
	dragSrcIndex = -1;
}
```

The same splice body backs the new `moveUp(i)`/`moveDown(i)` for D-11 (one data path, three input methods). These handlers now mutate the **draft copy**, not the bound props — the `$bindable` pass-through (current line 10) is replaced per D-04; commit/dirty logic follows RESEARCH.md Pattern 4/5 exactly (no codebase analog exists — this is the one genuinely new state pattern).

**Stepper markup (verbatim target)** — `cyber.jsx` lines 807–814:

```jsx
<div className="cy-field">
  <span className="cy-field-label">turn_timer</span>
  <div className="cy-stepper">
    <button onClick={() => setTimer((t) => Math.max(10, t - 5))} aria-label="decrease">−</button>
    <div className="cy-stepper-val">{timer}<span>sec</span></div>
    <button onClick={() => setTimer((t) => Math.min(120, t + 5))} aria-label="increase">+</button>
  </div>
</div>
```

Note: minus glyph is `−` (U+2212). Script field label: `pick / ban order — drag ⠿ to reorder` (cyber.jsx 816). Footer: `cy-grow` spacer + `CANCEL` (`cy-btn cy-btn-sm`) + `SAVE_CONFIG()` (`cy-btn cy-btn-primary cy-btn-sm`) — cyber.jsx 820–824. Head: `> DRAFT_SETTINGS` + `// configure turn timer and the pick/ban execution order` in `cy-modal-head` (cyber.jsx 803–806).

All Tailwind utility classes in the current file (lines 58–104) are dead and get deleted — replaced by `.cy-field`, `.cy-script`, ported classes.

---

### `src/lib/components/atoms/ScriptTurnRow.svelte` (component, event-driven)

**Analogs:** itself (drag event wiring + callback props), `cyber.jsx` CYScriptEditor rows 750–777 (presentation).

**Drag wiring to keep verbatim** (current lines 17–36) — the `draggable="true"` `<li>` with local `dragging`/`dragOver` state calling `onDragStart/onDragOver/onDrop` props; `is-drag` class (cyber.css 572) replaces the Tailwind conditional classes on line 14–16.

**Row markup (verbatim target)** — `cyber.jsx` lines 758–776:

```jsx
<span className="cy-script-grip" aria-hidden="true">⠿</span>
<span className="cy-script-idx">{String(i + 1).padStart(2, "0")}</span>
<select className={r.team === "A" ? "team-a" : "team-b"} value={r.team}
  onChange={(e) => update(i, "team", e.target.value)}>
  <option value="A">TEAM_A</option>
  <option value="B">TEAM_B</option>
</select>
<select className={r.action === "ban" ? "is-ban" : "is-pick"} value={r.action} …>
  <option value="ban">ban()</option>
  <option value="pick">pick()</option>
</select>
<button className="cy-script-rm" onClick={() => remove(i)}>rm</button>
```

**Accessibility pattern to keep** — current lines 64–91: `sr-only`-style labels via `aria-label`/`<label class="sr-only">` and `aria-label="Remove turn {index + 1}"`. Keep role-name discipline: `rm` button gets `aria-label="remove turn {index + 1}"`, new D-11 buttons get `aria-label="move turn {index + 1} up/down"` with `disabled` at ends (Pitfall 4 — locators stay role-based). The `[↑]`/`[↓]` buttons style like `.cy-script-rm` and extend the grid to `18px 22px 1fr 1fr auto auto auto` (justified deviation, RESEARCH Pitfall 7).

---

### `src/routes/draft/[id]/+page.svelte` (route, request-response)

**Analog:** itself — minimal-touch modification.

**Do not change:** `handleStart` (lines 124–134, the frozen id-strip + `timerMs` conversion), `handleKick/handleMove/handleCancel` (106–143), page state `draftScript`/`timerSeconds` (34–35).

**Only touchpoint** — the LobbyHostBar invocation (lines 327–336) stays byte-identical if modal state lives inside LobbyHostBar (RESEARCH recommendation, Open Question 2):

```svelte
<LobbyHostBar
	{isHost}
	{snapshot}
	onKick={handleKick}
	onMove={handleMove}
	onStartDraft={handleStart}
	onCancelRoom={handleCancel}
	bind:script={draftScript}
	bind:timerSeconds
/>
```

The D-04 draft-copy boundary lives one level down (LobbyHostBar/DraftSettingsPanel); `bind:` at THIS level is fine — commit-on-save writes to these bindables. Optional cosmetic: banner copy `configure script via [SETTINGS]` at line 316 may become `[CONFIG]` (Open Question 3, planner's call).

---

### `src/app.css` (styles, append)

**Analog:** the Phase 10 append block, `src/app.css` lines 385–715. Copy its conventions exactly:

**Section banner + compact one-line format** (lines 385–388):

```css
/* ============ PHASE 10 — SCREEN RESKINS ============ */

/* HOME */
.cy-home { max-width: 1100px; margin: 0 auto; padding: 40px 32px 24px; }
```

Phase 11 appends `/* ============ PHASE 11 — TERMINAL MODALS ============ */` after line 715, in the same compact style, porting `cyber.css` lines 520–599 verbatim (`.cy-modal*`, `.cy-field*`, `.cy-stepper*`, `.cy-script*`, `.cy-hc-*`, `.cy-kick-*` — full source excerpted at `design_handoff_pickban_cyber/prototype/variants/cyber.css` 520–599; none of these classes exist in app.css yet, verified). Required `<dialog>` adaptations (RESEARCH Pattern 2): `padding: 0; color: inherit;` on `dialog.cy-modal`, `display: flex` moved under `dialog.cy-modal[open]`, scrim values (`rgba(5,4,9,0.78)` + `blur(2px)`, cyber.css 521–526) onto `dialog.cy-modal::backdrop`, and `animation: cy-modal-in 0.18s ease-out` applied explicitly (the prototype defines but never applies the keyframes — Assumption A1).

**Reduced-motion suppression pattern** — copy the Phase 10 trailer block, lines 710–715:

```css
/* Phase 10 reduced-motion: suppress the urgency/active pulse only (D-04);
   keep the red color shift intact so urgency stays readable without animation. */
@media (prefers-reduced-motion: reduce) {
  .cy-turn-clock.is-urgent .cy-turn-clock-num { animation: none; }
  .cy-pip.is-active { animation: none; }
}
```

Phase 11 adds its own trailing `@media (prefers-reduced-motion: reduce)` block with `dialog.cy-modal[open] { animation: none; }` and `dialog.cy-modal::backdrop { animation: none; }` (D-09). Note: the spec CSS-contract test splits on the literal string `@media (prefers-reduced-motion: reduce) {` (see CyLogo spec lines 63–66) and joins ALL such blocks, so a new separate block is compatible with that technique.

**Takeover breakpoint** — new authored CSS (no precedent; app.css currently has ZERO width media queries). Use `@media (max-width: 640px)` per RESEARCH Pattern 3/A3. Do NOT copy ChatPanel's JS `matchMedia('(max-width: 1100px)')` approach (ChatPanel.svelte 59–67) — that convention is for structure-swapping layouts; the modal takeover is CSS-only.

---

### `src/lib/components/atoms/CyModal.svelte.spec.js` + `src/lib/components/molecules/LobbyHostBar.svelte.spec.js` (tests, NEW)

**Analog:** `src/lib/components/chrome/CyShell.svelte.spec.js` — the canonical browser-spec shape.

**Imports + render + role locators** (CyShell spec lines 1–15):

```javascript
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CyShell from './CyShell.svelte';

it('renders …', async () => {
	render(CyShell, { phase: 'lobby', code: 'K7-MIRA' });
	await expect.element(page.getByRole('button', { name: '[copy]' })).toBeInTheDocument();
});
```

(`userEvent` also comes from `'vitest/browser'` — Assumption A2, verify at Wave 0.)

**Callback assertion with `vi.fn()`** (CyShell spec lines 38–45):

```javascript
const writeText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
render(CyShell, { phase: 'lobby', code: 'K7-MIRA' });
await page.getByRole('button', { name: '[copy]' }).click();
expect(writeText).toHaveBeenCalledWith('K7-MIRA');
```

Same shape for `onMove(userId, 'A')` / `onKick({ userId })` / `onStartDraft()` assertions in the LobbyHostBar spec — pass `vi.fn()` as the callback prop directly in `render(LobbyHostBar, { isHost: true, snapshot, onKick, … })`.

**Direct DOM access is accepted** (CyShell spec lines 20, 51–53): `document.querySelector('.cy-phase.is-active')` — fine for class/structure assertions that have no role.

**Disabled assertion** (CyShell spec line 35): `await expect.element(page.getByRole('button', { name: … })).toBeDisabled()` — use for dual START_DRAFT gating (D-02).

**Snapshot fixture** — build lobby snapshots inline like DraftSettingsPanel spec's `defaultScript()` factory (existing spec lines 11–24): a plain function returning `{ phase: 'lobby', teams: { A: […], B: […] } }` variants (with/without captains).

**CSS-contract reduced-motion assertion** — copy from `src/lib/components/effects/CyLogo.svelte.spec.js` lines 7–11 and 63–71 (this provider lacks `page.emulateMedia`):

```javascript
import '../../../app.css';                       // live cascade in browser context
import appCssSource from '../../../app.css?raw'; // raw source for the contract check

const reducedBlock = appCssSource
	.split('@media (prefers-reduced-motion: reduce) {')
	.slice(1)
	.join('@media (prefers-reduced-motion: reduce) {');
expect(reducedBlock).toMatch(/dialog\.cy-modal\[open\] \{\s*animation: none;/);
```

(Adjust the relative import depth: from `atoms/` it is `../../../app.css`.)

**Test fixture note:** no `.test.svelte` fixture files exist in the repo yet. For CyModal's launcher-button/focus-return tests, a tiny host fixture component (per RESEARCH Code Examples) would be the first — planner should either create `CyModalHost.test.svelte` (ensure it's excluded from any glob that treats it as a spec; the `client` project matches `*.svelte.{test,spec}.{js,ts}`, so a `.test.svelte` component file is safe) or render CyModal directly with props and drive `open` via rerender.

---

### `src/lib/components/molecules/DraftSettingsPanel.svelte.spec.js` (test, REWRITE)

**Analog:** the existing file itself — keep its structure (describe block, `defaultScript()` factory lines 11–24, count-rows-via-`getByRole('listitem')` technique lines 34–44), replace the assertions that the reskin breaks:

| Existing assertion (breaks) | Replacement |
|---|---|
| `getByRole('spinbutton', { name: /turn timer/i })` (line 29) | `getByRole('button', { name: 'decrease' })` / `'increase'` clicks + value text `30sec` in `.cy-stepper-val`; clamp tests (− at 10 stays 10, + at 120 stays 120) |
| `getByRole('button', { name: /add turn/i })` (line 54) | name `+ ADD_TURN` (still matches `/add.turn/i` if regex kept) |
| `getByRole('button', { name: 'Remove turn 1', exact: true })` (line 67) | `rm` button's `aria-label` (`remove turn 1`) |
| `document.getElementById('draft-settings-panel')` (line 83) | drop or re-anchor to new structure |

New coverage per RESEARCH Validation map: ↑/↓ reorder preserves `{id,team,action}` shape, SAVE commits / CANCEL discards (assert via `vi.fn()` or bound-prop inspection), dirty footer swap text `// discard unsaved config?` + `[DISCARD]`/`[KEEP_EDITING]`.

## Shared Patterns

### JSDoc-typed runes props (all components)
**Source:** `src/lib/components/molecules/LobbyHostBar.svelte` lines 4–31
**Apply to:** CyModal, reworked LobbyHostBar/DraftSettingsPanel/ScriptTurnRow
`@typedef` blocks for shapes, one block `/** @type {{ … }} */` over destructured `$props()`, callbacks typed inline (`onKick: (p: { userId?: string, guestId?: string }) => void`), `$bindable(default)` for two-way props. Language is JS + JSDoc (`checkJs`) — no TS files.

### Snippet composition
**Source:** `src/lib/components/molecules/ChatPanel.svelte` lines 70–131 (named `{#snippet}` + `{@render}`), `src/lib/components/chrome/CyShell.svelte` line 46 (`{@render children?.()}`)
**Apply to:** CyModal (children/footer regions) and both modal compositions in LobbyHostBar.

### Cyber button/input vocabulary (already shipped)
**Source:** `src/app.css` lines 291–370
**Apply to:** all modal controls. `cy-btn`, `cy-btn-sm`, `cy-btn-primary` (lime fill), `cy-btn-danger` (red text/border), `cy-input`, plus `.cy-grow { flex: 1 }` (line 513) and `.cy-foot` (line 491). Buttons are always `type="button"`; disabled pattern is `disabled={x} aria-disabled={x}` (LobbyHostBar 110–111).

### Reduced-motion suppression (D-09)
**Source:** `src/app.css` lines 372–383 (Phase 8 block) and 710–715 (Phase 10 block)
**Apply to:** the Phase 11 app.css append. Add a new trailing `@media (prefers-reduced-motion: reduce)` block with `animation: none;` per animated selector, with an explanatory comment, exactly like the Phase 10 trailer.

### Browser spec conventions
**Source:** `src/lib/components/chrome/CyShell.svelte.spec.js` (whole file), `src/lib/components/effects/CyLogo.svelte.spec.js` lines 1–12 + 48–72
**Apply to:** all three spec files. `page` from `'vitest/browser'`, `render` from `'vitest-browser-svelte'`, `await expect.element(...)`, `vi.fn()` for callbacks, `document.*` for classless structure, `app.css` + `app.css?raw` dual import for CSS-contract tests. Spec filename pattern `*.svelte.spec.js` routes to the `client` (Playwright chromium) project automatically.

### Verbatim design-source porting
**Source:** `design_handoff_pickban_cyber/prototype/variants/cyber.css` 520–599 and `cyber.jsx` 726–907
**Apply to:** app.css append + all modal markup. Values byte-for-byte (colors, paddings, glyphs `⠿` `−` `✕` `▶`, copy strings); documented deviations only: `<dialog>` UA neutralization, `[open]` guard, applied animation (A1), extra grid columns for ↑/↓ (Pitfall 7), 640px takeover query.

## No Analog Found

| File/Concern | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Native `<dialog>` lifecycle (`showModal`/`cancel`/`close`, `::backdrop`, veto callback) | component core of CyModal | event-driven | No `<dialog>` anywhere in `src/` (grep: zero hits). `PauseOverlay.svelte` (lines 22–28) is a non-native `role="dialog"` div with inline fixed positioning — explicitly NOT the model per D-07. Use RESEARCH.md Pattern 1 (skeleton lines 196–252) + Pattern 2 (CSS) + Pattern 5 (dirty state machine) as the authoritative reference. |
| Draft-copy snapshot/commit (`$state.snapshot` + `structuredClone`) | state pattern in Settings | CRUD | First use in codebase; RESEARCH.md Pattern 4 is the reference. |
| Width `@media` query in app.css | styles | — | app.css has none today (first is the 640px takeover); ChatPanel's JS matchMedia is the wrong tool here (CSS-only change). |

## Metadata

**Analog search scope:** `src/lib/components/**` (atoms, molecules, chrome, effects), `src/routes/draft/[id]/`, `src/app.css`, `design_handoff_pickban_cyber/prototype/variants/`
**Files scanned:** 35 component files listed; 14 read in full (LobbyHostBar, DraftSettingsPanel + spec, ScriptTurnRow, PauseOverlay, ChatPanel, CyShell + spec, CyLogo + spec, DraftReview spec, +page.svelte, app.css, cyber.css 515–599, cyber.jsx 700–910)
**Pattern extraction date:** 2026-08-21
