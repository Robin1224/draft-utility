---
phase: 2
slug: room-lobby
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-03
---

# Phase 2 — UI Design Contract

> Visual and interaction contract for **`/draft/[id]` lobby** (and shared chrome before draft starts). Aligns with [02-CONTEXT.md](02-CONTEXT.md) D-05–D-08 and [01-UI-SPEC.md](../01-auth-realtime-transport/01-UI-SPEC.md) design tokens.

---

## Design System (inherit Phase 1)

| Property | Value | Source |
|----------|-------|--------|
| Tool | none | Tailwind v4 `@theme`; hand-authored components |
| Font | Manrope | `src/routes/layout.css` |
| Primary CTA | `bg-amber-500` / `hover:bg-amber-400` | Create/Join pattern |
| Destructive / kick | `text-red-600` or destructive button variant | Host moderation |
| Layout chrome | `Header`, `Phases` | Existing molecules/atoms |

Spacing, typography, and color tokens: **reuse Phase 1 tables** ([01-UI-SPEC.md](../01-auth-realtime-transport/01-UI-SPEC.md) § Spacing, Typography, Color) unless noted below.

---

## Page: Lobby (`/draft/[id]` while phase = lobby)

**Structure (top → bottom):**

1. **`Header`** — unchanged pattern; may show signed-in user / link to login for guests.
2. **`Phases`** — props: `phase={1}` (Lobby). **Drafting** and **Review** segments are **visually disabled** (`opacity-50`, `pointer-events-none`, `aria-disabled="true"`) until server state advances phase.
3. **Host bar** (host-only, D-08) — horizontal region below phases: grouped **Kick** (opens target picker or row action), **Move player** (team A ↔ B, signed-in only), **Start draft** (primary button; **disabled** until both teams have a captain per ROOM-06). Use `amber` for Start when enabled; disabled uses `disabled:opacity-50`.
4. **Copy room link** (ROOM-07, D-03) — control labeled e.g. **Copy link**; on success show transient **Copied** feedback (text or toast pattern consistent with app — prefer inline `text-sm` success for v1). Copies **full absolute URL** to clipboard.
5. **Main grid** — **two columns** (D-05): **Team A** | **Team B** on `md+`; stack vertically on small screens (`flex-col` / `grid-cols-1` → `md:grid-cols-2`).
6. **Spectators** (D-07) — **collapsible** block below teams: closed by default on mobile; open by default optional on desktop (executor may choose one rule — document in component). Header: **Spectators (N)** + chevron; `button` or `details/summary` with keyboard support.

---

## Team column

- **Heading:** “Team A” / “Team B” — `text-xl font-semibold text-text-primary`.
- **Captain:** First member in list shows **Captain** badge (`text-xs` pill, `border border-bg-secondary` or `bg-bg-secondary`).
- **Roster:** List of players (avatar optional v1 — name + badge enough). Max **3** slots; empty slots show dashed placeholder **Empty** or **Open** (`text-text-tertiary text-sm`).
- **Join team** (signed-in, not on team, room in lobby): primary-style button per column **Join Team A** / **Join Team B**; hidden for guests (spectators — prompt sign-in via link to `/login?redirect=...` in discretion).
- **Guests:** Read-only roster; no join buttons.

---

## Host badge

- On host’s row (if listed in a team or separate host row): **Host** pill next to name — distinct from **Captain** (e.g. outline vs filled).

---

## Accessibility

- All icon-only host actions need **`aria-label`**.
- **Start draft** disabled state: `aria-disabled` + visible reason nearby (“Both teams need a captain”) — `text-sm text-text-tertiary` under button or `title` + screen reader text.
- Collapsible spectators: keyboard **Enter/Space** to toggle; `aria-expanded`.

---

## States

| State | UI |
|-------|-----|
| Loading room | Skeleton or centered spinner in main grid; phases strip visible |
| Room not found | Clear message + link home |
| Guest | No team join; spectator list read-only |
| Team full | Join hidden or disabled with “Team full” |
| Draft started | Host moves hidden/disabled; phase strip updates (Phase 3+ — lobby spec only ensures disabled styling for pre-draft controls) |

---

## Out of scope (this contract)

- Pick/ban UI, timers, chat panels (later phases).
- Room settings modal for order/timer (HOST-01, Phase 3).
