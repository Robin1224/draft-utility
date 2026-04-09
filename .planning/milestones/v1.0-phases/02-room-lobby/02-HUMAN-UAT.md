---
status: partial
phase: 02-room-lobby
source: [02-VERIFICATION.md]
started: 2026-04-03T15:30:00Z
updated: 2026-04-03T15:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Create room and land in lobby as host
expected: Redirect to /draft/<code>; host controls visible only for creator  
result: [pending]

### 2. Guest opens room link
expected: Roster visible; no join-team buttons; sign-in link works  
result: [pending]

### 3. Two players join opposite teams and become captains; host starts draft
expected: Start enabled only with both captains; phase moves toward drafting in UI  
result: [pending]

### 4. Copy room link
expected: Clipboard receives full URL with correct origin  
result: [pending]

### 5. Host kick / move / cancel
expected: Roster updates for all clients; cancelled room no longer loadable by code  
result: [pending]

## Summary

total: 5  
passed: 0  
issues: 0  
pending: 5  
skipped: 0  
blocked: 0  

## Gaps
