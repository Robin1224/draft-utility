---
status: resolved
trigger: "Create draft button on homepage does nothing. Navigating directly to a draft page shows 404 Room not found."
created: 2026-04-03T00:00:00Z
updated: 2026-04-03T00:10:00Z
---

## Current Focus

hypothesis: CONFIRMED — The createRoom action returns fail(401) for unauthenticated users, but Create.svelte has no form prop binding and gives no feedback. The page also doesn't pass auth state to Create.svelte, so there is no way to redirect to login or show an error. The 404 on direct navigation is a downstream consequence: no room is ever created.
test: Confirmed by reading all code paths
expecting: Fix requires (1) surfacing auth error in Create.svelte and (2) redirecting to login from the action OR showing an error with a login link
next_action: Fix +page.server.js to redirect to /login instead of fail(401), and update Create.svelte to display form errors

## Symptoms

expected: Clicking "Create draft" button should create a new draft and navigate to the draft page
actual: Button click does nothing (no navigation, no visible error). Manually navigating to a draft URL returns "404 Room not found"
errors: "404 Room not found" on draft page route
reproduction: 1. Go to homepage. 2. Click "Create draft" button. OR navigate directly to /draft/[id]
started: Unknown — may be regression or new bug

## Eliminated

- hypothesis: resolve('/draft/[id]', { id: code }) produces wrong URL
  evidence: resolve from $app/paths server.js correctly calls resolve_route which substitutes [id] with params.id. Returns /draft/<code>. The redirect URL is correct.
  timestamp: 2026-04-03T00:03:00Z

- hypothesis: Database tables missing
  evidence: drizzle/0000_omniscient_pixie.sql confirms room and room_member tables defined. DATABASE_URL is set in .env. DB is provisioned.
  timestamp: 2026-04-03T00:04:00Z

- hypothesis: getRoomByPublicCode incorrectly filters out newly-created rooms
  evidence: shouldHideRoomFromPublic returns false for phase=lobby, ended_at=null. shouldAbandonLobby returns false for rooms created just now. Query should return the row correctly.
  timestamp: 2026-04-03T00:04:00Z

## Evidence

- timestamp: 2026-04-03T00:01:00Z
  checked: src/routes/+page.server.js createRoom action
  found: action checks event.locals.user?.id; if null/undefined, returns fail(401, { message: 'Sign in to create a room' }). The redirect only happens on success.
  implication: Unauthenticated users always get a fail(401) response.

- timestamp: 2026-04-03T00:01:30Z
  checked: src/lib/components/molecules/Create.svelte
  found: Form uses use:enhance but component receives NO form prop. No error display whatsoever.
  implication: fail(401) response is silently discarded by the enhance binding. User sees nothing — button appears to do nothing.

- timestamp: 2026-04-03T00:02:00Z
  checked: src/routes/+page.svelte
  found: Page imports Create.svelte but does not pass any form prop or auth state to it.
  implication: Even if +page.svelte had a form prop from the action result, it would not reach Create.svelte.

- timestamp: 2026-04-03T00:02:30Z
  checked: src/hooks.server.js
  found: event.locals.user is set from auth.api.getSession. Discord OAuth requires DISCORD_CLIENT_ID/SECRET. The .env file has no Discord credentials set.
  implication: Users cannot authenticate via Discord. event.locals.user is always null. createRoom action always returns fail(401).

- timestamp: 2026-04-03T00:03:30Z
  checked: src/routes/draft/[id]/+page.server.js load function
  found: Calls getRoomByPublicCode(db, parseRoomCode(params.id)). If no room exists → error(404). Since no rooms are ever created (due to auth failure above), any manually-entered draft URL returns 404.
  implication: The 404 is a downstream consequence of no rooms being created.

- timestamp: 2026-04-03T00:04:30Z
  checked: .env file (non-sensitive parts)
  found: DATABASE_URL is set. BETTER_AUTH_SECRET is empty. DISCORD_CLIENT_ID/SECRET not present.
  implication: DB is connected. Auth cannot function without Discord credentials. However, the code bug (silent fail) is independent of credentials — even with working OAuth, if a user visits unauthenticated they get no feedback.

## Resolution

root_cause: The createRoom form action returns fail(401) for unauthenticated users, but Create.svelte has no form prop binding and displays no error. The use:enhance directive silently discards the fail response. Additionally, the action should redirect to /login instead of returning a fail() so the user is guided to authenticate. This causes "button does nothing" UX. Since no room is created, any manual draft URL returns 404 as a downstream consequence.

fix: Changed the createRoom action to redirect(303, /login?redirect=/) when not authenticated, instead of returning fail(401). The login page already reads the ?redirect param in load() and passes it as callbackURL to Discord OAuth, so after login the user returns to /. The fail import was also removed since it's no longer used.

verification: Human confirmed fixed — button now redirects to login for unauthenticated users, and draft creation works after auth.
files_changed: [src/routes/+page.server.js]
