# Draft Utility

## What This Is

A **real-time drafting application** for competitive-style sessions: **two teams of up to three players** take turns **banning and picking** options from a **predefined class list** (like pick/ban in competitive games). The product moves through **three phases** — pre-draft **lobby**, live **drafting**, and **post-draft review** — so participants always know where they are in the flow.

**Players** (signed in) join teams, chat within their team, and participate in the draft. **Guests** may watch as **spectators** with a **spectator-only** chat; they cannot join teams or act in the draft.

## Core Value

**A fair, readable, real-time draft** where host rules, team privacy, and spectator separation are clear — and the final pick/ban outcome is easy to review.

## Requirements

### Validated

- ✓ **SvelteKit full-stack shell** — file-based routes, SSR, Node adapter (`svelte.config.js`, `vite.config.js`)
- ✓ **Svelte 5 + Tailwind v4 UI** — runes, layout and global styles (`src/routes/+layout.svelte`, `src/routes/layout.css`)
- ✓ **Authentication stack** — Better Auth with session in `event.locals` (`src/hooks.server.js`, `src/lib/server/auth.js`, `src/app.d.ts`)
- ✓ **PostgreSQL via Neon + Drizzle** — `db` client and schemas (`src/lib/server/db/`, `drizzle.config.js`)
- ✓ **Home entry: create / join draft** — `Header`, `Create`, `Join` on `/` (`src/routes/+page.svelte`, `src/lib/components/molecules/Create.svelte`, `Join.svelte`)
- ✓ **Draft route placeholder** — `/draft/[id]` with `Header` and phase strip **Lobby / Drafting / Review** (`src/routes/draft/[id]/+page.svelte`, `src/lib/components/atoms/Phases.svelte`)
- ✓ **Demo auth pages** — email sign-in/up flows under `src/routes/demo/better-auth/`

### Active

- [ ] **Realtime lobby** — presence, room by id; **host** = room creator (**not transferable**)
- [ ] **Teams** — up to 3 players per side; **only signed-in users** on teams; **guests = spectators only**
- [ ] **Captains** — default **first player to join each team**; host-adjustable where product allows
- ✓ **Start draft** — host starts when ready; both teams must have a captain; settings (script + timer) configured in lobby panel. Validated in Phase 03: draft-engine
- ✓ **Draft mechanics** — pick/ban from 28-champion catalog; default 10-turn script; host-configurable order and timer in room settings panel. Validated in Phase 03: draft-engine
- ✓ **Turn timer** — default 30s; host-configurable in room settings (10s min); server-side auto-advance on expiry. Validated in Phase 03: draft-engine
- [ ] **Pre-draft only** — host may **move players between teams**; **no team moves after draft starts**
- [ ] **Host moderation** — **kick** any member; **kick/mute spectators**; **no spectator cap**
- ✓ **Chats** — team chat (team-isolated), spectator chat (spectators only), slur filter, rate limiting, host mute controls. Validated in Phase 05: chat-moderation
- [ ] **Chat safety (v1)** — **rate limiting** + **slur filtering**; no heavier moderation yet
- [ ] **Captain disconnect** — **pause**; wait **~30s**; if no return, **promote another player** on that team to captain; if **no other player**, **cancel draft**
- ✓ **Post-draft** — clear **overview** of all bans and picks; auto-transition on draft end; shareable link for unauthenticated visitors. Validated in Phase 06: post-draft-review
- [ ] **Class lists (v1)** — **one premade catalog** only; **custom lists + interactive draft editor** deferred until security and UX are addressed

### Out of Scope

- **Custom / user-upload list creation** (before a vetted editor and security model) — explicit deferral
- **Transferable host**
- **Moving players between teams after the draft has started**
- **Heavy moderation** (beyond rate limits and slur filter) for v1

## Context

- **Brownfield:** See `.planning/codebase/` (`STACK.md`, `ARCHITECTURE.md`, `INTEGRATIONS.md`, etc.) for dependencies and layout.
- **Realtime:** Not yet integrated in app code; `package.json` includes realtime-related packages **without** current `src/` usage — implementation choices belong to upcoming phases.
- **Create flow:** `Create.svelte` navigates to `/draft/create`, which is handled by the dynamic segment `src/routes/draft/[id]/+page.svelte` with `id = "create"` until a dedicated creation flow exists.

## Constraints

- **Stack:** Prefer staying on **SvelteKit**, **Better Auth**, **Drizzle**, **Neon** unless a phase explicitly justifies change.
- **Security:** User-generated draft lists are **postponed** until ingestion and editor design reduce abuse risk.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Guests = spectators only; team play requires auth | Clear trust boundary; reduces anonymous griefing on teams | — Pending |
| Host fixed to creator | Simple authority model | — Pending |
| Host starts draft; min 2 players with one captain per team | Flexible lobby fill | — Pending |
| Team moves only before draft | Avoid mid-draft unfair shuffles | — Pending |
| Default 30s turn timer + host-configurable order/timer | Matches esports-style expectations | — Pending |
| Captain disconnect → pause, grace, reassign or cancel | Keeps draft finishable when possible | — Pending |
| v1 = premade list only | Security before custom content | — Pending |
| Chat: rate limit + slur list | Basic hygiene without full moderation product | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):

1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):

1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

*Last updated: 2026-04-09 after Phase 07 (tech-debt-cleanup) completion*

### Phase 07 changes
- Grace-timer publish gap fixed: `autoAdvanceTurn` now unconditionally publishes the review snapshot on the final turn, regardless of whether `platform` is present (closes DRAFT-04/POST-01 edge case from v1.0 audit)
- All 6 phase VALIDATION.md files promoted to `nyquist_compliant: true` / `wave_0_complete: true` / `status: complete`
