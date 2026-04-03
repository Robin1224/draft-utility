---
phase: 1
slug: auth-realtime-transport
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test -- --run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run`
- **After every plan wave:** Run `npm run test -- --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | AUTH-01 | unit | `npm run test -- --run src/lib/auth` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | AUTH-02 | unit | `npm run test -- --run src/lib/auth` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 2 | AUTH-03 | manual | — | — | ⬜ pending |
| 1-01-04 | 01 | 2 | AUTH-04 | unit | `npm run test -- --run src/lib/server/hooks` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/auth.test.js` — stubs for AUTH-01, AUTH-02 (email/password signup, signin, signout)
- [ ] `src/lib/server/hooks.ws.test.js` — stubs for AUTH-04 (WebSocket upgrade identity)

*Existing vitest infrastructure covers the framework layer; only test stubs need adding.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Discord OAuth redirect → callback → session | AUTH-03 | Requires browser + live Discord app credentials | 1. Open `/auth` page, 2. Click "Sign in with Discord", 3. Complete OAuth flow, 4. Verify session active and user lands back in app |
| Session persists across page reload | AUTH-01 | Browser state — not testable in vitest | Sign in, hard-reload, confirm session still active |
| Protected routes inaccessible after sign-out | AUTH-02 | Requires SvelteKit route guard in browser context | Sign out, attempt to navigate to `/draft`, confirm redirect |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
