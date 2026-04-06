# Phase 6: Post-Draft Review - Research

**Researched:** 2026-04-06
**Domain:** SvelteKit SSR page branching, Drizzle DB query, Svelte 5 component authoring
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Two-column layout (Team A | Team B), each with two grouped sections: Bans first, then Picks. Items listed as a simple list of class names (not turn order within the group).
- **D-02:** Bans and picks resolved to display names via the existing `classes.json` catalog (same pattern as DraftBoard.svelte).
- **D-03:** Data loaded server-side (SSR) from the `draft_action` table in `+page.server.js` — no real-time subscription needed for a completed draft.
- **D-04:** `completeDraft()` in `draft.js` must be updated to set `phase='review'` (not `'ended'`). The `Phases.svelte` strip already expects `'review'` as the third phase value. The `phaseForPhases()` helper in `+page.svelte` already handles `'review'` correctly.
- **D-05:** The shareable link is the existing `/draft/[id]` URL. When `phase === 'review'`, unauthenticated visitors who open the URL see the review UI directly. No new route required.
- **D-06:** The `+page.server.js` load already returns `userId: null` for unauthenticated users without throwing — no auth guard changes needed.
- **D-07:** The review page shows two CTAs: "Back to home" (link to `/`) and "Copy link" (copies the room URL to clipboard). Same copy-link pattern as the existing lobby.
- **D-08:** No "start new draft" action — the room is in a terminal state. Users who want a new draft go home and create a fresh room.
- **D-09:** The ChatPanel is hidden during the review phase. The review layout is full-width summary only — no sidebar.

### Claude's Discretion

- Exact component name for the review summary (e.g. `DraftReview.svelte`)
- Whether bans and picks use a card/chip style or plain list
- Heading labels ("Team A" vs player names if available from snapshot)
- Empty-team edge case handling (cancelled draft landing on review — unlikely but defensive)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POST-01 | After the draft completes, a summary view shows all bans and picks per team in pick order; visible to all participants and spectators | D-01 through D-04 define exact layout and data source. SSR load from `draft_action` table, name resolution via `classes.json`. |
| POST-02 | Post-draft summary has a shareable link that anyone can open (no auth required to view) | D-05/D-06 confirm existing `/draft/[id]` URL works for unauthenticated visitors when `userId: null` path exists. Critical caveat: `getRoomByPublicCode` hides rooms with `ended_at != null` — `completeDraft` must NOT set `ended_at` for review phase. |
</phase_requirements>

---

## Summary

Phase 6 is a thin, predominantly frontend change to an already well-built system. The back-end requires two surgical edits: changing `completeDraft()` to set `phase='review'` instead of `phase='ended'`, and extending the `+page.server.js` load function to query `draft_action` rows when the room is in review phase. The front-end requires one new molecule component (`DraftReview.svelte`) and one new branch in `+page.svelte`.

The most significant research finding is a **blocking integration hazard**: `getRoomByPublicCode` returns `null` for any room where `ended_at != null` (via `shouldHideRoomFromPublic` in `room-lifecycle.js`). Currently `completeDraft` sets both `phase='ended'` AND `ended_at=now`. If the phase is changed to `'review'` but `ended_at` is still set, the `+page.server.js` load will 404 for review rooms — making the shareable link broken. The fix is to **not set `ended_at`** in `completeDraft` when transitioning to `'review'`. The ROOM-08 lazy-abandon TTL path only checks `phase === 'lobby'`, so leaving `ended_at` null for review rooms will not cause orphan accumulation — review rooms will persist indefinitely until a separate cleanup strategy is implemented (out of scope for v1).

No new dependencies are required. The entire phase is implemented using existing stack: Svelte 5, SvelteKit SSR, Drizzle, Tailwind CSS v4, and the existing `DraftSlot.svelte` atom.

**Primary recommendation:** Fix the `ended_at` hazard in `completeDraft` before writing any UI code. Everything else in this phase is additive.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SvelteKit | existing | SSR load function, page routing | Project framework |
| Svelte 5 | existing | `DraftReview.svelte` component | Project framework |
| Drizzle ORM | existing | `draft_action` SELECT query in load function | Project ORM |
| Tailwind CSS v4 | existing | Styling with `@theme` tokens | Project CSS tool |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `classes.json` | bundled | Champion id-to-name catalog | Name resolution in `DraftReview.svelte` |
| `DraftSlot.svelte` | existing | Render individual pick/ban cards | Reuse unchanged — already handles filled/empty states |
| `Phases.svelte` | existing | Phase strip in Header | No changes needed — already renders `'review'` as third phase |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

No new directories. Files to create or modify:

```
src/
├── lib/
│   ├── components/molecules/
│   │   └── DraftReview.svelte          # NEW — two-column review layout
│   └── server/
│       └── draft.js                    # MODIFY — completeDraft phase='review', no ended_at
├── routes/draft/[id]/
│   ├── +page.server.js                 # MODIFY — load draft_action rows for review phase
│   └── +page.svelte                    # MODIFY — add {:else if snapshot.phase === 'review'} branch
```

### Pattern 1: SSR load extension for review phase

**What:** `+page.server.js` queries `draft_action` rows ordered by `turn_index` when the room phase is `'review'`. Uses the existing Drizzle import already present in the server module tree via `draft.js`.

**When to use:** Whenever SSR load needs to extend a resource query conditionally on phase.

**Key detail:** The load function currently uses `getRoomByPublicCode` to look up the room. This function hides rooms with `ended_at != null`. Since `completeDraft` for review phase must NOT set `ended_at`, this continues to work. If `ended_at` were set, the load would 404 silently.

**Example:**
```javascript
// src/routes/draft/[id]/+page.server.js
import { error } from '@sveltejs/kit';
import { parseRoomCode } from '$lib/join-parse.js';
import { db } from '$lib/server/db';
import { getRoomByPublicCode } from '$lib/server/rooms';
import { loadDraftSnapshot } from '$lib/server/draft.js';

export async function load({ params, locals, url }) {
  const code = parseRoomCode(params.id ?? '');
  const row = await getRoomByPublicCode(db, code);
  if (!row) {
    error(404, { message: 'Room not found' });
  }

  const base = {
    room: {
      public_code: row.public_code,
      phase: row.phase,
      host_user_id: row.host_user_id
    },
    userId: locals.user?.id ?? null,
    appOrigin: url.origin
  };

  if (row.phase === 'review') {
    // loadDraftSnapshot already returns actions array ordered by turn_index
    const snap = await loadDraftSnapshot(db, code);
    return {
      ...base,
      actions: snap?.actions ?? [],
      teams: snap?.teams ?? { A: [], B: [] }
    };
  }

  return base;
}
```

### Pattern 2: Phase branch in +page.svelte

**What:** Add `{:else if snapshot.phase === 'review'}` between the existing `'drafting'/'cancelled'` branch and the lobby `{:else}` fallback.

**When to use:** Phase transitions that require entirely different UI layouts.

**Key detail:** The review branch must NOT render `ChatPanel` (D-09). The `snapshot` derived value in `+page.svelte` comes from the live stream — once the server publishes `phase='review'`, clients subscribed to the lobby stream will receive the updated snapshot and the branch will switch automatically. No page navigation required for participants who are already on the page.

**Example:**
```svelte
{:else if snapshot.phase === 'review'}
  <!-- Full-width review layout, no ChatPanel -->
  <div class="flex flex-col items-center gap-8 px-4 py-8 text-text-primary w-full">
    <h2 class="text-2xl font-semibold text-text-primary">Draft complete</h2>
    <div class="flex items-center gap-3">
      <a href="/" class="rounded-md border border-bg-secondary px-3 py-2 text-sm font-medium text-text-primary hover:bg-bg-secondary">Back to home</a>
      <button type="button" class="rounded-md border border-bg-secondary px-3 py-2 text-sm font-medium text-text-primary hover:bg-bg-secondary" onclick={copyLink}>Copy link</button>
      {#if copied}<span class="text-sm text-green-600" role="status">Copied</span>{/if}
    </div>
    <DraftReview actions={data.actions ?? []} teams={data.teams ?? snapshot.teams} />
  </div>
```

### Pattern 3: DraftReview.svelte name resolution

**What:** Import `classes.json` with JSON import assertion (same as DraftBoard.svelte), filter by team and action, resolve `champion_id` to display name. Skip null `champion_id` entries (timeout slots).

**When to use:** Any component that needs champion id-to-name resolution.

**Example:**
```svelte
<script>
  import classes from '$lib/catalog/classes.json' with { type: 'json' };

  let { actions, teams } = $props();

  // Filter to a team's bans, resolve names, skip null champion_id
  const bansA = $derived(
    actions
      .filter(a => a.team === 'A' && a.action === 'ban' && a.champion_id != null)
      .map(a => classes.find(c => c.id === a.champion_id)?.name ?? a.champion_id)
  );

  const picksA = $derived(
    actions
      .filter(a => a.team === 'A' && a.action === 'pick' && a.champion_id != null)
      .map(a => classes.find(c => c.id === a.champion_id)?.name ?? a.champion_id)
  );
  // Same for Team B
</script>
```

### Anti-Patterns to Avoid

- **Setting `ended_at` in `completeDraft` for review phase:** `shouldHideRoomFromPublic` returns `true` when `ended_at != null`. Room becomes invisible to all load functions, breaking the shareable link.
- **Using a live stream subscription in the review page:** D-03 explicitly locks this as SSR-only. No `lobby()` stream call in the review branch.
- **Keeping ChatPanel in review:** D-09 explicitly removes it. The `mainClass` flex-row layout in `+page.svelte` must change for the review branch (no sidebar, full-width centered).
- **Adding a new route for the review:** D-05 locks the existing `/draft/[id]` URL as the review URL. No new route.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Champion name resolution | Custom lookup table | `classes.json` + `Array.find` | Already established pattern in DraftBoard.svelte; catalog is the authoritative source |
| Pick/ban card rendering | Custom card component | `DraftSlot.svelte` | Already handles filled/empty states, aria-labels, min-height touch targets |
| Phase strip update | Manually update Phases.svelte | No change needed | Already renders `'review'` as third step — triggers automatically when phase='review' |
| Clipboard write | Custom clipboard handler | Reuse `copyLink()` from +page.svelte | Identical behavior with 2-second timer already implemented |
| Ordered action loading | Custom sort logic | `loadDraftSnapshot()` — already orders by `turn_index` asc | Existing function returns actions in correct order |

**Key insight:** This phase is largely wiring existing pieces together. The only net-new artifact is `DraftReview.svelte`. Everything else is modification of existing files.

---

## Runtime State Inventory

> This phase does not rename or refactor any stored identifiers. Omit full inventory.

**Relevant note:** `completeDraft` currently writes `phase='ended'` to the `room` table. After this phase, it will write `phase='review'`. No existing rooms are affected (all rooms currently in `'ended'` state will remain in `'ended'` state — they are already hidden by `getRoomByPublicCode`).

---

## Common Pitfalls

### Pitfall 1: `ended_at` blocks review page load (CRITICAL)

**What goes wrong:** Developer changes `completeDraft` to `phase='review'` but leaves `ended_at: now` in place. `getRoomByPublicCode` checks `ended_at != null` before checking `phase`, so it returns `null`. `+page.server.js` then throws a 404 for every review URL. The shareable link is permanently broken for all completed drafts.

**Why it happens:** The hide logic in `shouldHideRoomFromPublic` is intentionally aggressive — any room with `ended_at` set is considered expired. This was correct for `'ended'` rooms but conflicts with `'review'` rooms needing to be readable.

**How to avoid:** In `completeDraft`, set `phase='review'` but do NOT set `ended_at`. Leave `ended_at` as `null`.

**Warning signs:** Opening any completed draft URL after the phase change returns a 404 in `+page.server.js`.

### Pitfall 2: Snapshot vs. data.actions for review rendering

**What goes wrong:** Developer renders `DraftReview` with `snapshot.actions` (from the live stream) instead of `data.actions` (from SSR load). For participants who transition to review while the stream is still live, `snapshot` will have the full actions array. But for unauthenticated visitors who load the page cold (the POST-02 shareable link use case), `snapshot` will be `null` because there is no stream subscription for review phase. The review will render blank.

**Why it happens:** The live stream (`lobby()`) returns `null` when there is no active subscription, and unauthenticated users never subscribe.

**How to avoid:** Render `DraftReview` from `data.actions` (server-loaded) always. For participants transitioning from draft to review in the same session, the stream snapshot may still be available — fallback to `snapshot.actions` only if `data.actions` is absent (edge case).

**Warning signs:** Review works for the captain who just completed the draft but shows blank for someone opening the shareable link.

### Pitfall 3: `mainClass` flex-row puts review inside a sidebar layout

**What goes wrong:** The review branch in `+page.svelte` renders `DraftReview` inside the existing `mainClass` which is `flex flex-row items-start gap-4 px-4 py-6`. Without overriding layout for the review branch, the full-width centered design from the UI-SPEC is broken — content appears as a narrow left column.

**Why it happens:** The lobby and draft branches share a flex-row layout with ChatPanel as a sidebar. The review branch requires full-width centered layout (no sidebar — D-09).

**How to avoid:** The review branch should override the outer layout. One approach: wrap review content in a `<div class="w-full flex flex-col items-center ...">` that ignores the flex-row parent. Alternatively, hoist the layout decision to the `{#if}` branches and apply different outer wrappers.

**Warning signs:** Review content renders left-aligned in a narrow column rather than full-width centered.

### Pitfall 4: `autoAdvanceTurn` completes draft but does not publish `phase='review'` snapshot

**What goes wrong:** When the final turn is auto-advanced by timer (no captain action), `autoAdvanceTurn` calls `completeDraft` but does not publish a new snapshot to subscribers afterward. Participants watching the draft when it ends via timeout do not see the review UI — they stay on the draft UI indefinitely.

**Why it happens:** The existing `autoAdvanceTurn` logic has a conditional publish (`if (platform)`) that runs AFTER the `completeDraft` call. If `platform` is null (grace timer path) or the snapshot published is stale (phase still `'drafting'`), clients do not transition.

**How to avoid:** After `completeDraft`, call `loadDraftSnapshot` and publish the updated snapshot (which now has `phase='review'`) to the topic. Verify this publish happens in both the `pickBan` RPC path and the `autoAdvanceTurn` timer path.

**Warning signs:** Draft completes via timer but no clients transition to review. Only a page refresh reveals the review state.

### Pitfall 5: `loadDraftSnapshot` requires room to not be hidden

**What goes wrong:** `loadDraftSnapshot` calls `getRoomByPublicCode` internally. If `ended_at` is set (Pitfall 1 scenario), `loadDraftSnapshot` returns `null`, and the SSR load returns empty `actions: []` rather than throwing an error — silently producing a blank review page.

**Why it happens:** `loadDraftSnapshot` propagates the `null` return from `getRoomByPublicCode` rather than throwing. The load function treats `null` actions as an empty state.

**How to avoid:** Resolves automatically once Pitfall 1 is fixed (no `ended_at` for review rooms).

---

## Code Examples

Verified patterns from existing codebase:

### completeDraft change (draft.js)

```javascript
// BEFORE:
export async function completeDraft(db, roomId) {
  const now = new Date();
  await db
    .update(room)
    .set({ phase: 'ended', ended_at: now, updated_at: now })
    .where(eq(room.id, roomId));
}

// AFTER:
export async function completeDraft(db, roomId) {
  await db
    .update(room)
    .set({ phase: 'review', updated_at: new Date() })
    .where(eq(room.id, roomId));
}
// ended_at intentionally omitted — review rooms must remain visible to getRoomByPublicCode
```

### loadDraftSnapshot already returns actions ordered by turn_index (draft.js lines 53-58)

```javascript
const actions = await db
  .select()
  .from(draft_action)
  .where(eq(draft_action.room_id, roomRow.id))
  .orderBy(asc(draft_action.turn_index));
return { ...base, draftState, actions };
```

This is the exact query needed for the review. The `+page.server.js` extension can call `loadDraftSnapshot` directly rather than duplicating the query.

### Name resolution pattern (DraftBoard.svelte line 3 + pattern)

```javascript
import classes from '$lib/catalog/classes.json' with { type: 'json' };
// ...
classes.find(c => c.id === champion_id)?.name
```

### copyLink already implemented in +page.svelte (lines 88-101)

```javascript
async function copyLink() {
  actionError = null;
  try {
    await navigator.clipboard.writeText(fullUrl);
    if (copyTimer) clearTimeout(copyTimer);
    copied = true;
    copyTimer = setTimeout(() => {
      copied = false;
      copyTimer = null;
    }, 2000);
  } catch {
    actionError = 'Could not copy link';
  }
}
```

The `fullUrl` derived value (`${data.appOrigin}${draftPath}`) is already correct for the review page — no changes needed to the copy-link mechanism.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `completeDraft` sets `phase='ended'` | Must set `phase='review'` | This phase | Rooms remain visible to `getRoomByPublicCode`; review URL stays accessible |

**Deprecated/outdated:**

- `phase='ended'` for draft completion: replaced by `phase='review'` in this phase. The `'ended'` value remains valid for host-cancelled rooms (`cancelRoomAsHost` still sets `phase='ended'`). The distinction: `'ended'` = host-terminated before completion, `'review'` = completed normally, `'cancelled'` = cancelled during draft due to captain absence.

---

## Open Questions

1. **ROOM-08 for review rooms**
   - What we know: `completeDraft` will no longer set `ended_at`, so review rooms accumulate in the DB with no expiry
   - What's unclear: Should a separate cleanup TTL be added (e.g., 7 days after `updated_at`)?
   - Recommendation: Defer to v2. ROOM-08 requirement is about join closure (not data purge). Review rooms will be join-closed because `phase !== 'lobby'` and `phase !== 'drafting'` — no new members can join. DB accumulation is a v2 ops concern.

2. **`shouldHideRoomFromPublic` — should it explicitly whitelist `'review'`?**
   - What we know: The function currently only checks `ended_at` and `phase === 'ended'`. After this phase, review rooms have neither, so they pass through correctly.
   - What's unclear: Future phases might add new terminal phases and accidentally expose them.
   - Recommendation: No change needed for v1. Add a comment to `shouldHideRoomFromPublic` noting `'review'` is intentionally not hidden.

3. **Live stream subscription for participants transitioning to review**
   - What we know: Participants already subscribed to the `lobby:code` stream when the draft completes will receive a `set` event with `phase='review'`. The `+page.svelte` snapshot derived value will update and the `{:else if snapshot.phase === 'review'}` branch will render.
   - What's unclear: The review branch uses `data.actions` (SSR-loaded). When transitioning from draft to review without a page reload, `data.actions` will be empty (it was loaded before the draft completed). The review will render with zero picks/bans.
   - Recommendation: In the review branch, fall back to `snapshot.actions` when `data.actions` is absent or empty, or trigger a page invalidation when the phase transitions to `'review'`.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — all changes are within existing project stack with no new services, CLIs, or runtimes required).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vite.config.js` (test key) — two projects: `client` (browser/Playwright) and `server` (node) |
| Quick run command | `npm run test -- --project=server --reporter=verbose` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| POST-01 (server) | `completeDraft` sets `phase='review'`, not `'ended'`, no `ended_at` | unit | `npm run test -- --project=server --reporter=verbose src/lib/server/draft.spec.js` | ✅ (extend existing file) |
| POST-01 (server) | `+page.server.js` load returns `actions` array when phase is `'review'` | unit | `npm run test -- --project=server --reporter=verbose src/routes/draft/\\[id\\]/page.server.spec.js` | ✅ (extend existing file) |
| POST-01 (UI) | `DraftReview.svelte` renders team columns with resolved ban/pick names | browser | `npm run test -- --project=client src/lib/components/molecules/DraftReview.svelte.spec.js` | ❌ Wave 0 |
| POST-02 | Review URL accessible without auth (`userId: null`) — load returns 200 with actions | unit | included in `page.server.spec.js` above | ❌ Wave 0 test case |

### Sampling Rate

- **Per task commit:** `npm run test -- --project=server --reporter=verbose src/lib/server/draft.spec.js`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/components/molecules/DraftReview.svelte.spec.js` — covers POST-01 UI rendering (browser project)
- [ ] Test case in `src/routes/draft/[id]/page.server.spec.js` — `load()` returns `actions` and `teams` when `phase='review'`
- [ ] Test case in `src/routes/draft/[id]/page.server.spec.js` — unauthenticated load (`userId: null`) succeeds for review phase

---

## Project Constraints (from CLAUDE.md)

| Directive | Implication for this phase |
|-----------|---------------------------|
| Language: JavaScript (JSDoc) | All new code uses JSDoc type annotations, no TypeScript syntax |
| Package Manager: npm | Use `npm install` — no yarn/pnpm |
| Add-ons include: vitest | New code must have tests; Wave 0 test stubs required |
| Add-ons include: tailwindcss | Styling via Tailwind utility classes and `@theme` tokens only |
| Svelte MCP server available | Use `svelte-autofixer` before finalizing any `.svelte` files |
| No new packages | Phase 6 requires no new dependencies — confirmed |

---

## Sources

### Primary (HIGH confidence)

- Direct code read: `src/lib/server/draft.js` — `completeDraft`, `loadDraftSnapshot` shapes
- Direct code read: `src/lib/server/room-lifecycle.js` — `shouldHideRoomFromPublic` logic
- Direct code read: `src/lib/server/rooms.js` — `getRoomByPublicCode` hide filter (lines 82-101)
- Direct code read: `src/routes/draft/[id]/+page.server.js` — existing load pattern
- Direct code read: `src/routes/draft/[id]/+page.svelte` — phase branching, copyLink, snapshot derivation
- Direct code read: `src/lib/components/molecules/DraftBoard.svelte` — `classes.json` import pattern
- Direct code read: `src/lib/components/atoms/DraftSlot.svelte` — reusable slot component API
- Direct code read: `src/lib/components/atoms/Phases.svelte` — already supports `'review'`
- Direct code read: `src/live/draft.js` — `completeDraft` call sites (lines 68, 159)
- Direct code read: `vite.config.js` — Vitest project configuration

### Secondary (MEDIUM confidence)

- `.planning/phases/06-post-draft-review/06-CONTEXT.md` — all locked decisions
- `.planning/phases/06-post-draft-review/06-UI-SPEC.md` — layout contract, component inventory, edge case states

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — no new libraries; all existing project code read directly
- Architecture patterns: HIGH — derived from direct code reading, not assumption
- Pitfalls: HIGH — Pitfall 1 (ended_at) and Pitfall 3 (layout) confirmed by reading actual code; Pitfall 2 (snapshot vs data.actions, Open Question 3) is MEDIUM — requires implementation decision

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable stack, no fast-moving dependencies)
