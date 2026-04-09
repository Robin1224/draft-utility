---
phase: 3
slug: draft-engine
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-03
completed: 2026-04-07
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | `vite.config.js` (two projects: `client` + `server`) |
| **Quick run command** | `npx vitest run src/lib/server/draft.spec.js` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/server/draft.spec.js`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|-------------|-----------|-------------------|-------------|--------|
| LIST-01 | Catalog content (28 champions) | unit | `npx vitest run src/lib/catalog/classes.spec.js` | ✅ exists | ✅ green |
| DRAFT-01 | Default script shape | unit | `npx vitest run src/lib/draft-script.spec.js` | ✅ exists | ✅ green |
| DRAFT-02 | Start draft / server turn ownership | unit | `npx vitest run src/lib/server/draft.spec.js src/live/draft.spec.js` | ✅ exists | ✅ green |
| DRAFT-03 | Pick/ban captain auth + no-duplicate | unit | `npx vitest run src/live/draft.spec.js` | ✅ exists | ✅ green |
| DRAFT-04 | Timer auto-advance (server-side) | unit | `npx vitest run src/live/draft.spec.js` | ✅ exists | ✅ green |
| DRAFT-05 | Draft completion on last turn | unit | `npx vitest run src/lib/server/draft.spec.js` | ✅ exists | ✅ green |
| DRAFT-06 | Custom script from host | unit | `npx vitest run src/lib/draft-script.spec.js` | ✅ exists | ✅ green |
| HOST-01 | Settings panel visibility + wiring | browser | `npx vitest run src/lib/components/molecules/DraftSettingsPanel.svelte.spec.js` | ✅ exists | ✅ green |

---

## Wave 0 Requirements

- [x] `src/lib/catalog/classes.spec.js` — LIST-01 (28 entries, correct fields)
- [x] `src/lib/draft-script.spec.js` — DRAFT-01, DRAFT-06 (default script shape/length, custom script)
- [x] `src/lib/server/draft.spec.js` — DRAFT-01 through DRAFT-05 (DB layer, unique constraint)
- [x] `src/live/draft.spec.js` — DRAFT-02 through DRAFT-05 (timer behavior, captain auth, completion)
- [x] `src/lib/components/molecules/DraftSettingsPanel.svelte.spec.js` — HOST-01 (settings panel visibility and binding)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Status |
|----------|-------------|------------|--------|
| Settings panel appears before draft, hidden during draft | HOST-01 | Requires live UI inspection | ✅ green (human UAT in 03-VERIFICATION.md) |
| Pick/ban UI updates pool in real-time for all participants | DRAFT-03 | Requires two browser sessions | ✅ green (human UAT in 03-VERIFICATION.md) |
| Timer auto-advances turn when expired | DRAFT-04 | Requires real elapsed time | ✅ green (human UAT in 03-VERIFICATION.md) |
| Draft transitions to Review after final pick | DRAFT-05 | Requires completing full script | ✅ green (human UAT in 03-VERIFICATION.md) |

---

## Validation Sign-Off

- [x] All tasks have automated verify or documented manual-only reason
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all requirements
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete 2026-04-07
