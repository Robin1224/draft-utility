# Pitfalls Research

**Domain:** Real-time pick/ban draft (lobby → drafting → review), SvelteKit + PostgreSQL (Neon/Drizzle) + Better Auth, teams of ≤3 signed-in players + unlimited spectators.  
**Researched:** 2026-04-03  
**Confidence:** **MEDIUM–HIGH** for transport/sync/timer patterns (verified against [WebSocket.org reconnection guide](https://www.websocket.org/guides/reconnection/) and common server-authoritative turn-based guidance); **MEDIUM** for product-specific edge cases (needs validation in implementation and tests).

---

## Critical Pitfalls

### 1. Treating the WebSocket or the UI as source of truth for draft state

**What goes wrong:** Turn index, clock, picked/banned IDs, captain, and phase (lobby / drafting / review) diverge across clients. Cheating or confused UX: picks that “work” locally but are invalid server-side, or spectators seeing team-only data because the client routed messages wrong.

**Warning signs:** Bugs that only reproduce for one browser; “fixing” desync by broadcasting full state without finding why it diverged; server handlers that only forward client payloads without validating against room rules.

**Prevention:** Single **server-authoritative** state machine for draft progression; clients send **intent** (e.g. “ban slot 7”) not “new world state.” Persist transitions that must survive deploy/restart (or accept explicit “draft lost on server death” and document it). After reconnect, client always **hydrates from server snapshot + version/seq**, never from stale local memory.

**Phase:** **Draft engine** (core FSM + persistence); **Realtime foundation** (message schema + ack/seq if using replay).

---

### 2. Turn timer driven by client `setInterval` or “message received” time

**What goes wrong:** Each client shows a different second count; a slow client appears to have more time; timeout and a last-millisecond pick **race**—two outcomes depending on packet ordering; disputes over whether a pick was “in time.”

**Warning signs:** Timer starts in `onmessage` without a server deadline; UI shows integer seconds that don’t match other participants; timeout handled only on the client.

**Prevention:** Server owns **deadline timestamps** (wall clock or monotonic server time) for each turn: e.g. `turnEndsAt` in authoritative state. Clients display **countdown derived from `turnEndsAt`**, optionally smoothed with local clock offset estimate. **Timeout application** (auto-skip, random ban, pass—whatever product rule) runs **once on the server** when the deadline elapses (scheduled job, tick loop, or lazy evaluation on next inbound message with `now > turnEndsAt`). **Pick/ban handlers** must be **atomic** with respect to timeout: same transactional or locking discipline so a pick and timeout cannot both commit.

**Phase:** **Draft engine**; **Resilience** (pause/captain rules interact with timer—see pitfall 5).

---

### 3. Reconnect and duplicate tabs: orphaned sessions, double presence, duplicate actions

**What goes wrong:** Old socket still listed as “connected”; user opens two tabs and acts twice; **replay** of queued client messages causes duplicate picks; reconnect thundering herd after deploy; **token expired** during long backoff so reconnect never succeeds silently.

**Warning signs:** Presence count wrong after refresh; same user twice in member list; duplicate pick errors or inconsistent lists; Colyseus-style “session expired” class issues when a new connection is opened before the old one is torn down (see community reports on reconnect ordering).

**Prevention:** Separate **connection identity** from **participant/session identity**; on new WebSocket, bind to `userId` + `roomId` + **device/session token**, and **invalidate or supersede** prior connection for the same participant policy (choose explicitly: single active session vs multi-tab). Use **exponential backoff + jitter** on reconnect to avoid thundering herd ([WebSocket.org](https://www.websocket.org/guides/reconnection/)). **Idempotency keys** on pick/ban and other critical intents; server dedupes. On reconnect: **snapshot + last sequence** (or version) and optional short replay buffer; document buffer bounds. Refresh **short-lived auth tokens** before WS handshake if disconnect lasted long enough.

**Phase:** **Realtime foundation**; **Lobby & presence**; **Draft engine** (idempotency).

---

### 4. Chat moderation and channel enforcement only on the client

**What goes wrong:** Spectators inject team-chat payloads; muted users keep sending via crafted messages; rate limits bypassed by **multiple connections**, **multiple guests**, or handshake paths that don’t share the same limiter keys; slur filter **evaded** with unicode homoglyphs, zero-width chars, splits across messages, images (if ever added).

**Warning signs:** “We filter in the Svelte component”; rate limit keyed only by IP when authenticated users share an IP; no server-side check that `channel === allowedChannel(role)`.

**Prevention:** **Server-side** routing: resolve role (player team / spectator / host) from **session + room membership**, never from client-declared role. Enforce **team vs spectator** topics in one code path before broadcast. Rate limit by **`userId` (authenticated) and connection/session** for guests, plus global room caps; align WebSocket upgrade and post-connect message limits so neither path is a soft spot. Normalize Unicode before filter; cap message length; log moderation decisions for host tools later.

**Phase:** **Chat & moderation**; touches **Realtime foundation** (where limiters attach).

---

### 5. Captain disconnect / pause / promote graph undertested (state × timer × concurrency)

**What goes wrong:** Interleaving: captain drops, server starts 30s grace, captain returns in tab two, **two captains** or **none**; pause flag forgotten so timer advances while UI says paused; promote fires twice; **no eligible player** and draft should cancel but instead hangs.

**Warning signs:** Ad hoc `if (captainDisconnected)` flags without a single FSM; timers not cancelled or rescheduled on transitions; fixes that only handle “happy path” reconnect.

**Prevention:** Model **explicit states** (e.g. `drafting`, `paused_captain_disconnect`, `cancelled`, `completed`) with **documented transitions**; only the server advances. Tie **grace timers** to FSM state entries; **clear or reschedule** on exit. **Single worker** or row-level lock per room for transition processing to avoid double promotion. Property tests or table-driven tests for captain disconnect sequences (including reconnect before grace ends, promote at grace end, empty team).

**Phase:** **Resilience** (primary); **Draft engine** (FSM ownership).

---

### 6. Split brain: in-memory room state vs PostgreSQL vs multiple Node instances

**What goes wrong:** Draft state lives only in process RAM; horizontal scale or rolling restart **drops** active drafts; or DB and memory disagree on “current turn.”

**Warning signs:** “We’ll add Redis later” with no persistence path for turn counter; load balancer without sticky sessions and room affinity undocumented.

**Prevention:** Decide early: **single active draft server** with clear ops story, or **externalized room state** (DB/Redis) + **single-writer** semantics per room. If staying on one Node for v1, document that constraint. If scaling, **do not** rely on in-memory-only maps without migration plan.

**Phase:** **Realtime foundation** + **Draft engine** (architecture spike); **Operations** milestone if multi-instance.

---

## Common Mistakes

- **Broadcasting huge snapshots every tick** — wastes bandwidth and hides incremental bugs; prefer versioned patches with full snapshot on join/reconnect.
- **No explicit close codes or reconnect policy** — users stuck spinning; align with max retries and user-visible “disconnected” ([WebSocket.org](https://www.websocket.org/guides/reconnection/)).
- **Trusting client for “host” or “captain”** — must resolve from DB membership + room creator id + server-side captain field.
- **Starting draft without server-checked invariants** — e.g. both teams have captain and minimum two players (per `PROJECT.md`); client-only checks cause rare server errors mid-flow.
- **Slur list as sole safety** — false positives annoy users; false negatives are inevitable; pair with rate limits and host kick/mute.
- **Ignoring proxy/load balancer idle timeouts** — WS drops “for no reason”; need heartbeat/ping and compatible infra timeouts.
- **Neon HTTP driver** for hot paths — fine for many request/response patterns; if every pick does multiple round-trips, latency and contention hurt; watch query patterns in **Draft engine** (consider pooling or batching for high-churn writes).

---

## Security Considerations

- **Auth at connection time only:** A long-lived socket may outlive session validity; re-validate session (or refresh token) on reconnect and periodically if product requires ([WebSocket.org security/reconnect notes](https://www.websocket.org/guides/reconnection/)).
- **IDOR on `/draft/[id]`:** When drafts are persisted, **authorize** join: public slug vs invite vs member list; spectators vs players must be enforced server-side (already flagged in `CONCERNS.md`).
- **Cross-role data leakage:** Team chat must never be emitted into spectator fanout; verify in tests with malicious payloads.
- **State manipulation:** Any “host override” (timer, order) must be **signed actions** on the server from verified host user id, not trusting client JSON.
- **Rate limiting bypass:** Per-connection and per-identity limits; don’t let alternate parameters (e.g. synthetic ids on handshake—pattern seen in gateway CVE discussions) skip limits; keep limiter maps bounded (TTL/cleanup) to avoid memory leaks in long-running WS servers.
- **Kick/mute race:** Kicked user’s socket may still be open briefly; server must reject further game actions and stop fanout immediately after kick record commits.

---

## Phase mapping (for roadmap)

| Phase (suggested) | Pitfalls this phase should explicitly design against |
|-------------------|------------------------------------------------------|
| **Realtime foundation** | Connection vs session identity, auth on reconnect, backoff+jitter, heartbeat vs proxy timeouts, rate limit attachment |
| **Lobby & presence** | Duplicate tabs, spectator vs player binding, host non-transferable enforcement |
| **Draft engine** | Server authority, timer deadline + atomic timeout vs pick, idempotency, FSM invariants for start/end |
| **Resilience** | Captain disconnect graph, pause/timer interaction, promotion/cancel, concurrent events |
| **Chat & moderation** | Server-side channel routing, Unicode/slur evasion, guest vs user rate keys, kick/mute effectiveness |

---

## Sources

- [WebSocket Reconnection: State Sync and Recovery Guide](https://www.websocket.org/guides/reconnection/) — reconnect frequency, jitter, seq/replay, in-flight/duplicate delivery, token refresh (HIGH confidence for general WS production patterns).
- Server-authoritative turn-based patterns (e.g. industry docs/tutorials emphasizing server-owned turn and score) — MEDIUM confidence; align with your chosen realtime library’s recommended model.
- Ecosystem issue patterns (e.g. Colyseus reconnect/session ordering) — LOW–MEDIUM confidence; validate against your stack, not as universal law.

---

*Consumer: roadmap / phase planning — use Critical Pitfalls as design review checklist before implementation.*
