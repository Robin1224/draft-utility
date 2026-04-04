---
phase: 5
slug: chat-moderation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npm run test -- --run src/live/chat.spec.js src/lib/chat-filter.spec.js` |
| **Full suite command** | `npm run test -- --run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run src/live/chat.spec.js src/lib/chat-filter.spec.js`
- **After every plan wave:** Run `npm run test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-W0-01 | W0 | 0 | CHAT-01,02,03,04,HOST-04 | unit stub | `npm run test -- --run src/live/chat.spec.js` | ❌ W0 | ⬜ pending |
| 5-W0-02 | W0 | 0 | CHAT-04 | unit stub | `npm run test -- --run src/lib/chat-filter.spec.js` | ❌ W0 | ⬜ pending |
| 5-01-01 | 01 | 1 | CHAT-04 | unit | `npm run test -- --run src/lib/chat-filter.spec.js` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | CHAT-03 | unit | `npm run test -- --run src/live/chat.spec.js` | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 1 | CHAT-01,02 | unit | `npm run test -- --run src/live/chat.spec.js` | ❌ W0 | ⬜ pending |
| 5-02-02 | 02 | 1 | HOST-04 | unit | `npm run test -- --run src/live/chat.spec.js` | ❌ W0 | ⬜ pending |
| 5-03-01 | 03 | 2 | CHAT-01,02 | e2e-manual | — | N/A | ⬜ pending |
| 5-03-02 | 03 | 2 | HOST-04 | e2e-manual | — | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/live/chat.spec.js` — stubs for CHAT-01, CHAT-02, CHAT-03, HOST-04 (RPC auth, rate limit, mute)
- [ ] `src/lib/chat-filter.spec.js` — stubs for CHAT-04 (NFKC normalize, zero-width strip, slur match, length cap)

*Existing test infrastructure (vitest) is already installed — Wave 0 only needs test files.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Team isolation visible in browser | CHAT-01, CHAT-02 | Requires two simultaneous connections with different team contexts | Open two browser windows as Team A and Team B users; verify messages from Team A do not appear in Team B's ChatPanel |
| Spectator cannot read team messages | CHAT-02 | Requires spectator + team sessions simultaneously | Log in as spectator and as Team A member; verify spectator ChatPanel shows no team messages |
| Host mute takes effect immediately | HOST-04 | Requires host session and spectator session | As host, mute a spectator; verify their subsequent messages no longer appear in spectator chat |
| Silent drop behavior (no error shown) | CHAT-03, CHAT-04 | Rate-limit and slur drops are invisible to sender by design (D-12) | Trigger rate limit and slur filter; verify no error toast or message appears in sender's UI |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
