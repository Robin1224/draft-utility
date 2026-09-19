---
last_mapped_commit: a6621e6df6e72e09b43157d0d2d0b048118a8016
---

# Coding Conventions

**Analysis Date:** 2026-09-19

## Naming Patterns

**Files:**
- Svelte components: `PascalCase.svelte` (e.g. `src/lib/components/molecules/LobbyHostBar.svelte`, `src/lib/components/atoms/CyModal.svelte`)
- Plain JS modules: `kebab-case.js` or `lowerCamelCase.js` mixed — most are kebab/lower (`src/lib/join-parse.js`, `src/lib/chat-filter.js`, `src/lib/draft-script.js`), server modules are single lowercase words (`src/lib/server/rooms.js`, `src/lib/server/draft.js`, `src/lib/server/room-lifecycle.js`)
- Svelte runes modules use the `.svelte.js` suffix (e.g. `src/lib/components/effects/cyTypedLog.svelte.js`) so Vite treats them as component-adjacent reactive modules
- SvelteKit routing files follow SvelteKit conventions: `+page.svelte`, `+page.server.js`, `+layout.svelte` under `src/routes/`
- Realtime/live handlers live under `src/live/` and are named after their domain (`room.js`, `draft.js`, `chat.js`, `draft-timers.js`)

**Functions:**
- `camelCase` for all functions, exported or private: `generatePublicCode`, `getRoomByPublicCode`, `joinTeamForUser`, `recomputeTeamCaptains` (`src/lib/server/rooms.js`)
- Verb-first naming for actions (`createRoom`, `cancelRoomAsHost`, `promoteCaptain`, `movePlayer`)
- Predicate helpers prefixed `is`/`should`/`has`: `isUniqueViolation` (`src/lib/server/rooms.js:26`), `shouldAbandonLobby`/`shouldHideRoomFromPublic` (`src/lib/server/room-lifecycle.js`)
- Private (non-exported, module-scoped) helper functions sit below the public API they support in the same file, e.g. `countTeamMembersExcludingUser` and `recomputeTeamCaptains` precede their callers in `src/lib/server/rooms.js`

**Variables:**
- `camelCase` locals; database/JSONB fields keep `snake_case` because they mirror Drizzle/Postgres column names (`host_user_id`, `public_code`, `is_captain`, `joined_at`) — this snake_case leaks intentionally into JS objects returned from `src/lib/server/rooms.js` and `src/lib/server/db/schema.js`
- Domain-facing objects returned to the client use `camelCase` (`userId`, `guestId`, `displayName`, `isCaptain`, `isHost` in `LobbySnapshot` — `src/lib/server/rooms.js:134-150`) — the boundary between snake_case (DB) and camelCase (API/UI) is the `loadLobbySnapshot`/mapping functions
- Constants are `SCREAMING_SNAKE_CASE`: `ROOM_CODE_ALPHABET`, `CODE_LENGTH`, `CREATE_ROOM_MAX_ATTEMPTS` (`src/lib/server/rooms.js`), `MAX_LENGTH`, `ZERO_WIDTH_RE`, `SLUR_PATTERNS` (`src/lib/chat-filter.js`)
- Error "codes" are exported as `SCREAMING_SNAKE_CASE` string constants, not Error subclasses — `TEAM_FULL`, `NOT_HOST`, `KICK_TARGET_MISSING`, `INVALID_KICK_TARGET`, `LOBBY_PHASE_REQUIRED`, `DRAFT_NOT_READY`, `PLAYER_NOT_ON_TEAM` (`src/lib/server/rooms.js:104-122`)

**Types (JSDoc):**
- `@typedef {object} Name` blocks placed directly above the function(s) that use them, e.g. `LobbyMember`/`LobbySnapshot` in `src/lib/server/rooms.js:134-150`
- Inline typedefs are also declared at the top of `<script>` blocks in Svelte components for prop shapes, e.g. `LobbyMember`, `LobbySnap`, `ScriptTurn` in `src/lib/components/molecules/LobbyHostBar.svelte:5-9`
- Union string literals typed with `'A' | 'B'`, `'pick' | 'ban'` rather than enums

## Code Style

**Formatting:**
- Prettier is the source of truth — config in `.prettierrc`: tabs (`useTabs: true`), single quotes, no trailing commas (`trailingComma: none`), `printWidth: 100`
- `prettier-plugin-svelte` handles `.svelte` files (parser override in `.prettierrc` `overrides`)
- Run via `npm run format` (write) / `npm run lint` (check, combined with eslint) — see `package.json` scripts

**Linting:**
- Flat config in `eslint.config.js`: `@eslint/js` recommended + `eslint-plugin-svelte` recommended, `eslint-config-prettier` and `svelte.configs.prettier` disable formatting-related rules so Prettier and ESLint never conflict
- `.gitignore` patterns are folded into ESLint ignores via `includeIgnoreFile` (`@eslint/compat`)
- Browser + Node globals both enabled (`globals.browser`, `globals.node`) since code spans client Svelte components and server/live modules
- No custom rule overrides — defaults from `js.configs.recommended` and `svelte.configs.recommended` apply as-is

**Type checking:**
- Project is JS-only (no `.ts` source files) but uses JSDoc + `checkJs: true` in `jsconfig.json` for type safety via `svelte-check`
- Run via `npm run check` / `npm run check:watch` (runs `svelte-kit sync` first, then `svelte-check --tsconfig ./jsconfig.json`)
- Many server/live modules opt out with a top-of-file `// @ts-nocheck` when Drizzle's `any`-typed query builder chains make strict JSDoc typing impractical — e.g. `src/lib/server/rooms.js` has no `@ts-nocheck` but `src/live/draft.js:1` and `src/lib/chat-filter.js:1` do. Test files consistently use `// @ts-nocheck` at the top (see `src/lib/server/rooms.spec.js:1`, `src/lib/components/molecules/LobbyHostBar.svelte.spec.js:1`) because mock DB shapes are structurally loose
- When adding new server code, prefer full JSDoc typing (see `src/lib/server/rooms.js` for the house style) and only add `// @ts-nocheck` if Drizzle chain typing becomes unworkable

## Import Organization

**Order (observed, not enforced by tooling):**
1. Third-party/framework packages (`drizzle-orm`, `nanoid`, `@sveltejs/kit`, `svelte-realtime/server`)
2. `$lib/...` and `$live/...` aliased internal imports
3. Relative imports (`./db/schema.js`, `./draft-timers.js`)

**Path Aliases:**
- `$lib` maps to `src/lib` (SvelteKit built-in alias, configured via `svelte.config.js` files option) — used everywhere, e.g. `import { parseRoomCode } from '$lib/join-parse.js'` (`src/lib/server/rooms.js:3`, `src/live/draft.js:4`)
- `$live` is a custom alias for `src/live/` (declared via `svelte-realtime`'s Vite plugin, see `vite.config.js:6`) — routes and components import realtime client/server helpers through it
- JSON is imported with the `with { type: 'json' }` import attribute syntax: `import classes from '$lib/catalog/classes.json' with { type: 'json' }` (`src/live/draft.js:15`), `import slurList from '$lib/slur-list.json' with { type: 'json' }` (`src/lib/chat-filter.js:2`)
- Named exports preferred over default exports for all non-Svelte modules; Svelte components are the only default exports (implicit via `.svelte` file convention)

## Error Handling

**Domain errors (server logic, `src/lib/server/*.js`):**
- Thrown as bare string constants, not `Error` objects: `throw TEAM_FULL`, `throw NOT_HOST`, `throw DRAFT_NOT_READY` (`src/lib/server/rooms.js`). Callers catch and compare with `===` (see tests: `.rejects.toBe(TEAM_FULL)` in `src/lib/server/rooms.spec.js:322`)
- Infra failures (missing row lookups) throw real `Error` objects with a descriptive message acting as a code: `throw new Error('ROOM_NOT_FOUND')` (`src/lib/server/rooms.js:341,376,416,461,497`)
- This is an intentional two-tier convention: **expected domain violations** (capacity, permissions, phase mismatches) use string-constant throws for cheap `===` comparison at call sites; **unexpected/infra** failures use `Error` for stack traces and standard `instanceof Error` handling. Do not blur this line when adding new server functions — pick the tier based on whether the caller is expected to branch on the failure reason.
- Postgres unique-violation detection recurses through `err.cause` chains: `isUniqueViolation` (`src/lib/server/rooms.js:25-34`) checks `err.code === '23505'` and unwraps `.cause` recursively — reuse this pattern for other Postgres-error-code checks rather than a flat check.

**Realtime RPC handlers (`src/live/*.js`):**
- Use `LiveError` from `svelte-realtime/server` with a `(code, message)` signature: `throw new LiveError('UNAUTHORIZED', 'Sign in required')`, `throw new LiveError('VALIDATION', 'championId and action required')` (`src/live/draft.js:98-121`)
- Codes used: `UNAUTHORIZED`, `NOT_FOUND`, `FORBIDDEN`, `VALIDATION` — reuse these four rather than inventing new ones for new RPC handlers
- Non-fatal side effects (best-effort publish after a state change) are wrapped in `try { ... } catch { /* comment explaining why swallow is safe */ }` — see `src/live/draft.js:74-79` and `:86-91` (publish failures are non-fatal because clients rehydrate on reconnect)

**SvelteKit load functions (`+page.server.js`):**
- Use SvelteKit's `error()` helper to short-circuit with an HTTP status + message object: `error(404, { message: 'Room not found' })` (`src/routes/draft/[id]/+page.server.js:12`)

**General:**
- No global error-boundary/logging framework; errors propagate to the caller (RPC layer or SvelteKit) which is responsible for surfacing them. There is no `console.error`/logger abstraction used for domain errors — see Logging section.

## Logging

**Framework:** None — no logging library dependency. Bare `console` is not used for domain errors (they propagate via throw); any console usage found is incidental to build/dev tooling, not application code.

**Patterns:**
- Errors are surfaced via return values/throws consumed by callers (RPC error payloads, HTTP error pages), not logged server-side inside library code.
- When adding logging, there is no existing convention to follow — introduce one deliberately (e.g., a small wrapper) rather than scattering raw `console.log`.

## Comments

**When to Comment:**
- Comments explain **why**, referencing ticket/requirement IDs from planning docs, not what the code does: `// WR-06: the bound moveUserId can go stale...` (`src/lib/components/molecules/LobbyHostBar.svelte:61-63`), `// ROOM-08 closure:` and `// Host cancel:` in JSDoc (`src/lib/server/rooms.js:72-77`), `// DISC-pitfall-2: publish snapshot reactively...` (`src/live/draft.js:83-84`)
- Non-obvious ordering/sequencing constraints are called out explicitly: `// Pipeline order (must not be changed — RESEARCH.md Pattern 3)` (`src/lib/chat-filter.js:19`)
- Workarounds for library/driver limitations are documented inline where they occur: `// Neon HTTP driver has no interactive transactions — see plan 02-03 deviation` (`src/lib/server/rooms.js:291`), `// svelte-realtime writes $types.d.ts into src/live/ on each scan...` (`vite.config.js:12-14`)
- Section-separator comments use a banner style in longer files: `// ─── startDraftWithSettings ───────────────────────────────────────────────────` (`src/lib/server/rooms.spec.js:334`)

**JSDoc:**
- Every exported function gets a `@param`/`@returns` JSDoc block, even one-liners: `/** @param {string} raw */` (`src/lib/join-parse.js:1`)
- Multi-sentence prose JSDoc is used for functions with cross-cutting behavior or subtle invariants, including markdown-style bold callouts inside the doc comment itself (see `getRoomByPublicCode` in `src/lib/server/rooms.js:69-81`, which documents phase-closure and future integration points directly in the docstring)
- `{@link otherFn}` cross-references are used to connect related exports: `Error code thrown by {@link joinTeamForUser}` (`src/lib/server/rooms.js:103`)

## Function Design

**Size:** Functions are kept to a single responsibility and typically 10-40 lines; guard clauses (early `return`/`throw`) are used instead of nested conditionals — see the linear guard-clause structure of `pickBan` in `src/live/draft.js:96-179` and `movePlayer` in `src/lib/server/rooms.js:373-405`.

**Parameters:**
- Functions with 3+ conceptually related parameters take a single destructured options object typed via inline JSDoc: `export async function joinTeamForUser(db, { roomId, userId, team })` (`src/lib/server/rooms.js:296`), `export async function kickMember(db, { roomId, hostUserId, targetUserId, targetGuestId })` (`src/lib/server/rooms.js:338`)
- The Drizzle `db` instance is always the first positional parameter of server-layer functions, never bundled into the options object — this makes functions easy to unit test with a hand-rolled mock db (see Testing doc)

**Return Values:**
- Functions that can fail in an "expected" way return discriminated-union-shaped objects rather than throwing when the caller needs to branch on outcome without try/catch: `filterMessage` returns `{ blocked: true, reason } | { blocked: false, body }` (`src/lib/chat-filter.js:26`)
- Functions that mutate/act on the DB and either succeed or hit a documented failure mode throw instead (see Error Handling)

## Module Design

**Exports:** Named exports throughout non-Svelte modules; no default exports except Svelte single-file components (implicit). Related error-code constants are exported alongside the functions that throw them, in the same file, directly above first use.

**Barrel Files:** `src/lib/index.js` exists as SvelteKit's default lib barrel but is not used as a re-export aggregator in this codebase — most consumers import directly from the specific module path (e.g. `$lib/server/rooms.js`), not through a barrel. Follow this direct-import convention for new modules rather than adding barrel re-exports.

**Server/client boundary:** Code under `src/lib/server/` is SvelteKit-enforced server-only (cannot be imported from client components) and holds DB/Drizzle access (`db.js`, `schema.js`, `rooms.js`, `draft.js`, `room-lifecycle.js`, `auth.js`). Code under `src/live/` holds `svelte-realtime` RPC handlers that bridge client calls to server logic (imports from `$lib/server/*`). New server-only logic belongs in `src/lib/server/`; new realtime RPC endpoints belong in `src/live/`.

---

*Convention analysis: 2026-09-19*
