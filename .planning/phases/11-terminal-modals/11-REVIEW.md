---
phase: 11-terminal-modals
reviewed: 2026-08-21T13:29:11Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/app.css
  - src/lib/components/atoms/CyModal.svelte
  - src/lib/components/atoms/CyModal.svelte.spec.js
  - src/lib/components/atoms/CyModalHost.test.svelte
  - src/lib/components/atoms/ScriptTurnRow.svelte
  - src/lib/components/molecules/DraftSettingsPanel.svelte
  - src/lib/components/molecules/DraftSettingsPanel.svelte.spec.js
  - src/lib/components/molecules/DraftSettingsPanelHost.test.svelte
  - src/lib/components/molecules/LobbyHostBar.svelte
  - src/lib/components/molecules/LobbyHostBar.svelte.spec.js
  - src/phase10-screens.spec.js
  - src/routes/draft/[id]/+page.svelte
findings:
  critical: 0
  warning: 6
  info: 6
  total: 12
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-08-21T13:29:11Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Reviewed the Phase 11 terminal-modal implementation: the native `<dialog>` wrapper (`CyModal`), the Draft Settings modal (`DraftSettingsPanel` + `ScriptTurnRow`), the host console (`LobbyHostBar`), the supporting CSS, and the lobby page wiring, plus their browser specs.

Hard-constraint verification (all pass):
- Frozen RPC callback signatures preserved: `onKick({userId?|guestId?})`, `onMove(userId, toTeam)`, `onStartDraft()`, `onCancelRoom()` — `+page.svelte` handlers match and `LobbyHostBar` invokes them with the frozen shapes.
- No new server calls — `$live` imports in `+page.svelte` unchanged; modals never touch `$live`.
- Host-only controls fully wrapped in `{#if isHost}` (`LobbyHostBar.svelte:74`), verified by spec T-11-01.
- No `{@html}` anywhere in reviewed files.
- Script data shape `{ id, team, action }` preserved end-to-end; `id` stripped before `startDraft` (`+page.svelte:128`).

The core state machinery (open/close sync, dirty-veto, single splice reorder path) is sound. However, the scrim-click dismissal heuristic (`e.target === dialogEl` on `click`) has two concrete failure modes (WR-01, WR-02), and the drag-reorder state has an unreset index that can misfire on external drags (WR-03). No Critical findings.

## Warnings

### WR-01: Text-selection drag ending on the backdrop dismisses the modal

**File:** `src/lib/components/atoms/CyModal.svelte:48-52`
**Issue:** Scrim dismissal is detected via the `click` event with `e.target === dialogEl`. Per the UI Events spec, `click` is dispatched on the nearest common ancestor of the `mousedown` and `mouseup` targets. If a user presses down inside the modal body (e.g. selecting text in the settings modal, or mis-dragging off a button) and releases over the backdrop, the common ancestor is the `<dialog>` itself — so `target === dialogEl` and the modal dismisses (or, when dirty, unexpectedly flips to the discard-confirm footer). The host console closes outright.
**Fix:** Track where the interaction started and only treat it as a scrim click when both ends land on the dialog:
```svelte
let pressOnScrim = false;
...
onpointerdown={(e) => (pressOnScrim = e.target === dialogEl)}
onclick={(e) => {
    if (pressOnScrim && e.target === dialogEl) requestDismiss();
    pressOnScrim = false;
}}
```

### WR-02: Full-screen takeover (≤640px): tapping empty space *inside* the modal dismisses it

**File:** `src/app.css:824-830` (interacts with `src/lib/components/atoms/CyModal.svelte:48-52`)
**Issue:** At ≤640px the dialog becomes `width: 100vw; height: 100dvh`. The dialog is a flex column of `.cy-modal-bar` + `.cy-modal-body` + optional `.cy-modal-foot`, and `.cy-modal-body` has no `flex: 1` — so when content is shorter than the viewport, the remaining space at the bottom is the bare `<dialog>` element. A tap there satisfies `e.target === dialogEl` and is treated as a scrim click, dismissing (or discard-confirming) the modal from what visually looks like *inside* the full-screen surface. There is no visible backdrop at this breakpoint, so no scrim dismissal should be possible at all.
**Fix:** Make the body absorb the leftover height in the takeover so the dialog element is never directly hittable:
```css
@media (max-width: 640px) {
  dialog.cy-modal { max-width: none; max-height: none; width: 100vw; height: 100dvh; margin: 0; }
  dialog.cy-modal[open] .cy-modal-body { flex: 1; }
}
```
(The pointerdown fix in WR-01 does not cover this case — both ends of the tap are on the dialog.)

### WR-03: `dragSrcIndex` never reset on drag end — external drags can trigger a phantom reorder

**File:** `src/lib/components/molecules/DraftSettingsPanel.svelte:104-122` (and `src/lib/components/atoms/ScriptTurnRow.svelte:51-53`)
**Issue:** `dragSrcIndex` is set in `handleDragStart` and only cleared inside `handleDrop` after a successful internal move. Two leak paths: (1) `handleDrop` early-returns at line 119 without resetting when `dragSrcIndex === dropIndex`; (2) if a row drag is cancelled (Escape) or dropped outside the list, `dragend` fires on the row but only clears the row-local `dragging` flag — the parent's `dragSrcIndex` stays stale. Because `ondragover` unconditionally calls `preventDefault()` (accepting *any* drag, including OS file drags), a subsequent file dragged from the desktop onto a row fires `handleDrop` with the stale index and silently reorders the script.
**Fix:** Add an `onDragEnd` callback from `ScriptTurnRow` that resets `dragSrcIndex = -1` in the parent, and guard the drop against external drags:
```js
function handleDrop(e, dropIndex) {
    e.preventDefault();
    const from = dragSrcIndex;
    dragSrcIndex = -1;
    if (from === -1 || from === dropIndex) return;
    moveTurn(from, dropIndex);
}
```

### WR-04: Switching chat tabs briefly renders the previous channel's messages under the new tab

**File:** `src/routes/draft/[id]/+page.svelte:180-195`
**Issue:** The chat `$effect` resubscribes when `activeChatStream` changes, but `chatStreamVal` is not reset at resubscription time. Between unsubscribing from the old stream and the first emission of the new one, `chatMessages` still holds the previous channel's messages — e.g. team-chat content is displayed under the "spectator" tab until the new stream emits. For a slow/empty channel this stale cross-channel display persists indefinitely.
**Fix:** Clear the buffer when the effect re-runs:
```js
$effect(() => {
    const store = activeChatStream(code);
    chatStreamVal = undefined; // drop previous channel's messages immediately
    const unsub = store.subscribe((val) => { chatStreamVal = val; });
    return unsub;
});
```

### WR-05: Lobby banner TURNS stat ignores the host's configured script — hardcoded `?? 10` fallback

**File:** `src/routes/draft/[id]/+page.svelte:323`
**Issue:** `{snapshot.draftState?.script?.length ?? 10}` — during the lobby phase `draftState` does not exist yet (the script is only sent to the server at `startDraft`), so the banner always shows `10`. If the host uses CONFIG() to add/remove turns (e.g. saves a 12-turn script), the banner keeps displaying 10 while the draft will actually run 12 turns. The magic number also duplicates `DEFAULT_SCRIPT.length`.
**Fix:** Fall back to the live local config, which is the value `handleStart` will actually send:
```svelte
<div><b>{snapshot.draftState?.script?.length ?? draftScript.length}</b><span>TURNS</span></div>
```
(Note: non-host clients cannot see the host's local config either way; this at least makes the host's own view truthful.)

### WR-06: Host console EXEC can fire `onMove` for a member who already left the room

**File:** `src/lib/components/molecules/LobbyHostBar.svelte:36,68-71,116-136`
**Issue:** `moveUserId` is bound to the select but never revalidated against the live roster. If the selected player leaves or is kicked while the console is open, their `<option>` disappears from `movableUsers` but the bound `moveUserId` keeps the stale id — the select renders no selection, yet EXEC stays enabled (`!moveUserId` is false) and clicking it calls `onMove('u2', ...)` for a non-member, producing a guaranteed server error surfaced as `actionError`. The stale id also persists across console close/reopen.
**Fix:** Gate EXEC on the id still resolving to a roster member:
```svelte
const moveTargetValid = $derived(movableUsers.some((m) => m.userId === moveUserId));
...
disabled={!moveTargetValid || snapshot.phase !== 'lobby'}
```

## Info

### IN-01: Dirty check depends on non-reactive `base` — correctness rides on draft ref churn

**File:** `src/lib/components/molecules/DraftSettingsPanel.svelte:31,56-59`
**Issue:** `base` is a plain (non-reactive) variable read inside `$derived.by`. Reassigning `base` on open never invalidates `dirty` by itself; the derived only recomputes because `draft.script` is always assigned a fresh array reference in the same effect. That coupling currently holds (a `structuredClone` is never a no-op write), but it is fragile — any future refactor that skips the draft rewrite when values are equal would leave `dirty` stale.
**Fix:** Make the snapshot reactive (`let base = $state(null)`) or add a comment pinning the invariant that `draft` must be rewritten whenever `base` is.

### IN-02: `kickPayload` can return `{}` — empty payload passed to the frozen `onKick`

**File:** `src/lib/components/molecules/LobbyHostBar.svelte:62-66`
**Issue:** A member with neither `userId` nor `guestId` yields `onKick({})`, which would hit `kickMember(code, {})` and fail server-side. The data model should make this impossible, but the fallback silently produces a doomed RPC instead of guarding.
**Fix:** Filter identity-less members out of `removableMembers`, or no-op in the click handler when the payload is empty.

### IN-03: `copyTimer` not cleared on page destroy

**File:** `src/routes/draft/[id]/+page.svelte:36-37,73-86`
**Issue:** The 2s `setTimeout` in `copyLink` is never cancelled on unmount; it fires after navigation and writes `copied = false` on destroyed state. Harmless today, but a dangling timer.
**Fix:** Clear it in an `$effect(() => () => { if (copyTimer) clearTimeout(copyTimer); })` teardown.

### IN-04: `dragOver` highlight flickers when the drag passes over row children

**File:** `src/lib/components/atoms/ScriptTurnRow.svelte:54-61`
**Issue:** `dragleave` fires on the `<li>` whenever the pointer enters a child (`select`, buttons), momentarily clearing `dragOver` before the next `dragover` re-sets it — the `is-drag` dashed border flickers during drag. Cosmetic only.
**Fix:** Ignore leaves into own children: `ondragleave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) dragOver = false; }}`.

### IN-05: `draggable="true"` on the whole row can interfere with `<select>` interaction in Firefox

**File:** `src/lib/components/atoms/ScriptTurnRow.svelte:43-46`
**Issue:** Firefox is known to initiate drags from interactive children inside a `draggable` ancestor, which can make opening the team/action selects unreliable. The ↑/↓ buttons provide a full fallback path (D-11), so this is informational.
**Fix:** If reports surface, set `draggable` dynamically (only while the pointer is on the ⠿ grip).

### IN-06: Out-of-range incoming `timerSeconds` is not clamped on open

**File:** `src/lib/components/molecules/DraftSettingsPanel.svelte:39-48,144-155`
**Issue:** The stepper clamps to [10, 120] only on interaction. If the bound `timerSeconds` ever arrives outside that range (persisted state, future caller), the modal displays and can re-save an out-of-range value.
**Fix:** Clamp during the open snapshot: `draft.timerSeconds = Math.min(120, Math.max(10, base.timerSeconds));` (and decide whether that should count as dirty).

---

_Reviewed: 2026-08-21T13:29:11Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
