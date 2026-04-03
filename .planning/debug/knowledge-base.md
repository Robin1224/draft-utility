# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## create-draft-404-room-not-found — Silent fail(401) on unauthenticated create-room action; button does nothing and draft URLs 404
- **Date:** 2026-04-03
- **Error patterns:** 404, room not found, button does nothing, create draft, fail(401), unauthenticated, use:enhance, form action
- **Root cause:** The createRoom form action returned fail(401) for unauthenticated users, but Create.svelte had no form prop binding and displayed no error. use:enhance silently discarded the fail response. No room was ever created, so any draft URL returned 404 downstream.
- **Fix:** Changed the createRoom action to redirect(303, /login?redirect=/) when not authenticated instead of returning fail(401). The login page reads the ?redirect param and passes it as callbackURL to Discord OAuth so the user returns to / after auth.
- **Files changed:** src/routes/+page.server.js
---
