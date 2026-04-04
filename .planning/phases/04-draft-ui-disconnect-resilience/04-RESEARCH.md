# Phase 4: Draft UI & Disconnect Resilience - Research

**Researched:** 2026-04-04
**Domain:** Svelte 5 UI patterns, svelte-realtime WebSocket lifecycle, server-side disconnect/grace-timer logic
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** When `phase === 'drafting'`, replace the TeamColumn/LobbyHostBar lobby layout entirely with a dedicated draft board component.
- **D-02:** Draft board shows: champion picker grid (center), team pick/ban slots (sides), active turn indicator, and timer.
- **D-03:** Champions rendered as a responsive grid of cards — icon/image + name. Banned or picked champions are visually grayed out and non-interactive. Click to select, confirm to submit pick/ban.
- **D-04:** Catalog is 28 champions — no search/filter needed; grid fits on one screen.
- **D-05:** History displayed as team columns with slots — Team A and Team B each show their pick slots and ban slots. Slots fill in as draft progresses (like League of Legends draft style). Enables at-a-glance team comparison.
- **D-06:** Large seconds-remaining countdown number + shrinking progress bar below the active turn indicator. Bar turns red when ≤10 seconds remaining. Timer is derived client-side from `turnEndsAt` timestamp emitted by server (DRAFT-02 already validated).
- **D-07:** When active captain disconnects: full-screen semi-transparent pause overlay covers the draft board. Overlay shows which captain disconnected, a grace period countdown (30s), and "Waiting for reconnect…". No picks are possible while overlay is visible.
- **D-08:** When grace expires and another team member is promoted: inline status message within the overlay/board — "[Name] is now captain for Team X. Draft resumes." Clears after ~3 seconds, overlay dismisses.
- **D-09:** When no team member is available after grace: draft is cancelled, all participants see a "Draft cancelled — no captain available" message and are returned to lobby or shown an end state.
- **D-10:** On reconnect, show a brief "Reconnected — syncing…" banner while the server snapshot loads, then dismiss. Client receives full server-authoritative snapshot via `loadDraftSnapshot()`. No stale local state. (DISC-04)

### Claude's Discretion
- Exact champion card dimensions and grid column count (responsive)
- Specific Tailwind classes and color tokens (follow existing app conventions)
- Animation/transition details for slot fills and overlay entrance
- Whether to use a dedicated route or conditional rendering within `/draft/[id]/+page.svelte`
- Timer tick mechanism (setInterval vs requestAnimationFrame)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DRAFT-07 | UI clearly shows: whose turn it is, time remaining (countdown), and a live history of all bans and picks | Snapshot shape confirmed; `draftState.turnIndex`, `draftState.turnEndsAt`, and `actions[]` array drive all three displays |
| DISC-01 | If the active captain disconnects, the draft pauses and a grace period (~30 seconds) begins | `close` export from `svelte-realtime/server` + `onUnsubscribe` on lobby stream provide the disconnect hook; grace timer uses same `scheduleTimer` pattern as draft timers |
| DISC-02 | If the captain does not reconnect within the grace period, another player on that team is promoted to captain and the draft resumes | DB layer: `UPDATE room_member SET is_captain=true` for next eligible member; publish snapshot to resume |
| DISC-03 | If no other player is available on the team, the draft is cancelled and all participants are notified | Reuse `cancelRoomAsHost` pattern + publish cancellation snapshot |
| DISC-04 | On reconnect, the client is hydrated from a server-authoritative snapshot (no stale local state) | `loadDraftSnapshot()` already returns full state; lobby stream init fn re-runs on reconnect by default |
</phase_requirements>

---

## Summary

Phase 4 has two independent halves that share the same pub/sub topic (`topicForRoom(code)`): the **draft board UI** and **server-side disconnect resilience**.

For the UI half, all data is already available in the snapshot returned by `loadDraftSnapshot()` — which extends the lobby snapshot with `draftState` (containing `script`, `turnIndex`, `turnEndsAt`, `timerMs`) and `actions[]`. The existing `lobby` stream in `room.js` currently publishes lobby snapshots; during the drafting phase the snapshot contains draft state as well. The `+page.svelte` already subscribes to this stream via `fromStore(lobby(code)).current`. Phase 4 adds a `{#if snapshot.phase === 'drafting'}` branch that renders a `DraftBoard` component instead of the lobby layout.

For the disconnect half, `svelte-realtime/server` exports a `close` function that fires `onUnsubscribe` lifecycle hooks on all streams the closing WebSocket was subscribed to. The `lobby` stream (which clients subscribe to during the draft) can be extended with an `onUnsubscribe` option. Inside that hook, the disconnecting user's identity is available via `ctx.user`. The grace timer follows the same `scheduleTimer` pattern already used by `draft-timers.js`. A critical gap identified in Phase 3 (no `ctx.publish` available in `autoAdvanceTurn`) must be resolved for Phase 4: the plan must add a standalone publish after timer-driven turn advances so clients see updates reactively, not only on reconnect.

**Primary recommendation:** Add `onUnsubscribe` to the `lobby` stream to detect captain disconnect; use `scheduleTimer` for the 30-second grace; publish snapshots via `platform.publish` (available in `onUnsubscribe` ctx). On the UI side, use conditional rendering inside `+page.svelte` branching on `snapshot.phase === 'drafting'`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| svelte | ^5.51.0 | UI components | Project language; Svelte 5 runes throughout |
| svelte-realtime | ^0.4.6 | WebSocket streams + RPC | Established transport for this project |
| svelte-adapter-uws | ^0.4.5 | uWebSockets.js adapter | Project-locked; provides WS close/open hooks |
| tailwindcss | ^4.1.18 | Styling | Project-wide; v4 utility classes + color tokens |
| drizzle-orm | ^0.45.1 | DB queries for promotion logic | Project-wide; used in all server modules |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^4.1.0 | Unit tests (server project) | Server-side logic: disconnect handler, promotion, cancel |
| vitest-browser-svelte | ^2.0.2 | Component tests (browser project) | Svelte component behavior tests |
| playwright | ^1.58.2 | Browser test driver | Backs the browser vitest project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| conditional rendering in +page.svelte | dedicated /draft/[id]/drafting route | Conditional rendering is simpler; no additional route needed since phase already has snapshot.phase signal |
| setInterval for timer tick | requestAnimationFrame | Both work; setInterval is simpler and does not require import; rAF is smoother but overkill for a 1-second tick |
| onUnsubscribe on lobby stream | separate `open`/`close` hook in hooks.ws.js | onUnsubscribe gives topic-scoped context (which stream disconnected); raw close hook requires manual topic resolution |

**No new packages required.** All functionality available in existing stack.

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
src/
├── live/
│   └── room.js              # Add onUnsubscribe to lobby stream; add grace-timer and promotion logic
│   └── draft.js             # Add platform.publish to autoAdvanceTurn (critical gap from Phase 3)
├── lib/
│   └── server/
│       └── rooms.js         # Add promoteCaptain(), cancelDraftForRoom() DB helpers
│   └── components/
│       └── molecules/
│           ├── DraftBoard.svelte          # Top-level draft layout (replaces lobby layout)
│           ├── ChampionGrid.svelte        # 28-card responsive grid
│           ├── ChampionCard.svelte        # Single champion card (greyed-out when used)
│           ├── DraftTeamColumn.svelte     # Pick/ban slot column (Team A or B)
│           ├── TurnIndicator.svelte       # "Team X's turn" + timer countdown
│           └── DisconnectOverlay.svelte   # Full-screen pause overlay
└── routes/
    └── draft/[id]/
        └── +page.svelte     # Add {#if snapshot.phase === 'drafting'} branch
```

### Pattern 1: Conditional Phase Rendering

**What:** Branch inside `+page.svelte` on `snapshot.phase`.
**When to use:** The existing `lobby()` stream already carries the full snapshot. No new stream subscription needed.

```javascript
// +page.svelte (Svelte 5 rune style — existing pattern in project)
// snapshot is already $derived from fromStore(lobby(code)).current
{#if snapshot.phase === 'drafting'}
  <DraftBoard {snapshot} userId={data.userId} onPickBan={handlePickBan} />
{:else}
  <!-- existing lobby layout -->
{/if}
```

The `snapshot` shape during drafting phase:
```javascript
{
  publicCode: string,
  roomId: string,
  phase: 'drafting',
  hostUserId: string,
  teams: { A: LobbyMember[], B: LobbyMember[] },
  spectators: LobbyMember[],
  draftState: {           // DraftState typedef from schema.js
    script: { team: 'A'|'B', action: 'pick'|'ban' }[],
    turnIndex: number,
    turnEndsAt: string,   // ISO timestamp
    timerMs: number
  },
  actions: {
    id: string,
    room_id: string,
    turn_index: number,
    team: string,
    action: string,       // 'pick' | 'ban' | 'timeout'
    champion_id: string | null,
    created_at: Date
  }[]
}
```

### Pattern 2: Client-Side Timer Derived from `turnEndsAt`

**What:** Compute seconds remaining by diffing `turnEndsAt` ISO timestamp against `Date.now()` each second.
**When to use:** DRAFT-02 mandates server-authoritative timestamp; clients must not own their own countdown.

```javascript
// In TurnIndicator.svelte — Svelte 5 rune style
let secondsLeft = $state(0);
let timerMs = $derived(snapshot?.draftState?.timerMs ?? 30000);

$effect(() => {
  const turnEndsAt = snapshot?.draftState?.turnEndsAt;
  if (!turnEndsAt) return;

  function tick() {
    const remaining = Math.max(0, Math.round((new Date(turnEndsAt).getTime() - Date.now()) / 1000));
    secondsLeft = remaining;
  }
  tick(); // immediate
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
});

// Bar turns red at ≤10s
const urgency = $derived(secondsLeft <= 10);
// Progress bar width %
const barWidth = $derived(timerMs > 0 ? Math.max(0, (secondsLeft * 1000) / timerMs) * 100 : 100);
```

### Pattern 3: Disconnect Detection via `onUnsubscribe`

**What:** The `lobby` stream `onUnsubscribe` hook fires when a client's WebSocket closes (handled by `close` export from `svelte-realtime/server`).
**When to use:** Any server-side reaction to client disconnect during drafting.

The `close` export signature (from server.d.ts):
```javascript
export function close(ws, { platform }): void;
```

To enable it, export `close` from `hooks.ws.js`:
```javascript
// hooks.ws.js — add alongside existing message export
export { message, close } from 'svelte-realtime/server';
```

The `onUnsubscribe` hook on the lobby stream:
```javascript
// room.js
export const lobby = live.stream(
  (ctx, publicCode) => topicForRoom(normalizePublicCode(publicCode)),
  async (ctx, publicCode) => { /* existing init */ },
  {
    merge: 'set',
    access: () => true,
    onUnsubscribe: async (ctx, topic) => {
      // ctx.user is the disconnecting user (role, id, name)
      // ctx.publish is available for broadcasting
      await handleCaptainDisconnect(ctx.user, topic, ctx.publish);
    }
  }
);
```

`handleCaptainDisconnect` flow (new function in room.js or a dedicated disconnect.js):
1. Parse room code from topic via `topicForRoom` reverse (or store code in topic to parse directly)
2. Query DB: is this user currently the active turn's captain in a drafting room?
3. If yes: set `room.draft_state.paused = true` (or a separate flag), publish pause snapshot, schedule 30s grace timer
4. If no: no-op

### Pattern 4: Grace Timer with Captain Promotion

**What:** After 30s, query team members ordered by `joined_at`, promote first non-captain member, publish resume.
**When to use:** Grace expires without reconnect (DISC-02).

```javascript
// Conceptual flow in a new disconnectGraceExpired(roomId, disconnectedUserId) function
async function disconnectGraceExpired(roomId, publicCode, disconnectedUserId) {
  const roomRow = await getRoomByPublicCode(db, publicCode);
  if (!roomRow || roomRow.phase !== 'drafting') return; // already resolved

  // Check if disconnected user reconnected (captain for their team restored)
  const currentTurn = roomRow.draft_state.script[roomRow.draft_state.turnIndex];
  const captains = await db.select(...).where(isCaptainOfTeam(roomId, currentTurn.team));
  const reconnected = captains.some(c => c.userId === disconnectedUserId);
  if (reconnected) return; // grace resolved naturally

  // Promote next eligible member on same team
  const eligible = await db.select(...from room_member)
    .where(and(eq(room_id, roomId), eq(team, currentTurn.team), isNotNull(user_id), ne(user_id, disconnectedUserId)))
    .orderBy(asc(joined_at));

  if (eligible.length > 0) {
    // demote old captain, promote new
    await db.update(room_member).set({ is_captain: false }).where(captainFilter);
    await db.update(room_member).set({ is_captain: true }).where(eq(user_id, eligible[0].userId));
    // publish resume snapshot — unpause draft
    const snap = await loadDraftSnapshot(db, publicCode);
    publish(topicForRoom(publicCode), 'set', snap);
  } else {
    // DISC-03: no eligible member — cancel draft
    await cancelRoomAsHost(...); // or a dedicated cancelDraftNoCaption() variant
    const snap = await loadDraftSnapshot(db, publicCode); // phase will be 'ended' or 'cancelled'
    publish(topicForRoom(publicCode), 'set', snap);
  }
}
```

### Pattern 5: Reconnect Hydration (DISC-04)

**What:** The `lobby` stream init function re-runs when the client reconnects and re-subscribes. No extra client logic needed — `svelte-realtime` client automatically re-subscribes streams on reconnect.
**When to use:** Client reconnects during draft.

The existing `lobby` stream init already calls `loadDraftSnapshot` indirectly (the `startDraft` RPC publishes a draft snapshot, and the stream returns it on re-subscribe). Verify: the lobby stream init currently calls `loadLobbySnapshot`, not `loadDraftSnapshot`. **This is a gap**: when `phase === 'drafting'`, the stream init must return the full draft snapshot, not just the lobby snapshot.

Fix in `room.js` lobby stream init:
```javascript
async (ctx, publicCode) => {
  const code = normalizePublicCode(publicCode);
  const roomRow = await getRoomByPublicCode(db, code);
  if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');
  if (ctx.user?.role === 'guest' && ctx.user?.guestId) {
    await upsertGuestSpectator(db, roomRow.id, ctx.user.guestId);
  }
  // Return draft snapshot when drafting, lobby snapshot otherwise
  if (roomRow.phase === 'drafting') {
    const snap = await loadDraftSnapshot(db, code);
    if (!snap) throw new LiveError('NOT_FOUND', 'Room not found');
    return snap;
  }
  const snap = await loadLobbySnapshot(db, code);
  if (!snap) throw new LiveError('NOT_FOUND', 'Room not found');
  return snap;
},
```

### Pattern 6: Pause State in Snapshot

**What:** The draft must communicate "paused" state to all clients for the overlay (D-07).
**When to use:** Captain disconnects; grace timer running.

Two options:
1. Add `paused: boolean` and `pausedBy: string` (userId) and `graceEndsAt: string` (ISO) to `DraftState` JSONB — stored in DB, survives server restart.
2. In-memory flag only (lost on restart). **Option 1 is required** because the spec says "no stale local state" and new clients joining during pause must see the overlay.

The `DraftState` typedef in `schema.js` needs extension:
```javascript
/**
 * @typedef {object} DraftState
 * @property {{ team: 'A'|'B', action: 'pick'|'ban' }[]} script
 * @property {number} turnIndex
 * @property {string} turnEndsAt   - ISO timestamp
 * @property {number} timerMs
 * @property {boolean} [paused]          - NEW: true when captain disconnect grace is active
 * @property {string} [pausedUserId]     - NEW: userId of disconnected captain
 * @property {string} [graceEndsAt]      - NEW: ISO timestamp when grace expires
 */
```

### Anti-Patterns to Avoid

- **Watching `autoAdvanceTurn` without publish**: The Phase 3 comment notes no `ctx` is available outside RPC, so timer-based advances don't push updates. Phase 4 must resolve this by using a standalone `platform.publish`. The `lobby` stream uses `merge: 'set'`, so a full snapshot publish to `topicForRoom(code)` updates all subscribers.
- **Tracking disconnect in-memory only**: An in-memory "connected users" set is unreliable; use the DB-backed `paused` flag approach so new subscribers see correct state.
- **Calling `cancelRoomAsHost` from disconnect handler**: `cancelRoomAsHost` checks `hostUserId`; the disconnect handler runs as the disconnected user, not necessarily the host. Use a dedicated `cancelDraftNoCaption(db, roomId)` helper that does not require host check.
- **Debounce-less disconnect reaction**: Network hiccups cause very brief disconnects. Adding a short debounce (1-2s) before starting the grace timer prevents false positives. However, DISC-01 says "~30 seconds" — the spec intent is the grace period itself provides the buffer. Keep the debounce minimal or omit if complexity outweighs benefit.
- **Re-using the draft turn timer for the grace timer**: They are independent timers. The turn timer continues paused (turn timer should be cleared/paused while paused flag is set, then rescheduled from the remaining time on resume). Simplest correct approach: cancel the turn timer on disconnect, restart it from full `timerMs` on resume (acceptable per spec since the pause overlay already communicates the situation).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket disconnect detection | Custom `open`/tracking set | `onUnsubscribe` on `live.stream` + `export { close } from 'svelte-realtime/server'` | Already tracks per-socket subscriptions with topic context |
| Real-time snapshot push without RPC ctx | Store publish ref manually | `platform` is available in `onUnsubscribe` ctx; call `ctx.publish(topic, 'set', snap)` | `_buildCtx` in server.js populates `publish` in close context |
| Reactive store wrapping | Custom Svelte store | `fromStore()` from `svelte/store` — already used in `+page.svelte` | Converts Svelte store to rune-compatible `{ current }` |
| Grace timer | Custom `setTimeout` wrapper | Reuse `scheduleTimer` / `clearRoomTimer` from `draft-timers.js` | Already handles Map-keyed timers by room ID; prevents double-fire |
| Champion "already used" list | Separate state | Derive from `snapshot.actions` array — filter for non-null champion_id entries | Actions array is authoritative source; no extra state needed |

**Key insight:** The `publish` function is available in `onUnsubscribe` ctx (see `_buildCtx` in server.js line 2568: `closeCtx = { user, ws, platform, publish: _getCtxHelpers(platform).publish, ... }`). This means the disconnect handler can broadcast snapshots to all remaining subscribers without needing a separate publish mechanism.

---

## Common Pitfalls

### Pitfall 1: Lobby Stream Returns Stale Lobby Snapshot During Drafting

**What goes wrong:** A client reconnects during the draft; the `lobby` stream init returns `loadLobbySnapshot()` which does NOT include `draftState` or `actions[]`. Client renders an empty/incorrect draft board.
**Why it happens:** The current `lobby` init always calls `loadLobbySnapshot` regardless of `roomRow.phase`.
**How to avoid:** Branch on `roomRow.phase === 'drafting'` inside the init fn and return `loadDraftSnapshot()` instead.
**Warning signs:** Reconnecting during a draft shows lobby layout or empty draft board.

### Pitfall 2: `autoAdvanceTurn` Does Not Publish — Clients See Stale State

**What goes wrong:** Timer fires, turn advances in DB, but no pub/sub event is sent. Clients do not update until their next interaction.
**Why it happens:** Phase 3 left a TODO: "no ctx available outside RPC — clients will see the update on next snapshot request". The `platform` object is not stored.
**How to avoid:** Capture the platform reference via `setCronPlatform` (exported from `svelte-realtime/server`) or pass it explicitly to `autoAdvanceTurn`. Then call `platform.publish(topicForRoom(code), 'set', snap)` after advancing.
**Warning signs:** Timer-based turn advances not reflected in UI until next pick/ban.

### Pitfall 3: Grace Timer Fires After Draft Completion or Reconnect

**What goes wrong:** Grace timer fires, promotes a player or cancels the draft even though the disconnected captain reconnected or the draft ended for other reasons.
**Why it happens:** The `scheduleTimer` callback does not know what happened in between.
**How to avoid:** At the start of `disconnectGraceExpired`, re-fetch the room row. Check:
  - `roomRow.phase !== 'drafting'` → no-op (draft ended)
  - `roomRow.draft_state.paused !== true` → no-op (captain reconnected and cleared the pause flag)
  - Captain for current turn team is already present → no-op
**Warning signs:** Spurious captain promotions or cancellations after reconnect.

### Pitfall 4: Captain Reconnect Does Not Clear Pause Flag

**What goes wrong:** Captain reconnects, overlay stays on screen for all clients.
**Why it happens:** The `onUnsubscribe` hook fires on disconnect but there is no symmetric `onSubscribe` hook that detects the captain reconnecting.
**How to avoid:** Add `onSubscribe` to the lobby stream. When a player subscribes and the room is `paused` and they are the paused captain, clear the pause flag, cancel the grace timer, and publish the resumed snapshot.
**Warning signs:** Overlay persists after the captain reconnects; picks become impossible.

### Pitfall 5: `cancelRoomAsHost` Host Check Fails in Disconnect Handler

**What goes wrong:** `cancelDraftNoCaption` calls `cancelRoomAsHost` which checks `hostUserId === ctx.user.id`; this fails when the disconnecting user is not the host.
**Why it happens:** `cancelRoomAsHost` was designed for explicit host cancellation; it enforces host identity.
**How to avoid:** Add a new `cancelDraftNoCaption(db, roomId)` that sets `phase = 'cancelled'` (or 'ended') and `ended_at = now()` directly, without host check.
**Warning signs:** Draft cancellation on no-captain scenario silently fails; room stays in drafting phase indefinitely.

### Pitfall 6: `close` Export Not Added to `hooks.ws.js`

**What goes wrong:** `onUnsubscribe` callbacks on streams never fire on disconnect; disconnect logic is completely inert.
**Why it happens:** `svelte-realtime/server` exports `close` but it must be re-exported from `hooks.ws.js` to be wired into the uWS close handler.
**How to avoid:** Add `export { message, close } from 'svelte-realtime/server'` to `hooks.ws.js`.
**Warning signs:** No grace timers ever start; verified by adding a console.log in onUnsubscribe that never fires.

### Pitfall 7: Svelte 5 `$effect` Cleanup on Timer

**What goes wrong:** setInterval for countdown timer leaks when the component unmounts or `turnEndsAt` changes.
**Why it happens:** Without a cleanup function returned from `$effect`, the interval keeps firing.
**How to avoid:** Always `return () => clearInterval(id)` inside the `$effect`. The cleanup runs before the next effect re-run and on unmount.
**Warning signs:** Multiple intervals stacking; countdown accelerates.

---

## Code Examples

### `onUnsubscribe` Hook Integration

```javascript
// src/live/room.js — confirmed pattern from svelte-realtime server.d.ts
export const lobby = live.stream(
  (ctx, publicCode) => topicForRoom(normalizePublicCode(publicCode)),
  async (ctx, publicCode) => {
    // ... existing init ...
  },
  {
    merge: 'set',
    access: () => true,
    onSubscribe: async (ctx, topic) => {
      // Fires when client (re)subscribes — use for captain reconnect detection
      await handleCaptainReconnect(ctx.user, topic, ctx.publish);
    },
    onUnsubscribe: async (ctx, topic) => {
      // Fires when client disconnects — ctx.publish is available
      await handleCaptainDisconnect(ctx.user, topic, ctx.publish);
    }
  }
);
```
Source: `node_modules/svelte-realtime/server.d.ts` StreamOptions interface, lines 86-92.

### Standalone Publish for `autoAdvanceTurn`

```javascript
// src/live/draft.js — resolve platform reference
// Option A: pass platform into autoAdvanceTurn from room.js scheduleTimer callback
// (room.js has ctx.platform available in the startDraft RPC)

// In room.js startDraft RPC:
scheduleTimer(roomRow.id, timerMs, () => autoAdvanceTurn(code, 0, ctx.platform));

// autoAdvanceTurn signature:
export async function autoAdvanceTurn(publicCode, expectedTurnIndex, platform) {
  // ... existing logic ...
  if (platform) {
    const snap = await loadDraftSnapshot(db, code);
    platform.publish(topicForRoom(code), 'set', snap);
  }
}
```
Source: Confirmed from Phase 3 code comment in `src/live/draft.js` line 72-74 and `server.d.ts` `Platform['publish']` type.

### DraftBoard Component Skeleton (Svelte 5)

```svelte
<!-- src/lib/components/molecules/DraftBoard.svelte -->
<script>
  /** @type {{ snapshot: import('$live/room').DraftSnapshot, userId: string|null, onPickBan: Function }} */
  let { snapshot, userId, onPickBan } = $props();

  const draftState = $derived(snapshot.draftState);
  const actions = $derived(snapshot.actions ?? []);
  const usedChampionIds = $derived(
    new Set(actions.filter(a => a.champion_id).map(a => a.champion_id))
  );
  const currentTurn = $derived(
    draftState ? draftState.script[draftState.turnIndex] : null
  );
  const isPaused = $derived(draftState?.paused ?? false);

  let selectedChampionId = $state(/** @type {string|null} */ (null));
</script>

{#if isPaused}
  <DisconnectOverlay {draftState} />
{/if}

<div class="grid grid-cols-[1fr_2fr_1fr] gap-4">
  <DraftTeamColumn team="A" {snapshot} {actions} />
  <div class="flex flex-col gap-4">
    <TurnIndicator {currentTurn} {draftState} />
    <ChampionGrid champions={catalog} {usedChampionIds} bind:selected={selectedChampionId} />
    <!-- confirm button only for active captain -->
  </div>
  <DraftTeamColumn team="B" {snapshot} {actions} />
</div>
```

### Champion Card Disabled State

```svelte
<!-- ChampionCard.svelte -->
<script>
  let { champion, isUsed = false, isSelected = false, onSelect } = $props();
</script>

<button
  type="button"
  disabled={isUsed}
  class={[
    'rounded-md border p-2 text-center transition-colors',
    isUsed ? 'cursor-not-allowed opacity-40 grayscale' : 'cursor-pointer hover:bg-bg-secondary',
    isSelected ? 'border-amber-500 bg-amber-500/10' : 'border-bg-secondary'
  ].join(' ')}
  onclick={() => !isUsed && onSelect?.(champion.id)}
>
  <span class="block text-xs font-medium text-text-primary">{champion.name}</span>
</button>
```

---

## Runtime State Inventory

> Not a rename/refactor phase. Section omitted per instructions.

---

## Environment Availability

All dependencies already installed and in use in the project. Phase 4 introduces no new external tools, services, or CLIs.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | v24.13.0 | — |
| svelte-realtime | WS lifecycle hooks | ✓ | 0.4.6 | — |
| svelte-adapter-uws | close hook wiring | ✓ | 0.4.5 | — |
| vitest | Unit tests | ✓ | 4.1.2 | — |
| playwright (chromium) | Browser tests | ✓ | 1.58.2 | — |
| Neon DB | Promotion/cancel queries | ✓ (env var) | serverless ^1.0.2 | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 (dual project: server + browser) |
| Config file | `vite.config.js` (test section, dual projects) |
| Quick run command | `npx vitest run --project server` |
| Full suite command | `npx vitest run` |
| Component test command | `npx vitest run --project client` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DRAFT-07 | Turn indicator shows active team+action | unit (Svelte) | `npx vitest run --project client src/lib/components/molecules/DraftBoard.svelte.spec.js` | ❌ Wave 0 |
| DRAFT-07 | Timer countdown derives from turnEndsAt | unit (Svelte) | `npx vitest run --project client src/lib/components/molecules/TurnIndicator.svelte.spec.js` | ❌ Wave 0 |
| DRAFT-07 | Pick/ban history slots fill from actions array | unit (Svelte) | `npx vitest run --project client src/lib/components/molecules/DraftTeamColumn.svelte.spec.js` | ❌ Wave 0 |
| DISC-01 | onUnsubscribe detects captain disconnect, sets pause flag | unit (server) | `npx vitest run --project server src/live/room.spec.js` | ✅ (extend) |
| DISC-01 | Pause snapshot published to topic on captain disconnect | unit (server) | `npx vitest run --project server src/live/room.spec.js` | ✅ (extend) |
| DISC-02 | Grace expiry promotes next team member | unit (server) | `npx vitest run --project server src/lib/server/rooms.spec.js` | ✅ (extend) |
| DISC-02 | Resume snapshot published after promotion | unit (server) | `npx vitest run --project server src/live/room.spec.js` | ✅ (extend) |
| DISC-03 | No eligible member triggers draft cancellation | unit (server) | `npx vitest run --project server src/lib/server/rooms.spec.js` | ✅ (extend) |
| DISC-04 | Lobby stream init returns draft snapshot when phase=drafting | unit (server) | `npx vitest run --project server src/live/room.spec.js` | ✅ (extend) |

### Sampling Rate
- **Per task commit:** `npx vitest run --project server` (fast; node-only)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/components/molecules/DraftBoard.svelte.spec.js` — covers DRAFT-07 overall layout
- [ ] `src/lib/components/molecules/TurnIndicator.svelte.spec.js` — covers DRAFT-07 timer
- [ ] `src/lib/components/molecules/DraftTeamColumn.svelte.spec.js` — covers DRAFT-07 history slots

*(Existing `src/live/room.spec.js` and `src/lib/server/rooms.spec.js` must be extended with new test cases for DISC-01 through DISC-04.)*

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Svelte stores (`writable`, `readable`) | Svelte 5 runes (`$state`, `$derived`, `$effect`) | Svelte 5.0 (2024) | No `$:` reactive declarations; `fromStore()` adapts legacy stores |
| Custom WebSocket reconnect logic | svelte-realtime automatic re-subscribe | Built into svelte-realtime | Reconnect hydration is automatic on client; server init fn re-runs |
| Separate disconnect tracking table | `onUnsubscribe` lifecycle hook on stream | svelte-realtime ^0.4.x | No DB table needed; hook fires with full `ctx` including `publish` |

**Deprecated/outdated:**
- Svelte store-centric patterns (`$store` shorthand in templates): still works but `fromStore()` bridge is the project convention for mixing with runes.

---

## Open Questions

1. **Platform reference in `autoAdvanceTurn`**
   - What we know: No `ctx` is available in `autoAdvanceTurn`; Phase 3 left a TODO comment.
   - What's unclear: Best mechanism to pass `platform` into the timer callback without creating a closure that holds a potentially stale reference.
   - Recommendation: Pass `platform` explicitly from the `startDraft` RPC into `scheduleTimer`'s callback closure. The `startDraft` RPC has `ctx.platform`; capture it in a variable before calling `scheduleTimer`. Alternatively, use a module-level `platform` variable set via `setCronPlatform` (exported by svelte-realtime/server — confirmed in server.d.ts line 753).

2. **Turn timer state during pause**
   - What we know: The spec says draft "pauses" during grace. The turn timer currently runs in `draft-timers.js`.
   - What's unclear: Whether the turn timer should be fully cancelled and restarted, or suspended and resumed from remaining time.
   - Recommendation: Cancel the turn timer on disconnect (call `clearRoomTimer`), restart from full `timerMs` on resume. This is simpler and acceptable since the pause overlay communicates the situation. Note in plan as a decision.

3. **`cancelRoomAsHost` host-check bypass for DISC-03**
   - What we know: `cancelRoomAsHost` enforces `hostUserId` check; disconnect handler runs as non-host.
   - What's unclear: Whether to add a new `cancelDraftNoCaption` helper or add a bypass param to the existing function.
   - Recommendation: Add a dedicated `cancelDraftNoCaption(db, roomId)` function in `rooms.js` that directly sets `phase = 'cancelled'` and `ended_at = now()`. Keep `cancelRoomAsHost` unchanged.

---

## Sources

### Primary (HIGH confidence)
- `node_modules/svelte-realtime/server.d.ts` — full type signatures for `close`, `onUnsubscribe`, `onSubscribe`, `LiveContext`, `StreamOptions`, `setCronPlatform`
- `node_modules/svelte-realtime/server.js` — runtime implementation confirming `publish` in closeCtx (line 2568), `onUnsubscribe` dispatch (lines 2577-2578)
- `src/live/room.js` — existing `lobby` stream pattern, `scheduleTimer` usage, `ctx.publish` pattern
- `src/live/draft.js` — existing `autoAdvanceTurn` + Phase 3 TODO comment (line 72-74)
- `src/lib/server/draft.js` — `loadDraftSnapshot` return shape
- `src/lib/server/db/schema.js` — `DraftState` typedef, `room`, `room_member`, `draft_action` tables
- `src/routes/draft/[id]/+page.svelte` — existing page structure and `fromStore(lobby(code)).current` pattern
- `vite.config.js` — dual vitest project config (server + client)

### Secondary (MEDIUM confidence)
- Svelte 5 `$effect` cleanup pattern — confirmed from existing project code (`LobbyHostBar.svelte` copyTimer cleanup pattern) and CLAUDE.md Svelte MCP mention
- `package.json` — verified all dependency versions directly

### Tertiary (LOW confidence)
- None required; all critical findings verified from source files.

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 4 |
|-----------|-------------------|
| Language: JavaScript (JSDoc) | All new files use `// @ts-nocheck` or JSDoc `@typedef`; no TypeScript syntax |
| Package Manager: npm | `npm install` only; no yarn/pnpm |
| Svelte MCP: use `list-sections` then `get-documentation` before writing Svelte code | All new Svelte components must be validated with `svelte-autofixer` tool before finalizing |
| No new packages without explicit approval | Phase 4 requires zero new packages; confirmed above |
| vitest for testing | Server tests: `.spec.js`; browser/component tests: `.svelte.spec.js` |

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified from `package.json` and `node_modules` source
- Architecture: HIGH — patterns derived directly from existing codebase reading (room.js, draft.js, page.svelte)
- Pitfalls: HIGH — identified from actual code comments (Phase 3 TODO), type signatures, and runtime source code
- Disconnect mechanism: HIGH — confirmed from `server.d.ts` types and `server.js` runtime implementation

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable internal libraries; 30-day horizon)
