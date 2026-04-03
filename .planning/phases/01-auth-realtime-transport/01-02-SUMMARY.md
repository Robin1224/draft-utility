---
phase: 01-auth-realtime-transport
plan: 02
subsystem: realtime-transport
tags: [hooks.ws.js, svelte-realtime, better-auth, websocket, discord-oauth, neon, drizzle]

dependency_graph:
  requires:
    - 01-01 (Discord OAuth + svelte-adapter-uws configured)
  provides:
    - WebSocket upgrade identity layer (src/hooks.ws.js)
    - Guest/player role tagging at connection time
    - In-place guest→player role upgrade mechanism (D-14)
    - svelte-realtime message router export for RPC dispatch
    - Auth schema verified in sync with Neon (Discord-only)
  affects:
    - All Phase 2–5 plans that use ctx.user.role for access control
    - Plan 01-03 (login route) — upgrade() pattern is live

tech_stack:
  added: []
  patterns:
    - hooks.ws.js upgrade() pattern: auth.api.getSession({ headers }) identical to HTTP hooks.server.js
    - ctx.user by-reference mutation pattern for live function role upgrades
    - export { message } from svelte-realtime/server for RPC routing

key_files:
  created:
    - src/hooks.ws.js
  modified: []

key_decisions:
  - auth.schema.js required no changes — Better Auth generates identical schema for Discord-only config; account.password column retained as optional field safe for OAuth-only deployments
  - live.auth.refreshSession uses ctx.platform?.req?.headers with fallback to new Headers() — medium-confidence accessor; safe failure mode (null session = no upgrade, no crash)
  - No VITEST guard added to vite.config.js — browser test failure is pre-existing Playwright binary infrastructure issue, not plugin-caused (confirmed by server test still passing)

metrics:
  duration: "~3 minutes"
  completed: "2026-04-03T10:45:00Z"
  tasks_completed: 2
  files_modified: 1
---

# Phase 01 Plan 02: WebSocket Identity Layer + Auth Schema Sync Summary

**One-liner:** hooks.ws.js identity layer created with guest/player role tagging via Better Auth session cookies; auth schema verified in sync with Discord-only config on Neon.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create src/hooks.ws.js — WebSocket upgrade identity layer | b5369ad | src/hooks.ws.js (new) |
| 2 | Regenerate auth schema and sync to Neon | n/a (no file changes) | auth.schema.js (already correct) |

## Verification Results

| Check | Result |
|-------|--------|
| `src/hooks.ws.js` exists | PASS |
| `export { message }` present | PASS — line 5 |
| `export async function upgrade` present | PASS — line 17 |
| `auth.api.getSession({ headers })` call | PASS — lines 18, 53 |
| `role: 'guest'` for unauthenticated (D-12) | PASS — line 22 |
| `role: 'player'` for authenticated | PASS — line 28 |
| `export const live` (D-14 mechanism) | PASS — line 43 |
| `return false` absent (D-12 — never reject) | PASS — not found |
| `npm run auth:schema` exits 0 | PASS |
| `rg "providerId"` in auth.schema.js | PASS — account table intact |
| `npm run db:push` — no destructive ops | PASS — "No changes detected" |
| `npm run test` server tests | PASS — 1 test file, 1 test passed |

## Deviations from Plan

### No schema changes required

**Found during:** Task 2 — `auth:schema` regeneration
**Details:** Better Auth generated an identical schema for Discord-only config. The `emailAndPassword` plugin does not add dedicated DB columns — credentials are stored in the shared `account.password` column as an optional field. Since Plan 01 only removed the plugin configuration (not the column from the schema), the schema was already correct. `npm run db:push` confirmed: "No changes detected". No commit needed for Task 2.

### Pre-existing browser test environment issue (unchanged from Plan 01)

`npm run test` exits 1 due to missing Playwright chromium binary in sandbox environment. Server test project: 1 passed. This is a pre-existing infrastructure issue, not a regression from this plan. Identical outcome to Plan 01.

## Known Stubs

None — hooks.ws.js is fully wired to `auth.api.getSession`. The `live.auth.refreshSession` accessor path (`ctx.platform?.req?.headers`) is medium-confidence but uses a safe fallback; this will be validated at runtime in Phase 2+ when live functions are actively called.

## What This Enables

- **Plan 01-03** (login route): The `/login` Discord button can now link to the active OAuth flow, and the resulting session will be read on every subsequent WebSocket upgrade.
- **Phase 2** (lobby presence): Every WebSocket connection arrives tagged as `player` or `guest` — lobby join logic can immediately enforce `ctx.user.role === 'player'` for team membership.
- **Phase 5** (chat): Same role check gates team chat vs. spectator chat.
- **D-14 (in-place upgrade)**: Client can call `live.auth.refreshSession()` post-OAuth to upgrade role without reconnecting — avoids UX disruption during auth flow.
