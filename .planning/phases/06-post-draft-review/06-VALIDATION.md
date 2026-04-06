---
phase: 06
slug: post-draft-review
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.js |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | POST-01 | unit | `npm run test` | ✅ existing | ⬜ pending |
| 06-01-02 | 01 | 1 | POST-01 | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | POST-02 | unit | `npm run test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/tests/draft-review.test.js` — stubs for POST-01, POST-02
- [ ] Test fixtures for mock draft actions/snapshot data

*Existing vitest infrastructure covers the framework — only new test stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Shareable link opens without auth | POST-02 | Requires unauthenticated browser session | Open review URL in incognito; verify page loads with picks/bans visible |
| Live transition: draft → review | POST-01 | Requires real-time WebSocket session | Complete a draft; verify page auto-transitions to review view without reload |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
