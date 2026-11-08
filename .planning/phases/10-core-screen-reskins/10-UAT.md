---
status: testing
phase: 10-core-screen-reskins
source: [10-01-SUMMARY.md, 10-02-SUMMARY.md, 10-03-SUMMARY.md, 10-04-SUMMARY.md, 10-05-SUMMARY.md, 10-06-SUMMARY.md, 10-07-SUMMARY.md]
started: 2026-06-15T20:30:41Z
updated: 2026-06-15T20:33:00Z
---

## Current Test

number: 3
name: Lobby — banner, team columns, host console
expected: |
  In a room lobby: a `LOBBY.INIT()` banner with a stats readout (PLAYERS / SPECTATORS /
  TURNS); two team columns — TEAM_A (lime) and TEAM_B (violet) — showing numbered filled
  slots and dashed `<EMPTY>` placeholders, with the captain marked `CAPTAIN`; a spectators
  strip; and the host console bar (`$ COPY_LINK()`, host controls, `▶ START_DRAFT()`).
  Joining a team still works; the phase tracker in the header reflects "lobby".
awaiting: user response

## Tests

### 1. Home — boot log, wordmark reveal, action cards
expected: Terminal hero types the boot log → `DRAFT` wordmark reveals → `REAL-TIME PICK/BAN PROTOCOL` tagline + SPAWN_ROOM/JOIN_ROOM cards; ambient shader behind hero; no duplicate header wordmark. EXECUTE creates a room; code + CONNECT navigates to the draft.
result: issue
reported: "The DRAFT wordmark in the terminal is already there from the start, it is not revealed after the typing animation."
severity: major

### 2. Login — Cyber auth card (Discord + guest)
expected: Visit /login (e.g. via a join that needs auth). A Cyber card shows the `$ ./auth --provider=discord` eyebrow, `USER_AUTH_REQUIRED` heading, a `CONTINUE_DISCORD()` button that still starts Discord OAuth, and a `SPECTATE_AS_GUEST()` link that continues as guest back to where you came from. No Tailwind/old styling.
result: pass

### 3. Lobby — banner, team columns, host console
expected: In a room lobby: a `LOBBY.INIT()` banner with a stats readout (PLAYERS / SPECTATORS / TURNS); two team columns — TEAM_A (lime) and TEAM_B (violet) — showing numbered filled slots and dashed `<EMPTY>` placeholders, with the captain marked `CAPTAIN`; a spectators strip; and the host console bar (`$ COPY_LINK()`, host controls, `▶ START_DRAFT()`). Joining a team still works; the phase tracker in the header reflects "lobby".
result: [pending]

### 4. Drafting — turn clock urgency, pick/ban columns, catalog, chat dock
expected: During a draft: a turn readout + countdown clock; in the final 5 seconds the clock turns red and pulses (urgency). Both teams show pick columns (lime) and ban columns (red, struck-through). The champion catalog grid lets you select a champion and submit via `[LOCK_IN]`. Team chat is docked as a sidebar on a wide window and collapses to a toggleable drawer when the window is narrow (~below 1100px). Picking/banning behaves exactly as before.
result: [pending]

### 5. Pause — Cyber pause card over the draft
expected: When a captain disconnects mid-draft, a Cyber pause card overlays the dimmed draft: `// CONNECTION_LOST` eyebrow, `$ DRAFT.HOLD()` heading, an event log of the disconnect, and a large grace countdown with a violet progress bar counting down, plus a `> if no reconnect, captaincy promotes…` footer.
result: [pending]

### 6. Review — final compositions, ban list, guest-viewable
expected: On a completed draft's review screen: a `$ DRAFT.RESULT()` head with a receipt (room code + status), a two-column grid of both teams' final compositions (pick cards), the full ban list shown struck-through, and `$ COPY_LINK()` / `$ NEW_DRAFT()` actions. Crucially, the review screen loads for a logged-out / guest viewer without forcing sign-in.
result: [pending]

## Summary

total: 6
passed: 1
issues: 1
pending: 4
skipped: 0
blocked: 0

## Gaps

- truth: "On Home, the DRAFT wordmark stays hidden until the boot log finishes typing, then reveals line-by-line"
  status: failed
  reason: "User reported: The DRAFT wordmark in the terminal is already there from the start, it is not revealed after the typing animation."
  severity: major
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
