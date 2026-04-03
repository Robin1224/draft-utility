# Coding Conventions

**Analysis Date:** 2026-04-03

## Naming Patterns

**Files:**

- Svelte components: PascalCase — e.g. `Join.svelte`, `Welcome.svelte`, `Header.svelte` under `src/lib/components/atoms/` and `src/lib/components/molecules/`.
- Route files: SvelteKit conventions — `+page.svelte`, `+layout.svelte`, `+page.server.js` under `src/routes/`.
- Server-only modules: descriptive kebab-free names — `hooks.server.js`, `auth.js`, `schema.js` under `src/lib/server/` and `src/lib/server/db/`.
- Unit / example modules next to specs — `greet.js` with `greet.spec.js`.

**Functions:**

- `camelCase` for functions and handlers — e.g. `handleSubmit` in `src/lib/components/molecules/Join.svelte`, `greet` in `src/lib/vitest-examples/greet.js`.
- Load functions and actions: named `load`, `actions` object with action names like `signOut` in `src/routes/demo/better-auth/+page.server.js`.

**Variables:**

- `camelCase` for locals — e.g. `draftId`, `disabled`, `session` in `src/hooks.server.js` and components.
- Svelte 5 runes: `$props()`, `$state()`, `$derived()` as framework syntax in `.svelte` files.

**Types:**

- Project uses JavaScript with `checkJs: true` in `jsconfig.json`; no separate `.ts` source files in `src/` at analysis time.
- Use JSDoc `@type` imports from Kit or config where needed — e.g. `/** @type {import('@sveltejs/kit').Handle} */` in `src/hooks.server.js`, `/** @type {import('@sveltejs/kit').Config} */` in `svelte.config.js`.

## Code Style

**Formatting:**

- Tool: Prettier (`prettier`, `prettier-plugin-svelte`, `prettier-plugin-tailwindcss`).
- Config: `.prettierrc` — tabs, single quotes, `trailingComma: "none"`, `printWidth: 100`, Tailwind stylesheet `./src/routes/layout.css` for class sorting.

**Linting:**

- Tool: ESLint 9 flat config in `eslint.config.js`.
- Stack: `@eslint/js` recommended, `eslint-plugin-svelte` recommended + prettier integration, `eslint-config-prettier`, `includeIgnoreFile('.gitignore')`.
- Svelte parser options pull from `svelte.config.js` for `**/*.svelte` and `**/*.svelte.js`.

**Commands (from `package.json`):**

- `npm run format` — Prettier write.
- `npm run lint` — `prettier --check .` then `eslint .`.

## Import Organization

**Order (observed):**

1. SvelteKit / framework — e.g. `$app/environment`, `$app/navigation`, `$app/paths`, `@sveltejs/kit`.
2. Blank line (optional but used in `src/routes/demo/better-auth/+page.server.js`).
3. App aliases — `$lib/...`, `$env/dynamic/private`.
4. Third-party packages — e.g. `better-auth/*`, `drizzle-orm/*`, `@neondatabase/serverless`.

**Path aliases:**

- `$lib` → `src/lib/` (SvelteKit default).
- `$app/*` and `$env/*` per SvelteKit.

**Barrel usage:**

- `src/lib/index.js` is a placeholder comment only; prefer direct imports from concrete paths under `$lib/...`.

## Error Handling

**Patterns:**

- Fail fast on missing required configuration — e.g. `if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');` in `src/lib/server/db/index.js`.
- Auth-gated routes: `redirect(302, ...)` when unauthenticated in `src/routes/demo/better-auth/+page.server.js` rather than throwing for expected “not signed in.”
- Async server hooks: return `resolve` through `svelteKitHandler` in `src/hooks.server.js`; session optional (set `locals` only when present).

**When adding features:** match load/actions patterns in existing `+page.server.js` files; use `redirect` or `error()` from `@sveltejs/kit` per SvelteKit docs for HTTP semantics.

## Logging

**Framework:** Not centralized; no shared logger module detected in `src/`.

**Patterns:** Rely on framework and hosting logs for server-side behavior unless a logging layer is introduced.

## Comments

**When to comment:**

- Sparse; `src/lib/index.js` documents intended use of `$lib`.
- Prefer self-explanatory names over inline narration.

**JSDoc:**

- Use `@type` for exporting or annotating Kit handles and config — see `src/hooks.server.js`, `svelte.config.js`.
- Broader JSDoc on every function is not required by current codebase style.

## Function Design

**Size:** Small focused functions — e.g. `greet`, single-purpose `load` / `actions` in demo routes.

**Parameters:** Destructuring for Kit APIs — `({ event, resolve })` in hooks; `event` in `load` and actions.

**Return values:** Plain objects from `load`, `redirect` from actions; components use implicit Svelte output.

## Module Design

**Exports:**

- Named exports for schema tables and db — `src/lib/server/db/schema.js`, `src/lib/server/db/index.js`.
- Named `auth`, `handle` exports where applicable.

**Svelte 5:**

- Runes enabled globally for app sources via `svelte.config.js` (`runes: true` for non-`node_modules` files).
- Components use `$props()` with defaults where shown — e.g. `src/lib/vitest-examples/Welcome.svelte`.

---

*Convention analysis: 2026-04-03*
