---
status: resolved
trigger: "Navigating to a draft page while not logged in shows 'WebSocket connection lost' error."
created: 2026-04-03T00:00:00Z
updated: 2026-04-03T00:00:00Z
---

## Current Focus

hypothesis: TWO-PART ROOT CAUSE CONFIRMED:
  1. hooks.ws.js upgrade() is missing a try/catch around auth.api.getSession(). The sveltekitCookies plugin's after-hook calls getRequestEvent() which THROWS when outside a SvelteKit request context. If Better Auth sets any set-cookie header during getSession (session refresh, rotation), the entire upgrade() rejects with an unhandled error. The WS adapter catches this and returns HTTP 500, destroying the socket. The client retries until exhausted, eventually producing "WebSocket connection lost".
  2. Even if the WS fails for any reason, the page renders the raw library error message "WebSocket connection lost" directly as user-facing text — which is confusing and not actionable.
test: Fix hooks.ws.js to wrap getSession in try/catch and fall back to guest. Fix +page.svelte to show a better error message for unauthenticated users.
expecting: unauthenticated users either see the lobby (as spectators) or get a clear, human-readable error/redirect
next_action: apply fix to hooks.ws.js and +page.svelte

## Symptoms

expected: Unauthenticated users navigating to a draft page should either be redirected to login, shown a spectator view, or receive a clear "you must be logged in" message — not a cryptic WebSocket error
actual: The page shows "WebSocket connection lost" error
errors: "WebSocket connection lost"
reproduction: 1. Make sure you are NOT logged in. 2. Navigate to /draft/[code]. 3. Observe the error message.
started: Unknown — likely a regression from recent auth/redirect work

## Eliminated

- hypothesis: access predicate on lobby stream blocks guests
  evidence: lobby stream has `access: () => true` — always accessible to all users
  timestamp: 2026-04-03

- hypothesis: upgrade() returns false for unauthenticated users
  evidence: hooks.ws.js explicitly returns { role: 'guest', guestId } for sessions that return null — never returns false
  timestamp: 2026-04-03

- hypothesis: stream initFn (lobby) throws LiveError for unauthenticated users
  evidence: lobby initFn only throws NOT_FOUND for missing rooms; for guest users with valid room, calls upsertGuestSpectator and returns snapshot. A LiveError would produce the LiveError message (not "WebSocket connection lost").
  timestamp: 2026-04-03

## Evidence

- timestamp: 2026-04-03
  checked: node_modules/svelte-realtime/client.js ensureDisconnectListener
  found: "WebSocket connection lost" message is produced ONLY when status transitions to 'closed' while there are entries in the pending map. This means WS must connect and then close (not a failed upgrade before WS opens).
  implication: The WS opens, stream subscribe RPC is sent (adds to pending), then WS closes before server response arrives.

- timestamp: 2026-04-03
  checked: node_modules/svelte-adapter-uws/vite.js upgrade handler (line 360-364)
  found: If upgrade() throws (promise rejects), the socket is destroyed with HTTP 500. Since HTTP 500 is not a terminal close code, the client retries. During retry, the pending entry from the previous attempt may still exist, and when status goes 'closed' again, "WebSocket connection lost" fires.
  implication: If upgrade() throws for any reason, the error path eventually produces "WebSocket connection lost".

- timestamp: 2026-04-03
  checked: node_modules/better-auth/dist/integrations/svelte-kit.mjs sveltekitCookies plugin
  found: The after-hook calls getRequestEvent() IF returned instanceof Headers AND setCookies is non-null. getRequestEvent() from @sveltejs/kit/internal/server THROWS (not returns null) when called outside a SvelteKit request context.
  implication: If Better Auth sets a set-cookie header during getSession (e.g., session refresh), upgrade() throws outside SK context.

- timestamp: 2026-04-03
  checked: node_modules/@sveltejs/kit/src/exports/internal/event.js getRequestEvent()
  found: Line 41: `throw new Error('Can only read the current request event inside functions invoked during handle...')` — throws unconditionally when no SK context.
  implication: Confirmed throw path. The sveltekitCookies guard `if (!event) return` is NEVER reached because getRequestEvent throws before returning null.

- timestamp: 2026-04-03
  checked: +page.svelte error rendering (line 150)
  found: `{:else if loadError}<p class="text-red-600">{errMsg(loadError)}</p>` — directly renders the RpcError.message. No auth-aware error handling.
  implication: Any stream error (WS failure, server error) shows the raw error message to the user.

## Resolution

root_cause: Two issues combine to produce the bug:
  1. hooks.ws.js upgrade() calls auth.api.getSession({ headers }) without a try/catch. The sveltekitCookies Better Auth plugin's after-hook calls getRequestEvent() which throws outside SvelteKit request context when Better Auth sets a set-cookie header during session validation (refresh/rotation). This causes upgrade() to reject, the WS socket is destroyed with HTTP 500, the client retries, and eventually produces "WebSocket connection lost".
  2. Even if the above is not triggered for every unauthenticated user, the page has no auth-aware error handling — it renders the raw "WebSocket connection lost" error for any WS failure.
fix: Applied two changes:
  1. src/hooks.ws.js: Wrapped auth.api.getSession({ headers }) in try/catch inside upgrade(). On any error (including sveltekitCookies getRequestEvent() throw), falls back to guest user. This prevents upgrade() from ever throwing, so the WS socket is never destroyed with HTTP 500.
  2. src/routes/draft/[id]/+page.svelte: When loadError occurs AND isGuest (data.userId == null), renders "Sign in to join this draft, or wait for the host to start it." with a login link. Authenticated users still see the raw error message in red. This handles the edge case where WS fails for any reason for unauthenticated users.
verification: confirmed fixed by user — unauthenticated users no longer see "WebSocket connection lost"
files_changed: [src/hooks.ws.js, src/routes/draft/[id]/+page.svelte]
