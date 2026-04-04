---
phase: 4
slug: draft-ui-disconnect-resilience
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.js (or vite.config.js) |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | DRAFT-07 | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | DISC-04 | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 1 | DISC-01 | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 1 | DISC-02 | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 4-02-03 | 02 | 1 | DISC-03 | unit | `npm test -- --run` | ❌ W0 | ⬜ pending |
| 4-03-01 | 03 | 2 | DRAFT-07 | manual | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/draft/__tests__/disconnect.test.js` — stubs for DISC-01, DISC-02, DISC-03, DISC-04
- [ ] `src/lib/draft/__tests__/draftSnapshot.test.js` — stubs for DRAFT-07 reconnect snapshot
- [ ] Existing vitest infrastructure confirmed via `npm test -- --run`

*If existing infrastructure covers all: confirm with quick run passing.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Draft UI shows live countdown and scrollable history | DRAFT-07 | Visual rendering requires browser | Open draft room, verify countdown ticks down and ban/pick history appends in real time |
| Grace timer overlay displayed to all participants | DISC-01 | Multi-client coordination, visual | Disconnect captain browser; verify all participants see 30s overlay |
| Captain reconnect resumes draft without data loss | DISC-02 | Browser reconnect simulation | Disconnect and reconnect captain browser within 30s; verify draft resumes |
| Member promotion when grace expires | DISC-02 | Timing-sensitive multi-client | Let grace expire; verify another team member becomes captain and draft continues |
| Draft cancel notification on no-member scenario | DISC-03 | Multi-client + notification | Let all members disconnect; verify all see clear cancellation notification |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
