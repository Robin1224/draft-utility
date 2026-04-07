# Roadmap: Draft Utility

## Overview

Six phases carry the project from a working auth foundation to a complete real-time pick/ban draft. The build order follows the research-recommended dependency chain: realtime transport and identity first, then room lifecycle and lobby, then the draft engine and its settings, then resilience against disconnects, then isolated chat channels with basic safety, and finally the post-draft summary that makes outcomes shareable. Each phase delivers one complete, verifiable capability before the next phase builds on it.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Auth & Realtime Transport** - Production auth flows work end-to-end and WebSocket upgrade identifies users via Better Auth sessions (completed 2026-04-03)
- [ ] **Phase 2: Room & Lobby** - Players create and join rooms, form teams, captains auto-assign, host manages the lobby before the draft starts
- [ ] **Phase 3: Draft Engine** - Server-authoritative pick/ban FSM runs to completion with configurable settings and a bundled class catalog
- [ ] **Phase 4: Draft UI & Disconnect Resilience** - Draft state is visible in real time; captain disconnects pause, grace, and resolve without losing the draft
- [x] **Phase 5: Chat & Moderation** - Team and spectator chat channels are private, rate-limited, and slur-filtered; host can mute spectators (completed 2026-04-06)
- [x] **Phase 6: Post-Draft Review** - Final pick/ban outcome is summarized clearly and shareable by anyone without authentication (completed 2026-04-06)

## Phase Details

### Phase 1: Auth & Realtime Transport
**Goal**: Production auth flows work end-to-end; the WebSocket upgrade layer can identify signed-in users vs guests from Better Auth session cookies
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. User can create an account with email and password and see their session active immediately
  2. User can sign in with email/password and remain signed in across page reloads and browser restarts
  3. User can sign out from any page and is returned to an unauthenticated state with protected routes inaccessible
  4. User can authenticate via Google or GitHub OAuth and land back in the app with a valid session
  5. WebSocket connections from signed-in users carry verified identity; guest connections are recognized as unauthenticated at the upgrade boundary
**Plans**: 3 plans
Plans:
- [x] 01-01-PLAN.md — Auth config (Discord OAuth) + adapter swap to svelte-adapter-uws with Vite plugins
- [x] 01-02-PLAN.md — WebSocket identity layer (hooks.ws.js) + auth schema sync
- [x] 01-03-PLAN.md — /login route (LoginCard, server actions, unit tests) + demo cleanup
**UI hint**: yes

### Phase 2: Room & Lobby
**Goal**: Players can create and join rooms, form teams with auto-assigned captains, and the host can fully manage the lobby before the draft begins
**Depends on**: Phase 1
**Requirements**: ROOM-01, ROOM-02, ROOM-03, ROOM-04, ROOM-05, ROOM-06, ROOM-07, ROOM-08, HOST-02, HOST-03
**Success Criteria** (what must be TRUE):
  1. Signed-in user creates a room and immediately appears as non-transferable host; a copyable room link is available in the lobby
  2. Any user (including unauthenticated guests) can join a room via link or room ID; guests land as spectators with read-only access
  3. Signed-in users can join a team; team membership is capped at 3; the first player to join each team becomes that team's captain automatically
  4. Host can kick any lobby member and can move signed-in players between teams; moves are locked once the draft starts
  5. Host can start the draft only when both teams have at least one captain; the start button is disabled otherwise
  6. Room state is cleaned up or expired after the draft ends or is cancelled; orphaned rooms do not persist indefinitely
**Plans**: 6 plans
Plans:
- [x] 02-01-PLAN.md — Drizzle room schema, join-parse, rooms.js CRUD + tests (nanoid codes)
- [x] 02-02-PLAN.md — Home createRoom action, Create/Join UX, draft/[id] load
- [x] 02-03-PLAN.md — svelte-realtime lobby stream + joinTeam + guest/player tests
- [x] 02-04-PLAN.md — guest cookie + host RPCs (kick, move, startDraft, cancel) + tests
- [x] 02-05-PLAN.md — Lobby UI (Phases, teams, spectators, host bar, copy link)
- [x] 02-06-PLAN.md — ROOM-08 lifecycle: ended/abandoned lobby expiry in getRoomByPublicCode
**UI hint**: yes

### Phase 3: Draft Engine
**Goal**: The pick/ban draft runs to completion with authoritative server-side turn management, configurable settings, and a bundled class catalog
**Depends on**: Phase 2
**Requirements**: HOST-01, LIST-01, DRAFT-01, DRAFT-02, DRAFT-03, DRAFT-04, DRAFT-05, DRAFT-06
**Success Criteria** (what must be TRUE):
  1. Host can open a room settings panel and configure pick/ban order and turn timer (default 30s) before the draft starts
  2. Draft loads a bundled class catalog; each class can be picked or banned exactly once across the entire draft
  3. Server emits authoritative `turnEndsAt` timestamps; timer auto-advances the turn server-side when expired; pick/ban and timeout cannot both win the same turn
  4. Active captain can pick or ban a class and the class is immediately removed from the available pool for all participants
  5. Draft progresses through the full configured script and transitions automatically to the Review phase when all picks and bans are resolved
**Plans**: 6 plans
Plans:
- [x] 03-01-PLAN.md — Wave 0: all spec stub files (LIST-01, DRAFT-01–06, HOST-01)
- [x] 03-02-PLAN.md — classes.json catalog + draft-script.js + schema migration (draft_state + draft_action)
- [x] 03-03-PLAN.md — src/lib/server/draft.js DB layer + startDraftWithSettings in rooms.js
- [x] 03-04-PLAN.md — src/live/draft.js pickBan RPC + timer machinery; room.js startDraft/cancelRoom wired
- [x] 03-05-PLAN.md — ScriptTurnRow.svelte + DraftSettingsPanel.svelte components
- [ ] 03-06-PLAN.md — LobbyHostBar + +page.svelte wiring; manual checkpoint verification
**UI hint**: yes

### Phase 4: Draft UI & Disconnect Resilience
**Goal**: Draft state is clearly visible to all participants in real time; captain disconnects are handled gracefully without permanently stalling the draft
**Depends on**: Phase 3
**Requirements**: DRAFT-07, DISC-01, DISC-02, DISC-03, DISC-04
**Success Criteria** (what must be TRUE):
  1. Draft view clearly shows whose turn it is, time remaining as a live countdown, and a scrollable history of all bans and picks in order
  2. When the active captain disconnects, the draft visibly pauses and a 30-second grace timer is displayed to all participants
  3. If the captain reconnects during grace, the draft resumes without data loss; if grace expires, another team member is promoted to captain and play continues
  4. If no team member is available after grace expires, the draft is cancelled and all participants receive a clear notification
  5. On reconnect, the client receives a full server-authoritative snapshot and displays current draft state without relying on any local cache
**Plans**: 5 plans
Plans:
- [x] 04-01-PLAN.md — Wave 0: test stubs for DISC-01–04 and DRAFT-07 snapshot shape
- [x] 04-02-PLAN.md — Server disconnect resilience: onUnsubscribe hook, grace timer, promotion, cancelDraftNoCaption, autoAdvanceTurn publish fix, lobby init branching
- [x] 04-03-PLAN.md — UI atoms + molecules: ChampionCard, TimerDisplay, DraftSlot, StatusBanner, TurnIndicator, TeamDraftColumn, ChampionGrid
- [x] 04-04-PLAN.md — DraftBoard assembly + PauseOverlay + +page.svelte phase-conditional wiring
- [ ] 04-05-PLAN.md — Manual checkpoint: full draft board and disconnect resilience verification
**UI hint**: yes

### Phase 5: Chat & Moderation
**Goal**: Team members and spectators have private, isolated communication channels that are enforced server-side, with basic safety hygiene
**Depends on**: Phase 2
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, HOST-04
**Success Criteria** (what must be TRUE):
  1. Team members see only their own team's messages during lobby and draft phases; messages never appear in the opposing team's channel or spectator chat
  2. Spectators see only spectator-channel messages; they cannot read team messages regardless of client manipulation
  3. Sending messages too rapidly triggers a server-side rate limit keyed by user, connection, and room; excess messages are dropped before broadcast
  4. Messages containing slurs are blocked server-side after Unicode normalization and length capping; the filtered content is never broadcast to any client
  5. Host can mute a spectator; muted spectator's messages stop appearing in spectator chat immediately
**Plans**: 5 plans
Plans:
- [x] 05-01-PLAN.md — Wave 0: test stubs (chat.spec.js + chat-filter.spec.js) with it.todo for all CHAT/HOST-04 behaviors
- [x] 05-02-PLAN.md — Server layer: slur-list.json + chat-filter.js + chat.js (4 channel streams, sendMessage, muteMember, unmuteMember)
- [x] 05-03-PLAN.md — UI atoms + molecule: ChatMessage, ChatInput, MuteButton atoms + ChatPanel molecule
- [x] 05-04-PLAN.md — UI wiring: SpectatorsPanel extended with Mute controls + +page.svelte wired with live streams and flex layout
- [x] 05-05-PLAN.md — Manual checkpoint: full chat and mute verification across browser sessions
**UI hint**: yes

### Phase 6: Post-Draft Review
**Goal**: The final pick/ban outcome is clearly readable by all participants and shareable with anyone who was not in the room
**Depends on**: Phase 4
**Requirements**: POST-01, POST-02
**Success Criteria** (what must be TRUE):
  1. After the draft completes, all participants and spectators see a summary view showing each team's picks and bans in pick order
  2. The post-draft summary is accessible via a shareable link that anyone can open without signing in
**Plans**: 3 plans
Plans:
- [x] 06-01-PLAN.md — Server layer: completeDraft phase='review' fix + +page.server.js review load + draft.spec.js update
- [x] 06-02-PLAN.md — UI layer: DraftReview.svelte molecule + +page.svelte review branch
- [x] 06-03-PLAN.md — Manual checkpoint: full review flow and shareable link verification
**UI hint**: yes

### Phase 7: Tech Debt Cleanup
**Goal**: Close the two medium-severity tech debt items from the v1.0 audit: fix the grace-timer auto-advance publish gap so all connected clients receive the review-phase transition, and fill Nyquist VALIDATION.md browser-project specs for all 6 phases
**Depends on**: Phase 6
**Requirements**: DRAFT-04, POST-01 (edge-case hardening — already satisfied, reinforcing correctness)
**Gap Closure:** Closes tech debt from v1.0 audit
**Success Criteria** (what must be TRUE):
  1. `disconnectGraceExpired` → `autoAdvanceTurn` path calls `completeDraft` AND publishes the review snapshot to live clients unconditionally (not gated on `platform`)
  2. All 6 phases have filled VALIDATION.md files with `nyquist_compliant: true` and wave-0 browser-project specs passing
**Plans**: 2 plans
Plans:
- [x] 07-01-PLAN.md — Fix grace-timer auto-advance publish gap in src/live/draft.js
- [x] 07-02-PLAN.md — Fill Nyquist VALIDATION.md for all 6 phases
**UI hint**: no

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6
(Note: Phase 5 depends on Phase 2, not Phase 4; can begin after Phase 2 if Phase 4 is in progress)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth & Realtime Transport | 3/3 | Complete   | 2026-04-03 |
| 2. Room & Lobby | 4/6 | In Progress|  |
| 3. Draft Engine | 5/6 | In Progress|  |
| 4. Draft UI & Disconnect Resilience | 4/5 | In Progress|  |
| 5. Chat & Moderation | 5/5 | Complete   | 2026-04-06 |
| 6. Post-Draft Review | 4/4 | Complete   | 2026-04-06 |
| 7. Tech Debt Cleanup | 2/2 | Complete   | 2026-04-07 |
