---
last_mapped_commit: a6621e6df6e72e09b43157d0d2d0b048118a8016
---

# Codebase Concerns

**Analysis Date:** 2026-09-19

## Tech Debt

**Unbounded in-memory chat state never cleaned up (real memory leak):**
- Issue: `src/live/chat.js` keeps three module-scope `Map`/`Set` stores — `rateLimitMap`, `muteMap`, and `messageStore` — keyed by `roomId`/`topic`. The doc comment on `muteMap` (`src/live/chat.js:24`) explicitly says it is "Exported so room.js can clear it on room cancellation (Pitfall 2 mitigation)", but `src/live/room.js` never imports `muteMap`, `messageStore`, or `rateLimitMap`, and no `cancelRoomAsHost`/`completeDraft` code path deletes these entries.
- Files: `src/live/chat.js:17-32` (state), `src/live/room.js` (cancelRoom/startDraft — no cleanup call), `src/lib/server/rooms.js` (`cancelRoomAsHost`, no hook back into chat.js)
- Impact: Every room ever created leaves a permanent entry in `muteMap` and up to 4 topics' worth of entries (`all`/`teamA`/`teamB`/`spectators`) in `messageStore` (capped at 200 messages each) for the lifetime of the server process. On a long-running instance this grows monotonically with room count and is never reclaimed until process restart.
- Fix approach: On `cancelRoomAsHost`/`completeDraft`/lobby-abandon (ROOM-08) transitions, call cleanup functions exported from `chat.js` (e.g. `clearRoomChatState(roomId)`) that delete the room's `muteMap` entry and the 4 `messageStore` topic keys. Also periodically sweep `rateLimitMap` (currently only pruned lazily per-key on next message from the same sender).

**Chat history is never persisted — lost on redeploy/restart or scale-out:**
- Issue: Unlike `draft_action` (persisted to Postgres via `writeDraftAction` in `src/lib/server/draft.js`), chat messages exist only in the in-process `messageStore` Map in `src/live/chat.js:32`. There is no `chat_message` table in `src/lib/server/db/schema.js`.
- Files: `src/live/chat.js:32,235-238`, `src/lib/server/db/schema.js`
- Impact: A server restart, deploy, or crash wipes all chat history for every active room. Multi-instance deployments would also show different chat history to different clients depending on which instance they're connected to (see scaling limit below).
- Fix approach: Persist chat messages to a `chat_message` table (roomId, channel, sender, body, ts) if durability matters, or explicitly document chat as ephemeral/best-effort in product requirements.

**No interactive transactions — multi-step room/draft mutations are not atomic:**
- Issue: `src/lib/server/db/index.js` uses `drizzle-orm/neon-http` (`neon(env.DATABASE_URL)`), which has no interactive transaction support. Functions like `recomputeTeamCaptains` (`src/lib/server/rooms.js:271-287`), `joinTeamForUser` (`src/lib/server/rooms.js:296-329`), `kickMember`, `movePlayer`, and `startDraftWithSettings` perform multiple sequential `SELECT`/`UPDATE`/`INSERT` statements with no wrapping transaction. This is called out in code comments as a known deviation ("Uses sequential queries (Neon HTTP driver has no interactive transactions — see plan 02-03 deviation)", `src/lib/server/rooms.js:291`).
- Files: `src/lib/server/rooms.js` (all mutation functions), `src/lib/server/draft.js` (`advanceTurnIfCurrent` mitigates this for turn-advance only, via a conditional `UPDATE ... WHERE turnIndex = expected`)
- Impact: A crash or error between steps (e.g. after updating `room_member.team` but before `recomputeTeamCaptains` runs) can leave data in an inconsistent state (e.g. no captain flagged on a team, or two players briefly flagged captain). Concurrent host actions (e.g. two `kickMember` calls racing) are not serialized by any lock.
- Fix approach: Where atomicity matters most (captain recompute, team-cap enforcement), either move logic into a single SQL statement/CTE, or switch to a Postgres driver that supports transactions (e.g. `pg` over TCP) for these specific write paths, keeping Neon HTTP for simple reads.

**Core real-time/server modules have TypeScript checking disabled:**
- Issue: `// @ts-nocheck` appears at the top of `src/live/room.js`, `src/live/draft.js`, `src/live/chat.js`, `src/lib/chat-filter.js`, and `src/lib/server/draft.js` — the files implementing the most complex, concurrency-sensitive logic in the app (turn advancement, disconnect/grace handling, chat authorization, rate limiting). `src/lib/server/rooms.js` keeps type-checking on but widely types its `db` parameter as `@param {any}` (22 occurrences across `src/lib/server`), defeating most of the benefit.
- Files: `src/live/room.js:1`, `src/live/draft.js:1`, `src/live/chat.js:1`, `src/lib/chat-filter.js:1`, `src/lib/server/draft.js:1`, `src/lib/server/rooms.js` (`any` db param throughout)
- Impact: `npm run check` (svelte-check) silently skips these files, so refactors or drizzle-orm schema changes affecting them won't be caught by the type checker — only by tests or runtime.
- Fix approach: Incrementally type `ctx.user`/`ctx.platform` shapes (there's already a `LobbyMember`/`LobbySnapshot` JSDoc typedef pattern in `rooms.js` to follow) and remove `@ts-nocheck` file by file, starting with `draft.js` (`server`) which has no obvious runtime-shape blocker.

**Guest identity is a self-reported cookie value, allowing mute evasion:**
- Issue: `guestId` is an anonymous UUID stored in a `httpOnly` cookie (`DRAFT_GUEST_COOKIE`, `src/hooks.server.js:6-21`) and used as the identity key for the mute feature (`src/live/chat.js:213-217,258-265`). A muted guest can clear cookies (or open a private window) to obtain a fresh `guestId` and immediately bypass the mute.
- Files: `src/hooks.server.js:6-21`, `src/hooks.ws.js:44-69`, `src/live/chat.js:213-217`
- Impact: HOST-04 (host mute) is only a soft deterrent for unauthenticated guests, not an enforceable control.
- Fix approach: Document this as a known limitation of guest-only muting, or additionally rate-limit/soft-ban by IP/connection fingerprint for repeat offenders.

**Dead/leftover scaffold code from the SvelteKit starter template:**
- Issue: `src/lib/server/db/schema.js:16-19` still defines an unused `task` table (the default `create-svelte`/starter demo table) with no reads/writes anywhere in `src`. `src/routes/demo/+page.svelte` is a stub page whose entire content is `<p>Demo routes have been removed.</p>`.
- Files: `src/lib/server/db/schema.js:16-19`, `src/routes/demo/+page.svelte`
- Impact: Minor — dead schema/route clutter that could confuse future contributors about what's actually used; the `task` table also generates an unnecessary migration/table in production.
- Fix approach: Drop the `task` table from schema + a migration, and delete `src/routes/demo/` entirely once confirmed nothing links to it.

**`.DS_Store` committed to git despite `.gitignore` rule:**
- Issue: `.gitignore` lists `.DS_Store`, but `git ls-files | grep DS_Store` shows a tracked `.DS_Store` in the repo (added before the ignore rule took effect).
- Files: `.DS_Store` (repo root)
- Impact: Cosmetic/repo hygiene only.
- Fix approach: `git rm --cached .DS_Store`.

## Known Bugs

**None identified as reproducible defects.** No open `TODO`/`FIXME`/`HACK` markers were found anywhere under `src/` (`grep -rn "TODO\|FIXME\|HACK\|XXX" src` returns no matches), and mutation-error handling in `src/live/room.js` and `src/live/draft.js` maps every known domain error (`TEAM_FULL`, `NOT_HOST`, `DRAFT_NOT_READY`, `DUPLICATE_TURN`, etc.) to an explicit `LiveError`. The concerns below are architectural/latent rather than confirmed runtime bugs.

## Security Considerations

**Unauthenticated WebSocket connections are allowed by design:**
- Risk: `src/hooks.ws.js:44-69` explicitly allows every WS upgrade through as a `role: 'guest'` connection, even when `auth.api.getSession` throws or returns null. This is intentional (documented as "D-12: Unauthenticated connections are ALLOWED"), but it means the WS layer's security boundary is entirely inside each `live()`/`live.stream()` handler's own role checks rather than at the transport/auth layer.
- Files: `src/hooks.ws.js:44-77`, every handler in `src/live/room.js`, `src/live/draft.js`, `src/live/chat.js`
- Current mitigation: Each mutating RPC (`joinTeam`, `kickMember`, `movePlayer`, `startDraft`, `pickBan`, `muteMember`) independently checks `ctx.user?.role !== 'player'` before proceeding.
- Recommendations: Because authorization is duplicated per-handler rather than centralized, any new `live()` export that forgets the role check silently exposes an unauthenticated mutation. Consider a shared `requirePlayer(ctx)` guard helper (there is currently no such shared helper — each file reimplements the same `if (ctx.user?.role !== 'player' || !ctx.user?.id) throw new LiveError('UNAUTHORIZED', ...)` check inline) to make omission harder.

**`getRequestEvent` imported from an internal, non-public SvelteKit path:**
- Risk: `src/lib/server/auth.js:7` imports `getRequestEvent` from `@sveltejs/kit/internal/server` with a `@ts-ignore` and a comment noting `$app/server` "fails in the adapter-uws esbuild bundle". Relying on SvelteKit internals means a routine `@sveltejs/kit` version bump could silently break Better Auth's cookie plugin (which is documented as "must remain last" in the plugins array, `src/lib/server/auth.js:20`) with no compiler warning (the `@ts-ignore` would suppress a type error, but a full path removal would surface as a runtime import error only when auth actually runs).
- Files: `src/lib/server/auth.js:5-8,20`
- Recommendations: Pin `@sveltejs/kit` more conservatively (currently `^2.50.2`, allowing any 2.x minor/patch) or add an integration test that exercises the Discord OAuth cookie-set path so a break surfaces in CI rather than production.

**Rate limiting and mute keys are best-effort, not cryptographically tied to identity:**
- Risk: The chat rate limiter key is `${senderId ?? 'anon'}:${ctx.id ?? 'conn'}:${roomId}` (`src/live/chat.js:222`) — comment explicitly says this is "acceptable for v1" per research notes. Combined with the guest-cookie-reset mute-evasion issue above, a determined abuser can reset both rate-limit and mute state by dropping cookies/reconnecting.
- Files: `src/live/chat.js:219-225`
- Recommendations: Acceptable for current scale per the code's own documented trade-off; flag for revisit if abuse becomes a real-world problem.

## Performance Bottlenecks

**`recomputeTeamCaptains` issues one `UPDATE` per team member, every time team membership changes:**
- Problem: `src/lib/server/rooms.js:271-287` re-fetches the ordered member list for both teams and then loops, issuing a separate `UPDATE room_member SET is_captain = ...` per row (not batched), on every `joinTeamForUser`, `kickMember`, and `movePlayer` call.
- Files: `src/lib/server/rooms.js:271-287` (called from lines 304, 328, 364, 394, 404)
- Cause: No batched `CASE WHEN id = ? THEN true ELSE false END` update; instead N sequential round-trips to Neon (which is itself HTTP-per-query, adding network latency per statement).
- Improvement path: Collapse the demote/promote logic into a single `UPDATE ... SET is_captain = (id = $captainId)` per team (2 statements total instead of up to 6 for a 3-per-team room), or use a single query with a `CASE` expression across all affected member ids.

## Fragile Areas

**In-memory `roomTimers` Map ties draft turn-timers to a single server process:**
- Files: `src/live/draft-timers.js:1-27` (module-level `Map<string, ReturnType<typeof setTimeout>>`), consumed by `src/live/room.js` and `src/live/draft.js`
- Why fragile: Turn timers (`scheduleTimer`) and disconnect-grace timers exist only as in-process `setTimeout` handles. A server restart/deploy while a draft is mid-turn loses the scheduled auto-advance — the turn will never time out server-side until a client action or a fresh subscribe (`lobby` stream's `DISC-04` reconnect logic) re-triggers state. There is also no persistence-based re-arm of timers on process boot by scanning `room.draft_state.turnEndsAt` for active drafts.
- Safe modification: Any change to timer scheduling must preserve the `clearRoomTimer`-before-`scheduleTimer` pattern (already followed) to avoid duplicate timers; any HA/multi-instance work must externalize this (e.g. a cron/sweep job comparing `turnEndsAt` against `now()`, or a distributed scheduler) rather than assuming a single Node process owns all timers.
- Test coverage: `src/live/draft.spec.js` and `src/live/room.spec.js` test the timer *callbacks* logic but there is no test for "server restarts mid-turn" recovery, because no such recovery mechanism exists.

**Chat/mute/rate-limit module state (same pattern as timers) — see Tech Debt section above for the specific leak; also a horizontal-scaling blocker (see Scaling Limits).**

**`src/routes/draft/[id]/+page.svelte` is a single 399-line component owning lobby, drafting, review, and chat wiring:**
- Files: `src/routes/draft/[id]/+page.svelte`
- Why fragile: All phase branches (`lobby`/`drafting`/`cancelled`/`review`), all RPC call sites (`joinTeam`, `kickMember`, `movePlayer`, `startDraft`, `cancelRoom`, `pickBan`, chat sends/mutes), and derived state for team membership/chat channel selection live in one file. A change to one phase's markup risks unrelated regressions in another phase due to shared `$derived`/`$state` variables (e.g. `actionError` is shared across every handler).
- Safe modification: When adding new phase-specific behavior, prefer extracting phase bodies into child components (the codebase already does this for `LobbyHostBar`, `DraftBoard`, `DraftReview`, `ChatPanel`) rather than growing this file further.

## Scaling Limits

**Realtime state (draft timers, chat history, mutes, rate limits) is single-process, in-memory only:**
- Current capacity: Works correctly only when exactly one Node/uWS server process serves all WebSocket connections for a given room (svelte-adapter-uws + svelte-realtime deployment model, `svelte.config.js`, `vite.config.js`).
- Limit: The app cannot be horizontally scaled (multiple instances/replicas behind a load balancer) without breaking timers (each instance would independently schedule/miss turn advances), chat (users on different instances would see different history/mute state), and rate limiting (a user could spread requests across instances to bypass the 5-per-5s cap).
- Scaling path: Introduce a shared external store (Redis or Postgres-backed) for `roomTimers` (or a single-writer election/lock), `messageStore`, `muteMap`, and `rateLimitMap`, or pin deployment to a single always-on instance (documented constraint) if horizontal scaling isn't a near-term requirement.

## Dependencies at Risk

**Core realtime stack is built on pre-1.0 packages:**
- Risk: `svelte-realtime` (`^0.4.6`) and `svelte-adapter-uws` (`^0.4.5`) in `package.json` are both sub-1.0 — the entire WebSocket RPC/pub-sub layer (`live()`, `live.stream()`, `ctx.publish`, the adapter's `websocket: true` mode) depends on two young, low-major-version libraries whose public API can change in any `0.x` release per semver convention (caret ranges on `0.x` only guarantee patch-level stability).
- Impact: A routine `npm install`/dependency bump could introduce breaking changes to the RPC dispatch mechanism (`src/hooks.ws.js:1-6` re-exports `message`/`close` from `svelte-realtime/server`) or the uWS adapter's WebSocket handling, with no major-version signal to catch it in review.
- Migration plan: Pin these two packages to exact versions (rather than `^`) until they reach 1.0, and review release notes manually before any upgrade; there is no drop-in alternative given the app's uWS + SvelteKit + svelte-realtime architecture is deeply coupled to their specific APIs (`upgrade()`, `ctx.platform`, `live.stream(topicFn, loaderFn, opts)`).

**`better-auth` pinned with tilde ranges across two packages that must stay in lockstep:**
- Risk: `better-auth` and `@better-auth/cli` are both `~1.4.21` (patch-only updates allowed). `src/lib/server/auth.js` uses `better-auth/minimal`, `better-auth/adapters/drizzle`, and `better-auth/svelte-kit` — several sub-path exports that could shift between minor versions.
- Impact: Low immediate risk since tilde prevents minor bumps, but the `auth:schema` npm script (`better-auth generate --config src/lib/server/auth.js --output src/lib/server/db/auth.schema.js`) regenerates `src/lib/server/db/auth.schema.js` from the CLI — if `@better-auth/cli` and `better-auth` versions ever drift, generated schema could mismatch the runtime adapter's expectations.
- Migration plan: Keep both packages' versions identical on every bump (already the case at `~1.4.21`); no action needed unless a minor upgrade is undertaken deliberately.

## Missing Critical Features

**No re-arm mechanism for draft timers after a server restart:**
- Problem: As noted under Fragile Areas, `room.draft_state.turnEndsAt` is persisted in Postgres, but nothing on server boot scans in-progress (`phase: 'drafting'`) rooms and re-schedules their timers via `scheduleTimer`. A restart mid-draft silently stops turn auto-advancement until the next client action.
- Blocks: Reliable unattended operation across deploys; currently deploys during active drafts are a manual-risk window.

**`is_public` room column has no application logic wired up yet:**
- Problem: `src/lib/server/db/schema.js:31` defines `is_public: boolean('is_public').notNull().default(false)`, added in the most recent commit (`a6621e6`, `feat(12-01): add is_public column to room table`), but no code in `src/lib/server/rooms.js`, `src/live/room.js`, or any route reads or writes this column yet.
- Blocks: Public room browsing/discovery (implied by the column name) is schema-only at this commit; treat as in-progress/scaffolded rather than a bug.

## Test Coverage Gaps

**No test exercises chat-state cleanup on room end (because the cleanup doesn't exist):**
- What's not tested: A room transitioning to `ended`/`cancelled`/`review` never triggers assertions that `muteMap`/`messageStore`/`rateLimitMap` entries for that room are removed, because no such removal code exists (see Tech Debt).
- Files: `src/live/chat.spec.js` (has direct `mod.muteMap.set(...)`/`.get(...)` manipulation for mute tests, but no lifecycle/cleanup test), `src/live/room.spec.js` (cancelRoom tests don't assert on chat.js state)
- Risk: A future engineer could add cleanup code but never notice a mismatch (e.g. wrong `roomId` used as key) since no test would catch a no-op cleanup either.
- Priority: Medium — not user-visible today, but the leak compounds over the app's lifetime.

**No test simulates a server restart mid-draft to verify timer recovery (or its absence):**
- What's not tested: The interaction between persisted `draft_state.turnEndsAt` and the in-memory `roomTimers` Map after a process restart.
- Files: `src/live/draft-timers.js` has no dedicated spec file at all (only exercised indirectly via `src/live/draft.spec.js` and `src/live/room.spec.js`).
- Risk: Silent, indefinite turn-timer stalls after any deploy that lands mid-draft are currently unguarded by any regression test.
- Priority: Medium — directly affects the core drafting experience if it occurs in production during a deploy.

**No concurrency/race test for `recomputeTeamCaptains` or the non-transactional room-mutation sequence:**
- What's not tested: Two near-simultaneous `joinTeamForUser`/`kickMember`/`movePlayer` calls against the same room to verify captain flags end up consistent (single captain per team) given the lack of transactions.
- Files: `src/lib/server/rooms.spec.js` (has a `describe.skipIf(!hasDb)('joinTeamForUser integration (optional DATABASE_URL)', ...)` block for real-DB integration but no interleaved/concurrent-call scenario)
- Risk: A race condition here would silently produce zero or two captains on a team, which would be confusing to diagnose in production and is not caught by unit tests that call functions sequentially.
- Priority: Low-Medium — requires genuinely concurrent requests to trigger, but the underlying non-atomicity is a known, documented deviation.

---

*Concerns audit: 2026-09-19*
