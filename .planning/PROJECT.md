# Draft Utility

## What This Is

A **real-time drafting application** for competitive-style sessions: **two teams of up to three players** take turns **banning and picking** options from a **predefined class list** (like pick/ban in competitive games). The product moves through **three phases** — pre-draft **lobby**, live **drafting**, and **post-draft review** — so participants always know where they are in the flow.

**Players** (signed in) join teams, chat within their team, and participate in the draft. **Guests** may watch as **spectators** with a **spectator-only** chat; they cannot join teams or act in the draft.

## Core Value

**A fair, readable, real-time draft** where host rules, team privacy, and spectator separation are clear — and the final pick/ban outcome is easy to review.

## Current Milestone: v2.0 Cyber Redesign

**Goal:** Replace the slate/amber Tailwind UI with the high-fidelity "Cyber" terminal aesthetic across the entire flow — plain CSS (no Tailwind), full motion/effects, and the new access-control behaviors the prototype implies — without touching the realtime draft engine.

**Target features:**
- **Stack shift:** Remove Tailwind entirely; establish a plain-CSS design system from `cyber.css` (tokens ported verbatim, JetBrains Mono 400/500/600/700, zero border-radius, scoped under `.cy-app`).
- **App chrome:** Fixed header (bracketed wordmark + blinking cursor, centered phase tracker, room-code meta + copy button), scanline overlay, scrolling body.
- **Signature effects (full fidelity):** ASCII plasma shader canvas (ambient + hot, IntersectionObserver pause), typed terminal logs (boot/connect), animated shaded-ASCII `DRAFT` wordmark, blinking cursors — all honoring `prefers-reduced-motion`.
- **Core screens reskinned:** Home, Login, Lobby, Drafting, Pause, Review.
- **Terminal modals:** Draft Settings (timer stepper + drag-to-reorder script editor), Host Console (move/kick + captain-gating hint).
- **New secondary screens:** Connecting/Loading, Guest Gate (403), Room Cancelled (SIGKILL log).
- **New behaviors:** public/private room gating with a real 403 guest gate, host "open spectating" toggle, a genuine connecting/hydration state during socket open.

**Key context:**
- Source design: `design_handoff_pickban_cyber/` — `cyber.css` is the authoritative token/style source; `cyber.jsx` is the component/behavior reference (React only as a prototyping medium — reimplement as Svelte 5).
- The svelte-realtime layer and snapshot shape stay intact; the 130 unit tests must keep passing. New behaviors (public/private, spectating toggle) extend the realtime/auth/DB layer (`room.isPublic`).

**Progress:**
- ✓ **Phase 8: Cyber Foundation & App Shell** (complete 2026-06-12) — Tailwind removed; plain-CSS Cyber design system (`src/app.css`, verbatim tokens scoped under `.cy-app`, self-hosted JetBrains Mono, zero border-radius); persistent `CyShell` terminal chrome (header `[ DRAFT_EM ]` + blinking cursor, 3-phase tracker, room-code copy button, scanlines) wired into the root layout. DS-01..05, FX-05 validated. Test suite green (150 passed). *Known env debt: production `npm run build` needs the `uWebSockets.js` native addon installed; repo-wide lint debt pre-dates this milestone.*
- ✓ **Phase 9: Signature Effects Infrastructure** (complete 2026-06-12) — Three reusable, motion-safe Svelte 5 building blocks, verbatim-ported from `cyber.jsx`/`cyber.css`: `CyShader.svelte` (ASCII plasma canvas, ambient/hot, IntersectionObserver off-screen pause, single static frame under reduced-motion, full rAF/observer teardown) mounted app-wide into `CyShell` at ambient default; `cyTypedLog.svelte.js` (`createTypedLog` rune factory → reactive `{text, done}`, char-by-char, jump-to-full under reduced-motion); `CyLogo.svelte` (9-line shaded-ASCII `DRAFT` wordmark, line-by-line transform+brightness reveal). FX-01..04 validated. Suite green (164 passed). *3 visual confirmation items deferred to human UAT (no demo route by design — live confirmation in Phase 10). Svelte MCP autofixer was unavailable; substituted prettier + svelte-check.*
- ✓ **Phase 10: Core Screen Reskins** (complete 2026-06-15) — All six primary screens reskinned to the Cyber direction with no change to draft behavior: a single CSS foundation port (`src/app.css`, all per-screen `.cy-*` blocks verbatim from `cyber.css`) plus six screen reskins — Home (typed boot log → `DRAFT` wordmark reveal → `CREATE_DRAFT()`/join cards + `hot` shader), Login (`CONTINUE_DISCORD()`/`SPECTATE_AS_GUEST()` Cyber card), Lobby (`LOBBY.INIT()` banner, lime/violet team columns with `<EMPTY>` slots + captain tags, spectators strip, host console), Drafting+Chat (turn readout + final-5s urgency clock, pick/ban columns, champion catalog `[LOCK_IN]`, responsive chat sidebar↔drawer), Pause (`$ DRAFT.HOLD()` card + grace countdown), Review (`.cy-review` compositions + struck ban list, guest-viewable). UI-01..06 validated, 6/6 / 24/24 truths. Suite green (175 passed). Tailwind fully removed across 21 files; zero border-radius; frozen `$live` wiring intact (D-01). *4 visual/runtime spot-checks (boot animation, urgency pulse, chat breakpoint, guest review) recommended for human UAT — non-blocking. 10 pre-existing `npm run check` errors (CyShell + spec files) tracked in `deferred-items.md`, not introduced by this phase.*

## Current State (v1.0 — shipped 2026-04-09)

v1.0 is complete. All 34 requirements shipped across 7 phases (31 plans, ~6,800 lines JS/Svelte). The full pick/ban draft flow works end-to-end: Discord OAuth → lobby → configurable draft → real-time pick/ban → post-draft review shareable link. All Nyquist VALIDATION.md files filled. Grace-timer edge case fixed.

**Stack:** SvelteKit + Better Auth + Drizzle + Neon (PostgreSQL) + svelte-realtime (UWS)
**Auth:** Discord OAuth only (requirements described email/pw + Google/GitHub — implementation used Discord throughout)
**Testing:** 130 passing vitest unit tests, 34 todo stubs (Phase 4 DISC specs), manual UAT for browser flows

## Requirements

### Validated (v1.0)

- ✓ **SvelteKit full-stack shell** — file-based routes, SSR, Node adapter — v1.0
- ✓ **Svelte 5 + Tailwind v4 UI** — runes, layout, global styles — v1.0
- ✓ **Authentication** — Discord OAuth via Better Auth; session in `event.locals`; sign-in/out — v1.0
- ✓ **PostgreSQL via Neon + Drizzle** — room, room_member, draft_state, draft_action schemas — v1.0
- ✓ **Room lifecycle** — create, join by code/link, 24h abandon expiry — v1.0
- ✓ **Teams & captains** — up to 3 players/side; first-join captain; guests = spectators only — v1.0
- ✓ **Host controls** — kick, move players (pre-draft), start draft (both captains required), cancel — v1.0
- ✓ **Draft mechanics** — 28-champion catalog; 10-turn default script; host-configurable order/timer — v1.0
- ✓ **Turn timer** — default 30s; server-side auto-advance; race-safe with DB compare-and-swap — v1.0
- ✓ **Captain disconnect resilience** — pause, 30s grace, promote or cancel; snapshot hydration on reconnect — v1.0
- ✓ **Chat** — team-isolated, spectator-only channels; slur filter; rate limiting; host mute — v1.0
- ✓ **Post-draft review** — pick/ban summary; shareable link; no auth required to view — v1.0
- ✓ **Grace-timer publish** — final-turn grace expiry unconditionally pushes review snapshot to clients — v1.0

### Active (v1.1 candidates)

- [ ] **Auth requirements text accuracy** — AUTH-01/02/04 describe email/pw + Google/GitHub; update to reflect Discord-only
- [ ] **Stale chat tests** — 3 assertions in chat.spec.js use `message` event; implementation emits `set`
- [ ] **Dead code** — `startDraftIfReady` exported but never called; superseded by `startDraftWithSettings`
- [ ] **Stale JSDoc** — rooms.js:76 describes pre-Phase-6 `completeDraft` behaviour
- [ ] **Guest spectator accumulation** — `upsertGuestSpectator` fires for review-phase rooms; benign at v1 scale
- [ ] **Phase 4 VERIFICATION.md** — missing; UAT 10/10 passed, code verified via SUMMARY; documentation gap

### Out of Scope

- **Custom / user-upload list creation** (before a vetted editor and security model) — explicit deferral
- **Transferable host** — creator is always host; no transfer mechanism
- **Moving players between teams after the draft has started**
- **Heavy moderation** (beyond rate limits and slur filter) for v1
- **Email/password + Google/GitHub OAuth** — Discord only in v1; requirements text mismatch documented

## Constraints

- **Stack:** Prefer staying on **SvelteKit**, **Better Auth**, **Drizzle**, **Neon** unless a phase explicitly justifies change.
- **Security:** User-generated draft lists are **postponed** until ingestion and editor design reduce abuse risk.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Guests = spectators only; team play requires auth | Clear trust boundary; reduces anonymous griefing on teams | ✓ Good — enforced server-side cleanly |
| Host fixed to creator | Simple authority model | ✓ Good — no edge cases around transfer |
| Host starts draft; min 2 players with one captain per team | Flexible lobby fill | ✓ Good — works in practice |
| Team moves only before draft | Avoid mid-draft unfair shuffles | ✓ Good — RPCs locked by phase check |
| Default 30s turn timer + host-configurable order/timer | Matches esports-style expectations | ✓ Good — drag-to-reorder DraftSettingsPanel |
| Captain disconnect → pause, grace, reassign or cancel | Keeps draft finishable when possible | ✓ Good — all paths tested via UAT |
| v1 = premade list only | Security before custom content | ✓ Good — deferred cleanly |
| Chat: rate limit + slur list | Basic hygiene without full moderation product | ✓ Good — filterMessage is pure, testable |
| Discord OAuth only (not email/pw + Google/GitHub) | Better Auth Discord provider was simplest working integration | ⚠️ Revisit — requirements text still describes email/pw + Google/GitHub |
| autoAdvanceTurn publishFn parameter | Grace-timer path had no platform; threading publish avoids module-level side effects | ✓ Good — clean, testable |
| Nyquist VALIDATION.md filled retroactively | All 6 phases filled in Phase 7 to reach nyquist_compliant:true | ✓ Good — wave-0 coverage documented |
| v2.0: drop Tailwind for plain CSS | Tailwind judged not robust enough for the Cyber aesthetic; design depends on exact token/CSS reproduction | — Pending (milestone in progress) |
| v2.0: full-fidelity effects (shader/typed logs/ASCII) | Signature treatments are "the soul" of the Cyber direction per handoff | — Pending |
| v2.0: reskin + new access-control behaviors | Prototype implies public/private gating, 403 guest gate, host spectating toggle | — Pending |

## Context

- **Stack:** SvelteKit + Better Auth + Drizzle + Neon + svelte-realtime (UWS WebSocket layer)
- **Source:** ~6,800 lines JS/Svelte across `src/`
- **Tests:** 130 passing vitest unit tests; 34 todo stubs (Phase 4 DISC browser specs pending)
- **Phase artifacts:** Archived to `.planning/milestones/v1.0-phases/`
- **Next milestone:** Run `/gsd:new-milestone` to define v1.1 scope

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

*Last updated: 2026-06-15 — Phase 10 (Core Screen Reskins) complete*
