# Phase 10: Core Screen Reskins - Context

**Gathered:** 2026-06-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Reskin every primary screen of the existing flow — **Home, Login, Lobby, Drafting, Pause, Review** — to the Cyber direction, using the Phase 8 foundation (tokens, JetBrains Mono, `.cy-app` scope, `CyShell` chrome) and the Phase 9 effects (plasma shader, `createTypedLog`, `CyLogo` wordmark).

**Hard constraint: NO change to draft behavior.** This is a purely presentational phase. The svelte-realtime layer, the snapshot shape, and all `$live/*` store wiring are FROZEN. The 130+ existing unit tests (server project) must keep passing.

**In scope:** Cyber styling + structure for the six screens via the existing components/routes; wiring the Phase 9 effects into Home (boot log → wordmark → actions; `hot` shader); the pick (lime) / ban (red, struck) treatment; the turn readout + countdown with an urgency state; responsive team-chat layout on Drafting.

**Out of scope (later phases):** Terminal modals — Draft Settings + Host Console (Phase 11, MOD-01/02); access-control behaviors + secondary screens — Connecting/Loading, Guest Gate (403), Room Cancelled/SIGKILL (Phase 12, SCR/ACC). Requirements covered here: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06.

</domain>

<decisions>
## Implementation Decisions

### Reskin strategy
- **D-01:** **Restyle the existing components in place.** Keep each component's data props and `$live` store wiring UNTOUCHED; layer Cyber styling on by adding `.cy-*` classes and porting the matching per-screen `cyber.css` rules. Adjust markup only where the Cyber structure genuinely requires it (don't rebuild wholesale). `cyber.jsx` is the visual/structure reference, not a verbatim source to transcribe. Rationale: lowest risk to the frozen realtime/snapshot behavior and the 130+ tests. Existing components to restyle include (non-exhaustive): `molecules/Create`, `molecules/Join`, `molecules/LoginCard`, `molecules/TeamColumn`, `molecules/LobbyHostBar`, `molecules/SpectatorsPanel`, `molecules/DraftBoard`, `molecules/TeamDraftColumn`, `molecules/ChampionGrid` + `atoms/ChampionCard`, `molecules/TurnIndicator` + `atoms/TimerDisplay`, `molecules/ChatPanel` + `atoms/ChatMessage`/`ChatInput`, `molecules/PauseOverlay`, `molecules/DraftReview`, `atoms/DraftSlot`, `atoms/Phases`, `atoms/StatusBanner`, `atoms/User`.
  - **Context:** Phase 8 removed Tailwind, so these components currently render largely unstyled — this phase re-clothes them in Cyber rather than migrating amber→cyber.

### Drafting chat layout (UI-04)
- **D-02:** **Responsive** team chat: a persistent right-hand sidebar on desktop (chat visible alongside the catalog + pick/ban columns), collapsing to a toggleable drawer/overlay on narrow/mobile widths (draft board goes full-width, chat one tap away). Exact breakpoint value is Claude's discretion (follow `cyber.css` / existing conventions).

### Home boot-log copy (UI-01)
- **D-03:** **Replace `CY_BOOT_LINES`** (Phase 9 shipped the prototype's placeholder verbatim and deferred final copy to here) with this draft-themed "connect narrative" sequence, captured VERBATIM — it feeds `createTypedLog`, and the final line ends with the blinking cursor:
  ```
  $ draft --connect
  [ OK ] handshake with draftnet ...... ok
  [ OK ] syncing champion catalog ..... 28
  [ OK ] team channels A/B ............ open
  [ OK ] turn clock .................... 30s
  > ready_
  ```
  - Same `$ command` → aligned `[ OK ]` dot-leader lines → `> …_` shape as before, so typed-log timing and alignment are preserved. The Home flow stays: typed boot log → `CyLogo` `DRAFT` wordmark reveal (on `boot.done`) → `CREATE_DRAFT()` / join-by-code actions + Discord sign-in entry.
  - Update the export in `src/lib/components/effects/cyTypedLog.svelte.js` (and its spec's verbatim assertion) to the new lines; Phase 9 left this as the reference default explicitly expecting Phase 10 to finalize it.

### Drafting countdown urgency (UI-04)
- **D-04:** The countdown clock enters its **urgency state in the final 5 seconds** of a turn: shift to Cyber red (`--cy-red`) **and pulse/blink** (reuse the existing `cy-blink` keyframe). Under `prefers-reduced-motion: reduce`, fall back to the **color shift only — no pulse/blink** (motion-safety, consistent with Phase 8 D-10 / Phase 9 patterns).

### Claude's Discretion
- **Per-screen CSS placement:** which screen styles go into global `src/app.css` under `.cy-app` vs a component `<style>` block — follow the Phase 8 hybrid org (structural `.cy-*` → app.css; genuine one-offs → scoped). Planner/executor's call per screen.
- **Responsive breakpoint value(s)** for the chat sidebar↔drawer switch.
- **`hot` shader placement:** which screen(s) pass `hot` to the shader (Home hero is the expected candidate, per Phase 9 D-02 which said Home wires `hot`); ambient is already app-wide.
- **Champion catalog grid styling** density/columns; pick=lime / ban=red-struck exact treatment within the token palette.
- **Empty / loading / error states** per screen (e.g. open slots already specified as `[ open slot ]`; loading/`load error` presentation otherwise discretionary), as long as behavior is unchanged.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 10 design source (visual/structure reference — restyle TO match, do not transcribe wholesale per D-01)
- `design_handoff_pickban_cyber/prototype/variants/cyber.jsx` — Screen composition reference (React → Svelte 5): `CYHome` (~231), `CYLogin` (~292), `CYLobbyBody`/`CYLobby` (~348/395), `CYDraftSlot` (~419), `CYDrafting` (~437, incl. chat sidebar/drawer + countdown), `CYReview` (~571), `CYPause` (~624). Pick/ban accent + struck-ban treatment live here.
- `design_handoff_pickban_cyber/prototype/variants/cyber.css` — Per-screen Cyber styles to port (`.cy-home`, `.cy-login`/card, `.cy-lobby`/team columns, `.cy-draft*` grid + pick/ban columns + countdown, `.cy-pause`, `.cy-review`). Port values verbatim into `.cy-app` scope (Phase 8 hybrid org).

### Foundation already shipped (do NOT contradict)
- `.planning/phases/08-cyber-foundation-app-shell/08-CONTEXT.md` — Plain CSS no Tailwind (D-01), `.cy-app` token scope (D-02), verbatim cyber.css values (D-03), zero border-radius (DS-04), JetBrains Mono (D-08), `cy-blink` + reduced-motion suppression (D-10).
- `.planning/phases/09-signature-effects-infrastructure/09-CONTEXT.md` + `09-UI-SPEC.md` — Effects API: `CyShader` (ambient app-wide via `CyShell`; `hot` wired per-screen), `createTypedLog(lines, opts)` reactive `{text, done}`, `CyLogo` `DRAFT` wordmark with `rendered` reveal. Motion-safety obligations per effect.
- `src/app.css` — Existing `.cy-*` foundation (tokens, `.cy-shader*`, `.cy-boot`, `.cy-logo*`, `cy-blink`, reduced-motion block). Phase 10 APPENDS screen styles; do not duplicate.
- `src/routes/draft/[id]/+page.svelte` — The phase-switched draft screen (lobby/drafting/pause/review) composing the molecules. `src/routes/+page.svelte` (Home) and `src/routes/login/+page.svelte` (Login).
- `src/lib/components/effects/cyTypedLog.svelte.js` — `CY_BOOT_LINES` export to update per D-03.

### Project guardrails
- `.planning/REQUIREMENTS.md` — UI-01..UI-06 acceptance text; FROZEN realtime/snapshot constraint banner; 130+ tests must pass.
- `.planning/codebase/STRUCTURE.md`, `CONVENTIONS.md`, `STACK.md`, `TESTING.md` — component layout (atoms/molecules/organisms/chrome/effects), Svelte 5 runes, vitest browser+node projects.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Full component inventory already exists** under `src/lib/components/` (atoms/molecules) mapping 1:1 to the screens — restyle these in place (D-01). Effects (`CyShader`, `CyLogo`, `cyTypedLog`) and chrome (`CyShell`) shipped in Phases 8–9.
- **`createTypedLog` + `CyLogo`** are ready to compose on Home (no runtime consumer yet — Phase 10 is their first consumer).
- **`cy-blink` keyframe** (app.css) — reuse for the countdown urgency pulse (D-04) and existing cursor.

### Established Patterns
- **Hybrid CSS org** (Phase 8 D-01): structural `.cy-*` in global `src/app.css` under `.cy-app`; scoped `<style>` only for genuine one-offs.
- **Svelte 5 runes** throughout; `$live/*` stores via `fromStore(...)` drive screen state — the draft page derives `snapshot`/`phase`/`isHost`/`isGuest` and switches sub-views. Do not alter this wiring.
- **Single phase-switched draft route** (`draft/[id]/+page.svelte`, 391 LOC) renders Lobby→Drafting→Pause→Review; Home and Login are separate routes.

### Integration Points
- Home (`src/routes/+page.svelte`) composes `Create`/`Join`/sign-in + the new boot-log/wordmark/shader-hot hero.
- All effects are presentational and MUST NOT import/touch `$live/*` or the snapshot layer; the node (server) vitest project must stay green.
- Existing browser specs (`*.svelte.spec.js`) + server specs — restyles must not break either; styling-only changes should leave behavior assertions intact.

</code_context>

<specifics>
## Specific Ideas

- Pick column = lime accent, Ban column = Cyber red and struck-through (per ROADMAP success criteria / cyber.jsx).
- Lobby: filled slots vs `[ open slot ]` placeholder, captain marked, spectators strip, host bar — all in Cyber style.
- Home sequence is ordered: typed boot log → `DRAFT` wordmark reveal → actions (`CREATE_DRAFT()` / join-by-code) + Discord sign-in.
- Review must remain viewable without auth (unchanged behavior, restyled).

</specifics>

<deferred>
## Deferred Ideas

- **Terminal modals** (Draft Settings timer-stepper + drag-to-reorder script editor; Host Console move/kick) — Phase 11 (MOD-01/02). `DraftSettingsPanel`/`LobbyHostBar` exist but their modal reskin is Phase 11.
- **Access-control behaviors + secondary screens** — Connecting/Loading state, Guest Gate (403), Room Cancelled (SIGKILL log), public/private gating, host spectating toggle — Phase 12 (SCR/ACC).
- **Hot-shader placement beyond Home**, advanced empty/error-state art — only if a screen needs it; otherwise discretionary, not new scope.

### Reviewed Todos (not folded)
None — no pending todos matched Phase 10.

</deferred>

---

*Phase: 10-core-screen-reskins*
*Context gathered: 2026-06-12*
