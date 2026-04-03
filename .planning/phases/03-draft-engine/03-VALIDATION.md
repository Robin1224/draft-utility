---
phase: 3
slug: draft-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | `vite.config.js` (two projects: `client` + `server`) |
| **Quick run command** | `npm run test -- --project=server --reporter=dot` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --project=server --reporter=dot`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-xx-01 | TBD | 0 | LIST-01 | unit | `npm run test -- --project=server src/lib/catalog/classes.spec.js` | ❌ Wave 0 | ⬜ pending |
| 3-xx-02 | TBD | 0 | DRAFT-01 | unit | `npm run test -- --project=server src/lib/draft-script.spec.js -t "default script"` | ❌ Wave 0 | ⬜ pending |
| 3-xx-03 | TBD | 0 | DRAFT-01 | unit | `npm run test -- --project=server src/lib/server/draft.spec.js -t "unique constraint"` | ❌ Wave 0 | ⬜ pending |
| 3-xx-04 | TBD | 1 | DRAFT-02 | unit (mock DB) | `npm run test -- --project=server src/live/draft.spec.js -t "startDraft"` | ❌ Wave 0 | ⬜ pending |
| 3-xx-05 | TBD | 1 | DRAFT-03 | unit (mock DB) | `npm run test -- --project=server src/live/draft.spec.js -t "non-captain"` | ❌ Wave 0 | ⬜ pending |
| 3-xx-06 | TBD | 1 | DRAFT-03 | unit (mock DB) | `npm run test -- --project=server src/live/draft.spec.js -t "duplicate champion"` | ❌ Wave 0 | ⬜ pending |
| 3-xx-07 | TBD | 1 | DRAFT-04 | unit (mock DB + fake timers) | `npm run test -- --project=server src/live/draft.spec.js -t "timer no-op"` | ❌ Wave 0 | ⬜ pending |
| 3-xx-08 | TBD | 1 | DRAFT-04 | unit (mock DB + fake timers) | `npm run test -- --project=server src/live/draft.spec.js -t "timer advances"` | ❌ Wave 0 | ⬜ pending |
| 3-xx-09 | TBD | 1 | DRAFT-05 | unit (mock DB) | `npm run test -- --project=server src/live/draft.spec.js -t "draft completion"` | ❌ Wave 0 | ⬜ pending |
| 3-xx-10 | TBD | 1 | DRAFT-06 | unit | `npm run test -- --project=server src/live/draft.spec.js -t "custom script"` | ❌ Wave 0 | ⬜ pending |
| 3-xx-11 | TBD | 2 | HOST-01 | unit (browser) | `npm run test -- --project=client src/lib/components/molecules/DraftSettingsPanel.svelte.spec.js` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/catalog/classes.spec.js` — stubs for LIST-01 (28 entries, correct fields)
- [ ] `src/lib/draft-script.spec.js` — stubs for DRAFT-01 (default script shape/length)
- [ ] `src/lib/server/draft.spec.js` — stubs for DB layer and unique constraint (DRAFT-01)
- [ ] `src/live/draft.spec.js` — stubs for DRAFT-02 through DRAFT-06, timer behavior
- [ ] `src/lib/components/molecules/DraftSettingsPanel.svelte.spec.js` — stubs for HOST-01 settings panel visibility

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Settings panel appears before draft, hidden during draft | HOST-01 | Requires live UI inspection | Open room as host; verify panel visible in lobby phase; start draft; verify panel hidden |
| Pick/ban UI updates pool in real-time for all participants | DRAFT-03 | Requires two browser sessions | Open room in two tabs as different captains; make a pick; verify the class disappears from both |
| Timer auto-advances turn when expired | DRAFT-04 | Requires real elapsed time | Start draft with 10s timer; let timer expire; verify turn advances without interaction |
| Draft transitions to Review after final pick | DRAFT-05 | Requires completing full script | Run full draft script; verify Review phase renders |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
