# Phase 12: Access Control & Secondary Screens - Pattern Map

**Mapped:** 2026-09-04
**Files analyzed:** 26 (11 created, 15 modified)
**Analogs found:** 24 / 26 (2 have no analog — see § No Analog Found)

> **Line numbers in this document were re-verified against disk on 2026-09-04.** Every ref below
> resolves. Three corrections to upstream docs are recorded in § Upstream Ref Corrections — read
> that section before planning the `+layout.svelte` and copy-pattern tasks.

---

## File Classification

### Files to CREATE

| New File | Role | Data Flow | Closest Analog | Match |
|----------|------|-----------|----------------|-------|
| `src/lib/components/molecules/CyConnecting.svelte` | component (presentational) | timer-driven render | `src/lib/components/molecules/PauseOverlay.svelte` | exact |
| `src/lib/components/molecules/CyGuestGate.svelte` | component (presentational) | request-response (callback) | `PauseOverlay.svelte` (card) + `LoginCard.svelte` (Discord CTA) | role-match |
| `src/lib/components/molecules/CyCancelled.svelte` | component (presentational) | terminal render + clipboard I/O | `PauseOverlay.svelte` (card+`<pre>`) + `+page.svelte:73-86,300-305` (copy) | role-match |
| `src/lib/components/molecules/CyConnecting.svelte.spec.js` | test (browser/`client`) | DOM assertions | `src/lib/components/molecules/LobbyHostBar.svelte.spec.js` | exact |
| `src/lib/components/molecules/CyGuestGate.svelte.spec.js` | test (browser/`client`) | DOM assertions | `LobbyHostBar.svelte.spec.js` | exact |
| `src/lib/components/molecules/CyCancelled.svelte.spec.js` | test (browser/`client`) | DOM assertions | `LobbyHostBar.svelte.spec.js` | exact |
| `src/phase12-access-screens.spec.js` | test (node/`server`) | file-read source/CSS contract | `src/phase10-screens.spec.js` (CSS) + `src/phase11-fixes.spec.js` (source regex) | exact |
| `drizzle/0002_add_room_is_public.sql` | migration | DDL | `drizzle/0001_milky_selene.sql` | exact |
| `drizzle/meta/0002_snapshot.json` | migration meta | generated | `drizzle/meta/0001_snapshot.json` | exact (generated — never hand-write) |
| `setRoomVisibilityAsHost` (new export in `src/lib/server/rooms.js`) | service | CRUD (single-row update) | `cancelRoomAsHost` (`rooms.js:494-509`) | exact |
| `removeGuestSpectators` (new export in `src/lib/server/rooms.js`) | service | CRUD (bulk delete) | `kickMember`'s delete (`rooms.js:355-358`) | role-match |
| `setRoomVisibility` (new RPC in `src/live/room.js`) | controller (live RPC) | pub-sub mutation | `movePlayer` (`room.js:261-293`) | exact |
| `connectLines(code)` helper (in `CyConnecting.svelte` or effects module) | utility | pure data | `CY_BOOT_LINES` (`cyTypedLog.svelte.js:27-34`) | exact |

### Files to MODIFY

| File | Role | Data Flow | In-file Analog for the New Code | Match |
|------|------|-----------|---------------------------------|-------|
| `src/lib/server/db/schema.js` | model | schema DDL | `room.draft_state` (`:29`, added by `0001`) | exact |
| `src/lib/server/rooms.js` | service | CRUD | `loadLobbySnapshot` return (`:200-207`); `assertHost` (`:128`) | exact |
| `src/live/room.js` | controller (live) | pub-sub | `movePlayer` (`:261-293`); `disconnectGraceExpired` (`:102-109`) | exact |
| `src/live/chat.js` | controller (live stream) | pub-sub | `chatTeamA`'s throw-guard (`:140`, `:145`) | exact |
| `src/routes/draft/[id]/+page.server.js` | route loader | request-response | its own `base`/`review` branch (`:15-34`) | exact |
| `src/routes/draft/[id]/+page.svelte` | page (composition root) | request-response + stream | its own `{#if}` chain (`:254-398`) | exact |
| `src/routes/+layout.svelte` | layout/provider | stream subscribe | its own `snap` derive (`:17`) | exact |
| `src/lib/components/molecules/LobbyHostBar.svelte` | component | request-response (callback) | its own `move_player` `.cy-hc-section` (`:119-145`) | exact |
| `src/lib/components/molecules/DraftBoard.svelte` | component | (deletion only) | — | n/a |
| `src/app.css` | config (styles) | — | `.cy-pause*` block (`:698-708`) | exact |
| `src/phase10-screens.spec.js` | test (node) | file-read contract | its own scope-guard describe (`:83-93`) | exact |
| `src/live/room.spec.js` | test (node) | `createTestEnv` | its own guest-subscribe test (`:259-271`) | exact |
| `src/lib/server/rooms.spec.js` | test (node) | fake-db | `getRoomByPublicCode` fake db (`:102-133`) | exact |
| `src/routes/draft/[id]/page.server.spec.js` | test (node) | `vi.mock` + `makeEvent` | its own `makeEvent` matrix (`:19-40`) | exact |
| `src/lib/components/molecules/LobbyHostBar.svelte.spec.js` | test (browser) | DOM assertions | its own `move_player` EXEC test (`:145-158`) | exact |

---

## Upstream Ref Corrections

Three refs in CONTEXT.md / UI-SPEC.md do not resolve as written. Planner must use the corrected form.

| Upstream claim | Reality on disk | Impact |
|----------------|-----------------|--------|
| CONTEXT.md fence item #5 and RESEARCH §Summary both say **`src/routes/draft/[id]/+layout.svelte`** in places | **That file does not exist.** `ls src/routes/draft/[id]/` → `+page.server.js`, `+page.svelte`, `page.server.spec.js` only. The shared `lobby(code)` subscription lives in the **root** layout: `src/routes/+layout.svelte:17` | The D-19 subscription gate must edit `src/routes/+layout.svelte`. Do **not** create a route-level layout — that would add a *second* subscriber and re-open the refcount leak Pattern 5 exists to close. RESEARCH §Recommended file layout (`:616`) and §Pattern 5 (`:675`) already have this right |
| UI-SPEC §Component Contract 3 cites the copy pattern at `+page.svelte:298-306` | The `copyLink()` **function** is at `:73-86` (correct in CONTEXT). Its **review-screen usage** is `:300-305` (button `:300-302`, `{#if copied}` status `:303-305`) | Cosmetic; cite `:73-86` + `:300-305` |
| RESEARCH §Investigation 9 shows the scope guard at `:83-93` with assertions at `:85-87` | ✓ Correct, verified byte-for-byte. The `it` to delete spans `:84-88`; the DS-04 `it` to keep spans `:90-92` | none |

Also verified absent from `src/app.css` (so all are genuinely new, not accidental re-ports):
`.cy-sr-only`, `.cy-403`, `.cy-sig`, `.cy-ok`, `.cy-wait`, `cy-loading`, `cy-gate`, `cy-cancel`, **and `.cy-draft-cancelled`** — DraftBoard's cancelled branch (`:121-129`) has been rendering unstyled since Phase 10, which independently confirms Pitfall 10's "dead code" reading.

---

## Pattern Assignments

### 1. `src/live/room.js` — new `setRoomVisibility` RPC (controller, pub-sub)

**Analog:** `src/live/room.js:261-293` (`movePlayer`) — same file, adjacent function. Copy its skeleton verbatim and swap the payload validation + DB call.

**Full analog body** (`room.js:261-293`) — this is the complete shape `setRoomVisibility` must replicate:

```js
export const movePlayer = live(async (ctx, publicCode, payload) => {
	if (ctx.user?.role !== 'player' || !ctx.user?.id) {
		throw new LiveError('UNAUTHORIZED', 'Sign in required');
	}
	const code = normalizePublicCode(publicCode);
	const roomRow = await getRoomByPublicCode(db, code);
	if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');
	if (roomRow.host_user_id !== ctx.user.id) {
		throw new LiveError('FORBIDDEN', 'Host only');
	}
	const p = payload && typeof payload === 'object' ? payload : {};
	if (p.toTeam !== 'A' && p.toTeam !== 'B') {
		throw new LiveError('VALIDATION', 'Invalid team');
	}
	if (!p.userId || typeof p.userId !== 'string') {
		throw new LiveError('VALIDATION', 'userId required');
	}
	try {
		await movePlayerDb(db, {
			roomId: roomRow.id,
			hostUserId: ctx.user.id,
			userId: p.userId,
			toTeam: p.toTeam
		});
	} catch (e) {
		const mapped = mapRoomMutationError(e);
		if (mapped) throw mapped;
		throw e;
	}
	const snap = await loadLobbySnapshot(db, code);
	ctx.publish(topicForRoom(code), 'set', snap);
	return snap;
});
```

Load-bearing details to preserve:
- **Host check is inline**, not via `assertHost` — `roomRow.host_user_id !== ctx.user.id` → `LiveError('FORBIDDEN', 'Host only')`. All four sibling RPCs do it this way (`:236-238`, `:268-270`, `:302-304`, `:355-357`). `assertHost` (`rooms.js:128`) is used only inside the `rooms.js` helpers, which throw the `NOT_HOST` string sentinel that `mapRoomMutationError` translates.
- **`mapRoomMutationError` wraps only the DB call**, never the validation.
- **Signature is positional**, not a payload object, for scalar args: `movePlayer` takes `payload`, but `joinTeam` (`:207`) takes `(ctx, publicCode, team)`. UI-SPEC's callback contract is `onSetVisibility(next: boolean)` → use `setRoomVisibility(code, isPublic)` positional, matching `joinTeam`.
- **`ctx.publish(topicForRoom(code), 'set', snap); return snap;`** is the closing couplet in all five mutations (`:225-226`, `:257-258`, `:291-292`, `:344-345`, `:367-368`).

**Error-mapping table to extend** (`room.js:33-60`) — the sentinel→`LiveError` switch. `setRoomVisibility` needs **no** new sentinel if the DB helper only throws `NOT_HOST`:

```js
/** @param {unknown} e */
function mapRoomMutationError(e) {
	if (e === NOT_HOST) {
		return new LiveError('FORBIDDEN', 'Host only');
	}
	// … KICK_TARGET_MISSING, INVALID_KICK_TARGET, LOBBY_PHASE_REQUIRED,
	//    DRAFT_NOT_READY, PLAYER_NOT_ON_TEAM, TEAM_FULL …
	if (e instanceof Error && e.message === 'ROOM_NOT_FOUND') {
		return new LiveError('NOT_FOUND', 'Room not found');
	}
	return null;
}
```

**UI-SPEC copy override:** UI-SPEC §Copywriting requires the thrown messages to be **`'Not the host'`** (FORBIDDEN) and **`'Sign in to change room visibility'`** (UNAUTHORIZED), *not* the analog's `'Host only'` / `'Sign in required'`. That means the FORBIDDEN throw must be the **inline** one (as in the analog), because the shared `mapRoomMutationError` path would emit `'Host only'` and is frozen for the other four RPCs. Do not edit `mapRoomMutationError`.

**Import block to extend** (`room.js:6-26`) — barrel import from `$lib/server/rooms.js`, alphabetically sorted, sentinels first then functions:

```js
import {
	DRAFT_NOT_READY,
	INVALID_KICK_TARGET,
	KICK_TARGET_MISSING,
	LOBBY_PHASE_REQUIRED,
	NOT_HOST,
	PLAYER_NOT_ON_TEAM,
	TEAM_FULL,
	cancelDraftNoCaption,
	cancelRoomAsHost,
	getRoomByPublicCode,
	joinTeamForUser,
	kickMember as kickMemberDb,
	loadLobbySnapshot,
	movePlayer as movePlayerDb,
	promoteCaptain,
	startDraftIfReady,
	startDraftWithSettings,
	topicForRoom,
	upsertGuestSpectator
} from '$lib/server/rooms.js';
```

Add `removeGuestSpectators` and `setRoomVisibilityAsHost` into the alphabetical function run (after `promoteCaptain` / before `startDraftIfReady`, and after `movePlayer as movePlayerDb` respectively). Note `room.js:1` carries `// @ts-nocheck` — no JSDoc typing burden on new code in this file.

---

### 2. `src/live/room.js` — the `cancelRoom` load-before-cancel fix (SCR-02 blocker)

**Analog:** `src/live/room.js:102-109` (`disconnectGraceExpired`'s else-branch). RESEARCH identified this as the *exact* precedent. Copy the ordering **and the comment**:

```js
	} else {
		// DISC-03: no eligible member — cancel draft
		// Load snapshot BEFORE cancellation: getRoomByPublicCode hides rooms once ended_at is set
		clearRoomTimer(roomRow.id);
		const snapBeforeCancel = await loadDraftSnapshot(db, code);
		await cancelDraftNoCaption(db, roomRow.id);
		if (snapBeforeCancel) publish(topicForRoom(code), 'set', { ...snapBeforeCancel, phase: 'cancelled' });
	}
```

**Code being replaced** (`room.js:348-369`, `cancelRoom`) — note the snapshot load at `:366` is *after* `cancelRoomAsHost` at `:360`, which is the `null`-publish bug:

```js
export const cancelRoom = live(async (ctx, publicCode) => {
	if (ctx.user?.role !== 'player' || !ctx.user?.id) {
		throw new LiveError('UNAUTHORIZED', 'Sign in required');
	}
	const code = normalizePublicCode(publicCode);
	const roomRow = await getRoomByPublicCode(db, code);
	if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');
	if (roomRow.host_user_id !== ctx.user.id) {
		throw new LiveError('FORBIDDEN', 'Host only');
	}
	clearRoomTimer(roomRow.id); // Cancel draft timer if active (prevents stale timer firing after room ends)
	try {
		await cancelRoomAsHost(db, { roomId: roomRow.id, hostUserId: ctx.user.id });
	} catch (e) {
		const mapped = mapRoomMutationError(e);
		if (mapped) throw mapped;
		throw e;
	}
	const snap = await loadLobbySnapshot(db, code);   // ← :366 returns null (row now hidden)
	ctx.publish(topicForRoom(code), 'set', snap);      // ← :367 publishes null
	return snap;
});
```

Both publish sites gain `cancelReason`; the grace site at `:108` gains `cancelReason: 'grace'`, the host site gains `cancelReason: 'host'`. **Do not change `cancelRoomAsHost`'s DB write** (`rooms.js:504` writes `phase: 'ended'`; asserted by `rooms.spec.js` and `room-lifecycle.spec.js`) — override `phase` in the *published payload* only, exactly as the grace path already does at `:108`.

---

### 3. `src/live/room.js` — the `lobby` stream guard (ACC-03 / D-01)

**Analog:** `src/live/chat.js:137-150` (`chatTeamA`) — the only existing throwing authorization guard inside a `live.stream` init. Same `throw new LiveError('FORBIDDEN', …)` idiom, checked before any write:

```js
export const chatTeamA = live.stream(
	(ctx, publicCode) => chatTopic(normalizePublicCode(publicCode), 'teamA'),
	async (ctx, publicCode) => {
		if (ctx.user?.role !== 'player') throw new LiveError('FORBIDDEN', 'Players only');
		const code = normalizePublicCode(publicCode);
		const roomRow = await getRoomByPublicCode(db, code);
		if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');
		await cachePlayerTeam(ctx, roomRow.id);
		if (ctx.user.chatTeam !== 'A') throw new LiveError('FORBIDDEN', 'Team A players only');
		const topic = chatTopic(code, 'teamA');
		return { messages: messageStore.get(topic) ?? [] };
	},
	{ merge: 'set', access: () => true }
);
```

**Insertion site** — `room.js:115-123`, the current `lobby` init head. The guard goes at **`:119`**, above the whole guest block:

```js
	async (ctx, publicCode) => {
		const code = normalizePublicCode(publicCode);
		const roomRow = await getRoomByPublicCode(db, code);
		if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');
		// ← :119  D-01 GUARD GOES HERE (above the guest block, not inside it)
		if (ctx.user?.role === 'guest' && ctx.user?.guestId) {
			await upsertGuestSpectator(db, roomRow.id, ctx.user.guestId);
			const guestSnap = await loadLobbySnapshot(db, code);
			if (guestSnap) ctx.publish(topicForRoom(code), 'set', guestSnap);
		}
```

Stream options stay untouched (`room.js:155-157`): `{ merge: 'set', access: () => true, onUnsubscribe: … }`. `access` is subscribe-time-only and receives no room code — it cannot express this predicate (RESEARCH §Anti-Patterns).

---

### 4. `src/live/chat.js` — room-privacy guard in `chatAll` / `chatSpectators` (D-20)

**Analog:** the sibling `chatTeamA` guard above, **plus** the placement rule from the `lobby` guard: the throw must sit after `getRoomByPublicCode` (it needs `roomRow.is_public` / `roomRow.phase`) and before `cachePlayerTeam`, which performs a DB read.

**Code being modified** — `chat.js:124-135` (`chatAll`) and `:167-182` (`chatSpectators`). Both currently have **no** privacy check:

```js
export const chatAll = live.stream(
	(ctx, publicCode) => chatTopic(normalizePublicCode(publicCode), 'all'),
	async (ctx, publicCode) => {
		const code = normalizePublicCode(publicCode);
		const roomRow = await getRoomByPublicCode(db, code);
		if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');
		// ← D-20 guard goes here
		await cachePlayerTeam(ctx, roomRow.id);
		const topic = chatTopic(code, 'all');
		return { messages: messageStore.get(topic) ?? [] };
	},
	{ merge: 'set', access: () => true }
);
```

`chatSpectators` (`:167-182`) has the same head plus a post-`cachePlayerTeam` team rejection at `:175-177` — insert the privacy guard **before** `cachePlayerTeam`, above that existing check. Predicate must be byte-identical to the `lobby` guard's (`role === 'guest' && is_public === false && phase === 'lobby'`) so the two boundaries cannot drift.

---

### 5. `src/lib/server/rooms.js` — `setRoomVisibilityAsHost` + `removeGuestSpectators` + `isPublic` (service, CRUD)

**Analog for `setRoomVisibilityAsHost`:** `rooms.js:488-509` (`cancelRoomAsHost`). Copy the load→assert→update→return shape exactly:

```js
/**
 * Host ends the room (lazy purge later). Sets phase ended and ended_at.
 *
 * @param {any} db
 * @param {{ roomId: string, hostUserId: string }} args
 */
export async function cancelRoomAsHost(db, { roomId, hostUserId }) {
	const [roomRow] = await db.select().from(room).where(eq(room.id, roomId)).limit(1);
	if (!roomRow) {
		throw new Error('ROOM_NOT_FOUND');
	}
	assertHost(roomRow, hostUserId);

	const now = new Date();
	const [updated] = await db
		.update(room)
		.set({ phase: 'ended', ended_at: now, updated_at: now })
		.where(eq(room.id, roomId))
		.returning();

	return updated;
}
```

Notes: `assertHost` is the string-sentinel thrower (`rooms.js:124-132`, `throw NOT_HOST`) — never a `LiveError` at this layer. `.set()` takes an **explicit literal object** — never spread a caller payload (mass-assignment guard, RESEARCH §Security). Always bump `updated_at`.

**Analog for `removeGuestSpectators`:** `rooms.js:355-358` (inside `kickMember`) — the only `room_member` delete:

```js
	const removed = await db
		.delete(room_member)
		.where(and(eq(room_member.room_id, roomId), targetCond))
		.returning({ id: room_member.id });
```

The bulk variant drops `.returning()` and swaps `targetCond` for `isNotNull(room_member.guest_id)`. `and`, `eq`, `isNotNull` are **already imported** at `rooms.js:1`:

```js
import { and, asc, count, eq, isNotNull, ne, sql } from 'drizzle-orm';
```

Skip `recomputeTeamCaptains` (`rooms.js:271-287`) — guests are never on a team, and it is an N-round-trip loop.

**Analog for the `isPublic` snapshot field:** `rooms.js:200-207`, the `loadLobbySnapshot` return. It reads flat off `roomRow`, so `isPublic: roomRow.is_public` slots straight in:

```js
	return {
		publicCode: roomRow.public_code,
		roomId: roomRow.id,
		phase: roomRow.phase,
		hostUserId: roomRow.host_user_id,
		teams: { A: teamA, B: teamB },
		spectators
	};
```

The `@typedef {object} LobbySnapshot` block at `:143-151` must gain `@property {boolean} isPublic` — this JSDoc typedef is the shape contract the whole app types against:

```js
/**
 * @typedef {object} LobbySnapshot
 * @property {string} publicCode
 * @property {string} roomId
 * @property {string} phase
 * @property {string} hostUserId
 * @property {{ A: LobbyMember[], B: LobbyMember[] }} teams
 * @property {LobbyMember[]} spectators
 */
```

`getRoomByPublicCode` needs **zero** change — `rooms.js:84` is a bare unqualified select:

```js
	const rows = await db.select().from(room).where(eq(room.public_code, normalized)).limit(1);
```

---

### 6. `src/lib/server/db/schema.js` — the `is_public` column (model)

**Analog:** the `room` table itself (`schema.js:22-30`). `draft_state` is the precedent for a column appended by a later migration — new columns go **last**, and `boolean` is already imported at `:3`:

```js
export const room = pgTable('room', {
	id: uuid('id').defaultRandom().primaryKey(),
	public_code: varchar('public_code', { length: 12 }).notNull().unique(),
	host_user_id: text('host_user_id').notNull(),
	phase: text('phase').notNull().default('lobby'),
	created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
	ended_at: timestamp('ended_at', { withTimezone: true }),
	draft_state: jsonb('draft_state')
});
```

`.notNull().default(false)` ordering matches the existing `.notNull().default('lobby')` on `phase` (`:25`) and `.defaultNow().notNull()` on the timestamps. Formatting: **tabs**, no trailing comma (`prettier` `trailingComma: none`).

---

### 7. `drizzle/0002_add_room_is_public.sql` (+ meta) — migration

**Analog:** `drizzle/0001_milky_selene.sql:11` — the previous `ADD COLUMN` on the same table, generated by the same tool:

```sql
ALTER TABLE "room" ADD COLUMN "draft_state" jsonb;--> statement-breakpoint
```

**Generation is the pattern, not hand-authoring.** Run `npm run db:generate -- --name add_room_is_public` (`package.json:18` → `drizzle-kit generate`; no `out` in `drizzle.config.js` → defaults to `./drizzle`). Expected output, verified by RESEARCH executing drizzle-kit 0.31.8 in a scratch dir:

```sql
ALTER TABLE "room" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;
```

**Journal analog** — `drizzle/meta/_journal.json` currently has `entries` `idx: 0` and `idx: 1`; the tool appends a third with the same field order:

```json
    {
      "idx": 1,
      "version": "7",
      "when": 1775230303549,
      "tag": "0001_milky_selene",
      "breakpoints": true
    }
```

Commit all three artifacts together: `0002_add_room_is_public.sql`, `meta/0002_snapshot.json`, `meta/_journal.json`. Note `meta/` has snapshots for **every** migration (`0000_snapshot.json`, `0001_snapshot.json`) — a missing `0002_snapshot.json` silently corrupts the next `generate`.

---

### 8. `src/routes/draft/[id]/+page.server.js` — the `gated` computation (route loader)

**Analog:** the file's own existing load (`:7-35`). It is 36 lines total; the `gated` branch follows the `review` branch's early-return shape:

```js
/** @type {import('@sveltejs/kit').ServerLoad} */
export async function load({ params, locals, url }) {
	const code = parseRoomCode(params.id ?? '');
	const row = await getRoomByPublicCode(db, code);
	if (!row) {
		error(404, { message: 'Room not found' });
	}

	const base = {
		room: {
			public_code: row.public_code,
			phase: row.phase,
			host_user_id: row.host_user_id
		},
		userId: locals.user?.id ?? null,
		appOrigin: url.origin
	};

	if (row.phase === 'review') {
		// loadDraftSnapshot orders actions by turn_index asc — direct reuse
		const snap = await loadDraftSnapshot(db, code);
		return {
			...base,
			actions: snap?.actions ?? [],
			teams: snap?.teams ?? { A: [], B: [] }
		};
	}

	return base;
}
```

Conventions to keep: `error(404, …)` is called as a **statement**, not thrown; every return spreads `base`; `userId: locals.user?.id ?? null`. Per RESEARCH E1, return `gated: false` **explicitly on every path** so `page.data.gated` is never `undefined` on this route (the layout's `!page.data.gated` guard and the spec both read better against a real `false`).

---

### 9. `src/routes/draft/[id]/+page.svelte` — branch chain, latches, chat guard

**Analog:** the file itself. Every new construct already has a template a few lines away.

**Branch chain being restructured** (`:254-266`) — the current head of the `{#if}` chain, including the D-09 placeholder and the D-15 mis-branch:

```svelte
	{#if loading}
		<p class="cy-foot">// loading room…</p>
	{:else if loadError}
		{#if isGuest}
			<p class="cy-foot">
				<a href="/login?redirect=/draft/{code}">Sign in</a> to join this draft, or wait for the host to
				start it.
			</p>
		{:else}
			<p class="cy-foot">{errMsg(loadError)}</p>
		{/if}
	{:else if snapshot}
		{#if snapshot.phase === 'drafting' || snapshot.phase === 'cancelled'}
```

Note the existing `<a href="/login?redirect=/draft/{code}">` at `:259` is a **raw** href — this is one of the pre-existing `svelte/no-navigation-without-resolve` eslint errors. The gate's `SIGN_IN_DISCORD()` must use `resolve('/login')` instead (Pitfall 9); do not copy `:259` verbatim.

**Derives to extend** (`:39-50`) — the four stream derives the whole page hangs off:

```js
	const snapshot = $derived(
		streamVal && typeof streamVal === 'object' && !('error' in streamVal) ? streamVal : null
	);

	const loadError = $derived(
		streamVal && typeof streamVal === 'object' && 'error' in streamVal ? streamVal.error : null
	);

	const loading = $derived(streamVal === undefined);

	const isGuest = $derived(data.userId == null);
	const isHost = $derived(data.userId != null && data.userId === data.room.host_user_id);
```

**Mount-latch analog for `floorElapsed` / `connectTimedOut`:** `PauseOverlay.svelte:7-14` is the closest in-repo timer `$effect` with teardown:

```js
	$effect(() => {
		function tick() {
			secondsLeft = Math.max(0, Math.ceil((new Date(graceEndsAt).getTime() - Date.now()) / 1000));
		}
		tick();
		const id = setInterval(tick, 250);
		return () => clearInterval(id);
	});
```

**Copy-to-clipboard pattern to reuse for `$ COPY_LOG()`** (`:73-86` + its `copyTimer` declaration at `:36-37`) — verbatim shape, including the pre-clear that prevents overlapping timers:

```js
	/** @type {ReturnType<typeof setTimeout> | null} */
	let copyTimer = null;

	async function copyLink() {
		actionError = null;
		try {
			await navigator.clipboard.writeText(fullUrl);
			if (copyTimer) clearTimeout(copyTimer);
			copied = true;
			copyTimer = setTimeout(() => {
				copied = false;
				copyTimer = null;
			}, 2000);
		} catch {
			actionError = 'Could not copy link';
		}
	}
```

Its markup usage (`:300-305`) — the "button label never changes, a sibling `role="status"` appears" pattern UI-SPEC mandates:

```svelte
					<button type="button" class="cy-btn" onclick={copyLink} aria-label="Copy room link">
						$ COPY_LINK()
					</button>
					{#if copied}
						<span class="cy-foot" role="status">// copied</span>
					{/if}
```

**Error-handling pattern for `handleSetVisibility`** (`:106-113`, `handleKick`) — every RPC caller is this exact five-line shape:

```js
	async function handleKick(/** @type {{ userId?: string, guestId?: string }} */ payload) {
		actionError = null;
		try {
			await kickMember(code, payload);
		} catch (e) {
			actionError = errMsg(e);
		}
	}
```

`errMsg` (`:66-71`) is the fallback UI-SPEC warns about — its `'Something went wrong'` default is why `setRoomVisibility` must throw authored messages:

```js
	/** @param {unknown} e */
	function errMsg(e) {
		if (e && typeof e === 'object' && 'message' in e)
			return String(/** @type {{ message: unknown }} */ (e).message);
		return 'Something went wrong';
	}
```

**Chat `$effect` to guard** (`:180-192`) — D-20's client half. The `if (gated) return;` goes at the very top, above `activeChatStream(code)`, so the store is never constructed:

```js
	let chatStreamVal = $state(/** @type {any} */ (undefined));
	$effect(() => {
		const store = activeChatStream(code);
		// WR-04: drop the previous channel's messages immediately on resubscribe —
		// otherwise they render under the new tab until the new stream emits.
		chatStreamVal = undefined;
		const unsub = store.subscribe(
			/** @param {any} val */ (val) => {
				chatStreamVal = val;
			}
		);
		return unsub;
	});
```

⚠ `phase11-fixes.spec.js:17-19` asserts the regex `/const store = activeChatStream\(code\);[\s\S]*?chatStreamVal = undefined;[\s\S]*?store\.subscribe/`. An early `return` **before** `const store = …` keeps that regex green; reordering the three statements would break it.

**Child-prop pattern for the new components** (`:334-344`, the `LobbyHostBar` call site) — shorthand for same-name props, `onX` callbacks by reference, `bind:` only for two-way:

```svelte
				<LobbyHostBar
					{isHost}
					{snapshot}
					{code}
					onKick={handleKick}
					onMove={handleMove}
					onStartDraft={handleStart}
					onCancelRoom={handleCancel}
					bind:script={draftScript}
					bind:timerSeconds
				/>
```

`resolve()` usage for navigation (`:2`, `:63`):

```js
	import { resolve } from '$app/paths';
	const draftPath = $derived(resolve('/draft/[id]', { id: code }));
```

---

### 10. `src/routes/+layout.svelte` — the subscription gate (D-19)

**Analog:** the file's own `snap` derive (`:11-20`). It is 25 lines total; the change is one conditional and one `page.data` read. `page` from `$app/state` is **already imported** at `:5`:

```js
	import { page } from '$app/state';
	import { fromStore } from 'svelte/store';
	import { lobby } from '$live/room';

	let { children } = $props();

	// Room code from the route param (room screens are /draft/[id]); null on Home/Login → shows —.
	const code = $derived(page.params.id ?? null);

	// Phase derived READ-ONLY from the existing live lobby snapshot's frozen .phase field.
	// Subscribe ONLY when a code exists; guard against undefined / error snapshots like the draft page does.
	// NO snapshot field is added — this only reads the existing .phase.
	const snap = $derived.by(() => (code ? fromStore(lobby(code)).current : null));
	const phase = $derived(
		snap && typeof snap === 'object' && !('error' in snap) && snap.phase ? snap.phase : 'lobby'
	);
```

The existing `code ?` short-circuit is the precedent for the gate: add `&& !page.data.gated` to the same ternary condition. The `phase` fallback at `:18-20` is what makes the Shell Contract's "gate shows `01_LOBBY`" true without any `CyShell` change — leave it alone.

---

### 11. `src/lib/components/molecules/LobbyHostBar.svelte` — the `open_spectating` switch

**Analog:** the `move_player` section in the same modal (`:119-145`). Copy its `.cy-hc-section` / `.cy-field-label` / `.cy-hc-row` frame and its `disabled` expression:

```svelte
			<div class="cy-hc-section">
				<span class="cy-field-label">move_player</span>
				<div class="cy-hc-row">
					<div class="cy-field">
						<select bind:value={moveUserId} class="cy-input" aria-label="Move player">
							<option value="">--move--</option>
							{#each movableUsers as m (m.userId)}
								<option value={m.userId}>{m.displayName}</option>
							{/each}
						</select>
					</div>
					<div class="cy-field" style="flex: 0 0 90px">
						<select bind:value={moveTarget} class="cy-input" aria-label="To team">
							<option value="A">→ A</option>
							<option value="B">→ B</option>
						</select>
					</div>
					<button
						type="button"
						class="cy-btn cy-btn-sm"
						onclick={submitMove}
						disabled={!moveTargetValid || snapshot.phase !== 'lobby'}
					>
						EXEC
					</button>
				</div>
			</div>
```

The `snapshot.phase !== 'lobby'` clause at `:140` is the EXEC-disabled precedent UI-SPEC cites for the switch's draft-started lock.

**Insertion point** — immediately after `.cy-modal-head` (`:114-117`), before the `move_player` section:

```svelte
		<CyModal bind:open={consoleOpen} title="~/draft/host_console">
			<div class="cy-modal-head">
				<h3>&gt; HOST_CONSOLE</h3>
				<p>// root@{code} — manage rosters before launch</p>
			</div>
```

**Props typedef to extend** (`:5-34`) — the JSDoc-inline-object `$props()` idiom this project uses everywhere (no TypeScript). `onSetVisibility` joins the callback run; `LobbySnap` gains `isPublic`:

```js
	/**
	 * @typedef {{ userId?: string | null, guestId?: string | null, displayName: string, isCaptain: boolean, isHost: boolean }} LobbyMember
	 * @typedef {{ phase: string, teams: { A: LobbyMember[], B: LobbyMember[] } }} LobbySnap
	 * @typedef {{ id: string, team: 'A'|'B', action: 'pick'|'ban' }} ScriptTurn
	 */

	/**
	 * @type {{
	 *   isHost: boolean,
	 *   snapshot: LobbySnap,
	 *   code: string,
	 *   onKick: (p: { userId?: string, guestId?: string }) => void,
	 *   onMove: (userId: string, toTeam: 'A' | 'B') => void,
	 *   onStartDraft: () => void,
	 *   onCancelRoom: () => void,
	 *   script: ScriptTurn[],
	 *   timerSeconds: number
	 * }}
	 */
	let {
		isHost,
		snapshot,
		code,
		onKick,
		onMove,
		onStartDraft,
		onCancelRoom,
		script = $bindable([]),
		timerSeconds = $bindable(30)
	} = $props();
```

`LobbySnap.isPublic` must be **optional** (`isPublic?: boolean`) or the existing spec fixtures (`LobbyHostBar.svelte.spec.js:23-55`, which build snapshots with only `phase` + `teams`) become type errors. Read it as `snapshot.isPublic === true` in the component (RESEARCH Pitfall 3).

Host-only guard to nest inside (`:81`): `{#if isHost}` wraps the entire `<section class="cy-host-panel">`, so the switch inherits it for free.

---

### 12. `CyConnecting.svelte` / `CyGuestGate.svelte` / `CyCancelled.svelte` (components)

**Primary analog:** `src/lib/components/molecules/PauseOverlay.svelte` — read it in full (49 lines). It is the shipped `.cy-*` terminal card: runes, JSDoc props, `<pre>` log with literal newlines, no `<style>` block, no `$live` import.

```svelte
<script>
	/** @type {{ captainName: string, graceEndsAt: string, timerMs?: number }} */
	let { captainName, graceEndsAt, timerMs = 30000 } = $props();

	let secondsLeft = $state(0);

	$effect(() => {
		function tick() { /* … */ }
		tick();
		const id = setInterval(tick, 250);
		return () => clearInterval(id);
	});

	const totalGraceSeconds = $derived(Math.round(timerMs / 1000));
</script>

<div class="cy-pause" role="dialog" aria-modal="true" aria-label="Draft paused" style="…">
	<div class="cy-pause-card">
		<div class="cy-pause-eyebrow">// CONNECTION_LOST</div>
		<h2>$ DRAFT.HOLD()</h2>
		<pre class="cy-pause-log">[ERR] {captainName}.socket: closed
[INF] grace_period: {totalGraceSeconds}s
[INF] awaiting reconnect…</pre>
		<div class="cy-pause-timer">
			<div class="cy-pause-timer-num" aria-live="polite" aria-label="{secondsLeft} seconds of grace remaining">
				{String(secondsLeft).padStart(2, '0')}<span>s</span>
			</div>
			<div class="cy-pause-bar"><div style="width: {barWidth}%"></div></div>
		</div>
		<p>&gt; if no reconnect, captaincy promotes to next team member</p>
	</div>
</div>
```

Patterns to copy verbatim:
- **Props:** one-line `/** @type {{ … }} */ let { … } = $props();` with defaults inline. No `interface`, no `.d.ts`.
- **Structure:** `.cy-X` wrapper → `.cy-X-card` → `.cy-X-eyebrow` → `<h2>` → `<pre class="cy-X-log">` → actions/foot. This is exactly the anatomy UI-SPEC specifies for all three new cards.
- **`<pre>` content sits flush-left with real newlines in source** — no `{'\n'}`, no indentation, because `<pre>` preserves whitespace. UI-SPEC's interleaved-template-literal form (`{\`…\`}` + `<span>`) is the variant needed when a line must be span-wrapped; PauseOverlay shows the plain case.
- **Zero `<style>` block.** All rules live in `src/app.css`.
- **`&gt;` for a literal leading `>`** in text (`:47`).
- **No `$live/*` import** → the component is renderable in the browser vitest project.

**Secondary analog — `CyGuestGate`'s Discord CTA:** `LoginCard.svelte:28-41`. Reuse the **`class="cy-btn cy-btn-discord"` + inline `aria-hidden` SVG + label** composition; UI-SPEC replaces the `<form action="?/signin">` wrapper with an `<a href={resolve('/login') + …}>`:

```svelte
			<button
				type="submit"
				class="cy-btn cy-btn-discord"
				disabled={loading}
				aria-busy={loading}
				aria-label="Continue with Discord"
			>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
					><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515…" /></svg
				>
				{loading ? 'CONNECTING…' : 'CONTINUE_DISCORD()'}
			</button>
```

The `{loading ? 'CONNECTING…' : '…'}` label swap + `disabled` + `aria-busy` triple is the exact precedent for the gate's `CHECKING…` state and the switch's `pending` state. The `<svg …aria-hidden="true"><path …/></svg\n\t\t\t\t>` line-break-before-`>` shape is prettier's output for an SVG with a long `d` — match it.

**Secondary analog — `CyConnecting`'s typed log:** `src/lib/components/effects/cyTypedLog.svelte.js`. Consume, do not reimplement:

```js
export const CY_BOOT_LINES = [
	'$ draft --connect',
	'[ OK ] handshake with draftnet ...... ok',
	/* … */
];

export function createTypedLog(lines, { speed = 9, lineGap = 60 } = {}) { /* … */ }
// returns { get text(), get done(), stop }  — stop === $effect.root dispose (`:89`)
```

`connectLines(code)` mirrors `CY_BOOT_LINES`'s shape and its load-bearing-whitespace comment (`:20-26`). The factory owns an `$effect.root`, so the consumer must call `log.stop()` in an `$effect` teardown. Reduced-motion jump-to-full is already built in (`:55-60`, `:66`) — do **not** add a second reduced-motion check in the component.

---

### 13. The three `*.svelte.spec.js` browser specs

**Analog:** `src/lib/components/molecules/LobbyHostBar.svelte.spec.js` (246 lines, all real assertions — prefer this over `DraftReview.svelte.spec.js`, which is still 8 `it.todo` stubs).

**Header + imports** (`:1-8`) — note the deliberate live-CSS import, required for any visibility/`checkVisibility()` assertion:

```js
// @ts-nocheck
import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
// Live cascade so dialog/host-console styles apply (closed-dialog visibility
// contract + visible-button filtering both depend on it).
import '../../../app.css';
import LobbyHostBar from './LobbyHostBar.svelte';
```

**Fixture-factory + default-props pattern** (`:10-71`) — a `makeProps(overrides)` returning `vi.fn()` callbacks:

```js
/** Default render props — frozen callback surface as vi.fn()s. */
function makeProps(overrides = {}) {
	return {
		isHost: true,
		snapshot: bothCaptains(),
		code: 'K7-MIRA',
		onKick: vi.fn(),
		onMove: vi.fn(),
		onStartDraft: vi.fn(),
		onCancelRoom: vi.fn(),
		script: [],
		timerSeconds: 30,
		...overrides
	};
}
```

`code: 'K7-MIRA'` is the established 7-char test code, matching the prototype's dot-leader width — reuse it for the interpolation assertions.

**Assertion idioms** (`:145-181`) — locator-based `expect.element`, callback-fired assertions, and `rerender` for prop-change states (the seam for `timedOut` / `stillGated` / `reason`):

```js
	it('console move_player calls onMove(userId, toTeam) via EXEC; EXEC gated on selection (MOD-02)', async () => {
		const onMove = vi.fn();
		render(LobbyHostBar, makeProps({ onMove }));
		await openConsole();

		await expect.element(page.getByRole('button', { name: 'EXEC' })).toBeDisabled();

		await page.getByRole('combobox', { name: 'Move player' }).selectOptions('u2');
		await page.getByRole('button', { name: 'EXEC' }).click();

		expect(onMove).toHaveBeenCalledTimes(1);
		expect(onMove).toHaveBeenCalledWith('u2', 'B');
	});
```

```js
		const screen = render(LobbyHostBar, makeProps({ onMove }));
		await screen.rerender({ snapshot: without });
		await expect.element(page.getByRole('button', { name: 'EXEC' })).toBeDisabled();
```

Class/DOM-level assertions when the a11y tree is not the contract (`:215-220`) — the shape for `.cy-403` / `.cy-sig` / `.cy-ok` span checks:

```js
		const cancel = [...document.querySelectorAll('button')].find(
			(b) => b.textContent.trim() === 'CANCEL_ROOM'
		);
		expect(cancel.classList.contains('cy-btn-danger')).toBe(true);
		expect(cancel.closest('.cy-modal-foot')).not.toBeNull();
```

And `await expect.poll(() => …)` (`:237`) for anything driven by a timer — the `createTypedLog` 300 ms initial delay and the D-05 floor both need it.

---

### 14. `src/phase12-access-screens.spec.js` (node source/CSS contract spec)

**Analog A — CSS anchors:** `src/phase10-screens.spec.js:1-23`. Same `read()` helper, same `toContain('.cy-x {')` anchor style (note the trailing ` {` — it pins the selector to a rule opening, not an arbitrary substring):

```js
import { readFileSync, existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

const css = read('src/app.css');

describe('Phase 10 — Home/Login CSS', () => {
	it('UI-01/02: ports the Home anchor selectors + verbatim spacing', () => {
		expect(css).toContain('.cy-home {');
		expect(css).toContain('padding: 40px 32px 24px');
		/* … */
	});
});
```

**Analog B — verbatim-value + keyframe + count assertions:** `src/phase8-foundation.spec.js:6-45`. Shows literal-value assertions (`--cy-lime-glow: 0 0 12px #b3ff3d80`) and the `split().length - 1` counting trick, both of which the `█`×40 / `@keyframes cy-dots` / reduced-motion-block contracts need:

```js
	it('DS-01: declares exactly four JetBrains Mono @font-face blocks (400/500/600/700)', () => {
		const faces = css.split('@font-face').length - 1;
		expect(faces).toBe(4);
	});
```

**Analog C — source-order / regex contracts on `+page.svelte`:** `src/phase11-fixes.spec.js` (26 lines, read in full). This is the exact technique for asserting the branch order and the `gated` guard, and its header comment states *why* the draft page cannot be rendered:

```js
// Source-contract regression guards for the Phase 11 review fixes that live in
// +page.svelte — the draft page imports $live/* directly, so there is no
// browser render harness for it (phase10-screens.spec.js precedent).

const pageSrc = read('src/routes/draft/[id]/+page.svelte');

describe('Phase 11 review fixes — draft page contracts', () => {
	it('WR-04: chat effect drops the previous channel buffer before resubscribing', () => {
		expect(pageSrc).toMatch(
			/const store = activeChatStream\(code\);[\s\S]*?chatStreamVal = undefined;[\s\S]*?store\.subscribe/
		);
	});

	it('WR-05: lobby banner TURNS falls back to the configured script, not a hardcoded 10', () => {
		expect(pageSrc).toContain('snapshot.draftState?.script?.length ?? draftScript.length');
		expect(pageSrc).not.toContain('script?.length ?? 10');
	});
});
```

Note: `phase10-screens.spec.js` and `phase8-foundation.spec.js` have **no** `// @ts-nocheck`; `phase11-fixes.spec.js` uses a `/** @param {string} p */` JSDoc on `read`. Either is fine — `phase10-screens.spec.js:4` omits it and is one of the 10 svelte-check baseline errors, so prefer `phase11-fixes.spec.js`'s annotated form for new code.

---

### 15. `src/phase10-screens.spec.js` — scope-guard reconciliation (mandatory, same task as the CSS append)

**Code being deleted** — `:83-93`, verified byte-for-byte:

```js
describe('Phase 10 — scope guards (no Phase 12, no radius)', () => {
	it('does not leak Phase 12 selectors into the port', () => {
		expect(css).not.toContain('cy-loading');
		expect(css).not.toContain('cy-gate');
		expect(css).not.toContain('cy-cancel');
	});

	it('DS-04: still contains zero border-radius declarations', () => {
		expect(css).not.toMatch(/border-radius/);
	});
});
```

Delete lines 84-88 (the whole `it`, not just its three assertions — `vite.config.js:31` sets `expect: { requireAssertions: true }`, so an empty `it` fails) and retitle the `describe` to `'Phase 10 — scope guards (no radius)'`. Keep `:90-92` byte-identical. Net test count −1.

**Precedent:** Phase 11 Plan 01 performed exactly this operation on the four Phase-11 exclusions in the same block, in the same task as its CSS append.

---

### 16. `src/live/room.spec.js` — fixture edits + new tests (⚠ false-green risk)

**Fixtures that MUST change** (`:49-57` and `:9-23`). Without both edits the new tests give a **false green** and existing guest tests break:

```js
vi.mock('$lib/server/rooms.js', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		getRoomByPublicCode: vi.fn(),
		loadLobbySnapshot: vi.fn(),
		kickMember: vi.fn(),
		movePlayer: vi.fn(),
		startDraftIfReady: vi.fn(),
		startDraftWithSettings: vi.fn(),
		cancelRoomAsHost: vi.fn(),
		cancelDraftNoCaption: vi.fn(),
		promoteCaptain: vi.fn()
	};
});
```
→ add `upsertGuestSpectator: vi.fn()` (required for `expect(rooms.upsertGuestSpectator).not.toHaveBeenCalled()`), plus `setRoomVisibilityAsHost: vi.fn()` and `removeGuestSpectators: vi.fn()`.

```js
const baseRoom = {
	id: '00000000-0000-0000-0000-000000000099',
	public_code: 'abc1234',
	host_user_id: 'host-1',
	phase: 'lobby',
	created_at: new Date(),
	updated_at: new Date(),
	ended_at: null
};
```
→ add `is_public: false` (Pitfall 4: without it the guard reads `undefined`, gating every guest in every fixture).

```js
const baseSnapshot = {
	publicCode: 'abc1234',
	roomId: baseRoom.id,
	phase: 'lobby',
	hostUserId: 'host-1',
	teams: { A: [], B: [] },
	spectators: []
};
```
→ add `isPublic: false`.

**Stream-subscribe test analog** (`:259-271`) — the harness shape for the guard tests:

```js
	it('lobby stream init returns loadLobbySnapshot when phase is not drafting', async () => {
		const lobbyRoom = { ...baseRoom, phase: 'lobby' };
		vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(/** @type {any} */ (lobbyRoom));
		vi.mocked(rooms.loadLobbySnapshot).mockResolvedValue(/** @type {any} */ (baseSnapshot));

		env.register('room', roomModule);
		const client = env.connect({ role: 'player', id: 'u-1', name: 'Player1' });
		const stream = client.subscribe('room/lobby', 'abc1234');
		await stream.waitFor((v) => v !== undefined);
		expect(rooms.loadLobbySnapshot).toHaveBeenCalled();
		expect(draftMod.loadDraftSnapshot).not.toHaveBeenCalled();
	});
```

**Guest-connect + rejection analog** (`:87-93`) — `env.connect({ role: 'guest', guestId: 'g1' })` and the `.catch((e) => e)` idiom:

```js
	it('guest joinTeam rejects with UNAUTHORIZED before hitting the database', async () => {
		env.register('room', roomModule);
		const client = env.connect({ role: 'guest', guestId: 'g1' });
		const err = await client.call('room/joinTeam', 'anycode', 'A').catch((e) => e);
		expect(err).toBeInstanceOf(LiveError);
		expect(err.code).toBe('UNAUTHORIZED');
	});
```

**Host-RPC test analog** (`:179-190`) — for `setRoomVisibility`'s happy path, including the `toHaveBeenCalledWith(db, {…})` argument assertion:

```js
	it('host kickMember succeeds for signed-in userId (mock DB)', async () => {
		env.register('room', roomModule);
		const client = env.connect({ role: 'player', id: 'host-1', name: 'Host' });
		await client.call('room/kickMember', 'abc1234', { userId: 'u-target' });
		expect(rooms.kickMember).toHaveBeenCalledWith(db, {
			roomId: baseRoom.id,
			hostUserId: 'host-1',
			targetUserId: 'u-target',
			targetGuestId: undefined
		});
		expect(rooms.loadLobbySnapshot).toHaveBeenCalled();
	});
```

**Existing `cancelRoom` test to extend** (`:160-166`) — stays green after the reorder, which is precisely why the payload assertion must be added:

```js
	it('cancelRoom calls clearRoomTimer before cancelling the room', async () => {
		env.register('room', roomModule);
		const client = env.connect({ role: 'player', id: 'host-1', name: 'Host' });
		await client.call('room/cancelRoom', 'abc1234');
		expect(timersMod.clearRoomTimer).toHaveBeenCalledWith(baseRoom.id);
		expect(rooms.cancelRoomAsHost).toHaveBeenCalled();
	});
```

Note `env` is a module-level `createTestEnv()` per describe with `afterEach(() => { env.cleanup(); vi.clearAllMocks(); })` (`:96-113`), and `beforeEach` re-arms every mock (`:99-108`). New describes must follow both.

---

### 17. `src/lib/server/rooms.spec.js` — fake-db tests for the new helpers

**Analog:** `:100-134` (`getRoomByPublicCode`) — hand-rolled chainable fake `db`, no `vi.mock`:

```js
	it('returns the first row when present', async () => {
		const row = {
			id: '00000000-0000-0000-0000-000000000003',
			public_code: 'Ab3xY9z',
			host_user_id: 'host',
			phase: 'lobby',
			created_at: new Date(),
			updated_at: new Date(),
			ended_at: null
		};
		const db = {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: () => Promise.resolve([row])
					})
				})
			})
		};
		await expect(getRoomByPublicCode(db, 'Ab3xY9z')).resolves.toEqual(row);
	});
```

**Payload-capture analog** (`:158-194`) — the shape for asserting `setRoomVisibilityAsHost`'s `.set({ is_public, updated_at })` and `removeGuestSpectators`'s `.where(...)`:

```js
		/** @type {unknown} */
		let setPayload;
		const db = {
			select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([row]) }) }) }),
			update: () => ({
				set: (/** @type {unknown} */ v) => {
					setPayload = v;
					return { where: () => Promise.resolve(undefined) };
				}
			})
		};
		await expect(getRoomByPublicCode(db, 'stalexx')).resolves.toBeNull();
		expect(setPayload).toMatchObject({ phase: 'ended' });
		expect(setPayload).toHaveProperty('updated_at');
```

Header is `// @ts-nocheck` + a flat named-import list from `./rooms.js` (`:1-22`) — add the two new helpers there. For multi-call flows, `createJoinTeamMockDb(state)` (`:205-291`) is the call-counting variant; the new helpers are single-call and do not need it.

---

### 18. `src/routes/draft/[id]/page.server.spec.js` — the `gated` matrix

**Analog:** the whole file (85 lines). `vi.mock` header + a `makeEvent` factory is exactly the shape the guest/auth × public/private × phase matrix extends:

```js
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/db', () => ({ db: {} }));
vi.mock('$lib/server/rooms', () => ({
	getRoomByPublicCode: vi.fn()
}));
vi.mock('$lib/server/draft.js', () => ({
	loadDraftSnapshot: vi.fn()
}));
vi.mock('$lib/join-parse.js', () => ({
	parseRoomCode: vi.fn((code) => code)
}));

import { load } from './+page.server.js';
import { getRoomByPublicCode } from '$lib/server/rooms';

const makeEvent = ({ phase = 'lobby', userId = 'user-1', params = { id: 'ABC1234' } } = {}) => ({
	params,
	locals: { user: userId ? { id: userId } : null },
	url: { origin: 'https://example.com' }
});

describe('+page.server load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns base object for lobby phase (no actions/teams in response)', async () => {
		getRoomByPublicCode.mockResolvedValue({
			public_code: 'ABC1234',
			phase: 'lobby',
			host_user_id: 'host-1'
		});
		const result = await load(makeEvent({ phase: 'lobby' }));
		expect(result.room.phase).toBe('lobby');
		expect(result).not.toHaveProperty('actions');
	});
});
```

Two notes: the `phase` param of `makeEvent` is **unused** (it is the room mock that decides phase) — that is the pre-existing eslint error at `:19`; do not "fix" it. Room fixtures need `is_public` added.

---

### 19. `src/app.css` — appending the Phase 12 block

**Analog:** the `.cy-pause*` block at `:698-708`, which is the Phase 10 section's own screen-card port. **Formatting differs by section and this matters:** Phase 8's block (`:291-370`) is multi-line prettier-formatted; the Phase 10/11 ported blocks (`:698-708`, `:808-819`) are **one compact rule per line**. Append in the compact style — the RESEARCH §Design Source Verification extraction is already in that form.

```css
.cy-pause { display: grid; place-items: center; min-height: 70vh; padding: 40px; }
.cy-pause-card { background: var(--cy-bg-2); border: 1px solid var(--cy-violet); padding: 32px; max-width: 480px; box-shadow: 0 0 60px rgba(196, 75, 255, 0.2); }
.cy-pause-eyebrow { color: var(--cy-violet); font-size: 11px; text-shadow: var(--cy-violet-glow); }
.cy-pause-card h2 { margin: 8px 0 16px; font-size: 24px; color: var(--cy-text); }
.cy-pause-log { background: var(--cy-bg); border: 1px solid var(--cy-line); padding: 12px; font-size: 11px; color: var(--cy-text-2); margin: 0 0 20px; }
```

**Section-banner convention** (`:385`, `:717`): each phase opens with `/* ============ PHASE N — TITLE ============ */`. Phase 12 appends `/* ============ PHASE 12 — ACCESS & SECONDARY SCREENS ============ */` after `:841`.

**Reduced-motion block analog** (`:710-715`) — a *per-phase* media block with a rationale comment, not an edit to the earlier ones. There are three today (`:373`, `:712`, `:838`); Phase 12 adds a fourth:

```css
/* Phase 10 reduced-motion: suppress the urgency/active pulse only (D-04);
   keep the red color shift intact so urgency stays readable without animation. */
@media (prefers-reduced-motion: reduce) {
  .cy-turn-clock.is-urgent .cy-turn-clock-num { animation: none; }
  .cy-pip.is-active { animation: none; }
}
```

Vocabulary the switch (A6) derives from — quote these values, do not invent:

```css
.cy-field-label { color: var(--cy-text-3); font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; }   /* :765 */
.cy-hc-section { display: flex; flex-direction: column; gap: 10px; }                                              /* :808 */
.cy-hc-row { display: flex; align-items: flex-end; gap: 8px; flex-wrap: wrap; }                                   /* :809 */
.cy-chat-tabs button.is-active { background: var(--cy-text); color: var(--cy-bg); border-color: var(--cy-text); }  /* :661 */
.cy-script-rm { background: transparent; border: 1px solid var(--cy-line); color: var(--cy-text-3); padding: 4px 8px; font: inherit; font-size: 11px; cursor: pointer; }  /* :799 */
.cy-script-move:disabled { opacity: 0.4; cursor: default; }                                                       /* :804 */
.cy-input:focus { outline: 1px solid var(--cy-lime); outline-offset: 1px; }                                       /* :367-370 */
.cy-btn-discord { background: #5865f2; color: #fff; border-color: #5865f2; width: 100%; justify-content: center; padding: 14px; }  /* :350-357 */
.cy-foot { color: var(--cy-text-3); font-size: 11px; margin: 8px 0 0; }                                           /* :491 */
.cy-chat-cursor { color: var(--cy-lime); animation: cy-blink 1s infinite step-end; }                              /* :668 */
```

Confirmed: `src/app.css` is exactly **841** lines, and none of `cy-loading` / `cy-gate` / `cy-cancel` / `cy-sr-only` / `cy-403` / `cy-sig` / `cy-ok` / `cy-wait` appear anywhere in it.

---

### 20. `src/lib/components/molecules/DraftBoard.svelte` — deletions (Pitfall 10)

Three contiguous regions to remove, verified:

- `:75-77` — `cancelledTeamLabel(team)` function
- `:79-90` — the `cancelledTeam` `$derived` (its own comment already records that captain-scanning is unreliable)
- `:121-129` — the `{#if snapshot.phase === 'cancelled'} … {:else}` wrapper, collapsing to just the `{:else}` body:

```svelte
{#if snapshot.phase === 'cancelled'}
	<div class="cy-draft-cancelled">
		<h2>Draft cancelled</h2>
		<p>
			No captain was available for {cancelledTeamLabel(cancelledTeam ?? '')}. The draft could not
			continue.
		</p>
		<button type="button" class="cy-btn" onclick={() => goto('/')}> Return to lobby </button>
	</div>
{:else}
	<div class="cy-draft cy-draft-chat-sidebar">
```

Follow-through: the `goto` import at `:2` becomes unused **iff** it has no other use in the file — grep before deleting it (removing an unused import also removes one `no-navigation-without-resolve` eslint error at `:128`, which is a net improvement against the 20-error baseline). Keep the `PauseOverlay` render at `:115-121`, including its `&& snapshot.phase !== 'cancelled'` clause — that is the frozen grace flow D-06 forbids touching.

---

## Shared Patterns

### Authorization (server boundary)

**Source:** `src/live/room.js:230-238` (any host RPC head) and `src/live/chat.js:140` (stream guard).
**Apply to:** `setRoomVisibility`, the `lobby` guard, the `chatAll`/`chatSpectators` guards.

```js
	if (ctx.user?.role !== 'player' || !ctx.user?.id) {
		throw new LiveError('UNAUTHORIZED', 'Sign in required');
	}
	// … resolve roomRow …
	if (roomRow.host_user_id !== ctx.user.id) {
		throw new LiveError('FORBIDDEN', 'Host only');
	}
```

Rules: role check first (before any DB read), then `getRoomByPublicCode` → `NOT_FOUND`, then ownership → `FORBIDDEN`, then payload → `VALIDATION`, then the write. `{#if isHost}` in Svelte is UX only.

### Broadcast (one path, never `null`)

**Source:** `src/live/room.js:225-226`, `:257-258`, `:291-292`, `:344-345`, `:367-368` — all five mutations.
**Apply to:** `setRoomVisibility`, `cancelRoom`.

```js
	const snap = await loadLobbySnapshot(db, code);
	ctx.publish(topicForRoom(code), 'set', snap);
	return snap;
```

`merge: 'set'` replaces the client value wholesale, so a `null` payload blanks every client (Pitfall 1). Any mutation that sets `ended_at` must capture the snapshot **before** the write (`room.js:104-108`).

### Error handling (client)

**Source:** `src/routes/draft/[id]/+page.svelte:66-71` (`errMsg`) + `:106-113` (`handleKick`).
**Apply to:** `handleSetVisibility`, `handleRetryAsGuest`, the `$ COPY_LOG()` handler.

```js
		actionError = null;
		try {
			await someRpc(code, payload);
		} catch (e) {
			actionError = errMsg(e);
		}
```

Rendered once at the top of `<main>` (`:250-252`) as `<p class="cy-foot">{actionError}</p>`, and inline as `<span class="cy-foot">` inside action rows (`:306-308`).

### Validation (server)

**Source:** `src/live/room.js:272-277` (`movePlayer`) and `:306-330` (`startDraft`).
**Apply to:** `setRoomVisibility`'s boolean check.

```js
	const p = payload && typeof payload === 'object' ? payload : {};
	if (p.toTeam !== 'A' && p.toTeam !== 'B') {
		throw new LiveError('VALIDATION', 'Invalid team');
	}
```

Strict literal/typeof comparisons; `LiveError('VALIDATION', …)` with a human message; never coerce.

### Component conventions (Svelte 5 + JSDoc)

**Source:** `PauseOverlay.svelte:2-3` (simple), `LobbyHostBar.svelte:5-34` (typedef + callbacks + bindable).
**Apply to:** all three new components and the switch.

```js
	/** @type {{ captainName: string, graceEndsAt: string, timerMs?: number }} */
	let { captainName, graceEndsAt, timerMs = 30000 } = $props();
```

- `$props()` destructure with an inline JSDoc object type; `@typedef` above only when a shape repeats.
- `$state` for local UI state, `$derived` / `$derived.by` for computed, `$effect` with a teardown return for timers.
- No `<style>` block; `.cy-*` classes only; no Tailwind.
- No `$live/*` import in a component (keeps it browser-renderable).
- Tabs, single quotes, no trailing commas, printWidth 100.

### Test routing

**Source:** `vite.config.js:29-52`.
**Apply to:** every new spec. Filename is the only routing rule.

| Filename | Project | Environment |
|----------|---------|-------------|
| `*.svelte.spec.js` | `client` | Playwright chromium |
| anything else `*.spec.js` | `server` | node |

`expect: { requireAssertions: true }` (`vite.config.js:31`) — an `it` with zero assertions **fails**. This is why `phase10-screens.spec.js`'s emptied `it` must be deleted, not just gutted.

### Gates

`npm test` only (baseline **202 passed / 1 skipped / 34 todo across 24 files**). `npm run lint` and `npm run check` are red at baseline; `npm run format` must never run — `rooms.js`, `room.js`, `app.css`, and `rooms.spec.js` all fail `prettier --check` today, and reformatting them would bury the phase diff. Match surrounding style by hand.

---

## No Analog Found

| File / Construct | Role | Data Flow | Reason |
|------------------|------|-----------|--------|
| `.cy-hc-switch*` — the `role="switch"` two-segment control (UI-SPEC A6) | component + CSS | UI state | **No toggle/switch exists anywhere in the codebase or the design handoff.** Nearest shipped idioms are `.cy-chat-tabs button.is-active` (`app.css:661`, the neutral inversion) and `.cy-script-rm` (`:799`, the micro-control metrics) — UI-SPEC §Component Contract 4 already composes the control from those two. There is no `role="switch"`, `aria-checked`, or `<input type="checkbox">` in `src/` to copy from; treat UI-SPEC's markup block as the authority and run `svelte-autofixer` on it. |
| `.cy-sr-only` visually-hidden class + `role="alert"` live-arrival lines | config (CSS) + a11y | — | `grep` confirms no `.cy-sr-only`/`.sr-only`/`.visually-hidden` in `app.css`. The only shipped `role="alert"` is `LoginCard.svelte:53` (`<p role="alert" class="cy-foot">`), which is **visible**, not screen-reader-only. UI-SPEC A7 supplies the exact rule; it is the phase's one new foundation class. |
| D-08 connect-timeout state (`.is-timeout`, `.cy-err`, `$ RETRY_LINK()`) | component state | timer-driven | No prototype design and no in-repo precedent for a "dead socket" terminal state. Closest structural precedent is the `loadError` text branch at `+page.svelte:256-264`. UI-SPEC §Component Contract 1 + additions A2/A3/A4 are the source of truth. |

Everything else has a concrete analog above. For the three items here, the planner should reference **UI-SPEC.md** sections rather than a codebase file.

---

## Metadata

**Analog search scope:** `src/live/`, `src/lib/server/`, `src/lib/components/{atoms,molecules,chrome,effects}/`, `src/routes/`, `src/*.spec.js`, `drizzle/`, `drizzle/meta/`, `src/app.css`, `vite.config.js`, `package.json`

**Files read in full:** `src/live/room.js`, `src/lib/server/rooms.js`, `src/routes/draft/[id]/+page.svelte`, `src/routes/draft/[id]/+page.server.js`, `src/routes/+layout.svelte`, `src/lib/components/molecules/LobbyHostBar.svelte`, `src/lib/components/molecules/PauseOverlay.svelte`, `src/lib/components/molecules/LoginCard.svelte`, `src/lib/components/effects/cyTypedLog.svelte.js`, `src/live/room.spec.js`, `src/lib/components/molecules/LobbyHostBar.svelte.spec.js`, `src/routes/draft/[id]/page.server.spec.js`, `src/phase10-screens.spec.js`, `src/phase11-fixes.spec.js`, `src/lib/components/molecules/DraftReview.svelte.spec.js`, `drizzle/0001_milky_selene.sql`, `drizzle/meta/_journal.json`

**Files read in targeted ranges:** `src/app.css` (`:285-380`, `:698-841`, grep-located anchors), `src/live/chat.js` (`:100-200`), `src/lib/server/db/schema.js` (`:1-40`), `src/lib/server/rooms.spec.js` (`:1-30`, `:100-230`), `src/lib/components/molecules/DraftBoard.svelte` (`:70-135`), `src/phase8-foundation.spec.js` (`:1-45`), `package.json` (`:1-30`)

**Project skills:** none — no `.claude/skills/` or `.agents/skills/` directory exists in this repo.

**Stale docs deliberately not used:** `.planning/codebase/ARCHITECTURE.md` (2026-04-03, pre-realtime, factually wrong about the draft route), `.planning/codebase/CONVENTIONS.md:33` (Tailwind, removed in Phase 8), `.planning/codebase/TESTING.md:116-118` (claims no `vi.mock`; three specs use it heavily).

**Pattern extraction date:** 2026-09-04
