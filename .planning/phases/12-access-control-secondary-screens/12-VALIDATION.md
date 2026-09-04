---
phase: 12
slug: access-control-secondary-screens
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-04
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from `12-RESEARCH.md` § Validation Architecture (line 1116). The
> **Per-Task Verification Map** below is a stub — the planner fills it with real
> task IDs and flips `status: ready` / `nyquist_compliant: true` on sign-off.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 — two projects: `server` (node) and `client` (browser via `@vitest/browser-playwright`, chromium headless) |
| **Config file** | `vite.config.js` (`test.projects`, lines 29-52); `expect: { requireAssertions: true }` at line 31 |
| **Quick run command** | `npx vitest run <path/to/spec>` (project auto-selected by filename: `*.svelte.spec.js` → `client`, everything else → `server`) |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~60-90 seconds |
| **Baseline** | **202 passed / 1 skipped / 34 todo across 24 files** (server 150, client 52) — the "130 tests" figure in ROADMAP.md and CONTEXT.md is stale |
| **Do NOT gate on** | `npm run lint` (19 src prettier failures, 20 src eslint errors) and `npm run check` (10 svelte-check errors in 4 files) — both **red at baseline**. Never run `npm run format`. |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <touched spec files>`
- **After every plan wave:** Run `npm test` (full suite, both projects). Optionally `npx eslint src` compared against the 20-error baseline — never as a pass/fail gate.
- **Before `/gsd:verify-work`:** `npm test` fully green with ≥ 202 passing
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

> **STUB — planner must replace.** Task IDs do not exist until PLAN.md files are
> written. The requirement→behavior→command rows are pre-derived in
> `12-RESEARCH.md` § Validation Architecture → "Phase Requirements → Test Map"
> (line 1129); map each one onto the task that delivers it.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-XX-TN | XX | N | ACC-01 | — | `is_public` defaults false for existing rows | unit (node) | `npx vitest run src/phase12-access-screens.spec.js` | ❌ W0 | ⬜ pending |
| 12-XX-TN | XX | N | ACC-02 | T-12-setvis | host-assert before column write; publish carries `isPublic` | unit (node) | `npx vitest run src/live/room.spec.js` | ✅ extend | ⬜ pending |
| 12-XX-TN | XX | N | ACC-03 | T-12-gate | stream guard throws `FORBIDDEN` **before** `upsertGuestSpectator` | unit (node) | `npx vitest run src/live/room.spec.js` | ✅ extend | ⬜ pending |
| 12-XX-TN | XX | N | ACC-04 | — | not gated when authed / public / drafting / review / cancelled | unit (node) | `npx vitest run "src/routes/draft/[id]/page.server.spec.js"` | ✅ extend | ⬜ pending |
| 12-XX-TN | XX | N | SCR-01 | — | Connecting renders on cold load only; never on `loadError` | browser + source contract | `npx vitest run src/lib/components/molecules/CyConnecting.svelte.spec.js` | ❌ W0 | ⬜ pending |
| 12-XX-TN | XX | N | SCR-02 | — | `cancelRoom` publishes a real snapshot, **not `null`**; `cancelReason` distinguishes host vs grace | unit (node) | `npx vitest run src/live/room.spec.js` | ✅ extend | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Vitest is already installed and both projects are configured — **no framework
install needed**. Wave 0 is purely new spec files plus mandatory edits to
existing ones:

- [ ] `src/phase12-access-screens.spec.js` — CSS contract (`.cy-loading{`, `.cy-gate{`, `.cy-cancel{`, `@keyframes cy-dots`, `@keyframes cy-fill`, reduced-motion block) + `+page.svelte` / `+layout.svelte` source contracts (branch order, gate-first, no `'cancelled'` in the drafting condition, layout subscription gated) — covers SCR-01 / SCR-02 / ACC-03 / D-07
- [ ] `src/lib/components/molecules/CyConnecting.svelte.spec.js` — SCR-01 (incl. D-08 timeout via a `timedOut` prop)
- [ ] `src/lib/components/molecules/CyGuestGate.svelte.spec.js` — ACC-03
- [ ] `src/lib/components/molecules/CyCancelled.svelte.spec.js` — SCR-02, D-16 / D-17 / D-18
- [ ] Extend `src/live/room.spec.js` — guard, `setRoomVisibility`, `cancelRoom` payload, `cancelReason`; **add `is_public: false` to `baseRoom`** and **add `upsertGuestSpectator` to the `vi.mock` factory** (RESEARCH Pitfall 4 — omitting either yields a false green)
- [ ] Extend `src/lib/server/rooms.spec.js` — `isPublic` in the snapshot, `setRoomVisibilityAsHost`, `removeGuestSpectators`
- [ ] Extend `src/routes/draft/[id]/page.server.spec.js` — the `gated` matrix across guest/authed × public/private × lobby/drafting/review
- [ ] Extend `src/lib/components/molecules/LobbyHostBar.svelte.spec.js` — the open-spectating toggle
- [ ] **Edit `src/phase10-screens.spec.js`** — scope-guard reconciliation: remove the `cy-loading` / `cy-gate` / `cy-cancel` Phase-12 exclusions. Must land in the **same task** as the CSS append, or the suite goes red between commits. Keep the DS-04 `border-radius` assertion byte-identical.

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] Per-Task Verification Map populated with real task IDs (stub replaced)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
