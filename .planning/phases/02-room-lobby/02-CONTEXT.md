# Phase 2: Room & Lobby - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the **room lifecycle and lobby** before the draft engine runs: signed-in users **create** rooms and become **non-transferable host**; anyone (including guests) **joins** via ID or link; guests are **spectators** with read-only access; signed-in users **join teams** (max 3 per side) with **auto-captain** on first join; **host** can **kick**, **move players between teams** (only before draft starts), and **start draft** only when **both teams have a captain**; **copyable room link** in lobby; **room cleanup / expiry** after draft ends or cancel (ROOM-01–08, HOST-02, HOST-03).

This phase does **not** implement the pick/ban FSM, room settings panel for order/timer (HOST-01 — Phase 3), team/spectator **chat** (Phase 5), or **post-draft** summary (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### Room links & IDs (discussed)

- **D-01:** Use a **single URL pattern** `/draft/[id]` for the whole session: **lobby**, **drafting**, and **review** share the same route slug; in-app phase/state distinguishes behavior (aligns with existing `Create`/`Join` navigation to `/draft/...`).
- **D-02:** Public **`id`** in the URL is a **short shareable code** (target **6–8 characters**, unambiguous charset — exact alphabet and collision strategy: planner/research).
- **D-03:** **ROOM-07** — Provide a **copy-to-clipboard** control that copies the **full absolute URL** (built from `ORIGIN` or current request origin + path), not path-only.
- **D-04:** Home **Join** input accepts **both** a **bare code** (matches URL segment) **and** a **pasted full URL**; server or client parses out the room id/code.

### Lobby layout & phases (discussed)

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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & requirements

- `.planning/ROADMAP.md` — Phase 2 goal, success criteria, requirement IDs
- `.planning/REQUIREMENTS.md` — ROOM-01–08, HOST-02, HOST-03 acceptance text
- `.planning/PROJECT.md` — Vision, host/team/guest rules, constraints

### Prior phase (auth & transport)

- `.planning/phases/01-auth-realtime-transport/01-CONTEXT.md` — Discord auth, `hooks.ws.js`, guest vs player, in-place role upgrade (D-12–D-14)

### Codebase & stack

- `.planning/codebase/ARCHITECTURE.md` — Layers, hooks, server patterns
- `.planning/codebase/STACK.md` — Dependencies
- `.planning/codebase/CONVENTIONS.md` — JSDoc, Svelte 5 runes
- `.planning/codebase/INTEGRATIONS.md` — Better Auth, DB, realtime packages
- `.planning/research/SUMMARY.md` — Stack recommendations

### Existing implementation touchpoints

- `src/routes/+page.svelte` — Home with Create / Join
- `src/lib/components/molecules/Create.svelte` — Navigates to `/draft/create` (to be replaced by real create flow)
- `src/lib/components/molecules/Join.svelte` — Navigates to `/draft/{id}`
- `src/routes/draft/[id]/+page.svelte` — Placeholder lobby shell (`Header`, `Phases`)
- `src/lib/components/atoms/Phases.svelte` — Phase strip
- `src/hooks.ws.js` — WebSocket identity (`player` / `guest`)
- `src/lib/server/auth.js` — Better Auth instance

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets

- **`Header.svelte`**, **`Phases.svelte`** — Extend lobby page; wire `phase` prop from server/live state.
- **`Create.svelte` / `Join.svelte`** — Replace placeholder navigation with server-backed create and robust join parsing (D-04).
- **`hooks.ws.js` + Phase 1 auth** — Enforce spectator vs team channels when realtime topics are added.
- **`src/lib/server/db/`** — New Drizzle tables for rooms, memberships, host id; migrate from in-memory placeholder if any.

### Established patterns

- SvelteKit **`load` / `actions`**, **`$lib/server`** for DB and auth.
- **`resolve()` from `$app/paths`** for navigation (base-aware links).

### Integration points

- **`/draft/[id]`** — Primary surface for lobby UI, copy link, team columns, host controls, start draft.
- **Home `/`** — Create room + join entry remain entry points.

</code_context>

<specifics>
## Specific Ideas

User chose **defaults** for discussed areas: **single `/draft/[id]`**, **short codes**, **full URL copy button**, **join accepts code or URL**, **two-column teams**, **full Phases strip with non-lobby steps disabled**, **collapsible spectators**, **host badge + grouped host controls**.

</specifics>

<deferred>
## Deferred Ideas

- **Gray areas not discussed this session** (may revisit before execute): dedicated **join/guest** onboarding copy, **host** confirmation modals, **ROOM-08** exact expiry policy — captured under Claude's Discretion above.
- **Out of phase:** Full **chat** (Phase 5), **draft engine** (Phase 3), **room settings** for order/timer (HOST-01 / Phase 3).

No new backlog capabilities proposed — discussion stayed within roadmap Phase 2.

</deferred>

---

*Phase: 02-room-lobby*
*Context gathered: 2026-04-03*
