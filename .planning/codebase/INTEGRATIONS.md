# External Integrations

**Analysis Date:** 2026-04-03

## APIs & External Services

**Database (hosted PostgreSQL):**
- Neon — serverless Postgres accessed over HTTP using `@neondatabase/serverless` `neon()` client in `src/lib/server/db/index.js`
- Connection string: `DATABASE_URL` (see `.env.example`; actual values live in local `.env`, not committed)

**Authentication (application library, self-hosted routes):**
- Better Auth — configured in `src/lib/server/auth.js`; integrated with SvelteKit via `svelteKitHandler` in `src/hooks.server.js` and `sveltekitCookies` plugin
- Server usage: `auth.api.getSession`, `signInEmail`, `signUpEmail` in demo flow (`src/routes/demo/better-auth/login/+page.server.js`, `src/routes/demo/better-auth/+page.server.js`)
- Email/password: enabled in `auth.js` (`emailAndPassword: { enabled: true }`); no third-party OAuth providers configured in code reviewed

**Callback URLs referenced in forms:**
- Demo actions pass `callbackURL: '/auth/verification-success'` in `src/routes/demo/better-auth/login/+page.server.js` — verify a matching route exists before relying on post-signup redirects

## Data Storage

**Databases:**
- PostgreSQL (Neon) — Drizzle ORM; combined schema in `src/lib/server/db/schema.js` (app table `task` + re-export of `auth.schema.js` Better Auth tables)

**File Storage:**
- Local filesystem only for static assets under `static/` (standard SvelteKit); no cloud object storage SDK detected in `src/`

**Caching:**
- None detected in application code

## Authentication & Identity

**Auth Provider:**
- Better Auth (self-hosted on the same app) — `src/lib/server/auth.js`
  - Session/user on `event.locals` populated in `src/hooks.server.js`
  - Types for `App.Locals` in `src/app.d.ts` import from `better-auth/minimal`
  - Secrets: `BETTER_AUTH_SECRET`; public base URL: `ORIGIN` (both referenced in `src/lib/server/auth.js`)

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry/Datadog/etc. in `package.json` or `src/`)

**Logs:**
- Standard Node/console patterns only unless added outside searched paths

## CI/CD & Deployment

**Hosting:**
- Not specified in repository (README points to SvelteKit adapter docs)

**CI Pipeline:**
- No GitHub Actions, GitLab CI, or similar workflow files detected in repo root

## Environment Configuration

**Required env vars (from code and `.env.example`):**
- `DATABASE_URL` — Neon/Postgres connection URL; required at runtime in `src/lib/server/db/index.js` and for `drizzle.config.js`
- `ORIGIN` — Better Auth `baseURL` in `src/lib/server/auth.js`
- `BETTER_AUTH_SECRET` — Better Auth signing secret in `src/lib/server/auth.js`

**Secrets location:**
- Local `.env` (present in workspace; never commit or quote values). Template variable names only: `.env.example`

## Webhooks & Callbacks

**Incoming:**
- No dedicated webhook routes identified under `src/routes/` (no `api/webhooks/*` pattern)

**Outgoing:**
- None identified in application code

---

*Integration audit: 2026-04-03*
