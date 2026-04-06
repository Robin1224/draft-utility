# Requirements

**Project:** Draft Utility  
**Milestone:** v1 — Core draft experience  
**Date:** 2026-04-03  

---

## v1 Requirements

### Authentication (AUTH)

- [x] **AUTH-01** — User can create an account with email and password
- [x] **AUTH-02** — User can sign in with email and password and stay signed in across sessions
- [x] **AUTH-03** — User can sign out from any page
- [x] **AUTH-04** — User can sign in with OAuth (Google and/or GitHub)

### Room Management (ROOM)

- [x] **ROOM-01** — Signed-in user can create a room; they become the non-transferable host
- [x] **ROOM-02** — Any user can join a room via room ID or shareable link
- [x] **ROOM-03** — Unauthenticated guests can join a room as spectators (read-only access)
- [x] **ROOM-04** — Signed-in user can join a team (max 3 players per side)
- [x] **ROOM-05** — First signed-in player to join a team automatically becomes that team's captain
- [x] **ROOM-06** — Host can start the draft at will; both teams must have a captain (minimum 2 players total: one captain per team)
- [x] **ROOM-07** — Host can share a copy-to-clipboard room link from the lobby
- [x] **ROOM-08** — Room cleans up / expires after the draft ends or is cancelled

### Host Controls (HOST)

- [x] **HOST-01** — Host has a room settings panel to configure pick/ban order and turn timer (default: 30 seconds)
- [x] **HOST-02** — Host can kick any lobby member (player or spectator) from the room
- [x] **HOST-03** — Host can move players between teams before the draft starts (moves locked once draft begins)
- [x] **HOST-04** — Host can mute spectators (spectator chat silenced for that user)

### Chat (CHAT)

- [x] **CHAT-01** — Team members can send messages visible only to their own team during the lobby and draft phases
- [x] **CHAT-02** — Spectators can send messages visible only to other spectators
- [x] **CHAT-03** — Chat messages are rate-limited per user, connection, and room (server-enforced)
- [x] **CHAT-04** — Chat messages are filtered server-side for slurs (Unicode-normalized, length-capped before filter)

### Draft Mechanics (DRAFT)

- [x] **DRAFT-01** — Draft uses a data-driven predefined pick/ban script (sensible default order bundled with the app)
- [x] **DRAFT-02** — Server owns authoritative turn order and emits a `turnEndsAt` timestamp; clients render countdown from that value
- [x] **DRAFT-03** — Team captains alternate turns banning and picking from a shared class pool; each class may only be picked or banned once
- [x] **DRAFT-04** — Turn auto-advances (server-side) when the timer expires without a captain action
- [x] **DRAFT-05** — Draft progresses through a fixed number of bans + picks per team as defined by the script
- [x] **DRAFT-06** — Host can override the default pick/ban order in the room settings panel before the draft starts
- [x] **DRAFT-07** — UI clearly shows: whose turn it is, time remaining (countdown), and a live history of all bans and picks

### Disconnect & Resilience (DISC)

- [x] **DISC-01** — If the active captain disconnects, the draft pauses and a grace period (~30 seconds) begins
- [x] **DISC-02** — If the captain does not reconnect within the grace period, another player on that team is promoted to captain and the draft resumes
- [x] **DISC-03** — If no other player is available on the team, the draft is cancelled and all participants are notified
- [x] **DISC-04** — On reconnect, the client is hydrated from a server-authoritative snapshot (no stale local state)

### Post-Draft Review (POST)

- [x] **POST-01** — After the draft completes, a summary view shows all bans and picks per team in pick order; visible to all participants and spectators
- [x] **POST-02** — Post-draft summary has a shareable link that anyone can open (no auth required to view)

### Class Lists (LIST)

- [x] **LIST-01** — App ships with one premade class catalog used as the default draft list

---

## v2 Requirements (deferred)

- Magic link / passwordless login — deferred
- Custom class list creation / upload — deferred until secure editor and ingestion pipeline exist
- Interactive draft list editor UI — deferred (see Out of Scope)
- Per-user draft history / profile — deferred

---

## Out of Scope

- **Transferable host** — host is always the room creator; no transfer mechanism
- **Mid-draft team moves** — players may not be moved between teams after the draft starts
- **Custom list creation before a secure editor** — explicit deferral; security risk without controlled ingestion
- **Draft list editor UI (v1)** — planned as a future feature; not part of this milestone
- **Heavy moderation** (beyond rate limiting and slur filtering) — out of scope for v1
- **Spectator cap** — no limit on spectators

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 — Auth & Realtime Transport | Complete |
| AUTH-02 | Phase 1 — Auth & Realtime Transport | Complete |
| AUTH-03 | Phase 1 — Auth & Realtime Transport | Complete |
| AUTH-04 | Phase 1 — Auth & Realtime Transport | Complete |
| ROOM-01 | Phase 2 — Room & Lobby | Complete |
| ROOM-02 | Phase 2 — Room & Lobby | Complete |
| ROOM-03 | Phase 2 — Room & Lobby | Complete |
| ROOM-04 | Phase 2 — Room & Lobby | Complete |
| ROOM-05 | Phase 2 — Room & Lobby | Complete |
| ROOM-06 | Phase 2 — Room & Lobby | Complete |
| ROOM-07 | Phase 2 — Room & Lobby | Complete |
| ROOM-08 | Phase 2 — Room & Lobby | Complete |
| HOST-01 | Phase 3 — Draft Engine | Complete |
| HOST-02 | Phase 2 — Room & Lobby | Complete |
| HOST-03 | Phase 2 — Room & Lobby | Complete |
| HOST-04 | Phase 5 — Chat & Moderation | Complete |
| CHAT-01 | Phase 5 — Chat & Moderation | Complete |
| CHAT-02 | Phase 5 — Chat & Moderation | Complete |
| CHAT-03 | Phase 5 — Chat & Moderation | Complete |
| CHAT-04 | Phase 5 — Chat & Moderation | Complete |
| DRAFT-01 | Phase 3 — Draft Engine | Complete |
| DRAFT-02 | Phase 3 — Draft Engine | Complete |
| DRAFT-03 | Phase 3 — Draft Engine | Complete |
| DRAFT-04 | Phase 3 — Draft Engine | Complete |
| DRAFT-05 | Phase 3 — Draft Engine | Complete |
| DRAFT-06 | Phase 3 — Draft Engine | Complete |
| DRAFT-07 | Phase 4 — Draft UI & Disconnect Resilience | Complete |
| DISC-01 | Phase 4 — Draft UI & Disconnect Resilience | Complete |
| DISC-02 | Phase 4 — Draft UI & Disconnect Resilience | Complete |
| DISC-03 | Phase 4 — Draft UI & Disconnect Resilience | Complete |
| DISC-04 | Phase 4 — Draft UI & Disconnect Resilience | Complete |
| POST-01 | Phase 6 — Post-Draft Review | Complete |
| POST-02 | Phase 6 — Post-Draft Review | Complete |
| LIST-01 | Phase 3 — Draft Engine | Complete |

**Coverage:** 34/34 requirements mapped ✓
