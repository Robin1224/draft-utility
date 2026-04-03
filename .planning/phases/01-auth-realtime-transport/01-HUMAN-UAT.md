---
status: partial
phase: 01-auth-realtime-transport
source: [01-VERIFICATION.md]
started: 2026-04-03T00:00:00Z
updated: 2026-04-03T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Discord OAuth redirect
expected: Clicking the "Sign in with Discord" button on /login redirects the browser to discord.com/oauth2/authorize with correct client_id, scope, and redirect_uri parameters
result: [pending]

### 2. Session persistence across page reload
expected: After completing Discord OAuth flow, hard-refreshing the page (Ctrl+Shift+R / Cmd+Shift+R) keeps the user signed in — session is still active, user is not redirected to /login
result: [pending]

### 3. Sign-out clears session
expected: Triggering sign-out (via signout action) redirects user to /login and session is cleared — navigating to a protected route after sign-out redirects back to /login
result: [pending]

### 4. WebSocket role assignment
expected: Connecting to the WebSocket as an unauthenticated user results in role: 'guest'; connecting as an authenticated user (post-OAuth) results in role: 'player' with user id and name populated
result: [pending]

### 5. D-14 in-place role upgrade
expected: A guest WebSocket connection that authenticates (via live.auth.refreshSession) upgrades to role: 'player' in-place without disconnecting and reconnecting
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
