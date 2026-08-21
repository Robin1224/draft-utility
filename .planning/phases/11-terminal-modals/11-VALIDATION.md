---
phase: 11
slug: terminal-modals
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-21
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (browser project: Playwright chromium via vitest-browser-svelte; node project: server specs) |
| **Config file** | vite.config.js (vitest workspace: browser + node projects) |
| **Quick run command** | `npx vitest run --project browser <changed spec>` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --project browser <touched spec files>`
- **After every plan wave:** Run `npm test` (full browser + node suite)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (filled by planner) | | | MOD-01, MOD-02 | — | host-only rendering guard | browser unit | `npx vitest run --project browser` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — vitest browser project with real-chromium `<dialog>` support is already in place; `DraftSettingsPanel.svelte.spec.js` exists and will be rewritten alongside the stepper redesign (guaranteed-red without rewrite, per RESEARCH.md).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Modal entrance animation feel (cy-modal-in) under real OS reduced-motion | MOD-01/02 | `page.emulateMedia` unavailable in current vitest-browser provider (Phase 9 precedent); CSS contract asserted via `app.css?raw` instead | Toggle OS reduced-motion, open both modals, confirm no translate/scale animation |
| Drag-to-reorder feel with a real mouse | MOD-01 | HTML5 drag events are unreliable to synthesize; [↑]/[↓] buttons cover the logic path in tests | Drag ⠿ grip rows in Draft Settings; verify order changes and persists to save |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
