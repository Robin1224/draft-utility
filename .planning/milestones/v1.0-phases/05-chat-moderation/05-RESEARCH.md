# Phase 05: Chat & Moderation - Research

**Researched:** 2026-04-04
**Domain:** svelte-realtime pub/sub channels, server-side message filtering, in-memory rate limiting, host mute controls
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Chat is a right sidebar panel in both lobby and draft board layouts. No repositioning when the draft starts.

**D-02:** During the lobby phase the sidebar shows two tabs: "All" (general, everyone) and "Team" (for players) or "Spectator" (for spectators).

**D-03:** During the drafting phase the sidebar shows only the role-specific tab — "Team" or "Spectator". No "All" tab.

**D-04:** Players see their own team channel only. Correct team channel determined server-side from `room_member.team`.

**D-05:** Four distinct svelte-realtime topics per room:
- `room:{code}:chat:all` — lobby general channel (lobby phase only)
- `room:{code}:chat:teamA` — Team A private channel
- `room:{code}:chat:teamB` — Team B private channel
- `room:{code}:chat:spectators` — spectator private channel

**D-06:** Server-side subscription authorization based on role and team; clients cannot subscribe to topics they are not authorized for.

**D-07:** In-memory fanout only — no DB table, no chat history survival across refresh or server restart.

**D-08:** Chat history is intentionally transient.

**D-09:** Slur word list is a bundled static file (`src/lib/slur-list.json`). No npm profanity package.

**D-10:** Max 500 characters per message enforced server-side before filter. Over-limit messages are rejected (not truncated).

**D-11:** Server applies Unicode NFKC normalization and strips zero-width characters before slur check. Raw unfiltered message never broadcast.

**D-12:** Rate limiting is in-memory per server process, keyed by `userId`/`guestId` + connection ID + room ID. Sliding window.

**D-13:** Window size, token count, and rejection behavior are Claude's Discretion. Excess messages silently dropped server-side.

**D-14:** Host does not see spectator chat. Host acts on mute without observing spectator messages.

**D-15:** Mute control is a "Mute" button in the spectator list, alongside the existing "Kick" button in `TeamColumn.svelte` / lobby layout.

**D-16:** Mute state tracked in-memory in room live state (keyed by `userId`/`guestId`). Muted spectator's `sendMessage` RPCs rejected server-side. Muted spectator is not notified.

**D-17:** Mute is visible to host: muted spectators show visual indicator in spectator list. Unmute button replaces Mute when muted.

### Claude's Discretion

- Exact `svelte-realtime` `live()` module file structure for chat (e.g. `src/live/chat.js` or adding to `room.js`)
- Component split for ChatPanel, ChatMessage, ChatInput atoms/molecules
- Rate limit window parameters (count per window, window duration)
- Mute indicator styling in the spectator list
- Whether mute persists to `room_member.is_muted` column or stays purely in-memory
- Empty chat state (no messages yet) — placeholder copy

### Deferred Ideas (OUT OF SCOPE)

- Chat history on reconnect — not in v1 (in-memory only). Add `chat_message` DB table in future phase if desired.
- Heavy moderation — out of scope for v1.
- Spectator cap — out of scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHAT-01 | Team members can send messages visible only to their own team during lobby and draft phases | D-05 topic topology + D-06 server-side subscription auth + `ctx.user.team` from hooks.ws.js |
| CHAT-02 | Spectators can send messages visible only to other spectators | D-05 `room:{code}:chat:spectators` topic + D-06 role-based access check in sendMessage RPC |
| CHAT-03 | Chat messages are rate-limited per user, connection, and room (server-enforced) | D-12 in-memory sliding window keyed userId/guestId + connectionId + roomId |
| CHAT-04 | Chat messages are filtered server-side for slurs (Unicode-normalized, length-capped before filter) | D-09 bundled slur-list.json + D-10 500-char cap + D-11 NFKC normalization + zero-width strip |
| HOST-04 | Host can mute spectators (spectator chat silenced for that user) | D-15 Mute button in spectator list + D-16 in-memory mute state + server-side RPC rejection |
</phase_requirements>

---

## Summary

Phase 5 adds four isolated real-time chat channels per room, all implemented as new `live.stream` subscriptions or RPCs within a new `src/live/chat.js` module following the established `src/live/room.js` pattern. The `svelte-realtime` library's `ctx.publish` mechanism handles fanout — the server receives a `sendMessage` RPC, validates the sender's authorization, applies the filter pipeline (length cap → NFKC normalize → zero-width strip → slur check), applies the rate limit, and publishes the message payload to the appropriate topic. No database writes are needed.

The mute system is the only new in-memory state that must live beyond individual RPC calls. It is stored as a `Map` keyed by `roomId -> Set<userId|guestId>`, held in the server module scope of `chat.js`. This is the same approach used by `draft-timers.js` for the turn timer Map. The host's `muteMember` RPC adds to this map; `sendMessage` checks it before publishing. The in-memory mute state is lost on server restart, which is acceptable given rooms are short-lived.

**Primary recommendation:** Create `src/live/chat.js` as an isolated module (do not extend `room.js`) containing: the four `live.stream` subscriptions for channel authorization, a `sendMessage` RPC with the full filter+rate-limit pipeline, and a `muteMember` RPC for HOST-04. Mirror `src/live/draft.js` as the structural template.

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| svelte-realtime | 0.4.6 | live.stream + RPC dispatch + ctx.publish | Established transport (Phase 1–4) |
| svelte-realtime/server | 0.4.6 | `live`, `LiveError` | Used in room.js and draft.js |
| drizzle-orm | 0.45.1 | DB queries for room/member lookups | Established ORM |
| svelte 5 | 5.51.x | Runes-based UI components | Project language |

### No new npm packages required

All Phase 5 requirements are addressed with:
- The existing `svelte-realtime` transport for channel pub/sub
- JavaScript's built-in `String.prototype.normalize('NFKC')` for Unicode normalization
- A hand-authored `src/lib/slur-list.json` word list (D-09)
- A module-scope `Map` for rate limit windows and mute state

**Installation:** None — all dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
src/
├── live/
│   ├── room.js            # existing — unchanged
│   ├── draft.js           # existing — unchanged
│   ├── draft-timers.js    # existing — unchanged
│   └── chat.js            # NEW — all chat RPCs and subscriptions
├── lib/
│   ├── slur-list.json     # NEW — bundled word list (D-09)
│   ├── server/
│   │   └── rooms.js       # extend: add muteMap export OR keep mute in chat.js
│   └── components/
│       ├── atoms/
│       │   ├── ChatMessage.svelte   # NEW
│       │   ├── ChatInput.svelte     # NEW
│       │   └── MuteButton.svelte   # NEW
│       └── molecules/
│           ├── ChatPanel.svelte    # NEW
│           └── SpectatorsPanel.svelte  # EXTEND: add MuteButton + is_muted indicator
└── routes/
    └── draft/[id]/
        └── +page.svelte   # EXTEND: add ChatPanel as right-side column
```

### Pattern 1: Chat Live Module (src/live/chat.js)

**What:** New `live()` module with `sendMessage` RPC and four `live.stream` subscriptions. Follows the exact shape of `draft.js`.

**When to use:** Any time a new family of RPCs belongs to a distinct domain — isolate from `room.js` to keep room.js focused on lobby/draft lifecycle.

**Key shape:**
```javascript
// Source: mirrors src/live/draft.js pattern
import { live, LiveError } from 'svelte-realtime/server';
import { getRoomByPublicCode, topicForRoom } from '$lib/server/rooms.js';
import { db } from '$lib/server/db';
import slurList from '$lib/slur-list.json' with { type: 'json' };

// Module-scope in-memory state (identical pattern to draft-timers.js roomTimers Map)
/** @type {Map<string, Map<string, number[]>>} roomId -> (senderId -> timestamps[]) */
const rateLimitMap = new Map();

/** @type {Map<string, Set<string>>} roomId -> Set<userId|guestId> muted senders */
export const muteMap = new Map();

// Chat topic helpers (D-05)
function chatTopic(code, channel) {
  return `room:${code}:chat:${channel}`;
}
```

### Pattern 2: Topic Authorization (D-06)

**What:** `live.stream` access function checks `ctx.user` role and team before allowing subscription. Returns `false` to block; throws `LiveError('FORBIDDEN')` to reject with message.

**Key rules:**
- `chat:all` — allow anyone (player or guest) when room is in lobby phase
- `chat:teamA` — allow only players with `ctx.user.team === 'A'`
- `chat:teamB` — allow only players with `ctx.user.team === 'B'`
- `chat:spectators` — allow only guests (`ctx.user.role === 'guest'`) and players not on a team

**Critical gap in `ctx.user`:** The current `hooks.ws.js` upgrade sets `id`, `name`, `role`, `guestId` — but does NOT set `team`. The `sendMessage` RPC must query `room_member` to discover the sender's team, then validate which topic they are authorized to publish to. This is a one-time DB read per `sendMessage` call, which is acceptable at chat volumes.

Alternative considered: cache `team` in `ctx.user` at subscribe time via the `live.stream` init function and mutate `ctx.user` (same pattern as `refreshSession` in-place upgrade). This is the preferred approach — look up team once at stream init and store on `ctx.user.team` to avoid per-message DB reads.

### Pattern 3: sendMessage RPC Filter Pipeline (CHAT-03, CHAT-04)

**What:** Ordered server-side pipeline applied before any publish.

**Pipeline order (must not be changed):**
1. Length check: `body.length > 500` → throw `LiveError('VALIDATION', 'Message too long. Max 500 characters.')`
2. NFKC normalize: `body = body.normalize('NFKC')`
3. Strip zero-width chars: `body = body.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')`
4. Slur check: lowercase + word-boundary match against `slur-list.json` entries → silently drop (return without publishing) if matched
5. Rate limit check: sliding window per `senderId + connectionId + roomId` → silently drop if exceeded
6. Authorization check: sender can only publish to the topic they are subscribed to (role/team match)
7. Publish: `ctx.publish(chatTopic(code, channel), 'message', { sender, body, ts })`

**Note on slur matching:** Simple substring matching after normalization is sufficient for v1. Case-fold with `.toLowerCase()` before checking. Word-boundary matching (e.g. via regex `\b`) avoids false positives for words that contain the slur as a substring. The exact matching strategy is Claude's Discretion — substring is simpler but more prone to false positives; word-boundary regex is safer.

### Pattern 4: In-Memory Sliding Window Rate Limiter (CHAT-03)

**What:** Module-scope `Map` in `chat.js`. No external library. Sliding window: keep an array of timestamps for each sender key; filter out entries older than the window; reject if remaining count exceeds limit.

**Recommended defaults (Claude's Discretion, D-13):**
- Window: 5 seconds
- Max messages in window: 5
- Rejection: silent drop (not broadcast, not notified to sender)
- Key: `${userId ?? guestId}:${connectionId}:${roomId}` — CONTEXT.md D-12 exactly

**Implementation:**
```javascript
function isRateLimited(key, windowMs, maxCount) {
  const now = Date.now();
  const timestamps = rateLimitMap.get(key) ?? [];
  const recent = timestamps.filter(t => now - t < windowMs);
  if (recent.length >= maxCount) return true;
  recent.push(now);
  rateLimitMap.set(key, recent);
  return false;
}
```

**Memory safety:** The rateLimitMap grows unbounded in theory. Entries are implicitly cleaned on each call for that key. For v1 this is acceptable — rooms are short-lived and the player count per room is small (max 6 players + spectators). A future phase could add a cleanup interval if needed.

### Pattern 5: In-Memory Mute State (HOST-04)

**What:** Module-scope `muteMap` in `chat.js`. Host's `muteMember` RPC inserts to set; `unmuteMember` RPC removes; `sendMessage` checks before publish.

**Key:** `muteMap.get(roomId)?.has(senderId)` where `senderId` is `userId ?? guestId`.

**Mute state and lobby snapshot:** The `loadLobbySnapshot` function in `rooms.js` returns the spectator list. For the host's spectator panel to show the mute indicator (D-17), `SpectatorsPanel` needs an `isMuted` flag per spectator. Two approaches:

Option A (recommended — pure in-memory): `muteMember` RPC publishes an updated snapshot-like payload to the room topic (`lobby:{code}`) that includes a `mutedIds` set, or publishes a dedicated `muteUpdated` event to the room topic. The client merges this into local state.

Option B: Add `is_muted boolean default false` to `room_member` schema (CONTEXT.md Claude's Discretion item). Requires a migration but simplifies snapshot hydration — `loadLobbySnapshot` already returns spectators.

**Recommendation:** Use Option A (in-memory only, no migration). Publish a `muteUpdated` event via `ctx.publish(topicForRoom(code), 'patch', { mutedIds: [...muteMap.get(roomId)] })` to the existing lobby topic so all connected clients (including the host) get the update. This avoids a schema migration and aligns with D-07/D-08 intent.

### Pattern 6: live.stream Subscription for Chat Channels

**What:** Each of the four channels is a `live.stream` that returns an initial empty state (no history, D-07) and routes future `ctx.publish` calls to subscribers. The `access` function enforces D-06.

**Shape:**
```javascript
// Source: mirrors lobby stream in src/live/room.js
export const chatTeamA = live.stream(
  (ctx, publicCode) => chatTopic(normalizePublicCode(publicCode), 'teamA'),
  async (ctx, publicCode) => {
    // Validate access
    if (ctx.user?.role !== 'player') throw new LiveError('FORBIDDEN', 'Players only');
    const code = normalizePublicCode(publicCode);
    const roomRow = await getRoomByPublicCode(db, code);
    if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');
    // Store team on ctx.user for sendMessage checks
    // (query room_member once here, cache on ctx.user.team)
    return { messages: [] };   // no history (D-07)
  },
  { merge: 'set', access: () => true }  // access enforcement done in init fn
);
```

### Anti-Patterns to Avoid

- **Extending room.js directly:** Adding chat RPCs to room.js would make it much harder to maintain. Isolate in `chat.js`.
- **Storing messages in DB:** D-07 explicitly forbids this. Do not create a `chat_message` table.
- **Broadcasting to the room-wide lobby topic:** Chat messages must go to their specific channel topic, not `lobby:{code}`. Mixing concerns breaks channel isolation.
- **Client-side channel filtering:** Never filter channels on the client. D-06 requires server-side enforcement. A client that manually subscribes to `room:{code}:chat:teamB` must be rejected at the `live.stream` access/init level.
- **Notifying muted users:** D-16 — silent mute. The `sendMessage` RPC silently returns (or returns a no-op success) without telling the sender they were muted.
- **Slur list as npm package:** D-09 prohibits external profanity packages. Use bundled JSON.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Real-time pub/sub fanout | Custom WebSocket broadcast loop | `ctx.publish(topic, event, payload)` from svelte-realtime | Already handles subscriber tracking, connection cleanup, and delivery |
| Unicode normalization | Custom character substitution tables | `String.prototype.normalize('NFKC')` (built-in JS) | Standard, well-tested, handles all Unicode normalization forms |
| Tab UI components | Custom tab state management from scratch | Follow established Svelte 5 `$state` pattern used in DraftSettingsPanel | Already proven in project; no library needed |

**Key insight:** svelte-realtime's `ctx.publish` already solves the hardest part of chat — multi-subscriber fanout with connection lifecycle management. The server never needs to track who is subscribed; `ctx.publish(topic, ...)` delivers to all current subscribers of that topic automatically.

---

## Common Pitfalls

### Pitfall 1: ctx.user.team is not set at WS upgrade time

**What goes wrong:** `sendMessage` or stream init code checks `ctx.user.team` but finds it undefined because `hooks.ws.js` upgrade() only sets `role`, `id`/`guestId`, and `name` — not `team`.

**Why it happens:** Team assignment is room-specific (a user can be in different teams in different rooms), so it cannot be set globally at upgrade time.

**How to avoid:** In the `live.stream` init function for `chatTeamA`/`chatTeamB`, query `room_member` by `(room_id, user_id)` and cache the result on `ctx.user.chatTeam` (a chat-specific property). The `sendMessage` RPC then checks `ctx.user.chatTeam` instead of making another DB query.

**Warning signs:** Authorization bypass — a player on Team B could subscribe to `chatTeamA` if the access check mistakenly relies on an unset `ctx.user.team`.

### Pitfall 2: muteMap leaks across rooms

**What goes wrong:** The `muteMap` is module-scoped and keyed by `roomId`. If rooms expire without cleanup, the mute entries for those rooms accumulate indefinitely.

**Why it happens:** Unlike `roomTimers` (which has explicit `clearRoomTimer` calls), there is no equivalent cleanup hook for `muteMap`.

**How to avoid:** Clear `muteMap.delete(roomId)` inside the `cancelRoom` or room-end code paths, OR accept the leak for v1 since rooms are short-lived. The `onUnsubscribe` hook on the lobby stream fires when the last subscriber disconnects — this is a natural cleanup point. Document it as a known v1 limitation.

**Warning signs:** Memory growth on servers running many sequential rooms.

### Pitfall 3: Slur filter false positives from substring matching

**What goes wrong:** A message containing an innocuous word that happens to contain a slur as a substring gets silently dropped (e.g., "Scunthorpe problem").

**Why it happens:** Naive `.includes()` substring matching after normalization.

**How to avoid:** Wrap slur list entries with word-boundary regex: `new RegExp('\\b' + entry + '\\b', 'i')`. This allows words that contain the slur as a component to pass. Build the regex set once at module load time, not per-message.

**Warning signs:** User complaints that legitimate messages are silently dropped.

### Pitfall 4: Infinite publish loop if sendMessage publishes to room topic

**What goes wrong:** If `sendMessage` accidentally publishes a chat message to `topicForRoom(code)` (the shared lobby topic) instead of `chatTopic(code, channel)`, all lobby subscribers receive the message — including those in different channels.

**Why it happens:** Copy-paste from `room.js` where `ctx.publish(topicForRoom(code), 'set', snap)` is the standard pattern.

**How to avoid:** Chat publishes use `chatTopic(code, channel)` exclusively. Never publish chat payloads to the lobby topic. The only cross-topic publish is `muteUpdated` to the lobby topic (which is intentional for host UI state sync).

**Warning signs:** Messages appearing in wrong chat panels, or spectators seeing team messages.

### Pitfall 5: Rate limiter key collision between rooms

**What goes wrong:** Two different rooms with the same `guestId` visitor share a rate limit bucket because the key was constructed as `guestId:connectionId` without the `roomId`.

**Why it happens:** Forgetting to include `roomId` in the key.

**How to avoid:** Always use the full key: `${userId ?? guestId}:${connectionId}:${roomId}`. This is exactly what CHAT-03 requires ("per user, connection, and room").

**Warning signs:** A user in two rooms simultaneously (different tabs) gets rate-limited in one room because of activity in the other.

### Pitfall 6: +page.svelte layout break when adding ChatPanel

**What goes wrong:** Adding `ChatPanel` as a sibling column breaks the existing lobby and draft board layouts because the page uses `max-w-4xl` centering that doesn't accommodate a fixed-width sidebar.

**Why it happens:** The current `mainClass` derived in `+page.svelte` uses `mx-auto max-w-4xl` for lobby and `px-4 py-6` for drafting. A 280px fixed sidebar alongside `max-w-4xl` content needs the outer container to switch to a flex row layout.

**How to avoid:** Wrap the existing main content and the new `ChatPanel` in a flex row container. The `mainClass` logic needs extending: lobby phase → `flex flex-row gap-4 px-4 py-6`; draft phase → `flex flex-row gap-4 px-4 py-6`. The inner lobby content area should keep `flex-1 min-w-0`. ChatPanel is `flex-shrink-0 w-[280px]`.

---

## Code Examples

Verified patterns from existing codebase:

### live.stream subscription pattern (from src/live/room.js)
```javascript
export const lobby = live.stream(
  (ctx, publicCode) => topicForRoom(normalizePublicCode(publicCode)),
  async (ctx, publicCode) => {
    const code = normalizePublicCode(publicCode);
    const roomRow = await getRoomByPublicCode(db, code);
    if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');
    // ... return initial state
  },
  { merge: 'set', access: () => true }
);
```

### LiveError authorization rejection (from src/live/room.js)
```javascript
if (ctx.user?.role !== 'player' || !ctx.user?.id) {
  throw new LiveError('UNAUTHORIZED', 'Sign in required');
}
if (roomRow.host_user_id !== ctx.user.id) {
  throw new LiveError('FORBIDDEN', 'Host only');
}
```

### Module-scope timer Map pattern (from src/live/draft-timers.js)
```javascript
// Module-scope persistent state across RPC calls
export const roomTimers = new Map();
```

### ctx.publish to topic (from src/live/room.js)
```javascript
ctx.publish(topicForRoom(code), 'set', snap);
```

### Import JSON in live module (from src/live/draft.js)
```javascript
import classes from '$lib/catalog/classes.json' with { type: 'json' };
// Same pattern for slur-list:
import slurList from '$lib/slur-list.json' with { type: 'json' };
```

### Svelte 5 runes component pattern (from src/lib/components/molecules/SpectatorsPanel.svelte)
```svelte
<script>
  /** @type {{ spectators?: SpectatorRow[] }} */
  let { spectators = [] } = $props();
  let open = $state(false);
</script>
```

### Existing spectator row (SpectatorsPanel.svelte — add MuteButton here)
```svelte
{#each spectators as row, i (`${row.userId ?? ''}-${row.guestId ?? ''}-${i}`)}
  <li class="text-sm text-text-primary">{row.displayName}</li>
{/each}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Svelte stores for realtime data | `fromStore(live.stream())` via svelte-realtime | Phase 1–2 | Chat streams follow same pattern |
| Manual WebSocket send/receive | `ctx.publish` + `live.stream` subscription | Phase 1 | No manual WS code needed |
| Svelte 4 stores (`$store`) | Svelte 5 runes (`$state`, `$derived`, `$props`) | Phase 1 | All new components use runes |

**Deprecated/outdated:**
- Svelte 4 `export let` + `$:` reactive syntax: replaced by `$props()` and `$derived`. Project is Svelte 5 throughout.

---

## Open Questions

1. **Mute state propagation to host UI**
   - What we know: mute state lives in `chat.js` module scope; the host's spectator panel (SpectatorsPanel.svelte) needs to know which spectators are muted to show D-17 indicators.
   - What's unclear: the cleanest publish mechanism — publish `muteUpdated` to lobby topic vs. republish full lobby snapshot vs. dedicated topic.
   - Recommendation: Publish `{ mutedIds: [...muteSet] }` as a `patch` event to the existing lobby topic (`lobby:{code}`) when mute state changes. The client merges this into local snapshot state. Avoids a full snapshot reload while keeping the mute state in sync.

2. **connectionId availability in sendMessage RPC**
   - What we know: CHAT-03 requires rate limiting keyed by connection ID. The `ctx` object in `live()` RPCs provides `ctx.user` but the project has not previously needed a per-connection identifier.
   - What's unclear: Whether svelte-realtime exposes a connection-unique ID on `ctx` (e.g., `ctx.id` or similar).
   - Recommendation: In Wave 0, read the svelte-realtime server API to confirm `ctx` shape. If no connection ID is exposed, use `ctx.user.guestId ?? ctx.user.id` combined with `roomId` as the rate limit key (slightly weaker but acceptable for v1). Document this decision.

3. **`ctx.publish` delivery guarantee for chat messages**
   - What we know: svelte-realtime's `ctx.publish` delivers to all current subscribers of a topic. If a subscriber disconnects between the RPC call and the publish, they simply don't receive that message — which is correct behavior for in-memory chat.
   - What's unclear: Whether `ctx.publish` is called with event type `'message'` (new messages appended) vs. `'set'` (full replace). For chat, append semantics are needed.
   - Recommendation: Use a custom event type (e.g., `'message'`) and handle it in the client's `fromStore()` callback to push to a local `messages` array. Do not use `merge: 'set'` for the message stream — that would replace the entire message list on each publish.

---

## Environment Availability

Step 2.6: SKIPPED — this phase adds code and in-memory state only. No new external tools, services, CLIs, databases, or runtimes are required beyond what is already running for Phases 1–4.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | vite.config.js (test.projects array — server + client projects) |
| Quick run command | `npm run test -- --run --reporter=verbose --project=server` |
| Full suite command | `npm run test` |

Two test projects exist:
- `server` — node environment, includes `src/**/*.{test,spec}.{js,ts}` excluding `.svelte.spec.*`
- `client` — browser/playwright, includes `src/**/*.svelte.{test,spec}.{js,ts}`

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAT-01 | Team A player cannot subscribe to teamB topic | unit | `npx vitest run --project=server src/live/chat.spec.js` | Wave 0 |
| CHAT-01 | Team A player sendMessage publishes to chatTeamA only | unit | `npx vitest run --project=server src/live/chat.spec.js` | Wave 0 |
| CHAT-02 | Guest spectator sendMessage publishes to chatSpectators only | unit | `npx vitest run --project=server src/live/chat.spec.js` | Wave 0 |
| CHAT-02 | Player cannot subscribe to spectators topic | unit | `npx vitest run --project=server src/live/chat.spec.js` | Wave 0 |
| CHAT-03 | 6th message in 5-second window is silently dropped | unit | `npx vitest run --project=server src/live/chat.spec.js` | Wave 0 |
| CHAT-04 | Message over 500 chars returns VALIDATION error | unit | `npx vitest run --project=server src/live/chat.spec.js` | Wave 0 |
| CHAT-04 | Slur after NFKC normalization is dropped | unit | `npx vitest run --project=server src/lib/chat-filter.spec.js` | Wave 0 |
| CHAT-04 | Zero-width chars stripped before slur check | unit | `npx vitest run --project=server src/lib/chat-filter.spec.js` | Wave 0 |
| HOST-04 | muteMember RPC adds to muteMap | unit | `npx vitest run --project=server src/live/chat.spec.js` | Wave 0 |
| HOST-04 | Muted spectator sendMessage is silently dropped | unit | `npx vitest run --project=server src/live/chat.spec.js` | Wave 0 |
| HOST-04 | Non-host cannot call muteMember | unit | `npx vitest run --project=server src/live/chat.spec.js` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --project=server src/live/chat.spec.js src/lib/chat-filter.spec.js`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/live/chat.spec.js` — covers CHAT-01, CHAT-02, CHAT-03, HOST-04 (RPC authorization + rate limit + mute)
- [ ] `src/lib/chat-filter.spec.js` — covers CHAT-04 (filter pipeline: length cap, NFKC normalize, zero-width strip, slur match)

*(Existing test infrastructure covers all other requirements. No new vitest config or fixture files needed — follows `room.spec.js` vi.mock pattern.)*

---

## Project Constraints (from CLAUDE.md)

The following directives apply to all work in this phase:

- **Language:** JavaScript with JSDoc (not TypeScript). All new files use `.js` extension with `// @ts-nocheck` if needed.
- **No npm profanity packages:** D-09 is reinforced by CLAUDE.md project conventions — use bundled JSON.
- **Svelte 5 runes only:** `$state`, `$derived`, `$props`, `$bindable` — no Svelte 4 stores in component files unless wrapping a `live()` return value via `fromStore`.
- **Tailwind v4 tokens:** Use `text-text-primary`, `text-text-secondary`, `text-text-tertiary`, `bg-bg-primary`, `bg-bg-secondary`, `border-bg-secondary` — not raw slate values.
- **Component split:** Atoms = single-responsibility leaf nodes; Molecules = composed of atoms + local logic.
- **Test naming:** Spec files are named without `+` prefix (SvelteKit reserves `+` for route files) — e.g. `chat.spec.js`, not `+chat.spec.js`.
- **Vitest pattern:** Wave 0 stubs use `it.todo` (not `it.skip`) so vitest reports todo counts not failures — consistent with Phases 3–4.
- **vi.mock pattern:** Plain factory (not `importOriginal`) for non-existent modules in Wave 0 stubs.
- **Import JSON:** Use `import x from '...' with { type: 'json' }` (established in `draft.js`).
- **svelte-adapter-uws:** Production adapter; `svelte-adapter-node` kept only in devDependencies.

---

## Sources

### Primary (HIGH confidence)

- `src/live/room.js` — live.stream pattern, LiveError pattern, ctx.publish, onUnsubscribe, topic routing
- `src/live/draft.js` — module file structure to mirror, JSON import pattern, module-scope state
- `src/live/draft-timers.js` — module-scope Map for persistent in-memory state across RPC calls
- `src/hooks.ws.js` — ctx.user shape: `{ role, id?, name?, guestId?, team? (absent) }`
- `src/lib/server/rooms.js` — topicForRoom(), getRoomByPublicCode(), loadLobbySnapshot()
- `src/lib/server/db/schema.js` — room_member schema (no is_muted column currently)
- `src/lib/components/molecules/SpectatorsPanel.svelte` — spectator list to extend
- `src/lib/components/molecules/LobbyHostBar.svelte` — Kick button pattern (Mute button mirrors this)
- `src/routes/draft/[id]/+page.svelte` — layout to extend with ChatPanel column
- `vite.config.js` — vitest two-project config (server + client)
- `.planning/phases/05-chat-moderation/05-CONTEXT.md` — all locked decisions
- `.planning/phases/05-chat-moderation/05-UI-SPEC.md` — component specs, layout contract, copy

### Secondary (MEDIUM confidence)

- `String.prototype.normalize('NFKC')` — MDN standard; built-in JS, no library needed
- Unicode zero-width characters `\u200B-\u200D\uFEFF\u00AD` — well-documented ranges for zero-width space, zero-width non-joiner, zero-width joiner, BOM, soft hyphen

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and proven in project
- Architecture patterns: HIGH — directly derived from reading production source files
- Pitfalls: HIGH — identified from reading actual code patterns in existing modules
- Test map: HIGH — vitest config read directly; file patterns confirmed

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable ecosystem; svelte-realtime API unlikely to change within 30 days)
