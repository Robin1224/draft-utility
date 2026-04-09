> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-03
**Phase:** 03-draft-engine
**Mode:** discuss
**Areas discussed:** Pick/ban script design, Room settings panel, Class catalog, Draft state persistence

## Assumptions Presented

N/A — discuss mode (no pre-formed assumptions presented; gray areas surfaced and discussed).

## Discussion Log

### Pick/ban script design

| Question | Options presented | User selected |
|----------|------------------|---------------|
| How should the host override the pick/ban order? | Preset templates / Per-step manual ordering / Single configurable number | Per-step manual ordering |
| What should a single turn look like? | `{ team, action }` / `{ slot, team, action, label }` / You decide | `{ team: 'A'\|'B', action: 'pick'\|'ban' }` |
| What does per-step editing look like? | Drag-to-reorder list / Table with dropdowns / You decide | Drag-to-reorder list |
| How many turns does the default script have? | You decide (esports default) / I'll specify it | You decide — sensible esports-style default |

### Room settings panel

| Question | Options presented | User selected |
|----------|------------------|---------------|
| Where does the settings panel live? | Expandable in host bar / Modal / Separate page | Expandable section in the host bar |
| When can the host access it? | Lobby only — locked once draft starts / Always visible but greyed | Lobby only — locked once draft starts |

### Class catalog

| Question | Options presented | User selected |
|----------|------------------|---------------|
| What game/context? | TF2 / Custom set / Placeholder | Custom — Battlerite Champions (28 total, user listed all names) |
| Where does the catalog live? | Static JSON / DB seed / You decide | Static JSON bundled with the app |
| What fields does each entry need? | id + name / id + name + icon / id + name + description + icon | id + name only (v1) |
| Should champions be grouped by role? | Yes — group by role / Flat list / You decide | Yes — group by role (melee / ranged / support) |

**Champions provided by user:**
- Melee (9): Bakko, Jamila, Croak, Freya, Raigon, Rook, Ruh Kaan, Shifu, Thorn
- Ranged (10): Alysia, Ashka, Destiny, Ezmo, Iva, Jade, Jumong, Shen Rao, Taya, Varesh
- Support (9): Blossom, Lucie, Oldur, Pearl, Pestilus, Poloma, Sirius, Ulric, Zander

### Draft state persistence

| Question | Options presented | User selected |
|----------|------------------|---------------|
| Where does authoritative draft state live? | DB-persisted per pick/ban / In-memory / DB JSONB snapshot | DB-persisted per pick/ban (draft_action table) |
| Should room settings be persisted to DB? | Yes — save to room row / In-memory only until draft starts | In-memory only until draft starts |

## Corrections Made

No corrections — all selections were first-time decisions.

## Deferred Ideas

- Champion icons/images (user selected id + name only for v1)
- No out-of-scope capabilities introduced during discussion
