# Phase 11: Terminal Modals - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-21
**Phase:** 11-terminal-modals
**Areas discussed:** Bar ↔ modal split, Settings save semantics, Dismissal & keyboard behavior, Narrow screens & touch reorder

---

## Bar ↔ modal split

**Q1 — Where should ▶ START_DRAFT() live once the Host Console becomes a modal?**

| Option | Description | Selected |
|--------|-------------|----------|
| Both (Recommended) | Inline lobby bar for one-click start AND Host Console modal footer, same disabled-until-captains gating from one $derived source | ✓ |
| Modal footer only | Prototype-literal: bar becomes a pure launcher; starting always goes through the modal | |
| Bar only | Modal is roster-management only; footer holds just CANCEL_ROOM | |

**Q2 — What remains inline in the lobby bar once move/kick live in the Host Console modal?**

| Option | Description | Selected |
|--------|-------------|----------|
| Slim launcher bar (Recommended) | Bar keeps COPY_LINK, CONFIG(), HOST_CONSOLE(), ▶ START_DRAFT(), captain hint; move/kick UI moves entirely into the modal | ✓ |
| Keep quick-kick inline too | Bar keeps kick pills for fast moderation; modal duplicates them | |
| Keep everything, modal adds nothing new | Bar stays as Phase 10 built it; modal is a restyled duplicate view | |

**Q3 — Where does the CANCEL_ROOM danger action live?**

| Option | Description | Selected |
|--------|-------------|----------|
| Modal footer only (Recommended) | Host Console footer, left side, red — destructive action tucked behind the modal | ✓ |
| Both bar and modal | Keep the Phase 10 inline CANCEL button too | |
| Bar only | Keep cancel where it is; modal footer holds only START_DRAFT() | |

---

## Settings save semantics

**Q1 — How should the Draft Settings modal handle edits to the timer and pick/ban script?**

| Option | Description | Selected |
|--------|-------------|----------|
| Draft copy + commit (Recommended) | Modal edits a local copy; SAVE_CONFIG() writes back, CANCEL discards; no server call — settings apply at START_DRAFT | ✓ |
| Live-bound, like today | Keep the $bindable flow; SAVE_CONFIG() just closes | |
| You decide | Planner picks based on test-impact analysis | |

**Q2 — What should esc / scrim-click / ✕ do with unsaved edits?**

| Option | Description | Selected |
|--------|-------------|----------|
| Silently discard (Recommended) | All dismissals behave like CANCEL — no prompt | |
| Confirm if dirty | Dismissal on a modified form asks before closing | ✓ |
| Scrim saves, esc discards | Split behavior by gesture | |

**Notes:** User diverged from the recommendation here — safety over minimalism for config edits.

**Q3 — How should the discard confirmation be presented?**

| Option | Description | Selected |
|--------|-------------|----------|
| Inline footer swap (Recommended) | Footer becomes `// discard unsaved config?` with [DISCARD]/[KEEP_EDITING]; esc again = discard | ✓ |
| Nested mini-modal | Second .cy-modal stacked over settings | |
| Native confirm() | Browser dialog — breaks the aesthetic | |

---

## Dismissal & keyboard behavior

**Q1 — How should the modal shell be built?**

| Option | Description | Selected |
|--------|-------------|----------|
| Shared CyModal + <dialog> (Recommended) | Native dialog/showModal: esc, focus trap, focus-return free; ::backdrop as scrim; both modals compose via snippets | ✓ |
| Shared CyModal, div-based | Hand-rolled scrim + esc + focus trap matching prototype DOM exactly | |
| Per-modal markup, no wrapper | Each modal owns its plumbing like the prototype's two components | |

**Q2 — Which gestures close a modal?**

| Option | Description | Selected |
|--------|-------------|----------|
| esc + scrim + ✕ (Recommended) | All three dismiss — prototype-faithful | ✓ |
| esc + ✕ only | Scrim clicks inert | |
| ✕ only | Explicit button only | |

---

## Narrow screens & touch reorder

**Q1 — How should the two modals present on narrow/mobile widths?**

| Option | Description | Selected |
|--------|-------------|----------|
| Full-screen takeover (Recommended) | Below breakpoint: titlebar pinned top, footer pinned bottom, body scrolls; desktop keeps centered box | ✓ |
| Centered box at all sizes | Same centered .cy-modal everywhere | |
| You decide | Planner picks per cyber.css constraints | |

**Q2 — How should turn reordering work on touch devices?**

| Option | Description | Selected |
|--------|-------------|----------|
| Up/down buttons always (Recommended) | [↑]/[↓] on every row alongside the ⠿ grip; drag stays as desktop enhancement; also fixes keyboard a11y | ✓ |
| Pointer-events drag rewrite | Replace HTML5 drag with pointer events | |
| Desktop-only reorder | Touch users add/remove/edit rows but can't reorder | |

---

## Claude's Discretion

- Exact responsive breakpoint value for the full-screen takeover
- CSS placement per Phase 8 hybrid org (structural `.cy-modal*` etc. → app.css; one-offs scoped)
- Slim launcher bar's head label treatment
- Stepper hold-to-repeat (optional)
- Visual treatment behind the scrim (scrim dimming alone acceptable)

## Deferred Ideas

None — discussion stayed within phase scope.
