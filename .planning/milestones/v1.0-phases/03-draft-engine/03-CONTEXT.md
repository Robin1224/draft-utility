# Phase 3: Draft Engine - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a server-authoritative pick/ban draft engine: host configures settings (pick/ban script + turn timer) before the draft starts; draft loads the bundled Battlerite champion catalog; server owns turn order and emits authoritative `turnEndsAt` timestamps; captains pick or ban a champion each turn; draft auto-advances on timer expiry; draft completes when the script is exhausted and transitions to review phase.

This phase does NOT implement the draft UI visuals or countdown rendering (Phase 4), captain disconnect/grace/reassign logic (Phase 4), team/spectator chat (Phase 5), or post-draft summary page (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### Pick/ban script format

- **D-01:** Each turn in the script is represented as `{ team: 'A' | 'B', action: 'pick' | 'ban' }`. Scripts are arrays of these objects, ordered by execution sequence.
- **D-02:** Host can override the default script via **per-step manual ordering**: a drag-to-reorder list where each row shows `Team A/B — Pick/Ban`. Host can reorder, add, or remove turns before the draft starts.
- **D-03:** The default pick/ban script is Claude's discretion — a sensible esports-style default (e.g. alternating bans then picks, typically 2 bans per team then 3 picks per team in alternating order).

### Room settings panel

- **D-04:** Settings panel is an **expandable section within `LobbyHostBar`** — a "Settings" button expands an inline section (consistent with the collapsible spectators pattern). No separate modal or page.
- **D-05:** Settings are **lobby-only**: the panel is accessible and editable only while `room.phase === 'lobby'`. Once the draft starts, settings are locked (panel hidden or inputs disabled).

### Class catalog

- **D-06:** The premade class catalog contains the **28 Battlerite Champions**, grouped by role:
  - **Melee (9):** Bakko, Jamila, Croak, Freya, Raigon, Rook, Ruh Kaan, Shifu, Thorn
  - **Ranged (10):** Alysia, Ashka, Destiny, Ezmo, Iva, Jade, Jumong, Shen Rao, Taya, Varesh
  - **Support (9):** Blossom, Lucie, Oldur, Pearl, Pestilus, Poloma, Sirius, Ulric, Zander
- **D-07:** Each entry shape: `{ id: string, name: string, role: 'melee' | 'ranged' | 'support' }`. `id` is a kebab-case slug (e.g. `ruh-kaan`).
- **D-08:** Catalog lives as a **static JSON file** bundled with the app at `src/lib/catalog/classes.json`. Imported at build time — no DB table needed for v1.

### Draft state persistence

- **D-09:** Authoritative draft state is **DB-persisted per pick/ban action** — a new `draft_action` table stores each completed turn (room_id, turn_index, team, action, champion_id, timestamp). Enables Phase 4 reconnect hydration and Phase 6 post-draft review.
- **D-10:** Room settings (turn timer duration, custom pick/ban script) are **in-memory only** until the draft starts. They do not need to survive a server restart before the draft begins. Once the draft starts, the resolved settings are baked into the draft state (e.g. stored alongside `room.phase = 'drafting'`).

### Claude's Discretion

- Server-side turn timer mechanism: `setTimeout` in the `svelte-realtime` live module is acceptable for Phase 3; Phase 4 handles reconnect/restore.
- Draft action table exact schema (column names, indexes) — follow the Drizzle patterns from `room` and `room_member`.
- How in-progress draft state (current turn index, `turnEndsAt`) is stored — a JSONB column on `room` or a separate table; planner decides.
- How room settings are broadcast to connected clients (e.g. published via existing `topicForRoom` topic on change).
- Exact default script content (turn count and order within the "esports-style default" constraint from D-03).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & requirements
- `.planning/ROADMAP.md` — Phase 3 goal, success criteria, requirement IDs (HOST-01, LIST-01, DRAFT-01–06)
- `.planning/REQUIREMENTS.md` — HOST-01, LIST-01, DRAFT-01–06 acceptance text
- `.planning/PROJECT.md` — Vision, host/team/guest rules, constraints (v1 = premade catalog only)

### Prior phases
- `.planning/phases/01-auth-realtime-transport/01-CONTEXT.md` — Discord auth, hooks.ws.js, guest vs player identity (D-12–D-14)
- `.planning/phases/02-room-lobby/02-CONTEXT.md` — Room lifecycle, lobby snapshot, phase transitions (lobby → drafting)

### Existing implementation touchpoints
- `src/live/room.js` — All live RPCs (lobby stream, joinTeam, kickMember, startDraft, cancelRoom); Phase 3 adds draft RPCs here or in a new `src/live/draft.js`
- `src/lib/server/rooms.js` — `startDraftIfReady`, `getRoomByPublicCode`, `topicForRoom`, room mutation patterns; Phase 3 adds draft action writes following the same sequential Neon HTTP pattern
- `src/lib/server/db/schema.js` — Current schema (`room`, `room_member`); Phase 3 adds `draft_action` and any settings columns
- `src/lib/server/room-lifecycle.js` — `shouldHideRoomFromPublic` / `shouldAbandonLobby`; Phase 3 adds draft completion logic (set `phase='ended'`, `ended_at`)
- `src/lib/components/molecules/LobbyHostBar.svelte` — Settings panel expands from here
- `src/routes/draft/[id]/+page.svelte` — Draft page; Phase 4 renders the draft UI, but Phase 3 must transition this page when `room.phase` changes from `lobby` to `drafting`

### Codebase patterns
- `.planning/codebase/ARCHITECTURE.md` — Hooks layer, server patterns, live module conventions
- `.planning/codebase/CONVENTIONS.md` — JSDoc, Svelte 5 runes, naming conventions
- `.planning/codebase/STACK.md` — Dependency versions (svelte-realtime, drizzle, neon)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/live/room.js` — All existing room RPCs follow the same pattern: validate user, get room by code, mutate, load snapshot, `ctx.publish(topicForRoom(code), 'set', snap)`. Phase 3 draft RPCs follow the same shape.
- `src/lib/server/rooms.js` — `getRoomByPublicCode`, `topicForRoom`, `assertHost`, error constants — all reusable in draft logic.
- `LobbyHostBar.svelte` — Existing host control grouping; settings panel expands inline from here.
- `src/lib/components/atoms/Phases.svelte` — Phase strip (Lobby / Drafting / Review); already wired; Phase 3 makes "Drafting" the active phase when draft begins.

### Established Patterns
- **Live RPCs:** `live(async (ctx, ...args) => { validate → get room → mutate → publish → return snap })` — Phase 3 draft RPCs follow this exactly.
- **Neon HTTP sequential writes:** No interactive transactions; multi-step mutations are sequential (see Phase 2 decisions in STATE.md).
- **Topic publishing:** `ctx.publish(topicForRoom(code), 'set', snapshot)` — all connected clients receive the new state.
- **Room phase transitions:** `startDraftIfReady` sets `phase = 'drafting'`; Phase 3 draft completion sets `phase = 'ended'` + `ended_at` (matching `cancelRoomAsHost` pattern, as documented in `getRoomByPublicCode` JSDoc).

### Integration Points
- **`room.phase` column** — The transition trigger. Lobby clients observe `phase` changing to `'drafting'` via the published snapshot and should switch views.
- **`draft_action` table (new)** — Each completed pick/ban is a row; Phase 6 reads this for the post-draft summary.
- **`src/lib/catalog/classes.json` (new)** — Static catalog; imported in draft validation logic (server) and draft UI (client Phase 4).

</code_context>

<specifics>
## Specific Ideas

- **Battlerite champions:** The catalog is for the game Battlerite. All 28 champion names are explicitly listed in D-06. Spellings matter — use exact names as provided by the user.
- **Per-step drag-to-reorder:** The script editor in the settings panel allows the host to drag individual `{ team, action }` turns. This is the primary host-facing UX for DRAFT-06.
- **Phase transition visibility:** When the host starts the draft, `room.phase` becomes `'drafting'` and is published to all connected clients. The lobby view should respond to this transition (exact UI handling deferred to Phase 4).

</specifics>

<deferred>
## Deferred Ideas

- Champion icons/images — Phase 3 catalog is id + name + role only; images deferred to a future phase or v2.
- Custom class list creation — explicitly out of scope (PROJECT.md Out of Scope).
- Draft UI visuals, countdown rendering, whose-turn indicator — Phase 4.
- Captain disconnect grace/reassign logic — Phase 4 (DISC-01–04).
- Team and spectator chat — Phase 5.
- Post-draft summary page — Phase 6.

None — discussion stayed within Phase 3 roadmap scope.

</deferred>

---

*Phase: 03-draft-engine*
*Context gathered: 2026-04-03*
