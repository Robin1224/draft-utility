# Phase 02: Room & Lobby - Research

**Researched:** 2026-04-03  
**Domain:** Drizzle/Postgres room model, SvelteKit actions/load, svelte-realtime lobby sync & access control, short public codes  
**Confidence:** HIGH (stack patterns verified against `svelte-realtime` README + repo); MEDIUM (guest identity for kick/move, ROOM-08 expiry policy — discretion items)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Room links & IDs (discussed)**

- **D-01:** Use a **single URL pattern** `/draft/[id]` for the whole session: **lobby**, **drafting**, and **review** share the same route slug; in-app phase/state distinguishes behavior (aligns with existing `Create`/`Join` navigation to `/draft/...`).
- **D-02:** Public **`id`** in the URL is a **short shareable code** (target **6–8 characters**, unambiguous charset — exact alphabet and collision strategy: planner/research).
- **D-03:** **ROOM-07** — Provide a **copy-to-clipboard** control that copies the **full absolute URL** (built from `ORIGIN` or current request origin + path), not path-only.
- **D-04:** Home **Join** input accepts **both** a **bare code** (matches URL segment) **and** a **pasted full URL**; server or client parses out the room id/code.

**Lobby layout & phases (discussed)**

- **D-05:** Lobby shows **two columns**: **Team A | Team B** (clear side-by-side roster layout).
- **D-06:** Keep the **`Phases`** strip (**Lobby / Drafting / Review**) **visible on the lobby**; **Lobby** is the active phase; **Drafting** and **Review** are **disabled** (or non-clickable) until the app reaches those phases.
- **D-07:** **Spectators** are shown in a **collapsible** section (e.g. header **“Spectators (N)”** with expand/collapse), not an always-on tall list by default.
- **D-08:** **Host** is clearly labeled with a **“Host” badge** (or equivalent); **host-only** actions (**kick**, **move**, **start draft**) are **grouped** in a dedicated host control area (exact component split: Claude's discretion).

### Claude's Discretion

- **Join & guest flow (not deep-dived this session):** Implement ROOM-03/ROOM-04 per **REQUIREMENTS.md** and Phase 1 **guest vs player** WS rules; exact modals, empty states, and “sign in to join team” UX.
- **Host controls chrome (not deep-dived):** Placement of individual buttons, confirm dialogs for kick, disabled states when draft started — within D-08 grouping constraint.
- **Room lifecycle & cleanup (not deep-dived):** ROOM-08 — TTL for abandoned rooms, cron vs lazy expiry, cancel semantics; must satisfy “orphaned rooms do not persist indefinitely” with a concrete policy in plans.
- Short code **generation**, **DB uniqueness**, and **migration** from placeholder `/draft/create` — technical design in research/plan.
- **Realtime** topics and messages for lobby sync — follow `svelte-realtime` + `hooks.ws.js` patterns from Phase 1.

### Deferred Ideas (OUT OF SCOPE)

- **Gray areas not discussed this session** (may revisit before execute): dedicated **join/guest** onboarding copy, **host** confirmation modals, **ROOM-08** exact expiry policy — captured under Claude's Discretion above.
- **Out of phase:** Full **chat** (Phase 5), **draft engine** (Phase 3), **room settings** for order/timer (HOST-01 / Phase 3).

No new backlog capabilities proposed — discussion stayed within roadmap Phase 2.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ROOM-01 | Signed-in user can create a room; they become the non-transferable host | SvelteKit `actions` + Drizzle insert; `host_user_id` immutable; tie to Better Auth `session.user.id` |
| ROOM-02 | Any user can join a room via room ID or shareable link | `+page.server.js` `load` by public code; client/server parse bare code vs full URL (D-04) |
| ROOM-03 | Unauthenticated guests join as spectators (read-only) | `upgrade()` already returns `{ role: 'guest' }`; `live.stream` / `live.room` **`access`** predicates + RPC guards deny team actions for guests |
| ROOM-04 | Signed-in user can join a team (max 3 per side) | RPC `live()` with `LiveError` on full roster; persist membership in DB; publish roster updates |
| ROOM-05 | First signed-in player on a team becomes captain | Set `is_captain` (or derive from `joined_at` ordering) on first successful team join |
| ROOM-06 | Host can start draft when both teams have a captain | RPC checks `ctx.user.id === room.host_user_id`, room phase === lobby, captains exist on A and B |
| ROOM-07 | Host can copy shareable link from lobby | Build URL from `ORIGIN` / request URL; `navigator.clipboard` + a11y feedback per 02-UI-SPEC |
| ROOM-08 | Room cleans up / expires after draft ends or cancelled | DB status + `updated_at`; lazy delete/archival on read + optional `live.cron` or SvelteKit handler; scope “ended” vs “abandoned” in plan |
| HOST-02 | Host can kick any lobby member (player or spectator) | RPC + DB remove membership / banish connection; may need **stable guest identity** in `upgrade()` (see Pitfalls) |
| HOST-03 | Host can move players between teams before draft | RPC mutates `team` + captain rules; reject when `phase !== 'lobby'` |
</phase_requirements>

---

## Summary

Phase 2 is the first **domain-heavy** slice: persist **rooms** and **memberships** in Postgres via Drizzle, expose **create/join/load** through SvelteKit **`load` and `actions`**, and keep the lobby **authoritatively consistent** with **`svelte-realtime`** — either **`live.stream` with dynamic topics** per room (`(ctx, roomId) => 'lobby:' + roomId`) and `merge: 'set'` for a single snapshot document, or **`live.room()`** if you want bundled presence/actions (see [Rooms](https://github.com/lanteanio/svelte-realtime/blob/main/README.md#rooms) in the upstream README). Guest vs player enforcement belongs in **`access` on streams** and **`LiveError` in RPCs**, aligned with Phase 1’s `ctx.user.role`.

**Short codes (D-02):** Use **`nanoid` `customAlphabet`** (or `crypto` + a fixed alphabet) to generate 6–8 character codes; store **`public_code` UNIQUE`** on `room`; **retry on unique violation** on insert. Parse join input by stripping path to the last segment when the string looks like a URL.

**Primary recommendation:** Implement **`src/live/room.js`** (name at planner discretion) with a **dynamic-topic lobby snapshot stream** readable by guests and players, plus **narrow RPCs** for join-team, start-draft, kick, and move-player; keep **all invariants server-side** (team size, captains, host-only, phase gates).

---

## Project Constraints (from .cursor/rules/)

**`.cursor/rules/`:** Not present in this workspace.

**Workspace rules (AGENTS.md / CLAUDE.md):** Use the **Svelte MCP** flow for Svelte work (`list-sections` → `get-documentation` → `svelte-autofixer` until clean). Stack is **JavaScript + JSDoc**, **npm**, **Svelte 5**, **SvelteKit**, **Vitest**.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `drizzle-orm` | ^0.45.1 (npm latest **0.45.2** as of 2026-04-03) | Schema + queries for `room`, memberships | Already used with Neon |
| `@neondatabase/serverless` | ^1.0.2 | Postgres over HTTP | Existing `db` in `$lib/server/db` |
| `better-auth` | ~1.4.21 | Session user id for host/players | `auth.api.getSession` in HTTP + `hooks.ws.js` |
| `svelte-realtime` | **0.4.6** (installed in `node_modules`) | `live()`, `live.stream()`, `ctx.publish`, `createTestEnv` | Project already wired via `vite.config.js`, `hooks.ws.js` |
| `svelte-adapter-uws` | (paired with realtime) | WS upgrade + HTTP | `svelte.config.js` |
| `@sveltejs/kit` | ^2.50.2 | `load`, `actions`, routing | Existing pattern |
| `nanoid` | **5.1.7** (npm latest as of 2026-04-03) | Short collision-resistant codes | `customAlphabet` for D-02 charset |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | ^4.1.0 | Unit + project split | Server tests + `svelte-realtime/test` |
| `@vitest/browser-playwright` | ^4.1.0 | Svelte component tests | UI molecules if needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `nanoid` | `crypto.randomBytes` + base32url | Slightly more code; no extra dependency |
| `live.stream` per room | `live.room()` | Room API bundles presence/actions; more opinionated; good if you want `.hooks` export |
| Push-only patches | Full snapshot `merge: 'set'` | Snapshot simpler for small lobby payload; CRUD merge if roster is large list |

**Installation (if `nanoid` not yet in package.json):**

```bash
npm install nanoid
```

**Version verification (run before plan lock):**

```bash
npm view drizzle-orm version
npm view nanoid version
npm view svelte-realtime version
```

> **Note:** Root `package.json` in the repo snapshot lists only `devDependencies`; runtime packages such as `svelte-realtime` / `svelte-adapter-uws` are present under `node_modules` and in Vite/Svelte config. **Planner should ensure `package.json`/`package-lock.json` explicitly list** all production dependencies so CI and fresh installs match dev.

---

## Architecture Patterns

### Recommended project structure

```
src/
├── hooks.ws.js              # upgrade + re-export message (Phase 1); Phase 2: optional live.room .hooks
├── live/
│   └── room.js              # lobby stream + RPCs (new)
├── lib/server/
│   └── db/schema.js         # room + room_member (or equivalent) tables
├── routes/
│   ├── +page.svelte         # Home: Create / Join
│   └── draft/[id]/
│       ├── +page.svelte     # Lobby UI
│       └── +page.server.js  # load room by public code; actions: create (if not only WS)
```

### Pattern 1: Dynamic topic lobby stream (guest-readable)

**What:** One stream per room id; initial load returns authoritative roster + phase; updates via `ctx.publish` on mutations.  
**When to use:** Default for `/draft/[id]` — matches README **Dynamic topics** section.

```js
// Conceptual — Source: svelte-realtime README "Dynamic topics"
import { live, LiveError } from 'svelte-realtime/server';

export const lobby = live.stream(
	(ctx, roomId) => 'lobby:' + roomId,
	async (ctx, roomId) => {
		// load snapshot from DB; verify room exists
		return await loadLobbySnapshot(roomId);
	},
	{
		merge: 'set',
		access: (ctx) => {
			// Guests and players may subscribe; optional: deny if banned
			return true;
		}
	}
);
```

### Pattern 2: Access control for player-only RPCs

**What:** Throw `LiveError` if `ctx.user.role !== 'player'` or missing `ctx.user.id` for join-team / start-draft.  
**When to use:** ROOM-04, ROOM-06, host actions that require auth.

```js
// Source: svelte-realtime README — LiveError + live() RPC pattern
export const joinTeam = live(async (ctx, roomId, team) => {
	if (ctx.user?.role !== 'player' || !ctx.user?.id) {
		throw new LiveError('UNAUTHORIZED', 'Sign in to join a team');
	}
	// ... DB transaction, cap 3 per team, assign captain, ctx.publish
});
```

### Pattern 3: Host-only mutations

**What:** Load room by `roomId`, compare `host_user_id` to `ctx.user.id`; reject otherwise.  
**When to use:** HOST-02, HOST-03, ROOM-06 start draft.

### Pattern 4: HTTP create room

**What:** `+page.server.js` `actions.createRoom` or dedicated route — insert row with `public_code`, `host_user_id`, `phase: 'lobby'`; `redirect` to `resolve('/draft/[id]')` with code.  
**When to use:** ROOM-01; replaces placeholder `/draft/create` navigation.

### Anti-patterns to avoid

- **Client-only roster:** Teams/captains/host must not be source of truth in `$state` without server reconciliation.
- **Rejecting guest WebSocket upgrades:** Violates D-12 / ROOM-03; guests must connect and subscribe read-only.
- **Transferable host:** Explicitly out of scope per REQUIREMENTS.md — do not add host transfer APIs.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WS message routing | Custom frame protocol | `export { message }` + `live()` / `live.stream()` | Wire format, subscription lifecycle, and client stubs are built-in |
| Clipboard robustness (future) | Complex fallbacks in v1 | `navigator.clipboard.writeText` + visible errors | UI-SPEC allows simple inline “Copied” for v1 |
| Cron in multi-node (later) | Assume single-server cron is enough | Document; use `live.cron` from README or external scheduler when scaling | README documents clustering/cron — v1 can stay single-node |

**Key insight:** Lobby sync is exactly the problem **`live.stream` + `ctx.publish`** solves; avoid parallel SSE or polling unless profiling demands it.

---

## Common Pitfalls

### Pitfall 1: Guests have no stable `id` for kick (HOST-02)

**What goes wrong:** `upgrade()` returns `{ role: 'guest' }` only — host cannot target “which spectator” to kick.  
**Why it happens:** Phase 1 optimized for allow-all upgrades, not lobby identity.  
**How to avoid:** Extend guest `userData` with a **persistent `guestId`** (e.g. UUID in HttpOnly cookie set on first visit, or returned once per tab and stored client-side) so kick RPC references `guestId` or `connectionKey`.  
**Warning signs:** Kick only works for authenticated users.

### Pitfall 2: `ctx.publish` topic mismatch

**What goes wrong:** RPC publishes to `'lobby:' + id` but stream topic uses different casing or prefix.  
**Why it happens:** Dynamic topic functions must match publish string exactly.  
**How to avoid:** Centralize `topicForRoom(id)` helper in `src/live/room.js`.  
**Warning signs:** RPC succeeds but UI never updates.

### Pitfall 3: Race on “join team” at capacity

**What goes wrong:** Two clients pass “3 players” check concurrently.  
**Why it happens:** Non-atomic read-modify-write.  
**How to avoid:** DB **unique partial index** or **transaction** with `SELECT … FOR UPDATE` on room row (Postgres).  
**Warning signs:** Intermittent fourth player on a team.

### Pitfall 4: Start draft without captains

**What goes wrong:** UI disabled but RPC not checked.  
**Why it happens:** Client-only gating.  
**How to avoid:** Repeat ROOM-06 rules in `startDraft` RPC.  
**Warning signs:** UAT finds bypass via devtools / replay.

### Pitfall 5: ROOM-08 undefined lifecycle

**What goes wrong:** Rows accumulate forever.  
**Why it happens:** No TTL or terminal state cleanup.  
**How to avoid:** Planner picks one: **soft-delete** `ended_at` + periodic purge; **lazy purge** when loading old codes; **`live.cron`** for abandoned lobby TTL. Document in PLAN.  
**Warning signs:** Neon table growth; stale codes still “joinable.”

---

## Code Examples

### Short code generation (nanoid)

```js
// Source: nanoid README pattern — verify alphabet with product (no I/l/O/0 if desired)
import { customAlphabet } from 'nanoid';

const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
export const roomCode = customAlphabet(alphabet, 7);
```

### svelte-realtime test harness (Vitest)

```js
// Source: svelte-realtime README "Testing"
import { describe, it, expect, afterEach } from 'vitest';
import { createTestEnv } from 'svelte-realtime/test';
import * as room from '../src/live/room.js';

describe('room live', () => {
	const env = createTestEnv();
	afterEach(() => env.cleanup());

	it('host can start draft when captains ready', async () => {
		env.register('room', room);
		const host = env.connect({ id: 'h1', name: 'Host', role: 'player' });
		// await host.call('room/startDraft', roomId)
	});
});
```

### Parse join input (URL or bare code)

```js
/** @param {string} raw */
export function parseRoomCode(raw) {
	const trimmed = raw.trim();
	try {
		const u = new URL(trimmed);
		const parts = u.pathname.split('/').filter(Boolean);
		const draftIdx = parts.indexOf('draft');
		if (draftIdx >= 0 && parts[draftIdx + 1]) return parts[draftIdx + 1];
	} catch {
		// not a full URL
	}
	return trimmed;
}
```

---

## State of the Art

| Old Approach | Current Approach | When | Impact |
|--------------|------------------|------|--------|
| Polling lobby | `live.stream` + publish | svelte-realtime 0.4.x | Lower latency, less load |
| Monolithic “game server” | Room-scoped dynamic topics | Same | Clear isolation per room |

**Deprecated/outdated:** None identified for this phase within the chosen stack.

---

## Open Questions

1. **Exact charset for D-02**  
   - *What we know:* 6–8 chars, unambiguous.  
   - *Gap:* Exclude homoglyphs?  
   - *Recommendation:* Use README-style alphabet; document in PLAN.

2. **Guest identity storage**  
   - *What we know:* Kick needs a target.  
   - *Gap:* Cookie vs DB row for spectators.  
   - *Recommendation:* Cookie-backed `guestId` in `upgrade()` + optional `spectator` row keyed by `guestId`.

3. **ROOM-08 “cancelled” vs “ended”**  
   - *What we know:* Both trigger cleanup per requirement.  
   - *Gap:* Who can cancel before draft?  
   - *Recommendation:* Host-only cancel in lobby; `ended_at` timestamp; TTL for abandoned `lobby`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | SvelteKit, Vitest, uWS | ✓ | v24.13.0 (probe) | — |
| npm | installs | ✓ | 11.6.2 | — |
| `DATABASE_URL` | Drizzle, room CRUD | ✓ in dev if `.env` set | — | Local Postgres or skip E2E |
| Playwright | Vitest browser project | ✓ if `npx playwright install` run | ^1.58.2 | Run `server` project only |
| Multi-client WS | Realtime UAT | Manual or `createTestEnv` | — | Automated via `svelte-realtime/test` |

**Missing dependencies with no fallback:**

- None for **implementation** beyond standard env vars.

**Missing dependencies with fallback:**

- Playwright browsers missing → run `npm run test -- --project server`.

**Step 2.6 note:** External realtime **load testing** is optional for Phase 2; **correctness** is covered by DB tests + `createTestEnv`.

---

## Validation Architecture

> Nyquist enabled (`workflow.nyquist_validation: true` in `.planning/config.json`).

### Test framework

| Property | Value |
|----------|-------|
| Framework | Vitest **^4.1.0** (`vitest/config` via `vite.config.js`) |
| Config file | `vite.config.js` → `test.projects` |
| Quick run command | `npm run test:unit -- --run --project server` |
| Full suite command | `npm run test` (runs all Vitest projects with `--run`) |

**Projects:**

- **`server`** — `environment: 'node'`, includes `src/**/*.{test,spec}.{js,ts}` **excluding** `*.svelte.spec.*`
- **`client`** — Playwright browser, includes `src/**/*.svelte.{test,spec}.{js,ts}`

### Phase requirements → test map

| Req ID | Behavior | Test type | Automated command | File / notes |
|--------|----------|-----------|-------------------|--------------|
| ROOM-01 | Create room; creator is host | Unit / integration | `npm run test:unit -- --run src/lib/server/room*.spec.js` (Wave 0: create file) | Mock `db` or test DB; assert `host_user_id` |
| ROOM-02 | Resolve room by code / URL parse | Unit | `npm run test:unit -- --run src/lib/server/join-parse.spec.js` | Pure `parseRoomCode` |
| ROOM-03 | Guest cannot join team | Unit (live RPC) | `npm run test:unit -- --run src/live/room.spec.js` | `createTestEnv`; guest `connect({ role: 'guest' })` → expect `LiveError` / forbidden |
| ROOM-04 | Cap 3 per team | Unit (live or DB) | Same | Two paths: transactional test on server module **or** `createTestEnv` sequence |
| ROOM-05 | First joiner is captain | Unit | Same | Assert captain flag after first `joinTeam` |
| ROOM-06 | Start draft only with two captains; host-only | Unit (live) | Same | Player non-host call fails; host succeeds when valid |
| ROOM-07 | (UI) copy full URL | **Manual UAT** or browser test | Optional: Svelte component test with clipboard mock | Clipboard API unreliable in node; prefer **manual** or Playwright |
| ROOM-08 | Expiry / cleanup | Unit | `npm run test:unit -- --run src/lib/server/room-expiry.spec.js` | Pure functions: `shouldPurgeRoom(state, now)` + integration with cron handler if added |
| HOST-02 | Kick removes member | Unit (live) | `src/live/room.spec.js` | Host kicks `guestId` / user id; stream snapshot updates |
| HOST-03 | Move before draft only | Unit (live) | Same | After `startDraft` (or phase flip), `movePlayer` throws |

### Realtime: manual vs automated

| Layer | Recommendation | Rationale |
|-------|----------------|-----------|
| **RPC + stream logic** | **Automated** with `createTestEnv()` from `svelte-realtime/test` | Official pattern; no real WebSocket server; multi-client `connect()` + `subscribe()` + `call()` |
| **Full browser WS + OAuth cookies** | **Manual UAT** (or later E2E) | Better Auth + uWS upgrade in CI is heavy; Phase 1 already accepted dev-proven transport |
| **Lobby UI wiring** | **Browser project** optional | Use for `Phases` / collapsible spectators if regressions feared; not required for every task |

### Sampling rate

- **Per task commit:** `npm run test:unit -- --run --project server` (fast).
- **Per wave merge:** `npm run test` (full Vitest projects).
- **Phase gate:** Full suite green before `/gsd-verify-work`; plus **human UAT** for clipboard (ROOM-07) and guest spectator experience (ROOM-03).

### Wave 0 gaps

- [ ] `src/lib/server/join-parse.spec.js` — ROOM-02 URL/code parsing
- [ ] `src/live/room.spec.js` — `createTestEnv` coverage for host/guest/player matrix
- [ ] Room DB helpers or `+page.server` action tests — ROOM-01
- [ ] Document **manual** steps for ROOM-07 in `02-HUMAN-UAT.md` when created

---

## Sources

### Primary (HIGH confidence)

- `node_modules/svelte-realtime/README.md` — dynamic topics, access control, rooms, testing (`createTestEnv`)
- https://github.com/lanteanio/svelte-realtime — README parity
- `src/hooks.ws.js` — guest vs player upgrade contract
- `vite.config.js` — Vitest multi-project setup

### Secondary (MEDIUM confidence)

- `npm view` registry versions (2026-04-03) for `drizzle-orm`, `nanoid`, `svelte-realtime`
- `.planning/phases/01-auth-realtime-transport/01-RESEARCH.md` — adapter + hooks patterns

### Tertiary (LOW confidence)

- None critical; guest cookie design needs implementation validation.

---

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** — matches installed README and repo wiring
- Architecture: **HIGH** — aligns with svelte-realtime documented APIs
- Pitfalls: **MEDIUM-HIGH** — guest kick identity is the main design risk

**Research date:** 2026-04-03  
**Valid until:** ~2026-05-03 (re-check `svelte-realtime` on minor bumps)
