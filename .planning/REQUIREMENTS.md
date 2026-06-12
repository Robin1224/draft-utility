# Requirements: Draft Utility — v2.0 Cyber Redesign

**Defined:** 2026-06-12
**Core Value:** A fair, readable, real-time draft where host rules, team privacy, and spectator separation are clear — and the final pick/ban outcome is easy to review.

> **Milestone constraint (applies to every requirement):** The svelte-realtime layer and the lobby/draft snapshot shape stay intact. This milestone is the view layer plus the access-control additions in ACC. All 130 existing unit tests must keep passing.
>
> **Authoritative design sources:** `design_handoff_pickban_cyber/prototype/variants/cyber.css` (tokens/styles — port verbatim) and `cyber.jsx` (component/behavior reference; React is only the prototyping medium — reimplement as Svelte 5).

## v2.0 Requirements

### Design System

- [ ] **DS-01**: All UI renders in JetBrains Mono (weights 400/500/600/700) loaded by the app; no other UI font remains.
- [ ] **DS-02**: The Cyber color tokens and glow shadows from `cyber.css` are available app-wide as CSS custom properties scoped under `.cy-app`.
- [ ] **DS-03**: Tailwind is fully removed (dependency, config, and `@import 'tailwindcss'`); no component renders via Tailwind utility classes.
- [ ] **DS-04**: All surfaces use squared corners (zero border-radius) and 1px borders per the Cyber spec.
- [ ] **DS-05**: A persistent app shell renders the fixed header — bracketed wordmark + blinking cursor, centered phase tracker (active phase lime-glowed), and room-code meta with a working copy-to-clipboard button — plus the scanline overlay over a scrolling body.

### Signature Effects

- [ ] **FX-01**: An ASCII plasma shader canvas renders behind content on a violet→lime brightness ramp, with ambient and "hot" intensities.
- [ ] **FX-02**: The shader pauses when off-screen (IntersectionObserver) and is disabled under `prefers-reduced-motion`.
- [ ] **FX-03**: Terminal logs (home boot sequence, connect log) type out character-by-character and jump to full text under `prefers-reduced-motion`.
- [ ] **FX-04**: The home hero renders the shaded-ASCII `DRAFT` wordmark with its line-by-line reveal.
- [ ] **FX-05**: Blinking block cursors render where specified (header brand, chat input), 1s step-end, disabled under reduced motion.

### Screen Reskins

- [ ] **UI-01**: Home shows the boot log → ASCII wordmark → `CREATE_DRAFT()` and join-by-code actions, with a Discord sign-in entry.
- [ ] **UI-02**: Login renders the Cyber card with Discord OAuth and guest-continue.
- [ ] **UI-03**: Lobby renders two team columns (filled / `[ open slot ]`, captain marked), the spectators strip, and the host bar in Cyber style.
- [ ] **UI-04**: Drafting renders the turn readout + countdown clock (with urgency state), the champion catalog grid, both teams' pick (lime) / ban (red, struck) columns, and team chat as sidebar or drawer.
- [ ] **UI-05**: Pause renders the Cyber pause card with event log and grace countdown over the draft.
- [ ] **UI-06**: Review renders both final compositions, the full ban list, and the draft-order recap in Cyber style, viewable without auth.

### Terminal Modals

- [ ] **MOD-01**: Draft Settings opens as a terminal modal over the dimmed lobby with a timer stepper (10–120s, step 5) and a drag-to-reorder pick/ban script editor (add/remove turns).
- [ ] **MOD-02**: Host Console opens as a terminal modal with move-player and kick controls plus the amber captain-gating hint; `START_DRAFT()` is disabled until both teams have a captain.

### New Secondary Screens

- [ ] **SCR-01**: While the socket is connecting / the room is hydrating, a Connecting screen shows the typed connect log and progress meter, then transitions to lobby (or draft on rejoin).
- [ ] **SCR-02**: Room Cancelled renders the red SIGKILL-log terminal state for everyone when the host cancels the room.

### Access Control

- [ ] **ACC-01**: A room carries an "open spectating" (public/private) flag, defaulting to closed, persisted in the room record.
- [ ] **ACC-02**: The host can toggle "open spectating" from the lobby, flipping the room public/private live.
- [ ] **ACC-03**: An unauthenticated visitor to a private, pre-draft room sees the 403 Guest Gate (Discord sign-in + retry-as-guest) instead of the lobby.
- [ ] **ACC-04**: When a room is public or the draft has started, guests can view it as spectators.

## Future Requirements

Deferred from v1.0; tracked but not in this milestone's roadmap.

### Tech Debt (from v1.0)

- **TD-01**: Correct auth requirements text (AUTH-01/02/04 describe email/pw + Google/GitHub; implementation is Discord-only).
- **TD-02**: Fix stale chat tests (3 assertions use `message` event; implementation emits `set`).
- **TD-03**: Remove dead code — `startDraftIfReady` (superseded by `startDraftWithSettings`).
- **TD-04**: Fix stale JSDoc at `rooms.js:76` (pre-Phase-6 `completeDraft` behaviour).
- **TD-05**: Address guest spectator accumulation on review-phase rooms.
- **TD-06**: Backfill missing Phase 4 VERIFICATION.md.

## Out of Scope

Explicitly excluded for v2.0. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Changing the draft engine, timer, or disconnect logic | v2.0 is the view layer + access control; the realtime engine is frozen |
| Re-theming beyond the Cyber direction (light mode, alt palettes) | Single high-fidelity direction this milestone |
| Custom / user-upload draft lists | Carried over from v1.0 out-of-scope (security model not ready) |
| Transferable host | Creator is always host (v1.0 decision unchanged) |
| Migrating the realtime transport or DB provider | Stack frozen except removing Tailwind |
| The v1.0 tech-debt items (TD-01..06) | Tracked in Future Requirements; not part of the redesign milestone |

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DS-01 | TBD | Pending |
| DS-02 | TBD | Pending |
| DS-03 | TBD | Pending |
| DS-04 | TBD | Pending |
| DS-05 | TBD | Pending |
| FX-01 | TBD | Pending |
| FX-02 | TBD | Pending |
| FX-03 | TBD | Pending |
| FX-04 | TBD | Pending |
| FX-05 | TBD | Pending |
| UI-01 | TBD | Pending |
| UI-02 | TBD | Pending |
| UI-03 | TBD | Pending |
| UI-04 | TBD | Pending |
| UI-05 | TBD | Pending |
| UI-06 | TBD | Pending |
| MOD-01 | TBD | Pending |
| MOD-02 | TBD | Pending |
| SCR-01 | TBD | Pending |
| SCR-02 | TBD | Pending |
| ACC-01 | TBD | Pending |
| ACC-02 | TBD | Pending |
| ACC-03 | TBD | Pending |
| ACC-04 | TBD | Pending |

**Coverage:**
- v2.0 requirements: 24 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 24 ⚠️

---
*Requirements defined: 2026-06-12*
*Last updated: 2026-06-12 after initial definition*
