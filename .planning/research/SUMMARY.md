# Research Summary

Unified synthesis for a **real-time pick/ban draft** (two teams, spectators, host rules) on **SvelteKit + Better Auth + Drizzle + Neon PostgreSQL**. Downstream consumers: roadmap and phase planning.

## Recommended Stack

- **WebSockets via `svelte-realtime` + `svelte-adapter-uws` (pin uWebSockets.js per upstream README)** — Lobby presence, turn progression, and dual chat channels need low-latency duplex messaging; RPC (`live`) plus `live.stream` / `ctx.publish` match room-scoped drafts without a custom wire protocol. This **replaces `@sveltejs/adapter-node`** and requires Vite plugin alignment and hosting that tolerates a long-lived Node + uWS process; verify deploy/preview early.
- **Neon + Drizzle as authoritative persistence** — Rooms, settings, final draft outcomes, and audit survive refresh, reconnect, and disputes. Validate mutations in `live` handlers, **write through to the DB**, then publish so clients stay aligned; Neon HTTP driver is acceptable for short queries in RPC paths—revisit if hot paths need multi–round-trip transactions.
- **`src/hooks.ws.js` + Better Auth at WebSocket upgrade** — Attach identity from cookies in `upgrade()`; enforce player vs spectator vs host in upgrade and `live` handlers. `src/live/*` centralizes room RPC, topics (e.g. team vs spectator), and `LiveError` for protocol errors.

## Table Stakes Features

Must ship for v1 to feel fair and complete: **room create/join with stable links**; **phase clarity** (lobby → drafting → review); **two teams** (max roster, auth-only players) with **authoritative turn order** and **single shared pick/ban pool**; **visible server-driven timers** (default ~30s, host-configurable per `PROJECT.md`); **host-controlled start** with **minimum conditions** (both captains, ≥2 players); **spectator read-only draft**; **real-time sync** (the core product promise); **post-draft summary**; **disconnect handling** (pause → grace → captain promotion or cancel); **team-only + spectator-only chat** (no cross-leak). Differentiators (host-adjustable script, pre-draft roster moves, kick/mute, chat hygiene) sharpen the product but depend on the same foundations.

## Architecture Pattern

Treat each draft room as a **small authoritative domain service**: clients send **intents** only; the server validates, runs a **draft FSM**, optionally checkpoints to Postgres, then **fans out** via publish/stream. **Hybrid storage:** in-memory `RoomRuntime` for live FSM, presence, and low-latency ordering; **DB for durability, SSR snapshots, and recovery**—checkpoint on meaningful boundaries (or per pick/ban once stable). Do not use request-scoped `locals` for shared room state; key shared state by `roomId` with strict auth/role guards.

## Top Pitfalls to Avoid

1. **Client or WebSocket as source of truth** — Prevents cheating and desync by keeping a **single server-authoritative FSM**; clients send intents; after reconnect, **hydrate from server snapshot + version/seq**, not stale local state.
2. **Client-driven turn timers** — **Server owns deadline timestamps** (`turnEndsAt`); clients render countdown from that; timeout logic runs **once on the server**; make pick/ban and timeout **atomic** so they cannot both win.
3. **Reconnect / duplicate tabs** — Separate **connection** from **participant** identity; define single-tab vs multi-tab policy; **idempotency** on critical intents; **exponential backoff + jitter** on reconnect; refresh short-lived auth before handshake when sessions may have expired.
4. **Chat rules only in the UI** — **Server-side** role resolution and channel routing (team vs spectator); rate limits keyed by **userId** / connection / room; normalize Unicode and cap length before filter; never trust client-declared role or channel.
5. **Captain disconnect + operational reality** — Model **explicit FSM states** (e.g. paused, grace, promote, cancel); tie grace timers to state entry/exit; single serialized transition path per room. **Document** single-instance / checkpointing for v1; before multi-instance, plan **Redis or sticky sessions** so in-memory room state does not silently diverge or vanish on deploy.

## Key Decisions Informed by Research

| Area | Research conclusion |
|------|---------------------|
| **Transport** | Commit to **first-party WebSockets** (stack above) for the happy path; reserve **PartyKit / managed pub-sub** only if hosting forbids uWS; avoid **SSE-only** or **polling** as primary sync; **Liveblocks** is a poor fit as the core draft engine. |
| **Persistence** | **Never** rely on in-memory-only for outcomes that must survive restart; WS layer is **live projection**; Postgres remains **source of truth** for completed drafts and critical room facts. |
| **Build order** | **Realtime + auth gate first** (prove `hooks.ws.js` + Better Auth), then **room model in DB + HTTP create/join**, **registry + presence**, **lobby semantics**, **draft FSM**, **timer**, **disconnect/resilience**, **chat**, **post-draft review**. |
| **Product scope** | Align table stakes with `PROJECT.md`: fixed host, no mid-draft team moves, no custom lists in v1, chat safety = rate limit + slur filter, captain disconnect policy as specified. |
| **Open validation** | Pick a **reference default ban/pick script** from the primary title and encode as **data-driven presets**; confirm **adapter + hosting** before locking production architecture; watch Neon query patterns if pick/ban writes become chatty. |

## Sources

- `.planning/research/STACK.md`, `FEATURES.md`, `ARCHITECTURE.md`, `PITFALLS.md`
- `.planning/PROJECT.md`
- External: [svelte-realtime README](https://github.com/lanteanio/svelte-realtime), [SvelteKit hooks / state management](https://svelte.dev/docs/kit/state-management), [WebSocket reconnection guide](https://www.websocket.org/guides/reconnection/)

*Synthesized 2026-04-03 for gsd-roadmapper and requirements work.*
