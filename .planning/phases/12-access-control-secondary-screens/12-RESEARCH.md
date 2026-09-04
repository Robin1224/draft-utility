# Phase 12: Access Control & Secondary Screens - Research

**Researched:** 2026-09-04
**Domain:** SvelteKit SSR authorization + svelte-realtime stream guards, Drizzle additive migration, Svelte 5 runes screens (Cyber CSS port)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Guest Gate — enforcement (ACC-03/04)**

- **D-01:** The gate is enforced at **both layers**. `src/routes/draft/[id]/+page.server.js` decides what the page renders (no flash of lobby, no wasted socket); the `lobby` stream in `src/live/room.js` **independently** refuses blocked guests. SSR is the UX layer; the socket is the real security boundary — a client can open the WS directly, so the stream guard is not optional. Today neither layer gates: the load returns room data to everyone, and the stream upserts *any* guest as a spectator (`room.js` ~line 119).
- **D-02:** SSR signals the block by returning **`gated: true`** in the load's data — **not** `error(403)` and **not** a redirect. `+page.svelte` gains a branch rendering `.cy-gate` **inside CyShell**, matching the prototype (`CYGuestGate` sits inside `CYChrome`, header + phase tracker + room code still visible). This also keeps `RETRY_AS_GUEST()` on the same page with no full reload.
- **D-03:** **Gate predicate = `isGuest && !room.is_public && phase === 'lobby'`.** `drafting` is guest-viewable (ACC-04). `review` stays open to everyone — UI-06 locked it as guest-viewable and the shareable review link is a v1.0 promise. `cancelled` shows the SIGKILL screen; there is nothing to hide in a dead room.
- **D-04:** `RETRY_AS_GUEST()` re-runs the load via **`invalidateAll()`** — a manual "check again" that drops the guest straight into the lobby/draft if the host has since opened spectating or started the draft. No page reload, no shell re-mount, no boot animations re-running.

**Connecting screen (SCR-01)**

- **D-05:** The screen honors a **minimum display window (~600–900ms)** even when the snapshot arrives sooner. A real socket connect is often under 100ms, so without a floor the 6-line typed log flashes half-typed and vanishes. Exact value is Claude's discretion. Note the floor is what makes the screen legible under `prefers-reduced-motion`, where the typed log jumps straight to full text.
- **D-06:** Shows on **cold load only** — first mount of the draft route (initial socket open + snapshot hydration). Snapshot updates and phase transitions (lobby→drafting→review) never re-show it. Reconnects are **not** covered here: the disconnect story is already owned by the frozen PauseOverlay grace flow and this must not fight it.
- **D-07:** The progress meter is ported **decorative and verbatim** — `.cy-loading-meter` / `.cy-loading-bar` / `.cy-loading-pct` plus the `cy-fill` keyframe, with the `sync…` label. There are no real progress stages (one socket open, one snapshot), so an indeterminate bar is the honest rendering. Needs a reduced-motion suppression like every other keyframe.
- **D-08:** If the connection never resolves, **time out at ~10s** to an error state: the log's tail swaps to a red failure line plus a retry action. Without it a dead socket parks the user on `ESTABLISHING_LINK…` forever.
- **D-09:** This replaces the current placeholder — `loading = streamVal === undefined` currently renders a bare `<p class="cy-foot">// loading room…</p>`.

**Open-spectating toggle (ACC-01/02)**

- **D-10:** The toggle lives in the **Host Console modal**. Phase 11 (D-01/D-03) established the Console as the home for host room-management controls (move, kick, `CANCEL_ROOM`) with the bar reduced to launchers; a room-visibility setting belongs there, and the `.cy-hc-*` field vocabulary already exists to hold it. The prototype has **no** design for this control — visual treatment is Claude's discretion within the Cyber vocabulary.
- **D-11:** Flipping **public → private ejects connected guests immediately** — they land on the 403 Guest Gate on the next snapshot, and their spectator rows are removed. "Private" means private; a host closing the room mid-lobby wants the lurkers gone.
- **D-12:** A new **`setRoomVisibility` live RPC** in `src/live/room.js`, alongside `kickMember` / `movePlayer` / `cancelRoom` — same host-assert, same `publish(topicForRoom(code), 'set', snap)` broadcast, so every client updates live from one code path. Not a form action: ACC-02 requires a live flip that other connected clients see without refreshing.
- **D-13:** **`isPublic` is added to the lobby snapshot** (`loadLobbySnapshot`). This is the only way the toggle reflects a flip made from another device and the only way D-11's live ejection can work. Additive fields do not break the frozen shape — the existing tests assert on existing keys.
- **D-14:** The column ships as a **generated Drizzle migration** — `boolean('is_public').notNull().default(false)` on `room`, then `drizzle-kit generate` producing `drizzle/0002_*.sql`, consistent with the two checked-in migrations. The `default(false)` is what satisfies ACC-01's "defaulting to closed" for existing rows.

**Room Cancelled screen (SCR-02)**

- **D-15:** **Everyone sees it, host included.** One branch on `snapshot.phase === 'cancelled'`, no role special-casing — SCR-02 says "everyone", and the host gets confirmation their `CANCEL_ROOM` landed. Fixes a live bug: today `phase === 'cancelled'` falls into the **DraftBoard** branch (`+page.svelte` ~line 266).
- **D-16:** The SIGKILL log **interpolates real values** — room code and player/spectator counts from the last snapshot before cancellation; the remaining lines stay verbatim. The prototype's `notifying 6 players, 3 spectators` is mockup data.
- **D-17:** The log **renders complete, not typed**. The prototype's `CYCancelled` deliberately does *not* use the typed-log hook (unlike `CYLoading`, which does) — a termination notice should be instantly readable, and it avoids another motion path to suppress.
- **D-18:** **Both cancellation paths land on the same screen with different wording.** Host-issued `cancelRoom` keeps `[SIG] host issued SIGKILL → room {code}`; the automatic `cancelDraftNoCaption` path (captain disconnects, grace expires, no replacement) swaps that line to a grace-expiry variant. Both set `phase = 'cancelled'`, so one branch handles both — but misattributing an automatic timeout to the host is confusing precisely when the host is also its victim. Planner: check whether the snapshot already distinguishes the two paths; if it does not, the minimal distinguishing signal is part of this phase.

### Claude's Discretion

- Exact minimum-display-window value for the Connecting screen (D-05) and the timeout threshold (D-08).
- Visual treatment of the spectating toggle (D-10) — checkbox, two-state `[ON|OFF]` terminal switch, or a `.cy-hc-*` row — and whether it locks once the draft has started.
- The cancelled screen's `$ COPY_LOG()` / `$ NEW_DRAFT()` footer actions — keep both as designed, or trim.
- Whether the CyShell phase tracker shows anything special on the gate and cancelled screens.
- The exact grace-expiry log wording for D-18.
- CSS placement per the Phase 8 hybrid org: `.cy-loading*`, `.cy-gate*`, `.cy-cancel*` blocks ported verbatim into `src/app.css` under `.cy-app`; genuine one-offs scoped.
- Whether `data.room` also carries `is_public` for first paint, given D-13 already covers it via the snapshot.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

Adjacent work that surfaced but is **not** Phase 12:

- **Outstanding human UAT debt** — `09-HUMAN-UAT.md` (3 pending), `10-UAT.md` (`status: testing`, 1 recorded issue unresolved, 4 pending), `11-HUMAN-UAT.md` (4 pending). All visual checks the specs can't simulate. Run `/gsd:verify-work` before completing the milestone, not during this phase.
- **ROADMAP.md bookkeeping drift** — Phases 8 and 9 are listed as `[ ]` / `0/3` / "Not started" despite being complete on disk with passing verification. Cosmetic; fix at milestone completion.
- **Stale `.planning/HANDOFF.json`** — describes Phase 03 plan 06 from 2026-04-03 (v1.0, shipped). Safe to delete.
- **v1.0 tech debt TD-01..06** — explicitly out of scope for v2.0 per REQUIREMENTS.md. TD-05 (guest spectator accumulation on review-phase rooms) is *adjacent* to this phase's guest handling; resist folding it in.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ACC-01 | A room carries an "open spectating" (public/private) flag, defaulting to closed, persisted in the room record | Verified generated migration SQL (§Resolved Investigation 2) — `ALTER TABLE "room" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;`; `getRoomByPublicCode` uses `db.select()` (all columns) so the flag reaches both callers with zero query changes (§Architecture Patterns P1) |
| ACC-02 | The host can toggle "open spectating" from the lobby, flipping the room public/private live | `setRoomVisibility` RPC shaped on the verified `movePlayer`/`kickMember` template (§Code Examples E2); `assertHost` + `mapRoomMutationError` reuse; single `publish(topicForRoom(code), 'set', snap)` broadcast path (§Architecture Patterns P3); toggle drops into the shipped Host Console `CyModal` (`LobbyHostBar.svelte:113`) |
| ACC-03 | An unauthenticated visitor to a private, pre-draft room sees the 403 Guest Gate (Discord sign-in + retry-as-guest) instead of the lobby | Two-layer model verified end-to-end (§Resolved Investigation 3, §Security Domain): SSR `gated: true` + stream-init `LiveError('FORBIDDEN')` whose topic subscription is rolled back by the library; three-source gate derive (§Architecture Patterns P4); verbatim `.cy-gate*` CSS + copy (§Design Source Verification) |
| ACC-04 | When a room is public or the draft has started, guests can view it as spectators | D-03 predicate scoped to `phase === 'lobby'` only; `upsertGuestSpectator` runs unchanged for every non-gated path (§Architecture Patterns P2); `invalidateAll()` verified as the only primitive that re-runs this dependency-free load (§Resolved Investigation 5) |
| SCR-01 | While the socket is connecting / the room is hydrating, a Connecting screen shows the typed connect log and progress meter, then transitions to lobby (or draft on rejoin) | `streamVal === undefined` verified cold-load-only against svelte-realtime 0.4.6 internals (§Resolved Investigation 6); `createTypedLog(CY_CONNECT_LINES, {speed:7, lineGap:120})` already built for this screen; measured 2594ms full-type duration informs the D-05 floor (§Resolved Investigation 6) |
| SCR-02 | Room Cancelled renders the red SIGKILL-log terminal state for everyone when the host cancels the room | **Blocker-grade finding**: host cancel currently publishes `null`, not a cancelled snapshot (§Resolved Investigation 1) — the fix is also the D-18 distinguishing signal, at zero migration cost; verbatim `.cy-cancel*` CSS + log copy (§Design Source Verification) |
</phase_requirements>

## Summary

This phase is the only one in v2.0 that crosses out of the view layer, and the live source contains three surprises the planner must design around. **First and most important: the host-cancel path does not currently produce a cancelled snapshot at all.** `cancelRoomAsHost` sets `phase = 'ended'` *and* `ended_at`, and `getRoomByPublicCode` hides any row with a non-null `ended_at` — so the `loadLobbySnapshot` call that immediately follows returns `null`, and `src/live/room.js:367` broadcasts `publish(topic, 'set', null)`. On the client that lands as `streamVal === null`, which satisfies neither `loading` nor `snapshot` nor `loadError`, so **every connected client currently renders a blank `<main>` when the host cancels**. D-15's "one branch on `snapshot.phase === 'cancelled'`" therefore cannot fire for the host path until `cancelRoom` publishes a real payload. The fix is small, mirrors an existing verified pattern (`disconnectGraceExpired` at `room.js:104-108` already loads the snapshot *before* cancelling for exactly this reason), and simultaneously answers D-18: publish `{ ...snapBeforeCancel, phase: 'cancelled', cancelReason: 'host' }` from `cancelRoom` and add `cancelReason: 'grace'` to the existing grace-expiry publish. **Zero migration cost, no new column, no schema change** — the two publish sites already know which path they are.

**Second: `invalidateAll()` alone will not lift the gate if the stream guard has already thrown.** svelte-realtime caches stream stores by `path + ':' + args` (`client.js:398-460`), and `+layout.svelte:17` subscribes to the very same `lobby(code)` store as the page — one store, one WS subscription, refcount ≥ 1 for the whole visit. Once the guard rejects, that shared store holds `{ error: RpcError('FORBIDDEN') }` **permanently**: the store exposes `optimistic`/`loadMore`/`hydrate`/`when` but no `refetch`, and `invalidateAll()` only re-runs HTTP loads, never re-subscribes a socket stream. The resolution is to **not subscribe at all while gated**: the page's gate branch must render before anything reads `streamVal`, and `+layout.svelte` must gate its own `fromStore(lobby(code))` read on `page.data.gated`. That converts the guard from a poison pill into a clean first-subscribe-on-retry, makes D-01's "no wasted socket" claim actually true, and closes the real data-exposure hole (an already-connected guest keeps receiving every `publish` broadcast for the topic, because `access`/`filter` in this library is **subscribe-time only** — verified at `server.d.ts:95-105` and `server.js:376`). It does mean `+layout.svelte` is a fifth touch point beyond CONTEXT's "strictly four additions" — flagged, not a blocker.

**Third: the throw-vs-gated-payload question resolves decisively in favor of throwing.** `_executeRpc` calls `ws.subscribe(topic)` at `server.js:2094` *before* running the init handler at `server.js:2136`, but the `catch` at 2176 calls `_rollbackStreamSubscribe`, which does `ws.unsubscribe(topic)` (`server.js:196-197`). So a `throw new LiveError('FORBIDDEN', …)` from inside the `lobby` init leaves the blocked guest with **no** topic membership — the security boundary holds. A "gated payload" return would instead leave them subscribed and receiving every future roster broadcast. On the client, the throw surfaces as `store.set({ error: RpcError })` (`client.js:972`), which the existing `loadError` derive at `+page.svelte:44` already reads — so `loadError?.code === 'FORBIDDEN'` becomes a free third source for the gate branch, covering the case where SSR and WS disagree about identity (the WS `upgrade()` falls back to `role: 'guest'` on *any* session-lookup error, `hooks.ws.js:52-70`).

Everything else is favorable. The `is_public` column needs no query changes (`getRoomByPublicCode` is a bare `db.select()`); adding `isPublic` to `loadLobbySnapshot`'s return automatically propagates to draft *and* review snapshots because `loadDraftSnapshot` spreads the lobby base (`draft.js:48,58`); every CSS class and copy string in the prototype resolves at the exact line numbers CONTEXT claims; `createTypedLog` was pre-built in Phase 9 with the connect-log options; and the exact `0002` migration SQL was generated and verified in a scratch directory. The one bookkeeping correction: the suite is **202 passing tests across 24 files** (server 150, client 52), not 130 — that figure is the v1.0 baseline in REQUIREMENTS.md.

**Primary recommendation:** Sequence the phase as (0) DB column + `isPublic` in `loadLobbySnapshot` + verified `0002` migration; (1) `setRoomVisibility` RPC + guest-ejection helper + the `cancelRoom` publish fix carrying `cancelReason`; (2) the `lobby` stream guard (throwing `LiveError('FORBIDDEN')`, placed above the `upsertGuestSpectator` call at `room.js:119`); (3) SSR `gated` + the `+layout.svelte` subscribe gate; (4) the three screens as **extracted presentational components** (`CyConnecting` / `CyGuestGate` / `CyCancelled`) so they get real browser-DOM specs instead of source-grep contracts; (5) the `+page.svelte` branch rewiring and the `phase10-screens.spec.js` scope-guard flip. Gate every wave on `npm test` only — `npm run lint` and `npm run check` are **red at baseline** (19 src files fail prettier, 20 eslint errors in src, 10 svelte-check errors in 4 files).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `is_public` persistence + default-closed for existing rows | Database / Storage | — | ACC-01 says "persisted in the room record"; the `NOT NULL DEFAULT false` constraint is what back-fills existing rows, not application code |
| Authorization decision (who may read a private room) | API / Backend (`src/live/room.js` stream init) | Frontend Server (SSR, UX only) | A browser can open the WS directly; the socket is the only enforcement point that cannot be bypassed. SSR duplicates the predicate purely to avoid a lobby flash |
| Render-branch decision (gate vs lobby vs connecting vs cancelled) | Frontend Server (SSR `load`) + Browser (snapshot-reactive) | — | D-02 puts first-paint in SSR; D-11's live ejection can only come from the snapshot, so both sources feed one branch |
| Host visibility flip + broadcast | API / Backend (`setRoomVisibility` live RPC) | Database (column write) | ACC-02 requires other connected clients to see the flip without refreshing → must be the pub/sub path, not a form action |
| Guest spectator ejection on flip-to-private | API / Backend (bulk delete on `room_member`) | Browser (re-evaluates gate from new snapshot) | Server owns membership truth; the client cannot be trusted to eject itself, but must react to the snapshot because there is no server-initiated unsubscribe |
| Cancellation-reason attribution (host vs grace) | API / Backend (publish-time field) | — | Only the two publish call sites know which path ran; deriving it downstream from `draftState` shape is fragile |
| Connect-log typing, progress meter, min-display floor, 10s timeout | Browser | — | Pure presentation + client timers; no server involvement (there is exactly one socket open and one snapshot) |
| Persistent chrome (header, phase tracker, room code, scanlines, shader) | Browser (`+layout.svelte` → `CyShell`) | — | Already app-wide from Phase 8; all three new screens render *inside* `.cy-body`, matching `CYChrome` in the prototype |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `svelte` | 5.51.0 (installed) | Runes (`$state`/`$derived`/`$effect`/`$props`), snippets | Already the app framework; no alternative in scope |
| `@sveltejs/kit` | 2.50.2 (installed) | `load` + `invalidateAll()` + `resolve()` + `page` state | `invalidateAll()` is the only Kit primitive that re-runs a dependency-free load (§Resolved Investigation 5) |
| `svelte-realtime` | 0.4.6 (installed) | `live.stream` init guard, `live()` RPC, `LiveError`, topic publish | The frozen realtime transport; the phase adds one guard + one RPC inside it |
| `drizzle-orm` | 0.45.1 (installed) | `boolean(...).notNull().default(false)` column, `db.delete(...).where(and(...))` | Existing ORM; `boolean` is already imported in `schema.js:3` |
| `drizzle-kit` | 0.31.8 (installed) | `generate` → `0002_*.sql` + `meta/0002_snapshot.json` + journal entry | Project uses generate+migrate (two checked-in migrations + full `meta/` snapshots) |
| `vitest` | 4.1.0 (installed) | node + browser (Playwright chromium) projects | Existing dual-project harness |
| `vitest-browser-svelte` | 2.0.2 (installed) | `render()` for component DOM specs | Existing pattern (`LobbyHostBar.svelte.spec.js`, `DraftSettingsPanel.svelte.spec.js`) |
| `svelte-realtime/test` | (bundled) | `createTestEnv()` / `env.connect({role:'guest', guestId})` / `client.subscribe().waitFor()` | Already used in `src/live/room.spec.js:81-94` — exactly the harness the stream-guard test needs |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `$lib/components/effects/cyTypedLog.svelte.js` | in-repo (Phase 9) | `createTypedLog(lines, {speed, lineGap})` | The Connecting screen only. Reduced-motion jump-to-full is built in |
| `$lib/components/atoms/CyModal.svelte` | in-repo (Phase 11) | Native `<dialog>` modal | Host Console already composes it; the toggle drops in with no new modal work |
| `$app/paths` `resolve()` | Kit 2.50 | `resolve('/draft/[id]', {id})`, `resolve('/login')` | Required to avoid adding new `svelte/no-navigation-without-resolve` eslint errors (§Pitfall 9) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Throwing `LiveError('FORBIDDEN')` from the stream init | Returning a "gated" stub snapshot | **Rejected on security grounds.** The topic subscription is only rolled back on *throw*; a returned stub leaves the blocked guest subscribed to every future roster broadcast, and `access`/`filter` cannot filter per-event (subscribe-time only, `server.d.ts:95`) |
| `access:` stream option for the guard | — | **Not viable.** `access(ctx)` is synchronous, receives no `publicCode`, and is checked once at subscribe (`server.js:376`, `server.d.ts:105`). The gate needs an async DB read keyed on the room code |
| `live.stream` `__isGated` / `__gatePredicate` mechanism | — | Same synchronous-predicate limitation; returns `{data:null, gated:true}` without subscribing, but cannot read the DB |
| `cancelReason` as an additive snapshot field | New `room.cancel_reason` column | Column costs a second migration and stores state nobody queries — the value is only ever consumed by the client that was connected at cancellation time. Snapshot-only is strictly cheaper |
| Server-initiated unsubscribe for D-11 ejection | — | **Does not exist** in svelte-realtime 0.4.6. `ctx.signal(userId, …)` is point-to-point by *userId*; guests have only a `guestId`. Ejection must be client-reactive |
| `error(403)` in the load | — | Explicitly rejected by D-02, and the research confirms why: `+error.svelte` has no route back, so `RETRY_AS_GUEST()` would require a full reload and re-run the Phase 8 boot animations |
| Extracting the three screens as components | Inlining all three in `+page.svelte` | Inlining forces source-grep-only tests (`+page.svelte` imports `$live/*` and cannot render in the browser project — see `phase11-fixes.spec.js` header). Extraction unlocks real DOM assertions for SCR-01/SCR-02/ACC-03 |
| Bulk `DELETE … WHERE guest_id IS NOT NULL` for ejection | Loop `kickMember` per guest | Loop reuses "the existing spectator-removal path" literally, but costs N round-trips plus N `recomputeTeamCaptains` passes on Neon HTTP (no interactive transactions). Guests are never captains and never on a team, so the bulk delete is safe and one query |

**Installation:**

```bash
# none — zero new dependencies
```

**Version verification:** every library above was read from `package.json` and `node_modules` in this session. No registry lookups were needed because nothing new is installed.

## Package Legitimacy Audit

**Not applicable — this phase installs zero external packages.**

Verified by reading `package.json` (no additions required) and by confirming every capability maps to an already-installed dependency or an in-repo module. The slopcheck gate is therefore vacuous here; no `checkpoint:human-verify` install gates are needed.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| *(none)* | — | — | — | — | — | — |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Design Source Verification

Every line reference in CONTEXT.md `<canonical_refs>` **resolves exactly — zero drift.** [VERIFIED: read from disk 2026-09-04]

### `design_handoff_pickban_cyber/prototype/variants/cyber.jsx`

| Symbol | CONTEXT claim | Actual | Status |
|--------|---------------|--------|--------|
| `CY_CONNECT_LINES` | ~646 | 646 | ✓ exact |
| `CYLoading` | ~654 | 654 | ✓ exact |
| `CYGuestGate` | ~675 | 676 (comment banner at 675) | ✓ exact |
| `CYCancelled` | ~703 | 703 | ✓ exact |

### `design_handoff_pickban_cyber/prototype/variants/cyber.css`

| Block | CONTEXT claim | Actual | Status |
|-------|---------------|--------|--------|
| `.cy-loading*` + `cy-dots` + `cy-fill` keyframes | ~470–487 | 470–487 | ✓ exact |
| `.cy-gate*` | ~490–504 | 490–504 | ✓ exact |
| `.cy-cancel*` | ~507–518 | 507–518 | ✓ exact |

### Verbatim CSS to port into `src/app.css` (append after line 841, under `.cy-app`)

```css
/* LOADING / CONNECTING — cyber.css 469-487 */
.cy-loading { display: grid; place-items: center; min-height: 78vh; padding: 40px; }
.cy-loading-card {
  width: 100%; max-width: 560px;
  background: var(--cy-bg-2); border: 1px solid var(--cy-line);
  padding: 28px 30px; box-shadow: inset 0 0 80px rgba(196,75,255,0.05);
}
.cy-loading-eyebrow { color: var(--cy-violet); font-size: 11px; }
.cy-loading-card h2 { margin: 8px 0 18px; font-size: 22px; color: var(--cy-lime); text-shadow: var(--cy-lime-glow); letter-spacing: 0.04em; }
.cy-loading-card h2 .cy-dots::after { content: ""; animation: cy-dots 1.4s steps(4) infinite; }
@keyframes cy-dots { 0% { content: ""; } 25% { content: "."; } 50% { content: ".."; } 75% { content: "..."; } }
.cy-loading-log { background: var(--cy-bg); border: 1px solid var(--cy-line); padding: 14px 16px; font-size: 12px; line-height: 1.6; color: var(--cy-text-2); margin: 0 0 18px; white-space: pre-wrap; min-height: 8.4em; }
.cy-loading-log b { color: var(--cy-lime); font-weight: 400; }
.cy-loading-log .cy-wait { color: var(--cy-amber); }
.cy-loading-meter { display: flex; align-items: center; gap: 12px; }
.cy-loading-bar { flex: 1; font-size: 16px; letter-spacing: 1px; color: var(--cy-line-2); overflow: hidden; white-space: nowrap; }
.cy-loading-bar b { color: var(--cy-lime); font-weight: 400; text-shadow: var(--cy-lime-glow); animation: cy-fill 2.4s linear infinite; display: inline-block; }
@keyframes cy-fill { 0% { clip-path: inset(0 100% 0 0); } 100% { clip-path: inset(0 0 0 0); } }
.cy-loading-pct { color: var(--cy-violet); font-size: 13px; min-width: 3em; text-align: right; }

/* GUEST GATE — cyber.css 489-504 */
.cy-gate { display: grid; place-items: center; min-height: 78vh; padding: 32px; }
.cy-gate-card {
  width: 100%; max-width: 500px;
  background: var(--cy-bg-2); border: 1px solid var(--cy-line);
  border-left: 3px solid var(--cy-amber);
  padding: 30px 32px; display: flex; flex-direction: column; gap: 14px;
  box-shadow: 0 0 60px rgba(255,170,0,0.08);
}
.cy-gate-eyebrow { color: var(--cy-amber); font-size: 11px; }
.cy-gate-card h2 { margin: 4px 0 0; font-size: 22px; color: var(--cy-text); letter-spacing: 0.04em; }
.cy-gate-card p { margin: 0; color: var(--cy-text-2); font-size: 13px; line-height: 1.55; }
.cy-gate-readout { background: var(--cy-bg); border: 1px solid var(--cy-line); padding: 12px 14px; font-size: 11px; color: var(--cy-text-2); line-height: 1.6; margin: 2px 0; white-space: pre-wrap; }
.cy-gate-readout .cy-403 { color: var(--cy-red); }
.cy-gate-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
.cy-gate-foot { color: var(--cy-text-3); font-size: 11px; margin: 6px 0 0; }

/* ROOM CANCELLED — cyber.css 506-518 */
.cy-cancel { display: grid; place-items: center; min-height: 78vh; padding: 40px; }
.cy-cancel-card {
  width: 100%; max-width: 520px;
  background: var(--cy-bg-2); border: 1px solid var(--cy-red);
  padding: 30px 32px; box-shadow: 0 0 60px rgba(255,34,85,0.16);
}
.cy-cancel-eyebrow { color: var(--cy-red); font-size: 11px; text-shadow: 0 0 12px #ff225580; }
.cy-cancel-card h2 { margin: 8px 0 16px; font-size: 24px; color: var(--cy-text); letter-spacing: 0.04em; }
.cy-cancel-log { background: var(--cy-bg); border: 1px solid var(--cy-line); padding: 14px 16px; font-size: 11px; line-height: 1.65; color: var(--cy-text-2); margin: 0 0 22px; white-space: pre-wrap; }
.cy-cancel-log .cy-sig { color: var(--cy-red); }
.cy-cancel-log .cy-ok { color: var(--cy-lime); }
.cy-cancel-actions { display: flex; gap: 8px; }
```

**Reduced-motion additions (D-07; Phase 8 D-10 rule).** Two new keyframes arrive (`cy-dots`, `cy-fill`), so a new `@media (prefers-reduced-motion: reduce)` block is required, matching the three existing ones at `app.css:373`, `712`, `838`:

```css
@media (prefers-reduced-motion: reduce) {
  .cy-loading-card h2 .cy-dots::after { animation: none; content: "..."; }
  .cy-loading-bar b { animation: none; }
}
```

Note the two static end-states differ in quality: `animation: none` on `.cy-loading-bar b` leaves `clip-path` unset, so the full 40-block lime bar renders solid — an honest static indeterminate bar. `animation: none` on `.cy-dots::after` falls back to the base rule's `content: ""`, i.e. the dots **vanish**; pinning `content: "..."` under reduced motion preserves the `ESTABLISHING_LINK...` reading. [ASSUMED — cosmetic, discretionary]

### Verbatim copy strings (from `cyber.jsx`)

**Connect log** (`CY_CONNECT_LINES`, jsx 646-653) — 6 lines, joined by `\n`:

```
$ ./draftnet connect --room=K7-MIRA
[ .. ] resolving host ..................
[ OK ] tcp handshake ................... 24ms
[ OK ] websocket upgrade ............... 101
[ .. ] subscribing draft channel ......
[ .. ] hydrating snapshot ..............
```

Dot-leader spacing is load-bearing for typed alignment (same warning as `CY_BOOT_LINES` in `cyTypedLog.svelte.js:22`). Recommendation: interpolate the real room code into line 1 (`--room={code}`) and keep `24ms` / `101` verbatim as decorative — matching D-16's spirit for the cancelled log. Card chrome: eyebrow `$ ./draftnet --status`, heading `ESTABLISHING_LINK` + `<span class="cy-dots" aria-hidden="true">`, `<pre class="cy-loading-log">{log.text}` + `{#if !log.done}<span class="cy-chat-cursor">▮</span>{/if}`, meter `<b>{'█'.repeat(40)}</b>` + `<span class="cy-loading-pct">sync…</span>`.

**Guest Gate** (jsx 676-699): eyebrow `// access: RESTRICTED`; heading `$ ROOM.ACCESS()`; readout —

```
> GET /draft/{code}
< 403 SIGN_IN_REQUIRED          ← wrapped in <span class="cy-403">
> identity = <guest:anon>
> hint: host has not opened this room to spectators
```

explainer `// sign in to join this draft as a player or captain — or wait for the host to start it, then spectate.`; actions `SIGN_IN_DISCORD()` (`.cy-btn .cy-btn-discord`, inline Discord SVG path available verbatim at jsx:690 and already in `LoginCard.svelte:38`) then `RETRY_AS_GUEST()` (`.cy-btn .cy-btn-ghost`); foot `// you can still watch once the draft goes live`. Note `> identity = <guest:anon>` contains literal `<`/`>` — must be text-interpolated or escaped, never `{@html}`.

**Room Cancelled** (jsx 703-723): eyebrow `// SESSION_TERMINATED`; heading `$ ROOM.KILL()`; log —

```
[SIG] host issued SIGKILL → room {code}      ← <span class="cy-sig">
[INF] flushing draft state ............ done
[INF] notifying {n} players, {m} spectators
[INF] releasing room code ............. {code}
[ OK ] socket closed cleanly (code 1000)     ← <span class="cy-ok">
```

actions `$ COPY_LOG()` (`.cy-btn`) and `$ NEW_DRAFT()` (`.cy-btn .cy-btn-primary`).

### Already-shipped classes the screens consume (do NOT re-port)

`.cy-btn`, `.cy-btn-sm`, `.cy-btn-primary`, `.cy-btn-ghost`, `.cy-btn-discord`, `.cy-btn-danger` (`app.css:317-353`), `.cy-foot` (491), `.cy-chat-cursor` + `cy-blink` (668, 237), `.cy-hc-section` / `.cy-hc-row` / `.cy-field` / `.cy-field-label` / `.cy-input` / `.cy-hc-hint` (Phase 11 block), `.cy-grow`.

## Resolved Investigations

The nine questions the planner asked, answered against live source.

### 1. D-18 — does the snapshot distinguish host cancel from grace expiry? **No — and the host path is worse than indistinguishable, it is broken.** [VERIFIED: source read]

Trace of the two paths:

| | Host `cancelRoom` (`room.js:348-369`) | Grace expiry (`room.js:102-109`) |
|---|---|---|
| DB helper | `cancelRoomAsHost` (`rooms.js:494`) | `cancelDraftNoCaption` (`rooms.js:518`) |
| DB write | `phase: 'ended'`, `ended_at: now` | `phase: 'cancelled'`, `ended_at: now` |
| Snapshot loaded | **after** the write (`room.js:366`) | **before** the write (`room.js:106`) |
| `getRoomByPublicCode` result at load time | `null` — `shouldHideRoomFromPublic` returns true for `ended_at != null` (`room-lifecycle.js:26-30`) | valid row |
| Published payload | **`null`** | `{ ...snapBeforeCancel, phase: 'cancelled' }` |
| Client result | `streamVal === null` → `loading` false, `snapshot` null, `loadError` null → **blank `<main>`** | `snapshot.phase === 'cancelled'` → falls into the `phase === 'drafting' \|\| 'cancelled'` branch at `+page.svelte:266` → `DraftBoard`'s own `.cy-draft-cancelled` sub-branch (`DraftBoard.svelte:121-129`) |

So CONTEXT's D-15 claim ("today `phase === 'cancelled'` falls into the DraftBoard branch") is accurate **only for the grace path**. The host path produces a blank screen. `src/live/room.spec.js:160-166` does not catch this because `loadLobbySnapshot` is `vi.mock`ed to return `baseSnapshot` unconditionally — the mock hides the real integration.

**Minimal distinguishing signal — no column, no migration:** the two publish sites already know which path ran. Move the snapshot load in `cancelRoom` to *before* `cancelRoomAsHost` (the exact pattern the grace path already documents at `room.js:104`) and tag both publishes:

```js
// room.js cancelRoom — BEFORE the cancel, because getRoomByPublicCode hides ended rooms
const snapBefore = await loadLobbySnapshot(db, code);
await cancelRoomAsHost(db, { roomId: roomRow.id, hostUserId: ctx.user.id });
const snap = snapBefore ? { ...snapBefore, phase: 'cancelled', cancelReason: 'host' } : null;
ctx.publish(topicForRoom(code), 'set', snap);
return snap;

// room.js disconnectGraceExpired — add the tag to the existing publish
if (snapBeforeCancel) publish(topicForRoom(code), 'set',
  { ...snapBeforeCancel, phase: 'cancelled', cancelReason: 'grace' });
```

**Cost:** two additive snapshot fields total for the phase (`isPublic` + `cancelReason`) instead of CONTEXT's stated one. Zero DB migration for `cancelReason`. Zero change to `cancelRoomAsHost`'s DB write (`phase: 'ended'` stays — `rooms.spec.js:190-192` and `room-lifecycle.spec.js` assert on it; the divergence between DB `'ended'` and published `'cancelled'` already exists in the grace path's spirit and is harmless because the room is hidden from `getRoomByPublicCode` either way).

**Consequence the planner must accept:** SCR-02 is a **live-session-only** terminal state. `getRoomByPublicCode` returns `null` for any cancelled room, so `+page.server.js:11-13` throws `error(404)` on refresh. Making the cancelled room resolvable at SSR would require editing `shouldHideRoomFromPublic`, which is ROOM-08 behavior covered by `room-lifecycle.spec.js` and out of scope. SCR-02's acceptance text ("renders … for everyone when the host cancels the room") is satisfied for connected clients; a refresh lands on 404. Recommend documenting this in the phase summary rather than expanding scope.

**D-16 counts come free:** `snapBefore.teams.A.length + snapBefore.teams.B.length` and `snapBefore.spectators.length` are in the published payload, so the client reads them off `snapshot` with no client-side latching.

### 2. D-14 — the exact Drizzle workflow and generated SQL. **generate + migrate; SQL verified by running it.** [VERIFIED: drizzle-kit 0.31.8 executed in a scratch dir]

`package.json` scripts: `db:generate` → `drizzle-kit generate`, `db:migrate` → `drizzle-kit migrate`, plus `db:push` / `db:push:force` / `db:studio`. The presence of `drizzle/meta/_journal.json` (version `"7"`, entries `idx: 0` and `idx: 1`) **and** `meta/0000_snapshot.json` / `0001_snapshot.json` proves this project uses **generate + migrate**, not `push`. `push` would leave no journal.

`drizzle.config.js`: `schema: './src/lib/server/db/schema.js'`, `dialect: 'postgresql'`, `dbCredentials.url` from `process.env.DATABASE_URL` (throws at config load if unset), `verbose: true`, `strict: true`, **no `out`** → defaults to `./drizzle`. Verified: `drizzle-kit` auto-loads the repo's `.env`, so `npm run db:generate` works with no manual export (probed with `env -u DATABASE_URL` and it still resolved).

Schema edit (`src/lib/server/db/schema.js`, `room` table at line 22; `boolean` already imported at line 3):

```js
export const room = pgTable('room', {
	// … existing columns unchanged …
	draft_state: jsonb('draft_state'),
	is_public: boolean('is_public').notNull().default(false)
});
```

`npm run db:generate -- --name add_room_is_public` produces, verbatim:

```sql
-- drizzle/0002_add_room_is_public.sql
ALTER TABLE "room" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;
```

plus `drizzle/meta/0002_snapshot.json` (with `{"name":"is_public","type":"boolean","primaryKey":false,"notNull":true,"default":false}` under `tables["public.room"].columns`) and a journal entry `{ idx: 2, version: "7", when: <epoch ms>, tag: "0002_add_room_is_public", breakpoints: true }`. **Use `--name` explicitly** — without it drizzle-kit auto-generates a random adjective_noun tag (`0002_noisy_gamora` style), which is non-deterministic and makes the plan's file-path assertions unverifiable. All three artifacts must be committed together.

`DEFAULT false NOT NULL` in one statement is what satisfies ACC-01's "defaulting to closed" for pre-existing rows — Postgres back-fills existing rows with the default during the `ADD COLUMN`. No data-migration task needed.

**Dev vs deploy:** dev runs `npm run db:migrate` against the Neon dev branch after generating. There is no CI/deploy migration step in the repo (`dockerfile` and `package.json` contain no migrate hook), so applying `0002` in any other environment is a manual `npm run db:migrate`. Flag this to the planner as a deploy note, not a phase task.

**No query changes needed:** `getRoomByPublicCode` is a bare `db.select().from(room)` (`rooms.js:84`) — it selects every column, so `roomRow.is_public` is available in both callers (`+page.server.js` and `room.js`) the moment the migration lands. Only `createRoom`'s explicit `.returning({...})` (`rooms.js:53-58`) omits it, which is fine (the caller never reads it).

### 3. D-01 — stream-guard placement and refusal mechanism. **Throw `LiveError('FORBIDDEN')`, placed immediately after the `!roomRow` check and before the guest upsert.** [VERIFIED: svelte-realtime 0.4.6 server.js + client.js read]

Current `lobby` init (`room.js:115-123`):

```js
const code = normalizePublicCode(publicCode);
const roomRow = await getRoomByPublicCode(db, code);
if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');
// ← THE GUARD GOES HERE (line 119, above the upsert)
if (ctx.user?.role === 'guest' && ctx.user?.guestId) {
	await upsertGuestSpectator(db, roomRow.id, ctx.user.guestId);   // ← unconditional today
	const guestSnap = await loadLobbySnapshot(db, code);
	if (guestSnap) ctx.publish(topicForRoom(code), 'set', guestSnap);
}
```

The guard must sit **above** the whole `if (ctx.user?.role === 'guest' …)` block, not inside it — CONTEXT's integration note ("`upsertGuestSpectator` must not run for gated guests") requires the row never to be created, and slipping the guard inside the block after the upsert would create-then-refuse.

**Throw vs gated payload — throw, decisively.** The library's RPC executor calls `ws.subscribe(topic)` at `server.js:2094`, *before* invoking the init function at `server.js:2136`. The `catch` at `server.js:2176` runs `_rollbackStreamSubscribe(ws, topic, fn, ctx)`, which does `try { ws.unsubscribe(topic) } catch {}` (`server.js:196-197`) and decrements the owner tracking. So a throw leaves the blocked guest with **no topic membership** — they receive zero subsequent broadcasts. A returned "gated payload" would leave them subscribed, and since `access`/`filter` is subscribe-time-only (`server.d.ts:95-105`, `server.js:376`) with no per-event filtering on this stream, they would receive every future roster/chat-adjacent `publish` for a private room. **The gated-payload option is a data leak; reject it.**

Client-side plumbing already supports the throw: `client.js:972` does `store.set({ error: err instanceof RpcError ? err : … })`, which the existing derive at `+page.svelte:43-45` reads as `loadError`. So `loadError?.code === 'FORBIDDEN'` is a ready-made third gate source. `mapRoomMutationError` is **not** involved — it maps `rooms.js` sentinel throws inside *mutation* RPCs; the stream guard should construct `new LiveError('FORBIDDEN', …)` directly (message suggestion: `'Room is private'`).

**Critical caveat — the throw is one-way for the shared store.** See Investigation 4/5: the store is cached and refcounted, exposes no `refetch`, and `invalidateAll()` does not re-subscribe. The gate branch must therefore avoid subscribing at all.

**Predicate parity with SSR:** WS-side the predicate is `ctx.user?.role === 'guest' && !roomRow.is_public && roomRow.phase === 'lobby'`. Note the WS `upgrade()` falls back to `{ role: 'guest', guestId }` on **any** `getSession` error (`hooks.ws.js:52-70`, deliberately) — so a signed-in user can legitimately arrive at the socket as a guest while SSR sees them authenticated. That client will pass SSR (no `gated`) and be refused by the socket. Rendering the gate on `loadError?.code === 'FORBIDDEN'` is what makes that case degrade gracefully instead of showing a broken lobby.

### 4. D-11 — live ejection end-to-end. **Works, but only because the client re-evaluates the gate from the snapshot; there is no server-initiated unsubscribe, and the SSR/snapshot split leaves a data-exposure gap unless the layout is also gated.** [VERIFIED]

**Existing spectator-removal path:** `kickMember` (`rooms.js:338-365`) deletes one `room_member` row by `user_id` **or** `guest_id`, then recomputes captains. There is no bulk helper. For "eject all guests":

```js
// rooms.js — new helper; guests always have guest_id set and team null (upsertGuestSpectator:215-227)
export async function removeGuestSpectators(db, roomId) {
	await db.delete(room_member)
		.where(and(eq(room_member.room_id, roomId), isNotNull(room_member.guest_id)));
}
```

Keyed on `guest_id IS NOT NULL`, **not** `team IS NULL` — signed-in spectators (a player with `user_id` and `team: null`) must survive, because D-03 only gates `isGuest`. No `recomputeTeamCaptains` needed: guests are never captains and never on a team.

**Does the flip + publish actually eject?** Trace:

1. `setRoomVisibility(code, false)` → column write → `removeGuestSpectators` → `loadLobbySnapshot` (now `isPublic: false`, spectators emptied) → `publish(topicForRoom(code), 'set', snap)`.
2. The guest is still subscribed to `lobby:{code}`, so their client store receives the new snapshot. **The SSR load does not re-run** — `invalidateAll()` is client-initiated only, and nothing on the server can trigger a client navigation.
3. Therefore `data.gated` stays `false` for that guest. The gate must also derive from the snapshot: `snapshot.phase === 'lobby' && snapshot.isPublic === false && isGuest`.

**This is the gap CONTEXT's D-02/D-13 split leaves open, and the fix is the three-source gate derive** (§Architecture Patterns P4). Use `snapshot.isPublic === false`, not `!snapshot.isPublic`, so a stale snapshot published before the deploy (field absent → `undefined`) does not gate everyone out. `loadDraftSnapshot` spreads `loadLobbySnapshot`'s base (`draft.js:48,58`), so `isPublic` is present on drafting and review snapshots too — the `phase === 'lobby'` clause is what keeps ACC-04 intact.

**Residual data exposure (must be closed):** the ejected guest's WS subscription survives. `+layout.svelte:17` subscribes to the identical `lobby(code)` store, and svelte-realtime caches stream stores by `path + ':' + args` with a refcount (`client.js:398-460`, `cachedSubscribe` at 463) — so page and layout share **one** store and **one** WS subscription, and the refcount never reaches zero while the layout reads it. The guest keeps receiving every roster broadcast for a room they are gated out of. There is no server-side remedy: `ctx.signal(userId, …)` is keyed by userId (guests have only `guestId`), and no force-unsubscribe API exists in 0.4.6. **Client-side remedy:** gate the layout's read too —

```js
// +layout.svelte
const snap = $derived.by(() =>
	code && !page.data.gated ? fromStore(lobby(code)).current : null
);
```

Svelte's `fromStore` uses `createSubscriber` (`svelte/src/store/index-client.js`, `svelte/src/reactivity/create-subscriber.js`), which tears down the underlying store subscription a microtask after the last tracking reaction stops reading it — so once both page and layout stop reading, the WS subscription really closes.

This makes `+layout.svelte` a **fifth touched file** beyond CONTEXT's "one column, one RPC, one snapshot field, one stream guard". Flagged as a scope note. `page.data` is the merged result of all load functions and is reactive after `invalidateAll()` (`@sveltejs/kit` `Page.data`, `public.d.ts:1439`), so this is one line and correct.

**Second residual leak (recommend descope, document):** the chat `$effect` at `+page.svelte:181-192` subscribes unconditionally on mount, and `chatAll` / `chatSpectators` (`src/live/chat.js:124-184`) have **no room-privacy check** — they only reject team-channel access. A gated guest whose page renders the gate would still subscribe to `chatAll` for a private room. Minimal mitigation: `if (gated) return;` at the top of that effect (client-side; does not stop a direct WS attacker). Server-side chat privacy for private rooms is **not** in ACC-01..04's acceptance text and is adjacent to TD-05 — recommend documenting rather than expanding scope.

### 5. D-04 — is `invalidateAll()` the right primitive? **Yes for the HTTP load; no, on its own, for lifting the gate.** [VERIFIED: kit 2.50.2 source + official docs]

`invalidateAll()` sets `force_invalidation = true` and re-runs `_invalidate()` (`kit/src/runtime/client/client.js:2245-2251`). Its JSDoc: *"Causes all `load` and `query` functions belonging to the currently active page to re-run."* Per the official docs, that includes **server** `load` functions (`+page.server.js`, `+layout.server.js`) — the client fetches fresh `__data.json` — and components are **not remounted**; only data props change. So the Phase 8 boot animations in `CyShell` / `+layout.svelte` do not re-run. **D-04 confirmed correct.**

Caveats:

- **`invalidate('key')` would be a no-op here.** Per-URL/`depends` invalidation only re-runs loads that registered a dependency via `fetch` or `depends()` (`public.d.ts:3044-3046, 1109`). `draft/[id]/+page.server.js` calls neither — it hits the DB directly through Drizzle. Only `invalidateAll()`'s `force_invalidation` path reruns it. If the planner wants finer granularity, the load must first call `depends('room:visibility')`; **not recommended** — the extra indirection buys nothing for a single-button "check again".
- **Browser only.** `invalidateAll()` throws `'Cannot call invalidateAll() on the server'` (`client.js:2247`). It must be called from an `onclick`, never during SSR. Fine for `RETRY_AS_GUEST()`.
- **It does not touch the WS stream.** The cached stream store has no `refetch`/`resubscribe` in its public surface (verified: only `subscribe`, `optimistic`, `loadMore`, `hydrate`, `enableHistory`, `undo`, `redo`, `pauseHistory`, `resumeHistory`, `when`). So if the guard already threw, `loadError` stays `FORBIDDEN` forever and the guest sees the `loadError` branch instead of the lobby after a successful retry. **This is why the layout+page must not subscribe while gated** — then the retry's first subscribe succeeds cleanly and, as a bonus, the Connecting screen legitimately shows during that first hydration.

### 6. D-06 — reliable cold-load-only detection. **`streamVal === undefined` already is cold-load-only in this stack — verified against the library, not assumed.** [VERIFIED: svelte-realtime 0.4.6 client.js]

The existing derive is `const loading = $derived(streamVal === undefined)` (`+page.svelte:47`). `store.set(undefined)` appears exactly once in the client, inside `cleanup()` (`client.js:1022-1023`), which runs only when the subscriber refcount drops to zero. On **reconnect** the client takes a different path (`client.js:1068-1071`): `initialLoaded = false; fetching = false; buffer = []; fetchAndSubscribe()` — the store **keeps its last value**. Terminal disconnects surface as `store.set({ error: RpcError('DISCONNECTED' | 'CONNECTION_CLOSED' | 'TIMEOUT') })` (`client.js:834, 864, 870, 1082`).

Consequences:

- `loading` is true **only** before the first value ever arrives. Reconnects, phase transitions (`lobby→drafting→review`), and every `publish` land as either a snapshot or an `{error}` — never `undefined`. **The Connecting screen must render on `loading` only, and never on `loadError`.** That is what keeps it out of the frozen PauseOverlay grace flow, which is driven by `snapshot.draftState.paused` (`DraftBoard.svelte:113-119`) and requires a live snapshot to be present.
- The refcount never reaches zero during a visit, because `+layout.svelte` holds the same cached store (Investigation 4). So no accidental re-entry into `loading` mid-visit.
- The one legitimate re-entry: after a gated guest's retry succeeds, the store is fresh (never subscribed) → `undefined` → the Connecting screen shows once during that first hydration. Correct UX, not a bug.

**Min-display floor (D-05) sizing, measured.** `createTypedLog(CY_CONNECT_LINES, { speed: 7, lineGap: 120 })` takes **2594 ms** to fully type the 248-character buffer (300 ms initial delay + 242 chars × 7 ms + 5 newlines × 120 ms — computed, not estimated). Progress at candidate floors:

| Floor | Text visible |
|-------|--------------|
| 600 ms | line 1 only |
| 750 ms | line 1 + `[ .. ] resolv` |
| **900 ms** | line 1 + `[ .. ] resolving host ............` |
| 1200 ms | lines 1–2 + `[ OK ] tcp` |

D-05's range tops out at 900 ms, which lands mid-line-2 with the `▮` cursor trailing — legible and clearly in-progress. **Recommend 900 ms.** The screen will normally be truncated; that is inherent to a sub-100 ms socket connect and is handled gracefully by the prototype's `{#if !log.done}<span class="cy-chat-cursor">▮</span>{/if}`. Under `prefers-reduced-motion` the log jumps to full text instantly (`cyTypedLog.svelte.js:60,66`) and the floor is the only thing making it readable — exactly D-05's stated rationale.

Implement the floor as a mount-time latch so it is structurally cold-load-only (§Code Examples E4): a `$state` flag flipped by a `setTimeout` in a mount `$effect`, with `showConnecting = loading || (!floorElapsed && !loadError)`. Do **not** derive the floor from snapshot arrival time — that would re-trigger on later transitions.

### 7. Test surface — which specs to extend, which will break, and how the projects split. [VERIFIED: suite executed]

**Corrected baseline.** `npm test` → **24 files passed, 3 skipped; 202 tests passed, 1 skipped, 34 todo (237 total)**. The "130 existing unit tests" in REQUIREMENTS.md line 6 and CONTEXT.md is the **v1.0 figure and is stale** — plans and verification must assert against 202 passing (or simply "suite green"), not 130. Per project: `server` = 16 files / 150 passed / 1 skipped / 26 todo; `client` = 8 files / 52 passed / 8 todo.

**Project routing (`vite.config.js:29-52`)** — the only rule is the filename:

| Project | Include | Exclude | Environment |
|---------|---------|---------|-------------|
| `client` | `src/**/*.svelte.{test,spec}.{js,ts}` | `src/lib/server/**` | Playwright chromium, headless |
| `server` | `src/**/*.{test,spec}.{js,ts}` | `src/**/*.svelte.{test,spec}.{js,ts}` | node |

**Specs to extend:**

| File | Project | What to add | Break risk |
|------|---------|-------------|-----------|
| `src/lib/server/rooms.spec.js` | server | `loadLobbySnapshot` returns `isPublic`; `setRoomVisibility` DB helper (if one is added); `removeGuestSpectators` targets `guest_id IS NOT NULL` | **None.** Uses hand-rolled chainable fake-`db` objects (e.g. `rooms.spec.js:100-134`) and asserts specific keys — an additive `isPublic` breaks nothing. The `loadLobbySnapshot` fake db will need a `is_public` field on its room row fixture |
| `src/live/room.spec.js` | server | `setRoomVisibility` host-assert / non-host FORBIDDEN / publish shape; `lobby` guard refuses a guest on a private lobby room (`env.connect({role:'guest', guestId:'g1'})` + `client.subscribe('room/lobby', code)`); `lobby` guard admits guests when `is_public` or `phase !== 'lobby'`; `cancelRoom` publishes `phase:'cancelled'` + `cancelReason:'host'` | **Medium.** `baseRoom` (line 49-57) has no `is_public` → the guard sees `undefined` (falsy) and would gate guests in every existing guest test. `baseRoom` must gain `is_public: false` and the guest test at line 87-93 must stay unaffected (it exercises `joinTeam`, not `lobby`). The `cancelRoom` test at 160-166 asserts only `clearRoomTimer` + `cancelRoomAsHost` were called — reordering the snapshot load keeps it green, but add the payload assertion |
| `src/routes/draft/[id]/page.server.spec.js` | server | `gated: true` for guest + private + lobby; `gated` falsy for signed-in / public / drafting / review / cancelled | **None.** Already mocks `getRoomByPublicCode` (line 5-7); fixtures gain `is_public`. Note the existing eslint error at `page.server.spec.js:19` (`'phase' is assigned a value but never used`) is pre-existing |
| `src/phase10-screens.spec.js` | server | **Must be edited** — see Investigation 9 | **Guaranteed red without the edit** |
| `src/lib/components/molecules/LobbyHostBar.svelte.spec.js` | client | Toggle renders in the console; calls `onSetVisibility(next)`; reflects `snapshot.isPublic`; host-only | Low. Existing tests pass a `snapshot` prop object — adding `isPublic` to the component's `LobbySnap` typedef and reading it with a safe default keeps them green |

**New spec files (Wave 0):**

| File | Project | Covers |
|------|---------|--------|
| `src/lib/components/molecules/CyConnecting.svelte.spec.js` | client | SCR-01: eyebrow/heading/`cy-dots`, `.cy-loading-log` renders typed text + `▮` while incomplete, meter + `sync…`, D-08 timeout swaps to the red failure line + retry |
| `src/lib/components/molecules/CyGuestGate.svelte.spec.js` | client | ACC-03: `// access: RESTRICTED`, `$ ROOM.ACCESS()`, all four readout lines with `.cy-403` on the 403, code interpolated into `> GET /draft/{code}`, `SIGN_IN_DISCORD()` href, `RETRY_AS_GUEST()` fires the callback, foot note |
| `src/lib/components/molecules/CyCancelled.svelte.spec.js` | client | SCR-02/D-16/D-17/D-18: complete (not typed) log, interpolated code + counts, `.cy-sig`/`.cy-ok` spans, host vs grace first line by `cancelReason`, footer actions |
| `src/phase12-access-screens.spec.js` | server | CSS contract (`.cy-loading{`, `.cy-gate{`, `.cy-cancel{`, both new keyframes, the new reduced-motion block) + `+page.svelte` branch-order source contracts, following the `phase10-screens.spec.js` / `phase11-fixes.spec.js` precedent |

**Why extract the screens into components:** `src/phase11-fixes.spec.js:4-6` documents the constraint explicitly — *"the draft page imports `$live/*` directly, so there is no browser render harness for it."* Inlining all three screens in `+page.svelte` would leave SCR-01/SCR-02/ACC-03 covered by string greps only. Extraction (following `DraftReview.svelte`, `DraftSettingsPanel.svelte`, `LobbyHostBar.svelte`) puts real DOM assertions behind the requirements while `+page.svelte` keeps only the branch wiring, which greps fine.

**Baseline gate warning.** `npm test` is the **only** green command:

| Command | Baseline | Detail |
|---------|----------|--------|
| `npm test` | ✅ green | 202 passed / 1 skipped / 34 todo |
| `npm run lint` | ❌ **red** | `prettier --check .` fails on **19 files under `src/`** — including `src/lib/server/rooms.js`, `src/live/room.js`, `src/app.css`, and `src/lib/server/rooms.spec.js`, i.e. four files this phase edits. `eslint .` reports 207 errors (134 in `.claude/`, 53 in `.cursor/`, **20 in `src/`**) |
| `npm run check` | ❌ **red** | svelte-check: 10 errors / 4 files — `CyShell.svelte.spec.js` (7), `CyShell.svelte` (1), `phase10-screens.spec.js` (1), `phase8-foundation.spec.js` (1) |

Do **not** put `npm run lint` or `npm run check` in a plan's `<automated>` gate — they fail deterministically at baseline. And do **not** run `npm run format`: it would rewrite `rooms.js` / `room.js` / `app.css` wholesale and bury the phase diff. Match surrounding style by hand.

### 8. Design-source verification. **All eight references resolve at the claimed lines; verbatim CSS and copy extracted above.** See §Design Source Verification.

### 9. Phase 10/11 scope guard — exactly what must change. [VERIFIED]

The guard lives at `src/phase10-screens.spec.js:83-93`:

```js
describe('Phase 10 — scope guards (no Phase 12, no radius)', () => {
	it('does not leak Phase 12 selectors into the port', () => {
		expect(css).not.toContain('cy-loading');   // ← line 85
		expect(css).not.toContain('cy-gate');      // ← line 86
		expect(css).not.toContain('cy-cancel');    // ← line 87
	});

	it('DS-04: still contains zero border-radius declarations', () => {
		expect(css).not.toMatch(/border-radius/); // ← line 91 — KEEP BYTE-IDENTICAL
	});
});
```

`css` is `readFileSync('src/app.css', 'utf8')` (line 6). Phase 11's Plan 01 already deleted the four Phase-11 exclusions and retitled the block; the three Phase-12 exclusions and the DS-04 assertion were deliberately retained (`11-01-SUMMARY.md:70,87`, `11-VERIFICATION.md:96`).

**Required change, in the same task that appends the CSS block:** delete lines 85-87 and remove the now-empty `it('does not leak Phase 12 selectors into the port')`. Because `expect: { requireAssertions: true }` is set in `vite.config.js:31`, an `it` left with zero assertions **fails**. Two options:

- **(a) Recommended:** delete the whole `it` and retitle the describe to `'Phase 10 — scope guards (no radius)'`, leaving only the DS-04 test. Net test count −1.
- **(b)** Invert it into a positive Phase-12 presence check — but that duplicates the new `src/phase12-access-screens.spec.js` CSS contract and misplaces Phase-12 assertions in a Phase-10 file. Prefer (a).

Keep the DS-04 `border-radius` assertion byte-identical — the ported blocks contain no `border-radius`, so it stays green (verified against the extracted CSS above).

This is a **guaranteed-red-without-the-edit** dependency: appending `.cy-loading*` to `app.css` breaks `npm test` until the guard is reconciled. Both edits must land in the same task, exactly as Phase 11 Plan 01 handled its equivalent (`11-01-PLAN.md:111`).

## Architecture Patterns

### System Architecture Diagram

```
                        GUEST / PLAYER BROWSER
                                 │
      ┌──────────────────────────┴──────────────────────────┐
      │ (A) HTTP page load                                   │ (B) WebSocket
      ▼                                                      ▼
┌──────────────────────────┐                    ┌──────────────────────────────┐
│ hooks.server.js          │                    │ hooks.ws.js  upgrade()       │
│  guestCookieHandle       │                    │  session? → role:'player'    │
│  handleBetterAuth        │                    │  else     → role:'guest'     │
│  → locals.user | null    │                    │            + guestId         │
└───────────┬──────────────┘                    │  NOTE: any getSession error  │
            ▼                                   │  silently falls back guest   │
┌──────────────────────────────────┐            └───────────────┬──────────────┘
│ draft/[id]/+page.server.js load  │                            ▼
│  getRoomByPublicCode(code)       │            ┌───────────────────────────────┐
│    ├─ null → error(404)          │            │ server.js _executeRpc         │
│    └─ row (incl. is_public)      │            │  ws.subscribe(topic)  ◄─ 2094 │
│  gated = userId==null            │            │  init fn(ctx, code)   ◄─ 2136 │
│          && !row.is_public       │            └───────────────┬───────────────┘
│          && phase==='lobby'      │                            ▼
│  → { room, userId, gated, … }    │            ┌───────────────────────────────┐
└───────────┬──────────────────────┘            │ live/room.js  lobby init      │
            │                                    │  !roomRow → NOT_FOUND        │
            │                                    │  ◄── D-01 GUARD (line 119)   │
            │                                    │   role==='guest' &&          │
            │                                    │   !is_public &&              │
            │                                    │   phase==='lobby'            │
            │                                    │   → throw FORBIDDEN          │
            │                                    │      └► catch @2176 →        │
            │                                    │         ws.unsubscribe ✓     │
            │                                    │  upsertGuestSpectator        │
            │                                    │  → snapshot (+ isPublic)     │
            │                                    └───────────────┬───────────────┘
            ▼                                                    ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│ +layout.svelte    snap = code && !page.data.gated ? fromStore(lobby(code)) …  │
│                   ── SHARED, REFCOUNTED STORE (client.js:398 cache) ──        │
│ CyShell           header · phase tracker (indexOf → -1 for cancelled) · code  │
└───────────────────────────────┬───────────────────────────────────────────────┘
                                ▼   .cy-body
┌───────────────────────────────────────────────────────────────────────────────┐
│ draft/[id]/+page.svelte   ── BRANCH ORDER IS LOAD-BEARING ──                  │
│                                                                               │
│  1. {#if gated}          ← data.gated ∥ loadError.code==='FORBIDDEN'          │
│     └► CyGuestGate         ∥ (isGuest && snap.phase==='lobby'                 │
│        (reads NO streamVal)                && snap.isPublic===false)          │
│                                                                               │
│  2. {:else if snapshot?.phase === 'cancelled'}                                │
│     └► CyCancelled  ← cancelReason: 'host' | 'grace'  (D-18)                  │
│                                                                               │
│  3. {:else if showConnecting}   ← loading ∥ !floorElapsed   (D-05/06)         │
│     └► CyConnecting  createTypedLog(CY_CONNECT_LINES,{speed:7,lineGap:120})   │
│                                                                               │
│  4. {:else if loadError}  → existing error copy (NOT the gate, NOT connecting) │
│  5. {:else if snapshot}   → drafting | review | lobby  (unchanged)            │
└───────────────────────────────────────────────────────────────────────────────┘

                     HOST VISIBILITY FLIP  (ACC-02 / D-11)
LobbyHostBar (Host Console CyModal)
  └─ onSetVisibility(next) ─► setRoomVisibility(code, next)   [live RPC, D-12]
        ├─ role==='player' && id? else UNAUTHORIZED
        ├─ host_user_id === ctx.user.id? else FORBIDDEN
        ├─ UPDATE room SET is_public = next
        ├─ if (!next) removeGuestSpectators(roomId)          ← ejection
        ├─ snap = loadLobbySnapshot(code)                    ← carries isPublic
        └─ publish(topicForRoom(code), 'set', snap)  ──► ALL subscribers
                                                       │
              ejected guest's client receives snap ─────┘
              → branch 1 fires via the snapshot source (SSR did NOT re-run)
              → their read of streamVal stops → createSubscriber tears down WS
```

### Recommended file layout

```
src/
├─ lib/server/db/schema.js                    # + is_public column (D-14)
├─ lib/server/rooms.js                        # loadLobbySnapshot + isPublic (D-13)
│                                             # + setRoomVisibilityAsHost, removeGuestSpectators
├─ live/room.js                               # + D-01 guard in lobby init (~line 119)
│                                             # + setRoomVisibility RPC (D-12)
│                                             # cancelRoom: load-before-cancel + cancelReason
│                                             # disconnectGraceExpired: + cancelReason:'grace'
├─ routes/+layout.svelte                      # gate the lobby subscription on page.data.gated
├─ routes/draft/[id]/+page.server.js          # + gated computation (D-02)
├─ routes/draft/[id]/+page.svelte             # 5-branch chain; drops the // loading room… stub
├─ lib/components/molecules/
│  ├─ CyConnecting.svelte      (+ .svelte.spec.js)   # SCR-01
│  ├─ CyGuestGate.svelte       (+ .svelte.spec.js)   # ACC-03
│  ├─ CyCancelled.svelte       (+ .svelte.spec.js)   # SCR-02
│  ├─ LobbyHostBar.svelte      (spec extended)       # ACC-02 toggle in the console
│  └─ DraftBoard.svelte                              # remove the dead cancelled sub-branch
├─ app.css                                    # append PHASE 12 block + reduced-motion
├─ phase10-screens.spec.js                    # scope-guard reconciliation (Investigation 9)
└─ phase12-access-screens.spec.js             # NEW: CSS + page-branch source contracts
drizzle/
├─ 0002_add_room_is_public.sql                # NEW (verified content)
└─ meta/0002_snapshot.json, meta/_journal.json
```

### Pattern 1: One column read, two callers, zero query changes

**What:** `getRoomByPublicCode` is `db.select().from(room).where(eq(room.public_code, normalized)).limit(1)` — an unqualified select. The new column lands in `roomRow` automatically for both the SSR load and the stream guard.
**When to use:** Whenever a phase adds a `room` column that existing readers need. Do not add a projection.
**Verify:** `rooms.js:84`. Contrast `createRoom`'s explicit `.returning({...})` at `rooms.js:53-58`, which does *not* include the column and does not need to.

### Pattern 2: Additive snapshot field propagates to every phase for free

**What:** `loadDraftSnapshot` calls `loadLobbySnapshot` and returns `{ ...base, draftState, actions }` (`draft.js:48,58`). Adding `isPublic` to `loadLobbySnapshot`'s return object gives it to lobby, drafting, and review snapshots in one edit.
**Anti-pattern:** duplicating the field in `loadDraftSnapshot`.
**Consequence for the gate:** the client-side derive must include `phase === 'lobby'` (it does, per D-03), because `isPublic` is now present in drafting snapshots too and a bare `!isPublic` check would gate ACC-04 guests out of a live draft.

### Pattern 3: Every mutation ends with one broadcast

**What:** `kickMember` / `movePlayer` / `startDraft` / `cancelRoom` all end `const snap = await loadLobbySnapshot(db, code); ctx.publish(topicForRoom(code), 'set', snap); return snap;`. `setRoomVisibility` follows it exactly.
**Why it matters:** the return value hydrates the caller optimistically and the publish updates everyone else. There is no bespoke event type in this codebase — `merge: 'set'` means the whole snapshot replaces the client value.
**Guard:** never publish `null` on this topic (see Investigation 1) — `merge: 'set'` will faithfully set the client store to `null`, and the client's `snapshot` / `loading` / `loadError` derives all evaluate falsy, producing a blank render.

### Pattern 4: Three-source gate derive, one branch

**What:** the gate must fire from SSR (first paint, D-02), from the socket (identity mismatch / direct WS), and from the snapshot (live ejection, D-11). One derive, three sources:

```js
const isGuest = $derived(data.userId == null);

const gated = $derived.by(() => {
	if (data.gated) return true;                                   // D-02 SSR first paint
	if (loadError && loadError.code === 'FORBIDDEN') return true;   // D-01 socket refusal
	if (!isGuest || !snapshot) return false;
	return snapshot.phase === 'lobby' && snapshot.isPublic === false; // D-11 live ejection
});
```

**Critical:** `snapshot.isPublic === false`, never `!snapshot.isPublic` — the strict comparison keeps `undefined` (a snapshot published before the deploy, or a hand-built test fixture) from gating everyone out.

**Branch-order rule:** `{#if gated}` must come **first** in the template, and the gate branch must not read `streamVal`, `snapshot`, `loading`, or `loadError`-derived values, so `createSubscriber` can tear down the WS subscription (see Pattern 5). Because Svelte 5 deriveds are lazy, "does not read" is enforced structurally by what the branch renders. When `data.gated` is true, `gated` short-circuits on the first line without touching `loadError` at all.

### Pattern 5: Do not subscribe while gated (page **and** layout)

**What:** both readers of `lobby(code)` must be conditional.

```svelte
<!-- +layout.svelte -->
const snap = $derived.by(() =>
  code && !page.data.gated ? fromStore(lobby(code)).current : null
);
```

**Why:** the store is cached and refcounted by `path + ':' + code` (`client.js:424-460`), and `fromStore`'s `createSubscriber` only tears down when *no* tracking reaction reads it. Leaving the layout subscribed (a) keeps a gated guest receiving every roster broadcast and (b) poisons the shared store with `{error: FORBIDDEN}` so `invalidateAll()` can never lift the gate (Investigation 5).
**Trade-off:** `page.data.gated` is `undefined` on Home/Login, so `!page.data.gated` is true there — but `code` is `null`, so the existing `code ?` guard already short-circuits. No regression.

### Pattern 6: Load the snapshot before you hide the room

**What:** any operation that sets `ended_at` must capture the snapshot first, because `getRoomByPublicCode` hides those rows.
**Where it already exists:** `room.js:104-108` (`disconnectGraceExpired`), with the reason in a comment.
**Where it is missing:** `room.js:366` (`cancelRoom`). This is the SCR-02 blocker.

### Pattern 7: `resolve()` every navigation target

**What:** the codebase's eslint config enables `svelte/no-navigation-without-resolve`. `+page.svelte:63` already does `resolve('/draft/[id]', { id: code })`.
**Apply to:** the gate's `SIGN_IN_DISCORD()` (`href={resolve('/login') + '?redirect=' + encodeURIComponent(draftPath)}`) and the cancelled screen's `$ NEW_DRAFT()` (`href={resolve('/')}`).
**Why:** there are already 20 eslint errors in `src/` including four `no-navigation-without-resolve` hits; do not add more.

### Anti-Patterns to Avoid

- **Returning a "gated" stub from the stream init instead of throwing.** Leaves the guest subscribed to the topic; `access`/`filter` cannot filter per-event. This is the single most consequential wrong turn available in this phase.
- **`error(403)` in the load.** Renders `+error.svelte`, which has no route back — `RETRY_AS_GUEST()` would need a full reload, re-running the Phase 8 boot animations. Explicitly rejected by D-02, and the platform confirms why.
- **`!snapshot.isPublic` as the gate condition.** Gates every user out whenever the field is absent.
- **Rendering the Connecting screen for `loadError`.** `loadError` is where reconnects and terminal disconnects surface; showing "ESTABLISHING_LINK" there fights the frozen PauseOverlay grace flow that D-06 forbids touching.
- **Publishing `null` on the room topic.** `merge: 'set'` makes it the client's value and every render branch evaluates falsy.
- **Deriving the D-05 floor from snapshot arrival.** Re-triggers on later transitions; use a mount-time latch.
- **Changing `cancelRoomAsHost`'s DB write to `phase: 'cancelled'`.** `rooms.spec.js:190-192` and `room-lifecycle.spec.js` assert `'ended'`; override the phase in the *published payload* instead.
- **`recomputeTeamCaptains` after guest ejection.** Guests are never captains; N extra round-trips on a driver with no interactive transactions.
- **Running `npm run format`.** Would rewrite `rooms.js`, `room.js`, `app.css` and `rooms.spec.js` wholesale (they already fail `prettier --check`), burying the phase diff.
- **Gating on `npm run lint` / `npm run check`.** Both red at baseline.
- **`{@html}` for the readout/log blocks.** `> identity = <guest:anon>` and the arrow glyphs are plain text; Svelte's text interpolation escapes them correctly. `{@html}` here would be a needless XSS surface next to `displayName` data.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Column added with a safe default for existing rows | Hand-written `ALTER TABLE` + manual `UPDATE` back-fill | `drizzle-kit generate` from the schema edit | `DEFAULT false NOT NULL` back-fills in one statement; the generated `meta/0002_snapshot.json` keeps future `generate` runs correct. A hand-written SQL file with no snapshot silently corrupts the next diff |
| Re-running the page load after a state change | `location.reload()`, `goto(url, {invalidateAll:true})` on the same URL, or a manual `fetch('/…/__data.json')` | `invalidateAll()` from `$app/navigation` | Reruns server loads without remounting components (so Phase 8 boot animations stay put). A reload violates D-04 outright |
| Typed terminal log with reduced-motion fallback | New character-timer loop | `createTypedLog(CY_CONNECT_LINES, { speed: 7, lineGap: 120 })` | Phase 9 built this factory *for this screen* (`cyTypedLog.svelte.js:16-17`); `$effect.root` ownership, deterministic `dispose()`, and jump-to-full under `prefers-reduced-motion` are all done |
| Modal shell for the visibility toggle | New dialog/overlay | The shipped `CyModal` inside `LobbyHostBar` (`LobbyHostBar.svelte:113`) | Native `<dialog>` esc/focus-trap/focus-return/`::backdrop`, plus the 640 px takeover, all landed in Phase 11 |
| Host authorization for the new RPC | New permission check | `assertHost(roomRow, userId)` (`rooms.js:128`) + the inline `roomRow.host_user_id !== ctx.user.id` guard the sibling RPCs use, mapped through `mapRoomMutationError` (`room.js:34-60`) | Identical shape to `movePlayer`/`kickMember`; consistent `LiveError` codes for free |
| Discord OAuth entry on the gate | New form/action | Link to `/login?redirect=<draftPath>` — the exact pattern already at `+page.svelte:259` — where `LoginCard.svelte`'s `?/signin` action lives | Avoids cross-route form-action semantics; the Login screen is already Cyber-styled (UI-02) and already handles `redirect` (`login/+page.server.js:8`) |
| Escaping user/room strings in the log + readout | Manual escape helper or `{@html}` | Plain `{expr}` text interpolation | Svelte auto-escapes; `{@html}` would be a regression |
| Broadcasting the visibility flip | Custom event type, per-client push | `ctx.publish(topicForRoom(code), 'set', snap)` | Single established path; `merge: 'set'` replaces the whole client value, so every derived recomputes |
| Copy-to-clipboard for `$ COPY_LOG()` | New clipboard helper | The `copyLink()` + `copied` + `copyTimer` pattern at `+page.svelte:73-86` | Already handles the failure path and the 2 s "// copied" flash |

**Key insight:** every "new" capability in this phase already has a template three or four lines away in the same file. The genuine engineering is not writing code — it is respecting two non-obvious library contracts (subscribe-time-only access control; refcount-cached, non-refetchable stream stores) and one latent bug (the `null` publish on host cancel).

## Runtime State Inventory

This phase adds a DB column and changes a published payload shape, so runtime state matters.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | `room.is_public` — new column. Existing rows back-filled to `false` by `DEFAULT false NOT NULL` in `0002`. **No data migration task needed.** `room_member` guest rows (`guest_id IS NOT NULL`) become deletable in bulk by the new ejection helper — this deletes *live* rows, so it is a behavior change, not a migration | Code + generated migration only |
| **Live service config** | None. No external service (n8n, Datadog, Cloudflare, Tailscale) holds any Phase-12 identifier. The only external service is Neon Postgres, whose schema is fully described by `drizzle/` | None — verified by reading `package.json`, `dockerfile`, `svelte.config.js`, `vite.config.js`; no third-party SaaS integrations exist beyond Discord OAuth (better-auth), which is unaffected |
| **OS-registered state** | None. No Task Scheduler / launchd / systemd / pm2 artifacts. The app's only background timers are in-process (`src/live/draft-timers.js`, a plain `Map` of `setTimeout` handles) and do not survive a restart | None |
| **Secrets / env vars** | No new env var. `DATABASE_URL` (already required by `src/lib/server/db/index.js` and `drizzle.config.js`) is the only variable `db:generate`/`db:migrate` need, and `drizzle-kit` auto-loads the repo `.env` (verified) | None |
| **Build artifacts** | `build/` exists in the repo root (a prior `vite build` output) and will contain a stale bundle after this phase. `.svelte-kit/` is regenerated by `svelte-kit sync` (run by `npm run check` / `prepare`). `src/live/$types.d.ts` is rewritten by the `svelte-realtime` Vite plugin on scan — **adding `setRoomVisibility` will regenerate it**, and it currently fails `prettier --check`, so expect an unavoidable diff there | Rebuild on deploy; expect a regenerated `src/live/$types.d.ts` in the phase diff (do not fight it) |

**Migration-vs-code-edit split:**
- **Migration (data):** `ALTER TABLE room ADD COLUMN is_public boolean DEFAULT false NOT NULL` — one statement, back-fills existing rows. Applied by `npm run db:migrate`.
- **Code edit (how new records are written):** none. `createRoom` (`rooms.js:42-67`) does not set `is_public`, so the column default applies to new rooms too — ACC-01's "defaulting to closed" is satisfied by the constraint alone, at both ends.

**The canonical question — after every file in the repo is updated, what runtime systems still hold the old state?** Answer: only the deployed Postgres database, and only until `npm run db:migrate` runs. There is no cache, no queue, no external registry, and no OS registration carrying Phase-12 state.

## Common Pitfalls

### Pitfall 1: The host-cancel path publishes `null`, so the Cancelled screen never renders

**What goes wrong:** the SIGKILL screen works when tested against the grace path and appears to be broken only for host cancel — the reporter sees a blank page, not an error.
**Why:** `cancelRoomAsHost` sets `ended_at`, `getRoomByPublicCode` then hides the row, `loadLobbySnapshot` returns `null`, and `merge: 'set'` faithfully sets the client value to `null`. `loading` (`=== undefined`), `snapshot`, and `loadError` all evaluate falsy → the `{#if}` chain falls through with no `{:else}`.
**How to avoid:** load the snapshot **before** cancelling and publish `{ ...snapBefore, phase: 'cancelled', cancelReason: 'host' }` (Pattern 6).
**Warning signs:** `room.spec.js:160-166` stays green either way because `loadLobbySnapshot` is mocked — a passing test here is not evidence. Add an explicit assertion on the published payload.

### Pitfall 2: `invalidateAll()` cannot lift a gate the stream guard already applied

**What goes wrong:** `RETRY_AS_GUEST()` runs, `data.gated` flips to `false`, and the guest lands on the **loadError** branch (or a broken half-lobby) instead of the lobby — permanently, until a hard reload.
**Why:** the stream store is cached by `path + ':' + code` with a refcount held by `+layout.svelte`, holds `{error: FORBIDDEN}`, exposes no `refetch`, and `invalidateAll()` only re-runs HTTP loads.
**How to avoid:** never subscribe while gated — gate both the page branch order and `+layout.svelte`'s `fromStore` read on `page.data.gated` (Pattern 5).
**Warning signs:** the retry works on a fresh tab (nothing cached yet) but not in the tab that hit the gate. Any bug that "only reproduces on retry" is this.

### Pitfall 3: `!snapshot.isPublic` gates everyone out

**What goes wrong:** every user, host included, lands on the Guest Gate — or a client running a snapshot published just before the deploy suddenly gates.
**Why:** `undefined` is falsy. Pre-deploy snapshots and hand-built test fixtures lack the field.
**How to avoid:** `snapshot.isPublic === false`. Same discipline for the SSR side: `row.is_public === false` if you want strictness there too (the column is `NOT NULL`, so `=== false` and `!` agree server-side — but the strict form documents intent).
**Warning signs:** the whole app gates immediately after the code lands but before the migration runs. The migration and the reading code must ship together.

### Pitfall 4: The stream guard breaks existing guest tests via a missing fixture field

**What goes wrong:** unrelated tests in `src/live/room.spec.js` start failing with `FORBIDDEN`.
**Why:** `baseRoom` (`room.spec.js:49-57`) has no `is_public`, so the guard reads `undefined` → falsy → gates every guest in the fixture.
**How to avoid:** add `is_public: false` to `baseRoom` and give any guest-admission test an explicit `{ ...baseRoom, is_public: true }` or `phase: 'drafting'`.
**Warning signs:** failures in tests that never mention visibility.

### Pitfall 5: A signed-in user gets refused by the socket while SSR admits them

**What goes wrong:** an authenticated user sees a lobby shell with a `FORBIDDEN` error instead of content.
**Why:** `hooks.ws.js:52-70` wraps `auth.api.getSession` in `try/catch` and **deliberately** falls back to `{ role: 'guest', guestId }` on any error (the `sveltekitCookies` after-hook calls `getRequestEvent()`, which throws outside a Kit request context). So SSR can see `locals.user` while the socket sees a guest.
**How to avoid:** include `loadError?.code === 'FORBIDDEN'` in the `gated` derive (Pattern 4) so the case degrades to the gate — with `SIGN_IN_DISCORD()` and `RETRY_AS_GUEST()` both being useful actions — rather than a dead error line.
**Warning signs:** intermittent, session-refresh-correlated, "works after refresh".

### Pitfall 6: The scope guard makes `npm test` red the moment the CSS lands

**What goes wrong:** the CSS-port task's own gate fails.
**Why:** `src/phase10-screens.spec.js:85-87` asserts `app.css` contains none of `cy-loading` / `cy-gate` / `cy-cancel`.
**How to avoid:** delete those three assertions **and** the now-empty `it` (an assertion-free `it` fails under `expect: { requireAssertions: true }`, `vite.config.js:31`) in the same task. Keep the DS-04 `border-radius` assertion byte-identical.
**Warning signs:** exactly one failing test named "does not leak Phase 12 selectors into the port".

### Pitfall 7: The Connecting screen swallows the reconnect / grace flow

**What goes wrong:** a mid-draft disconnect shows "ESTABLISHING_LINK…" instead of the frozen PauseOverlay grace countdown — a direct violation of D-06's "must not fight it".
**Why:** conflating "no data" with "connection problem". Reconnects arrive as `{error: DISCONNECTED | CONNECTION_CLOSED | TIMEOUT}`, never as `undefined`.
**How to avoid:** render Connecting on `loading` (and the D-05 floor) **only**; keep `loadError` as its own later branch. Placing `{:else if snapshot?.phase === 'cancelled'}` before the connecting branch also prevents a cancelled room from flashing "connecting".
**Warning signs:** the pause card stops appearing after this phase.

### Pitfall 8: `cy-dots` disappears under reduced motion

**What goes wrong:** the heading reads `ESTABLISHING_LINK` with nothing after it.
**Why:** the base rule is `content: ""` and the dots only exist inside the `cy-dots` keyframes; `animation: none` reverts to the empty base.
**How to avoid:** pin `content: "..."` inside the reduced-motion block (§Design Source Verification). `.cy-loading-bar b` needs no equivalent — `animation: none` leaves `clip-path` unset, rendering the full lime bar.
**Warning signs:** only visible with the OS reduced-motion setting on; this vitest-browser provider lacks `page.emulateMedia`, so the assertion must go through the established `app.css?raw` CSS-contract technique (Phase 9 precedent).

### Pitfall 9: New anchors add eslint errors

**What goes wrong:** `src/` eslint errors go from 20 to 22+.
**Why:** `svelte/no-navigation-without-resolve` is enabled; the gate and cancelled screens both add `<a href>`.
**How to avoid:** `resolve('/login')` / `resolve('/')` / `resolve('/draft/[id]', { id: code })` — the page already imports `resolve` from `$app/paths` (line 2) and uses it at line 63.
**Warning signs:** invisible in `npm test` (which is the only gate) — must be checked deliberately with `npx eslint src`.

### Pitfall 10: `DraftBoard`'s cancelled sub-branch becomes unreachable dead code

**What goes wrong:** `.cy-draft-cancelled` and the `cancelledTeam` / `cancelledTeamLabel` derives (`DraftBoard.svelte:75-90, 121-129`) still exist and still carry a `goto('/')` that trips eslint, while the real screen lives elsewhere. Two competing cancelled UIs also risk a double render if the page branch is added without splitting the `drafting || cancelled` condition at `+page.svelte:266`.
**How to avoid:** split that condition to `snapshot.phase === 'drafting'` **and** delete `DraftBoard`'s cancelled branch plus its now-unused derives in the same task.
**Warning signs:** the SIGKILL card renders inside the draft grid, or "Draft cancelled" appears twice.

### Pitfall 11: A gated guest still subscribes to `chatAll`

**What goes wrong:** a guest gated out of a private room can still read the all-channel chat.
**Why:** the chat `$effect` at `+page.svelte:181-192` runs unconditionally on mount, and `chatAll` / `chatSpectators` (`live/chat.js:124-184`) check only team membership, never room privacy.
**How to avoid:** `if (gated) return;` at the top of that effect. Note this is a *client* mitigation; server-side chat privacy for private rooms is outside ACC-01..04 and adjacent to TD-05 — document, do not expand.
**Warning signs:** none in the UI; only visible in the network tab or a direct WS client.

### Pitfall 12: Forgetting `--name` on `drizzle-kit generate`

**What goes wrong:** the migration lands as `0002_<random>_<word>.sql`, so any plan text or verification step naming the file is wrong.
**How to avoid:** `npm run db:generate -- --name add_room_is_public`. Commit `0002_add_room_is_public.sql`, `meta/0002_snapshot.json`, and the updated `meta/_journal.json` together.
**Warning signs:** a migration filename nobody predicted; a later `generate` producing a duplicate `ADD COLUMN` because the snapshot was not committed.

## Code Examples

### E1 — SSR gate (`src/routes/draft/[id]/+page.server.js`)

```js
// Source: pattern derived from the existing load (verified in-repo, lines 8-36)
/** @type {import('@sveltejs/kit').ServerLoad} */
export async function load({ params, locals, url }) {
	const code = parseRoomCode(params.id ?? '');
	const row = await getRoomByPublicCode(db, code);
	if (!row) error(404, { message: 'Room not found' });

	const userId = locals.user?.id ?? null;

	// D-03 predicate. Strict === false documents intent even though the column is NOT NULL.
	const gated = userId == null && row.is_public === false && row.phase === 'lobby';

	if (gated) {
		// Minimal disclosure: the gate readout needs the code, nothing else.
		// Omitting host_user_id also keeps an internal id off a 403 page.
		return { room: { public_code: row.public_code, phase: row.phase }, userId, gated: true, appOrigin: url.origin };
	}

	const base = {
		room: { public_code: row.public_code, phase: row.phase, host_user_id: row.host_user_id },
		userId,
		gated: false,
		appOrigin: url.origin
	};

	if (row.phase === 'review') { /* … unchanged … */ }
	return base;
}
```

Return `gated: false` explicitly on every path so `page.data.gated` is never `undefined` on this route (the layout's `!page.data.gated` guard reads more honestly, and the spec can assert `false` rather than "absent").

### E2 — `setRoomVisibility` live RPC (`src/live/room.js`)

```js
// Source: shaped byte-for-byte on movePlayer (room.js:261-293) — verified in-repo
export const setRoomVisibility = live(async (ctx, publicCode, isPublic) => {
	if (ctx.user?.role !== 'player' || !ctx.user?.id) {
		throw new LiveError('UNAUTHORIZED', 'Sign in required');
	}
	if (typeof isPublic !== 'boolean') {
		throw new LiveError('VALIDATION', 'isPublic must be a boolean');
	}
	const code = normalizePublicCode(publicCode);
	const roomRow = await getRoomByPublicCode(db, code);
	if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');
	if (roomRow.host_user_id !== ctx.user.id) {
		throw new LiveError('FORBIDDEN', 'Host only');
	}
	try {
		await setRoomVisibilityAsHost(db, { roomId: roomRow.id, hostUserId: ctx.user.id, isPublic });
		// D-11: closing the room ejects the lurkers. Guests are never captains and never
		// on a team, so no recomputeTeamCaptains pass is needed.
		if (!isPublic) await removeGuestSpectators(db, roomRow.id);
	} catch (e) {
		const mapped = mapRoomMutationError(e);
		if (mapped) throw mapped;
		throw e;
	}
	const snap = await loadLobbySnapshot(db, code);
	ctx.publish(topicForRoom(code), 'set', snap);
	return snap;
});
```

### E3 — The `lobby` stream guard (`src/live/room.js`, at line 119)

```js
// Source: insertion into the verified existing init handler (room.js:115-123)
const roomRow = await getRoomByPublicCode(db, code);
if (!roomRow) throw new LiveError('NOT_FOUND', 'Room not found');

// ACC-03 / D-01 — the real security boundary. Must precede upsertGuestSpectator so a
// blocked guest never gets a member row. Throwing (not returning a stub) is load-bearing:
// server.js subscribes to the topic at :2094 BEFORE running this handler, and only the
// catch at :2176 → _rollbackStreamSubscribe → ws.unsubscribe(topic) undoes it. A returned
// "gated" payload would leave the guest receiving every future roster broadcast.
if (
	ctx.user?.role === 'guest' &&
	roomRow.is_public === false &&
	roomRow.phase === 'lobby'
) {
	throw new LiveError('FORBIDDEN', 'Room is private');
}

if (ctx.user?.role === 'guest' && ctx.user?.guestId) {
	await upsertGuestSpectator(db, roomRow.id, ctx.user.guestId);
	// … unchanged …
}
```

### E4 — Connecting screen: cold-load latch + D-05 floor + D-08 timeout (`+page.svelte`)

```js
// Source: composed from verified library behavior (svelte-realtime client.js) +
// Svelte 5 runes. streamVal === undefined is cold-load-only in this stack.
const CONNECT_FLOOR_MS = 900;   // D-05 — measured: full type takes 2594ms; 900ms lands mid-line-2
const CONNECT_TIMEOUT_MS = 10_000; // D-08

let floorElapsed = $state(false);
let connectTimedOut = $state(false);

// Mount-only: no reactive reads inside, so this effect runs exactly once. Deriving the
// floor from snapshot arrival instead would re-trigger on later phase transitions.
$effect(() => {
	const t1 = setTimeout(() => { floorElapsed = true; }, CONNECT_FLOOR_MS);
	const t2 = setTimeout(() => { connectTimedOut = true; }, CONNECT_TIMEOUT_MS);
	return () => { clearTimeout(t1); clearTimeout(t2); };
});

// loadError deliberately excluded — reconnects/terminal closes surface there and are
// owned by the frozen PauseOverlay grace flow (D-06).
const showConnecting = $derived(!gated && !loadError && (loading || !floorElapsed));
```

Template order (branch order is load-bearing — §Architecture Patterns P4):

```svelte
{#if gated}
	<CyGuestGate {code} onRetry={() => invalidateAll()} loginHref={signInHref} />
{:else if snapshot && snapshot.phase === 'cancelled'}
	<CyCancelled
		{code}
		reason={snapshot.cancelReason ?? 'grace'}
		players={snapshot.teams.A.length + snapshot.teams.B.length}
		spectators={snapshot.spectators.length}
	/>
{:else if showConnecting}
	<CyConnecting {code} timedOut={connectTimedOut} onRetry={() => invalidateAll()} />
{:else if loadError}
	<!-- existing error copy — NOT the gate, NOT connecting -->
{:else if snapshot}
	<!-- drafting | review | lobby — unchanged, with 'cancelled' removed from the drafting condition -->
{/if}
```

### E5 — Connect log with the real room code (`CyConnecting.svelte`)

```js
// Source: cyber.jsx:646-653 verbatim; line 1 interpolates the real code per D-16's spirit.
// Dot-leader spacing is load-bearing for typed alignment (cyTypedLog.svelte.js:22).
/** @param {string} code */
export function connectLines(code) {
	return [
		`$ ./draftnet connect --room=${code}`,
		'[ .. ] resolving host ..................',
		'[ OK ] tcp handshake ................... 24ms',
		'[ OK ] websocket upgrade ............... 101',
		'[ .. ] subscribing draft channel ......',
		'[ .. ] hydrating snapshot ..............'
	];
}

// in the component:
const log = createTypedLog(connectLines(code), { speed: 7, lineGap: 120 });
// … and remember log.stop() in an $effect teardown (the factory owns an $effect.root)
```

### E6 — Stream-guard spec (`src/live/room.spec.js`)

```js
// Source: harness pattern verified in-repo at room.spec.js:81-94 and 229-257
it('lobby stream refuses a guest on a private lobby room (ACC-03)', async () => {
	vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(
		/** @type {any} */ ({ ...baseRoom, is_public: false, phase: 'lobby' })
	);
	env.register('room', roomModule);
	const client = env.connect({ role: 'guest', guestId: 'g1' });
	const stream = client.subscribe('room/lobby', 'abc1234');
	const val = await stream.waitFor((v) => v !== undefined);
	expect(val.error.code).toBe('FORBIDDEN');
	expect(rooms.upsertGuestSpectator).not.toHaveBeenCalled(); // guard precedes the upsert
});

it('lobby stream admits a guest once the room is public (ACC-04)', async () => {
	vi.mocked(rooms.getRoomByPublicCode).mockResolvedValue(
		/** @type {any} */ ({ ...baseRoom, is_public: true })
	);
	// …
});
```

`upsertGuestSpectator` is not currently in the `vi.mock` factory at `room.spec.js:9-23` — add it there to assert the ordering.

### E7 — Guest ejection helper (`src/lib/server/rooms.js`)

```js
// Source: mirrors kickMember's delete (rooms.js:355-358) and upsertGuestSpectator's
// guest-row shape (rooms.js:215-227). isNotNull is already imported at rooms.js:1.
/**
 * D-11: flipping a room private removes every guest spectator row.
 * Keyed on guest_id (NOT team IS NULL) so signed-in spectators survive.
 * Guests are never captains and never on a team → no recomputeTeamCaptains pass.
 *
 * @param {any} db
 * @param {string} roomId
 */
export async function removeGuestSpectators(db, roomId) {
	await db
		.delete(room_member)
		.where(and(eq(room_member.room_id, roomId), isNotNull(room_member.guest_id)));
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `phase === 'cancelled'` handled inside `DraftBoard` (`.cy-draft-cancelled`, grace-specific copy, `goto('/')`) | Its own top-level branch in `+page.svelte` rendering `.cy-cancel` for both paths | This phase (D-15) | `DraftBoard`'s cancelled branch and its `cancelledTeam` / `cancelledTeamLabel` derives become dead code and must be deleted (Pitfall 10) |
| `+page.svelte:266` condition `phase === 'drafting' \|\| phase === 'cancelled'` | `phase === 'drafting'` only | This phase | The `||` was Phase 10's placeholder while the SIGKILL reskin was deferred (`10-05-SUMMARY.md:42,126`) |
| `<p class="cy-foot">// loading room…</p>` placeholder | `.cy-loading` Connecting screen | This phase (D-09) | The `loading` derive itself is unchanged; only what it renders changes |
| `loadError` + `isGuest` → "Sign in to join this draft" text fallback (`+page.svelte:256-264`) | Superseded by the Guest Gate for `FORBIDDEN`; retained for other error codes | This phase | The `loadError` branch moves *after* gate and connecting in the chain |
| Guests unconditionally upserted as spectators on every room (`room.js:119`) | Gated on room visibility for pre-draft rooms | This phase (ACC-03) | First real authorization boundary in the realtime layer |
| Host bar carried CANCEL_ROOM and inline move/kick | Host Console `CyModal` owns all room management | Phase 11 (D-01/D-03) | The visibility toggle joins that modal (D-10) rather than the bar |
| Tailwind utility classes | Plain CSS under `.cy-app` | Phase 8 (DS-03) | Never introduce Tailwind classes; `.cy-*` only |
| `startDraftIfReady` | `startDraftWithSettings` | Phase 5 | `startDraftIfReady` is dead code (TD-03) — do not extend it |

**Deprecated / outdated — do not trust:**
- **`.planning/codebase/ARCHITECTURE.md`** — dated 2026-04-03, pre-realtime. Claims svelte-realtime is unused and the draft route is a static shell. Both false. CONTEXT flags this; confirmed.
- **`.planning/codebase/CONVENTIONS.md:33`** — lists `prettier-plugin-tailwindcss` and a Tailwind stylesheet in `.prettierrc`. Tailwind was removed in Phase 8 (DS-03).
- **`.planning/codebase/TESTING.md:116-118`** — "no `vi.mock` usage in current tests". False: `room.spec.js`, `page.server.spec.js`, and `chat.spec.js` all use `vi.mock` extensively. The project-routing table in that doc (lines 53-72) *is* accurate.
- **"130 existing unit tests"** (REQUIREMENTS.md:6, ROADMAP success criterion 5, CONTEXT.md) — stale v1.0 figure. Actual: 202 passing / 237 total.

## Project Constraints (from CLAUDE.md)

- **Language:** JavaScript with JSDoc (`checkJs` via `jsconfig.json`) — no `.ts` source. New components use `/** @type {{ … }} */ let { … } = $props()` typedefs, matching `LobbyHostBar.svelte:11-34`.
- **Package manager:** npm. Zero new dependencies this phase.
- **Add-ons in play:** prettier, eslint, vitest, sveltekit-adapter, devtools-json, **drizzle**, **better-auth**, mcp. (`tailwindcss` is listed in CLAUDE.md but was removed in Phase 8 per DS-03 — CLAUDE.md is stale on that point; do **not** reintroduce it.)
- **Svelte MCP server is mandated** for Svelte 5 / SvelteKit questions and `svelte-autofixer` before finalizing Svelte code. **The MCP tools were not exposed to this research agent** (agent `tools:` restriction, upstream anthropics/claude-code#13898); all Svelte/Kit claims here were verified against the **installed source** in `node_modules/@sveltejs/kit` and `node_modules/svelte` plus official svelte.dev docs, which is at least as authoritative for this repo's pinned versions. **Planner: instruct executors to run `svelte-autofixer` on every new/modified `.svelte` file** — the tool is available in the main session.
- **`playground-link` must never be used** for code written into the project.
- **Formatting/linting:** prettier (tabs, single quotes, `trailingComma: none`, `printWidth: 100`) + eslint flat config. **Both are red at baseline** (§Resolved Investigation 7) — match surrounding style by hand; never run `npm run format` repo-wide.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 900 ms is the right D-05 floor (top of the stated 600–900 ms range; measured to land mid-line-2 of a 2594 ms full type) | Investigation 6, E4 | Cosmetic and explicitly discretionary; one-constant change |
| A2 | `cancelReason: 'host' \| 'grace'` is the right shape for D-18's signal (vs. e.g. `cancelledBy`) | Investigation 1 | Naming only; the mechanism (publish-time additive field, zero migration) is verified |
| A3 | Pinning `content: "..."` for `.cy-dots::after` under reduced motion is preferable to letting the dots vanish | Design Source Verification, Pitfall 8 | Cosmetic; the prototype specifies no reduced-motion behavior at all |
| A4 | A plain `<a href={resolve('/login') + '?redirect=…'}>` is the right `SIGN_IN_DISCORD()` implementation (vs. a cross-route POST to `/login?/signin`). The link pattern is verified in-repo at `+page.svelte:259`; the cross-route form-action variant was **not** tested this session | Don't Hand-Roll, Pattern 7 | If a one-click OAuth start is required instead of a Login-screen hop, the form-action variant needs verifying. UX preference, not correctness |
| A5 | Extracting the three screens into `src/lib/components/molecules/Cy{Connecting,GuestGate,Cancelled}.svelte` is the right structure (vs. a new `screens/` folder) | Architecture Patterns, Investigation 7 | Directory choice only; `molecules/` matches every existing composite (`DraftReview`, `LobbyHostBar`, `PauseOverlay`) |
| A6 | Gating the chat `$effect` on `gated` is sufficient mitigation for the chat-stream leak, and server-side chat privacy is out of scope | Investigation 4, Pitfall 11 | If the user considers chat leakage in-scope for ACC-03, a room-privacy guard is needed in `chatAll`/`chatSpectators` — a 6th realtime touch point |
| A7 | Omitting `host_user_id` from the gated load payload is desirable minimal-disclosure | E1 | If any consumer needs it while gated, restore it; `isHost` is already `false` for a null `userId` either way |
| A8 | `vitest` `env.connect({ role: 'guest', guestId })` + `stream.waitFor` surfaces the guard's `LiveError` as `{ error: { code } }` in the test harness, matching the browser client | E6 | The harness pattern is verified in-repo for `client.call` (`room.spec.js:87-93`) and for `client.subscribe` (`229-257`), but not for a *throwing* subscribe. If the shape differs, assert via `.catch()` on the subscribe promise instead |

## Open Questions

1. **Should flipping the toggle back to public re-admit the ejected guests automatically?**
   - What we know: their `room_member` rows were deleted; their WS subscription was torn down (with Pattern 5 in place) or holds `{error: FORBIDDEN}` (without it).
   - What's unclear: whether ACC-02's "flipping the room public/private live" implies live *re-*admission, or only that the flag flips live.
   - Recommendation: no automatic re-admission. The ejected guest sees the gate with a working `RETRY_AS_GUEST()`, which is exactly what D-04 designed that button for. Their spectator row is recreated by `upsertGuestSpectator` on the successful re-subscribe. Document as intended behavior.

2. **Does the toggle lock once the draft has started?** (explicitly Claude's discretion, D-10)
   - What we know: the gate predicate only applies in `phase === 'lobby'`, so post-start the flag has no effect on access. The Host Console launcher itself is already gated on `snapshot.phase === 'lobby'` (`LobbyHostBar.svelte:85`), so the toggle is unreachable mid-draft anyway.
   - Recommendation: no extra lock needed — the existing lobby-phase gate on the launcher already achieves it. Optionally add `disabled={snapshot.phase !== 'lobby'}` on the control for defence in depth, matching the `EXEC` button's pattern at `LobbyHostBar.svelte:140`.

3. **Should `data.room` carry `is_public` for first paint?** (explicitly Claude's discretion)
   - What we know: D-13 covers it via the snapshot, which arrives within one round-trip. The host bar renders inside `{#if snapshot}` already, so there is no pre-snapshot paint of the toggle.
   - Recommendation: **no** — adding it to `data.room` creates a second source of truth for the same bit with no consumer. Skip.

4. **Does the CyShell phase tracker need anything special on the gate / cancelled screens?** (explicitly Claude's discretion)
   - What we know: `idx = TRACKER.indexOf(phase)` → `-1` for `'cancelled'`, which Phase 8 D-07 already handles ("no active step, no crash"). With Pattern 5 in place a gated guest has no snapshot, so `phase` falls back to `'lobby'` (`+layout.svelte:19-21`) — which is exactly what the prototype does (`CYGuestGate` renders `<CYChrome phase="lobby">`).
   - Recommendation: **zero changes.** Both screens already look correct by construction.

5. **Should `$ COPY_LOG()` be kept?** (explicitly Claude's discretion)
   - Recommendation: keep both footer actions. `$ NEW_DRAFT()` is a one-line `<a href={resolve('/')}>`; `$ COPY_LOG()` reuses the verified `copyLink()` + `copied` + `copyTimer` pattern (`+page.svelte:73-86`) against the assembled log string. Both are cheap and prototype-faithful.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node / npm | build, tests, drizzle-kit | ✓ | per repo | — |
| `drizzle-kit` CLI | `db:generate` for `0002` | ✓ (executed this session) | 0.31.8 | — |
| `DATABASE_URL` | `drizzle.config.js` load (throws if unset); `db:migrate` | ✓ (`.env` present; auto-loaded by drizzle-kit — probed with `env -u DATABASE_URL`) | — | — |
| Live Neon Postgres | `npm run db:migrate` to apply `0002` | ✓ assumed reachable (URL configured; not connected to this session) | — | `generate` alone needs no DB; the plan can produce and commit the migration without applying it |
| Playwright chromium | `client` vitest project | ✓ (52 browser tests pass) | playwright 1.58.2 | — |
| svelte / kit / vitest / vitest-browser-svelte | everything | ✓ | 5.51.0 / 2.50.2 / 4.1.0 / 2.0.2 | — |
| Svelte MCP server | CLAUDE.md-mandated docs + `svelte-autofixer` | ✗ **in this research agent** (tool restriction); ✓ in the main session | — | Verified against installed `node_modules` source + svelte.dev docs; executors must still run `svelte-autofixer` |
| Brave / Exa / Firecrawl | web research | ✗ (all `false` in `.planning/config.json`) | — | Built-in WebFetch used; needed only for the one `invalidateAll()` docs check |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** the Svelte MCP server (see above — mitigated by reading pinned installed source, which is strictly more authoritative for this repo).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 — two projects: `server` (node) and `client` (browser via `@vitest/browser-playwright`, chromium headless) |
| Config file | `vite.config.js` (`test.projects`, lines 29-52); `expect: { requireAssertions: true }` at line 31 |
| Quick run command | `npx vitest run <path/to/spec>` (project auto-selected by filename: `*.svelte.spec.js` → `client`, everything else → `server`) |
| Full suite command | `npm test` |
| **Baseline** | **202 passed / 1 skipped / 34 todo across 24 files** (server 150, client 52). NOT 130 — that figure is stale |
| **Do NOT gate on** | `npm run lint` (19 src prettier failures, 20 src eslint errors) and `npm run check` (10 svelte-check errors in 4 files) — both **red at baseline** |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ACC-01 | `0002` migration adds `is_public boolean DEFAULT false NOT NULL`; schema exports the column | unit (node, source/SQL contract) | `npx vitest run src/phase12-access-screens.spec.js` | ❌ Wave 0 |
| ACC-01 | `loadLobbySnapshot` returns `isPublic` from the room row | unit (node, fake db) | `npx vitest run src/lib/server/rooms.spec.js` | ✅ extend |
| ACC-02 | `setRoomVisibility`: guest → UNAUTHORIZED; non-host → FORBIDDEN; host → column write + publish of a snapshot carrying `isPublic` | unit (node, `createTestEnv`) | `npx vitest run src/live/room.spec.js` | ✅ extend (**add `is_public: false` to `baseRoom`** — Pitfall 4) |
| ACC-02 | `removeGuestSpectators` targets `guest_id IS NOT NULL` and is called only when `isPublic === false` | unit (node) | `npx vitest run src/lib/server/rooms.spec.js` + `src/live/room.spec.js` | ✅ extend |
| ACC-02 | Toggle renders in the Host Console, reflects `snapshot.isPublic`, fires `onSetVisibility(next)`, host-only | browser | `npx vitest run src/lib/components/molecules/LobbyHostBar.svelte.spec.js` | ✅ extend |
| ACC-03 | SSR returns `gated: true` for guest + `is_public:false` + `phase:'lobby'` | unit (node) | `npx vitest run "src/routes/draft/[id]/page.server.spec.js"` | ✅ extend |
| ACC-03 | Stream guard throws `FORBIDDEN` **before** `upsertGuestSpectator` | unit (node, `createTestEnv` guest subscribe) | `npx vitest run src/live/room.spec.js` | ✅ extend (add `upsertGuestSpectator` to the `vi.mock` factory) |
| ACC-03 | Gate renders all four readout lines, `.cy-403` on the 403 line, code interpolated, both actions | browser | `npx vitest run src/lib/components/molecules/CyGuestGate.svelte.spec.js` | ❌ Wave 0 |
| ACC-03 | `+page.svelte` branch order: gate first; gate branch reads no `streamVal`; `+layout.svelte` gates its subscription on `page.data.gated` | unit (node, source contract) | `npx vitest run src/phase12-access-screens.spec.js` | ❌ Wave 0 |
| ACC-04 | Not gated when signed in / `is_public:true` / `phase:'drafting'` / `'review'` / `'cancelled'` — both SSR and stream | unit (node) | `npx vitest run "src/routes/draft/[id]/page.server.spec.js" && npx vitest run src/live/room.spec.js` | ✅ extend |
| SCR-01 | Connecting card: eyebrow, `ESTABLISHING_LINK` + `.cy-dots`, `.cy-loading-log` text + `▮` while incomplete, meter + `sync…` | browser | `npx vitest run src/lib/components/molecules/CyConnecting.svelte.spec.js` | ❌ Wave 0 |
| SCR-01 | D-08 timeout swaps the log tail to a red failure line + retry action | browser (`timedOut` prop) | same spec | ❌ Wave 0 |
| SCR-01 | Connecting renders on `loading`/floor only, never on `loadError` (PauseOverlay non-interference, D-06) | unit (node, source contract on the derive + branch order) | `npx vitest run src/phase12-access-screens.spec.js` | ❌ Wave 0 |
| SCR-02 | `cancelRoom` publishes `{...snapBefore, phase:'cancelled', cancelReason:'host'}` — **not `null`** — and loads the snapshot before `cancelRoomAsHost` | unit (node) | `npx vitest run src/live/room.spec.js` | ✅ extend (existing test at 160-166 stays green; add the payload assertion) |
| SCR-02 | Grace path publish carries `cancelReason:'grace'` | unit (node) | `npx vitest run src/live/room.spec.js` | ✅ extend |
| SCR-02 | Cancelled card: complete (not typed) log, interpolated code + counts, `.cy-sig`/`.cy-ok`, host vs grace first line, both footer actions | browser | `npx vitest run src/lib/components/molecules/CyCancelled.svelte.spec.js` | ❌ Wave 0 |
| SCR-02 | `+page.svelte` drafting condition no longer includes `'cancelled'`; `DraftBoard` cancelled branch deleted | unit (node, source contract) | `npx vitest run src/phase12-access-screens.spec.js` | ❌ Wave 0 |
| D-07 | CSS ported verbatim (all `.cy-loading*`/`.cy-gate*`/`.cy-cancel*` anchors + `cy-dots` + `cy-fill` keyframes); new reduced-motion block suppresses both | unit (node, `app.css` contract) | `npx vitest run src/phase12-access-screens.spec.js` | ❌ Wave 0 |
| Scope guard | `phase10-screens.spec.js` no longer excludes `cy-loading`/`cy-gate`/`cy-cancel`; DS-04 `border-radius` assertion byte-identical | unit (node) | `npx vitest run src/phase10-screens.spec.js` | ✅ **mandatory edit** — red without it |
| Frozen constraint | Whole suite green; snapshot shape only gains additive keys | unit (existing) | `npm test` | ✅ |

Manual-only (deferred to `/gsd:verify-work` human UAT, consistent with Phases 9-11): live two-browser ejection on flip-to-private; visual reduced-motion appearance of the dots/meter; the real-socket feel of the 900 ms floor; and the post-cancel 404-on-refresh behavior (§Investigation 1) as an accepted limitation.

### Sampling Rate

- **Per task commit:** `npx vitest run <touched spec files>`
- **Per wave merge:** `npm test` (full suite, both projects). Optionally `npx eslint src` compared against the 20-error baseline — never as a pass/fail gate.
- **Phase gate:** `npm test` fully green with ≥ 202 passing before `/gsd:verify-work`.

### Wave 0 Gaps

- [ ] `src/phase12-access-screens.spec.js` — CSS contract (`.cy-loading{`, `.cy-gate{`, `.cy-cancel{`, `@keyframes cy-dots`, `@keyframes cy-fill`, reduced-motion block) + `+page.svelte`/`+layout.svelte` source contracts (branch order, gate-first, no `'cancelled'` in the drafting condition, layout subscription gated) — covers SCR-01/SCR-02/ACC-03/D-07
- [ ] `src/lib/components/molecules/CyConnecting.svelte.spec.js` — SCR-01
- [ ] `src/lib/components/molecules/CyGuestGate.svelte.spec.js` — ACC-03
- [ ] `src/lib/components/molecules/CyCancelled.svelte.spec.js` — SCR-02, D-16/17/18
- [ ] Extend `src/live/room.spec.js` — guard, `setRoomVisibility`, `cancelRoom` payload, `cancelReason`; **add `is_public: false` to `baseRoom` and `upsertGuestSpectator` to the `vi.mock` factory**
- [ ] Extend `src/lib/server/rooms.spec.js` — `isPublic` in the snapshot, `setRoomVisibilityAsHost`, `removeGuestSpectators`
- [ ] Extend `src/routes/draft/[id]/page.server.spec.js` — `gated` matrix across guest/auth × public/private × lobby/drafting/review
- [ ] Extend `src/lib/components/molecules/LobbyHostBar.svelte.spec.js` — the toggle
- [ ] Edit `src/phase10-screens.spec.js` — scope-guard reconciliation (must land in the same task as the CSS append)
- Framework install: none needed

## Security Domain

This is the **first phase in v2.0 that introduces a real authorization boundary.** `security_enforcement` treated as enabled (absent from `.planning/config.json`).

### The two-layer model, and how a naive implementation leaks a private room

| Layer | Purpose | Bypassable? | Failure mode if it is the only layer |
|-------|---------|-------------|--------------------------------------|
| SSR `load` → `gated: true` | UX: no lobby flash, no wasted socket, `RETRY_AS_GUEST()` stays on-page | **Yes, trivially.** A client can open the WebSocket directly (`/ws`) and call `room/lobby` without ever fetching the page | Full roster disclosure to any scripted client. **SSR alone is not access control** |
| `lobby` stream init guard → `throw LiveError('FORBIDDEN')` | The actual boundary | No — this is the only path to the data | Lobby flash before the gate renders; a socket opened for nothing. Cosmetic, not a disclosure |

**Six concrete ways a naive implementation leaks a private room** — each one verified against library source, not hypothesised:

1. **Guard returns a "gated" payload instead of throwing.** `ws.subscribe(topic)` runs at `server.js:2094`, *before* the init handler at `:2136`. Only the `catch` at `:2176` → `_rollbackStreamSubscribe` → `ws.unsubscribe(topic)` (`:196-197`) undoes it. A normal return leaves the guest subscribed and receiving **every subsequent `publish`** — full rosters, on every join/kick/move. **This is the highest-severity wrong turn available in this phase.**
2. **Relying on `access:` / `filter:` for the gate.** Both are subscribe-time-only, synchronous, receive no room code (`server.d.ts:95-105`, `server.js:376`) — they cannot express this predicate, and there is **no per-event filtering** on this stream. Any design that assumes per-broadcast filtering is wrong.
3. **Guard placed after `upsertGuestSpectator`.** Creates the `room_member` row before refusing — the guest then appears in the spectators strip of a private room on every other client, and (via the publish at `room.js:122`) triggers a broadcast. Persistent state from a refused request.
4. **`+layout.svelte` keeps subscribing while the page is gated.** The store is shared and refcounted (`client.js:398-460`), so the layout alone holds the subscription open for a gated guest — every roster broadcast still reaches their browser, even though the UI shows a 403. **This is the leak that survives an otherwise-correct implementation** and is the reason the layout must be gated (Pattern 5).
5. **Ejection without deleting the member rows.** Flipping to private while leaving `room_member` guest rows in place means the guest is still a spectator server-side; a reconnect (or a `phase` change to `drafting`) re-admits them, and they remain visible in every snapshot.
6. **Chat streams.** `chatAll` / `chatSpectators` (`live/chat.js:124-184`) have no room-privacy check, and `+page.svelte:181` subscribes unconditionally on mount. A gated guest reads all-channel chat for a private room. Pre-existing behavior, not a Phase-12 regression, but it means "private room" is only as private as ACC-01..04 defines it. Mitigate client-side; document the server-side residual (§A6).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (unchanged) | better-auth Discord OAuth; `hooks.server.js` + `hooks.ws.js`. This phase adds no auth surface. Note the deliberate guest fallback on `getSession` error (`hooks.ws.js:52-70`) is an availability trade-off, not an auth weakness — a guest role grants strictly less than a player role |
| V3 Session Management | no (unchanged) | better-auth sessions; the `draft_guest` httpOnly/sameSite=lax cookie for stable guest identity (`hooks.server.js:6-21`) |
| V4 Access Control | **yes — primary** | Server-side predicate at the stream boundary, evaluated per subscribe against DB truth (`is_public`, `phase`, `role`). Host-only mutation via `roomRow.host_user_id !== ctx.user.id` → `LiveError('FORBIDDEN')`, identical to the four sibling RPCs. **Never rely on the SSR flag or `{#if isHost}` as enforcement** — both are UX |
| V5 Input Validation | yes | `setRoomVisibility` must reject non-boolean payloads with `LiveError('VALIDATION')` — the codebase pattern (`startDraft`'s `timerMs`/`script` checks at `room.js:306-330`). `publicCode` goes through the existing `parseRoomCode`. No new free-text input |
| V6 Cryptography | no | None introduced. `crypto.randomUUID()` for guest ids is existing and appropriate |
| V7 Error Handling / Logging | yes (minor) | Use `LiveError` with generic messages (`'Room is private'`); non-`LiveError` throws are already collapsed to `INTERNAL_ERROR` by the library (`server.js:2195`) so no stack leaks to clients. Do not include `host_user_id` or member lists in error payloads |
| V8 Data Protection | yes (minor) | Minimal disclosure on the gated SSR payload: return `public_code` (needed by the readout) and `phase`; omit `host_user_id` (§E1) |

### Known Threat Patterns for SvelteKit + svelte-realtime + Drizzle/Neon

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Direct WebSocket subscribe bypassing SSR | Information disclosure | The stream-init guard (throwing) — the only real boundary. **Not optional** (D-01) |
| Topic subscription surviving a refused init | Information disclosure | Verified handled by the library's `_rollbackStreamSubscribe` — **only on `throw`** |
| Broadcast to a subscriber who has since lost access | Information disclosure | No server-side revoke exists; mitigate by deleting the member rows *and* dropping the client-side subscription (Pattern 5) |
| Non-host calling `setRoomVisibility` from the console | Elevation of privilege | Server-side `host_user_id` comparison → `FORBIDDEN`, before any DB write |
| SQL injection via room code / payload | Tampering | Drizzle parameterized builders throughout; `parseRoomCode` normalizes the code. No raw SQL added (the only `sql` template in `rooms.js:259` is a pre-existing parameterized `IS DISTINCT FROM`) |
| Mass assignment on the new column | Tampering | `setRoomVisibilityAsHost` writes exactly `{ is_public, updated_at }` — never spread a client payload into `.set()` |
| XSS via `displayName` / room code in the gate or SIGKILL log | Tampering | Svelte text interpolation auto-escapes. **No `{@html}`** — the readout's literal `<guest:anon>` and the `→` glyph are plain text |
| Guest-row accumulation on private rooms | DoS (minor) | The ejection delete bounds it for private rooms; the broader review-phase accumulation is TD-05, explicitly out of scope |
| Enumeration of private room codes | Information disclosure | Unchanged: a private pre-draft room returns the same 403 gate whether or not the visitor guessed a real code — but a **non-existent** code returns 404 while a real private one returns the gate, which is a code-existence oracle. Pre-existing shape (`error(404)` at `+page.server.js:12`); the 7-char code space over a 54-char alphabet (`rooms.js:10-12`) makes enumeration impractical. Note, do not expand |

## Sources

### Primary (HIGH confidence)

**Installed library source (authoritative for this repo's pinned versions):**
- `node_modules/svelte-realtime/server.js` — `_executeRpc` stream path (2060-2226): `ws.subscribe` at 2094 vs init at 2136; `_rollbackStreamSubscribe` at 195-215; `filterFn = access || filter` at 376
- `node_modules/svelte-realtime/server.d.ts` — `StreamOptions.access`/`filter` "checked once when a client subscribes" (95-105); `LiveContext` surface (22-40)
- `node_modules/svelte-realtime/client.js` — stream store cache by `path + ':' + args` (398-482); `reject` → `store.set({error})` (969-974); reconnect path keeps last value (1064-1073); `store.set(undefined)` only in `cleanup()` (1019-1023); public store methods (1035-1360)
- `node_modules/@sveltejs/kit/src/runtime/client/client.js` — `invalidateAll()` (2245-2251), browser-only throw
- `node_modules/@sveltejs/kit/src/exports/public.d.ts` — `invalidate`/`invalidateAll` docs (3044-3064); `depends` (1109); `Page.data` (1439)
- `node_modules/svelte/src/store/index-client.js` — `fromStore` via `createSubscriber` + `effect_tracking()`
- `node_modules/svelte/src/reactivity/create-subscriber.js` — teardown when the last tracking reaction stops reading

**Codebase reads (full):** `src/live/room.js`, `src/lib/server/rooms.js`, `src/lib/server/room-lifecycle.js`, `src/lib/server/db/schema.js`, `src/lib/server/draft.js` (`loadDraftSnapshot`), `src/routes/draft/[id]/+page.server.js`, `src/routes/draft/[id]/+page.svelte`, `src/routes/+layout.svelte`, `src/lib/components/chrome/CyShell.svelte`, `src/lib/components/molecules/LobbyHostBar.svelte`, `src/lib/components/molecules/DraftBoard.svelte`, `src/lib/components/molecules/LoginCard.svelte`, `src/lib/components/effects/cyTypedLog.svelte.js`, `src/hooks.ws.js`, `src/hooks.server.js`, `src/routes/login/+page.server.js`, `src/live/chat.js`, `src/app.css`, `vite.config.js`, `drizzle.config.js`, `package.json`, `drizzle/0000_omniscient_pixie.sql`, `drizzle/0001_milky_selene.sql`, `drizzle/meta/_journal.json`
**Spec reads:** `src/live/room.spec.js`, `src/lib/server/rooms.spec.js`, `src/routes/draft/[id]/page.server.spec.js`, `src/phase10-screens.spec.js`, `src/phase11-fixes.spec.js`, `src/phase8-foundation.spec.js`

**Commands executed this session:**
- `npm test` → 24 files / 202 passed / 1 skipped / 34 todo; `npx vitest --run --project server` → 150 passed; `--project client` → 52 passed
- `npm run lint` → red (19 src prettier failures); `npx eslint src` → 20 errors; `npm run check` → 10 errors / 4 files
- `npx drizzle-kit generate --config <scratch> --name add_room_is_public` against a copied schema + copied `drizzle/` → verified `ALTER TABLE "room" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;`, `meta/0002_snapshot.json` column entry, journal `idx: 2`. All scratch artifacts removed (`git status` clean)
- `npx drizzle-kit generate` with `env -u DATABASE_URL` → succeeded, proving `.env` auto-loading
- `node` timing computation of `createTypedLog(CY_CONNECT_LINES, {speed:7, lineGap:120})` → 248 chars / 2594 ms, with per-floor progress

**Design source:** `design_handoff_pickban_cyber/prototype/variants/cyber.css` (460-529 read in full) and `cyber.jsx` (630-740 read in full)
**Planning docs:** `.planning/phases/12-access-control-secondary-screens/12-CONTEXT.md` (+ `12-DISCUSSION-LOG.md`), `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/config.json`, `.planning/phases/11-terminal-modals/{11-RESEARCH,11-VALIDATION,11-VERIFICATION,11-01-PLAN,11-01-SUMMARY}.md`, `.planning/phases/10-core-screen-reskins/{10-UI-SPEC,10-01-PLAN,10-05-PLAN,10-05-SUMMARY,10-VERIFICATION}.md`, `.planning/codebase/{CONVENTIONS,TESTING}.md`, `CLAUDE.md`, `AGENTS.md`

### Secondary (MEDIUM confidence)

- svelte.dev/docs/kit/load#Rerunning-load-functions — `invalidateAll()` reruns server loads; components are not remounted, only data updates. Corroborates the JSDoc read from installed source

### Tertiary (LOW confidence)

- Cross-route `POST` to `/login?/signin&redirect=…` as the `SIGN_IN_DISCORD()` implementation — **not verified this session** (§A4). The in-repo `<a href="/login?redirect=…">` pattern is verified and recommended instead
- The 3 skipped test files were not individually identified (they contribute 0 passing tests and are irrelevant to the phase gate)

## Metadata

**Confidence breakdown:**
- **Standard stack:** HIGH — zero new dependencies; every version read from `package.json`/`node_modules`
- **Migration mechanics (D-14):** HIGH — the exact SQL, snapshot entry, journal entry, and `.env` auto-loading were produced by executing `drizzle-kit` in a scratch directory
- **Library contracts (subscribe-time access, store caching, rollback-on-throw, no refetch):** HIGH — read from installed `svelte-realtime` 0.4.6 source with line numbers, not from docs or memory
- **The `null`-publish bug on host cancel (D-18/SCR-02):** HIGH — traced through `cancelRoomAsHost` → `shouldHideRoomFromPublic` → `loadLobbySnapshot` → `publish` → the client's four derives. The only unexecuted link is the browser render, which is a direct consequence of the derives
- **D-11 ejection end-to-end + the layout-subscription gap:** HIGH — grounded in the verified store cache, `createSubscriber` teardown semantics, and the absence of any server-initiated unsubscribe API
- **`invalidateAll()` (D-04):** HIGH — installed Kit source + official docs agree
- **Cold-load-only detection (D-06):** HIGH — every `store.set(undefined)` / reconnect path enumerated in `client.js`
- **Design source fidelity:** HIGH — every class block and copy string read from disk; all CONTEXT line numbers exact
- **Test baseline + gate colors:** HIGH — all three commands executed
- **D-05 floor value:** MEDIUM — the 2594 ms timing is computed exactly; 900 ms is a judgement call inside the range CONTEXT authorized (§A1)
- **`SIGN_IN_DISCORD()` mechanism:** MEDIUM — the recommended link pattern is verified in-repo; the cross-route form-action alternative is not (§A4)
- **Chat-leak severity/scoping:** MEDIUM — the code path is verified; whether it is in scope is a product call (§A6)

**Blockers surfaced (none fatal, all actionable):**
1. **SCR-02 cannot be satisfied without changing `cancelRoom`'s publish** (a nominally frozen RPC). D-15 already frames this as a bug fix; the change is 4 lines and mirrors an existing verified pattern.
2. **ACC-03 + D-04 together require gating `+layout.svelte`'s subscription** — a fifth touch point beyond CONTEXT's stated four additions. Without it, `invalidateAll()` cannot lift the gate and the ejected-guest data leak stays open.
3. **`cancelReason` makes two additive snapshot fields, not one.** D-18 explicitly delegated this to research; zero migration cost.
4. **`src/phase10-screens.spec.js` must be edited in the same task as the CSS append**, or `npm test` goes red.
5. **The "130 tests" success criterion is stale** (actual 202). ROADMAP criterion 5 and REQUIREMENTS.md line 6 should be read as "suite green", and the milestone-completion bookkeeping pass should correct the number.

**Research date:** 2026-09-04
**Valid until:** 2026-10-04 (30 days — the stack is pinned and the findings are source-derived; only `svelte-realtime` 0.4.x internals could shift, and only on a deliberate upgrade)
</content>
</invoke>
