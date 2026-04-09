# Phase 2: Room & Lobby - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 02-room-lobby
**Areas discussed:** Room links & IDs, Lobby layout & phases

---

## Room links & IDs

| Option | Description | Selected |
|--------|-------------|----------|
| Single `/draft/[id]` for lobby + draft + review | One slug; phase in-app | ✓ |
| `/room/[id]` then `/draft/[id]` | Split routes | |
| You decide | Planner picks | |

| Option | Description | Selected |
|--------|-------------|----------|
| Short 6–8 char code | Human-friendly id in URL | ✓ |
| Opaque UUID/nanoid | No short code | |
| You decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Copy full absolute URL | ROOM-07 clipboard | ✓ |
| Address bar only | No button | |
| You decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Code only | | |
| Pasted URL only | | |
| Both code and URL | Join input | ✓ |

**User's choice:** Reply **`defaults`** — all recommended options for Area 1 (single `/draft/[id]`, short code, full URL copy, both join inputs).

**Notes:** Aligns with existing `Create.svelte` / `Join.svelte` targeting `/draft/...`.

---

## Lobby layout & phases

| Option | Description | Selected |
|--------|-------------|----------|
| Two columns Team A \| Team B | Side-by-side | ✓ |
| Stacked teams | Vertical | |
| You decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Full Phases strip; Lobby active; others disabled | | ✓ |
| Lobby-only strip until draft | | |
| You decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Collapsible spectators | | ✓ |
| Always visible list | | |
| You decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Host badge + grouped host controls | | ✓ |
| Minimal, no badge | | |
| You decide | | |

**User's choice:** **`defaults`** for Area 2.

**Notes:** Host-only actions grouped per D-08; exact component boundaries left to implementation.

---

## Claude's Discretion

- Join/guest UX detail, host confirmation flows, ROOM-08 policy — not tabled; see CONTEXT.md **Claude's Discretion**.

## Deferred Ideas

- Phase 2 scope gray areas **3 (join/guest)**, **4 (host UX detail)**, **5 (cleanup)** were not selected for discussion; requirements still apply.
