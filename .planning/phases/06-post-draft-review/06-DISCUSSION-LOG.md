# Phase 6: Post-Draft Review - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 06-post-draft-review
**Areas discussed:** Review layout, Shareable link, Post-review actions, Chat in review

---

## Review Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Two columns, turn order | Team A \| Team B columns, picks/bans in the order they happened | |
| Sequential timeline | Single table of all turns in global order | |
| Grouped by type | Two sections per team: Bans then Picks | ✓ |

**User's choice:** Grouped by type — bans section then picks section per team, two-column layout
**Notes:** Selected with preview showing `Team A | Team B` with `Bans:` and `Picks:` subsections

---

## Shareable Link

| Option | Description | Selected |
|--------|-------------|----------|
| Same /draft/[id] URL | Existing URL, unauthenticated visitors see review UI when phase=review | ✓ |
| Dedicated /review/[id] route | Separate read-only route for sharing | |

**User's choice:** Same `/draft/[id]` URL
**Notes:** No new route needed; existing `+page.server.js` already handles unauthenticated load

---

## Post-Review Actions

| Option | Description | Selected |
|--------|-------------|----------|
| Home button only | "Back to home" link, terminal state | |
| Home + copy link | Back to home plus copy-link button | ✓ |
| No CTAs | Pure read-only, no buttons | |

**User's choice:** Home + copy link
**Notes:** Copy-link pattern already exists in lobby; reuse same pattern

---

## Chat in Review

| Option | Description | Selected |
|--------|-------------|----------|
| No — hide chat | ChatPanel removed in review phase, full-width summary | ✓ |
| Yes — keep chat visible | Chat panel stays accessible during review | |

**User's choice:** Hide chat — clean summary-only layout

---

## Claude's Discretion

- Exact component name for review summary
- Visual style of ban/pick items (card/chip vs plain list)
- Team heading labels
- Edge case handling for cancelled draft

## Deferred Ideas

None
