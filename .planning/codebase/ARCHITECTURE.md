# Architecture

**Analysis Date:** 2026-04-03

## Pattern Overview

**Overall:** SvelteKit full-stack application with server-side rendering, file-based routing, and colocated route modules.

**Key Characteristics:**

- **Svelte 5 runes** enabled globally for app source via `svelte.config.js` (`runes: true` for non-`node_modules` files).
- **JavaScript with JSDoc** and `checkJs` strictness (`jsconfig.json`); type augmentation in `src/app.d.ts`.
- **Server-only data and secrets** live under `src/lib/server/` and private env (`$env/dynamic/private`).
- **Authentication** is centralized in hooks and a shared `auth` instance (Better Auth + Drizzle + PostgreSQL via Neon).

## Layers

**Presentation (routes + components):**

- Purpose: Pages, layouts, and reusable UI; client navigation and forms.
- Location: `src/routes/`, `src/lib/components/`
- Contains: `+page.svelte`, `+layout.svelte`, atomic/molecular components (`atoms/`, `molecules/`).
- Depends on: `$app/*` modules, `$lib` components and assets, `data` from `load` where used.
- Used by: Browser requests resolved by SvelteKit.

**Route load and actions:**

- Purpose: Per-route authorization, data for pages, and progressive enhancement via form actions.
- Location: `*+page.server.js` under `src/routes/` (e.g. `src/routes/demo/better-auth/+page.server.js`, `src/routes/demo/better-auth/login/+page.server.js`).
- Contains: `load` functions, `actions` objects calling `auth.api.*`.
- Depends on: `@sveltejs/kit` (`redirect`, `fail`), `$lib/server/auth`, `better-auth/api` for `APIError`.
- Used by: Matching `+page.svelte` files and form posts.

**Request pipeline (hooks):**

- Purpose: Session resolution and Better Auth integration for every request.
- Location: `src/hooks.server.js`
- Contains: `handle` that reads session into `event.locals`, delegates to `svelteKitHandler`.
- Depends on: `$lib/server/auth`, `better-auth/svelte-kit`, `$app/environment` (`building`).
- Used by: All SvelteKit server-handled requests.

**Domain / auth configuration:**

- Purpose: Single Better Auth app instance wired to Drizzle and cookies.
- Location: `src/lib/server/auth.js`
- Contains: `betterAuth({ ... })` export `auth`.
- Depends on: `$lib/server/db`, `$env/dynamic/private`, `$app/server` (`getRequestEvent`), Better Auth adapters/plugins.
- Used by: `src/hooks.server.js`, route `+page.server.js` files.

**Persistence:**

- Purpose: PostgreSQL access and schema definitions.
- Location: `src/lib/server/db/index.js`, `src/lib/server/db/schema.js`, `src/lib/server/db/auth.schema.js`
- Contains: Neon HTTP client, Drizzle `db` export; app tables (`task`) and re-exported auth tables.
- Depends on: `@neondatabase/serverless`, `drizzle-orm`, `$env/dynamic/private` (`DATABASE_URL`).
- Used by: `src/lib/server/auth.js`, Drizzle Kit via `drizzle.config.js`.

**Shared library surface:**

- Purpose: Optional barrel and assets imported as `$lib`.
- Location: `src/lib/index.js` (placeholder comment only), `src/lib/assets/`
- Contains: Favicon, fonts referenced from `src/routes/layout.css`.
- Depends on: Not applicable for `index.js` as written.
- Used by: Routes and components via `$lib/...` paths.

## Data Flow

**Authenticated demo area:**

1. `src/hooks.server.js` calls `auth.api.getSession` and sets `event.locals.user` / `event.locals.session` when present.
2. Protected routes use `load` in `src/routes/demo/better-auth/+page.server.js` to `redirect` unauthenticated users to login.
3. Login/register posts hit `actions` in `src/routes/demo/better-auth/login/+page.server.js`, which call `auth.api.signInEmail` / `signUpEmail`; failures return `fail` with `APIError` handling.
4. Sign-out posts use `actions.signOut` in `src/routes/demo/better-auth/+page.server.js` calling `auth.api.signOut`, then redirect.

**Home and draft navigation:**

1. `src/routes/+page.svelte` composes `Header`, `Create`, `Join` with no `+page.server.js` (no server load on home).
2. `src/lib/components/molecules/Join.svelte` uses client `goto` to `resolve('/draft/[id]')` with user-entered id; `src/routes/draft/[id]/+page.svelte` is a static shell (header + `Phases`) with no dynamic `load` yet.

**State Management:**

- **Server:** `event.locals` for session/user (typed in `src/app.d.ts`).
- **Client:** Svelte 5 `$state` / `$derived` in components (e.g. `Join.svelte`); forms use `use:enhance` from `$app/forms` on demo pages.

## Key Abstractions

**`auth` singleton:**

- Purpose: Better Auth instance for session, sign-in, sign-up, sign-out.
- Examples: `src/lib/server/auth.js`
- Pattern: Import `auth` everywhere server-side; never duplicate configuration.

**`db` Drizzle client:**

- Purpose: Typed SQL access with schema in one place.
- Examples: `src/lib/server/db/index.js`, `src/lib/server/db/schema.js`
- Pattern: `import { db } from '$lib/server/db'` on server; schema aggregated in `schema.js` including `export * from './auth.schema'`.

**Layout shell:**

- Purpose: Global HTML wrapper, favicon, Tailwind theme tokens.
- Examples: `src/routes/+layout.svelte`, `src/routes/layout.css`
- Pattern: Root layout imports `./layout.css`; theme variables under `@theme` for Tailwind v4.

**Component granularity (atomic design-ish):**

- Purpose: Reusable UI at two levels.
- Examples: `src/lib/components/atoms/Phases.svelte`, `src/lib/components/molecules/Header.svelte`
- Pattern: Place small pieces in `atoms/`, composed sections in `molecules/`.

## Entry Points

**SvelteKit app (dev/build):**

- Location: `vite.config.js` (Vite + `sveltekit()` + Tailwind), `svelte.config.js` (`@sveltejs/adapter-node`)
- Triggers: `npm run dev`, `npm run build`, `npm run preview`
- Responsibilities: Bundle routes and server code; Node adapter for production server.

**Every HTTP request (server):**

- Location: `src/hooks.server.js`
- Triggers: SvelteKit `handle` hook
- Responsibilities: Session hydration, Better Auth request handling.

**Public routes (examples):**

- Location: `src/routes/+page.svelte` (`/`), `src/routes/draft/[id]/+page.svelte`, `src/routes/demo/+page.svelte`
- Triggers: User navigation
- Responsibilities: Render UI; draft route is a placeholder for future draft flow.

## Error Handling

**Strategy:** Redirects for auth gates; `fail()` for form validation/API errors on demo auth flows; thrown errors propagate per SvelteKit defaults unless caught.

**Patterns:**

- `redirect(302, ...)` from `load` and actions when auth state requires navigation (`src/routes/demo/better-auth/+page.server.js`, login actions after success).
- `fail(400|500, { message })` when `APIError` or unexpected errors occur in login/register actions (`src/routes/demo/better-auth/login/+page.server.js`).
- UI displays `form?.message` on login page (`src/routes/demo/better-auth/login/+page.svelte`).

## Cross-Cutting Concerns

**Logging:** Not detected as a dedicated framework; rely on platform/console defaults unless added later.

**Validation:** Demo auth validates via Better Auth API responses; no shared Zod/Valibot layer detected in routes.

**Authentication:** Better Auth with email/password; session in cookies via `sveltekitCookies(getRequestEvent)` in `src/lib/server/auth.js`; types for `App.Locals` in `src/app.d.ts`.

**Database bootstrap:** `src/lib/server/db/index.js` throws if `DATABASE_URL` is unset at module load.

**Declared but unused in source:** `package.json` lists `svelte-realtime` and `svelte-adapter-uws` as dependencies with no imports under `src/`; architecture currently does not include realtime or uWS adapter wiring in application code.

---

*Architecture analysis: 2026-04-03*
