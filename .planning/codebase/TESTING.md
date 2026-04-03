# Testing Patterns

**Analysis Date:** 2026-04-03

## Test Framework

**Runner:**

- Vitest `^4.1.0` with config embedded in `vite.config.js` (import `defineConfig` from `vitest/config`).

**Assertion library:**

- Vitest built-in `expect` with `requireAssertions: true` enabled in `vite.config.js` test config.

**Browser provider:**

- `@vitest/browser-playwright` with Playwright `chromium`, headless.

**Run commands (from `package.json`):**

```bash
npm run test:unit              # Vitest (watch / default TTY behavior)
npm run test                   # Vitest single run: npm run test:unit -- --run
```

**Typecheck (not unit tests):**

```bash
npm run check                  # svelte-check + sync
```

## Test File Organization

**Location:**

- Example tests live under `src/lib/vitest-examples/` co-located with `greet.js`, `Welcome.svelte`.

**Naming:**

- Server / Node project: `*.spec.js` or `*.test.js` (and `.ts` if added) anywhere under `src/` except the Svelte browser pattern below.
- Client / browser project: `*.svelte.spec.js` or `*.svelte.test.js` (and `.ts` variants).

**Structure:**

```
src/lib/vitest-examples/
├── greet.js
├── greet.spec.js
├── Welcome.svelte
└── Welcome.svelte.spec.js
```

## Vitest Projects (critical)

Configuration in `vite.config.js` uses two **projects**:

**1. `client` (browser):**

- `browser.enabled: true`, Playwright Chromium.
- `include`: `src/**/*.svelte.{test,spec}.{js,ts}`.
- `exclude`: `src/lib/server/**` (server tree not run in browser).

**2. `server` (Node):**

- `environment: 'node'`.
- `include`: `src/**/*.{test,spec}.{js,ts}`.
- `exclude`: `src/**/*.svelte.{test,spec}.{js,ts}` (those run only in the client project).

**Prescriptive rule for new tests:**

- Pure JS/TS unit tests: name `something.spec.js` (not `*.svelte.spec.js`) so they run in the Node project.
- Svelte component tests needing DOM: name `Component.svelte.spec.js` and use `vitest-browser-svelte` + `vitest/browser` APIs.

## Test Structure

**Suite organization (server example from `src/lib/vitest-examples/greet.spec.js`):**

```javascript
import { describe, it, expect } from 'vitest';
import { greet } from './greet';

describe('greet', () => {
	it('returns a greeting', () => {
		expect(greet('Svelte')).toBe('Hello, Svelte!');
	});
});
```

**Svelte browser example (`src/lib/vitest-examples/Welcome.svelte.spec.js`):**

```javascript
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Welcome from './Welcome.svelte';

describe('Welcome.svelte', () => {
	it('renders greetings for host and guest', async () => {
		render(Welcome, { host: 'SvelteKit', guest: 'Vitest' });

		await expect
			.element(page.getByRole('heading', { level: 1 }))
			.toHaveTextContent('Hello, SvelteKit!');
		await expect.element(page.getByText('Hello, Vitest!')).toBeInTheDocument();
	});
});
```

**Patterns:**

- `describe` / `it` for grouping.
- Async tests for browser assertions that need `await expect.element(...)`.

## Mocking

**Framework:** Vitest (`vi` available); no `vi.mock` usage in current tests.

**Patterns:** Not established in-repo; when mocking, follow Vitest docs and prefer explicit `vi.mock` / `vi.spyOn` in `*.spec.js` files.

**What to mock:** External HTTP, database, and auth in server tests; avoid mocking Svelte itself in component tests—use `vitest-browser-svelte` `render`.

**What NOT to mock:** Simple pure functions under test (see `greet`).

## Fixtures and Factories

**Test data:** Inline literals in existing specs (e.g. `'Svelte'`, `'Vitest'`).

**Location:** No shared `fixtures/` or factory modules yet; add under `src/lib/` or a dedicated `src/test/` if the suite grows.

## Coverage

**Requirements:** No coverage threshold or `coverage` script in `package.json` at analysis time.

**To add coverage:** extend `vite.config.js` `test.coverage` per Vitest docs and add a script, e.g. `vitest run --coverage`.

## Test Types

**Unit tests:**

- In scope: small pure modules in Node project — pattern in `greet.spec.js`.

**Component / UI tests:**

- In scope: Svelte components via browser project — pattern in `Welcome.svelte.spec.js` with Playwright-backed `page` queries.

**Integration tests:**

- Not present; server modules like `src/lib/server/db/index.js` and auth are untested by current specs.

**E2E tests:**

- Not a separate Playwright test suite; browser-mode Vitest covers component-level checks only.

## Common Patterns

**Async testing:**

- Use `async` `it` and `await` on `expect.element` chains in `.svelte.spec.js` files.

**Error testing:**

- No examples yet; use `expect(() => ...).toThrow()` in Node project for synchronous throws, or `await expect(promise).rejects...` for async.

---

*Testing analysis: 2026-04-03*
