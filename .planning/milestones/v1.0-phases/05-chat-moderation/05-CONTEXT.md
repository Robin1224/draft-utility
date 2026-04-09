# Phase 5: Chat & Moderation - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Add private, isolated communication channels for team players and spectators, enforced server-side, with basic safety hygiene (rate limiting + slur filtering) and host mute control for spectators. This phase also adds a general "All" lobby chat channel visible to all participants during the pre-draft lobby phase (scope expanded per product decision — see note below).

This phase does NOT include post-draft chat, heavy moderation beyond rate limits and slur filtering, chat history persistence, or spectator caps.

</domain>

<decisions>
## Implementation Decisions

### Chat UI Placement

- **D-01:** Chat is a **right sidebar panel** present in both the lobby layout and the draft board layout. Consistent placement — no repositioning when the draft starts.
- **D-02:** During the **lobby phase**: the sidebar shows **two tabs**:
  - **"All"** — general channel, visible to and sendable by everyone (players + spectators). New capability added to Phase 5 scope.
  - **"Team"** (for players) or **"Spectator"** (for spectators) — role-specific private channel.
- **D-03:** During the **drafting phase**: sidebar shows **only the role-specific tab** — "Team" for players, "Spectator" for spectators. The "All" general channel is not shown or accessible during drafting.
- **D-04:** Players see their own team's channel only (Team A players cannot see Team B's tab). The correct team channel is determined server-side based on their `team` field in `room_member`.

### Channel Topology

- **D-05:** Four distinct `svelte-realtime` topics per room:
  - `room:{code}:chat:all` — lobby general channel (lobby phase only)
  - `room:{code}:chat:teamA` — Team A private channel
  - `room:{code}:chat:teamB` — Team B private channel
  - `room:{code}:chat:spectators` — spectator private channel
- **D-06:** Server-side subscription authorization based on role and team; clients cannot subscribe to topics they are not authorized for regardless of what they request (CHAT-01, CHAT-02).

### Message Persistence

- **D-07:** **In-memory fanout only** — messages are broadcast to connected subscribers and discarded. No chat history survives a page refresh or server restart. No new DB table required.
- **D-08:** Chat history is intentionally transient. Sessions are short-lived; rooms expire after the draft ends.

### Slur Filter

- **D-09:** Word list is a **bundled static file in the repo** (`src/lib/slur-list.json` or similar). No npm profanity package. Full control over list contents; updated manually when needed.
- **D-10:** **Max 500 characters** per message, enforced server-side before the filter runs. Messages over 500 chars are rejected (not truncated).
- **D-11:** Server applies **Unicode NFKC normalization** and strips zero-width characters from the message body before checking against the slur list. The raw (unfiltered) message is never broadcast to any client (CHAT-04).

### Rate Limiting

- **D-12:** Rate limiting is **in-memory per server process**, keyed by `userId`/`guestId` + connection ID + room ID, as required by CHAT-03. Sliding window approach.
- **D-13:** Specific window size, token count, and rejection behavior are **Claude's Discretion** — reasonable defaults for a draft lobby (e.g. ~5 messages per 5 seconds). Excess messages are silently dropped server-side (not broadcast).

### Host Mute (HOST-04)

- **D-14:** Host does **not** see the spectator chat channel — host acts on mute without observing spectator messages directly.
- **D-15:** Mute control is a **"Mute" button in the spectator list**, placed alongside the existing "Kick" button in the collapsible Spectators section (Phase 2 D-07 pattern in `TeamColumn.svelte` / lobby layout).
- **D-16:** Mute state is tracked **in-memory** in the room's live state (keyed by `userId`/`guestId`). Muted spectator's `sendMessage` RPCs are rejected server-side before broadcast. A muted spectator is **not notified** that they are muted.
- **D-17:** Mute is visible to the host: muted spectators show a visual indicator (e.g. muted icon) in the spectator list so the host can track and unmute. Unmute button replaces Mute when muted.

### Claude's Discretion

- Exact `svelte-realtime` `live()` module file structure for chat (e.g. `src/live/chat.js` or adding to `room.js`)
- Component split for ChatPanel, ChatMessage, ChatInput atoms/molecules
- Rate limit window parameters (count per window, window duration)
- Mute indicator styling in the spectator list
- Whether mute persists to `room_member.is_muted` column or stays purely in-memory
- Empty chat state (no messages yet) — placeholder copy

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — CHAT-01, CHAT-02, CHAT-03, CHAT-04, HOST-04 acceptance criteria
- `.planning/ROADMAP.md` — Phase 5 goal, success criteria
- `.planning/PROJECT.md` — Chat safety decisions, guest/host rules

### Existing realtime architecture (follow these patterns)
- `src/live/room.js` — live module pattern: RPCs, `onUnsubscribe`, ctx.publish, error handling with `LiveError`
- `src/hooks.ws.js` — role-based access; `ctx.user.role` (`'player'` | `'guest'`) and `ctx.user.userId` / `ctx.user.guestId`
- `src/lib/server/rooms.js` — `topicForRoom()` pattern; room member queries

### Schema & data shapes
- `src/lib/server/db/schema.js` — `room_member` table (team, user_id, guest_id) — used for mute tracking
- `src/lib/server/rooms.js` — `loadLobbySnapshot()` — if mute state is persisted, snapshot must include it

### Existing UI patterns to extend
- `src/lib/components/molecules/TeamColumn.svelte` — spectator list with Kick button; add Mute button here
- `src/lib/components/molecules/LobbyHostBar.svelte` — host controls pattern
- `src/routes/draft/[id]/+page.svelte` — main page; add ChatPanel alongside lobby and draft board
- `src/lib/components/atoms/Phases.svelte` — phase context

### Prior phase context
- `.planning/phases/01-auth-realtime-transport/01-CONTEXT.md` — D-12–D-14: guest WS rules, role tagging, in-place role upgrade
- `.planning/phases/02-room-lobby/02-CONTEXT.md` — D-07: collapsible Spectators section (where Mute button lives); realtime topic pattern
- `.planning/phases/04-draft-ui-disconnect-resilience/04-CONTEXT.md` — D-01/D-02: draft board layout; Tailwind tokens; atoms/molecules pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `live()` wrapper in `src/live/*.js` — pattern to follow for a new `src/live/chat.js` module (or chat RPCs added to `room.js`)
- `ctx.user` from `hooks.ws.js` — gives `role`, `userId`, `guestId`, `team` — all needed for channel authorization
- `TeamColumn.svelte` — spectator list with Kick; extend to add Mute button (D-15)
- Tailwind v4 tokens from Phase 4: `text-text-primary`, `text-text-secondary`, `bg-bg-secondary`, `border-bg-secondary`

### Established Patterns
- Svelte 5 runes (`$state`, `$derived`, `$props`) — no stores unless wrapping a `live()` return value
- `LiveError('FORBIDDEN', ...)` for authorization rejections in RPC handlers
- Atomic/molecular component split: inputs/messages as `atoms/`, chat panel as `molecules/`

### Integration Points
- `+page.svelte` right column — add `ChatPanel` as a right-side sibling to the existing lobby/draft layout
- `src/live/room.js` or new `src/live/chat.js` — new `sendMessage` RPC + `onMessage` subscription
- `room_member` table — may need `is_muted boolean default false` migration for persistent mute (vs in-memory)
- Lobby snapshot (`loadLobbySnapshot`) — if mute state is persisted, must be included in initial hydration

</code_context>

<specifics>
## Specific Ideas

- "All" general channel is only present in the **lobby phase** — during the draft, focus is on the game. Spectators and players each see only their private channel during drafting.
- Muted spectators are not notified they are muted (silent mute).
- The "Mute" button lives in the spectator list alongside the existing "Kick" button — not in the chat message itself.
- 500 character max is a hard server-side reject (not a truncation).

</specifics>

<deferred>
## Deferred Ideas

- **Chat history on reconnect** — not included in v1 (in-memory only). If desired, add a `chat_message` DB table in a future phase.
- **Heavy moderation** — out of scope for v1 per PROJECT.md and REQUIREMENTS.md.
- **Spectator cap** — out of scope per PROJECT.md.

</deferred>

---

*Phase: 05-chat-moderation*
*Context gathered: 2026-04-04*
