---
phase: 05-chat-moderation
plan: "04"
subsystem: ui
tags: [svelte, chat, mute, spectators, live-stream, flex-layout]

requires:
  - phase: 05-02
    provides: ChatPanel, ChatInput, ChatMessage atoms and molecule
  - phase: 05-03
    provides: MuteButton atom, chat.js live module (sendMessage, muteMember, unmuteMember, chatAll, chatTeamA, chatTeamB, chatSpectators)

provides:
  - SpectatorsPanel extended with MuteButton and (muted) indicator — host-only guard via isHost prop
  - +page.svelte wired to chat live streams via activeChatStream derived; ChatPanel visible in lobby and draft branches
  - Flex row layout in both lobby and draft phases accommodating 280px ChatPanel right sidebar
  - mutedIds derived from snapshot.mutedIds (patch events from muteMember/unmuteMember RPCs)
  - handleSendMessage, handleMute, handleUnmute action handlers in +page.svelte

affects: [05-05-verification, review-phase-ui]

tech-stack:
  added: []
  patterns:
    - "activeChatStream derived.by pattern — switches live stream based on activeTab reactive state"
    - "fromStore(activeChatStream(code)).current pattern for reactive chat stream subscription"
    - "flex flex-row items-start mainClass — both lobby and draft branches now use uniform flex layout"
    - "currentUserName derived from snapshot.members when server load does not expose displayName"

key-files:
  created: []
  modified:
    - src/lib/components/molecules/SpectatorsPanel.svelte
    - src/routes/draft/[id]/+page.svelte

key-decisions:
  - "currentUserName derived from snapshot.teams.A+B members since +page.server.js does not expose data.userName"
  - "JSDoc @type {any} annotation on .some()/.find() callbacks to resolve implicit-any errors not present in spread pattern"
  - "mainClass is always flex flex-row items-start — conditional max-w removed from outer main; per-branch wrappers handle their own max-width"

patterns-established:
  - "Pattern: activeChatStream derived from activeTab — compose live.stream reference reactively then subscribe via fromStore"

requirements-completed: [CHAT-01, CHAT-02, HOST-04]

duration: 3min
completed: 2026-04-05
---

# Phase 05 Plan 04: Chat Integration — UI Wiring Summary

**SpectatorsPanel extended with host-only MuteButton and muted indicator; +page.svelte wired to chat live streams with flex-row sidebar layout in both lobby and draft phases**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-05T17:06:59Z
- **Completed:** 2026-04-05T17:09:53Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- SpectatorsPanel now renders MuteButton alongside each spectator row when isHost is true, with a `(muted)` inline indicator when the spectator's id is in mutedIds
- +page.svelte imports ChatPanel and all chat RPC exports; ChatPanel is rendered as a flex sibling in both the lobby and drafting/cancelled branches
- Layout updated from conditional max-width/mx-auto to flex flex-row so the ChatPanel sidebar sits correctly at 280px fixed width alongside the flex-1 content area
- Tab switching in ChatPanel drives activeChatStream derived state, which subscribes to the correct live stream (chatAll / chatTeamA / chatTeamB / chatSpectators) reactively
- mutedIds flows from snapshot.mutedIds (populated by patch events from muteMember/unmuteMember RPCs) down through SpectatorsPanel

## Task Commits

1. **Task 1: Extend SpectatorsPanel with MuteButton and muted indicator** - `1696dc2` (feat)
2. **Task 2: Wire ChatPanel into +page.svelte with live streams and layout update** - `5181f38` (feat)

## Files Created/Modified

- `src/lib/components/molecules/SpectatorsPanel.svelte` - Added isHost, mutedIds, onMute, onUnmute props; MuteButton import and usage; (muted) indicator; flex min-h-11 li layout
- `src/routes/draft/[id]/+page.svelte` - ChatPanel import and usage in both branches; chat state derivations; handleSendMessage/handleMute/handleUnmute handlers; flex row mainClass; flex-1 content wrappers

## Decisions Made

- `currentUserName` derived from snapshot.teams.A+B members since `+page.server.js` load function does not expose `data.userName`
- JSDoc `@type {any}` annotation added on `.some()` and `.find()` callback parameters to resolve svelte-check implicit-any errors — these arose when accessing `snapshot.teams.A.some()` directly (vs. spread pattern used in existing `onTeam` derived which has no error)
- `mainClass` is always `flex flex-row items-start gap-4 px-4 py-6 text-text-primary` (no conditional) — the outer main no longer carries max-width constraints; each branch wraps its content in `flex-1 min-w-0` with its own max-width

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added JSDoc type annotations to fix implicit-any errors in chat derived state**
- **Found during:** Task 2 (+page.svelte wiring)
- **Issue:** `snapshot.teams.A.some((m) => ...)` and `.find((m) => ...)` produced "Parameter 'm' implicitly has an 'any' type" from svelte-check; identical pattern in existing `onTeam` derived (using spread) had no error
- **Fix:** Added `(/** @type {any} */ m)` annotations to the three callback parameters in `userTeam` and `currentUserName` derivations
- **Files modified:** src/routes/draft/[id]/+page.svelte
- **Verification:** svelte-check completed with 0 errors
- **Committed in:** `5181f38` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — type annotation)
**Impact on plan:** Minimal fix required for svelte-check compliance. No scope creep.

## Issues Encountered

None beyond the implicit-any annotation fix noted above.

## Known Stubs

None — ChatPanel is wired to real live stream data from activeChatStream; MuteButton callbacks trigger real muteMember/unmuteMember RPCs; mutedIds flows from real snapshot patch events.

## Next Phase Readiness

- End-to-end chat integration is complete: users can send and receive messages, hosts can mute/unmute spectators
- Plan 05 (verification) can now run full integration checks against the wired chat UI
- No blockers

---
*Phase: 05-chat-moderation*
*Completed: 2026-04-05*
