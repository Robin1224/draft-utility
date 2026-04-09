---
phase: 6
slug: post-draft-review
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-06
completed: 2026-04-07
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run src/lib/components/molecules/DraftReview.svelte.spec.js` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/components/molecules/DraftReview.svelte.spec.js`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|-------------|-----------|-------------------|-------------|--------|
| POST-01 | Review transition on draft end | unit + browser | `npx vitest run src/lib/components/molecules/DraftReview.svelte.spec.js src/lib/server/draft.spec.js` | ✅ exists | ✅ green |
| POST-02 | Shareable link for unauthenticated visitors | browser | `npx vitest run src/lib/components/molecules/DraftReview.svelte.spec.js` | ✅ exists | ✅ green |

---

## Wave 0 Requirements

- [x] `src/lib/components/molecules/DraftReview.svelte.spec.js` — POST-01, POST-02 (review component renders actions, shareable link visible)
- [x] `src/lib/server/draft.spec.js` — POST-01 (completeDraft sets phase=review, not ended)
- [x] Manual steps documented in `06-HUMAN-UAT.md` for live transition and incognito shareable link

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Status |
|----------|-------------|------------|--------|
| Shareable link opens without auth | POST-02 | Requires unauthenticated browser session (incognito) | ✅ green (verified in 06-HUMAN-UAT.md) |
| Live transition: draft → review | POST-01 | Requires real-time WebSocket session and full draft run | ✅ green (verified in 06-HUMAN-UAT.md) |

---

## Validation Sign-Off

- [x] All tasks have automated verify or documented manual-only reason
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all requirements
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete 2026-04-07
