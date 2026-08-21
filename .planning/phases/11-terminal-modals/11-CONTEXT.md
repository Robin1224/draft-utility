# Phase 11: Terminal Modals - Context

**Gathered:** 2026-08-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Reskin the host's two pre-launch configuration surfaces as **Cyber terminal modals over the dimmed lobby**:

1. **Draft Settings** (`~/draft/config.sh`) — timer stepper clamped **10–120s in steps of 5** + drag-to-reorder pick/ban **script editor** (add/remove turns), preserving the existing script data shape `{ id, team: 'A'|'B', action: 'pick'|'ban' }` (id stripped before `startDraft`).
2. **Host Console** (`~/draft/host_console`) — working **move-player** and **kick** controls plus the **amber captain-gating hint**; `▶ START_DRAFT()` stays disabled until both teams have a captain.

Both use the prototype's `.cy-modal` anatomy: scrim, titlebar (three dots + `~/draft/…` title + `esc ✕`), head (`> HEADING` + `// comment`), body, footer. Requirements covered: **MOD-01, MOD-02**.

**Hard constraint (carried from Phase 10 D-01): NO change to draft behavior.** The `$live/*` wiring, RPCs (`kickMember`, `movePlayer`, `startDraft`, `cancelRoom`), snapshot shape, and script data shape are FROZEN. Settings remain client-side page state sent only at `startDraft(code, { script, timerMs })` — no new server calls. Existing tests must keep passing.

**Out of scope (Phase 12):** Connecting/Loading screen, Guest Gate (403), Room Cancelled (SIGKILL), public/private gating, host "open spectating" toggle (SCR-01/02, ACC-01..04).

</domain>

<decisions>
## Implementation Decisions

### Bar ↔ modal split (lobby host surface)
- **D-01:** The inline `LobbyHostBar` becomes a **slim launcher bar**: COPY_LINK (existing lobby banner behavior stays), `CONFIG()` → opens Draft Settings modal, `HOST_CONSOLE()` → opens Host Console modal, `▶ START_DRAFT()`, and the captain hint. The inline move-player selects, kick-pill list, and inline `DraftSettingsPanel` expansion are **removed from the bar** and live only inside the Host Console / Settings modals.
- **D-02:** `▶ START_DRAFT()` appears in **both** the slim bar and the Host Console modal footer. Both instances share the same disabled-until-both-captains gating from a single `$derived` source (existing `startDisabled` logic).
- **D-03:** `CANCEL_ROOM` moves to the **Host Console modal footer only** (left side, `cy-btn-danger`, per prototype) — removed from the inline bar so the destructive action isn't one stray click away in the lobby.

### Settings save semantics
- **D-04:** Draft Settings edits a **local draft copy** of `{ script, timerSeconds }`. `SAVE_CONFIG()` commits the copy back to page state; `CANCEL` discards. No server RPC — settings still apply only at `START_DRAFT()`, so the frozen `startDraft(code, { script, timerMs })` wiring is untouched. (The current `$bindable` pass-through gets replaced by open-with-snapshot / commit-on-save.)
- **D-05:** Dismissing a **dirty** Settings modal (esc / scrim / ✕) triggers a confirm; a clean modal closes silently. Host Console has no dirty state and always closes freely.
- **D-06:** The dirty confirm is an **inline footer swap** — footer becomes `// discard unsaved config?` with `[DISCARD]` / `[KEEP_EDITING]`; pressing esc again = discard. No nested modals, no native `confirm()`.

### Dismissal & keyboard behavior
- **D-07:** Build **one shared `CyModal.svelte`** wrapper on the **native `<dialog>` element** (`showModal()`): esc handling, focus trap, and focus-return come from the browser. The scrim is `::backdrop` styled to match `.cy-modal-scrim`. Both modals compose it (Svelte 5 snippets for bar-title/body/footer). Note: `<dialog>`'s cancel event is the interception point for the Settings dirty-check.
- **D-08:** **esc + scrim-click + ✕ all dismiss** (prototype-faithful). Settings routes every dismissal through the D-05 dirty-check first.
- **D-09:** The `cy-modal-in` entrance animation follows the established reduced-motion rule (Phase 8 D-10): under `prefers-reduced-motion: reduce` the modal appears without the translate/scale animation.

### Narrow screens & touch reorder
- **D-10:** Below the responsive breakpoint, modals become a **full-screen takeover**: titlebar pinned top, footer pinned bottom, body scrolls. Desktop keeps the centered `.cy-modal` box with max-height scroll. (Breakpoint value: Claude's discretion, consistent with Phase 10's chat sidebar↔drawer convention.)
- **D-11:** Every script row gets **`[↑]`/`[↓]` reorder buttons** alongside the `⠿` grip — one code path that works for touch, keyboard, and mouse (HTML5 drag never fires on touch). The existing HTML5 grip-drag stays as a desktop enhancement.

### Claude's Discretion
- Exact responsive breakpoint value for the full-screen takeover (follow `cyber.css` / Phase 10 conventions).
- CSS placement per Phase 8 hybrid org: structural `.cy-modal*`, `.cy-field`, `.cy-stepper`, `.cy-script*`, `.cy-hc-*`, `.cy-kick-*` blocks ported verbatim into `src/app.css` under `.cy-app`; genuine one-offs scoped.
- Whether the slim launcher bar keeps the `[HOST_CONSOLE]` head label or gets a lighter treatment now that it's a launcher.
- Stepper ergonomics beyond clamp/step (e.g., hold-to-repeat) — optional, not required.
- What the lobby/shader does visually behind the scrim (scrim dimming alone is acceptable).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 11 design source (visual/structure reference — restyle TO match, per Phase 10 D-01)
- `design_handoff_pickban_cyber/prototype/variants/cyber.jsx` — `CYScriptEditor` (~725: script rows, grip, selects, `rm`, `+ ADD_TURN`), `CYSettings` (~784: modal anatomy, `turn_timer` stepper, footer `CANCEL`/`SAVE_CONFIG()`), `CYHostControls` (~832: `move_player` row + `EXEC`, kick list `kick()`, captain hint, footer `CANCEL_ROOM` + disabled `▶ START_DRAFT()`).
- `design_handoff_pickban_cyber/prototype/variants/cyber.css` — `.cy-modal-scrim`/`.cy-modal`/`cy-modal-in`/bar/dots/title/x/body/head/foot (~521–551), plus the shared field blocks (`.cy-field`, `.cy-stepper`, `.cy-script*`, `.cy-hc-*`, `.cy-kick-*`) below ~553. Port values verbatim into `.cy-app` scope.

### Foundation already shipped (do NOT contradict)
- `.planning/phases/10-core-screen-reskins/10-CONTEXT.md` — D-01 restyle-in-place + frozen `$live` wiring; hybrid CSS org; motion-safety.
- `.planning/phases/08-cyber-foundation-app-shell/08-CONTEXT.md` — plain CSS, `.cy-app` token scope, verbatim values, zero border-radius, `cy-blink`, reduced-motion suppression (D-10).
- `src/app.css` — existing `.cy-*` foundation incl. Phase 10 screen blocks and the reduced-motion block. Phase 11 APPENDS the modal/field blocks; do not duplicate.

### Code being reworked in this phase
- `src/lib/components/molecules/LobbyHostBar.svelte` — current inline host bar (move/kick/CONFIG toggle/CANCEL/START_DRAFT + captain hint) → slim launcher (D-01..03).
- `src/lib/components/molecules/DraftSettingsPanel.svelte` — current inline panel, still wearing dead Tailwind classes; becomes the Settings modal body (D-04).
- `src/lib/components/atoms/ScriptTurnRow.svelte` — HTML5 drag row; gains `[↑]`/`[↓]` (D-11) and Cyber styling.
- `src/routes/draft/[id]/+page.svelte` — owns `draftScript`/`timerSeconds` page state and `startDraft(code, { script, timerMs })` (~line 127); lobby branch composes `LobbyHostBar` (~327). Wiring stays; only the bind flow changes per D-04.

### Project guardrails
- `.planning/REQUIREMENTS.md` — MOD-01/MOD-02 acceptance text; frozen realtime/snapshot constraint; test suite must stay green.
- `.planning/codebase/CONVENTIONS.md`, `STRUCTURE.md`, `TESTING.md` — Svelte 5 runes/JSDoc conventions, atoms/molecules layout, vitest browser+node projects.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LobbyHostBar.svelte` already computes `hasCaptainA/B`, `startDisabled`, `showCaptainHint`, `rosterForKick`, `movableUsers` via `$derived` — all reusable inside the Host Console modal unchanged.
- `DraftSettingsPanel.svelte` + `ScriptTurnRow.svelte` already implement add/remove/update/drag-reorder with the correct script shape — the logic ports into the modal body; only presentation and the draft-copy boundary change.
- Existing `.cy-btn`, `.cy-btn-sm`, `.cy-btn-danger`, `.cy-btn-primary`, `.cy-input`, `.cy-grow`, `.cy-foot` classes (Phase 10) cover most modal controls.
- `DraftSettingsPanel.svelte.spec.js` exists — update alongside the rework rather than writing specs from scratch.

### Established Patterns
- Svelte 5 runes + JSDoc typedefs throughout; callbacks passed down as `onKick`/`onMove`/`onStartDraft`/`onCancelRoom` props from the draft page.
- Settings are page-local state (`draftScript`, `timerSeconds`) sent once at `startDraft` — keep this boundary; D-04 only moves *when* edits reach page state.
- Hybrid CSS org: structural `.cy-*` in `src/app.css` under `.cy-app`; scoped styles for one-offs.

### Integration Points
- `src/routes/draft/[id]/+page.svelte` lobby branch: `<LobbyHostBar isHost snapshot onKick onMove onStartDraft onCancelRoom bind:script bind:timerSeconds />` — modal open/close state can live in `LobbyHostBar` (like today's `settingsOpen`) or the page; planner's call.
- New `CyModal.svelte` belongs in `src/lib/components/` (likely `atoms/` or a new shared spot consistent with STRUCTURE.md; chrome/ is for shell).
- Host-only rendering guard (`{#if isHost}`) must wrap the launchers and both modals — guests/players never see them.

</code_context>

<specifics>
## Specific Ideas

- Modal titlebar: three bordered dots (red/amber/lime), `~/draft/config.sh` / `~/draft/host_console` titles, `esc ✕` close button — verbatim from the prototype.
- Settings head: `> DRAFT_SETTINGS` + `// configure turn timer and the pick/ban execution order`; Console head: `> HOST_CONSOLE` + `// root@… — manage rosters before launch`.
- Stepper renders `{timer}` with a small `sec` unit, `−`/`+` buttons, clamp 10–120 step 5.
- Script rows: `⠿` grip, zero-padded index (`01`, `02`…), TEAM_A/TEAM_B select (team-colored), `ban()`/`pick()` select, `rm` button, `+ ADD_TURN` at the end.
- Captain hint text in the modal: `both teams need a captain before START_DRAFT() unlocks` (amber, `.cy-hc-hint`).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Phase 12 items — access control, secondary screens — were already deferred in Phase 10's context.)

### Reviewed Todos (not folded)
None — no pending todos exist.

</deferred>

---

*Phase: 11-terminal-modals*
*Context gathered: 2026-08-21*
