# Draft Utility

## What This Is

A **real-time drafting application** for competitive-style sessions: **two teams of up to three players** take turns **banning and picking** options from a **predefined class list** (like pick/ban in competitive games). The product moves through **three phases** — pre-draft **lobby**, live **drafting**, and **post-draft review** — so participants always know where they are in the flow.

**Players** (signed in) join teams, chat within their team, and participate in the draft. **Guests** may watch as **spectators** with a **spectator-only** chat; they cannot join teams or act in the draft.

## Core Value

**A fair, readable, real-time draft** where host rules, team privacy, and spectator separation are clear — and the final pick/ban outcome is easy to review.

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

## Context

- **Stack:** SvelteKit + Better Auth + Drizzle + Neon + svelte-realtime (UWS WebSocket layer)
- **Source:** ~6,800 lines JS/Svelte across `src/`
- **Tests:** 130 passing vitest unit tests; 34 todo stubs (Phase 4 DISC browser specs pending)
- **Phase artifacts:** Archived to `.planning/milestones/v1.0-phases/`
- **Next milestone:** Run `/gsd:new-milestone` to define v1.1 scope

---

*Last updated: 2026-04-09 after v1.0 milestone completion*
