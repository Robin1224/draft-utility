# Phase 4: Draft UI & Disconnect Resilience - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the draft board UI that replaces the lobby view when `room.phase === 'drafting'`, including champion grid, turn indicator, timer countdown, pick/ban history in team-column slots, and a full-screen pause overlay for captain disconnects with grace countdown. Also implement the server-side disconnect detection, grace timer, captain promotion logic, and reconnect hydration. Post-draft review UI and chat are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Draft Board Layout
- **D-01:** When `phase === 'drafting'`, replace the TeamColumn/LobbyHostBar lobby layout entirely with a dedicated draft board component.
- **D-02:** Draft board shows: champion picker grid (center), team pick/ban slots (sides), active turn indicator, and timer.

### Champion Display
- **D-03:** Champions rendered as a responsive grid of cards — icon/image + name. Banned or picked champions are visually grayed out and non-interactive. Click to select, confirm to submit pick/ban.
- **D-04:** Catalog is 28 champions — no search/filter needed; grid fits on one screen.

### Pick/Ban History
- **D-05:** History displayed as team columns with slots — Team A and Team B each show their pick slots and ban slots. Slots fill in as draft progresses (like League of Legends draft style). Enables at-a-glance team comparison.

### Turn Timer
- **D-06:** Large seconds-remaining countdown number + shrinking progress bar below the active turn indicator. Bar turns red when ≤10 seconds remaining. Timer is derived client-side from `turnEndsAt` timestamp emitted by server (DRAFT-02 already validated).

### Disconnect & Grace Period UX
- **D-07:** When active captain disconnects: full-screen semi-transparent pause overlay covers the draft board. Overlay shows which captain disconnected, a grace period countdown (30s), and "Waiting for reconnect…". No picks are possible while overlay is visible.
- **D-08:** When grace expires and another team member is promoted: inline status message within the overlay/board — "[Name] is now captain for Team X. Draft resumes." Clears after ~3 seconds, overlay dismisses.
- **D-09:** When no team member is available after grace: draft is cancelled, all participants see a "Draft cancelled — no captain available" message and are returned to lobby or shown an end state.

### Reconnect & Hydration
- **D-10:** On reconnect, show a brief "Reconnected — syncing…" banner while the server snapshot loads, then dismiss. Client receives full server-authoritative snapshot via `loadDraftSnapshot()`. No stale local state. (DISC-04)

### Claude's Discretion
- Exact champion card dimensions and grid column count (responsive)
- Specific Tailwind classes and color tokens (follow existing app conventions)
- Animation/transition details for slot fills and overlay entrance
- Whether to use a dedicated route or conditional rendering within `/draft/[id]/+page.svelte`
- Timer tick mechanism (setInterval vs requestAnimationFrame)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Draft engine (Phase 3 output)
- `src/live/draft.js` — pickBan RPC, autoAdvanceTurn, timer scheduling
- `src/live/room.js` — lobby stream, startDraft, cancelRoom, disconnect handling entry point
- `src/lib/server/draft.js` — loadDraftSnapshot, writeDraftAction, completeDraft, advanceTurnIfCurrent
- `src/lib/server/rooms.js` — startDraftWithSettings, topicForRoom, room state transitions

### Schema & data shapes
- `src/lib/server/db/schema.js` — DraftState typedef, draft_action table, room table
- `src/lib/catalog/classes.json` — 28-champion catalog (id, name, role)
- `src/lib/draft-script.js` — DEFAULT_SCRIPT shape, DEFAULT_TIMER_MS

### Existing UI patterns
- `src/routes/draft/[id]/+page.svelte` — current draft page; lobby() stream usage; snapshot shape
- `src/lib/components/atoms/Phases.svelte` — phase strip component (lobby/drafting/review)
- `src/lib/components/molecules/TeamColumn.svelte` — team member display pattern
- `src/lib/components/molecules/LobbyHostBar.svelte` — host controls pattern (reference for conventions)

### Requirements
- `.planning/REQUIREMENTS.md` §DRAFT-07, §DISC-01–04 — must-haves for this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lobby()` stream from `$live/room` — already subscribed in +page.svelte; snapshot contains `phase`, `teams`, `spectators`; will need to extend or add a `draft()` stream for draft-specific state
- `loadDraftSnapshot()` in `src/lib/server/draft.js` — returns full authoritative draft state; use for reconnect hydration
- `Phases.svelte` — already handles lobby/drafting/review strip; no changes needed
- `src/lib/components/atoms/User.svelte` — user display atom; reusable in turn indicator

### Established Patterns
- Svelte 5 runes (`$state`, `$derived`, `$props`) throughout — no stores except for `lobby()` which returns a writable store wrapped with `fromStore()`
- Tailwind v4 utility classes; color tokens: `text-text-primary`, `text-text-secondary`, `bg-bg-secondary`, `border-bg-secondary`
- Component files: atoms in `src/lib/components/atoms/`, molecules in `src/lib/components/molecules/`
- Live RPC via `svelte-realtime` — `live()` wrapper in `src/live/*.js`; client calls via `$live/` import alias

### Integration Points
- `+page.svelte` branch on `snapshot.phase` — currently shows same lobby layout for all phases; Phase 4 adds `{#if snapshot.phase === 'drafting'}` branch rendering `DraftBoard`
- `autoAdvanceTurn` currently has no `ctx.publish` — Phase 4 must add a publish mechanism (or a standalone snapshot push) so clients receive timer-advance updates reactively
- Disconnect detection: svelte-realtime's `close` handler in `hooks.ws.js` / live module — need to hook into WebSocket close events to detect captain departure

</code_context>

<specifics>
## Specific Ideas

- Team slot layout inspired by League of Legends draft screen — two columns, slots fill chronologically, bans grouped separately from picks
- Grace period overlay should be unmissable — full-screen, not a small banner
- "Reconnected — syncing…" banner is brief and dismisses automatically once snapshot arrives
- Timer urgency: bar + number turn red at ≤10s

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-draft-ui-disconnect-resilience*
*Context gathered: 2026-04-04*
