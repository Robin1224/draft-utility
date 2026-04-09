# Milestones

## v1.0 Draft Utility MVP (Shipped: 2026-04-09)

**Phases completed:** 7 phases, 31 plans, 60 tasks

**Key accomplishments:**

- One-liner:
- One-liner:
- TDD cycle (RED → GREEN):
- Drizzle `room` / `room_member` tables with nanoid-based 7-character public codes, client-safe join URL parsing, and tested `createRoom` / `getRoomByPublicCode` helpers plus `topicForRoom` for realtime.
- Authenticated `createRoom` on `/`, join with `parseRoomCode`, and `draft/[id]` load with 404 for unknown codes — wired to persisted rooms from 02-01.
- Authoritative lobby snapshot over svelte-realtime (`merge: 'set'`) with `joinTeam` enforcing player-only mutations, lobby phase, max 3 per team, and earliest-join captain; guests rejected on team RPC and upserted as spectators when `guestId` is present.
- Stable `draft_guest` cookie and WS `guestId`, host-only kick/move/startDraft/cancelRoom RPCs with DB helpers and unit tests — lobby can transition to `drafting` or `ended` server-side.
- Realtime lobby at `/draft/[id]` with two team columns, collapsible spectators, phased strip (future steps disabled in lobby), host moderation bar, captain-gated Start draft, and absolute copy-link using request origin.
- Ended, cancelled, and 24h-abandoned lobby rooms no longer resolve through `getRoomByPublicCode`; rules live in tested `room-lifecycle` helpers and one atomic UPDATE on abandon.
- 5 spec stub files covering all Phase 3 requirements (DRAFT-01 through DRAFT-06, LIST-01, HOST-01) with 16 server todo stubs + 5 client todo stubs — RED state established before any implementation
- 28-champion Battlerite catalog (classes.json), DEFAULT_SCRIPT constant (10-turn alternating bans/picks), draft_state JSONB column on room, and draft_action audit table with unique index — all applied to Neon DB
- Drizzle DB layer for draft operations — writeDraftAction, loadDraftSnapshot, completeDraft, updateDraftState, advanceTurnIfCurrent in draft.js; startDraftWithSettings added to rooms.js baking script + timer into room.draft_state JSONB
- Server-authoritative pickBan RPC with race-safe timer machinery, captain/champion validation, and startDraft wired to settings payload via shared draft-timers module
- ScriptTurnRow atom and DraftSettingsPanel molecule with native HTML drag-to-reorder, bindable script/timer props, and 5 passing browser tests
- Vitest it.todo scaffold with 19 stubs covering captain-disconnect pause/promote/cancel (DISC-01-03) and snapshot hydration shape (DISC-04, DRAFT-07)
- Captain disconnect detection via onUnsubscribe hook with 30-second grace timer, promotion-or-cancel on expiry, reconnect hydration fix, and reactive timer-advance publishing via platform parameter
- 7 Svelte 5 rune-based draft UI components — 4 atoms (ChampionCard, TimerDisplay, DraftSlot, StatusBanner) and 3 molecules (TurnIndicator, TeamDraftColumn, ChampionGrid) — built to UI-SPEC with all state variants and timer cleanup
- 3-column DraftBoard with PauseOverlay grace countdown, pickBan RPC, and phase-conditional +page.svelte rendering for drafting/cancelled/lobby states
- 32 it.todo stubs across two vitest spec files establishing the validation contract for Phase 5 chat moderation (CHAT-01 through CHAT-04, HOST-04)
- Server-side chat layer: bundled slur-list.json, pure filterMessage pipeline (length → NFKC → zero-width → word-boundary regex), and chat.js with four live.stream channels plus sendMessage/muteMember/unmuteMember RPCs with rate limiting and mute state.
- Svelte 5 chat presentation layer: ChatMessage/ChatInput/MuteButton atoms and ChatPanel molecule with tab switching, auto-scroll, and full accessibility attributes — zero live data wiring
- SpectatorsPanel extended with host-only MuteButton and muted indicator; +page.svelte wired to chat live streams with flex-row sidebar layout in both lobby and draft phases
- All six Phase 5 manual tests passed after four bug fixes found during browser testing; chat channel isolation, rate limiting, slur filtering, and host mute/unmute confirmed working end-to-end
- 8 it.todo vitest browser-project stubs for DraftReview.svelte covering POST-01 UI behaviors — suite exits 0 before component exists
- completeDraft writes phase='review' (not 'ended') without ended_at, keeping rooms visible; +page.server.js SSR load now returns actions and teams for review-phase rooms including unauthenticated visitors
- DraftReview.svelte molecule with two-column pick/ban summary and +page.svelte review branch: full-width, ChatPanel-free, accessible to unauthenticated visitors
- Human confirmed participant transition to review UI, unauthenticated shareable-link access, and Copy-link/Back-to-home CTAs all work correctly in a real browser.
- autoAdvanceTurn threads ctx.publish from disconnectGraceExpired so final-turn grace-timer expiry delivers reactive review-phase push to connected clients without page reload
- One-liner:

---
