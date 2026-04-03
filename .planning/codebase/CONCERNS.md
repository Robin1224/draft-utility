# Codebase Concerns

**Analysis Date:** 2026-04-03

## Tech Debt

**Unused npm dependencies:**

- Issue: `svelte-realtime` and `svelte-adapter-uws` are listed in `package.json` but have no imports under `src/`. The active SvelteKit adapter is `@sveltejs/adapter-node` in `svelte.config.js`.
- Files: `package.json`, `package-lock.json`, `svelte.config.js`
- Impact: Larger install surface, unclear intent for future realtime/uWS deployment, possible version drift.
- Fix approach: Remove packages if not planned; or wire them into build/deploy docs and config when adopting.

**Sample Drizzle schema vs product domain:**

- Issue: `task` table is defined and exported from `src/lib/server/db/schema.js` but no route or server module queries or mutates it. Only `auth` uses the DB via `src/lib/server/auth.js` and generated `src/lib/server/db/auth.schema.js`.
- Files: `src/lib/server/db/schema.js`, `src/lib/server/db/index.js`
- Impact: Migrations may create tables the app never uses; confusion about data model.
- Fix approach: Drop the table and exports if obsolete, or implement features that use it.

**Auth callback URL without matching app route:**

- Issue: Sign-in and sign-up actions pass `callbackURL: '/auth/verification-success'` to Better Auth. There is no `src/routes/auth/` tree in the repo; verification or callback flows may 404 or misroute depending on Better Auth behavior and deployment base path.
- Files: `src/routes/demo/better-auth/login/+page.server.js`
- Impact: Broken post-verification UX or dead links after email flows.
- Fix approach: Add a real route (or correct Better Auth default) and align with `env.ORIGIN` / `baseURL` in `src/lib/server/auth.js`.

**Inconsistent formatting in generated vs hand-written DB code:**

- Issue: `src/lib/server/db/auth.schema.js` uses double quotes and spacing that differ from typical project style (e.g. `src/lib/server/auth.js`). Regenerating schema can churn diffs.
- Files: `src/lib/server/db/auth.schema.js`, `src/lib/server/db/schema.js`
- Impact: Noisy reviews; harder to spot real changes in auth schema.
- Fix approach: Document that file is codegen-only; add Prettier ignore or post-generate format step if team wants uniformity.

## Known Bugs

**Join flow: implicit form submit vs client navigation:**

- Symptoms: The join UI in `src/lib/components/molecules/Join.svelte` uses a `<form>` with default `method` (GET) and no `action`, while navigation is implemented with `onclick={handleSubmit}` on the button. Submitting the form with Enter in the text field can trigger native form submission instead of `goto`, leading to a full navigation or reload that does not match the intended SPA `goto(resolve(\`/draft/${draftId}\`))` behavior.
- Files: `src/lib/components/molecules/Join.svelte`
- Trigger: Focus the draft ID input, press Enter (without clicking the button).
- Workaround: Click Join explicitly.
- Fix approach: Use `onsubmit` on the form with `preventDefault` and call the same navigation logic, or use `method="button"` / non-submit button pattern consistently.

**Create navigates to dynamic segment `create`:**

- Symptoms: `Create` sends users to `/draft/create` via `goto(resolve('/draft/create'))` in `src/lib/components/molecules/Create.svelte`. The only draft route is `src/routes/draft/[id]/+page.svelte`, so the literal id `create` is shown like any other draft, not a dedicated creation flow.
- Files: `src/lib/components/molecules/Create.svelte`, `src/routes/draft/[id]/+page.svelte`
- Trigger: Click Create on the home page.
- Workaround: None if this is placeholder behavior.
- Fix approach: Add a real create route or server action, or generate/store a draft id before navigation.

**Theme control is non-functional UI:**

- Symptoms: Header renders a theme toggle button with no handler or state; it does not change theme or persistence.
- Files: `src/lib/components/molecules/Header.svelte`
- Trigger: Click moon icon.
- Workaround: None.
- Fix approach: Implement theme (e.g. `class` on `document.documentElement`) and match tokens in `src/routes/layout.css`, or remove the control until implemented.

## Security Considerations

**Secrets and environment variables:**

- Risk: Misconfigured `ORIGIN` or `BETTER_AUTH_SECRET` weakens session and CSRF-related assumptions for Better Auth. Unlike `DATABASE_URL`, `src/lib/server/auth.js` does not validate presence of `env.ORIGIN` or `env.BETTER_AUTH_SECRET` at startup.
- Files: `src/lib/server/auth.js`, `.env.example` (documents required vars; do not commit real secrets)
- Current mitigation: `.env` is gitignored; `.env.example` lists `DATABASE_URL`, `ORIGIN`, `BETTER_AUTH_SECRET`.
- Recommendations: Fail fast in dev when required auth env vars are missing; document production checklist for `ORIGIN` matching the public URL.

**Demo auth surface exposed:**

- Risk: `/demo` and `/demo/better-auth` are reachable without tying the main draft UI to auth. That is acceptable for a demo, but in production the same tree could become an open registration endpoint if left enabled.
- Files: `src/routes/demo/+page.svelte`, `src/routes/demo/better-auth/**`
- Current mitigation: Protected demo page redirects unauthenticated users to login (`src/routes/demo/better-auth/+page.server.js`).
- Recommendations: Remove or guard demo routes in production builds, or feature-flag them.

**Join accepts arbitrary draft id strings:**

- Risk: No server validation or existence check; users can navigate to any `/draft/[id]` path. If later drafts are sensitive, this becomes IDOR once real data exists.
- Files: `src/lib/components/molecules/Join.svelte`, `src/routes/draft/[id]/+page.svelte`
- Current mitigation: Draft page is static UI only; no data fetch by id yet.
- Recommendations: When drafts are persisted, authorize by session or shared secret and validate ids server-side.

## Performance Bottlenecks

**Neon HTTP driver for all DB access:**

- Problem: `src/lib/server/db/index.js` uses `drizzle-orm/neon-http` with `@neondatabase/serverless` `neon()`, so each query is an HTTP round-trip to Neon.
- Files: `src/lib/server/db/index.js`
- Cause: Serverless-friendly default, not pooled TCP.
- Improvement path: For long-lived Node adapters, consider pooled Neon or `neon-serverless` WebSocket pool if latency or connection count becomes an issue.

## Fragile Areas

**Global Better Auth hook:**

- Files: `src/hooks.server.js`
- Why fragile: Every request runs session resolution and `svelteKitHandler`; misconfiguration of `auth` or `env` affects the entire app, not an isolated route.
- Safe modification: Change hooks in tandem with `src/lib/server/auth.js` and Better Auth upgrade notes; run auth flows manually after upgrades.
- Test coverage: No automated tests cover `hooks.server.js` or auth redirects.

**Draft feature is UI-only:**

- Files: `src/routes/draft/[id]/+page.svelte`, `src/lib/components/atoms/Phases.svelte`
- Why fragile: Phase steps are presentational; no load functions, stores, or APIs sync phase with server or peers. Easy to diverge from future real-time or REST design.
- Safe modification: Introduce `+page.server.js` / `+page.ts` and typed data before adding multiplayer logic.
- Test coverage: No component or route tests for draft flow.

## Scaling Limits

**Not applicable (early-stage UI):**

- The app does not yet implement draft rooms, concurrent users, or heavy server load. Limits will appear once realtime (`svelte-realtime` is unused) or DB-backed drafts are added.

## Dependencies at Risk

**Better Auth + Drizzle + Neon stack:**

- Risk: Tight coupling across `better-auth`, `drizzle-orm`, and `@neondatabase/serverless`; major version bumps require coordinated updates and possible schema regeneration (`npm run auth:schema`).
- Impact: Auth breakage or failed builds if versions drift.
- Migration plan: Follow Better Auth and Drizzle release notes; regenerate `auth.schema.js` after CLI changes.

## Missing Critical Features

**Product core not implemented:**

- Problem: No API, persistence, or realtime layer for drafts despite project name and UI affordances.
- Blocks: Real create/join, lobby, drafting, and review phases.

**No CI pipeline in repo:**

- Problem: No `.github/workflows` (or similar) detected; lint, check, and tests are manual via `package.json` scripts.
- Blocks: Consistent quality gates on every change.

## Test Coverage Gaps

**Application routes and auth untested:**

- What's not tested: `src/routes/+page.svelte`, `src/routes/draft/**`, `src/lib/components/molecules/**`, `src/hooks.server.js`, demo auth server modules.
- Files: Above; contrast with `src/lib/vitest-examples/*` which holds the only specs.
- Risk: Regressions in navigation, forms, and auth flows go unnoticed.
- Priority: High before shipping user-facing auth or draft logic.

**Example-only Vitest setup:**

- What's not tested: Production components co-located under `src/lib/components` have no `*.spec.js` beside examples.
- Files: `vite.config.js` (includes `src/**/*.svelte.{test,spec}.{js,ts}`), `src/lib/vitest-examples/Welcome.svelte.spec.js`
- Risk: Developers may assume tests exist for new Svelte files when only examples are present.
- Priority: Medium.

**Tracked or dirty OS metadata:**

- What's not tested: N/A; operational hygiene issue.
- Files: `.DS_Store` appears in git status in some environments despite `.gitignore` entry—often means the file was committed before being ignored.
- Risk: Pointless diffs and merge noise.
- Priority: Low; remove from index if tracked.

---

*Concerns audit: 2026-04-03*
