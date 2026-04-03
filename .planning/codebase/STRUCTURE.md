# Codebase Structure

**Analysis Date:** 2026-04-03

## Directory Layout

```
draft-utility/
├── src/
│   ├── app.d.ts                 # App.Locals typing (Better Auth user/session)
│   ├── hooks.server.js        # Global handle: session + Better Auth
│   ├── lib/
│   │   ├── index.js           # $lib barrel (placeholder comment only)
│   │   ├── assets/            # favicon, fonts (referenced from layout.css)
│   │   ├── components/
│   │   │   ├── atoms/         # Small UI pieces (e.g. Phases)
│   │   │   └── molecules/     # Composed blocks (Header, Create, Join)
│   │   ├── server/            # Server-only modules ($lib/server)
│   │   │   ├── auth.js
│   │   │   └── db/
│   │   │       ├── index.js   # Drizzle + Neon client
│   │   │       ├── schema.js  # App tables + re-export auth schema
│   │   │       └── auth.schema.js  # Generated/maintained Better Auth tables
│   │   └── vitest-examples/   # Sample tests and components (non-production)
│   └── routes/
│       ├── +layout.svelte
│       ├── +page.svelte       # Home (Create + Join)
│       ├── layout.css         # Tailwind @import + @theme + fonts
│       ├── draft/
│       │   └── [id]/
│       │       └── +page.svelte
│       └── demo/
│           ├── +page.svelte
│           └── better-auth/
│               ├── +page.svelte
│               ├── +page.server.js
│               └── login/
│                   ├── +page.svelte
│                   └── +page.server.js
├── static/
│   └── robots.txt
├── drizzle.config.js          # Drizzle Kit → schema path, PostgreSQL
├── eslint.config.js
├── jsconfig.json
├── package.json
├── package-lock.json
├── svelte.config.js           # adapter-node, Svelte 5 runes for app files
└── vite.config.js             # Tailwind, Vitest projects (client browser + server)
```

## Directory Purposes

**`src/routes/`:**

- Purpose: File-based routes, layouts, and global styles for the app shell.
- Contains: `+page.svelte`, `+layout.svelte`, optional `+page.server.js`, `layout.css`.
- Key files: `src/routes/+layout.svelte`, `src/routes/+page.svelte`, `src/routes/layout.css`, `src/routes/demo/better-auth/login/+page.server.js`.

**`src/lib/components/`:**

- Purpose: Reusable Svelte UI organized by granularity.
- Contains: `.svelte` components only under `atoms/` and `molecules/` today.
- Key files: `src/lib/components/molecules/Header.svelte`, `src/lib/components/molecules/Join.svelte`, `src/lib/components/molecules/Create.svelte`, `src/lib/components/atoms/Phases.svelte`.

**`src/lib/server/`:**

- Purpose: Code that must never run in the browser; database and auth.
- Contains: `auth.js`, `db/` with schema and client.
- Key files: `src/lib/server/auth.js`, `src/lib/server/db/index.js`, `src/lib/server/db/schema.js`.

**`src/lib/assets/`:**

- Purpose: Static assets imported through Vite (`$lib/assets/...`).
- Contains: SVG favicon, font files referenced from CSS.
- Key files: assets referenced in `src/routes/+layout.svelte` and `src/routes/layout.css`.

**`static/`:**

- Purpose: Files served as-is at site root.
- Contains: `robots.txt`.

**`src/lib/vitest-examples/`:**

- Purpose: Example tests and tiny modules for Vitest setup verification.
- Contains: `*.spec.js`, sample `.svelte` and `greet.js`.

## Key File Locations

**Entry Points:**

- `vite.config.js`: Vite + SvelteKit + Vitest project split.
- `src/hooks.server.js`: Request pipeline entry for auth/session.

**Configuration:**

- `svelte.config.js`: SvelteKit adapter and runes.
- `jsconfig.json`: JS/TS checking, extends `.svelte-kit/tsconfig.json`.
- `drizzle.config.js`: Schema file `src/lib/server/db/schema.js`, PostgreSQL.
- `eslint.config.js`: ESLint flat config.

**Core Logic:**

- `src/lib/server/auth.js`: Better Auth configuration.
- `src/lib/server/db/index.js`: Database connection and `db` export.

**Testing:**

- `vite.config.js`: `test.projects` for client (Playwright + `*.svelte.spec`) vs server (node).
- Examples under `src/lib/vitest-examples/`.

## Naming Conventions

**Files:**

- **Routes:** `+page.svelte`, `+layout.svelte`, `+page.server.js` (SvelteKit conventions).
- **Components:** PascalCase matching default export usage, e.g. `Header.svelte`, `Join.svelte`, `Phases.svelte`.
- **Server modules:** `camelCase.js` for singleton-style modules (`auth.js`, `index.js` in `db/`).
- **Schema:** `schema.js`, `auth.schema.js` under `db/`.

**Directories:**

- **Routes:** Lowercase path segments; dynamic params as `[id]`.
- **Components:** `atoms/`, `molecules/` (extend with `organisms/` or `pages/` only if the project adopts that consistently).

## Where to Add New Code

**New Feature (full-stack page):**

- Primary UI: `src/routes/<segment>/+page.svelte` (and `+layout.svelte` if a subtree needs a layout).
- Server data/actions: colocated `src/routes/<segment>/+page.server.js` (or `+layout.server.js` for shared load).
- Shared UI: `src/lib/components/atoms/` or `molecules/` depending on size/reuse.

**New Component/Module:**

- Implementation: `src/lib/components/...` for UI; `src/lib/server/` for anything using secrets, DB, or Node-only APIs.

**Utilities:**

- Shared helpers usable on client and server: add under `src/lib/` with a clear folder (e.g. `src/lib/utils/` — not present yet; follow existing style when introduced).
- Server-only helpers: `src/lib/server/` next to `auth.js` or in a `src/lib/server/utils/` subfolder if the folder grows.

**Database:**

- New tables: define in `src/lib/server/db/schema.js` (or a new file re-exported from `schema.js` to keep `drizzle.config.js` accurate).
- Auth-related generated schema: `npm run auth:schema` targets `src/lib/server/db/auth.schema.js` per `package.json`.

**Tests:**

- Svelte component browser tests: `src/**/*.svelte.spec.js` (or `.ts`) per `vite.config.js` client project.
- Node/server tests: `src/**/*.{test,spec}.js` excluding `*.svelte.spec.*`, with `src/lib/server/**` included in server project.

## Special Directories

**`.svelte-kit/`:**

- Purpose: Generated SvelteKit output (types, sync).
- Generated: Yes (via `svelte-kit sync`, dev, build).
- Committed: No (typically gitignored).

**`node_modules/`:**

- Purpose: Dependencies.
- Generated: Yes (`npm install`).
- Committed: No.

**`drizzle/` migrations folder:**

- Purpose: SQL migrations from Drizzle Kit.
- Present: Not detected in workspace root at analysis time; `drizzle.config.js` still points at schema for `db:generate` / `db:push` workflows.

---

*Structure analysis: 2026-04-03*
