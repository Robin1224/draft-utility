# Technology Stack

**Analysis Date:** 2026-04-03

## Languages

**Primary:**
- JavaScript (ES modules, `type: "module"`) — application source under `src/`, server modules in `src/lib/server/`
- JSDoc-checked JavaScript — `jsconfig.json` sets `checkJs: true` and `strict: true`; types augmented in `src/app.d.ts`

**Secondary:**
- TypeScript — dev dependency used by `svelte-check` and tooling; not a separate TS source tree

## Runtime

**Environment:**
- Node.js — implied by `@sveltejs/adapter-node`, Vite 7, and server-side SvelteKit

**Package Manager:**
- npm — `package.json` scripts and lockfile `package-lock.json`

## Frameworks

**Core:**
- SvelteKit `^2.50.2` — full-stack framework; routes in `src/routes/`, hooks in `src/hooks.server.js`
- Svelte `^5.51.0` — UI with runes enabled for app sources via `svelte.config.js` (`vitePlugin.dynamicCompileOptions`)
- Vite `^7.3.1` — bundler and dev server (`vite.config.js`)

**Testing:**
- Vitest `^4.1.0` — unit and server tests; config merged in `vite.config.js` with two projects (`client` browser, `server` node)
- `@vitest/browser-playwright` + Playwright — browser tests for `src/**/*.svelte.{test,spec}.{js,ts}`
- `vitest-browser-svelte` — Svelte component testing in the browser project

**Build/Dev:**
- `@sveltejs/adapter-node` `^5.5.2` — production adapter configured in `svelte.config.js` (Node server build)
- `@tailwindcss/vite` `^4.1.18` + Tailwind CSS `^4.1.18` — utility CSS pipeline
- `vite-plugin-devtools-json` `^1.0.0` — devtools integration
- ESLint `^9.39.2` — flat config in `eslint.config.js` (`eslint-plugin-svelte`, `eslint-config-prettier`)
- Prettier `^3.8.1` — with `prettier-plugin-svelte` and `prettier-plugin-tailwindcss` (no project-local `.prettierrc` in repo root)

## Key Dependencies

**Critical:**
- `drizzle-orm` `^0.45.1` — schema and queries; PostgreSQL dialect (`drizzle-orm/pg-core` in `src/lib/server/db/schema.js`, `auth.schema.js`)
- `drizzle-kit` `^0.31.8` — migrations/generate/push/studio; config in `drizzle.config.js`
- `@neondatabase/serverless` `^1.0.2` — HTTP driver wired in `src/lib/server/db/index.js` with `drizzle-orm/neon-http`
- `better-auth` `~1.4.21` — authentication; minimal build + SvelteKit cookies + Drizzle adapter in `src/lib/server/auth.js`
- `@better-auth/cli` `~1.4.21` — `npm run auth:schema` generates `src/lib/server/db/auth.schema.js` from `src/lib/server/auth.js`

**Infrastructure / unused in source:**
- `svelte-realtime` `^0.4.6` and `svelte-adapter-uws` `^0.4.4` — listed in `package.json` `dependencies`; no imports under `src/` (adapter in use is `@sveltejs/adapter-node` in `svelte.config.js`)

## Configuration

**Environment:**
- Private dynamic env via SvelteKit `$env/dynamic/private` in `src/lib/server/db/index.js` and `src/lib/server/auth.js`
- Documented template: `.env.example` (names only — do not commit secrets)
- Required for DB tooling: `DATABASE_URL` for `drizzle.config.js` (throws if unset)

**Build:**
- `svelte.config.js` — Kit adapter, Svelte 5 runes for non-`node_modules` files
- `vite.config.js` — plugins and Vitest project split
- `jsconfig.json` — extends `.svelte-kit/tsconfig.json`

## Platform Requirements

**Development:**
- Node.js compatible with Vite 7 and SvelteKit 2
- `npm install`; `npm run dev` starts Vite dev server

**Production:**
- Node deployment target matching `@sveltejs/adapter-node` output (`npm run build`, `npm run preview`)

---

*Stack analysis: 2026-04-03*
