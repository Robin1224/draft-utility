---
phase: 10-core-screen-reskins
plan: 05
subsystem: ui
tags: [svelte5, cyber, drafting, chat, runes, plain-css, matchmedia, responsive]

# Dependency graph
requires:
  - phase: 10-core-screen-reskins (Plan 01)
    provides: "All .cy-* drafting/chat CSS ported verbatim into src/app.css (cy-turn, cy-turn-clock, cy-pip, cy-draft-col, cy-pickslot, cy-champ-grid, cy-champ, cy-roster, cy-submit, cy-draft-grid, cy-chat-right, cy-chat-drawer, @keyframes cy-pulse + reduced-motion suppression)"
provides:
  - "Cyber-styled Drafting screen (UI-04): turn readout + countdown clock with final-5s urgency (D-04), pip strip, A-lime/B-violet pick/ban columns, champion catalog grid, $ {action}({name}) [LOCK_IN] submit"
  - "Responsive Cyber team chat (D-02): docked right sidebar (cy-chat-right) on desktop, toggleable drawer (cy-chat-drawer) on narrow widths via matchMedia"
affects: [10-06 (PauseOverlay reskin — DraftBoard invocation left untouched), 12 (cancelled-branch SIGKILL reskin)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Responsive dock via window.matchMedia('(max-width: 1100px)') in $effect with addEventListener/removeEventListener cleanup; narrow/drawerOpen $state"
    - "Shared panel markup factored into a {#snippet panelBody()} rendered into both desktop aside and narrow drawer aside to avoid duplication"
    - "Team accent derive (team === 'A' ? 'lime' : 'violet') threaded through TurnIndicator → TimerDisplay, TeamDraftColumn → DraftSlot"

key-files:
  created: []
  modified:
    - src/lib/components/molecules/TurnIndicator.svelte
    - src/lib/components/atoms/TimerDisplay.svelte
    - src/lib/components/molecules/TeamDraftColumn.svelte
    - src/lib/components/atoms/DraftSlot.svelte
    - src/lib/components/molecules/ChampionGrid.svelte
    - src/lib/components/atoms/ChampionCard.svelte
    - src/lib/components/molecules/DraftBoard.svelte
    - src/lib/components/molecules/ChatPanel.svelte
    - src/lib/components/atoms/ChatMessage.svelte
    - src/lib/components/atoms/ChatInput.svelte

key-decisions:
  - "Final-5s urgency threshold (secondsLeft <= 5) for D-04, down from the previous <= 10; the red+pulse and reduced-motion suppression live in app.css (Plan 01), TimerDisplay only toggles is-urgent"
  - "Chat dock breakpoint set at 1100px (D-02 discretionary) — below it the 280px sidebar + grid no longer fits, so chat collapses to a fixed-overlay drawer and the board reclaims full width"
  - "ChampionGrid filter chips (all/.melee/.ranged/.support) rendered static/presentational only — no filter behavior was in scope"
  - "Cancelled branch stripped of Tailwind into bare .cy-draft-cancelled + .cy-btn; full SIGKILL reskin deferred to Phase 12 (goto('/') + copy preserved)"

patterns-established:
  - "matchMedia-driven responsive dock with $effect cleanup (reusable for other sidebar↔drawer screens)"
  - "Snippet-shared panel body across two layout containers"

requirements-completed: [UI-04]

# Metrics
duration: 4min
completed: 2026-06-15
---

# Phase 10 Plan 05: Drafting + Team Chat Reskin Summary

**Cyber-styled Drafting screen (turn readout + final-5s urgency clock, pip strip, A-lime/B-violet pick/ban columns, champion catalog with `$ {action}({name}) [LOCK_IN]` submit) and a responsive team chat that docks as a right sidebar on desktop and a toggleable drawer on narrow widths — all frozen draft/chat wiring kept byte-for-byte.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-06-15T14:00:50Z
- **Completed:** 2026-06-15T14:04:46Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- TurnIndicator renders the `$ TURN_NN/NN` / `TEAM_x :: ACTION` / `cap=>name` readout in `.cy-turn` (lime/violet) plus a `.cy-turn-pips` strip with done/active states; TimerDisplay renders the big `.cy-turn-clock` that flips to `is-urgent` (red + pulse, color-only under reduced motion via the global rule) in the final 5 seconds (D-04).
- Both teams render `.cy-draft-col` (A lime / B violet) with `> bans` / `> picks` sections of `.cy-pickslot`s (bans struck via `is-ban`); the champion catalog is a `.cy-champ-grid` of `.cy-champ` cards (selected lime, banned red ✕, used dimmed) with the lock-in CTA `$ {action}({name}) [LOCK_IN]` (red `cy-submit-ban` for bans).
- DraftBoard wraps the active board in `.cy-draft cy-draft-chat-sidebar` + `.cy-draft-grid` (reserving the 300px chat gutter on desktop) while leaving the PauseOverlay invocation and every draft derive/handler untouched; ChatPanel docks as `cy-chat-right` on desktop and a toggleable `cy-chat-drawer` on narrow widths (matchMedia, D-02), with ChatMessage/ChatInput restyled to the Cyber prefix/sender/body row and single-line input.
- Every frozen handler preserved (D-01): `onPickBan`/`onSubmit`, `activeChatStream`/`onSend`, `activeTab` bindable + draft-phase tab-switch, the auto-scroll `$effect` (`bind:this={listEl}`), `snapshot.draftState` turn/timer reads, and `isActiveCaptain` gating. 38 existing draft/chat/phase10 browser specs stay green.

## Task Commits

Each task was committed atomically:

1. **Task 1: Reskin TurnIndicator + TimerDisplay** - `c64a698` (feat)
2. **Task 2: Reskin TeamDraftColumn + DraftSlot + ChampionGrid + ChampionCard** - `8fcf96c` (feat)
3. **Task 3: Reskin DraftBoard wrapper + ChatPanel/ChatMessage/ChatInput** - `ea09953` (feat)

## Files Created/Modified
- `src/lib/components/molecules/TurnIndicator.svelte` - `.cy-turn` readout host + pip strip; accent derive threaded to TimerDisplay
- `src/lib/components/atoms/TimerDisplay.svelte` - `.cy-turn-clock` with `is-urgent` final-5s threshold (D-04); setInterval/turnEndsAt/barWidth preserved
- `src/lib/components/molecules/TeamDraftColumn.svelte` - `.cy-draft-col` lime/violet with always-rendered `> bans` / `> picks` sections; banSlots/pickSlots preserved
- `src/lib/components/atoms/DraftSlot.svelte` - `.cy-pickslot` empty/filled; struck bans via `is-ban`
- `src/lib/components/molecules/ChampionGrid.svelte` - `.cy-roster` + `.cy-champ-grid` + `SELECT_TARGET` head + `[LOCK_IN]` submit; selectedId/cardState/onSubmit/captain gating preserved
- `src/lib/components/atoms/ChampionCard.svelte` - `.cy-champ` states, role art tints, banned ✕ overlay; onclick gating preserved
- `src/lib/components/molecules/DraftBoard.svelte` - active branch wrapped in `.cy-draft cy-draft-chat-sidebar` + `.cy-draft-grid`; cancelled branch de-Tailwinded; PauseOverlay invocation + all derives/handlers untouched
- `src/lib/components/molecules/ChatPanel.svelte` - `.cy-chat` responsive dock (cy-chat-right ↔ cy-chat-drawer via matchMedia); snippet-shared panel body; onSend/activeTab/auto-scroll preserved
- `src/lib/components/atoms/ChatMessage.svelte` - `.cy-chat-msg` prefix/sender/body Cyber row (timestamp dropped per cyber.jsx shape)
- `src/lib/components/atoms/ChatInput.svelte` - `.cy-chat-input` single-line input row; Enter-to-send (handleKeydown) + onSend/body reset preserved

## Decisions Made
- D-04 urgency threshold lowered to `secondsLeft <= 5`; visual treatment (red + cy-pulse, reduced-motion = color only) is owned by app.css from Plan 01.
- Chat dock breakpoint = 1100px (D-02 discretionary).
- Filter chips are presentational/static (no filter behavior in scope).
- ChatMessage drops the timestamp to match the cyber.jsx row shape (`timeStr` derive removed).
- ChatInput converts the textarea to a single-line `<input>` to match `.cy-chat-input input`; the char-count UI was dropped (validation still surfaces via the `error` binding).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Guarded `championName` null in DraftSlot art slice**
- **Found during:** Task 2 (DraftSlot reskin)
- **Issue:** `npm run check` flagged a new error — `championName.slice(0, 2)` in the filled branch reported `'championName' is possibly 'null'` because svelte-check does not narrow the `isEmpty` derive guard. This pushed the error count from 10 → 11.
- **Fix:** Changed to `(championName ?? '').slice(0, 2)`; behavior unchanged since the filled branch only renders when `championName != null`.
- **Files modified:** src/lib/components/atoms/DraftSlot.svelte
- **Verification:** `npm run check` returned to exactly 10 (pre-existing) errors, zero new.
- **Committed in:** `8fcf96c` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to keep the no-new-errors gate. No scope creep.

## Issues Encountered
- The Svelte MCP `svelte-autofixer` is unavailable in this environment; used `npx prettier --write` + `npm run check` per the 10-03/10-04 precedent.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- UI-04 complete. Drafting + chat now fully Cyber-styled with frozen wiring intact.
- Plan 06 owns the PauseOverlay reskin — its `<PauseOverlay … />` invocation in DraftBoard was left untouched.
- The cancelled-branch full SIGKILL reskin remains deferred to Phase 12 (Tailwind already stripped here).
- `npm run check` holds at the 10 pre-existing errors tracked in deferred-items.md; the 10 reskinned files add zero new errors and contain zero Tailwind utility classes.

---
*Phase: 10-core-screen-reskins*
*Completed: 2026-06-15*

## Self-Check: PASSED

All 10 modified files and the SUMMARY exist on disk; all 3 task commits (`c64a698`, `8fcf96c`, `ea09953`) found in git history.
