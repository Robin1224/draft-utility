# Architecture Research

**Scope:** Real-time pick/ban draft in an existing SvelteKit + Neon PostgreSQL + Drizzle + Better Auth app.  
**Scale:** Minimum 2 concurrent users; typical 2–8 (two teams of up to 3 + spectators).  
**Researched:** 2026-04-03  
**Confidence:** **HIGH** for separation of concerns, FSM authority, and hybrid storage; **MEDIUM** for choosing `svelte-realtime` vs. a custom Node WebSocket until you validate deployment constraints (adapter swap).

---

## Recommended Pattern

Treat each **draft room** as a **small authoritative domain service** running on the server: one **source of truth** for draft phase, turn order, timer deadline, picks/bans, and membership roles. Clients are **thin views** that send **intents** (RPC-style messages); the server **validates**, **transitions state**, optionally **persists checkpoints**, then **fans out** updates to everyone in the room.

For **transport**, pick one path and stick to it:

1. **Stack-aligned (already in `package.json`):** `svelte-realtime` + `svelte-adapter-uws` — WebSocket upgrade in `src/hooks.ws.js`, callable server modules under `src/live/`, `ctx.publish` / `live.stream()` for subscriptions ([svelte-realtime README](https://github.com/lanteanio/svelte-realtime)). This replaces `@sveltejs/adapter-node` and requires the uWS + Vite plugin setup from that project.
2. **Stay on `adapter-node`:** attach a **custom Node server** that mounts SvelteKit’s `handler` and adds a **parallel WebSocket path** (or a small sidecar). More plumbing; same domain model as (1).
3. **Managed realtime (PartyKit, Ably, Pusher, etc.):** offloads fan-out and sometimes presence; you still implement the **draft FSM** in your backend or in worker logic. Adds vendor ops and auth bridging.

For this codebase, **(1) is the most direct** given declared dependencies and the need for RPC + pub/sub without inventing a protocol. If production must stay on `adapter-node` (e.g. hosting constraints), plan **(2)** explicitly in a phase.

SvelteKit’s own docs stress **not storing per-user data in shared server globals** for request handlers; **room state is different**: it is intentionally **shared per room** but must be keyed by `roomId` and guarded by auth/roles, not stored on `event.locals` as if it were a single-user session ([SvelteKit state management](https://svelte.dev/docs/kit/state-management)).

---

## Components

| Component | Responsibility | Boundary |
|-----------|----------------|----------|
| **HTTP surface (SvelteKit)** | SSR/CSR pages, initial `load` data, form actions for non-realtime setup (create room, static settings where appropriate) | Browser ↔ SvelteKit routes; uses `event.locals` from Better Auth |
| **WebSocket transport** | Persistent duplex channel per tab; authentication at upgrade | Browser ↔ `hooks.ws.js` `upgrade()`; message routing (e.g. `svelte-realtime/server` `message` export) |
| **Session binding** | Map Better Auth session (cookies in HTTP upgrade) to `ctx.user` / roles | Only in `upgrade()` + shared server helpers; never trust client-sent user id |
| **Room registry** | `roomId → RoomRuntime` (create on first join, teardown when empty or TTL) | Server-only module; **not** per-request locals |
| **Room runtime** | Orchestrates one room: members, teams, spectators, host id, mute/kick flags, chat channel membership | Holds references to FSM + presence; serializes mutations per room (single-threaded queue or mutex) |
| **Draft state machine (FSM)** | Valid transitions: lobby → drafting → review; sub-state for current turn, action type (pick/ban), paused (captain disconnect), cancelled | **Pure transition table + effects**; called only from room runtime after validation |
| **Timer authority** | Stores **deadline timestamp** (server clock) or remaining ms; ticks optional; on expiry emits transition | Server drives; clients display derived countdown (sync with server time skew if needed) |
| **Presence** | Who is connected, optional “typing”, last seen for disconnect logic | Tied to WebSocket lifecycle; broadcast join/leave; reconcile with DB membership on reconnect |
| **Chat** | Team-only and spectator-only channels; rate limit + slur filter before publish | Either separate **topics** per channel or server-side filter before `publish`; persistence optional (Neon) |
| **Persistence (Neon + Drizzle)** | Rooms, host, settings snapshot, final draft result, optional message log, audit of host actions | Written on meaningful events, not every keystroke; used for SSR entry and recovery |

---

## Data Flow

**Bootstrapping (HTTP)**

1. User opens `/draft/[id]`. `+page.server.js` `load` validates session (and room access), returns **safe snapshot**: phase, teams, display names, settings that are OK to leak to that user, and whether they are host/spectator/player.
2. Page hydrates; client opens WebSocket (after or in parallel with navigation).

**Realtime session**

3. **Upgrade:** read cookies → Better Auth session → attach `{ userId, … }` to connection; reject if invalid (pattern from [svelte-realtime docs](https://github.com/lanteanio/svelte-realtime)).
4. **Join room:** client calls a **live/RPC** function `joinRoom(roomId)` → server adds connection to room registry, updates presence, returns current authoritative state or subscribes to a **stream/topic** for that room.
5. **Intents:** pick/ban, host start draft, move player (pre-draft only), kick/mute, chat message → **single server entry point** per concern → validate role + FSM + invariants → **mutate room runtime** → `publish` to room topic (or targeted `signal` for secrets e.g. team chat).
6. **Timer:** server sets `turnDeadline`; optionally periodic tick for UX; on expiry FSM advances; broadcast new state.
7. **Disconnect:** presence updates; captain disconnect triggers **pause** branch in FSM; grace timer runs server-side.

**Direction summary**

- **Client → server:** intents only (commands), never “here is the new draft state”.
- **Server → client:** state deltas or full snapshots after each successful transition + presence/chat events.
- **Server → DB:** async or transactional writes on boundaries (draft start, each pick/ban, draft end, moderation actions you need audited).

---

## Build Order

Order by **dependencies** and **risk reduction**:

1. **Realtime plumbing + auth gate** — `hooks.ws.js`, adapter choice, `upgrade()` wired to Better Auth; trivial echo or counter to prove connectivity.
2. **Room model in DB + HTTP create/join** — persist room id, host user id, baseline settings; `load` returns consistent initial snapshot.
3. **Room registry + join/leave presence** — single room, multiple tabs; host vs non-host flag only.
4. **Lobby semantics** — teams, captains, host moves players, start-draft preconditions (your PRODUCT rules: min players, captains, etc.).
5. **Draft FSM core** — turn order, pick/ban actions, list constraints; still small test UI.
6. **Turn timer** — deadline-based; integrate with FSM expiry transitions.
7. **Captain disconnect / pause / promote / cancel** — extends FSM + presence.
8. **Chat** — team and spectator channels on top of stable membership; rate limit + filter in the RPC path.
9. **Post-draft review** — persist final structure; read-only view from DB + optional last realtime “draft ended” event.

**Rationale:** Chat and moderation are easier once **membership and roles** are stable; the FSM should exist before timer and disconnect rules so you do not special-case three overlapping state concepts.

---

## State Storage

| Kind of state | Where | Why |
|---------------|--------|-----|
| **Draft FSM (turn, picks/bans, paused/cancelled)** | **Primary: server memory** in `RoomRuntime` | Low latency; strict ordering; trivial scale for 2–8 users per room |
| **Room membership, host, settings, final result** | **PostgreSQL (Neon)** | Durability; SSR; audit; recovery after deploy |
| **Presence (online, connection scoped)** | **Memory** keyed by room + connection | Ephemeral by nature; rebuild from reconnects |
| **Chat (v1)** | **Memory with optional DB append** | Rate-limited volume: memory-only is simplest; persist if you need history or reports |

**Hybrid pattern (recommended):** **memory authoritative** for the live draft + presence; **DB** as **checkpoint** (e.g. on each pick/ban or every N seconds) so a crash loses at most a short window. For early MVP with single Node instance, you can **checkpoint only at phase boundaries** (draft start, draft end) and accept rare loss on hard kill—document that tradeoff.

**Multi-instance caveat (LOW probability at current scale):** If you later run **more than one Node process**, in-memory room state **must** be backed by **Redis** (or equivalent) for registry + pub/sub, or you must pin rooms with **sticky sessions** and accept failover gaps. Not required for “typical 2–8” on one instance.

---

## Sources

- [SvelteKit — Hooks](https://svelte.dev/docs/kit/hooks) (`init`, request `handle`, shared hook behavior)
- [SvelteKit — State management](https://svelte.dev/docs/kit/state-management) (avoid unsafe shared globals in request path; contrast with intentional shared room state)
- [SvelteKit — adapter-node / custom server](https://svelte.dev/docs/kit/adapter-node) (custom server + `handler` if staying on Node without uWS)
- [lanteanio/svelte-realtime — README](https://github.com/lanteanio/svelte-realtime) (`hooks.ws.js`, `src/live/`, `live()`, `live.stream()`, `ctx.publish` / `ctx.signal`)
- Internal: `.planning/PROJECT.md`, `.planning/codebase/ARCHITECTURE.md` (brownfield stack, unused realtime deps)

---

*Architecture research for roadmap / phase planning. Does not commit implementation choices to production until adapter and hosting constraints are confirmed.*
