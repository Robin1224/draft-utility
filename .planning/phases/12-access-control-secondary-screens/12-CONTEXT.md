# Phase 12: Access Control & Secondary Screens - Context

**Gathered:** 2026-09-04
**Status:** Ready for planning

<domain>
## Phase Boundary

The final slice of v2.0. Two halves that ship together because the screens gate on the backend flag:

1. **Access control (ACC-01..04)** — the `room` record gains a persisted "open spectating" (public/private) flag defaulting to **closed**; the host can flip it **live** from the lobby; unauthenticated visitors to a **private, pre-draft** room hit the 403 **Guest Gate** instead of the lobby; once the room is public or the draft has started, guests view it as spectators.
2. **Secondary screens (SCR-01, SCR-02)** — the **Connecting** terminal state (typed connect log + progress meter) while the socket opens and the room hydrates, and the **Room Cancelled** SIGKILL terminal state when a room ends.

Requirements covered: **ACC-01, ACC-02, ACC-03, ACC-04, SCR-01, SCR-02**. This closes the milestone — Phase 12 is the last phase of v2.0.

**Constraint carried from Phases 10/11 (D-01):** no change to draft *behavior*. The pick/ban engine, timer, disconnect/grace flow, chat, and the existing RPCs (`kickMember`, `movePlayer`, `startDraft`, `cancelRoom`, `pickBan`, `sendMessage`) are FROZEN. Existing tests must keep passing.

**Explicitly authorized exception:** unlike Phases 8–11, this phase **does** extend the realtime/auth/DB layer — REQUIREMENTS.md scopes ACC as "the view layer **plus** the access-control additions".

**Scope fence — AMENDED 2026-09-04 after research (see D-19, D-20).** The original fence read "one `room` column, one new RPC, one additive snapshot field, and one guard inside the existing `lobby` stream." Research (`12-RESEARCH.md`) established that this fence cannot hold while implementing D-04, D-11, D-15 and D-18 correctly. The authorized additions are now **six touch points**:

1. One `room` column — `is_public` (D-14).
2. One new RPC — `setRoomVisibility` (D-12).
3. **Two** additive snapshot fields — `isPublic` (D-13) **and** `cancelReason` (D-19).
4. One guard inside the existing `lobby` stream (D-01).
5. A subscription gate in `src/routes/draft/[id]/+layout.svelte` (D-19).
6. A room-privacy guard in `chatAll` / `chatSpectators` in `src/live/chat.js` (D-20).

Nothing else in the realtime layer moves. Both new snapshot fields are strictly additive, so the frozen-shape constraint still holds — existing tests assert on existing keys.

**Out of scope:** anything in v2.0's Out of Scope table (draft engine changes, alt palettes, custom lists, transferable host, transport/DB migration) and the v1.0 tech-debt items TD-01..06.

</domain>

<decisions>
## Implementation Decisions

### Guest Gate — enforcement (ACC-03/04)

- **D-01:** The gate is enforced at **both layers**. `src/routes/draft/[id]/+page.server.js` decides what the page renders (no flash of lobby, no wasted socket); the `lobby` stream in `src/live/room.js` **independently** refuses blocked guests. SSR is the UX layer; the socket is the real security boundary — a client can open the WS directly, so the stream guard is not optional. Today neither layer gates: the load returns room data to everyone, and the stream upserts *any* guest as a spectator (`room.js` ~line 119).
- **D-02:** SSR signals the block by returning **`gated: true`** in the load's data — **not** `error(403)` and **not** a redirect. `+page.svelte` gains a branch rendering `.cy-gate` **inside CyShell**, matching the prototype (`CYGuestGate` sits inside `CYChrome`, header + phase tracker + room code still visible). This also keeps `RETRY_AS_GUEST()` on the same page with no full reload.
- **D-03:** **Gate predicate = `isGuest && !room.is_public && phase === 'lobby'`.** `drafting` is guest-viewable (ACC-04). `review` stays open to everyone — UI-06 locked it as guest-viewable and the shareable review link is a v1.0 promise. `cancelled` shows the SIGKILL screen; there is nothing to hide in a dead room.
- **D-04:** `RETRY_AS_GUEST()` re-runs the load via **`invalidateAll()`** — a manual "check again" that drops the guest straight into the lobby/draft if the host has since opened spectating or started the draft. No page reload, no shell re-mount, no boot animations re-running.

### Connecting screen (SCR-01)

- **D-05:** The screen honors a **minimum display window (~600–900ms)** even when the snapshot arrives sooner. A real socket connect is often under 100ms, so without a floor the 6-line typed log flashes half-typed and vanishes. Exact value is Claude's discretion. Note the floor is what makes the screen legible under `prefers-reduced-motion`, where the typed log jumps straight to full text.
- **D-06:** Shows on **cold load only** — first mount of the draft route (initial socket open + snapshot hydration). Snapshot updates and phase transitions (lobby→drafting→review) never re-show it. Reconnects are **not** covered here: the disconnect story is already owned by the frozen PauseOverlay grace flow and this must not fight it.
- **D-07:** The progress meter is ported **decorative and verbatim** — `.cy-loading-meter` / `.cy-loading-bar` / `.cy-loading-pct` plus the `cy-fill` keyframe, with the `sync…` label. There are no real progress stages (one socket open, one snapshot), so an indeterminate bar is the honest rendering. Needs a reduced-motion suppression like every other keyframe.
- **D-08:** If the connection never resolves, **time out at ~10s** to an error state: the log's tail swaps to a red failure line plus a retry action. Without it a dead socket parks the user on `ESTABLISHING_LINK…` forever.
- **D-09:** This replaces the current placeholder — `loading = streamVal === undefined` currently renders a bare `<p class="cy-foot">// loading room…</p>`.

### Open-spectating toggle (ACC-01/02)

- **D-10:** The toggle lives in the **Host Console modal**. Phase 11 (D-01/D-03) established the Console as the home for host room-management controls (move, kick, `CANCEL_ROOM`) with the bar reduced to launchers; a room-visibility setting belongs there, and the `.cy-hc-*` field vocabulary already exists to hold it. The prototype has **no** design for this control — visual treatment is Claude's discretion within the Cyber vocabulary.
- **D-11:** Flipping **public → private ejects connected guests immediately** — they land on the 403 Guest Gate on the next snapshot, and their spectator rows are removed. "Private" means private; a host closing the room mid-lobby wants the lurkers gone.
- **D-12:** A new **`setRoomVisibility` live RPC** in `src/live/room.js`, alongside `kickMember` / `movePlayer` / `cancelRoom` — same host-assert, same `publish(topicForRoom(code), 'set', snap)` broadcast, so every client updates live from one code path. Not a form action: ACC-02 requires a live flip that other connected clients see without refreshing.
- **D-13:** **`isPublic` is added to the lobby snapshot** (`loadLobbySnapshot`). This is the only way the toggle reflects a flip made from another device and the only way D-11's live ejection can work. Additive fields do not break the frozen shape — the existing tests assert on existing keys.
- **D-14:** The column ships as a **generated Drizzle migration** — `boolean('is_public').notNull().default(false)` on `room`, then `drizzle-kit generate` producing `drizzle/0002_*.sql`, consistent with the two checked-in migrations. The `default(false)` is what satisfies ACC-01's "defaulting to closed" for existing rows.

### Room Cancelled screen (SCR-02)

- **D-15:** **Everyone sees it, host included.** One branch on `snapshot.phase === 'cancelled'`, no role special-casing — SCR-02 says "everyone", and the host gets confirmation their `CANCEL_ROOM` landed. Fixes a live bug: today `phase === 'cancelled'` falls into the **DraftBoard** branch (`+page.svelte` ~line 266).
- **D-16:** The SIGKILL log **interpolates real values** — room code and player/spectator counts from the last snapshot before cancellation; the remaining lines stay verbatim. The prototype's `notifying 6 players, 3 spectators` is mockup data.
- **D-17:** The log **renders complete, not typed**. The prototype's `CYCancelled` deliberately does *not* use the typed-log hook (unlike `CYLoading`, which does) — a termination notice should be instantly readable, and it avoids another motion path to suppress.
- **D-18:** **Both cancellation paths land on the same screen with different wording.** Host-issued `cancelRoom` keeps `[SIG] host issued SIGKILL → room {code}`; the automatic `cancelDraftNoCaption` path (captain disconnects, grace expires, no replacement) swaps that line to a grace-expiry variant. Both set `phase = 'cancelled'`, so one branch handles both — but misattributing an automatic timeout to the host is confusing precisely when the host is also its victim. Planner: check whether the snapshot already distinguishes the two paths; if it does not, the minimal distinguishing signal is part of this phase.

### Post-research amendments (locked 2026-09-04)

These two decisions were taken by the user after `12-RESEARCH.md` surfaced that the original scope fence was not implementable. They amend `<domain>` above.

- **D-19: The fence widens to two additive snapshot fields and five realtime touch points.** Two research findings force this:
  - **`cancelReason: 'host' | 'grace'`** is added to the cancellation publish payload, resolving D-18's delegated question at **zero migration cost**. Research found the two paths are otherwise indistinguishable downstream. It also found a latent bug that blocks SCR-02 entirely: `cancelRoomAsHost` sets `ended_at`, `getRoomByPublicCode` then hides the row, so `loadLobbySnapshot` returns `null` and `cancelRoom` broadcasts `publish(topic, 'set', null)` — every connected client currently renders a **blank `<main>`** on host cancel, and D-15's branch can never fire. The fix is to load the snapshot *before* cancelling, exactly as `disconnectGraceExpired` already does at `src/live/room.js:104-108`. Tagging `cancelReason` at the two publish sites is free once that fix lands. Note `src/live/room.spec.js:160-166` stays green either way because `loadLobbySnapshot` is mocked — the mock hides the real integration.
  - **`src/routes/draft/[id]/+layout.svelte` must gate its subscription on `page.data.gated`.** svelte-realtime caches stream stores by `path + ':' + args` with a refcount, and the layout subscribes to the *same* `lobby(code)` store as the page. Once the D-01 guard throws, that shared store holds `{error: FORBIDDEN}` permanently — it has no `refetch`, and `invalidateAll()` only re-runs HTTP loads. **Without this gate, D-04's `RETRY_AS_GUEST()` is dead on arrival.** The same change also stops an ejected guest from continuing to receive every roster broadcast (`access`/`filter` in this library is subscribe-time only).

- **D-20: The chat leak is fixed server-side — a sixth touch point.** `chatAll` / `chatSpectators` (`src/live/chat.js:124-184`) check only team membership, never room privacy, and the chat `$effect` at `+page.svelte:181-192` subscribes unconditionally on mount — so a gated guest reads all-channel chat for a private room. This is pre-existing behavior, not a Phase-12 regression, and research recommended client-side mitigation only. **The user overrode that recommendation:** add a real room-privacy guard inside `chatAll` / `chatSpectators` so the boundary holds against a direct WS client, not just the rendered page. Gate the client-side `$effect` on `gated` as well — that is the UX layer, the server guard is the boundary, mirroring D-01's two-layer model. This does **not** pull in TD-05 (guest spectator accumulation on review-phase rooms), which stays out of scope.

### Claude's Discretion

- Exact minimum-display-window value for the Connecting screen (D-05) and the timeout threshold (D-08). Research computed the typed connect log at **2594 ms** total, so a ~900 ms floor lands mid-line-2.
- Visual treatment of the spectating toggle (D-10) — checkbox, two-state `[ON|OFF]` terminal switch, or a `.cy-hc-*` row — and whether it locks once the draft has started.
- The cancelled screen's `$ COPY_LOG()` / `$ NEW_DRAFT()` footer actions — keep both as designed, or trim.
- Whether the CyShell phase tracker shows anything special on the gate and cancelled screens.
- The exact grace-expiry log wording for D-18.
- CSS placement per the Phase 8 hybrid org: `.cy-loading*`, `.cy-gate*`, `.cy-cancel*` blocks ported verbatim into `src/app.css` under `.cy-app`; genuine one-offs scoped.
- Whether `data.room` also carries `is_public` for first paint, given D-13 already covers it via the snapshot.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 12 design source (restyle TO match, per Phase 10 D-01)

- `design_handoff_pickban_cyber/prototype/variants/cyber.jsx` — `CY_CONNECT_LINES` (~646: the 6 connect log lines), `CYLoading` (~654: loading card, `ESTABLISHING_LINK` + `cy-dots`, typed log at `speed: 7, lineGap: 120`, meter), `CYGuestGate` (~675: `// access: RESTRICTED`, `$ ROOM.ACCESS()`, the 403 readout, `SIGN_IN_DISCORD()` + `RETRY_AS_GUEST()`, foot note), `CYCancelled` (~703: `// SESSION_TERMINATED`, `$ ROOM.KILL()`, SIGKILL log, `$ COPY_LOG()` / `$ NEW_DRAFT()`).
- `design_handoff_pickban_cyber/prototype/variants/cyber.css` — `.cy-loading*` (~470–487), `.cy-gate*` (~490–504), `.cy-cancel*` (~507–518), plus the `cy-dots` and `cy-fill` keyframes. Port values verbatim into `.cy-app` scope.

### Foundation already shipped (do NOT contradict)

- `.planning/phases/11-terminal-modals/11-CONTEXT.md` — Host Console anatomy and the D-01/D-03 bar↔modal split that D-10 extends; `CyModal` contract.
- `.planning/phases/10-core-screen-reskins/10-CONTEXT.md` — D-01 restyle-in-place + frozen `$live` wiring; hybrid CSS org; motion safety.
- `.planning/phases/08-cyber-foundation-app-shell/08-CONTEXT.md` — plain CSS, `.cy-app` token scope, verbatim values, zero radius, reduced-motion suppression (D-10).
- `.planning/phases/09-signature-effects-infrastructure/09-CONTEXT.md` — `createTypedLog` design; Phase 9 pre-specified the connect-log options (`speed 7, lineGap 120`) for exactly this screen.
- `src/lib/components/effects/cyTypedLog.svelte.js` — the `createTypedLog` rune factory the Connecting screen consumes (spec alongside it at `cyTypedLog.svelte.spec.js`).
- `src/app.css` — existing `.cy-*` foundation. Phase 12 **appends** the `.cy-loading*` / `.cy-gate*` / `.cy-cancel*` blocks. Note: the Phase 10 scope-guard spec was reconciled in Phase 11 Plan 01 to treat exactly these three prefixes as Phase-12-only exclusions — that guard must be updated as they land.

### Code being changed in this phase

- `src/lib/server/db/schema.js` — `room` table (~line 22); gains `is_public` (D-14).
- `drizzle/` — holds `0000_omniscient_pixie.sql`, `0001_milky_selene.sql`; the new migration is `0002_*` (D-14).
- `src/lib/server/rooms.js` — `getRoomByPublicCode` (~82), `loadLobbySnapshot` (~158, gains `isPublic` per D-13), `upsertGuestSpectator` (~215), `assertHost` (~128), `cancelRoomAsHost` (~494), `cancelDraftNoCaption` (~518).
- `src/live/room.js` — `lobby` stream (~113, gains the D-01 guard; the unconditional guest upsert at ~119 is what D-01 replaces), `cancelRoom` (~348); new `setRoomVisibility` RPC (D-12).
- `src/routes/draft/[id]/+page.server.js` — currently 404s on missing room only; gains the D-02 `gated` computation.
- `src/routes/draft/[id]/+page.svelte` — `loading` derive (~47) and the `// loading room…` placeholder (~255) become the Connecting screen; the `loadError`/guest sign-in fallback (~256–264) is superseded by the gate; the `phase === 'drafting' || phase === 'cancelled'` branch (~266) splits so cancelled gets its own screen (D-15).
- `src/lib/components/molecules/LobbyHostBar.svelte` — hosts the Host Console modal that gains the toggle (D-10).

### Project guardrails

- `.planning/REQUIREMENTS.md` — ACC-01..04 / SCR-01..02 acceptance text; the frozen-realtime constraint **and** its explicit ACC carve-out; test suite must stay green.
- `.planning/codebase/CONVENTIONS.md`, `STRUCTURE.md`, `TESTING.md` — Svelte 5 runes/JSDoc conventions, atoms/molecules layout, vitest browser+node projects.
- `.planning/codebase/ARCHITECTURE.md` — **stale (dated 2026-04-03, pre-realtime).** It states svelte-realtime is unused and the draft route is a static shell; both are long false. Read the source, not this file.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `createTypedLog` (Phase 9) already supports the connect-log options the prototype uses and jumps to full text under reduced motion — the Connecting screen is its second consumer after Home's boot log.
- `.cy-btn`, `.cy-btn-ghost`, `.cy-btn-primary`, `.cy-btn-discord`, `.cy-foot`, `.cy-chat-cursor` (Phases 8/10) cover every control on all three new screens.
- `LoginCard.svelte` already implements the Discord OAuth entry the gate's `SIGN_IN_DISCORD()` needs — reuse the action, not the markup.
- `assertHost` + the `mapRoomMutationError` pattern in `src/live/room.js` give `setRoomVisibility` its authorization and error-mapping shape for free.
- `LobbyHostBar.svelte` already derives host-only state and renders the Host Console `CyModal` — the toggle drops into the existing composition.

### Established Patterns

- Svelte 5 runes + JSDoc typedefs; callbacks passed down as `onKick`/`onMove`/`onStartDraft`/`onCancelRoom` props from the draft page. `setRoomVisibility` should follow the same prop-callback shape.
- Every live mutation ends with `publish(topicForRoom(code), 'set', snap)` — one broadcast path, no bespoke events.
- Hybrid CSS org: structural `.cy-*` in `src/app.css` under `.cy-app`; scoped styles only for genuine one-offs.
- Node tests for server/`$live` modules, vitest-browser specs for components (see `src/lib/server/rooms.spec.js`, `src/live/room.spec.js`, `src/routes/draft/[id]/page.server.spec.js` — all three have direct analogs to extend here).

### Integration Points

- `src/routes/draft/[id]/+page.svelte` is the single composition root for all three screens — each is a new branch in the existing `{#if loading} … {:else if snapshot} …` chain, not a new route.
- The gate needs `is_public` at SSR (`+page.server.js` → `getRoomByPublicCode`) **and** in the stream guard (`src/live/room.js` → same helper) — one column read from two callers.
- `upsertGuestSpectator` must not run for gated guests; the D-01 stream guard has to sit **before** it.
- D-11's ejection reuses the existing spectator-removal path rather than inventing one.

</code_context>

<specifics>
## Specific Ideas

- Connecting card: `$ ./draftnet --status` eyebrow, `ESTABLISHING_LINK` + animated `cy-dots`, the 6 `CY_CONNECT_LINES` typed at `speed 7 / lineGap 120` with a trailing `▮` cursor while incomplete, then the meter with the `sync…` label.
- Gate card: `// access: RESTRICTED` eyebrow, `$ ROOM.ACCESS()` heading, and the readout verbatim in shape —
  `> GET /draft/{code}` / `< 403 SIGN_IN_REQUIRED` (red) / `> identity = <guest:anon>` / `> hint: host has not opened this room to spectators` — then the explainer line, `SIGN_IN_DISCORD()` + `RETRY_AS_GUEST()` stacked, and the foot note `// you can still watch once the draft goes live`.
- Cancelled card: `// SESSION_TERMINATED` eyebrow (red, glowed), `$ ROOM.KILL()` heading, log lines `[SIG]` (red) → `[INF] flushing draft state` → `[INF] notifying {n} players, {m} spectators` → `[INF] releasing room code {code}` → `[ OK ] socket closed cleanly (code 1000)` (lime).
- The gate's hint line is the natural place to make the private/public distinction legible to a guest — it already says "host has not opened this room to spectators", which is literally what the ACC-01 flag means.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

Adjacent work that surfaced but is **not** Phase 12:

- **Outstanding human UAT debt** — `09-HUMAN-UAT.md` (3 pending), `10-UAT.md` (`status: testing`, 1 recorded issue unresolved, 4 pending), `11-HUMAN-UAT.md` (4 pending). All visual checks the specs can't simulate. Run `/gsd:verify-work` before completing the milestone, not during this phase.
- **ROADMAP.md bookkeeping drift** — Phases 8 and 9 are listed as `[ ]` / `0/3` / "Not started" despite being complete on disk with passing verification. Cosmetic; fix at milestone completion.
- **ROADMAP.md success criterion 5 cites a stale test count** — it says "All **130** existing unit tests still pass". Research measured the real baseline at **202 passed / 1 skipped / 34 todo across 24 files** (server 150, client 52). Read the criterion as "the full suite stays green", not as a literal count, or a verifier could pass the phase on 130 of 202. Also: `npm run lint` and `npm run check` are **red at baseline** (19 prettier + 20 eslint src failures; 10 svelte-check errors) — `npm test` is the only green gate, and `npm run format` must never be run.
- **Stale `.planning/HANDOFF.json`** — describes Phase 03 plan 06 from 2026-04-03 (v1.0, shipped). Safe to delete.
- **v1.0 tech debt TD-01..06** — explicitly out of scope for v2.0 per REQUIREMENTS.md. TD-05 (guest spectator accumulation on review-phase rooms) is *adjacent* to this phase's guest handling; resist folding it in.

</deferred>

---

*Phase: 12-access-control-secondary-screens*
*Context gathered: 2026-09-04*
