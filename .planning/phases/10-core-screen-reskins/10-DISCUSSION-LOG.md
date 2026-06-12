# Phase 10: Core Screen Reskins - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-12
**Phase:** 10-core-screen-reskins
**Areas discussed:** Reskin strategy, Drafting chat layout, Home boot-log copy, Countdown urgency

---

## Reskin strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Restyle in place | Keep components' data wiring + markup; add `.cy-*` classes, port cyber.css per-screen styles. Lowest risk to frozen behavior/tests. | ✓ |
| Rebuild to match prototype | Author new markup mirroring cyber.jsx verbatim; re-thread `$live` wiring. Highest fidelity, highest churn/risk. | |
| Hybrid | Restyle most, rebuild the few (Home/Drafting) where structure differs. | |

**User's choice:** Restyle in place
**Notes:** Phase 8 removed Tailwind, so the existing components are currently unstyled — the phase re-clothes them in Cyber. cyber.jsx is the visual reference, not a verbatim transcription source.

---

## Drafting chat layout

| Option | Description | Selected |
|--------|-------------|----------|
| Responsive | Desktop sidebar, collapses to drawer on mobile. | ✓ |
| Sidebar always | Fixed right sidebar at all widths (matches prototype directly). | |
| Drawer always | Toggleable drawer at all widths; board full-width. | |

**User's choice:** Responsive
**Notes:** Breakpoint value left to Claude's discretion.

---

## Home boot-log copy

| Option | Description | Selected |
|--------|-------------|----------|
| Keep verbatim | Ship Phase 9 CY_BOOT_LINES as-is (./draftnet, 28 found, booting interface_). | |
| Draft-themed rewrite | New draft-domain boot sequence. | ✓ |
| Keep, tweak wording | Mostly verbatim, minor line edits. | |

**User's choice:** Draft-themed rewrite → then selected the specific sequence below.

### Boot sequence selection

| Option | Sequence | Selected |
|--------|----------|----------|
| Draftnet boot | `$ ./draftnet --init` → catalog/team channels/turn timer/chat filter → `> awaiting captains_` | |
| Connect narrative | `$ draft --connect` → handshake/sync catalog/team channels/turn clock → `> ready_` | ✓ |
| I'll write my own | User-provided lines | |

**User's choice:** Connect narrative. Final captured CY_BOOT_LINES:
```
$ draft --connect
[ OK ] handshake with draftnet ...... ok
[ OK ] syncing champion catalog ..... 28
[ OK ] team channels A/B ............ open
[ OK ] turn clock .................... 30s
> ready_
```

---

## Countdown urgency

| Option | Description | Selected |
|--------|-------------|----------|
| Last 10s, red + pulse | Red + pulse for final 10s; reduced-motion = color only. | |
| Last 5s, red + pulse | Red + pulse for final 5s; reduced-motion = color only. | ✓ |
| Red only, no motion | Color shift only, no pulse. | |

**User's choice:** Last 5s, red + pulse
**Notes:** Reuse `cy-blink`; under prefers-reduced-motion, color shift only (no pulse).

## Claude's Discretion

- Per-screen CSS placement (app.css vs scoped), responsive breakpoint value, `hot` shader placement beyond Home, champion-grid density, empty/loading/error-state presentation.

## Deferred Ideas

- Terminal modals (Draft Settings, Host Console) — Phase 11.
- Access control + secondary screens (Connecting, Guest Gate 403, Room Cancelled/SIGKILL) — Phase 12.
