# Phase 01: Auth & Realtime Transport - Research

**Researched:** 2026-04-03
**Domain:** Better Auth (Discord OAuth) + svelte-adapter-uws + svelte-realtime WebSocket identity layer
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Auth Routes**
- D-01: Create `/login` route — single page, sign-in default, inline toggle to register. Replaces demo path at `src/routes/demo/better-auth/`.
- D-02: Design is minimal for Phase 1 (functional, unstyled or lightly styled).
- D-03: Redirect to `?redirect` query param origin after sign-in/OAuth callback; fall back to `/`.
- D-04: Remove demo auth pages (`src/routes/demo/better-auth/`) as part of this phase.

**OAuth Providers**
- D-05: Discord OAuth only — no email/password.
- D-06: Disable `emailAndPassword` in `src/lib/server/auth.js`. Add Discord as the social provider. No other providers.
- D-07: Login page leads with a single "Sign in with Discord" button. No other sign-in options displayed.

**Adapter Swap Scope**
- D-08: Swap `@sveltejs/adapter-node` for `svelte-adapter-uws` in `svelte.config.js`. Wire up `hooks.ws.js` alongside the existing `hooks.server.js`.
- D-09: Phase 1 scope is dev-proven: adapter swapped, `hooks.ws.js` reads the Better Auth session, WS identity layer verified in local dev (`npm run dev`). No automated test required for this layer in Phase 1.
- D-10: Production hosting validation is NOT a Phase 1 gate — addressed at deployment.
- D-11: `@sveltejs/adapter-node` moves to devDependencies or is removed; `svelte-adapter-uws` becomes the sole production adapter.

**Guest WebSocket Handling**
- D-12: Unauthenticated connections (no Better Auth session cookie) are **allowed to upgrade** to WebSocket. They are tagged `role: 'guest'` in the connection context.
- D-13: Downstream `svelte-realtime` handlers enforce spectator-only access based on `role`. Guests receive only public/spectator topics.
- D-14: If a guest signs in while their WS connection is live, the server **upgrades the connection's role in-place** (no forced reconnect).

### Claude's Discretion
- Exact `hooks.ws.js` file structure and how Better Auth session is read from the `upgrade` request headers/cookies — follow the `svelte-realtime` README pattern.
- How the `redirect` query param is set and read in the sign-in flow — standard SvelteKit `url.searchParams` pattern.
- Whether `@sveltejs/adapter-node` is removed entirely or kept in devDependencies.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within Phase 1 scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

> Note: REQUIREMENTS.md AUTH-01–04 were written for email/password + Google/GitHub OAuth. CONTEXT.md locked decisions D-05–D-07 supersede those descriptions. The acceptance criteria below are re-mapped to the locked Discord-only scope.

| ID | Original Description | Phase 1 Interpretation | Research Support |
|----|---------------------|------------------------|-----------------|
| AUTH-01 | User can create an account with email/password | User can create an account via Discord OAuth (first OAuth login auto-creates account) | Better Auth `account` table handles OAuth account creation via `socialProviders.discord` config |
| AUTH-02 | User can sign in with email/password and stay signed in across sessions | User can sign in via Discord OAuth and remain signed in across page reloads and browser restarts | Better Auth session cookies are `httpOnly`, persistent, handled by `sveltekitCookies` plugin |
| AUTH-03 | User can sign out from any page | User can sign out from any page via `auth.api.signOut` — existing pattern in demo pages | Existing `signOut` action pattern in `+page.server.js` fully reusable |
| AUTH-04 | User can sign in with OAuth (Google and/or GitHub) | User can sign in with Discord OAuth and land back in the app with a valid session | `auth.api.signInSocial({ body: { provider: 'discord', callbackURL } })` returns redirect URL; server redirects to Discord |
</phase_requirements>

---

## Summary

Phase 1 has two tracks: (1) replace the demo auth flow with a production Discord-only login page, and (2) activate the WebSocket adapter and wire up identity at the upgrade boundary.

All runtime dependencies are already installed: `svelte-realtime ^0.4.6`, `svelte-adapter-uws ^0.4.4`, `uWebSockets.js v20.60.0`, and `ws ^8.20.0` are present in `node_modules`. The existing `auth.schema.js` already includes the `account` table with `provider_id` — no schema migration is required to add Discord OAuth; only a schema regeneration to confirm nothing changed after removing `emailAndPassword`. The database adapter (Neon + Drizzle) and the Better Auth session cookie infrastructure are unchanged.

The primary technical work is: (a) swapping one config value in `svelte.config.js`, adding two Vite plugins in `vite.config.js`, (b) updating `auth.js` to enable Discord and disable email/password, (c) creating `src/hooks.ws.js` with the upgrade function that calls `auth.api.getSession`, (d) building the minimal `/login` route per the UI-SPEC, and (e) deleting the demo pages.

**Primary recommendation:** Follow the exact patterns from the existing `hooks.server.js` and demo `+page.server.js` files — they already use the correct Better Auth API surface. The adapter swap and hooks.ws.js wiring are the only genuinely new territory.

---

## Standard Stack

### Core (all already installed)

| Library | Installed Version | Latest | Purpose | Status |
|---------|------------------|--------|---------|--------|
| `svelte-adapter-uws` | 0.4.4 | 0.4.5 | SvelteKit adapter replacing `adapter-node`; built-in WebSocket via uWebSockets.js | ✓ in `dependencies` |
| `svelte-realtime` | 0.4.6 | 0.4.6 | RPC + reactive streams over WebSocket; message router for `hooks.ws.js` | ✓ in `dependencies` |
| `uWebSockets.js` | 20.60.0 | 20.60.0 | Native C++ HTTP/WebSocket server (required by adapter, installed from GitHub) | ✓ in `node_modules` |
| `ws` | 8.20.0 | — | Dev-only WebSocket server used by adapter during `npm run dev` | ✓ in `devDependencies` |
| `better-auth` | ~1.4.21 (1.4.22 installed) | 1.5.6 | Auth framework; Discord social provider via `socialProviders.discord` config | ✓ in `devDependencies` |
| `@sveltejs/adapter-node` | 5.5.2 | — | Current production adapter — to be moved to devDependencies or removed | ✓ in `devDependencies` (already) |

> `svelte-adapter-uws` 0.4.5 is one minor version ahead of 0.4.4. Since the project pins `^0.4.4`, running `npm update svelte-adapter-uws` is safe but not required for Phase 1.

### Supporting

| Library | Version | Purpose |
|---------|---------|---------|
| `@neondatabase/serverless` | ^1.0.2 | HTTP driver for Postgres — unchanged |
| `drizzle-orm` | ^0.45.1 | ORM — unchanged |
| `drizzle-kit` | ^0.31.8 | Schema CLI (`auth:schema`, `db:push`) — needed to re-sync after auth.js change |

**No new packages to install.** All runtime dependencies are present.

---

## Architecture Patterns

### Recommended Project Structure Changes

```
src/
├── hooks.server.js           # unchanged — session hydration for HTTP
├── hooks.ws.js               # NEW — WebSocket upgrade identity layer
├── lib/
│   ├── server/
│   │   └── auth.js           # MODIFIED — socialProviders.discord, remove emailAndPassword
│   └── components/
│       └── molecules/
│           └── LoginCard.svelte  # NEW — Discord OAuth button, mode toggle, error
├── routes/
│   ├── login/
│   │   ├── +page.svelte      # NEW — imports Header + LoginCard
│   │   └── +page.server.js   # NEW — load (redirect if authed), actions.signin/register
│   └── demo/
│       └── better-auth/      # DELETED — replaced by /login
svelte.config.js              # MODIFIED — adapter-node → svelte-adapter-uws
vite.config.js                # MODIFIED — add uws() + realtime() plugins
.env / .env.example           # MODIFIED — add DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET
```

### Pattern 1: Better Auth Discord OAuth config

**What:** Replace `emailAndPassword` with `socialProviders.discord` in `betterAuth(...)`.
**When to use:** Only social provider for Phase 1 is Discord.

```js
// src/lib/server/auth.js
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';

export const auth = betterAuth({
  baseURL: env.ORIGIN,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg' }),
  socialProviders: {
    discord: {
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET
    }
  },
  plugins: [sveltekitCookies(getRequestEvent)] // must remain last
});
```

> **Source:** Verified from `@better-auth/core/dist/social-providers/index.mjs` and `better-auth/dist/test-utils/test-instance.d.mts`. The `socialProviders` key is a first-class `betterAuth` config option; Discord is NOT configured via `plugins`.

### Pattern 2: svelte-adapter-uws + Vite plugins

**What:** Swap adapter in `svelte.config.js` and add both Vite plugins.
**When to use:** Required for any WebSocket functionality.

```js
// svelte.config.js
import adapter from 'svelte-adapter-uws';

const config = {
  kit: { adapter: adapter({ websocket: true }) },
  vitePlugin: {
    dynamicCompileOptions: ({ filename }) =>
      filename.includes('node_modules') ? undefined : { runes: true }
  }
};
export default config;
```

```js
// vite.config.js — add uws() and realtime() alongside existing plugins
import uws from 'svelte-adapter-uws/vite';
import realtime from 'svelte-realtime/vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit(), uws(), realtime(), devtoolsJson()],
  // ... test config unchanged
});
```

> **Source:** `svelte-adapter-uws/README.md` and `svelte-realtime/README.md` — both require all three plugins: `sveltekit()`, `uws()`, `realtime()`. Order does not matter per the README.

### Pattern 3: hooks.ws.js — Better Auth session at upgrade boundary

**What:** The `upgrade({ headers })` function calls `auth.api.getSession` exactly as `hooks.server.js` does, but returns a user context object (or guest) instead of setting `event.locals`.
**When to use:** Every WebSocket connection goes through this.

```js
// src/hooks.ws.js
import { message } from 'svelte-realtime/server';
import { auth } from '$lib/server/auth';

export { message };

/** @param {{ headers: Headers, cookies: Record<string, string>, url: URL, remoteAddress: string }} upgrade */
export async function upgrade({ headers }) {
  const session = await auth.api.getSession({ headers });

  if (!session) {
    // D-12: guests are ALLOWED to connect, tagged as 'guest'
    return { role: 'guest' };
  }

  return {
    id: session.user.id,
    name: session.user.name,
    role: 'player'
  };
}
```

Key points:
- The `upgrade` function receives `headers` (a standard `Headers`-like object), which contains the Better Auth session cookie set during login — identical to what `hooks.server.js` receives.
- `auth.api.getSession({ headers })` is the same call used in the existing HTTP hooks — no new API surface.
- Never `return false` (do not reject): D-12 requires guests to be allowed through with `role: 'guest'`.
- The returned object becomes `ws.getUserData()` and is available as `ctx.user` in all `svelte-realtime` live functions.
- `export { message }` is the svelte-realtime built-in message router — required for RPC to work.

> **Source:** `svelte-adapter-uws/README.md` (Authentication section, upgrade function signature), `svelte-realtime/README.md` (hooks.ws.js example), `src/hooks.server.js` (existing auth.api.getSession pattern).

### Pattern 4: Login page server action for Discord OAuth

**What:** SvelteKit action calls `auth.api.signInSocial` which returns a Discord authorization URL; the action redirects the user there.
**When to use:** On "Sign in with Discord" button submit.

```js
// src/routes/login/+page.server.js
import { redirect, fail } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';

/** @type {import('@sveltejs/kit').Load} */
export const load = async (event) => {
  if (event.locals.user) {
    const returnTo = event.url.searchParams.get('redirect') ?? '/';
    return redirect(302, returnTo);
  }
  return {};
};

export const actions = {
  signin: async (event) => {
    const returnTo = event.url.searchParams.get('redirect') ?? '/';
    try {
      const result = await auth.api.signInSocial({
        body: { provider: 'discord', callbackURL: returnTo },
        headers: event.request.headers
      });
      if (result.url) return redirect(302, result.url);
    } catch (error) {
      return fail(500, { error: 'Discord sign-in failed. Please try again.' });
    }
    return fail(500, { error: 'Something went wrong. Contact the host.' });
  },
  register: async (event) => {
    // Discord OAuth auto-creates the account on first sign-in;
    // register and signin actions both delegate to the same Discord OAuth flow
    const returnTo = event.url.searchParams.get('redirect') ?? '/';
    try {
      const result = await auth.api.signInSocial({
        body: { provider: 'discord', callbackURL: returnTo, requestSignUp: true },
        headers: event.request.headers
      });
      if (result.url) return redirect(302, result.url);
    } catch (error) {
      return fail(500, { error: 'Discord sign-in failed. Please try again.' });
    }
    return fail(500, { error: 'Something went wrong. Contact the host.' });
  }
};
```

> **Source:** Verified from `better-auth/dist/api/routes/sign-in.d.mts` — `signInSocial` returns `{ redirect: boolean, url?: string }`. The `requestSignUp` flag is optional and accepted by the endpoint body schema.

### Pattern 5: Guest-to-player role upgrade in-place (D-14)

**What:** When a guest authenticates via Discord while their WS connection is live, the connection's role must be upgraded without forcing a reconnect.
**Important constraint:** `svelte-realtime`'s `ctx.user` is set at upgrade time and is read-only per connection. In-place role upgrade requires a custom mechanism.

**Research finding:** The `upgrade` function returns a snapshot captured at connection time. `ws.getUserData()` is the mutable user data object for the connection — it CAN be mutated directly (uWebSockets.js stores it by reference, not by value). The pattern is:
1. The client calls a `live()` function (e.g., `live.auth.refreshSession`) after Discord OAuth completes and they return to the app.
2. The server-side live function reads the current session (via `ctx.platform` or a direct `auth.api.getSession` call), then mutates `ctx.user.role = 'player'` and updates `ctx.user.id` / `ctx.user.name`.
3. Because `getUserData()` returns the same object reference, the mutation is immediately reflected in subsequent live function calls on the same connection.

This pattern is Phase 1 scope for the upgrade mechanism only. The downstream enforcement logic (publish gating by role) is Phase 2+.

> **Confidence:** MEDIUM — the uWS `getUserData()` reference mutability is established C++ library behavior, but this exact pattern (mutating role post-auth) is not documented in the svelte-realtime README. Phase 1 only needs to establish the mechanism; full enforcement is Phase 2+.

### Anti-Patterns to Avoid

- **Using `plugins` array for Discord:** Discord is a `socialProviders` config key, not a plugin — don't do `plugins: [discord({ ... })]`.
- **Returning `false` from upgrade for unauthenticated users:** D-12 requires guests to connect. Only return `false` if the upgrade request is malformed (security, not auth gate).
- **Reading the raw session cookie name manually in upgrade:** Use `auth.api.getSession({ headers })` — same as `hooks.server.js`. Manually reading `better-auth.session_token` (the underlying cookie key) bypasses Better Auth's validation logic.
- **Omitting `{ websocket: true }` from adapter config:** Without it, the WebSocket endpoint does not exist.
- **Forgetting Vite plugins:** Both `uws()` and `realtime()` are required alongside `sveltekit()`. Missing either causes silent timeouts on the client.
- **Skipping schema regeneration:** After disabling `emailAndPassword`, run `npm run auth:schema && npm run db:push` to re-sync; though the existing schema already has the `account` table needed for OAuth.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session cookie validation at WS upgrade | Manual cookie parsing + DB session lookup | `auth.api.getSession({ headers })` | Handles signature verification, expiry, and Neon DB lookup — matches `hooks.server.js` exactly |
| Discord OAuth redirect URL generation | Custom OAuth2 state/PKCE/redirect URL builder | `auth.api.signInSocial({ body: { provider: 'discord', callbackURL } })` | Better Auth handles state parameter, PKCE, redirect URI registration, and callback handling |
| WebSocket protocol routing | Custom message dispatch | `export { message } from 'svelte-realtime/server'` | Built-in router handles svelte-realtime's RPC wire protocol |
| Session persistence across page reloads | Custom cookie management | Better Auth `sveltekitCookies(getRequestEvent)` plugin | Already configured — sets httpOnly, secure, sameSite cookies |

---

## Common Pitfalls

### Pitfall 1: `ORIGIN` env var must match Discord OAuth redirect URI
**What goes wrong:** Discord rejects the OAuth callback with "Invalid redirect URI" if `ORIGIN` doesn't match the registered callback URL.
**Why it happens:** Better Auth constructs the OAuth callback URL as `${ORIGIN}/api/auth/callback/discord`. Discord's OAuth app must have this exact URI registered.
**How to avoid:** Set `ORIGIN=http://localhost:5173` in `.env` for dev. Register `http://localhost:5173/api/auth/callback/discord` in the Discord Developer Portal.
**Warning signs:** Discord returns error page at the redirect step.

### Pitfall 2: Vite plugins break vitest browser project
**What goes wrong:** `uws()` and `realtime()` Vite plugins may interfere with Playwright browser test runner if they hook into the dev server in ways incompatible with Vitest's browser project config.
**Why it happens:** The plugins add virtual modules and WebSocket server middleware; Vitest browser project spawns its own dev server.
**How to avoid:** Test with `npm run test` after plugin addition. If tests break, conditionally skip WS plugins in test mode using `process.env.VITEST`.
**Warning signs:** Browser tests fail to start or hang after plugin addition.

### Pitfall 3: `auth:schema` must run before `db:push`
**What goes wrong:** Removing `emailAndPassword` changes the auth config but not the schema file until regenerated; Drizzle migrations may not reflect the intended state.
**Why it happens:** `auth.schema.js` is generated by `@better-auth/cli` from `auth.js`. The existing schema likely already has all OAuth-compatible tables (account, session, user, verification) but regeneration confirms it.
**How to avoid:** Run `npm run auth:schema` after modifying `auth.js`, inspect the diff, then `npm run db:push`.
**Warning signs:** Drizzle push reports unexpected column drops.

### Pitfall 4: Adapter swap breaks `npm run preview`
**What goes wrong:** `npm run preview` uses the adapter's preview server. After swapping to `svelte-adapter-uws`, the build output and preview command change.
**Why it happens:** `@sveltejs/adapter-node` builds to `build/index.js` with `node build`; `svelte-adapter-uws` also builds a Node server but with different startup characteristics.
**How to avoid:** After `npm run build`, test with `node build` (not `vite preview`). The `npm run preview` script in `package.json` calls `vite preview` which goes through Vite, not the built adapter output — this is fine for local preview.
**Warning signs:** `npm run preview` works but production `node build` fails.

### Pitfall 5: In-place role upgrade — mutation must happen before next live() call
**What goes wrong:** If the client makes a `live()` call immediately after sign-in (before the refreshSession call completes), the old `role: 'guest'` is still in the userData.
**Why it happens:** OAuth redirect takes the user through an external page and back; during that time the WS connection may reconnect anyway (page reload). Phase 1 only needs to establish the mechanism; enforcement is Phase 2+.
**How to avoid:** D-09 scopes Phase 1 to dev-proven WS identity — just prove the role tagging works. No enforcement of role gating needed in Phase 1.

---

## Code Examples

### Complete hooks.ws.js

```js
// src/hooks.ws.js
// Source: svelte-adapter-uws README (Authentication section) + existing hooks.server.js pattern
import { message } from 'svelte-realtime/server';
import { auth } from '$lib/server/auth';

export { message };

/** @param {{ headers: Headers }} param */
export async function upgrade({ headers }) {
  const session = await auth.api.getSession({ headers });
  if (!session) {
    return { role: 'guest' };
  }
  return {
    id: session.user.id,
    name: session.user.name,
    role: 'player'
  };
}
```

### Complete svelte.config.js after swap

```js
// svelte.config.js
// Source: svelte-adapter-uws README (Quick start: WebSocket)
import adapter from 'svelte-adapter-uws';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: { adapter: adapter({ websocket: true }) },
  vitePlugin: {
    dynamicCompileOptions: ({ filename }) =>
      filename.includes('node_modules') ? undefined : { runes: true }
  }
};

export default config;
```

### vite.config.js additions

```js
// vite.config.js — add these two imports and two plugins
import uws from 'svelte-adapter-uws/vite';
import realtime from 'svelte-realtime/vite';

// In plugins array: [tailwindcss(), sveltekit(), uws(), realtime(), devtoolsJson()]
```

### Discord OAuth redirect URL flow

```js
// In +page.server.js actions.signin:
const result = await auth.api.signInSocial({
  body: { provider: 'discord', callbackURL: returnTo },
  headers: event.request.headers
});
// result.url = 'https://discord.com/api/oauth2/authorize?scope=identify+email&...'
// result.redirect = true
if (result.url) return redirect(302, result.url);
```

---

## Environment Availability

| Dependency | Required By | Available | Version | Notes |
|------------|------------|-----------|---------|-------|
| `svelte-adapter-uws` | Adapter swap | ✓ | 0.4.4 | In `node_modules`, latest is 0.4.5 |
| `svelte-realtime` | WS message routing | ✓ | 0.4.6 | In `node_modules`, current |
| `uWebSockets.js` | Underlying WS server | ✓ | 20.60.0 | Compiled .node binaries for darwin/linux/win arm64+x64, node 115/127/137/141 |
| `ws` | Dev-mode WS proxy | ✓ | 8.20.0 | In `node_modules` |
| `better-auth` discord | Social provider config | ✓ | 1.4.22 | `discord` exported from `better-auth/social-providers` via `@better-auth/core` |
| `DISCORD_CLIENT_ID` | auth.js socialProviders | ✗ | — | Must be added to `.env` and Discord Developer Portal |
| `DISCORD_CLIENT_SECRET` | auth.js socialProviders | ✗ | — | Must be added to `.env` |
| Neon DB | Session persistence | ✓ | — | Existing `DATABASE_URL` env var; no schema changes needed |

**Missing dependencies with no fallback:**
- `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` — these env vars must be populated before Discord OAuth can be tested. Wave 0 task: add to `.env.example` and document in README. The developer must create a Discord application at https://discord.com/developers/applications and register `http://localhost:5173/api/auth/callback/discord` as a redirect URI.

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — section included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vite.config.js` (merged Vitest config) |
| Quick run command | `npm run test` (runs `vitest --run`) |
| Full suite command | `npm run test` |
| Browser tests | `npm run test` (Playwright, Chromium headless) |

### Phase Requirements → Test Map

> D-09 explicitly states: **"No automated test required for the WS layer in Phase 1."** AUTH-01, AUTH-02, and AUTH-04 require real Discord OAuth credentials and a browser redirect flow — these are manual-only in Phase 1.

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| AUTH-01 | Create account via Discord OAuth (first login auto-creates) | Manual | — | Requires live Discord app; D-09 scopes as dev-proven only |
| AUTH-02 | Sign in via Discord and stay signed in across page reloads | Manual | — | Session cookie persistence verified by inspecting DevTools after login |
| AUTH-03 | Sign out from any page returns to unauthenticated state | Server unit | `npm run test -- --reporter=verbose` | Test load redirect + signOut action in `+page.server.js` |
| AUTH-04 | Discord OAuth callback lands user back in app with valid session | Manual | — | Verified via dev flow; requires Discord app credentials |
| WS identity | Upgrade reads session; player vs. guest tagging works | Manual (D-09) | — | Dev-proven: `npm run dev`, open WS in DevTools, verify role in server log |

**Automatable in Phase 1:**
- `load` in `/login/+page.server.js` — unit test that authed user is redirected to `?redirect` target
- `signOut` action — unit test that `auth.api.signOut` is called and redirects to `/login`

### Wave 0 Gaps

- [ ] `src/routes/login/+page.server.spec.js` — load redirect test + signOut action test (covers AUTH-03 partially)

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| `@sveltejs/adapter-node` (HTTP only) | `svelte-adapter-uws` (HTTP + WebSocket via uWS) | WebSocket upgrade hook becomes available via `hooks.ws.js` |
| `emailAndPassword: { enabled: true }` | `socialProviders: { discord: { ... } }` | No email/password forms; single Discord OAuth button |
| No `hooks.ws.js` | `src/hooks.ws.js` with `upgrade` + `message` exports | All WebSocket connections tagged with player/guest role at connect time |
| Demo auth at `src/routes/demo/better-auth/` | Production auth at `src/routes/login/` | Clean URL, return-to behavior, Discord brand styling |

---

## Open Questions

1. **Discord OAuth `requestSignUp` behavior**
   - What we know: `auth.api.signInSocial` body accepts `requestSignUp: boolean`
   - What's unclear: Whether Better Auth treats sign-in vs. sign-up as distinct OAuth flows with different prompts, or if they both funnel to the same Discord authorize URL (Discord always creates/reuses account)
   - Recommendation: Use the same Discord OAuth call for both `signin` and `register` actions — Discord itself doesn't differentiate. The `register` action just triggers the same flow; Better Auth auto-creates the user record if none exists. If behavior needs differentiating, it can be tested empirically during dev.

2. **`BETTER_AUTH_SECRET` and session cookie name**
   - What we know: Better Auth sets cookies automatically via `sveltekitCookies`; the `upgrade` function reads them via `auth.api.getSession({ headers })`
   - What's unclear: Whether the session cookie name changes based on config (e.g., `better-auth.session_token` vs. custom)
   - Recommendation: Do not read the cookie by name in `hooks.ws.js` — always use `auth.api.getSession({ headers })` to be resilient to config changes.

3. **Vitest browser tests after Vite plugin addition**
   - What we know: `uws()` and `realtime()` plugins modify the Vite dev server
   - What's unclear: Whether they conflict with Vitest's browser project which spawns its own dev server instance
   - Recommendation: Run `npm run test` immediately after adding plugins as a Wave 1 smoke test; if browser tests fail, guard plugins with `process.env.VITEST !== 'true'`.

---

## Sources

### Primary (HIGH confidence)
- `node_modules/svelte-adapter-uws/README.md` — adapter config, WebSocket handler signature, Authentication section
- `node_modules/svelte-realtime/README.md` — hooks.ws.js structure, message export, upgrade pattern
- `node_modules/@better-auth/core/dist/social-providers/discord.mjs` — discord() function source
- `node_modules/better-auth/dist/api/routes/sign-in.d.mts` — signInSocial return type `{ redirect: boolean, url?: string }`
- `src/hooks.server.js` — existing `auth.api.getSession({ headers })` pattern (directly reusable)
- `src/lib/server/auth.js` — current auth config (to be modified)
- `src/lib/server/db/auth.schema.js` — existing schema (account table already supports OAuth)
- `node_modules/better-auth/dist/test-utils/test-instance.d.mts` — signInSocial body schema including `provider: 'discord'`

### Secondary (MEDIUM confidence)
- `node_modules/@better-auth/core/dist/social-providers/index.d.mts` — SocialProviders type shows `discord` is a key in the `socialProviders` config object
- `node_modules/svelte-adapter-uws/package.json` — peer deps (ws, SvelteKit, Svelte) all satisfied

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in `node_modules`, versions confirmed
- Auth config pattern: HIGH — verified from source files in `@better-auth/core`
- hooks.ws.js pattern: HIGH — direct from adapter + realtime README + existing hooks.server.js
- signInSocial flow: HIGH — verified from type definitions and API route structure
- In-place role upgrade (D-14): MEDIUM — uWS getUserData mutability is established but not documented in svelte-realtime README
- Vitest plugin compatibility: MEDIUM — not empirically tested; flagged as open question

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable ecosystem; svelte-realtime/adapter-uws are actively maintained but version-locked)
