---
phase: 01-auth-realtime-transport
plan: 03
subsystem: auth-ui
tags: [auth, discord, oauth, login, svelte, sveltekit]
dependency_graph:
  requires: [01-01]
  provides: [login-route, login-card-molecule, discord-oauth-actions]
  affects: [demo-pages-removed]
tech_stack:
  added: []
  patterns: [discord-oauth-form-action, mode-bindable-component, tdd-red-green]
key_files:
  created:
    - src/lib/components/molecules/LoginCard.svelte
    - src/routes/login/+page.svelte
    - src/routes/login/+page.server.js
    - src/routes/login/page.server.spec.js
  modified:
    - src/lib/server/auth.js
    - src/routes/demo/+page.svelte
  deleted:
    - src/routes/demo/better-auth/+page.svelte
    - src/routes/demo/better-auth/+page.server.js
    - src/routes/demo/better-auth/login/+page.svelte
    - src/routes/demo/better-auth/login/+page.server.js
decisions:
  - "Spec file named page.server.spec.js (no + prefix) — SvelteKit reserves + prefix for route files; vitest include pattern still picks it up"
  - "auth.js: import getRequestEvent from @sveltejs/kit/internal/server instead of $app/server — adapter-uws esbuild fallback stubs $app/server without getRequestEvent; internal path is marked external by esbuild"
metrics:
  duration: 19m
  completed_date: 2026-04-03
  tasks_completed: 2
  files_changed: 10
---

# Phase 01 Plan 03: Login Route + LoginCard Molecule Summary

Production `/login` route with Discord OAuth, `LoginCard` molecule matching UI-SPEC, and removal of demo auth pages.

## What Was Built

### Task 1 — LoginCard.svelte (feat commit `1259ab1`)

Created `src/lib/components/molecules/LoginCard.svelte`:
- Discord Blurple (`#5865F2`) / hover (`#4752C4`) button using inline `style=` (Tailwind v4 has no token for these)
- Bindable `mode` prop (`'signin'` | `'register'`) drives heading copy and button label
- Loading state: spinner SVG + "Connecting…", `aria-busy`, `disabled`, `opacity-50`
- Mode toggle: "New here? Create an account" / "Already have an account? Sign in"
- `role="alert"` error message paragraph, rendered only when `form?.error` is present
- `min-h-[44px]` touch target per WCAG 2.5.5 (UI-SPEC exception noted)
- `focus-visible:ring-2 focus-visible:ring-amber-500` focus indicator

### Task 2 — /login Route + Tests + Demo Deletion (feat commit `5c975ad`)

**TDD cycle (RED → GREEN):**
- RED: wrote `page.server.spec.js` first; tests failed because `+page.server.js` didn't exist
- GREEN: created `+page.server.js`; all 4 tests pass

**`src/routes/login/+page.server.js`:**
- `load`: redirects authenticated users to `?redirect` param or `/`
- `actions.signin`: calls `auth.api.signInSocial({ provider: 'discord' })`; redirects to OAuth URL
- `actions.register`: same as signin with `requestSignUp: true`
- `actions.signout`: calls `auth.api.signOut`, redirects to `/login`

**`src/routes/login/+page.svelte`:**
- Imports `Header` + `LoginCard`
- `bind:mode` syncs page `<title>` with card mode: "Sign in — Draft" / "Create account — Draft"
- Page wrapper: `flex min-h-[calc(100vh-4rem)] items-center justify-center px-8`

**Deleted (D-04):**
- `src/routes/demo/better-auth/+page.svelte`
- `src/routes/demo/better-auth/+page.server.js`
- `src/routes/demo/better-auth/login/+page.svelte`
- `src/routes/demo/better-auth/login/+page.server.js`

## Verification

| Check | Result |
|-------|--------|
| `LoginCard.svelte` — all UI-SPEC patterns | PASS |
| `$bindable` mode prop | PASS |
| Discord Blurple `#5865F2` | PASS |
| `role="alert"` error display | PASS |
| `aria-busy` loading state | PASS |
| `min-h-[44px]` touch target | PASS |
| 4/4 unit tests pass | PASS |
| demo/better-auth/ pages deleted | PASS |
| `npm run build` exits 0 | PASS (after deviation fix) |
| `svelte-check` — no new errors introduced | PASS (2 pre-existing remain: `greet.js`, `Join.svelte`) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] JSDoc type for `mode` prop was incorrect**
- **Found during:** Task 1
- **Issue:** Plan specified `mode?: import('svelte').Snippet` but `mode` is a string prop (`'signin'` | `'register'`). `Snippet` is for `{@render}` children, not string values. This caused 7 svelte-check errors.
- **Fix:** Changed JSDoc to `mode?: string`
- **Files modified:** `src/lib/components/molecules/LoginCard.svelte`
- **Commit:** `1259ab1`

**2. [Rule 1 - Bug] Spec file `+page.server.spec.js` rejected by SvelteKit**
- **Found during:** Task 2
- **Issue:** SvelteKit reserves `+` prefix for route files. `+page.server.spec.js` caused `npm run build` to fail with "Files prefixed with + are reserved". The `npm run test` commands also showed repeated warnings.
- **Fix:** Renamed to `page.server.spec.js`. Vitest's `include: ['src/**/*.{test,spec}.{js,ts}']` pattern still discovers it.
- **Files modified:** Renamed file
- **Commit:** `5c975ad`

**3. [Rule 1 - Bug] Pre-existing build failure: `getRequestEvent` from `$app/server`**
- **Found during:** Task 2, final `npm run build` verification
- **Issue:** `auth.js` imported `getRequestEvent` from `$app/server` (a SvelteKit virtual module). The `svelte-adapter-uws` esbuild fallback bundles `hooks.ws.js` → `auth.js` and its virtual module stub for `$app/server` returns `export const env = process.env;` — no `getRequestEvent` export. Build failed with `No matching export in "sveltekit:$app/server"`. This was introduced in Plan 01-01 but likely undetected (pre-existing build failure confirmed by checking out Plan 01-01 commit state).
- **Fix:** Changed import source from `$app/server` to `@sveltejs/kit/internal/server`. Both export the same AsyncLocalStorage-backed `getRequestEvent`. The internal path is a real package path that esbuild marks as `external` (per `packages: 'external'` in the adapter config), so no runtime resolution issue.
- **Files modified:** `src/lib/server/auth.js`
- **Commit:** `5c975ad`

**4. [Rule 1 - Bug] `src/routes/demo/+page.svelte` referenced deleted route**
- **Found during:** Task 2, svelte-check after deleting demo/better-auth/
- **Issue:** `demo/+page.svelte` linked to `/demo/better-auth` which no longer exists; SvelteKit's type-safe routes check reported an error.
- **Fix:** Replaced page content with a simple placeholder paragraph.
- **Files modified:** `src/routes/demo/+page.svelte`
- **Commit:** `5c975ad`

## Known Stubs

None — all data flows are wired. `form?.error` renders from server action `fail()` return values; mode toggle is local UI state. OAuth redirect is live (env vars required at runtime).

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `src/lib/components/molecules/LoginCard.svelte` | FOUND |
| `src/routes/login/+page.svelte` | FOUND |
| `src/routes/login/+page.server.js` | FOUND |
| `src/routes/login/page.server.spec.js` | FOUND |
| Commit `1259ab1` (Task 1 - LoginCard) | FOUND |
| Commit `5c975ad` (Task 2 - route + tests + deletions) | FOUND |
