---
phase: 02-room-lobby
verified: 2026-04-03T15:30:00Z
status: human_needed
score: 6/6 roadmap success criteria verified in code
human_verification:
  - test: "Create room and land in lobby as host"
    expected: "Redirect to /draft/<code>; host controls visible only for creator"
    why_human: "End-to-end auth + navigation + visual role affordances"
  - test: "Guest opens room link"
    expected: "Roster visible; no join-team buttons; sign-in link works"
    why_human: "Session/cookie + realtime guest path"
  - test: "Two players join opposite teams and become captains; host starts draft"
    expected: "Start enabled only with both captains; phase moves toward drafting in UI"
    why_human: "Multi-client realtime and timing"
  - test: "Copy room link"
    expected: "Clipboard receives full URL with correct origin in deployed environment"
    why_human: "navigator.clipboard requires secure context and user gesture; staging URL must match expectations"
  - test: "Host kick / move / cancel"
    expected: "Roster updates for all clients; cancelled room no longer loadable by code"
    why_human: "Multi-user WS observation"
---

# Phase 2: Room & Lobby Verification Report

**Phase goal:** Players can create and join rooms, form teams with auto-assigned captains, and the host can fully manage the lobby before the draft begins.

**Verified:** 2026-04-03T15:30:00Z

**Status:** human_needed

**Re-verification:** No — initial verification.

## Goal Achievement

### Observable Truths (from ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Signed-in user creates a room and immediately appears as non-transferable host; a copyable room link is available in the lobby | ✓ VERIFIED | `createRoom` action redirects to `/draft/[id]` with persisted `host_user_id` (`+page.server.js`, `rooms.js` `createRoom`). Host UI gated by `data.userId === data.room.host_user_id` (`+page.svelte`). Copy uses `data.appOrigin` + `resolve('/draft/[id]', …)` and `navigator.clipboard.writeText` (`+page.svelte`). No host-transfer path in schema/API. |
| 2 | Any user (including unauthenticated guests) can join a room via link or room ID; guests land as spectators with read-only access | ✓ VERIFIED | `Join.svelte` uses `parseRoomCode` + `goto`. `getRoomByPublicCode` on load (`draft/[id]/+page.server.js`). `lobby` stream allows guests (`access: () => true`); guests upserted as spectators (`upsertGuestSpectator`). `joinTeam` rejects non-players (`room.js`). `TeamColumn` hides join buttons for guests, shows sign-in link. |
| 3 | Signed-in users can join a team; team membership is capped at 3; the first player to join each team becomes that team's captain automatically | ✓ VERIFIED | `joinTeamForUser` enforces cap (`TEAM_FULL`), `recomputeTeamCaptains` sets earliest `joined_at` as captain per team (`rooms.js`). `joinTeam` RPC republishes snapshot. UI shows Captain badge (`TeamColumn.svelte`). |
| 4 | Host can kick any lobby member and can move signed-in players between teams; moves are locked once the draft starts | ✓ VERIFIED | `kickMember` / `movePlayer` DB helpers assert host (`assertHost`); `movePlayer` throws `LOBBY_PHASE_REQUIRED` when `phase !== 'lobby'` (`rooms.js`). Live RPCs mirror checks (`room.js`). `LobbyHostBar` exposes kick list and move UI; move disabled when `snapshot.phase !== 'lobby'`. |
| 5 | Host can start the draft only when both teams have at least one captain; the start button is disabled otherwise | ✓ VERIFIED | `startDraftIfReady` requires each team: ≥1 signed-in member (`user_id` not null) and ≥1 `is_captain` (`rooms.js`). `LobbyHostBar` derives `startDisabled` from captains on A/B and shows “Both teams need a captain” when applicable. |
| 6 | Room state is cleaned up or expired after the draft ends or is cancelled; orphaned rooms do not persist indefinitely | ✓ VERIFIED (Phase 2 scope) | `cancelRoomAsHost` sets `phase: 'ended'` + `ended_at`. `getRoomByPublicCode` returns `null` for ended / `ended_at`, and lazily ends lobby rows idle ≥24h (`room-lifecycle.js` + `rooms.js`). **Note:** automatic transition when a draft **finishes** is explicitly deferred to Phase 3 in `rooms.js` comments (read path already hides ended rooms). |

**Score:** 6/6 truths supported by implementation (truth 6 includes documented Phase 3 follow-up for “draft completed” → ended).

### Required Artifacts (plan `must_haves` + gsd-tools)

`gsd-tools verify artifacts` was run per plan. **02-05** reported a false negative on `LobbyHostBar.svelte` (pattern `Start draft|startDraft`): the file contains the label **“Start draft”** and wires `onStartDraft` (see `LobbyHostBar.svelte` lines 87–95).

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/server/db/schema.js` | `room`, `room_member` | ✓ | `host_user_id`, `public_code`, team/guest columns |
| `src/lib/server/rooms.js` | CRUD, snapshot, host ops | ✓ | Substantive; uses Drizzle (`db.insert` / `select` / `update` / `delete`) |
| `src/lib/join-parse.js` | `parseRoomCode` | ✓ | Used by routes and `rooms.js` |
| `src/routes/+page.server.js` | `createRoom` action | ✓ | Auth gate + redirect |
| `src/routes/draft/[id]/+page.server.js` | Load by code | ✓ | 404 when `getRoomByPublicCode` null; exposes `appOrigin` |
| `src/live/room.js` | Lobby stream + RPCs | ✓ | `merge: 'set'`, publish after mutations |
| `src/live/room.spec.js` | Tests | ✓ | Present |
| `src/hooks.server.js` | `draft_guest` cookie | ✓ | Sets cookie when missing |
| `src/hooks.ws.js` | Guest id + `message` export | ✓ | `export { message }`; guest cookie read on upgrade |
| `src/routes/draft/[id]/+page.svelte` | Lobby UI + `$live/room` | ✓ | Imports `lobby`, RPCs; subscribes via `fromStore(lobby(code))` |
| `src/lib/components/molecules/LobbyHostBar.svelte` | Host controls | ✓ | Kick, move, start, cancel |
| `src/lib/server/room-lifecycle.js` | Abandon / hide rules | ✓ | `LOBBY_ABANDON_TTL_MS`, `shouldAbandonLobby`, `shouldHideRoomFromPublic` |

### Key Link Verification

`gsd-tools verify key-links` often failed because PLAN entries use **bare filenames** (e.g. `Create.svelte`, `+page.svelte`) or non-path `from` values; the tool could not resolve files. **Manual verification:**

| From | To | Via | Status |
|------|-----|-----|--------|
| `Create.svelte` | `?/createRoom` | `form action="?/createRoom"` | ✓ WIRED |
| `Join.svelte` | `parseRoomCode` | submit handler before `goto` | ✓ WIRED |
| `room.js` | `topicForRoom` / snapshot | import from `rooms.js`; `ctx.publish(..., 'set', snap)` | ✓ WIRED |
| `hooks.server.js` | `draft_guest` | `event.cookies.set` / `get` | ✓ WIRED |
| `kickMember` (DB) | `room_member` delete | `db.delete(room_member)` in `kickMember` | ✓ WIRED |
| `getRoomByPublicCode` | `room-lifecycle.js` | imports `shouldAbandonLobby`, `shouldHideRoomFromPublic` | ✓ WIRED |
| `+page.svelte` (draft) | `lobby(code)` | `fromStore(lobby(code))` | ✓ WIRED |
| Copy control | `clipboard` | `copyLink` → `navigator.clipboard.writeText` | ✓ WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data variable | Source | Produces real data | Status |
|----------|---------------|--------|--------------------|--------|
| `draft/[id]/+page.svelte` | `streamVal` / `snapshot` | `lobby(publicCode)` live stream + HTTP `data.room` | DB-backed `loadLobbySnapshot` / `getRoomByPublicCode` | ✓ FLOWING |
| Team columns | `members` | snapshot `teams.A` / `teams.B` | Same snapshot | ✓ FLOWING |
| Copy link | `fullUrl` | `url.origin` from load + `public_code` | Server load provides origin | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Server unit suite | `npm run test:unit -- --run --project server` | 38 passed, 1 skipped (39 total) | ✓ PASS |

Vitest emitted **svelte-realtime** warnings about `hooks.ws.js` not exporting `message` during transform; the **actual file** re-exports `message` from `svelte-realtime/server` — treat as analyzer noise unless reproduced in dev.

**Full `npm run test`:** not run here; may require Playwright browsers for the browser project — run locally if CI does not cover it.

### Requirements Coverage

| Requirement | Source plan(s) | Description (from REQUIREMENTS.md) | Status | Evidence |
|-------------|----------------|-------------------------------------|--------|----------|
| ROOM-01 | 02-01, 02-02 | Create room; creator is non-transferable host | ✓ SATISFIED | `createRoom` + `host_user_id` on `room` |
| ROOM-02 | 02-02 | Join via ID or shareable link | ✓ SATISFIED | `Join.svelte`, `parseRoomCode`, draft load |
| ROOM-03 | 02-03, 02-05 | Guests join as spectators; read-only | ✓ SATISFIED | Guest stream + `joinTeam` gate + UI |
| ROOM-04 | 02-03 | Join team; max 3 per side | ✓ SATISFIED | `joinTeamForUser` / `TEAM_FULL` |
| ROOM-05 | 02-03 | First on team = captain | ✓ SATISFIED | `recomputeTeamCaptains` |
| ROOM-06 | 02-04, 02-05 | Start draft when both teams have captain; gate in UI | ✓ SATISFIED | `startDraftIfReady` + `LobbyHostBar` |
| ROOM-07 | 02-05 | Host can share copy-to-clipboard link | ✓ SATISFIED | `copyLink` + absolute URL |
| ROOM-08 | 02-06 | Cleanup / expiry after end or cancel; no indefinite orphan lobbies | ✓ SATISFIED (see truth 6) | Cancel + lazy 24h abandon + hide ended |
| HOST-02 | 02-04 | Host can kick players and spectators | ✓ SATISFIED | `kickMember` + UI |
| HOST-03 | 02-04 | Host can move players before draft; locked after | ✓ SATISFIED | `movePlayer` phase check + UI disable |

**Orphaned requirements:** None — all listed IDs appear in at least one PLAN frontmatter `requirements` array.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No blocking TODO/FIXME/stub handlers in phase-2 lobby paths | — | — |

### Human Verification Required

See YAML frontmatter `human_verification` for structured UAT items (multi-client realtime, clipboard, guest flow).

### Gaps Summary

No **code gaps** found that block the Phase 2 goal: server logic, HTTP wiring, live RPCs, and lobby UI align with ROADMAP success criteria and declared requirements.

**Residual risk:** Realtime and clipboard behavior need **manual UAT** in a running app (hence `status: human_needed`). **ROOM-08 / “draft ended”:** closing the room when the draft **completes** is contracted to Phase 3 in source comments; Phase 2 delivers cancel, lazy lobby expiry, and hiding ended rows on read.

---

_Verified: 2026-04-03T15:30:00Z_

_Verifier: Claude (gsd-verifier)_
