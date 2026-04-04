---
status: complete
phase: 04-draft-ui-disconnect-resilience
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md]
started: 2026-04-04T13:45:00Z
updated: 2026-04-04T14:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Draft board renders on phase transition
expected: Start a room in lobby with 2 teams and start the draft. The page should switch from the lobby layout to a 3-column draft layout: Team A column on the left, champion grid in the center, Team B column on the right. A turn indicator at the top shows which team's turn it is and the pick/ban type (e.g. "Team A — Pick").
result: pass

### 2. Timer counts down with urgency styling
expected: The turn timer in the TurnIndicator ticks down each second. When the timer reaches ≤10 seconds remaining, the timer text turns red.
result: pass

### 3. Champion single-select and Submit
expected: Click a champion card in the grid — it highlights as selected. Clicking the same card again deselects it. A "Submit" button appears only when a champion is selected. Clicking Submit submits the pick/ban.
result: pass

### 4. Pick/ban recorded in team column
expected: After submitting a pick or ban, the champion appears in the correct team's PICKS or BANS section in the DraftSlot. The slot transitions from empty (dashed border) to filled with the champion name.
result: pass

### 5. Timer auto-advances the turn
expected: Let the timer run to zero without submitting. The turn should automatically advance to the next team/action. The TurnIndicator updates to show the new active team and the timer resets.
result: pass

### 6. Captain disconnect triggers PauseOverlay
expected: Open a second browser session as the active captain, then close it (or disconnect the WebSocket). In the remaining session, a full-screen dark overlay appears saying "Draft paused", showing the disconnected captain's name, and a grace countdown timer ticking down from 30 seconds.
result: pass

### 7. Captain reconnects within grace window
expected: While the PauseOverlay countdown is active, reconnect the captain session (reopen the tab/reload). The overlay dismisses and the draft resumes with the turn timer restarting from full duration.
result: pass

### 8. Second disconnect uses shorter 10s grace
expected: After the captain reconnects (test 7 passed), disconnect them again. The PauseOverlay reappears but now counts down from 10 seconds (not 30).
result: pass

### 9. Grace expires with eligible member — promotion
expected: Let the 30s grace timer expire while a non-captain teammate is present on the same team. The overlay dismisses, the teammate is promoted to captain, and a green status banner briefly appears announcing the promotion before auto-dismissing after ~3 seconds.
result: pass

### 10. Grace expires with no eligible member — cancellation
expected: Let the grace timer expire with no other team members on the active turn's team. The draft transitions to a "Draft cancelled" state. The page shows a "Draft cancelled" heading and a message naming the correct team (e.g. "No captain was available for Team A"). A "Return to lobby" button is present.
result: pass

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
