# Phase 3: Draft Engine - Research

**Researched:** 2026-04-03
**Domain:** Server-authoritative pick/ban draft engine — Drizzle schema extension, svelte-realtime live RPCs, server-side timer, static catalog, drag-to-reorder settings UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Each turn in the script is `{ team: 'A' | 'B', action: 'pick' | 'ban' }`. Scripts are ordered arrays of these objects.
- **D-02:** Host can override the default script via per-step drag-to-reorder list before the draft starts.
- **D-03:** Default script is an esports-style alternating bans-then-picks format (Claude's discretion — confirmed in UI-SPEC as 2 bans per team then 3 picks per team, snake order, 10 turns total).
- **D-04:** Settings panel is an expandable inline section within `LobbyHostBar` — no separate modal or page.
- **D-05:** Settings are lobby-only; panel is hidden/removed once `room.phase !== 'lobby'`.
- **D-06:** Catalog is the 28 Battlerite Champions grouped by role (Melee 9, Ranged 10, Support 9) with exact spellings as provided.
- **D-07:** Entry shape: `{ id: string, name: string, role: 'melee' | 'ranged' | 'support' }`. `id` is kebab-case slug.
- **D-08:** Catalog lives at `src/lib/catalog/classes.json` — static JSON, imported at build time, no DB table.
- **D-09:** Draft state is DB-persisted per pick/ban action via a new `draft_action` table (room_id, turn_index, team, action, champion_id, timestamp).
- **D-10:** Room settings (timer, custom script) are in-memory only until draft starts; once started, resolved settings are baked into draft state on the `room` row.

### Claude's Discretion

- Server-side turn timer mechanism: `setTimeout` in the svelte-realtime live module is acceptable for Phase 3.
- `draft_action` table exact schema — follow Drizzle patterns from `room` and `room_member`.
- How in-progress draft state (current turn index, `turnEndsAt`) is stored — a JSONB column on `room` or a separate table.
- How room settings are broadcast to connected clients (e.g. published via existing `topicForRoom` topic on change).
- Exact default script content within the esports-style constraint (confirmed in UI-SPEC: 10 turns).

### Deferred Ideas (OUT OF SCOPE)

- Champion icons/images — Phase 3 catalog is id + name + role only.
- Custom class list creation — explicitly out of scope (PROJECT.md).
- Draft UI visuals, countdown rendering, whose-turn indicator — Phase 4.
- Captain disconnect grace/reassign logic — Phase 4 (DISC-01–04).
- Team and spectator chat — Phase 5.
- Post-draft summary page — Phase 6.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HOST-01 | Host has a room settings panel to configure pick/ban order and turn timer (default: 30 seconds) | DraftSettingsPanel component (new), ScriptTurnRow atom (new), inline in LobbyHostBar. Settings state in-memory until startDraft. |
| LIST-01 | App ships with one premade class catalog used as the default draft list | `src/lib/catalog/classes.json` with 28 Battlerite Champions; imported server-side for validation and client-side for UI. |
| DRAFT-01 | Draft uses a data-driven predefined pick/ban script (sensible default order bundled with the app) | Default script constant in `src/lib/draft-script.js` (new); 10-turn snake-order esports default from UI-SPEC. |
| DRAFT-02 | Server owns authoritative turn order and emits a `turnEndsAt` timestamp; clients render countdown from that value | `room.draft_state` JSONB column stores `{ turnIndex, turnEndsAt }`; published in every snapshot. |
| DRAFT-03 | Team captains alternate turns banning and picking from a shared class pool; each class may only be picked or banned once | RPC validation: caller must be active team's captain; champion_id must not exist in `draft_action` for this room. |
| DRAFT-04 | Turn auto-advances (server-side) when the timer expires without a captain action | `setTimeout` stored per-room in a module-level Map; fires `advanceTurn` with a "timeout" action if not cancelled by a real pick/ban. |
| DRAFT-05 | Draft progresses through a fixed number of bans + picks per team as defined by the script | Script length drives turn count; after `turnIndex === script.length`, completion logic fires. |
| DRAFT-06 | Host can override the default pick/ban order in the room settings panel before the draft starts | Drag-to-reorder list in DraftSettingsPanel; `updateSettings` RPC stores override in module-level room settings Map. |
</phase_requirements>

---

## Summary

Phase 3 is a server-logic-heavy phase built entirely on top of the established Phase 2 patterns: svelte-realtime live RPCs, sequential Neon HTTP writes, and topic publishing. The three new concerns are (1) a draft state machine that must be authoritative and race-condition-safe, (2) a server-side timer that must not double-fire alongside a real pick/ban, and (3) a Drizzle schema extension with a `draft_action` table and draft state columns on `room`.

The existing codebase is very well-suited to this phase. The live RPC pattern (`validate → get room → mutate → publish → return snap`) is already proven across 7 RPCs in `src/live/room.js`. The test infrastructure uses `svelte-realtime/test` with `createTestEnv` — the same harness will cover draft RPCs. The `rooms.spec.js` and `room.spec.js` patterns establish a clear mock-db approach.

The key architectural decision left to the planner (Claude's Discretion) is where to store in-progress draft state. Research recommends a JSONB `draft_state` column on the `room` table (over a separate table) because: it keeps the snapshot load to a single row read, avoids joins, and Phase 4 hydration only needs the room row. The `draft_action` table is still required for the per-turn audit log (D-09).

**Primary recommendation:** Implement draft RPCs in a new `src/live/draft.js` module (keeps `room.js` lobby-focused); store resolved draft state in a `draft_state` jsonb column on `room`; store per-turn history in `draft_action` table; use a module-level `Map<roomId, ReturnType<typeof setTimeout>>` for timer handles.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| svelte-realtime | 0.4.6 (installed) | Live RPC server + test harness | Already in use; proven Phase 2 patterns |
| drizzle-orm | 0.45.2 (latest) | Schema, queries, migrations | Already in use |
| @neondatabase/serverless | 1.0.2 (installed) | Neon HTTP driver | Already in use; sequential write pattern established |
| nanoid | 5.1.7 (installed) | Stable row IDs for script turns (client state) | Already in use for room codes |
| svelte 5 | 5.55.1 (latest) | Runes-based component authoring | Project standard |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-kit | 0.31.10 (latest) | `npm run db:generate` + `npm run db:migrate` | Adding `draft_action` table and `draft_state` column to `room` |
| vitest | 4.1.2 (latest) | Unit tests for draft logic | Existing server test project in `vite.config.js` |
| svelte-realtime/test | 0.4.6 | `createTestEnv` test harness | Same pattern as `room.spec.js` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSONB `draft_state` on `room` | Separate `draft_state` table | Separate table avoids schema coupling but requires a join on every snapshot; not worth it for v1 |
| Module-level timer Map | Persistent job queue (pg_cron, BullMQ) | Job queue survives server restart; out of scope for Phase 3 (D-10 says settings are in-memory) |
| Native HTML DnD API | @dnd-kit or sortable.js | External library adds bundle weight; HTML DnD is sufficient for the simple list case and is what UI-SPEC mandates |

**Installation:** No new npm packages required. All dependencies already in `package.json`.

---

## Architecture Patterns

### Recommended Project Structure (Phase 3 additions)

```
src/
├── lib/
│   ├── catalog/
│   │   └── classes.json          # 28 Battlerite Champions (new, D-08)
│   ├── draft-script.js           # Default script constant + script validation util (new)
│   └── server/
│       ├── db/
│       │   └── schema.js         # Add draft_action table + draft_state column on room
│       └── draft.js              # DB layer: writeDraftAction, loadDraftSnapshot, etc. (new)
└── live/
    └── draft.js                  # svelte-realtime live RPCs: pickBan, updateSettings (new)
```

`src/lib/server/rooms.js` gets one addition: `startDraftWithSettings` (or the existing `startDraftIfReady` is extended) to bake resolved settings into `room.draft_state` on transition.

### Pattern 1: Live RPC — Draft Action

Identical shape to existing lobby RPCs. Always: validate caller → fetch room → validate turn → write action → clear timer → publish snapshot → schedule next timer.

```javascript
// src/live/draft.js
// Source: established pattern from src/live/room.js
export const pickBan = live(async (ctx, publicCode, payload) => {
  if (ctx.user?.role !== 'player' || !ctx.user?.id) {
    throw new LiveError('UNAUTHORIZED', 'Sign in required');
  }
  const code = normalizePublicCode(publicCode);
  const roomRow = await getRoomByPublicCode(db, code);
  if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');
  if (roomRow.phase !== 'drafting') throw new LiveError('FORBIDDEN', 'Draft not in progress');

  const draftState = roomRow.draft_state;            // JSONB parsed by Drizzle
  const script = draftState.script;
  const turnIndex = draftState.turnIndex;
  const currentTurn = script[turnIndex];

  // Validate caller is captain of the active team
  // Validate champion_id not already picked/banned
  // ...

  await writeDraftAction(db, { roomId: roomRow.id, turnIndex, ...payload });
  clearRoomTimer(roomRow.id);

  const nextIndex = turnIndex + 1;
  if (nextIndex >= script.length) {
    await completeDraft(db, roomRow.id);
  } else {
    const turnEndsAt = new Date(Date.now() + draftState.timerMs);
    await updateDraftState(db, roomRow.id, { turnIndex: nextIndex, turnEndsAt });
    scheduleTimer(roomRow.id, draftState.timerMs, () => autoAdvanceTurn(code, nextIndex));
  }

  const snap = await loadDraftSnapshot(db, code);
  ctx.publish(topicForRoom(code), 'set', snap);
  return snap;
});
```

### Pattern 2: Server-Side Timer (Race Condition Safety)

The critical invariant: a real pick/ban and a timer expiry must not both win the same turn. The pattern is:

1. Before writing a pick/ban action, cancel the existing timer with `clearTimeout`.
2. In the timer callback, do a conditional DB write: only advance if `draft_state.turnIndex` still matches the expected index. If a pick/ban already advanced the turn, the DB update is a no-op.
3. The module-level Map holds only one active timer per room at any time.

```javascript
// src/live/draft.js
/** @type {Map<string, ReturnType<typeof setTimeout>>} */
const roomTimers = new Map();

function clearRoomTimer(roomId) {
  const t = roomTimers.get(roomId);
  if (t != null) {
    clearTimeout(t);
    roomTimers.delete(roomId);
  }
}

function scheduleTimer(roomId, delayMs, cb) {
  clearRoomTimer(roomId);
  const t = setTimeout(cb, delayMs);
  roomTimers.set(roomId, t);
}

async function autoAdvanceTurn(publicCode, expectedTurnIndex) {
  // Conditional update: only fires if turn hasn't already advanced
  // Uses: UPDATE room SET draft_state = ... WHERE id = ? AND draft_state->>'turnIndex' = ?
  // If 0 rows updated, a real action already advanced — do nothing.
}
```

**Confidence:** HIGH — this is the standard Node.js single-process setTimeout pattern. Neon HTTP's lack of transactions does not affect this because the conditional update handles the race.

### Pattern 3: JSONB draft_state on room

```javascript
// src/lib/server/db/schema.js addition
import { jsonb } from 'drizzle-orm/pg-core';

// Add to room table definition:
draft_state: jsonb('draft_state')
// Stores: { script: [{team,action}], turnIndex: number, turnEndsAt: string (ISO), timerMs: number }
// null when phase !== 'drafting'
```

**JSDoc typedef** for the stored shape:

```javascript
/**
 * @typedef {object} DraftState
 * @property {{ team: 'A'|'B', action: 'pick'|'ban' }[]} script
 * @property {number} turnIndex
 * @property {string} turnEndsAt   - ISO timestamp
 * @property {number} timerMs
 */
```

### Pattern 4: draft_action Table Schema

Following the existing `room_member` pattern (uuid PK, room_id FK with cascade delete, timestamps):

```javascript
// src/lib/server/db/schema.js addition
export const draft_action = pgTable(
  'draft_action',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    room_id: uuid('room_id').notNull().references(() => room.id, { onDelete: 'cascade' }),
    turn_index: integer('turn_index').notNull(),
    team: text('team').notNull(),         // 'A' | 'B'
    action: text('action').notNull(),     // 'pick' | 'ban' | 'timeout'
    champion_id: text('champion_id'),     // null for timeout auto-advance
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [
    index('draft_action_room_id_idx').on(t.room_id),
    uniqueIndex('draft_action_room_turn_unique').on(t.room_id, t.turn_index)
  ]
);
```

The unique index on `(room_id, turn_index)` is the final DB-level race guard: if two writes race on the same turn, the second will throw a unique constraint violation which the caller can safely ignore.

### Pattern 5: Settings RPC (in-memory, lobby-only)

Room settings (custom script + timer) are kept in a module-level Map until `startDraft` fires. On `startDraft`, the resolved settings are read from the Map and baked into `room.draft_state`.

```javascript
// src/live/draft.js
/** @type {Map<string, { script: {team:string,action:string}[], timerMs: number }>} */
const roomSettings = new Map();

export const updateSettings = live(async (ctx, publicCode, payload) => {
  // Validate host, lobby phase, payload shape
  // Store in roomSettings Map
  // Publish updated snapshot (with settings embedded in snap for client rendering)
});
```

When `startDraft` is called (in `rooms.js`), it reads from `roomSettings` (or uses the default) and writes the resolved `draft_state` JSONB to the room row.

### Pattern 6: Snapshot Extension

`loadLobbySnapshot` is not replaced — it remains the lobby phase snapshot. For `phase === 'drafting'`, a new `loadDraftSnapshot` function in `src/lib/server/draft.js` assembles the full snapshot including `draftState` and `actions`.

For Phase 3 (server engine only, no draft UI), the lobby page still uses `loadLobbySnapshot`. The snapshot published on `startDraft` includes `phase: 'drafting'` — that is all the client needs for the Phase 3 UI.

### Pattern 7: startDraft Extended

The existing `startDraftIfReady` in `rooms.js` sets `phase = 'drafting'`. For Phase 3, `startDraftWithSettings` (or an extension of `startDraftIfReady`) also:
1. Reads resolved settings from `roomSettings` Map (or default script).
2. Computes `turnEndsAt = now + timerMs`.
3. Sets `draft_state = { script, turnIndex: 0, turnEndsAt, timerMs }`.
4. Schedules the first timer.

### Anti-Patterns to Avoid

- **Publishing from inside the timer callback without re-fetching:** The timer callback must read the current room state from DB before publishing — never use a captured closure value for the snapshot.
- **Calling `loadLobbySnapshot` during `phase === 'drafting'`:** `loadLobbySnapshot` returns `null` for non-lobby rooms (it calls `getRoomByPublicCode` which still returns drafting rooms, but the snapshot function shape omits draft state). Use the new `loadDraftSnapshot` or extend the snapshot type.
- **Storing timer handles in the DB:** setTimeout handles are in-process only. Timer state cannot survive a server restart (D-10 acknowledges this; Phase 4 handles reconnect/restore).
- **Not guarding the `pickBan` RPC against non-captains:** The caller's `userId` must match the captain of the active turn's team. Fetch captains from `room_member` in the RPC.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Race condition between pick and timer | Custom lock / mutex | Conditional DB UPDATE + unique constraint on `(room_id, turn_index)` | Database atomicity is the correct lock boundary for distributed systems |
| Drag-to-reorder UI | External DnD library | Browser-native `draggable` + `ondragstart`/`ondragover`/`ondrop` | UI-SPEC mandates this; sufficient for simple ordered list |
| Champion ID generation | Custom slug logic | Kebab-case from name (hardcode in JSON) | IDs are fixed in the static catalog; no generation needed |
| Schema migrations | Manual SQL | `npm run db:generate` + `npm run db:migrate` | Drizzle Kit generates correct SQL from schema diff |

**Key insight:** The race condition between "captain picks" and "timer fires" is the hardest problem in this phase. The correct solution is a conditional DB write (not an in-memory mutex), because the module-level timer and the RPC handler both run in the same Node process but the conditional update makes the operation idempotent at the DB level.

---

## Common Pitfalls

### Pitfall 1: Double-fire on the same turn
**What goes wrong:** Both a real `pickBan` RPC and the `autoAdvanceTurn` timer callback advance turn N, writing two `draft_action` rows for the same `turn_index`.
**Why it happens:** The timer fires just as the captain's pick lands; `clearTimeout` in the RPC and the timer's `setTimeout(cb, delay)` race.
**How to avoid:** The unique index on `(room_id, turn_index)` is the final backstop. In the timer callback, also use a conditional UPDATE (`WHERE draft_state->>'turnIndex' = ?`) — if no row updated, another advance already happened.
**Warning signs:** Integration test where pick + immediate timer both land finds 2 rows in `draft_action` for the same turn_index.

### Pitfall 2: draft_state JSONB not parsed by Drizzle
**What goes wrong:** `roomRow.draft_state` comes back as a raw JSON string instead of a parsed object on some Neon HTTP driver versions.
**Why it happens:** Neon HTTP vs native pg driver handle JSONB differently. drizzle-orm with `neon-http` parses JSONB automatically in recent versions (confirmed 0.45.x).
**How to avoid:** Test that `typeof roomRow.draft_state === 'object'` after reading. Add explicit `JSON.parse` fallback if needed.
**Warning signs:** `draft_state.turnIndex` is `undefined` when room row is fetched.

### Pitfall 3: `loadLobbySnapshot` returns null for drafting rooms
**What goes wrong:** Calling `loadLobbySnapshot` after `phase` transitions to `'drafting'` returns a valid snapshot (the function calls `getRoomByPublicCode` which does return drafting rooms), but subsequent phases (draft completion) may break if the function is assumed to work for all phases.
**Why it happens:** `getRoomByPublicCode` only hides `ended` rooms — it returns `drafting` rooms fine. But the snapshot shape has no `draftState` field, so Phase 4 will be missing data if this isn't fixed now.
**How to avoid:** Create `loadDraftSnapshot` that extends the snapshot with `draftState` and `actions[]`. Phase 3 RPCs publish `loadDraftSnapshot`'s result, not `loadLobbySnapshot`.
**Warning signs:** Client receives a snapshot with `phase: 'drafting'` but no `turnIndex` or `turnEndsAt`.

### Pitfall 4: Settings lost when host refreshes
**What goes wrong:** Host configures a custom script, refreshes the page, and the settings are gone — because they are in the module-level Map which is in-process memory.
**Why it happens:** In-memory storage is intentional (D-10), but the UX implication is that the settings panel should re-initialize to the last known state from the published snapshot.
**How to avoid:** When `updateSettings` is called, publish the settings as part of the room snapshot so they are reflected in `streamVal`. When the component mounts, initialize the script editor from the snapshot's settings field. The Map is the server's working copy; the published snapshot is the client's source of truth.
**Warning signs:** Host refreshes mid-configuration and sees the default script instead of their custom one.

### Pitfall 5: Timer not cleared on room cancel
**What goes wrong:** `cancelRoom` is called during an active draft; the timer fires afterward and tries to write to a now-ended room.
**Why it happens:** `cancelRoomAsHost` in `rooms.js` does not know about the timer Map in `draft.js`.
**How to avoid:** Export `clearRoomTimer(roomId)` from `draft.js` and call it from the `cancelRoom` RPC in `room.js` before the room is ended. Or: the `autoAdvanceTurn` callback reads the room phase first and exits if `phase !== 'drafting'`.
**Warning signs:** DB error logged after room cancel — insert into `draft_action` where `room_id` is ended.

### Pitfall 6: Svelte 5 `{#key}` vs index for script turn list
**What goes wrong:** Using array index as the Svelte key for `ScriptTurnRow` causes DOM reuse on drag-reorder, corrupting select values.
**Why it happens:** Svelte reuses DOM nodes when the key is the same (index doesn't change on reorder).
**How to avoid:** Each turn object must have a stable `id` (e.g. from nanoid, assigned when a turn is added). Use `{#each script as turn, i (turn.id)}` — matches the UI-SPEC.
**Warning signs:** After a drag reorder, the selects show the wrong team/action values.

---

## Code Examples

### Conditional update to guard timer race (Drizzle + Neon HTTP)

```javascript
// Source: established Drizzle pattern from src/lib/server/rooms.js
import { eq, sql } from 'drizzle-orm';

async function advanceTurnIfCurrent(db, roomId, expectedTurnIndex, newTurnIndex, newTurnEndsAt) {
  const result = await db
    .update(room)
    .set({
      draft_state: sql`jsonb_set(jsonb_set(draft_state, '{turnIndex}', ${newTurnIndex}::text::jsonb), '{turnEndsAt}', ${JSON.stringify(newTurnEndsAt)}::jsonb)`,
      updated_at: new Date()
    })
    .where(
      sql`${room.id} = ${roomId} AND (${room.draft_state}->>'turnIndex')::int = ${expectedTurnIndex}`
    )
    .returning({ id: room.id });
  return result.length > 0; // false = someone else already advanced
}
```

### Default script constant

```javascript
// src/lib/draft-script.js
/** @type {{ team: 'A'|'B', action: 'pick'|'ban' }[]} */
export const DEFAULT_SCRIPT = [
  { team: 'A', action: 'ban' },
  { team: 'B', action: 'ban' },
  { team: 'A', action: 'ban' },
  { team: 'B', action: 'ban' },
  { team: 'A', action: 'pick' },
  { team: 'B', action: 'pick' },
  { team: 'B', action: 'pick' },
  { team: 'A', action: 'pick' },
  { team: 'A', action: 'pick' },
  { team: 'B', action: 'pick' }
];

export const DEFAULT_TIMER_MS = 30_000;
```

### Drizzle schema additions

```javascript
// In src/lib/server/db/schema.js — additions to existing file
import { jsonb } from 'drizzle-orm/pg-core';

// Extend room table: add draft_state column
// (Drizzle Kit will diff and generate ALTER TABLE migration)
draft_state: jsonb('draft_state')

// New table
export const draft_action = pgTable(
  'draft_action',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    room_id: uuid('room_id').notNull().references(() => room.id, { onDelete: 'cascade' }),
    turn_index: integer('turn_index').notNull(),
    team: text('team').notNull(),
    action: text('action').notNull(),   // 'pick' | 'ban' | 'timeout'
    champion_id: text('champion_id'),   // null for timeout turns
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [
    index('draft_action_room_id_idx').on(t.room_id),
    uniqueIndex('draft_action_room_turn_unique').on(t.room_id, t.turn_index)
  ]
);
```

### svelte-realtime test pattern for draft RPCs

```javascript
// src/live/draft.spec.js — follows src/live/room.spec.js pattern
import { createTestEnv } from 'svelte-realtime/test';
import { LiveError } from 'svelte-realtime/server';
import * as draftModule from './draft.js';

const env = createTestEnv();

it('non-captain pickBan rejects with FORBIDDEN', async () => {
  vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue({
    ...baseRoom,
    phase: 'drafting',
    draft_state: { script: DEFAULT_SCRIPT, turnIndex: 0, turnEndsAt: '...', timerMs: 30000 }
  });
  // mock room_member to return no captain match for this user
  env.register('draft', draftModule);
  const client = env.connect({ role: 'player', id: 'non-captain', name: 'X' });
  const err = await client.call('draft/pickBan', 'abc1234', { championId: 'bakko' }).catch(e => e);
  expect(err).toBeInstanceOf(LiveError);
  expect(err.code).toBe('FORBIDDEN');
});
```

### HTML DnD drag-to-reorder (ScriptTurnRow pattern)

```svelte
<!-- src/lib/components/atoms/ScriptTurnRow.svelte -->
<!-- Source: UI-SPEC + browser-native DnD API -->
<script>
  let { turn, index, onDragStart, onDragOver, onDrop, onRemove, onUpdate } = $props();
  let dragging = $state(false);
  let dragOver = $state(false);
</script>

<li
  class="rounded-md border {dragOver ? 'border-amber-400' : 'border-bg-secondary'} {dragging ? 'opacity-50' : ''} bg-bg-primary px-3 py-2 flex items-center gap-2"
  draggable="true"
  ondragstart={(e) => { dragging = true; onDragStart(e, index); }}
  ondragend={() => { dragging = false; }}
  ondragover={(e) => { e.preventDefault(); dragOver = true; onDragOver(e, index); }}
  ondragleave={() => { dragOver = false; }}
  ondrop={(e) => { dragOver = false; onDrop(e, index); }}
>
  <!-- grip handle, index, team select, action select, remove button -->
</li>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Svelte 4 reactive assignments | Svelte 5 runes (`$state`, `$derived`, `$props`) | Svelte 5.0 | Use runes everywhere in new .svelte files |
| drizzle-orm/pg-core jsonb via text | First-class `jsonb()` column type | drizzle-orm ~0.30+ | `jsonb('col')` is the correct import; Drizzle auto-parses on read |
| Interactive transactions with pg | Sequential writes with Neon HTTP | Phase 2 decision | Multi-step draft mutations remain sequential; unique constraint is the consistency guard |

**Deprecated/outdated:**
- `$: reactive` assignments — not used; Svelte 5 runes only (project global setting in `svelte.config.js`).
- `import { json } from 'drizzle-orm/pg-core'` — use `jsonb` instead for PostgreSQL JSONB column type.

---

## Open Questions

1. **LobbyHostBar receives `onStartDraft` callback — should settings state be lifted to the page, or stay in DraftSettingsPanel?**
   - What we know: `startDraft` RPC in `room.js` will need the resolved settings. The page already orchestrates all RPC calls. UI-SPEC says DraftSettingsPanel can manage state internally or receive props.
   - What's unclear: If settings stay inside DraftSettingsPanel, the `handleStart` function in `+page.svelte` cannot read them directly.
   - Recommendation: Lift `script` and `timerSeconds` state to `+page.svelte` (or pass as writable props to DraftSettingsPanel). `handleStart` passes them to the `startDraft` RPC call. This is cleaner and consistent with how other host actions pass payloads.

2. **Should `updateSettings` be a separate RPC or handled entirely client-side until startDraft?**
   - What we know: D-10 says settings are in-memory until draft starts. The UI-SPEC does not specify a live broadcast of settings changes.
   - What's unclear: If two hosts could somehow both be connected (they can't — host is fixed), but more relevantly: if the host refreshes, settings need to be visible again.
   - Recommendation: Settings state lives client-side in `+page.svelte`. When host clicks "Start draft", the current settings are sent as part of the `startDraft` RPC payload. No `updateSettings` RPC needed. This eliminates the in-memory Map for settings and makes Phase 3 simpler. The planner should make the final call.

3. **Does `loadLobbySnapshot` need to be extended or replaced for `phase === 'drafting'`?**
   - What we know: Phase 3 RPCs need to publish a snapshot that clients can use. Phase 4 will need `draftState` and `actions[]` in the snapshot. Phase 3 (server engine) only needs clients to see `phase: 'drafting'`.
   - Recommendation: Extend `loadLobbySnapshot` to include `draftState` (from `room.draft_state`) when `phase === 'drafting'`. This keeps the single snapshot function and avoids breaking the `fromStore(lobby(code))` stream that the draft page already subscribes to.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | svelte-realtime, setTimeout | ✓ | ≥18 (implied by Vite 7) | — |
| Neon HTTP / DATABASE_URL | draft_action writes | ✓ | @neondatabase/serverless 1.0.2 | — |
| Drizzle Kit | db:generate + db:migrate | ✓ | 0.31.10 | — |
| svelte-realtime/test | draft RPC unit tests | ✓ | 0.4.6 (installed) | — |
| HTML Drag and Drop API | ScriptTurnRow DnD | ✓ | Baseline browser API | Keyboard-only (selects) per UI-SPEC |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None. All required dependencies are already installed.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vite.config.js` (merged config, two projects: `client` + `server`) |
| Quick run command | `npm run test -- --project=server --reporter=verbose` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DRAFT-01 | Default script constant is correct shape and 10 turns | unit | `npm run test -- --project=server src/lib/draft-script.spec.js -t "default script"` | ❌ Wave 0 |
| DRAFT-02 | `startDraft` RPC writes `draft_state` with `turnEndsAt` and publishes snapshot | unit (mock DB) | `npm run test -- --project=server src/live/draft.spec.js -t "startDraft"` | ❌ Wave 0 |
| DRAFT-03 | `pickBan` rejects when caller is not the active team's captain | unit (mock DB) | `npm run test -- --project=server src/live/draft.spec.js -t "non-captain"` | ❌ Wave 0 |
| DRAFT-03 | `pickBan` rejects when champion already picked/banned | unit (mock DB) | `npm run test -- --project=server src/live/draft.spec.js -t "duplicate champion"` | ❌ Wave 0 |
| DRAFT-04 | Timer callback: conditional update is no-op if turn already advanced | unit (mock DB + vi.useFakeTimers) | `npm run test -- --project=server src/live/draft.spec.js -t "timer no-op"` | ❌ Wave 0 |
| DRAFT-04 | Timer callback advances turn and publishes if still current | unit (mock DB + vi.useFakeTimers) | `npm run test -- --project=server src/live/draft.spec.js -t "timer advances"` | ❌ Wave 0 |
| DRAFT-05 | `pickBan` on last turn triggers draft completion (phase=ended) | unit (mock DB) | `npm run test -- --project=server src/live/draft.spec.js -t "draft completion"` | ❌ Wave 0 |
| DRAFT-06 | `updateSettings` (or startDraft with payload) applies custom script | unit | `npm run test -- --project=server src/live/draft.spec.js -t "custom script"` | ❌ Wave 0 |
| HOST-01 | Settings panel renders when phase=lobby, hidden when phase=drafting | unit (browser) | `npm run test -- --project=client src/lib/components/molecules/DraftSettingsPanel.svelte.spec.js` | ❌ Wave 0 |
| LIST-01 | classes.json has 28 entries; each has id, name, role fields | unit | `npm run test -- --project=server src/lib/catalog/classes.spec.js` | ❌ Wave 0 |
| DRAFT-01 | `draft_action` schema: unique constraint rejects duplicate (room_id, turn_index) | unit (mock DB) | `npm run test -- --project=server src/lib/server/draft.spec.js -t "unique constraint"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test -- --project=server --reporter=dot`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/draft-script.spec.js` — covers DRAFT-01 (default script shape/length)
- [ ] `src/lib/catalog/classes.spec.js` — covers LIST-01 (28 entries, correct fields)
- [ ] `src/lib/server/draft.spec.js` — covers DB layer for draft actions
- [ ] `src/live/draft.spec.js` — covers DRAFT-02 through DRAFT-06, timer behavior
- [ ] `src/lib/components/molecules/DraftSettingsPanel.svelte.spec.js` — covers HOST-01 settings panel visibility

---

## Project Constraints (from CLAUDE.md)

The following directives are extracted from `CLAUDE.md` and must be honored by the planner:

| Directive | Impact on Phase 3 |
|-----------|-------------------|
| **Language: JavaScript (JSDoc)** | All new files: `.js` with `@ts-nocheck` or JSDoc types. No TypeScript source files. |
| **Package Manager: npm** | All install commands use `npm install`. |
| **Add-ons in use: vitest** | Tests written with vitest + `createTestEnv` from svelte-realtime/test. |
| **Add-ons in use: drizzle** | Schema changes via `src/lib/server/db/schema.js`; migrations via `npm run db:generate && npm run db:migrate`. |
| **Add-ons in use: tailwindcss** | New component classes use Tailwind v4 utility classes; no inline styles. |
| **Svelte MCP server** | Use `list-sections` + `get-documentation` + `svelte-autofixer` for any new Svelte component authoring. |
| **Svelte 5 runes** | `$state`, `$derived`, `$props` everywhere — no Svelte 4 syntax. |
| **Prettier config** | Tabs, single quotes, `trailingComma: "none"`, `printWidth: 100`. |
| **Import order** | Framework (`$app/*`, `@sveltejs/kit`) → `$lib/...` → third-party. |

---

## Sources

### Primary (HIGH confidence)

- `src/live/room.js` — All live RPC patterns read directly from codebase
- `src/lib/server/rooms.js` — All DB mutation patterns and error constants
- `src/lib/server/db/schema.js` — Current Drizzle schema (room + room_member)
- `src/routes/draft/[id]/+page.svelte` — Current draft page, fromStore pattern
- `src/lib/components/molecules/LobbyHostBar.svelte` — Existing component structure to modify
- `.planning/phases/03-draft-engine/03-CONTEXT.md` — All locked decisions
- `.planning/phases/03-draft-engine/03-UI-SPEC.md` — Component inventory, DnD approach, default script
- `.planning/codebase/ARCHITECTURE.md` — Layer definitions
- `.planning/codebase/STACK.md` — Verified dependency versions
- `.planning/codebase/CONVENTIONS.md` — Naming and code style rules
- `node_modules/svelte-realtime/package.json` — Confirmed exports: `.`, `./server`, `./client`, `./vite`, `./devtools`, `./test`
- `src/live/room.spec.js` — `createTestEnv` usage pattern for draft test harness
- `package.json` — All installed package versions confirmed

### Secondary (MEDIUM confidence)

- npm registry: `svelte-realtime@0.4.6`, `drizzle-orm@0.45.2`, `nanoid@5.1.7` — current published versions verified via `npm view`

### Tertiary (LOW confidence)

- None — all claims verified from installed codebase or npm registry.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all packages verified from `node_modules` and `npm view`
- Architecture: HIGH — patterns read directly from existing source; no inference from training data
- Pitfalls: HIGH (pitfalls 1–3, 5–6) / MEDIUM (pitfall 4 — settings-lost UX is a design observation, not a tested behavior) — derived from reading existing code and known Node.js patterns
- Test map: HIGH — matches existing test file patterns (`room.spec.js`, `rooms.spec.js`)

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable stack; svelte-realtime 0.4.x is pinned)
