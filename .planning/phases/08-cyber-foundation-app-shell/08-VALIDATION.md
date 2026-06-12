---
phase: 8
slug: cyber-foundation-app-shell
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-12
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest `^4.1.0` (dual projects — `client` browser via Playwright Chromium + `server` node — both embedded in `vite.config.js`) |
| **Config file** | `vite.config.js` (both projects `extends` it) |
| **Quick run command** | `npm run test:unit -- --run` (scope to a single file when iterating) |
| **Full suite command** | `npm run test` (= `vitest --run`, both projects, 130 existing + new) |
| **Build check** | `npm run build` |
| **Lint check** | `npm run lint` (`prettier --check .` + `eslint .`) |
| **Estimated runtime** | ~30–60 seconds (full suite + build) |

---

## Sampling Rate

- **After every task commit:** Run the relevant new spec (e.g. `vitest run src/lib/components/chrome/CyShell.svelte.spec.js`) + any grep assertions the task touched.
- **After every plan wave:** Run `npm run test` (full suite) + `npm run build` + `npm run lint`.
- **Before `/gsd:verify-work`:** Full suite green + build clean + lint clean + all grep assertions pass.
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-W0-01 | 00 | 0 | DS-05/D-07/D-09 | component (browser) | `vitest run src/lib/components/chrome/CyShell.svelte.spec.js` | ❌ W0 | ⬜ pending |
| 08-W0-02 | 00 | 0 | DS-01/02/03/04, FX-05 | node grep-harness spec | `vitest run src/phase8-foundation.spec.js` | ❌ W0 | ⬜ pending |
| 08-T-DS03a | — | — | DS-03 | grep assertion | `! grep -rnE "tailwindcss\|@apply\|@theme" src/ vite.config.js .prettierrc` | ✅ (in W0 spec) | ⬜ pending |
| 08-T-DS03b | — | — | DS-03 | grep assertion | `! grep -n "tailwindcss" package.json` | ✅ (in W0 spec) | ⬜ pending |
| 08-T-DS03c | — | — | DS-03 | build smoke | `npm run build` | ✅ existing | ⬜ pending |
| 08-T-DS03d | — | — | DS-03/D-05 | full suite (130 + snapshot) | `npm run test` | ✅ existing | ⬜ pending |
| 08-T-DS01 | — | — | DS-01 | grep + file existence | `[ $(grep -c "JetBrains Mono" src/app.css) -eq 4 ]` && fonts exist && `! test -f src/lib/assets/fonts/Manrope.ttf` | ✅ (in W0 spec) | ⬜ pending |
| 08-T-DS02 | — | — | DS-02 | grep (verbatim tokens) | `grep -n "\-\-cy-lime: #b3ff3d" src/app.css` (+ full token checklist) | ✅ (in W0 spec) | ⬜ pending |
| 08-T-DS04 | — | — | DS-04 | grep assertion | `! grep -n "border-radius" src/app.css` | ✅ (in W0 spec) | ⬜ pending |
| 08-T-DS05a | — | — | DS-05 | component DOM | `page.getByText('DRAFT_EM')`, `getByText('01_LOBBY')`, `getByRole('button',{name:'[copy]'})`, `.cy-scanlines` present | ✅ (in W0 spec) | ⬜ pending |
| 08-T-DS05b | — | — | DS-05/D-07 | component | render `phase='drafting'` → `02_DRAFTING` has `.is-active`; `phase='cancelled'` → no `.is-active`, no throw | ✅ (in W0 spec) | ⬜ pending |
| 08-T-DS09 | — | — | DS-05/D-09 | component (clipboard mock) | spy `navigator.clipboard.writeText`; click `[copy]` with code → called with code; `code=null` → not called, shows `—` | ✅ (in W0 spec) | ⬜ pending |
| 08-T-FX05 | — | — | FX-05/D-10 | grep (structural) | `grep -n "@keyframes cy-blink" src/app.css` && `prefers-reduced-motion` block sets `animation: none` | ✅ (in W0 spec) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/components/chrome/CyShell.svelte.spec.js` — browser-project DOM tests for DS-05/D-07/D-09 (brand `DRAFT_EM`, 3 tracker labels, active-phase mapping incl. `cancelled` no-crash, `[copy]` clipboard + no-room `—`, scanlines present). Uses `vitest-browser-svelte` `render` + `vitest/browser` `page` queries (mirror existing `Welcome.svelte.spec.js`).
- [ ] `src/phase8-foundation.spec.js` — node-project assertion harness reading `src/app.css`, `vite.config.js`, `package.json`, `.prettierrc` as strings: no Tailwind tokens/deps, exactly 4 JetBrains Mono `@font-face`, verbatim `--cy-*` token values, zero `border-radius`, `@keyframes cy-blink` + reduced-motion `animation: none` present.
- [ ] JetBrains Mono woff2 files (weights 400/500/600/700) vendored under `src/lib/assets/fonts/` — asset prerequisite for DS-01 tests (manual vendor step, NOT `npm install`).
- [ ] No framework install needed — Vitest browser+node infra already covers everything (net dependency change is removal-only).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Blinking cursor actually stops under reduced motion | FX-05/D-10 | `prefers-reduced-motion` is not reliably togglable in the Vitest/Playwright unit context; the spec only asserts the CSS exists structurally | DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce" → confirm `.cy-brand-cur` stops blinking |
| Cyber aesthetic renders correctly in a real browser (glow, scanlines, mono font, squared edges) | DS-01/02/04/05 | Visual fidelity is subjective/pixel-level, not assertable in JSDOM/unit DOM | `npm run dev`, load `/` and a `/draft/[id]` route, eyeball the shell against `cyber.css` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (CyShell spec + foundation grep spec + vendored fonts)
- [ ] No watch-mode flags (all commands use `--run`)
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
