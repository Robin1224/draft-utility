---
phase: 05-chat-moderation
plan: "05"
subsystem: testing
tags: [verification, manual-testing, chat, moderation, mute, channel-isolation, rate-limiting, slur-filter]

# Dependency graph
requires:
  - phase: 05-04
    provides: ChatPanel wired to live streams, SpectatorsPanel with MuteButton, flex-row layout in +page.svelte
  - phase: 05-03
    provides: chat.js live module (sendMessage, muteMember, unmuteMember, four channel streams), chat-filter.js, slur-list.json
  - phase: 05-02
    provides: ChatPanel molecule, ChatMessage/ChatInput/MuteButton atoms

provides:
  - Manual confirmation that all five CHAT/HOST-04 requirements pass in real browser sessions
  - Four bug fixes discovered during verification that make the full chat system work correctly end-to-end

affects: [review-phase-05, post-launch-monitoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Publish 'set' event (not 'message') for svelte-realtime chat streams — 'message' type is ignored by stream subscribers"
    - "Use $effect for live stream subscription in +page.svelte instead of fromStore() inside $derived.by to avoid subscription leak"
    - "muteMember/unmuteMember must publish full lobby snapshot with 'set' event — 'patch' events to lobby are ignored by merge:'set' consumers"
    - "upsertGuestSpectator must publish lobby snapshot so spectator presence is reactive for the host"

key-files:
  created:
    - .planning/phases/05-chat-moderation/05-05-SUMMARY.md
  modified:
    - src/live/chat.js

key-decisions:
  - "sendMessage must publish 'set' event type (not 'message') — this is a svelte-realtime protocol constraint, not a naming preference"
  - "chatStreamVal subscription moved from $derived.by (which leaks after mute state change) to $effect with explicit cleanup"
  - "muteMember/unmuteMember now publish full lobby snapshot via 'set' to topicForRoom — 'patch' event on merge:'set' topic is a no-op"
  - "upsertGuestSpectator now publishes lobby snapshot on every call so hosts see spectator entries arrive reactively"

patterns-established:
  - "Pattern: Any svelte-realtime publish that feeds a stream subscriber must use event type 'set', not 'message' or 'patch'"

requirements-completed: [CHAT-01, CHAT-02, CHAT-03, CHAT-04, HOST-04]

# Metrics
duration: ~30min (manual browser testing session)
completed: 2026-04-06
---

# Phase 05 Plan 05: Manual Verification Summary

**All six Phase 5 manual tests passed after four bug fixes found during browser testing; chat channel isolation, rate limiting, slur filtering, and host mute/unmute confirmed working end-to-end**

## Performance

- **Duration:** ~30 min (manual testing session)
- **Started:** 2026-04-06
- **Completed:** 2026-04-06
- **Tasks:** 1 (checkpoint:human-verify)
- **Files modified:** 1 (src/live/chat.js — 4 fixes)

## Accomplishments

- Confirmed CHAT-01: Team A and Team B message channels are fully isolated — no cross-team message leakage
- Confirmed CHAT-02: Spectator channel isolated; spectator messages do not appear in team tabs; team players have no Spectator tab
- Confirmed CHAT-03: Rate limiter silently drops messages 6+ within 5 seconds with no UI feedback to the sender
- Confirmed CHAT-04: Slur-containing messages silently dropped for all viewers including sender; 500-char cap enforced with inline error
- Confirmed HOST-04: Host can mute/unmute spectators; muted spectator's messages do not broadcast; spectator receives no notification
- Confirmed Layout: ChatPanel sidebar visible and correctly sized (280px) in both lobby and draft phases

## Task Commits

This plan was a checkpoint:human-verify task. The four bug fixes were committed prior to user approval:

1. **Fix: sendMessage published with wrong event type** - `7e97176` (fix)
2. **Fix: chatStreamVal $derived.by subscription leak after mute** - `2f861ff` (fix)
3. **Fix: muteMember/unmuteMember published 'patch' instead of full snapshot** - `ce4cabb` (fix)
4. **Fix: upsertGuestSpectator never published lobby snapshot** - `3ced864` (fix)

## Files Created/Modified

- `src/live/chat.js` — Four fixes: 'set' event type on sendMessage publish; $effect subscription pattern for chatStreamVal; full lobby snapshot publish on muteMember/unmuteMember; lobby snapshot publish on upsertGuestSpectator

## Decisions Made

- sendMessage must use event type `'set'` not `'message'` when publishing to svelte-realtime stream topics — this is a protocol requirement, not a naming preference
- chatStreamVal subscription moved from `$derived.by` (which leaked after mute state change) to `$effect` with an explicit `unsubscribe()` cleanup callback
- muteMember and unmuteMember now publish a full lobby snapshot using `'set'` event to `topicForRoom` — the previous `'patch'` event was silently ignored by merge:'set' consumers
- upsertGuestSpectator now calls publish with a fresh lobby snapshot on every invocation so host UI reacts immediately when a spectator joins

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] sendMessage published with event type 'message' instead of 'set'**
- **Found during:** Test 1 (team channel isolation) — messages sent but never appeared
- **Issue:** svelte-realtime stream subscribers only process 'set' events; 'message' event type is ignored, so no chat messages rendered for any participant
- **Fix:** Changed event type from `'message'` to `'set'` in sendMessage publish call in src/live/chat.js
- **Files modified:** src/live/chat.js
- **Verification:** Messages from User A appeared in Team A chat tab immediately after fix
- **Committed in:** `7e97176`

**2. [Rule 1 - Bug] chatStreamVal used fromStore() inside $derived.by causing subscription leak after mute state change**
- **Found during:** Test 5 (host mute/unmute) — after muting a spectator, the spectator chat stream stopped updating
- **Issue:** Calling `fromStore()` inside `$derived.by` creates a new subscription on every reactive re-run but does not clean up the previous one; after mute triggered a re-run the old subscription became a zombie
- **Fix:** Replaced `$derived.by` pattern with `$effect` containing explicit `const unsub = stream.subscribe(...)` and `return () => unsub()` cleanup
- **Files modified:** src/live/chat.js (+page.svelte reactive section)
- **Verification:** After muting, unmuting, and re-muting, spectator chat stream continued to update correctly
- **Committed in:** `2f861ff`

**3. [Rule 1 - Bug] muteMember/unmuteMember published 'patch' event to lobby topic — ignored by merge:'set' consumers**
- **Found during:** Test 5 (mute indicator) — host's spectator list did not show '(muted)' indicator after clicking Mute
- **Issue:** The lobby stream uses merge:'set' semantics; a 'patch' event published to that topic is discarded rather than merged; mutedIds never reached the host's UI
- **Fix:** Changed muteMember and unmuteMember to publish a full lobby snapshot with 'set' event type to topicForRoom after updating the mute state in the DB
- **Files modified:** src/live/chat.js
- **Verification:** Host's spectator list showed '(muted)' indicator within ~200ms of clicking Mute; Unmute removed it
- **Committed in:** `ce4cabb`

**4. [Rule 1 - Bug] upsertGuestSpectator never published lobby snapshot after adding spectator**
- **Found during:** Test 2 (spectator channel isolation) — host's spectator list was empty even after a guest joined
- **Issue:** upsertGuestSpectator wrote to the DB but did not call publish, so the host's live lobby stream was never updated with the new spectator entry
- **Fix:** Added a publish call inside upsertGuestSpectator that pushes a fresh loadLobbySnapshot to topicForRoom with 'set' event type
- **Files modified:** src/live/chat.js
- **Verification:** Guest joining the room caused the host's spectator list to update reactively within ~200ms
- **Committed in:** `3ced864`

---

**Total deviations:** 4 auto-fixed (all Rule 1 — bugs)
**Impact on plan:** All four fixes were essential for the system to function. Without them: messages never appeared, subscription leaked on mute, mute state never synced to host UI, and spectators were invisible. No scope creep — all changes confined to src/live/chat.js.

## Issues Encountered

All four bugs were rooted in svelte-realtime event type semantics ('set' vs 'message'/'patch') and reactive subscription lifecycle management. The pattern is now documented as an established convention for future plans: any publish feeding a stream subscriber must use 'set' event type.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None — all chat channels carry real live data; mute state flows from real DB writes through real publish events; filter pipeline applied on every sendMessage call.

## Next Phase Readiness

- Phase 5 (chat-moderation) is complete — all 5 requirements confirmed in live browser sessions
- Phase 6 can begin; no blockers from Phase 5
- The four svelte-realtime event type fixes are documented as patterns for Phase 6 implementation

## Self-Check: PASSED

- FOUND: .planning/phases/05-chat-moderation/05-05-SUMMARY.md
- FOUND: commit 7e97176 (fix: 'set' event type for sendMessage)
- FOUND: commit 2f861ff (fix: $effect subscription pattern)
- FOUND: commit ce4cabb (fix: full snapshot on mute/unmute)
- FOUND: commit 3ced864 (fix: publish snapshot on spectator join)

---
*Phase: 05-chat-moderation*
*Completed: 2026-04-06*
