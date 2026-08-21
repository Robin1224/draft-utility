---
phase: 11
slug: terminal-modals
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-21
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (client project: Playwright chromium via vitest-browser-svelte; server/node project: other specs) |
| **Config file** | vite.config.js (vitest projects: `client` = `src/**/*.svelte.{test,spec}.{js,ts}`, `server` = other specs) |
| **Quick run command** | `npx vitest run --project client <changed spec>` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --project client <touched spec files>` (node-project specs: `npx vitest run <file>` — project auto-selected by filename pattern)
- **After every plan wave:** Run `npm test` (full client + node suite)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-T1 | 11-01 | 1 | MOD-01, MOD-02 | T-11-02 | verbatim CSS port; no `.cy-modal-scrim` class; scope guard reconciled to Phase-12-only exclusions | grep gates + full suite | grep gates (backdrop / `[open]` guard / 7-col grid / 640px / cy-script-move / no-scrim / scope-guard reconciled) `&& npm test` | ✅ (npm test exists; src/phase10-screens.spec.js edit sanctioned in-plan) | ⬜ pending |
| 11-01-T2 | 11-01 | 1 | MOD-01, MOD-02 | T-11-01, T-11-02 | no `{@html}`; veto + focus-return proven; host-only mounting deferred to consumers | browser unit (RED→GREEN) | `npx vitest run --project client src/lib/components/atoms/CyModal.svelte.spec.js && npm run lint && npm run check` | spec created by this task (TDD: written first, RED against stub) | ⬜ pending |
| 11-02-T1 | 11-02 | 2 | MOD-01 | T-11-03, T-11-02 | client clamp is UX-only (server authoritative); no new server calls; no `{@html}` | static grep + svelte-check | grep gates (cy-script-move / structuredClone / config.sh title / no spinbutton / no Tailwind) `&& npm run check` | ✅ | ⬜ pending |
| 11-02-T2 | 11-02 | 2 | MOD-01 | T-11-03 | commit-on-save vs discard asserted via fixture readout (no internal reach-in) | browser unit + full suite | `npx vitest run --project client src/lib/components/molecules/DraftSettingsPanel.svelte.spec.js && npm test && npm run lint` | ✅ (rewrites existing DraftSettingsPanel.svelte.spec.js) | ⬜ pending |
| 11-03-T1 | 11-03 | 3 | MOD-02 | T-11-01 | `{#if isHost}` wraps launchers AND both modals; frozen handlers untouched | static grep + svelte-check | grep gates (host_console title / hint string / `grep -c "▶ START_DRAFT()"` = 2 / no cy-spec-pill / settingsOpen bind / `[CONFIG()]` banner) `&& npm run check` | ✅ | ⬜ pending |
| 11-03-T2 | 11-03 | 3 | MOD-02 | T-11-01, T-11-04 | non-host zero-DOM asserted; frozen callback signatures asserted via vi.fn | browser unit + phase gate | `npx vitest run --project client src/lib/components/molecules/LobbyHostBar.svelte.spec.js && npm test && npm run lint && npm run check` | spec created by this task (TDD) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — vitest client project with real-chromium `<dialog>` support is already in place; `DraftSettingsPanel.svelte.spec.js` exists and will be rewritten alongside the stepper redesign (guaranteed-red without rewrite, per RESEARCH.md). The Phase 10 scope-guard spec (`src/phase10-screens.spec.js`) is reconciled in Plan 01 Task 1 — its four Phase-11 selector exclusions are removed (Phase 12 exclusions `cy-loading`/`cy-gate`/`cy-cancel` retained), so `npm test` gates stay deterministic across all three plans.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Modal entrance animation feel (cy-modal-in) under real OS reduced-motion | MOD-01/02 | `page.emulateMedia` unavailable in current vitest-browser provider (Phase 9 precedent); CSS contract asserted via `app.css?raw` instead | Toggle OS reduced-motion, open both modals, confirm no translate/scale animation |
| Drag-to-reorder feel with a real mouse | MOD-01 | HTML5 drag events are unreliable to synthesize; [↑]/[↓] buttons cover the logic path in tests | Drag ⠿ grip rows in Draft Settings; verify order changes and persists to save |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none — no MISSING markers; the two TDD specs are written RED-first inside their own tasks)
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planner sign-off (revision pass, 2026-08-21)
