# Roadmap: Draft Utility

## Milestones

- ✅ **v1.0 Draft Utility MVP** — Phases 1–7 (shipped 2026-04-09)
- 🔵 **v2.0 Cyber Redesign** — Phases 8–12 (in progress)

## Phases

<details>
<summary>✅ v1.0 Draft Utility MVP (Phases 1–7) — SHIPPED 2026-04-09</summary>

- [x] **Phase 1: Auth & Realtime Transport** — 3/3 plans — completed 2026-04-03
- [x] **Phase 2: Room & Lobby** — 6/6 plans — completed 2026-04-06
- [x] **Phase 3: Draft Engine** — 6/6 plans — completed 2026-04-06
- [x] **Phase 4: Draft UI & Disconnect Resilience** — 5/5 plans — completed 2026-04-06
- [x] **Phase 5: Chat & Moderation** — 5/5 plans — completed 2026-04-06
- [x] **Phase 6: Post-Draft Review** — 4/4 plans — completed 2026-04-06
- [x] **Phase 7: Tech Debt Cleanup** — 2/2 plans — completed 2026-04-09

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### v2.0 Cyber Redesign (Phases 8–12)

- [ ] **Phase 8: Cyber Foundation & App Shell** — Remove Tailwind; establish plain-CSS tokens, JetBrains Mono, zero-radius, and the persistent header/phase-tracker/scanline chrome every screen depends on.
- [ ] **Phase 9: Signature Effects Infrastructure** — Build the reusable plasma shader, typed-terminal-log hook, and shaded-ASCII wordmark, all honoring `prefers-reduced-motion`.
- [ ] **Phase 10: Core Screen Reskins** — Reskin Home, Login, Lobby, Drafting, Pause, and Review in full Cyber style using the foundation and effects.
- [ ] **Phase 11: Terminal Modals** — Reskin Draft Settings (timer stepper + drag-to-reorder script editor) and Host Console (move/kick + captain-gating hint) as terminal modals over the lobby.
- [ ] **Phase 12: Access Control & Secondary Screens** — Add room public/private gating + host spectating toggle to the backend, and build the Connecting, Guest Gate (403), and Room Cancelled screens.

## Phase Details

### Phase 8: Cyber Foundation & App Shell
**Goal**: The app renders in the Cyber visual system — plain CSS only, monospace, squared edges — with a persistent terminal chrome (header, phase tracker, scanlines) that every downstream screen sits inside.
**Depends on**: Nothing new (builds on v1.0 codebase; first phase of v2.0)
**Requirements**: DS-01, DS-02, DS-03, DS-04, DS-05, FX-05
**Success Criteria** (what must be TRUE):
  1. The app boots with Tailwind fully gone — no `@import 'tailwindcss'`, no Tailwind config/dependency, and no component renders via Tailwind utility classes.
  2. All UI text renders in JetBrains Mono (400/500/600/700) and every surface has squared corners with 1px borders, matching the `cyber.css` tokens scoped under `.cy-app`.
  3. A fixed header shows the bracketed wordmark with a blinking block cursor, a centered phase tracker (active phase lime-glowed), and the room-code meta with a copy button that writes the code to the clipboard.
  4. A scanline overlay sits over a scrolling body, and the blinking cursor is suppressed under `prefers-reduced-motion`.
  5. All 130 existing unit tests still pass and the draft/lobby snapshot shape is unchanged.
**Plans**: TBD
**UI hint**: yes

### Phase 9: Signature Effects Infrastructure
**Goal**: The reusable signature treatments — plasma shader, typed terminal logs, and the shaded-ASCII wordmark — exist as Svelte 5 building blocks that screens can drop in, all motion-safe.
**Depends on**: Phase 8 (tokens, font, `.cy-app` scope, chrome)
**Requirements**: FX-01, FX-02, FX-03, FX-04
**Success Criteria** (what must be TRUE):
  1. An ASCII plasma shader canvas renders behind content on a violet→lime brightness ramp with ambient and "hot" intensities.
  2. The shader visibly pauses when scrolled off-screen and does not animate at all under `prefers-reduced-motion`.
  3. A terminal log types out character-by-character and instantly shows the full text when `prefers-reduced-motion` is set.
  4. The shaded-ASCII `DRAFT` wordmark renders with its line-by-line reveal.
**Plans**: TBD
**UI hint**: yes

### Phase 10: Core Screen Reskins
**Goal**: Every primary screen of the existing flow — Home, Login, Lobby, Drafting, Pause, Review — is reskinned to the Cyber direction using the foundation and effects, with no change to draft behavior.
**Depends on**: Phase 8 (chrome/tokens), Phase 9 (shader, typed log, wordmark for Home)
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06
**Success Criteria** (what must be TRUE):
  1. Home shows the typed boot log, then the ASCII `DRAFT` wordmark, then `CREATE_DRAFT()` / join-by-code actions and a Discord sign-in entry.
  2. Login renders the Cyber card with Discord OAuth and guest-continue; Lobby renders two team columns (filled / `[ open slot ]`, captain marked), the spectators strip, and the host bar in Cyber style.
  3. Drafting renders the turn readout + countdown clock with an urgency state, the champion catalog grid, both teams' pick (lime) / ban (red, struck) columns, and team chat as sidebar or drawer.
  4. Pause renders the Cyber pause card with event log and grace countdown over the draft.
  5. Review renders both final compositions, the full ban list, and the draft-order recap in Cyber style and remains viewable without auth.
**Plans**: TBD
**UI hint**: yes

### Phase 11: Terminal Modals
**Goal**: The host's pre-launch configuration surfaces — Draft Settings and Host Console — open as terminal modals over the dimmed lobby with full Cyber interactions.
**Depends on**: Phase 10 (lobby reskin must exist for modals to render over it)
**Requirements**: MOD-01, MOD-02
**Success Criteria** (what must be TRUE):
  1. Draft Settings opens as a terminal modal over the dimmed lobby with a timer stepper clamped 10–120s in steps of 5.
  2. The script editor lets the host drag-to-reorder pick/ban turns and add/remove turns, preserving the existing script data shape.
  3. Host Console opens as a terminal modal with working move-player and kick controls plus the amber captain-gating hint.
  4. `START_DRAFT()` stays disabled until both teams have a captain.
**Plans**: TBD
**UI hint**: yes

### Phase 12: Access Control & Secondary Screens
**Goal**: Rooms carry a real public/private flag the host can toggle live, unauthenticated visitors to private pre-draft rooms hit a 403 Guest Gate, and the Connecting and Room Cancelled terminal states complete the flow.
**Depends on**: Phase 8 (chrome/tokens), Phase 9 (typed connect log), Phase 10 (lobby for the spectating toggle)
**Requirements**: ACC-01, ACC-02, ACC-03, ACC-04, SCR-01, SCR-02
**Success Criteria** (what must be TRUE):
  1. A room persists an "open spectating" (public/private) flag defaulting to closed, and the host can toggle it from the lobby to flip the room public/private live.
  2. An unauthenticated visitor to a private, pre-draft room sees the 403 Guest Gate (Discord sign-in + retry-as-guest) instead of the lobby; once the room is public or the draft has started, guests can view it as spectators.
  3. While the socket is connecting / the room is hydrating, a Connecting screen shows the typed connect log and progress meter, then transitions to lobby (or draft on rejoin).
  4. When the host cancels the room, everyone sees the red SIGKILL-log Room Cancelled terminal state.
  5. All 130 existing unit tests still pass and the realtime snapshot shape is unchanged.
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Auth & Realtime Transport | v1.0 | 3/3 | Complete | 2026-04-03 |
| 2. Room & Lobby | v1.0 | 6/6 | Complete | 2026-04-06 |
| 3. Draft Engine | v1.0 | 6/6 | Complete | 2026-04-06 |
| 4. Draft UI & Disconnect Resilience | v1.0 | 5/5 | Complete | 2026-04-06 |
| 5. Chat & Moderation | v1.0 | 5/5 | Complete | 2026-04-06 |
| 6. Post-Draft Review | v1.0 | 4/4 | Complete | 2026-04-06 |
| 7. Tech Debt Cleanup | v1.0 | 2/2 | Complete | 2026-04-09 |
| 8. Cyber Foundation & App Shell | v2.0 | 0/? | Not started | - |
| 9. Signature Effects Infrastructure | v2.0 | 0/? | Not started | - |
| 10. Core Screen Reskins | v2.0 | 0/? | Not started | - |
| 11. Terminal Modals | v2.0 | 0/? | Not started | - |
| 12. Access Control & Secondary Screens | v2.0 | 0/? | Not started | - |
