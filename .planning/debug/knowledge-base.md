# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## websocket-connection-lost-unauthenticated — WebSocket upgrade crash for unauthenticated users produces "WebSocket connection lost"
- **Date:** 2026-04-03
- **Error patterns:** WebSocket connection lost, unauthenticated, upgrade, getSession, getRequestEvent, set-cookie, session refresh, HTTP 500, sveltekitCookies
- **Root cause:** hooks.ws.js upgrade() called auth.api.getSession() without try/catch. The sveltekitCookies Better Auth plugin's after-hook calls getRequestEvent() (throws outside SvelteKit request context) when a set-cookie header is present during session refresh/rotation. This caused upgrade() to reject, the socket to be destroyed with HTTP 500, the client to retry, and eventually produce "WebSocket connection lost". Secondarily, the page rendered the raw library error with no auth-aware messaging for guests.
- **Fix:** Wrapped getSession in try/catch inside upgrade(); falls back to guest on any error. Added guest-specific error UI in +page.svelte showing "Sign in to join this draft" instead of the raw error message.
- **Files changed:** src/hooks.ws.js, src/routes/draft/[id]/+page.svelte
---

## create-draft-404-room-not-found — Silent fail(401) on unauthenticated create-room action; button does nothing and draft URLs 404
- **Date:** 2026-04-03
- **Error patterns:** 404, room not found, button does nothing, create draft, fail(401), unauthenticated, use:enhance, form action
- **Root cause:** The createRoom form action returned fail(401) for unauthenticated users, but Create.svelte had no form prop binding and displayed no error. use:enhance silently discarded the fail response. No room was ever created, so any draft URL returned 404 downstream.
- **Fix:** Changed the createRoom action to redirect(303, /login?redirect=/) when not authenticated instead of returning fail(401). The login page reads the ?redirect param and passes it as callbackURL to Discord OAuth so the user returns to / after auth.
- **Files changed:** src/routes/+page.server.js
---
