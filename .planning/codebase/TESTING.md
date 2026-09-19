---
last_mapped_commit: a6621e6df6e72e09b43157d0d2d0b048118a8016
---

# Testing Patterns

**Analysis Date:** 2026-09-19

## Test Framework

**Runner:**
- Vitest 4 (`vitest` devDependency in `package.json`), configured directly inside `vite.config.js` (no separate `vitest.config.js`)
- The `test` block in `vite.config.js:18-45` splits the suite into two **Vitest projects**, each extending the base Vite config:
  - `client` project — browser-mode tests: `browser.enabled: true`, `provider: playwright()` from `@vitest/browser-playwright`, headless Chromium instance. `include: ['src/**/*.svelte.{test,spec}.{js,ts}']`, excludes `src/lib/server/**`.
  - `server` project — Node environment (`environment: 'node'`). `include: ['src/**/*.{test,spec}.{js,ts}']`, excludes anything matching the client's `*.svelte.{test,spec}.js` pattern.
  - **Critical naming rule:** whether a spec runs in-browser or in-Node is determined entirely by whether its filename matches `*.svelte.{test,spec}.js`. Name Svelte-component specs `Foo.svelte.spec.js` to get real Chromium DOM; name plain-logic specs `foo.spec.js` (no `.svelte.` segment) to run fast in Node. A file like `CyModalHost.test.svelte` is a **fixture component**, not a spec — it deliberately avoids the `.svelte.{test,spec}.js` glob pattern (see `src/lib/components/molecules/DraftSettingsPanelHost.test.svelte:12`, which comments on why `.test.svelte` is used for host fixtures instead of `.svelte.spec.js`).
- `expect: { requireAssertions: true }` (`vite.config.js:19`) is set globally — every test must contain at least one assertion or it fails; do not write tests that only exercise side effects without an `expect(...)` call.

**Assertion Library:** Vitest's built-in `expect` (Chai-compatible), including `expect.objectContaining`, `.toMatchObject`, `.resolves`/`.rejects`, `.toHaveBeenCalledWith`, and browser-mode `expect.element(...)`/`expect.poll(...)` from `vitest/browser`.

**Run Commands:**
```bash
npm run test:unit        # vitest (watch mode by default)
npm run test             # vitest --run (single pass, CI-style)
```
There is no separate coverage script and no coverage threshold configured in `vite.config.js` or `package.json` — coverage is not currently enforced.

## Test File Organization

**Location:** Co-located with source, not in a mirrored `__tests__` tree, with one exception: `src/lib/draft/__tests__/disconnect.test.js` and `src/lib/draft/__tests__/draftSnapshot.test.js` use a `__tests__/` subdirectory (for not-yet-implemented "wave 0" specs — see Test Types below). New tests should be co-located next to the module under test unless following that pre-implementation stub pattern.

**Naming:**
- Plain JS/server logic: `<module>.spec.js` next to `<module>.js` — e.g. `src/lib/server/rooms.js` + `src/lib/server/rooms.spec.js`, `src/lib/join-parse.js` + `src/lib/join-parse.spec.js`, `src/live/draft.js` + `src/live/draft.spec.js`
- Svelte component browser tests: `<Component>.svelte.spec.js` next to `<Component>.svelte` — e.g. `src/lib/components/molecules/LobbyHostBar.svelte` + `src/lib/components/molecules/LobbyHostBar.svelte.spec.js`
- Component test **fixtures** (helper components rendered by a spec, not specs themselves) use `.test.svelte`: `src/lib/components/atoms/CyModalHost.test.svelte`, `src/lib/components/molecules/DraftSettingsPanelHost.test.svelte` — required naming to dodge the client-project glob (see comment at `DraftSettingsPanelHost.test.svelte:12`)
- A few top-level `phaseN-*.spec.js` files exist directly under `src/` (`src/phase8-foundation.spec.js`, `src/phase10-screens.spec.js`, `src/phase11-fixes.spec.js`) — these are cross-cutting/integration-style specs tied to GSD planning phases rather than a single module; new cross-module specs of this kind can follow the same `phaseN-<topic>.spec.js` naming at the `src/` root.
- `src/lib/vitest-examples/` contains scaffold example tests (`greet.spec.js`, `Welcome.svelte.spec.js`) from the SvelteKit vitest add-on — treat as reference/boilerplate, not a pattern to actively extend.

**Structure:** No fixtures directory or shared test-utils module was found; each spec file defines its own local mock-DB factories and fixture builder functions inline (see Fixtures and Factories below).

## Test Structure

**Suite organization** (Node/server specs, `describe`/`it`, Vitest globals imported explicitly):
```javascript
// src/lib/server/rooms.spec.js
// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { generatePublicCode, ROOM_CODE_ALPHABET, CODE_LENGTH } from './rooms.js';

describe('generatePublicCode', () => {
	it('returns a string of CODE_LENGTH from ROOM_CODE_ALPHABET', () => {
		const code = generatePublicCode();
		expect(code).toHaveLength(CODE_LENGTH);
	});
});
```
- Every server/logic spec file starts with `// @ts-nocheck` (mock DB shapes are structurally loose and would otherwise fail `svelte-check`).
- `describe` blocks are named after the function under test, sometimes annotated with the ticket/requirement code the test enforces, e.g. `describe('joinTeamForUser (ROOM-04 captain + cap)', ...)` (`src/lib/server/rooms.spec.js:293`).
- `it` descriptions are full sentences describing observable behavior, frequently citing the requirement ID driving the assertion, e.g. `'WR-06: EXEC disables (and never fires onMove) when the selected member leaves the roster'` (`src/lib/components/molecules/LobbyHostBar.svelte.spec.js:160`).
- Large spec files use banner comments to separate logical sections: `// ─── startDraftWithSettings ───────────────────────────────────────────────────` (`src/lib/server/rooms.spec.js:334`).
- Not-yet-implemented behavior is captured with `it.todo('description')` inside real `describe` blocks rather than being left undocumented — see `src/lib/draft/__tests__/disconnect.test.js` (all 9 cases are `it.todo`, with a comment explaining the future import path and that `vi.mock` will be wired in a later implementation phase).
- `describe.skipIf(!hasDb)(...)` gates optional integration tests behind an environment check (`const hasDb = Boolean(process.env.DATABASE_URL)` — `src/lib/server/rooms.spec.js:573,575`), letting the same suite run in pure-mock mode locally/CI and against a real Neon Postgres instance when `DATABASE_URL` is set.

**Browser/component suite organization:**
```javascript
// src/lib/components/molecules/LobbyHostBar.svelte.spec.js
// @ts-nocheck
import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import '../../../app.css';               // load real CSS — layout/visibility assertions depend on it
import LobbyHostBar from './LobbyHostBar.svelte';
```
- `render(Component, props)` from `vitest-browser-svelte` mounts into a real (headless Chromium) DOM.
- Interaction goes through Playwright-style locators: `page.getByRole('button', { name: 'HOST_CONSOLE()' }).click()`, `page.getByRole('combobox', { name: 'Move player' }).selectOptions('u2')`.
- Assertions on live DOM state use `expect.element(locator).toBeVisible()/.toBeDisabled()/.toBeEnabled()`, and `expect.poll(() => value).toBe(x)` for async/animation-settling checks (e.g. dialog close animation — `src/lib/components/molecules/LobbyHostBar.svelte.spec.js:237`).
- `screen.rerender({ prop: newValue })` (return value of `render(...)`) is used to simulate prop changes mid-test without remounting (`src/lib/components/molecules/LobbyHostBar.svelte.spec.js:172`).
- Explicit `.unmount()` is called between renders of the same component within one `it` block when re-rendering with fresh props rather than `rerender` (`src/lib/components/molecules/LobbyHostBar.svelte.spec.js:131,202`).
- App CSS is imported directly into the spec file when visibility/layout assertions depend on real cascade (`checkVisibility()`), not mocked or stubbed.

## Mocking

**Framework:** Vitest's built-in `vi` (`vi.fn()` for spies/callbacks). No `vi.mock()` module mocking currently in active use (it is referenced as a planned technique in the `it.todo` stub file `src/lib/draft/__tests__/disconnect.test.js:5`, not yet exercised).

**Database mocking pattern (server-layer specs):** Rather than mocking the Drizzle client library, specs hand-roll minimal objects that structurally mimic the subset of the Drizzle query-builder chain the function under test calls, tracking call order with a counter:
```javascript
// src/lib/server/rooms.spec.js:210-291 (abridged)
function createJoinTeamMockDb(state) {
	let selectWhereCall = 0;
	return {
		select(_fields) {
			return { from() { return { where() {
				selectWhereCall++;
				const call = selectWhereCall;
				return {
					limit() { /* return based on `call` */ },
					orderBy() { /* return based on `call` */ },
					then(onF, onR) { /* thenable — lets `await db.select()...where()` resolve directly */ }
				};
			}}}; }
		},
		insert(_table) { return { values(v) { /* push into state.rows, resolve() */ } }; },
		update(_table) { return { set(s) { return { where() { /* mutate state.rows */ } }; } }; }
	};
}
```
- The recurring trick: because Drizzle chains are awaited directly (`await db.select().from(x).where(y)`) without a final `.limit()`/`.orderBy()`, the mock's `where()` return value implements a `then(onFulfilled, onRejected)` method so it behaves as a thenable/promise. Reuse this `then()`-as-thenable pattern for any new server function whose query chain resolves without an explicit terminal call.
- Call-order is tracked via a closure counter (`selectWhereCall`/`call`) and branched on with `if (call === 1) ... if (call === 2) ...` — brittle to call-order changes but matches how the codebase currently verifies exact query sequencing. When refactoring a function under test this way, check whether the mock's call-order branching needs updating too.
- Simple specs skip the shared factory and inline a one-off mock object directly in the `it()` body when only 1-2 calls are involved (see `getRoomByPublicCode` tests, `src/lib/server/rooms.spec.js:100-195`).
- Capturing values written by the function under test uses an outer-scoped `let`/const object populated inside the mock's `set`/`values` callback, then asserted after the awaited call: `let setPayload; ... expect(setPayload).toMatchObject({ phase: 'ended' })` (`src/lib/server/rooms.spec.js:170-194`).

**Callback/prop mocking (component specs):** Component callback props are always `vi.fn()`, assembled through a `makeProps(overrides)` factory (see Fixtures below), then asserted with `expect(fn).toHaveBeenCalledTimes(n)` / `.toHaveBeenCalledWith(...)`.

**What to Mock:** The Drizzle `db` object (server specs) and callback props (component specs, e.g. `onKick`, `onMove`, `onStartDraft`). Never mock the component under test itself, and never mock `svelte-realtime`/DOM APIs — browser-mode tests run against real Chromium.

**What NOT to Mock:** CSS (imported for real, `import '../../../app.css'`), DOM APIs, Playwright locators, and the pure business-logic functions under test.

**Optional real-DB integration test:** `describe.skipIf(!hasDb)` guards a test that imports the real `db` client (`await import('./db/index.js')`) and performs actual inserts/deletes against `DATABASE_URL`, cleaning up in a `finally` block (`src/lib/server/rooms.spec.js:575-593`). Follow this pattern (skip-if-absent + `finally` cleanup) for any new opt-in integration test that needs a live Postgres connection.

## Fixtures and Factories

**Test data factories** are plain functions returning literal objects, defined locally at the top of the spec file, layered from a base "member" builder up to full scenario snapshots:
```javascript
// src/lib/components/molecules/LobbyHostBar.svelte.spec.js:10-55 (abridged)
function member(overrides) {
	return { userId: null, guestId: null, displayName: '', isCaptain: false, isHost: false, ...overrides };
}
function bothCaptains() {
	return { phase: 'lobby', teams: { A: [member({...})], B: [member({...})] } };
}
function missingBCaptain() {
	const snap = bothCaptains();
	snap.teams.B = snap.teams.B.map((m) => ({ ...m, isCaptain: false }));
	return snap;
}
function makeProps(overrides = {}) {
	return { isHost: true, snapshot: bothCaptains(), onKick: vi.fn(), /* ... */ ...overrides };
}
```
- Every factory has a one-line JSDoc comment describing the scenario it represents, often citing the requirement it exists to test (`/** Roster where every member is the host → empty kick list. */`).
- `makeProps` (or an equivalent per-component prop factory) always spreads `...overrides` last so individual tests can override just the field they care about without repeating the whole shape.

**DOM query helpers** are also defined as small local functions rather than repeated inline queries, e.g. `consoleDialog()`, `visibleButtonNames()`, `startButtons()`, `openConsole()` (`src/lib/components/molecules/LobbyHostBar.svelte.spec.js:73-97`) — follow this pattern for any component spec with more than 2-3 similar DOM queries.

**Location:** No shared/global fixtures directory; all fixtures are private to their spec file. If a fixture becomes needed across multiple spec files, no existing convention covers extraction — decide deliberately whether to inline-duplicate (current norm) or create a shared test-utils module.

## Coverage

**Requirements:** None enforced. No coverage provider/config found in `vite.config.js` or `package.json`.

**View Coverage:** Not configured — `@vitest/coverage-v8`/`@vitest/coverage-istanbul` are not devDependencies. Running coverage would require adding a coverage provider first.

## Test Types

**Unit Tests:**
- Pure functions and server-layer logic tested in Node with mocked `db` — e.g. `src/lib/server/rooms.spec.js`, `src/lib/server/draft.spec.js`, `src/lib/server/room-lifecycle.spec.js`, `src/lib/join-parse.spec.js`, `src/lib/chat-filter.spec.js`, `src/lib/draft-script.spec.js`, `src/lib/catalog/classes.spec.js`.

**Component Tests:**
- Real-Chromium browser-mode rendering via `vitest-browser-svelte` + Playwright — e.g. `src/lib/components/molecules/LobbyHostBar.svelte.spec.js`, `src/lib/components/molecules/DraftReview.svelte.spec.js`, `src/lib/components/molecules/DraftSettingsPanel.svelte.spec.js`, `src/lib/components/atoms/CyModal.svelte.spec.js`, `src/lib/components/chrome/CyShell.svelte.spec.js`, `src/lib/components/effects/CyShader.svelte.spec.js`, `src/lib/components/effects/CyLogo.svelte.spec.js`, `src/lib/components/effects/cyTypedLog.svelte.spec.js`.
- These are functionally "integration" tests for the component tree (real DOM, real CSS cascade, real event dispatch) even though they're colocated like unit tests.

**Route/Load Tests:**
- SvelteKit `+page.server.js` load functions tested directly as plain async functions with a mocked `db`/`locals` — e.g. `src/routes/draft/[id]/page.server.spec.js`, `src/routes/login/page.server.spec.js`.

**Realtime/Live Handler Tests:**
- `src/live/draft.spec.js`, `src/live/room.spec.js`, `src/live/chat.spec.js` test the `svelte-realtime` RPC handlers (`live(async (ctx, ...) => ...)` functions) in Node.

**Cross-cutting / Phase Integration Specs:**
- `src/phase8-foundation.spec.js`, `src/phase10-screens.spec.js`, `src/phase11-fixes.spec.js` — broader specs tied to specific GSD implementation phases, verifying cross-module behavior/regressions rather than one module in isolation.

**Planned-but-not-implemented specs:**
- `src/lib/draft/__tests__/disconnect.test.js` and `src/lib/draft/__tests__/draftSnapshot.test.js` use `it.todo(...)` exclusively to pre-document expected behavior (disconnect/grace-period/captain-promotion flows) ahead of implementation — a "spec-first" stub pattern. When implementing a todo'd feature, replace the `it.todo` calls with real `it` bodies in the same file rather than creating a new spec file.

**E2E Tests:** Not used — no Playwright test runner config (`playwright.config.*`) beyond the Playwright provider used for Vitest browser-mode component tests.

## Common Patterns

**Async testing (rejection with a string-constant "error code"):**
```javascript
await expect(
	joinTeamForUser(db, { roomId: 'r1', userId: 'u-new', team: 'A' })
).rejects.toBe(TEAM_FULL);
```
(`src/lib/server/rooms.spec.js:320-322`) — because domain errors are thrown as bare string constants (see CONVENTIONS.md), assert with `.rejects.toBe(CONSTANT)`, not `.rejects.toThrow(...)`.

**Async testing (resolves to null):**
```javascript
await expect(getRoomByPublicCode(db, 'nope')).resolves.toBeNull();
```
(`src/lib/server/rooms.spec.js:111`)

**Partial-shape assertions on captured writes:**
```javascript
expect(capturedSet.value).toMatchObject({
	phase: 'drafting',
	draft_state: expect.objectContaining({ script: DEFAULT_SCRIPT, turnIndex: 0, timerMs: TIMER_MS })
});
expect(capturedSet.value.draft_state).toHaveProperty('turnEndsAt');
```
(`src/lib/server/rooms.spec.js:445-453`) — use `toMatchObject`/`toHaveProperty` rather than exact equality when a write payload includes a generated/time-based field (e.g. `turnEndsAt`, `ended_at`) whose exact value isn't the point of the assertion.

**Browser interaction + settling poll:**
```javascript
await userEvent.keyboard('{Escape}');
await expect.poll(() => consoleDialog().open).toBe(false);
expect(consoleDialog().checkVisibility()).toBe(false);
```
(`src/lib/components/molecules/LobbyHostBar.svelte.spec.js:234-238`) — use `expect.poll(...)` when a DOM state change depends on an animation/microtask rather than being synchronous with the triggering event.

---

*Testing analysis: 2026-09-19*
