# Phase 08 — Deferred / Out-of-Scope Items

Items discovered during execution that are NOT caused by Phase 08 changes and were intentionally not fixed.

## Pre-existing test failures (not caused by Plan 08-00)

### DraftSettingsPanel.svelte.spec.js — flaky "Add turn" / "Remove" listitem-count assertions

- **Discovered during:** 08-00 full-suite verification (`npm run test`)
- **Failing tests:**
  - `DraftSettingsPanel (HOST-01) > renders "Add turn" button that appends a turn to the list` (expected listitem count mismatch)
  - `DraftSettingsPanel (HOST-01) > renders "Remove" button on each row that removes that turn` (`expected 10 to be 9`)
- **Why out of scope:** Plan 08-00 added only 4 woff2 binaries and 2 new isolated `.spec.js` files. It made ZERO changes to `DraftSettingsPanel.svelte` or its spec (both last touched in commit `16d43ef`, Phase 03). The failure is an interactive listitem-count assertion unrelated to fonts, CSS, or Tailwind.
- **Status:** Pre-existing failure. Left untouched per the executor SCOPE BOUNDARY rule (only auto-fix issues directly caused by the current task). Should be triaged separately (likely a flaky `page.getByRole('listitem').all()` count race or a real regression from an earlier phase).
- **Impact on 08-00:** None. The plan's own two new specs are correctly RED (Wave 0). The "130 passing" baseline the plan references still reports 130 passing; the DraftSettingsPanel failures are a separate pre-existing condition in that baseline, not a regression introduced here.

## Pre-existing environment gap (not caused by Plan 08-01): `uWebSockets.js` native addon not installed

- **Discovered during:** 08-01 Task 1 (Tailwind removal verification — `npm install` / `npm run build`).
- **Symptom 1:** `npm install` exits 1 with `Invalid Version:` (empty version) while placing `uWebSockets.js@github:uNetworking/uWebSockets.js#v20.60.0` (a github dependency of `svelte-adapter-uws`). npm's arborist dedupe (`Node.canDedupe`) throws on the empty version string.
- **Symptom 2:** `npm run build` — the Vite/Rollup compile **succeeds** (`✓ built in ~1.3s`), but the `svelte-adapter-uws` adapt step fails: `Could not load uWebSockets.js. Make sure it is installed`. The native addon directory `node_modules/uWebSockets.js` does not exist.
- **Proven pre-existing:** Both failures reproduce **identically** on the pristine committed code (HEAD `40ec8dc`) with `package.json`/`vite.config.js`/`.prettierrc`/`layout.css`/lockfile stashed back to committed state. They are NOT caused by the Tailwind removal in Plan 08-01.
- **Root cause:** `uWebSockets.js` is a native addon installed from GitHub (not npm), never successfully installed in this environment on this platform + npm@11.6.2 / node@24.13.0.
- **Impact on 08-01:** The HARD CONSTRAINT "`npm run build` exits 0" cannot be satisfied in this environment for reasons unrelated to the plan's CSS/config work. The Vite-compilation portion affected by this plan (Tailwind removed) is clean and green. The lockfile's three top-level tailwind manifest entries were pruned by hand to stay consistent with `package.json`; the now-unreachable transitive tailwind entries will be garbage-collected by a future successful `npm install`.
- **Owner / next step:** Environment/infra — install `uWebSockets.js` (`npm install uNetworking/uWebSockets.js#v20.60.0`) on a platform where it builds, or pin a working npm version, before relying on `npm run build`/`npm install` in CI.

## Pre-existing project-wide lint debt (not caused by Plan 08-01)

- **Discovered during:** 08-01 Task 2 verification (`npm run lint`).
- **Symptom:** `npm run lint` (= `prettier --check . && eslint .`) exits 1 with **590** prettier
  code-style warnings and **142** eslint problems (140 errors, 2 warnings).
- **Proven pre-existing:** Re-ran `prettier --check .` and `eslint .` against the pristine tree
  (Tailwind-removal commit `65b0ac7`, with `src/app.css` stashed out and `Manrope.ttf` restored).
  Counts are **identical: 590 prettier + 142 eslint** — across files this plan never touched
  (`SSL-Debian.md`, `src/live/*`, `src/lib/server/*`, `src/routes/*.svelte`, etc.).
- **Plan 08-01's own contribution is lint-clean:** the five edited/created files
  (`package.json`, `vite.config.js`, `.prettierrc`, `src/routes/layout.css`, `src/app.css`) all
  pass `prettier --check`. `src/app.css` uses a single `/* prettier-ignore */` on the `--cy-mono`
  line so the verbatim **double-quoted** font stack (required by the frozen Wave 0 spec assertion
  and by D-03 verbatim-port) survives the project's `singleQuote: true` rule while keeping the
  file prettier-clean.
- **Impact on 08-01:** The HARD CONSTRAINT "`npm run lint` exits 0" cannot be met repo-wide due
  to this pre-existing debt, but Plan 08-01 introduces **zero** new lint failures.
- **Owner / next step:** A dedicated repo-wide `npm run format` + eslint cleanup pass (separate
  from any feature plan), or wire prettier/eslint into CI from a clean baseline.
