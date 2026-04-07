---
phase: 1
slug: auth-realtime-transport
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-03
completed: 2026-04-07
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run src/routes/login/page.server.spec.js` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/routes/login/page.server.spec.js`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|-------------|-----------|-------------------|-------------|--------|
| AUTH-01 | Sign-in (account creation via Discord OAuth) | unit | `npx vitest run src/routes/login/page.server.spec.js` | ✅ exists | ✅ green |
| AUTH-02 | Sign-out | unit | `npx vitest run src/routes/login/page.server.spec.js` | ✅ exists | ✅ green |
| AUTH-03 | Discord OAuth redirect | manual | — browser only — | — | ✅ green (human UAT in 01-VERIFICATION.md) |
| AUTH-04 | WebSocket identity at upgrade | manual | — requires live WS upgrade — | — | ✅ green (human UAT in 01-VERIFICATION.md) |

---

## Wave 0 Requirements

- [x] `src/routes/login/page.server.spec.js` — covers AUTH-01, AUTH-02 (load redirect, signin, signout actions)
- [x] Manual steps documented in `01-VERIFICATION.md` for AUTH-03 (Discord OAuth) and AUTH-04 (WS identity)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Status |
|----------|-------------|------------|--------|
| Discord OAuth redirect → callback → session | AUTH-03 | Requires browser + live Discord app credentials | ✅ green (verified in 01-VERIFICATION.md) |
| Session persists across page reload | AUTH-01 | Browser state — not testable in vitest | ✅ green (verified in 01-VERIFICATION.md) |
| Protected routes inaccessible after sign-out | AUTH-02 | Requires SvelteKit route guard in browser context | ✅ green (verified in 01-VERIFICATION.md) |

---

## Validation Sign-Off

- [x] All tasks have automated verify or documented manual-only reason
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all requirements
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete 2026-04-07
