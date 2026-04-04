---
plan: 03-06
phase: 03-draft-engine
status: complete
wave: 3
started: 2026-04-04
completed: 2026-04-04
requirements:
  - HOST-01
  - DRAFT-01
  - DRAFT-02
  - DRAFT-03
  - DRAFT-04
  - DRAFT-05
  - DRAFT-06
  - LIST-01
---

## Summary

Wired the settings panel into the lobby page. `LobbyHostBar` now shows a Settings toggle (lobby-only) that expands `DraftSettingsPanel` inline. `+page.svelte` initializes draft settings state from `DEFAULT_SCRIPT` (with nanoid IDs for keying) and `DEFAULT_TIMER_MS`, and passes `{ script, timerMs }` as payload to the `startDraft` RPC on submission.

Also fixed two bugs discovered during verification:
- `hooks.ws.js`: svelte-adapter-uws passes headers as a plain object, not a `Headers` instance — wrapped in `new Headers()` before passing to `auth.api.getSession` and `cookieFromHeaders`
- `rooms.js`: added JSDoc types to `startDraftWithSettings` params to resolve implicit-any and union-type errors in svelte-check

## What was built

- **`LobbyHostBar.svelte`**: Settings toggle button (`aria-expanded`, `aria-controls`); `{#if settingsOpen}<DraftSettingsPanel>` inline; `bind:script` and `bind:timerSeconds` props exposed to parent
- **`+page.svelte`**: `draftScript` state initialized from `DEFAULT_SCRIPT.map(turn => ({ ...turn, id: nanoid(8) }))`; `timerSeconds` state from `DEFAULT_TIMER_MS / 1000`; `handleStart` strips `id` fields and converts to `timerMs` before calling `startDraft(code, { script, timerMs })`
- **`hooks.ws.js`**: WebSocket upgrade now wraps plain-object headers in `new Headers()` for compatibility with Better Auth's `.get()` API
- **`rooms.js`**: `startDraftWithSettings` typed correctly; implicit-any member check resolved

## Key files

### Created
_(none)_

### Modified
- `src/lib/components/molecules/LobbyHostBar.svelte` — Settings toggle + DraftSettingsPanel binding
- `src/routes/draft/[id]/+page.svelte` — settings state init + startDraft payload
- `src/hooks.ws.js` — headers plain-object → Headers instance fix
- `src/lib/server/rooms.js` — JSDoc types on startDraftWithSettings

## Test results

- `npm run check`: 0 errors, 0 warnings (1233 files)
- `npm run test`: 80 passed, 1 skipped, 5 todo

## Deviations

None from plan. Type errors and WebSocket headers bug were pre-existing issues surfaced by svelte-check and live testing.

## Manual verification

Approved by user: Settings panel visible in lobby, timer/script configurable, Start draft sends settings to server, Phases strip advances to Drafting, Settings UI disappears after draft starts. WebSocket upgrade error resolved.
