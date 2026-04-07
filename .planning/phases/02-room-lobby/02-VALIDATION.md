---
phase: 2
slug: room-lobby
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-03
completed: 2026-04-07
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vite.config.js` (`test.projects`) |
| **Quick run command** | `npx vitest run src/lib/server/rooms.spec.js` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/server/rooms.spec.js`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|-------------|-----------|-------------------|-------------|--------|
| ROOM-01 | Create room | unit | `npx vitest run src/lib/server/rooms.spec.js src/routes/draft/[id]/page.server.spec.js` | ✅ exists | ✅ green |
| ROOM-02 | Join parse (URL/code) | unit | `npx vitest run src/lib/join-parse.spec.js` | ✅ exists | ✅ green |
| ROOM-03 | Guest spectator read-only | unit | `npx vitest run src/live/room.spec.js` | ✅ exists | ✅ green |
| ROOM-04 | Team join with capacity cap | unit | `npx vitest run src/live/room.spec.js` | ✅ exists | ✅ green |
| ROOM-05 | Team cap 3 enforced | unit | `npx vitest run src/lib/server/rooms.spec.js` | ✅ exists | ✅ green |
| ROOM-06 | Kick/move (host controls) | unit | `npx vitest run src/live/room.spec.js` | ✅ exists | ✅ green |
| ROOM-07 | Copy room link | manual | — clipboard API requires browser — | — | ✅ green (human UAT) |
| ROOM-08 | Room lifecycle expiry | unit | `npx vitest run src/lib/server/room-lifecycle.spec.js` | ✅ exists | ✅ green |
| HOST-02 | Kick player | unit | `npx vitest run src/live/room.spec.js` | ✅ exists | ✅ green |
| HOST-03 | Move player between teams | unit | `npx vitest run src/live/room.spec.js` | ✅ exists | ✅ green |

---

## Wave 0 Requirements

- [x] `src/lib/join-parse.spec.js` — ROOM-02 URL/code parsing
- [x] `src/live/room.spec.js` — host/guest/player matrix (ROOM-03, ROOM-04, ROOM-06, HOST-02, HOST-03)
- [x] `src/lib/server/rooms.spec.js` — ROOM-01, ROOM-05, ROOM-06
- [x] `src/routes/draft/[id]/page.server.spec.js` — ROOM-01 server load
- [x] `src/lib/server/room-lifecycle.spec.js` — ROOM-08
- [x] Manual steps documented in `02-VERIFICATION.md` for ROOM-07 (clipboard)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Status |
|----------|-------------|------------|--------|
| Copy full room URL | ROOM-07 | Clipboard API / browser | ✅ green (human UAT) |
| Guest spectator read-only | ROOM-03 | Full WS + cookies | ✅ green (human UAT) |
| End-to-end create → join | ROOM-01/02 | Multi-browser | ✅ green (human UAT) |

---

## Validation Sign-Off

- [x] All tasks have automated verify or documented manual-only reason
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all requirements
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete 2026-04-07
