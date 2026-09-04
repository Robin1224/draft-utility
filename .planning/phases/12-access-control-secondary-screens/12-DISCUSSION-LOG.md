# Phase 12: Access Control & Secondary Screens - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-04
**Phase:** 12-access-control-secondary-screens
**Areas discussed:** Gate enforcement point, Connecting screen timing, Spectating toggle, Room Cancelled screen

---

## Gate enforcement point

### Where should the private-room 403 decision actually be enforced?

| Option | Description | Selected |
|--------|-------------|----------|
| Both SSR + stream | Load decides what renders (no lobby flash, no wasted socket); the `lobby` stream independently throws FORBIDDEN. SSR is UX, the socket is the security boundary. | ✓ |
| Realtime stream only | One enforcement point; page renders the gate on stream error. SSR still ships room data and the shell can flash. | |
| SSR load only | Clean UX, no socket opened, but the guard is cosmetic — direct WS access bypasses it. | |

**User's choice:** Both SSR + stream
**Notes:** Grounded in the current code — `+page.server.js` returns room data to everyone and `src/live/room.js` upserts any guest as a spectator at ~line 119, so neither layer gates today.

### How should the SSR load surface the blocked state to the page?

| Option | Description | Selected |
|--------|-------------|----------|
| Return `gated: true` in data | Page adds a `.cy-gate` branch inside CyShell; matches the prototype (CYGuestGate sits inside CYChrome) and keeps retry on-page. | ✓ |
| Throw `error(403)` | True HTTP status, but renders `+error.svelte` outside the page — needs its own Cyber styling and room-code access; retry becomes a full reload. | |
| Redirect to /login | Reuses the shipped login card but drops the Guest Gate entirely, failing ACC-03. | |

**User's choice:** Return `gated: true` in data
**Notes:** —

### What should `RETRY_AS_GUEST()` do?

| Option | Description | Selected |
|--------|-------------|----------|
| Re-run the load via `invalidateAll()` | Manual "check again"; drops the guest into the lobby/draft if the room opened or the draft started. No reload, no socket churn. | ✓ |
| Auto-poll every few seconds | Transitions guests in without a click, but adds a timer and unannounced server load. | |
| Full page reload | Simplest, but re-runs SSR + auth, re-mounts the shell and replays boot animations. | |

**User's choice:** Re-run the load via `invalidateAll()`
**Notes:** —

### Which room states should the gate block a guest from?

| Option | Description | Selected |
|--------|-------------|----------|
| Private + lobby only | Matches ACC-03/04 literally; `review` stays open (UI-06 + the v1.0 shareable link); `cancelled` shows the SIGKILL screen. | ✓ |
| Private + lobby, drafting and cancelled | Stricter and more consistent, but contradicts ACC-04. | |
| Private + any pre-review phase, review gated if never public | Protects private outcomes but breaks the shareable-review promise and conflicts with UI-06. | |

**User's choice:** Private + lobby only
**Notes:** —

---

## Connecting screen timing

### How should the screen handle its own duration?

| Option | Description | Selected |
|--------|-------------|----------|
| Minimum display window | ~600–900ms floor so the typed log reads as a boot sequence, not a flicker. Also what makes it legible under reduced motion. | ✓ |
| Real duration only | Honest, zero added latency, but a ~50ms flash of half-typed text on fast connections. | |
| Let the typed log finish | Maximum fidelity, but delays every room entry by up to two seconds. | |

**User's choice:** Minimum display window
**Notes:** Exact value left to Claude's discretion.

### When should the Connecting screen appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Cold load only | First mount / initial hydration; phase transitions never re-show it. | ✓ |
| Cold load + reconnects | Truthful about connection state, but would cover the draft board during a blip and fight the frozen PauseOverlay grace flow. | |
| Every navigation to a draft route | Consistent, but re-shows the log when a host bounces back to a room. | |

**User's choice:** Cold load only
**Notes:** —

### Keep the progress meter decorative?

| Option | Description | Selected |
|--------|-------------|----------|
| Decorative, verbatim | Port `.cy-loading-meter/-bar/-pct` + `cy-fill` exactly, with the `sync…` label. No real stages exist, so an indeterminate bar is the honest rendering. | ✓ |
| Drive it from connect stages | More honest in principle, but only 3 coarse near-instant steps — would snap 0→100. | |
| Drop the meter | Less to build, but the card looks unbalanced and SCR-01 names the meter explicitly. | |

**User's choice:** Decorative, verbatim
**Notes:** Needs reduced-motion suppression like every other keyframe.

### What if the connection never resolves?

| Option | Description | Selected |
|--------|-------------|----------|
| Timeout to an error state | ~10s, then a red failure line plus retry. Prevents an unrecoverable dead end. | ✓ |
| Stay indefinitely | Simplest, and the transport may self-heal, but no way out but a manual reload. | |
| You decide | Defer to whatever svelte-realtime already surfaces on connection failure. | |

**User's choice:** Timeout to an error state
**Notes:** —

---

## Spectating toggle

### Where should the toggle live?

| Option | Description | Selected |
|--------|-------------|----------|
| Host Console modal | Phase 11 D-01/D-03 made the Console the home for host room management; `.cy-hc-*` vocabulary already exists. | ✓ |
| Slim launcher bar | One click instead of two, but re-fattens the bar Phase 11 deliberately slimmed. | |
| Draft Settings modal | Groups configurable options, but mixes client-side draft-copy semantics (D-04) with a live server flip. | |
| Lobby banner / spectators strip | Contextually clearest, but puts a host-only control in the shared lobby body. | |

**User's choice:** Host Console modal
**Notes:** The prototype has no design for this control — visual treatment left to Claude's discretion.

### What happens to guests when the host flips public → private?

| Option | Description | Selected |
|--------|-------------|----------|
| Eject to the gate immediately | The flag is the access rule; connected guests hit the 403 on the next snapshot and their spectator rows are removed. | ✓ |
| Grandfather existing guests | Gentler, but makes "private" misleading — the host closes the room and the spectators stay. | |
| Eject but keep spectator rows | Avoids a delete path, but leaves phantom spectators in the snapshot. | |

**User's choice:** Eject to the gate immediately
**Notes:** —

### How should the toggle reach the server?

| Option | Description | Selected |
|--------|-------------|----------|
| New `setRoomVisibility` live RPC | Same host-assert and `publish(topicForRoom(code), 'set', snap)` broadcast as the sibling mutations. | ✓ |
| Extend an existing RPC | Fewer surfaces, but no natural fit; overloads meaning and error codes. | |
| SvelteKit form action | Keeps it out of the realtime layer, but other clients wouldn't see the flip until refresh — fails ACC-02. | |

**User's choice:** New `setRoomVisibility` live RPC
**Notes:** —

### How should the client learn the room's current visibility?

| Option | Description | Selected |
|--------|-------------|----------|
| Add `isPublic` to the lobby snapshot | Only way the toggle reflects a flip from another device and the only way live ejection works. Additive, so the frozen shape and existing tests hold. | ✓ |
| SSR `data.room` only | No snapshot change, but a point-in-time read — stale toggle state and no live ejection. | |
| Both | Belt and braces, but two sources for one truth. | |

**User's choice:** Add `isPublic` to the lobby snapshot
**Notes:** —

### How should the column land in the database?

| Option | Description | Selected |
|--------|-------------|----------|
| Generated migration via `db:generate` | `boolean('is_public').notNull().default(false)` → `drizzle/0002_*.sql`, consistent with the two existing migrations; the default satisfies ACC-01 for existing rows. | ✓ |
| `db:push` | Faster in dev, but no artifact to replay elsewhere. | |
| You decide | Match whatever the phases that added `room_member` / `draft_action` did. | |

**User's choice:** Generated migration via `db:generate`
**Notes:** —

---

## Room Cancelled screen

### Who should see it?

| Option | Description | Selected |
|--------|-------------|----------|
| Everyone, host included | One branch, no role special-casing; SCR-02 says "everyone" and the host gets confirmation the cancel landed. | ✓ |
| Everyone except the host | Skips a redundant screen, but adds a role branch, a navigation side-effect in a snapshot handler, and denies confirmation. | |
| Participants only, guests redirected | Fewer people on a dead page, but guests deserve to know why the draft vanished. | |

**User's choice:** Everyone, host included
**Notes:** Fixes a live bug — `phase === 'cancelled'` currently falls into the DraftBoard branch.

### Real numbers or static log text?

| Option | Description | Selected |
|--------|-------------|----------|
| Interpolate real values | Room code + player/spectator counts from the last snapshot; the rest verbatim. Reads as a genuine receipt. | ✓ |
| Static verbatim text | Fastest and no odd edge counts, but `notifying 6 players, 3 spectators` becomes a fiction on every room. | |
| Room code live, counts static | Half-measure that leaves invented counts on screen. | |

**User's choice:** Interpolate real values
**Notes:** —

### Should the SIGKILL log type out?

| Option | Description | Selected |
|--------|-------------|----------|
| Render complete, verbatim | The prototype's CYCancelled deliberately does not use the typed-log hook; a termination notice should be instantly readable. | ✓ |
| Type it out with `createTypedLog` | More theatrical and consistent with the other log surfaces, but withholds information the user needs now. | |

**User's choice:** Render complete, verbatim
**Notes:** —

### Should `cancelDraftNoCaption` land on the same screen?

| Option | Description | Selected |
|--------|-------------|----------|
| Same screen, different log line | One branch (both set `phase = 'cancelled'`), but the `[SIG] host issued SIGKILL` line swaps to a grace-expiry variant. | ✓ |
| Same screen, identical log | Simplest, but misattributes an automatic timeout to the host. | |
| You decide | Only split the wording if the snapshot already distinguishes the paths. | |

**User's choice:** Same screen, different log line
**Notes:** Planner must check whether the snapshot distinguishes the two paths; if not, adding the minimal signal is part of this phase.

---

## Claude's Discretion

- Minimum-display-window value (D-05) and connection timeout threshold (D-08).
- Visual treatment of the spectating toggle, and whether it locks once drafting starts.
- The cancelled screen's `$ COPY_LOG()` / `$ NEW_DRAFT()` footer actions.
- Whether the CyShell phase tracker shows anything special on the gate and cancelled screens.
- Exact grace-expiry log wording for D-18.
- CSS placement per the Phase 8 hybrid org.
- Whether `data.room` also carries `is_public` for first paint.

## Deferred Ideas

None raised during discussion — it stayed inside the phase boundary. Adjacent items noted in CONTEXT.md `<deferred>`: outstanding human UAT debt across Phases 9/10/11, ROADMAP bookkeeping drift on Phases 8–9, the stale `.planning/HANDOFF.json`, and v1.0 tech debt TD-01..06 (notably TD-05, which is adjacent to this phase's guest handling but explicitly out of scope).
