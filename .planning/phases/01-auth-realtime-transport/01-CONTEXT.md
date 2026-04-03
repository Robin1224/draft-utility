# Phase 1: Auth & Realtime Transport - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver two things: (1) fully working production authentication via Discord OAuth, and (2) a proven WebSocket upgrade layer (`hooks.ws.js`) that reads Better Auth session cookies and tags connections as `role: 'player'` (authenticated) or `role: 'guest'` (unauthenticated). All auth routes are new, minimal-design production pages. Demo auth pages are removed.

This phase does NOT include lobby mechanics, room creation, team assignment, or any draft functionality — those belong to Phase 2 onward.

</domain>

<decisions>
## Implementation Decisions

### Auth Routes

- **D-01:** Create a new `/login` route — a single page with sign-in by default and an inline toggle/link to register. Clean production URL; replaces the demo path at `src/routes/demo/better-auth/`.
- **D-02:** Design is minimal for Phase 1 (functional, unstyled or lightly styled). A polished auth UI comes when the overall app UI is designed in a later phase.
- **D-03:** After successful sign-in or OAuth callback, redirect the user back to the page they came from (return-to behavior using a `redirect` query param or referrer). If no prior page, fall back to `/` (home).
- **D-04:** Remove the demo auth pages (`src/routes/demo/better-auth/`) as part of this phase — they are replaced by the production `/login` route.

### OAuth Providers

- **D-05:** Discord OAuth only — Discord is the sole authentication method. No email/password.
- **D-06:** Disable `emailAndPassword` in `src/lib/server/auth.js`. Add Discord as the social provider plugin. No other providers.
- **D-07:** The login page UI leads with a single "Sign in with Discord" button. No other sign-in options displayed.

### Adapter Swap Scope

- **D-08:** Swap `@sveltejs/adapter-node` for `svelte-adapter-uws` in `svelte.config.js`. Wire up `hooks.ws.js` alongside the existing `hooks.server.js`.
- **D-09:** Phase 1 scope is dev-proven: the adapter is swapped, `hooks.ws.js` reads the Better Auth session, and the WS identity layer is verified to work in local development (`npm run dev`). No automated test required for this layer in Phase 1.
- **D-10:** Production hosting validation is a known concern (flagged in STATE.md) but is **not a Phase 1 gate**. It is addressed when the project is deployed.
- **D-11:** `@sveltejs/adapter-node` moves to `devDependencies` or is removed; `svelte-adapter-uws` becomes the sole production adapter.

### Guest WebSocket Handling

- **D-12:** Unauthenticated connections (no Better Auth session cookie) are **allowed to upgrade** to WebSocket. They are tagged `role: 'guest'` in the connection context at upgrade time.
- **D-13:** Downstream `svelte-realtime` handlers and topic subscriptions enforce spectator-only access based on `role`. Guests receive only public/spectator topics; they cannot publish or subscribe to player/team topics.
- **D-14:** If a guest signs in via Discord OAuth while their WS connection is live, the server **upgrades the connection's role in-place** (no forced reconnect). The client does not need to re-establish the WS connection after sign-in.

### Claude's Discretion

- Exact `hooks.ws.js` file structure and how Better Auth session is read from the `upgrade` request headers/cookies — follow the `svelte-realtime` README pattern.
- How the `redirect` query param is set and read in the sign-in flow — standard SvelteKit `url.searchParams` pattern.
- Whether `@sveltejs/adapter-node` is removed entirely or kept in devDependencies.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Project vision, decisions, constraints
- `.planning/REQUIREMENTS.md` — AUTH-01–04 acceptance criteria
- `.planning/research/SUMMARY.md` — Recommended stack and architecture pattern

### Existing Auth & Hooks
- `src/lib/server/auth.js` — Current Better Auth config (emailAndPassword + drizzleAdapter); to be updated with Discord social provider
- `src/hooks.server.js` — Existing hooks pattern; `hooks.ws.js` follows the same file convention
- `src/routes/demo/better-auth/` — Demo auth pages to be removed

### Realtime Stack
- `package.json` — `svelte-realtime ^0.4.6`, `svelte-adapter-uws ^0.4.4` already in dependencies
- `.planning/codebase/STACK.md` — Full stack inventory
- `.planning/codebase/ARCHITECTURE.md` — Entry points, hooks layer, adapter location

### Codebase Patterns
- `.planning/codebase/CONVENTIONS.md` — Naming conventions, JSDoc patterns, Svelte 5 runes usage
- `svelte.config.js` — Adapter config to be swapped

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/server/auth.js` — Better Auth instance; extend with `discord()` social plugin, remove `emailAndPassword`
- `src/hooks.server.js` — Pattern for `handle` export + `svelteKitHandler`; mirrors structure for `hooks.ws.js`
- `src/lib/server/db/` — Drizzle + Neon already wired; auth schema auto-generated via `npm run auth:schema`
- `src/lib/components/molecules/Header.svelte` — Reusable header; login page can include it

### Established Patterns
- **Auth actions:** SvelteKit `actions` in `+page.server.js` calling `auth.api.*` — used in demo pages; production `/login` follows same pattern
- **Error display:** `form?.message` on login page; replicate for Discord OAuth error states
- **Environment variables:** `$env/dynamic/private` pattern; new vars needed: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`
- **JSDoc + Svelte 5 runes:** `$props()`, `$state()`, `$derived()` — follow existing conventions in new components

### Integration Points
- `svelte.config.js` — adapter swap (`adapter-node` → `svelte-adapter-uws`)
- `src/hooks.server.js` — WS hooks co-located as `src/hooks.ws.js`
- `src/app.d.ts` — May need `App.Locals` extended if WS context carries role alongside the existing session/user types

</code_context>

<specifics>
## Specific Ideas

- **Discord-only auth:** This is intentional — the target audience is competitive/gaming communities already on Discord. The login page should feel native to that context (Discord brand colors/button style acceptable).
- **Seamless guest→player upgrade:** Phase 1 establishes the in-place role upgrade mechanism. Phases 2+ build on top of this when team assignment requires the player identity.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 1 scope.

</deferred>

---

*Phase: 01-auth-realtime-transport*
*Context gathered: 2026-04-03*
