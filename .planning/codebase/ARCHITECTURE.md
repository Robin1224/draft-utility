---
last_mapped_commit: a6621e6df6e72e09b43157d0d2d0b048118a8016
---
<!-- refreshed: 2026-09-19 -->
# Architecture

**Analysis Date:** 2026-09-19

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        SvelteKit Routes (SSR shell)                  │
│  `src/routes/+page.svelte` `src/routes/draft/[id]/+page.svelte`      │
│  `src/routes/login/+page.svelte`   +page.server.js (load/actions)    │
└───────────────────────────┬───────────────────────────────────────────┘
                            │ imports live client hooks
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                Svelte Components (atoms/molecules/chrome)            │
│         `src/lib/components/{atoms,molecules,chrome,effects}`        │
└───────────────────────────┬───────────────────────────────────────────┘
                            │ calls generated $live/* client (svelte-realtime)
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│           Live RPC / Stream Layer (runs server-side over WS)         │
│   `src/live/room.js` `src/live/draft.js` `src/live/chat.js`          │
│   `src/live/draft-timers.js` (shared in-memory timer map)            │
│   Upgrade/auth hook: `src/hooks.ws.js`                                │
└───────────────────────────┬───────────────────────────────────────────┘
                            │ calls domain functions
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Server Domain Modules (`src/lib/server/`)           │
│  `rooms.js` (lobby/team/host ops) `draft.js` (draft state/actions)   │
│  `room-lifecycle.js` (TTL/visibility rules) `auth.js` (Better Auth)  │
└───────────────────────────┬───────────────────────────────────────────┘
                            │ Drizzle ORM queries
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│         Postgres (Neon serverless HTTP driver) — `room`,             │
│         `room_member`, `draft_action`, `user`/auth tables            │
│  Schema: `src/lib/server/db/schema.js` `src/lib/server/db/index.js`  │
│  Migrations: `drizzle/*.sql`, config `drizzle.config.js`             │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| SvelteKit HTTP routes | SSR page loads, form actions (create room, login), 404/error handling | `src/routes/+page.server.js`, `src/routes/draft/[id]/+page.server.js`, `src/routes/login/+page.server.js` |
| Draft page component | Owns all client-side draft/lobby UI state; subscribes to live streams; dispatches RPCs | `src/routes/draft/[id]/+page.svelte` |
| Layout / chrome | App-wide shell, phase tracker header, ambient shader background | `src/routes/+layout.svelte`, `src/lib/components/chrome/CyShell.svelte` |
| Lobby live functions | Team join/move/kick, host start/cancel, disconnect grace + captain promotion | `src/live/room.js` |
| Draft live functions | Pick/ban RPC, timer-driven auto-advance, draft completion | `src/live/draft.js` |
| Chat live functions | Per-channel chat streams, rate limiting, mute/unmute, profanity filter integration | `src/live/chat.js` |
| Shared timer registry | In-memory `setTimeout` map keyed by room id, used by both draft and room modules | `src/live/draft-timers.js` |
| WS upgrade/auth | Resolves guest vs. authenticated user identity at WebSocket handshake; session refresh RPC | `src/hooks.ws.js` |
| HTTP auth/session hooks | Guest cookie issuance, Better Auth session hydration into `event.locals`, dev error logging | `src/hooks.server.js` |
| Room domain logic | Room creation, public-code lookup, team membership, captain recomputation, host actions | `src/lib/server/rooms.js` |
| Draft domain logic | Draft action writes, snapshot assembly, race-safe turn advance via `jsonb_set` | `src/lib/server/draft.js` |
| Lobby lifecycle rules | Pure functions deciding when a lobby is abandoned/hidden | `src/lib/server/room-lifecycle.js` |
| Auth configuration | Better Auth instance (Discord OAuth, Drizzle adapter, cookie plugin) | `src/lib/server/auth.js` |
| DB schema & client | Drizzle Postgres schema (`room`, `room_member`, `draft_action`) + generated Better Auth tables; Neon HTTP client | `src/lib/server/db/schema.js`, `src/lib/server/db/index.js`, `src/lib/server/db/auth.schema.js` |
| Chat filtering | Length cap, NFKC normalization, zero-width stripping, slur list matching | `src/lib/chat-filter.js`, `src/lib/slur-list.json` |
| Draft script/catalog | Default pick/ban script, timer default, champion catalog | `src/lib/draft-script.js`, `src/lib/catalog/classes.json` |
| Join code parsing | Normalizes a pasted URL or raw code into a room public code | `src/lib/join-parse.js` |

## Pattern Overview

**Overall:** Realtime, server-authoritative SvelteKit application. Business logic and mutable game state live entirely on the server; the browser is a thin renderer that issues RPCs and subscribes to server-pushed snapshots over WebSocket. There is no client-side state store beyond component-local `$state`/`$derived` runes fed by live-stream subscriptions.

**Key Characteristics:**
- Single Postgres row (`room.draft_state` JSONB) is the source of truth for in-progress draft state; `draft_action` rows are the append-only, race-safe audit log of resolved turns.
- All realtime behavior (join team, pick/ban, chat, timers, disconnect handling) is implemented as `svelte-realtime` "live" functions/streams in `src/live/`, not as SvelteKit `+server.js` REST endpoints — there are no `+server.js` files in the codebase.
- HTTP (`+page.server.js`) is used only for the two synchronous flows that don't need realtime: creating a room and Discord OAuth login/logout. Everything else (lobby, draft, chat) flows over the WebSocket RPC layer.
- Server-authoritative optimistic concurrency: turn advancement uses a conditional `jsonb_set` UPDATE (`advanceTurnIfCurrent` in `src/lib/server/draft.js`) instead of interactive transactions, because the Neon HTTP driver (`@neondatabase/serverless`) has no transaction support — every server module doing multi-step writes uses **sequential queries with idempotent/race-safe guards** instead.
- Presence/disconnect handling is driven by `svelte-realtime`'s `onUnsubscribe` hook (`src/live/room.js`), which starts a grace timer and either resumes or promotes/cancels based on whether the captain reconnects.

## Layers

**Route/Page Layer:**
- Purpose: SSR entry, initial data load (`+page.server.js`), non-realtime form actions (create room, Discord sign-in/out)
- Location: `src/routes/`
- Contains: `+page.svelte`, `+page.server.js`, `+layout.svelte` per route
- Depends on: `$lib/server/*` (server-only, load/actions), `$live/*` client hooks (component `<script>`), `$lib/components/*`
- Used by: SvelteKit router / browser navigation

**Component Layer (atomic design):**
- Purpose: Presentational and stateful UI, organized atoms → molecules → chrome/effects
- Location: `src/lib/components/{atoms,molecules,chrome,effects}/`
- Contains: `.svelte` components, each with a co-located `.svelte.spec.js` when tested
- Depends on: `$live/*` for RPC calls (only in route-level `+page.svelte`; most molecules/atoms receive callbacks as props instead of importing `$live` directly), `$lib/draft-script.js`, `$lib/catalog/classes.json`
- Used by: route `+page.svelte` files

**Live (Realtime RPC) Layer:**
- Purpose: Server-side WebSocket RPC handlers and pub/sub streams; the only place mutations to room/draft/chat state are permitted
- Location: `src/live/` (recognized by `svelte-realtime/vite` plugin, which also generates `src/live/$types.d.ts` and the `$live` import alias)
- Contains: `live()` RPC functions and `live.stream()` subscriptions, each validating `ctx.user.role` before mutating
- Depends on: `$lib/server/rooms.js`, `$lib/server/draft.js`, `$lib/server/db`, `$lib/chat-filter.js`, `$lib/join-parse.js`, `$lib/draft-script.js`
- Used by: client components via the generated `$live/room`, `$live/draft`, `$live/chat` browser bindings

**Server Domain Layer:**
- Purpose: Pure-ish business logic and Drizzle queries, framework-agnostic (importable from both HTTP load functions and live RPC handlers)
- Location: `src/lib/server/`
- Contains: `rooms.js`, `draft.js`, `room-lifecycle.js`, `auth.js`, `db/`
- Depends on: `drizzle-orm`, `$lib/server/db`, `$lib/join-parse.js`
- Used by: `src/routes/**/+page.server.js`, `src/live/*.js`

**Data Layer:**
- Purpose: Schema definition and DB client
- Location: `src/lib/server/db/`
- Contains: `schema.js` (app tables), `auth.schema.js` (generated Better Auth tables), `index.js` (Neon HTTP Drizzle client)
- Depends on: `@neondatabase/serverless`, `drizzle-orm/neon-http`, `$env/dynamic/private`
- Used by: `src/lib/server/rooms.js`, `src/lib/server/draft.js`, `src/lib/server/auth.js`

## Data Flow

### Primary Request Path — Room Creation → Lobby → Draft

1. Browser POSTs the `createRoom` form action on `/` (`src/routes/+page.server.js:11`); redirects unauthenticated users to `/login`.
2. `createRoom(db, hostUserId)` inserts a `room` row with a unique `public_code` (retry loop on collision) (`src/lib/server/rooms.js:42`).
3. Browser is redirected to `/draft/[id]`; `+page.server.js` load (`src/routes/draft/[id]/+page.server.js:8`) resolves the room via `getRoomByPublicCode`, applying lifecycle rules (`shouldHideRoomFromPublic`, `shouldAbandonLobby` in `src/lib/server/room-lifecycle.js`).
4. On mount, `src/routes/draft/[id]/+page.svelte:28` subscribes to the `lobby(code)` live stream (`src/live/room.js:113`), which returns either a lobby or draft snapshot depending on `room.phase`.
5. Host actions (`joinTeam`, `kickMember`, `movePlayer`, `startDraft`, `cancelRoom`) are invoked as RPCs from the page component and dispatch to `src/live/room.js`, each validating role/host-ship, mutating via `src/lib/server/rooms.js`, then `ctx.publish(topicForRoom(code), 'set', snap)` to push the new snapshot to all subscribers.
6. `startDraft` bakes a script + timer into `room.draft_state` (`startDraftWithSettings`, `src/lib/server/rooms.js:459`) and schedules the first turn timer (`scheduleTimer` in `src/live/draft-timers.js`).
7. During drafting, `pickBan` (`src/live/draft.js:96`) validates captaincy/turn/champion availability, writes a `draft_action` row, advances `turnIndex`, reschedules the timer, and republishes the snapshot. Timer expiry without action calls `autoAdvanceTurn` (same file) which race-safely advances via `advanceTurnIfCurrent`'s conditional `jsonb_set`.
8. On the final turn, `completeDraft` sets `room.phase = 'review'`; the review UI branch in `+page.svelte:281` renders `DraftReview` using SSR-loaded `data.actions`/`data.teams` with a live-snapshot fallback.

### Disconnect / Reconnect Flow (Captain Grace Period)

1. `svelte-realtime`'s `onUnsubscribe` hook fires when a captain's WebSocket closes during `phase === 'drafting'` (`src/live/room.js:158`).
2. The current turn's captaincy is checked against `room_member`; if the disconnecting user is the active captain, the draft is paused (`draft_state.paused = true`), the turn timer is cleared, and a grace timer is scheduled (30s, or 10s on a second disconnect) via `src/live/draft-timers.js`.
3. If the captain resubscribes to `lobby(code)` before grace expires, the `lobby` stream's subscribe handler detects `paused && pausedUserId === ctx.user.id`, clears the pause, and resumes the turn timer (`src/live/room.js:129`).
4. If grace expires first, `disconnectGraceExpired` (`src/live/room.js:75`) either promotes the next-oldest teammate to captain and resumes the timer, or — if no eligible member exists — cancels the draft (`cancelDraftNoCaption`).

**State Management:**
- Server: `room.draft_state` JSONB is the mutable "current turn" state; `draft_action` rows are the immutable log. In-memory `Map`s hold ephemeral, non-persisted state that is safe to lose on restart: `roomTimers` (`src/live/draft-timers.js`), `muteMap`/`messageStore`/`rateLimitMap` (`src/live/chat.js`).
- Client: no global store; `+page.svelte` holds all UI state in runes (`$state`, `$derived`) and receives live-stream values via `fromStore(lobby(code))` / manual `store.subscribe()` in an `$effect` (chat stream, to allow resubscribing on tab change).

## Key Abstractions

**Live Function / Live Stream (svelte-realtime):**
- Purpose: Declarative WebSocket RPC (`live(handler)`) and pub/sub subscription (`live.stream(topicFn, loader, options)`) with automatic client bindings generated into `src/live/$types.d.ts`
- Examples: `src/live/room.js`, `src/live/draft.js`, `src/live/chat.js`
- Pattern: every handler receives `ctx` (contains `ctx.user`, `ctx.publish`, `ctx.platform`) as first arg; throws `LiveError(code, message)` for client-visible errors; role/permission checks always occur first, DB reads second, mutation third, `ctx.publish` last.

**Snapshot (LobbySnapshot / DraftSnapshot):**
- Purpose: Single denormalized read-model object sent to clients on every publish; typedef'd via JSDoc
- Examples: `loadLobbySnapshot` (`src/lib/server/rooms.js:158`), `loadDraftSnapshot` (`src/lib/server/draft.js:45`, extends lobby snapshot with `draftState` + `actions`)
- Pattern: always recomputed from DB after a mutation and republished wholesale (`merge: 'set'` on streams — patches are not supported by `merge:'set'` topics, noted at `src/live/chat.js:267`)

**Domain Error Sentinels:**
- Purpose: Cheap, comparable error values thrown by domain functions and mapped to `LiveError` at the live-layer boundary
- Examples: `TEAM_FULL`, `NOT_HOST`, `KICK_TARGET_MISSING`, `INVALID_KICK_TARGET`, `LOBBY_PHASE_REQUIRED`, `DRAFT_NOT_READY`, `PLAYER_NOT_ON_TEAM` (all exported string constants in `src/lib/server/rooms.js`)
- Pattern: domain layer `throw`s the sentinel (or an `Error('ROOM_NOT_FOUND')`); the live layer's `mapRoomMutationError()` (`src/live/room.js:34`) translates each to a typed `LiveError`

**Atomic Design Component Tree:**
- Purpose: UI composition discipline
- Examples: `atoms/` (ChampionCard, TimerDisplay, StatusBanner…), `molecules/` (DraftBoard, ChatPanel, LobbyHostBar…), `chrome/` (CyShell — app shell), `effects/` (CyShader, CyLogo — decorative/ambient)
- Pattern: molecules compose atoms and receive data + callback props from the route component; no molecule/atom imports `$live/*` directly except where explicitly wired (verify per-component before assuming)

## Entry Points

**HTTP request entry:**
- Location: `src/hooks.server.js`
- Triggers: every HTTP request
- Responsibilities: issues a stable `draft_guest` cookie for anonymous WS identity, hydrates Better Auth session into `event.locals`, delegates to `svelteKitHandler` for Better Auth's own routes, and logs nested Postgres error causes in dev

**WebSocket upgrade entry:**
- Location: `src/hooks.ws.js`
- Triggers: every WebSocket connection attempt (via `svelte-adapter-uws`)
- Responsibilities: resolves `ctx.user` as `{ role: 'guest', guestId }` or `{ role: 'player', id, name }` from the Better Auth session/cookie; never rejects a connection (guests always allowed per D-12); exposes `live.auth.refreshSession()` for in-place role upgrade after OAuth completes

**Root layout:**
- Location: `src/routes/+layout.svelte`
- Triggers: every page render
- Responsibilities: wraps all routes in `CyShell`, derives the phase tracker from the room's live lobby snapshot when a room code is present in the URL

**Draft room page:**
- Location: `src/routes/draft/[id]/+page.svelte`
- Triggers: navigating to `/draft/<code>`
- Responsibilities: single largest client entry point (~400 lines); owns all lobby/draft/chat UI state and wires every live RPC call

## Architectural Constraints

- **Threading:** Single Node.js process (uWS event loop via `svelte-adapter-uws`); no worker threads. `setTimeout`-based turn/grace timers in `src/live/draft-timers.js` only work correctly on a single instance — see Scaling Limits in CONCERNS.md.
- **Global state:** Module-level singleton `Map`s hold ephemeral state: `roomTimers` (`src/live/draft-timers.js`), `rateLimitMap`, `muteMap`, `messageStore` (`src/live/chat.js`). None of this is persisted or shared across processes.
- **No interactive DB transactions:** `@neondatabase/serverless` HTTP driver does not support multi-statement transactions. Multi-step domain writes (e.g., `joinTeamForUser`, `kickMember`, `movePlayer`, `promoteCaptain` in `src/lib/server/rooms.js`) use sequential queries with recompute-after-write patterns (`recomputeTeamCaptains`) instead of `BEGIN/COMMIT`. Turn advancement instead uses a single conditional `UPDATE ... WHERE (draft_state->>'turnIndex')::int = expected` (`advanceTurnIfCurrent`, `src/lib/server/draft.js:101`) for atomicity.
- **Circular import avoidance:** `src/live/draft-timers.js` is deliberately kept free of any `svelte-realtime`/live imports because both `src/live/draft.js` and `src/live/room.js` import it — see the file's header comment.
- **`$live` path alias:** Not declared in `jsconfig.json`; provided dynamically by the `svelte-realtime/vite` plugin (`realtime()` in `vite.config.js`), which also regenerates `src/live/$types.d.ts` on file-system scans of `src/live/`. `vite.config.js` explicitly ignores watching that generated file to avoid an infinite reload loop (see comment at `vite.config.js:12`).
- **Type checking is opt-out per file:** Several `src/live/*.js` and `src/lib/server/draft.js` files start with `// @ts-nocheck`, meaning `svelte-check` does not validate their JSDoc types.

## Anti-Patterns

### None identified as systemic

No repeated incorrect pattern was found spanning multiple files during this pass; file-specific issues (empty component, `@ts-nocheck` usage, single-instance timer state) are tracked as items in `CONCERNS.md` rather than architecture-level anti-patterns.

## Error Handling

**Strategy:** Two-tier — domain functions throw cheap sentinel values or plain `Error`s; the live/RPC boundary converts them to `LiveError(code, message)` instances that `svelte-realtime` serializes to the client. HTTP routes use SvelteKit's `error()`/`fail()`/`redirect()` helpers directly.

**Patterns:**
- Domain layer throws string constants (`TEAM_FULL`) or `new Error('ROOM_NOT_FOUND')`; never throws `LiveError` itself, keeping it framework-agnostic
- Live layer wraps mutation calls in `try { ... } catch (e) { const mapped = mapRoomMutationError(e); if (mapped) throw mapped; throw e; }` (repeated in `src/live/room.js` for `kickMember`, `movePlayer`, `startDraft`, `cancelRoom`)
- Unique-constraint races (duplicate turn writes) are detected via a recursive `isUniqueViolation(err)` helper checking Postgres error code `23505`, duplicated in both `src/lib/server/rooms.js` and `src/lib/server/draft.js`
- Client components catch RPC promise rejections and surface `e.message`/`e.code` into a local `actionError` state; some errors (rate limit, slur filter) are intentionally silent per product requirements (`src/live/chat.js:196`, `:216`, `:223`)

## Cross-Cutting Concerns

**Logging:** Minimal; only dev-mode Postgres error-cause chains are logged in `src/hooks.server.js:44` (`handleError`). No structured/production logging framework.
**Validation:** Manual per-field validation inside live handlers (e.g., team enum, script shape, timer bounds in `startDraft`, champion existence in `pickBan`) — no shared schema validation library (no zod/valibot dependency).
**Authentication:** Better Auth (`src/lib/server/auth.js`) with Discord as the sole social provider; guest identity is a signed HTTP-only cookie (`draft_guest`) merged into WS `ctx.user` at upgrade time (`src/hooks.ws.js`).

---

*Architecture analysis: 2026-09-19*
