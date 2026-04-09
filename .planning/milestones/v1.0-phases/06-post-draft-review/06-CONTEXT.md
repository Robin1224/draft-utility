# Phase 6: Post-Draft Review - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

After the draft completes, all participants and spectators see a read-only summary of each team's picks and bans. Anyone with the room link can view the review without signing in. No interaction, no new draft from the same room — pure terminal display.

This phase does NOT include chat history persistence, per-user draft history, or any ability to start a new draft from the review page.

</domain>

<decisions>
## Implementation Decisions

### Review Display Layout

- **D-01:** **Two-column layout** (Team A | Team B), each with two grouped sections: **Bans** first, then **Picks**. Items listed as a simple list of class names (not turn order within the group).
- **D-02:** Bans and picks resolved to display names via the existing `classes.json` catalog (same pattern as DraftBoard.svelte).
- **D-03:** Data loaded **server-side (SSR)** from the `draft_action` table in `+page.server.js` — no real-time subscription needed for a completed draft.

### Phase Naming Fix

- **D-04:** `completeDraft()` in `draft.js` must be updated to set `phase='review'` (not `'ended'`). The `Phases.svelte` strip already expects `'review'` as the third phase value. The `phaseForPhases()` helper in `+page.svelte` already handles `'review'` correctly.

### Shareable Link (POST-02)

- **D-05:** The shareable link is the **existing `/draft/[id]` URL**. When `phase === 'review'`, unauthenticated visitors who open the URL see the review UI directly. No new route required.
- **D-06:** The `+page.server.js` load already returns `userId: null` for unauthenticated users without throwing — no auth guard changes needed.

### Post-Review Actions

- **D-07:** The review page shows two CTAs: **"Back to home"** (link to `/`) and **"Copy link"** (copies the room URL to clipboard). Same copy-link pattern as the existing lobby.
- **D-08:** No "start new draft" action — the room is in a terminal state. Users who want a new draft go home and create a fresh room.

### Chat in Review

- **D-09:** The **ChatPanel is hidden** during the review phase. The review layout is full-width summary only — no sidebar.

### Claude's Discretion

- Exact component name for the review summary (e.g. `DraftReview.svelte`)
- Whether bans and picks use a card/chip style or plain list
- Heading labels ("Team A" vs player names if available from snapshot)
- Empty-team edge case handling (cancelled draft landing on review — unlikely but defensive)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — POST-01 and POST-02 acceptance criteria
- `.planning/ROADMAP.md` — Phase 6 goal, success criteria, depends-on: Phase 4

### Existing patterns to follow
- `src/lib/server/draft.js` — `loadDraftSnapshot()` (returns actions array), `completeDraft()` (must change to phase='review')
- `src/lib/server/db/schema.js` — `draft_action` table shape (`turn_index`, `team`, `action`, `champion_id`)
- `src/lib/catalog/classes.json` — champion id → name catalog
- `src/lib/components/molecules/DraftBoard.svelte` — how classes.json is imported and used for name resolution
- `src/routes/draft/[id]/+page.svelte` — phase branching logic (add `'review'` branch alongside `'drafting'` and `'cancelled'`)
- `src/routes/draft/[id]/+page.server.js` — server load pattern (extend to include actions when phase='review')
- `src/lib/components/atoms/Phases.svelte` — already expects `'review'` as third phase value

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/catalog/classes.json`: Full champion catalog — import with `{ type: 'json' }` assertion, already done in DraftBoard.svelte
- `src/lib/components/atoms/Phases.svelte`: Already has "Review" as third strip item; will activate automatically once phase='review' is set
- `copyLink()` handler in `+page.svelte`: Copy-to-clipboard with copied/timer state — reuse or extract for review CTA

### Established Patterns
- Phase branching: `+page.svelte` uses `{#if snapshot.phase === 'drafting' || snapshot.phase === 'cancelled'}` block — add `{:else if snapshot.phase === 'review'}` branch
- SSR data: `+page.server.js` loads `room` row; extend with `draft_action` query when `phase === 'review'` (or always, cheaply)
- Champion name resolution: `classes.find(c => c.id === champion_id)?.name` pattern from DraftBoard

### Integration Points
- `completeDraft()` in `draft.js` — change `phase: 'ended'` → `phase: 'review'`; also check `room-lifecycle.js` which calls it on disconnect cancel path (`cancelDraftNoCaption` sets `phase='cancelled'`, not `completeDraft` — safe)
- `+page.svelte` phase branches: the `{:else}` fallback (lobby layout) will catch `'review'` until the new branch is added
- `loadDraftSnapshot()` already returns `actions` array ordered by `turn_index` — direct reuse for review data

</code_context>

<specifics>
## Specific Ideas

- Review layout mirrors the grouped-by-type mockup from discussion: bans section then picks section per team, two-column
- "Copy link" CTA is the same pattern already in the lobby (copy room URL, brief "Copied" confirmation)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-post-draft-review*
*Context gathered: 2026-04-06*
