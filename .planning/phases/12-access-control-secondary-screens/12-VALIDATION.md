---
phase: 12
slug: access-control-secondary-screens
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-04
updated: 2026-09-04
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from `12-RESEARCH.md` § Validation Architecture (line 1116) and populated by
> the planner against the nine PLAN.md files. Every row names a real task ID.
>
> **Wave 0 note:** this phase has no separate Wave 0 plan. Vitest and both projects are
> already installed and configured, and every "new spec" is written in the SAME task as
> the behavior it covers — deliberately, because two of them are red-without-the-edit
> dependencies (`phase10-screens.spec.js` vs the CSS append; `phase11-fixes.spec.js` vs
> the chat `$effect` statement order). Writing them a wave early would leave `npm test`
> red between commits, and `npm test` is the phase's only green gate.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 — two projects: `server` (node) and `client` (browser via `@vitest/browser-playwright`, chromium headless) |
| **Config file** | `vite.config.js` (`test.projects`, lines 29-52); `expect: { requireAssertions: true }` at line 31 |
| **Project routing** | Filename only: `*.svelte.spec.js` → `client`; anything else `*.spec.js` → `server` |
| **Quick run command** | `npx vitest run <path/to/spec>` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~60-90 seconds |
| **Baseline** | **202 passed / 1 skipped / 34 todo across 24 files** (server 150, client 52) — the "130 tests" figure in ROADMAP.md and REQUIREMENTS.md is the stale v1.0 value |
| **Expected end state** | Above 202. Plan 02 T1 removes exactly one test (the emptied Phase 10 scope-guard `it`); every other task adds tests |
| **Do NOT gate on** | `npm run lint` (19 src prettier failures, 20 src eslint errors) and `npm run check` (10 svelte-check errors in 4 files) — both **red at baseline**. Never run `npm run format`. |
| **Report-only signal** | `npx eslint src` compared against the 20-error baseline. Never pass/fail. |

---

## Sampling Rate

- **After every task commit:** `npx vitest run <touched spec files>` (the command in that task's `<automated>` block)
- **After every plan wave:** `npm test` (full suite, both projects)
- **Before `/gsd:verify-work`:** `npm test` fully green above 202 passing, and `npx eslint src` at or below 20 errors
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-01-T1 | 01 | 1 | ACC-01 | T-12-16 | `room` schema declares `is_public` as `notNull().default(false)` | unit (node, import smoke) | `npx vitest run src/lib/server/rooms.spec.js` | ✅ extend | ⬜ pending |
| 12-01-T2 | 01 | 1 | ACC-01 | T-12-16 | Generated `0002` migration adds the column `DEFAULT false NOT NULL`, back-filling existing rows closed; journal + snapshot committed | CLI + artifact contract | `node -e` journal/SQL/snapshot check (see plan `<automated>`) then `npm test` | ✅ generated | ⬜ pending |
| 12-01-T3 | 01 | 1 | ACC-04 | — | `loadLobbySnapshot` returns `isPublic`; drafting/review inherit it via `draft.js`'s spread | unit (node, fake db) | `npx vitest run src/lib/server/rooms.spec.js` | ✅ extend | ⬜ pending |
| 12-01-T3 | 01 | 1 | ACC-02 | T-12-04, T-12-04b | `setRoomVisibilityAsHost` asserts host before writing and `.set()`s only `{ is_public, updated_at }` | unit (node, payload capture) | `npx vitest run src/lib/server/rooms.spec.js` | ✅ extend | ⬜ pending |
| 12-01-T3 | 01 | 1 | ACC-02 | T-12-07, T-12-07b | `removeGuestSpectators` deletes on `guest_id IS NOT NULL`, sparing signed-in spectators | unit (node) | `npx vitest run src/lib/server/rooms.spec.js` | ✅ extend | ⬜ pending |
| 12-02-T1 | 02 | 1 | SCR-01, SCR-02, ACC-03 | T-12-17, T-12-18 | Verbatim `.cy-loading*`/`.cy-gate*`/`.cy-cancel*` port, both keyframes, a fourth reduced-motion block, `.cy-sr-only`, zero `border-radius` | unit (node, `app.css` contract) | `npx vitest run src/phase10-screens.spec.js src/phase8-foundation.spec.js` | ✅ edit | ⬜ pending |
| 12-02-T1 | 02 | 1 | (scope guard) | — | `phase10-screens.spec.js` stops excluding `cy-loading`/`cy-gate`/`cy-cancel`; DS-04 assertion byte-identical. **Red without this edit — same task as the CSS append** | unit (node) | `npx vitest run src/phase10-screens.spec.js` | ✅ **mandatory edit** | ⬜ pending |
| 12-02-T2 | 02 | 1 | ACC-01, ACC-02 | T-12-19 | A6 `.cy-hc-switch*` vocabulary present; neutral for both states, lime only on focus + `room = PUBLIC`, no red | unit (node, `app.css` contract) | `node -e` A6 selector check (see plan `<automated>`) then `npm test` | ✅ extend | ⬜ pending |
| 12-02-T3 | 02 | 1 | D-07 | T-12-18 | The full Phase 12 CSS contract, including the reduced-motion block that `page.emulateMedia` cannot reach in this provider | unit (node) | `npx vitest run src/phase12-access-screens.spec.js` | ✅ new | ⬜ pending |
| 12-03-T1 | 03 | 2 | ACC-02 | T-12-03 | `setRoomVisibility` rejects guests (`UNAUTHORIZED`) and non-hosts (`FORBIDDEN`) **before any DB write** | unit (node, `createTestEnv`) | `npx vitest run src/live/room.spec.js` | ✅ extend | ⬜ pending |
| 12-03-T1 | 03 | 2 | ACC-02 | T-12-05 | Non-boolean payload rejected with `VALIDATION`; no coercion | unit (node) | `npx vitest run src/live/room.spec.js` | ✅ extend | ⬜ pending |
| 12-03-T1 | 03 | 2 | ACC-02 | T-12-07 | Host flip publishes the snapshot carrying `isPublic`; flip-to-private also calls `removeGuestSpectators` | unit (node) | `npx vitest run src/live/room.spec.js` | ✅ extend | ⬜ pending |
| 12-03-T2 | 03 | 2 | SCR-02 | T-12-10 | `cancelRoom` loads the snapshot **before** `cancelRoomAsHost` and publishes a non-null `{ phase: 'cancelled', cancelReason: 'host' }` — asserted by call ORDER, not both-were-called | unit (node) | `npx vitest run src/live/room.spec.js src/lib/server/rooms.spec.js src/lib/server/room-lifecycle.spec.js` | ✅ extend | ⬜ pending |
| 12-03-T2 | 03 | 2 | SCR-02 | T-12-20 | Grace-expiry publish carries `cancelReason: 'grace'`; `cancelRoomAsHost`'s `phase: 'ended'` DB write untouched | unit (node) | `npx vitest run src/live/room.spec.js` | ✅ extend | ⬜ pending |
| 12-04-T1 | 04 | 2 | ACC-03 | T-12-09, T-12-21 | Gated load returns only `{ public_code, phase }` in `room` and never calls `loadDraftSnapshot` | unit (node) | `npx vitest run "src/routes/draft/[id]/page.server.spec.js"` | ✅ extend | ⬜ pending |
| 12-04-T2 | 04 | 2 | ACC-03 | T-12-23 | `gated: true` for exactly one combination: guest + `is_public === false` + `phase === 'lobby'` | unit (node, matrix) | `npx vitest run "src/routes/draft/[id]/page.server.spec.js"` | ✅ extend | ⬜ pending |
| 12-04-T2 | 04 | 2 | ACC-04 | — | Strict `gated: false` when signed in, public, drafting, review, cancelled, or host | unit (node, matrix) | `npx vitest run "src/routes/draft/[id]/page.server.spec.js"` | ✅ extend | ⬜ pending |
| 12-05-T1 | 05 | 2 | SCR-01 | T-12-26 | Connecting card: eyebrow, `ESTABLISHING_LINK` + `.cy-dots`, typed log with interpolated code, `▮` while incomplete, 40-glyph `aria-hidden` meter + `sync…`, never `role="progressbar"` | browser | `npx vitest run src/lib/components/molecules/CyConnecting.svelte.spec.js` | ✅ new | ⬜ pending |
| 12-05-T1 | 05 | 2 | SCR-01 | T-12-37 | `timedOut` swaps to `LINK_TIMEOUT` + red `[FAIL] … ETIMEDOUT`, replaces the meter with `$ RETRY_LINK()`, and fires `onRetry` | browser (`timedOut` prop) | `npx vitest run src/lib/components/molecules/CyConnecting.svelte.spec.js` | ✅ new | ⬜ pending |
| 12-05-T2 | 05 | 2 | SCR-02 | T-12-11, T-12-25 | Cancelled card: complete untyped log, interpolated code, independently pluralized real counts, `.cy-sig`/`.cy-ok`, host vs grace first line, `'grace'` default, working `$ COPY_LOG()` with unchanged label | browser | `npx vitest run src/lib/components/molecules/CyCancelled.svelte.spec.js` | ✅ new | ⬜ pending |
| 12-06-T1 | 06 | 2 | ACC-03 | T-12-11, T-12-31 | Gate card: `// access: RESTRICTED`, `$ ROOM.ACCESS()`, all four readout lines with `.cy-403`, escaped literal `<guest:anon>`, Discord anchor on `loginHref`, `CHECKING…` + still-gated feedback, one `role="alert"` | browser | `npx vitest run src/lib/components/molecules/CyGuestGate.svelte.spec.js` | ✅ new | ⬜ pending |
| 12-06-T2 | 06 | 2 | ACC-01, ACC-02 | T-12-29, T-12-30, T-12-32 | `open_spectating` `role="switch"` with `aria-checked`, named by the visible label, reads `snapshot.isPublic === true`, fires `onSetVisibility(next)`, host-only, disabled outside lobby and while pending, and sits above `move_player` | browser | `npx vitest run src/lib/components/molecules/LobbyHostBar.svelte.spec.js` | ✅ extend | ⬜ pending |
| 12-07-T1 | 07 | 3 | ACC-03 | T-12-01, T-12-02 | `lobby` stream **throws** `FORBIDDEN` for a guest on a private lobby room, and `upsertGuestSpectator` is **not called** (guard precedes the upsert; throw is what rolls the topic subscription back) | unit (node, guest subscribe) | `npx vitest run src/live/room.spec.js` | ✅ extend (**`is_public: false` on `baseRoom` + `upsertGuestSpectator` in the `vi.mock` factory — omitting either is a false green**) | ⬜ pending |
| 12-07-T1 | 07 | 3 | ACC-04 | T-12-23 | Guest admitted when public, or `phase` is drafting / review / cancelled; signed-in player admitted on a private lobby room | unit (node) | `npx vitest run src/live/room.spec.js` | ✅ extend | ⬜ pending |
| 12-07-T2 | 07 | 3 | ACC-03 | T-12-08, T-12-34 | `chatAll` and `chatSpectators` refuse guests on private pre-draft rooms with a predicate byte-identical to the lobby guard, before `cachePlayerTeam` | unit (node) | `npx vitest run src/live/chat.spec.js src/live/room.spec.js` | ✅ extend | ⬜ pending |
| 12-08-T1 | 08 | 4 | ACC-03 | T-12-12, T-12-23 | Three-source `gated` derive (SSR, `loadError.code === 'FORBIDDEN'`, snapshot ejection) with strict `isPublic === false` | source contract | `npx vitest run src/phase12-access-screens.spec.js` | ✅ Plan 09 T1 | ⬜ pending |
| 12-08-T1 | 08 | 4 | SCR-01 | T-12-38 | `showConnecting = !gated && !loadError && (loading \|\| !floorElapsed)` — Connecting never renders for `loadError`, so the frozen PauseOverlay grace flow is untouched | source contract | `npx vitest run src/phase12-access-screens.spec.js` | ✅ Plan 09 T1 | ⬜ pending |
| 12-08-T1 | 08 | 4 | ACC-03 | T-12-08b | Chat `$effect` returns early on `gated`, above `activeChatStream(code)`, keeping the WR-04 regex green | unit (node) + source contract | `npx vitest run src/phase11-fixes.spec.js src/phase12-access-screens.spec.js` | ✅ existing + new | ⬜ pending |
| 12-08-T2 | 08 | 4 | SCR-02 | T-12-25 | Branch order gate → cancelled → connecting → loadError → snapshot; `'cancelled'` removed from the drafting condition; `DraftBoard`'s cancelled branch and derives deleted; PauseOverlay clause intact | source contract | `npx vitest run src/phase12-access-screens.spec.js src/phase10-screens.spec.js` | ✅ Plan 09 T1 | ⬜ pending |
| 12-08-T2 | 08 | 4 | ACC-02 | — | `onSetVisibility={handleSetVisibility}` reaches `LobbyHostBar`, and `setRoomVisibility(code, next)` is wrapped in the existing `actionError` handler | source contract | `npx vitest run src/phase12-access-screens.spec.js` | ✅ Plan 09 T1 | ⬜ pending |
| 12-08-T3 | 08 | 4 | ACC-03 | T-12-06, T-12-36 | Root layout reads `fromStore(lobby(code))` only when a code exists and `page.data.gated` is falsy; exactly one subscriber; no route-level draft layout created | unit (node) + source contract | `npx vitest run src/lib/components/chrome/CyShell.svelte.spec.js src/phase8-foundation.spec.js src/phase12-access-screens.spec.js` | ✅ Plan 09 T1 | ⬜ pending |
| 12-09-T1 | 09 | 5 | ACC-03, SCR-01, SCR-02 | T-12-36, T-12-38, T-12-39 | All page/layout/DraftBoard structural invariants locked with comment-stripped absence checks; branch-order test verified to fail when violated | unit (node, source contract) | `npx vitest run src/phase12-access-screens.spec.js` | ✅ extend | ⬜ pending |
| 12-09-T2 | 09 | 5 | all six | T-12-40 | Whole suite green above 202; `npx eslint src` at or below 20; snapshot shape gains only `isPublic` and `cancelReason` | unit (existing suite) | `npm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Sampling continuity check (Nyquist):** every one of the 23 tasks across the nine plans carries an
`<automated>` command, so there is no run of even two consecutive tasks without automated feedback,
let alone three. No `<automated>` command uses a watch-mode flag. The two tasks whose subject cannot
be exercised at runtime in this harness (`12-08-T1`/`T2`/`T3`, the composition root) are covered by
source contracts written in `12-09-T1`, and each of those tasks additionally gates on `npm test`
plus the pre-existing `phase11-fixes.spec.js` regression.

---

## Wave 0 Requirements

No framework install is needed — Vitest and both projects are already configured. Every item below is
a new spec file or a mandatory edit to an existing one, each landing in the same task as the behavior
it covers.

- [ ] `src/phase12-access-screens.spec.js` — CSS contract (12-02-T3), then the `+page.svelte` / `+layout.svelte` / `DraftBoard.svelte` source contracts (12-09-T1)
- [ ] `src/lib/components/molecules/CyConnecting.svelte.spec.js` — SCR-01 incl. the D-08 timeout via a `timedOut` prop (12-05-T1)
- [ ] `src/lib/components/molecules/CyGuestGate.svelte.spec.js` — ACC-03 (12-06-T1)
- [ ] `src/lib/components/molecules/CyCancelled.svelte.spec.js` — SCR-02, D-16 / D-17 / D-18 (12-05-T2)
- [ ] Extend `src/live/room.spec.js` — the `setRoomVisibility` RPC and the `cancelRoom` payload/order (12-03-T1, 12-03-T2); the guard plus **`is_public: false` on `baseRoom`** and **`upsertGuestSpectator` in the `vi.mock` factory** (12-07-T1). RESEARCH Pitfall 4: omitting either fixture edit yields a false green **and** breaks unrelated guest tests.
- [ ] Extend `src/lib/server/rooms.spec.js` — `isPublic` in the snapshot, `setRoomVisibilityAsHost` payload shape, `removeGuestSpectators` predicate (12-01-T3)
- [ ] Extend `src/live/chat.spec.js` — the D-20 privacy guards plus `is_public` on every room fixture (12-07-T2)
- [ ] Extend `src/routes/draft/[id]/page.server.spec.js` — the `gated` matrix across guest/authed × public/private × phase (12-04-T2)
- [ ] Extend `src/lib/components/molecules/LobbyHostBar.svelte.spec.js` — the open-spectating switch (12-06-T2)
- [ ] **Edit `src/phase10-screens.spec.js`** — scope-guard reconciliation: delete the whole `it('does not leak Phase 12 selectors into the port')` (an emptied `it` fails under `requireAssertions: true`) and retitle the describe. Must land in the **same task** as the CSS append (12-02-T1) or the suite goes red between commits. Keep the DS-04 `border-radius` assertion byte-identical.

---

## Manual-Only Verifications

Deferred to `/gsd:verify-work` human UAT, consistent with Phases 9-11.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live ejection on flip-to-private | ACC-02 / D-11 | Needs two real browser sessions against one room; the socket store cache is per-client | Open the room as host + as a guest spectator with spectating ON; toggle it OFF in the Host Console; confirm the guest lands on the 403 Guest Gate and their roster row disappears |
| Reduced-motion appearance of `cy-dots` and the `cy-fill` meter | SCR-01 / D-07 | `page.emulateMedia` unavailable in the current vitest-browser provider (Phase 9 precedent); CSS contract asserted via `app.css?raw` instead | Enable OS reduced-motion, cold-load a draft room, confirm no dot or meter animation and that the typed log jumps to full text |
| Real-socket feel of the ~900 ms minimum display window | SCR-01 / D-05 | Timing against a real socket connect cannot be simulated meaningfully; the typed log takes 2594 ms so the floor lands mid-line-2 | Cold-load a room on a fast connection; confirm the Connecting screen is legible and does not flash |
| 404-on-refresh after cancellation | SCR-02 | `getRoomByPublicCode` hides cancelled rooms, so SCR-02 is inherently a live-session-only state. Making it SSR-resolvable means editing ROOM-08 — out of scope | Cancel a room, observe the SIGKILL screen, then refresh; confirm 404. **Accepted limitation, not a bug.** |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] Per-Task Verification Map populated with real task IDs (stub replaced)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-04 by gsd-planner. Row `Status` values stay `⬜ pending` until each
task runs; `12-09-T2` flips them to `✅ green` after the phase regression sweep.
