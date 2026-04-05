---
phase: 05-chat-moderation
plan: 02
subsystem: api
tags: [svelte-realtime, chat, filter, moderation, rate-limiting, in-memory]

requires:
  - phase: 05-01
    provides: Wave 0 it.todo spec stubs for chat-filter.spec.js and chat.spec.js
  - phase: 02-room-lobby
    provides: getRoomByPublicCode, topicForRoom, room_member schema
  - phase: 01-auth-realtime-transport
    provides: live/LiveError from svelte-realtime/server, ctx.user shape from hooks.ws.js

provides:
  - src/lib/slur-list.json — bundled slur word list with word-boundary matching
  - src/lib/chat-filter.js — pure filterMessage pipeline (length cap → NFKC → zero-width strip → slur regex)
  - src/live/chat.js — four live.stream channel subscriptions + sendMessage + muteMember + unmuteMember RPCs

affects:
  - 05-03 (ChatPanel UI wires to chat.js sendMessage and stream subscriptions)
  - 05-04 (SpectatorsPanel extends with muteMember/unmuteMember RPC calls and muted indicator)
  - 05-05 (integration/e2e tests rely on this server layer)

tech-stack:
  added: []
  patterns:
    - "Pure filter module (chat-filter.js) with no external dependencies tested without vi.mock"
    - "vi.resetModules() + vi.clearAllMocks() before each test to get fresh module instance with clean mock call history"
    - "loadFreshChat() helper extracts stream init fns (live.stream.mock.calls) and RPC handlers (live.mock.calls) after module re-import"
    - "muteMap exported from chat.js as module-scope Map for cross-module access and test inspection"
    - "mute state published as 'patch' event to lobby topic (topicForRoom) so host UI receives updates without full snapshot reload"

key-files:
  created:
    - src/lib/slur-list.json
    - src/lib/chat-filter.js
    - src/live/chat.js
  modified:
    - src/lib/chat-filter.spec.js
    - src/live/chat.spec.js

key-decisions:
  - "slur-list.json uses word-boundary regex (\b) at module load time — avoids Scunthorpe false positives (e.g. 'assassin' not blocked by 'ass')"
  - "Rate limit key: guestId|userId + ctx.id + roomId — different rooms have isolated buckets (D-12)"
  - "vi.resetModules() + vi.clearAllMocks() ordering in loadFreshChat() is mandatory — clearAllMocks() after resetModules() ensures mock call records belong to the freshly imported module instance"
  - "muteMap published as 'patch' event to lobby topic (not chat topic) — isolates mute state sync from chat message flow (Pattern 5 Option A)"
  - "chatTeam cached on ctx.user at stream init time via cachePlayerTeam() — avoids per-message DB reads (Pitfall 1)"

patterns-established:
  - "loadFreshChat() test helper pattern: vi.resetModules() + vi.clearAllMocks() + import, then extract handlers from mock.calls"
  - "chat-filter.js as a zero-dependency pure function module — no mocks needed in its spec"

requirements-completed: [CHAT-01, CHAT-02, CHAT-03, CHAT-04, HOST-04]

duration: 5min
completed: 2026-04-05
---

# Phase 05 Plan 02: Chat Filter and Live Module Summary

**Server-side chat layer: bundled slur-list.json, pure filterMessage pipeline (length → NFKC → zero-width → word-boundary regex), and chat.js with four live.stream channels plus sendMessage/muteMember/unmuteMember RPCs with rate limiting and mute state.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-05T16:55:17Z
- **Completed:** 2026-04-05T17:00:54Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `src/lib/slur-list.json` created: minimal starter word list with word-boundary safety (Scunthorpe problem avoided)
- `src/lib/chat-filter.js` created: pure filterMessage pipeline — length cap (500 chars), NFKC normalization, zero-width character stripping, word-boundary slur regex; all 14 spec tests passing
- `src/live/chat.js` created: four `live.stream` channel subscriptions with team/role-based access, `sendMessage` RPC with full filter+rate-limit+auth+mute pipeline, `muteMember`/`unmuteMember` RPCs with lobby-topic patch event for host UI sync; all 18 spec tests passing

## Task Commits

1. **Task 1: slur-list.json + chat-filter.js + chat-filter.spec.js** - `fb4a5dd` (feat)
2. **Task 2: chat.js + chat.spec.js** - `137d4c5` (feat)

**Plan metadata:** (see final commit after state update)

## Files Created/Modified

- `src/lib/slur-list.json` — JSON array of lowercase slur terms for v1
- `src/lib/chat-filter.js` — exports `filterMessage(body)` — pure filter pipeline
- `src/live/chat.js` — exports 8 named values: chatAll, chatTeamA, chatTeamB, chatSpectators, sendMessage, muteMember, unmuteMember, muteMap
- `src/lib/chat-filter.spec.js` — 14 passing tests replacing all it.todo stubs
- `src/live/chat.spec.js` — 18 passing tests replacing all it.todo stubs

## Decisions Made

- Word-boundary regex (`\b`) built once at module load for slur matching — avoids per-message regex compilation and Scunthorpe false positives
- Rate limit key includes `roomId` so cross-room isolation is guaranteed (D-12)
- `vi.resetModules()` followed by `vi.clearAllMocks()` in the `loadFreshChat()` helper — this ordering is critical: mock call records must be cleared AFTER resetModules to capture only calls from the freshly imported module instance
- mute patch published to `topicForRoom(code)` (lobby topic), not chat topic — intentional per D-17 and Pattern 5 Option A so host UI receives mute state without subscribing to spectator chat

## Deviations from Plan

None — plan executed exactly as written. The test approach (extracting handlers from `live.mock.calls` after `vi.resetModules()`) required a specific `vi.clearAllMocks()` call ordering that the plan didn't specify, but this is a test implementation detail, not a deviation from plan behavior.

## Issues Encountered

The initial test run had 5 failures because `vi.clearAllMocks()` was not called before capturing mock call records after `vi.resetModules()`. Adding `vi.clearAllMocks()` inside `loadFreshChat()` (before the module import) resolved all failures in one fix attempt.

## Known Stubs

None — all exported functions are fully implemented with real behavior.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `src/lib/chat-filter.js` and `src/live/chat.js` are production-ready server-side chat layer
- Plan 03 (ChatPanel UI) can now wire `sendMessage` RPC and `chatAll`/`chatTeamA`/`chatTeamB`/`chatSpectators` stream subscriptions
- Plan 04 (SpectatorsPanel mute UI) can call `muteMember`/`unmuteMember` RPCs and subscribe to lobby patch events for `mutedIds`
- Full server test suite: 119 passing, 1 skipped, 26 todo (all todo stubs are from other phases' Wave 0 scaffolds)

---
*Phase: 05-chat-moderation*
*Completed: 2026-04-05*
