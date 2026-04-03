---
phase: 2
slug: room-lobby
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vite.config.js` (`test.projects`) |
| **Quick run command** | `npm run test:unit -- --run --project server` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit -- --run --project server`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

Six plans (`02-01` … `02-06`) define per-task `<automated>` commands. Reconcile row-by-row after first execution wave; source: `02-RESEARCH.md` § Validation Architecture.

| Plan | Tasks | Primary verify pattern |
|------|-------|-------------------------|
| 02-01 | 3 | `npm run check`, targeted `test:unit` |
| 02-02 | 3 | `rg` + `npm run check` |
| 02-03 | 3 | `npm run check`, `room.spec.js` |
| 02-04 | 3 | `npm run check`, `room.spec.js` (incl. HOST-02 kick) |
| 02-06 | 3 | `test:unit`, `rg`, `check` |
| 02-05 | 3 | `npm run check` (full `build` at wave / manual) |

---

## Wave 0 Requirements

- [ ] `src/lib/server/join-parse.spec.js` — ROOM-02 URL/code parsing
- [ ] `src/live/room.spec.js` (or equivalent) — `createTestEnv` host/guest/player matrix
- [ ] Room create / DB or action tests — ROOM-01
- [ ] Manual steps for ROOM-07 documented when `02-HUMAN-UAT.md` exists

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Copy full room URL | ROOM-07 | Clipboard API / browser | Open lobby, click Copy link, paste in notepad; must match full `http(s)://…/draft/CODE` |
| Guest spectator read-only | ROOM-03 | Full WS + cookies | Join as guest; confirm no join-team; roster updates visible |
| End-to-end create → join | ROOM-01/02 | Multi-browser optional | Create room signed-in; second session joins via link |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
