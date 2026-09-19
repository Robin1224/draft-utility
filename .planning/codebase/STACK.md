---
last_mapped_commit: a6621e6df6e72e09b43157d0d2d0b048118a8016
---

# Technology Stack

**Analysis Date:** 2026-09-19

## Languages

**Primary:**
- JavaScript (ES modules, `"type": "module"` in `package.json`) with JSDoc type annotations — used across `src/`. No `.ts` source files; type-checking is done via `svelte-check` against `jsconfig.json` (JSDoc-driven, `checkJs: true`, `strict: true`).
- Svelte 5 (`.svelte` files) with **runes mode forced** for all app code via `svelte.config.js` (`vitePlugin.dynamicCompileOptions`), except files under `node_modules`.

**Secondary:**
- SQL — hand-reviewed Drizzle-generated migrations in `drizzle/*.sql` (Postgres dialect).
- CSS — a single large hand-written stylesheet `src/app.css` (no CSS framework; see Frameworks below).

## Runtime

**Environment:**
- Node.js 24 (`node:24-alpine` base image in `dockerfile`; `@types/node: ^24` devDependency).
- `.npmrc` sets `engine-strict=true`, but `package.json` has **no `engines` field** — engine-strict has nothing to enforce (see CONCERNS.md candidate).

**Package Manager:**
- npm (`package-lock.json` present and committed).
- Lockfile: present (`package-lock.json`).

## Frameworks

**Core:**
- SvelteKit `^2.50.2` (`@sveltejs/kit`) — full-stack app framework, file-based routing under `src/routes/`.
- Svelte `^5.51.0` — component framework, runes-only compilation enforced project-wide.
- `svelte-realtime` `^0.4.6` — RPC + reactive pub/sub layer for WebSockets, built on `svelte-adapter-uws`. Provides the `src/live/*.js` "live function" pattern (see ARCHITECTURE.md) and generates `src/live/$types.d.ts`.
- `svelte-adapter-uws` `^0.4.5` — the actual SvelteKit **production adapter** in use (configured in `svelte.config.js` as `adapter({ websocket: true })`). It runs the app on µWebSockets (uWS) instead of Node's `http` module, enabling native WebSocket upgrade handling required by `svelte-realtime`.
  - Note: `@sveltejs/adapter-node ^5.5.2` is also listed in `devDependencies` but is **not referenced anywhere** in config or source — a leftover from the `sv create` scaffold template (see `README.md` recreate command). `svelte-adapter-uws` is the adapter actually wired up.

**Testing:**
- Vitest `^4.1.0`, configured in `vite.config.js` with two **projects**:
  - `client` — browser-mode tests (`@vitest/browser-playwright` + `vitest-browser-svelte`, Chromium headless) for `src/**/*.svelte.{test,spec}.{js,ts}`, excluding `src/lib/server/**`.
  - `server` — Node-environment tests for all other `*.{test,spec}.{js,ts}` files.
  - `expect: { requireAssertions: true }` is set globally — every test must contain at least one assertion.
- `svelte-check` `^4.4.2` — JSDoc/type checking (`npm run check`), not a test runner but part of the quality gate.

**Build/Dev:**
- Vite `^7.3.1` — dev server and bundler, plugins: `sveltekit()`, `uws()` (from `svelte-adapter-uws/vite`), `realtime()` (from `svelte-realtime/vite`), `devtoolsJson()` (from `vite-plugin-devtools-json`).
- Drizzle Kit `^0.31.8` — schema push/generate/migrate/studio (`drizzle.config.js`, scripts `db:push`, `db:generate`, `db:migrate`, `db:studio`).
- `@better-auth/cli` `~1.4.21` — regenerates the Better Auth Drizzle schema file (`npm run auth:schema` → writes `src/lib/server/db/auth.schema.js`).

## Key Dependencies

**Critical:**
- `drizzle-orm` `^0.45.1` + `@neondatabase/serverless` `^1.0.2` — ORM and Postgres driver, wired for the Neon serverless HTTP driver (`drizzle-orm/neon-http`) in `src/lib/server/db/index.js`.
- `better-auth` `~1.4.21` — authentication framework (session, OAuth, Drizzle adapter, SvelteKit cookie plugin) in `src/lib/server/auth.js`.
- `svelte-realtime` `^0.4.6` — all real-time draft/chat/room functionality depends on this package's RPC/pub-sub model (`src/live/`, `src/hooks.ws.js`).
- `nanoid` `^5.1.7` — short ID generation, used in `src/lib/server/rooms.js` (e.g. room public codes) and exercised in `src/lib/components/molecules/DraftSettingsPanel.svelte.spec.js`.

**Infrastructure:**
- `vite-plugin-devtools-json` `^1.0.0` — emits Chrome DevTools project settings JSON for local dev.
- `playwright` `^1.58.2` — browser automation backing the Vitest browser-mode test project.

## Configuration

**Environment:**
- Environment variables are read exclusively through SvelteKit's `$env/dynamic/private` (never `process.env` directly in app code — the one `process.env.DATABASE_URL` reference in `src/lib/server/rooms.spec.js:573` is a test-only optional-integration guard, and `drizzle.config.js` reads `process.env.DATABASE_URL` directly since it runs outside the SvelteKit runtime).
- `.env` is present locally (gitignored) with `.env.example` as the committed template (contents of both are intentionally not read/quoted by this analysis — see forbidden-files policy).
- Known required variables (from source, not `.env.example` contents): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `ORIGIN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` (all consumed in `src/lib/server/auth.js` and `src/lib/server/db/index.js`).

**Build:**
- `vite.config.js` — Vite/Vitest configuration, plugin wiring, and a documented workaround (`server.watch.ignored: ['**/$types.d.ts']`) to prevent an infinite hot-reload loop caused by `svelte-realtime` rewriting its generated types file.
- `svelte.config.js` — adapter selection (`svelte-adapter-uws`) and forced-runes compile option.
- `jsconfig.json` — extends `.svelte-kit/tsconfig.json`; `checkJs`/`strict` enabled for JSDoc-based type safety.
- `drizzle.config.js` — Postgres dialect, schema path `src/lib/server/db/schema.js`, `strict: true`.
- `eslint.config.js` — flat config: `@eslint/js` recommended + `eslint-plugin-svelte` recommended, `eslint-config-prettier` to disable stylistic conflicts, gitignore-aware via `@eslint/compat`.
- `.prettierrc` — tabs, single quotes, no trailing commas, `printWidth: 100`, `prettier-plugin-svelte` for `.svelte` parsing.
- CSS/styling: **no Tailwind CSS despite the original `sv create` scaffold command in `README.md` listing `tailwindcss="plugins:none"`.** Tailwind has since been removed; `src/app.css` is a single hand-authored "cyber" theme stylesheet (confirmed by an in-file comment: "the prototype ul relied on Tailwind preflight, which this milestone removed"). Treat the project as **framework-less CSS**, not Tailwind, for any new UI work.

## Platform Requirements

**Development:**
- Node 24, npm, local Postgres-compatible `DATABASE_URL` (Neon or any Postgres reachable over HTTP-compatible driver) for `db:*` scripts and integration-guarded tests.
- MCP server config in `.mcp.json` wires the official Svelte MCP server (`@sveltejs/mcp`) for IDE/agent tooling — not a runtime dependency.

**Production:**
- Deployed via Docker (`dockerfile`): `node:24-alpine`, secrets mounted at build time for `BETTER_AUTH_SECRET`, `DATABASE_URL`, `ORIGIN`, then `npm install; npm run build; node build`, exposing port 3000.
- Because the adapter is `svelte-adapter-uws`, the production server binds and serves WebSocket upgrades natively (uWS) rather than through a separate Node `http`/`ws` stack — this rules out serverless/edge deployment targets that don't support long-lived raw socket servers (e.g. Vercel Edge, Cloudflare Workers) unless the adapter is swapped.

---

*Stack analysis: 2026-09-19*
