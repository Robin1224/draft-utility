---
status: partial
phase: 11-terminal-modals
source: [11-VERIFICATION.md]
started: 2026-08-21T15:35:00Z
updated: 2026-08-21T15:35:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Reduced-motion entrance suppression
expected: Under OS `prefers-reduced-motion: reduce`, opening Draft Settings or Host Console shows the modal instantly — no translate/scale (`cy-modal-in`) entrance animation. (Only the CSS `animation: none` contract is machine-verified; the OS setting cannot be toggled from the spec.)
result: [pending]

### 2. Real-mouse drag reorder persists through SAVE_CONFIG()
expected: In Draft Settings, dragging a script row by its ⠿ grip with a real mouse reorders the pick/ban turns; after `SAVE_CONFIG()` the new order is retained (and would apply at START_DRAFT). HTML5 drag-and-drop is not simulatable in vitest-browser — the [↑]/[↓] logic path is machine-verified.
result: [pending]

### 3. ≤640px full-screen takeover layout
expected: At viewport widths of 640px or less, both modals become a full-screen takeover: titlebar pinned to the top, footer pinned to the bottom, body scrolls in between; the 7-column script rows fit without horizontal overflow at 320px.
result: [pending]

### 4. Dimmed lobby backdrop appearance
expected: While either modal is open, the lobby behind it is visibly dimmed by the scrim (`::backdrop`) and the terminal-window frame (three dots, `~/draft/…` title, `esc ✕`) reads as a window over the lobby — matching the Cyber prototype's feel.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
