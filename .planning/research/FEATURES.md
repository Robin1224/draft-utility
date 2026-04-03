# Features Research

**Domain:** Real-time competitive-style pick/ban draft (two teams, predefined class list, spectators)  
**Researched:** 2026-04-03  
**Sources:** `.planning/PROJECT.md`, `.planning/codebase/ARCHITECTURE.md`, product patterns from esports draft/lobby tooling (web research — **MEDIUM** confidence on industry breadth; **HIGH** alignment with stated project requirements)

---

## Table Stakes

Features users expect from “champion select–style” tools. Missing these feels broken or unfair.

| Feature | Why expected | Complexity | Notes |
|--------|----------------|------------|--------|
| **Room identity** (create / join by id, stable link) | Without it, people cannot assemble | Low | Core entry; pairs with SSR-safe shareable URL |
| **Phase clarity** (lobby → drafting → review) | Reduces “where are we?” confusion | Low | Already reflected in UI shell (`Phases`) |
| **Two-sided teams** (fixed max roster, e.g. 3) | Pick/ban is symmetric competition | Med | Auth-gated roster vs guests |
| **Authoritative turn order** | Fairness; who acts when must be obvious | Med | Server-sourced state; UI mirrors it |
| **Pick/ban from a single shared pool** | Prevents double picks; mirrors real drafts | Med | Grey out / lock taken options for everyone |
| **Visible timers per turn** | Pressure + parity with broadcast drafts | Med | Default ~30s; host-configurable per PROJECT |
| **Host-controlled start** | Prevents trolls starting early; clear gating | Low | “Start draft” + minimum viable roster rules |
| **Minimum start conditions** (e.g. captain per team, min players) | Avoids invalid or trivial drafts | Med | PROJECT: both teams need captain; ≥2 players |
| **Spectator mode (read-only draft)** | Friends/casters watch without acting | Med | Separate permission channel from players |
| **Real-time sync** | Draft is a live ceremony | High | Not yet in codebase; table stakes for *shipping* the product promise |
| **Post-draft summary** | Outcome is the artifact people keep | Low–Med | All bans/picks in order; readable export optional later |
| **Disconnect handling for acting role** | Otherwise one AFK bricks the session | High | PROJECT: pause → grace → captain promotion or cancel |
| **Basic chat channels** (team-only + spectator-only) | Coordination without leaking strats | Med | Table stakes for team games; global “all chat” optional |

---

## Differentiators

Not strictly required to call the product a “draft,” but create a sharper, more defensible experience vs a minimal room + list.

| Feature | Value proposition | Complexity | Notes |
|--------|---------------------|------------|--------|
| **Host-adjustable draft script** (ban/pick counts, phase order presets) | Same app serves multiple titles / scrim rules | Med–High | PROJECT: defaults + host overrides in room settings |
| **Captain role + host tweak** | Mirrors esports IGL; handles “who locks in” | Med | First-join default captain; host can adjust where allowed |
| **Pre-draft host tools** (move players between teams) | Faster lobby balance without re-join dance | Med | PROJECT: only before draft starts |
| **Host moderation** (kick players; kick/mute spectators) | Keeps rooms usable under griefing | Med | No spectator cap per PROJECT |
| **Chat safety baseline** (rate limit + slur filter) | Enough hygiene for public links without a moderation product | Med | Heavier trust & safety = different product |
| **Clear pause / resume UX** | Professional feel during disconnects | Med | Tied to captain recovery policy |
| **Strong observer UX** (large timers, phase labels, pick order strip) | Watchability for non-players | Med | Often under-invested in MVP tools |
| **Configurable turn timer in UI** (same panel as order) | Host doesn’t hunt through hidden admin | Low–Med | PROJECT groups timer with draft settings |
| **Premade catalog quality** (icons, search, role tags if applicable) | Speed + fewer mistakes under time pressure | Med | v1 one catalog; depth here differentiates feel |

**Industry note (LOW confidence on your product needing it):** Some titles (e.g. LoL competitive 2026) add **meta-rules** like “First Selection” (map side vs draft priority tradeoffs) or **series rules** (e.g. fearless/no-repeat). For a **class-list draft utility**, treat those as **optional presets or future game packs**, not universal table stakes.

---

## Anti-Features

Deliberately **not** worth building in early milestones (cost, scope creep, or violates product boundaries). Several already match PROJECT **Out of Scope**.

| Anti-feature | Why skip / defer | What to do instead |
|--------------|------------------|---------------------|
| **Transferable host** | Authority churn, abuse, support burden | Fixed creator host; document limitation |
| **Moving players between teams after draft start** | Undermines competitive integrity | Lock rosters at start; only pre-draft moves |
| **User-generated class lists (v1)** | Abuse, legal, moderation, data quality | Single vetted catalog until editor + security model |
| **Full moderation / reporting stack** | Not core to draft fairness | Rate limits + basic word filter only (v1) |
| **Integrated tournament brackets & standings** | Different product surface | Export summary; link out |
| **Auction / salary-cap / snake drafts** | Different mechanic family | Stay pick/ban-first unless roadmap pivots |
| **Voice or video inside the app** | Ops, privacy, moderation explosion | Use external Discord; deep link optional |
| **Paywalled fairness** (e.g. paid “extra ban”) | Destroys trust | Cosmetic-only monetization if ever |
| **Hidden picks / simultaneous blind pick** | Different game mode; sync & UX harder | Explicitly out of scope unless new phase |
| **Unbounded spectator participation** (chat → players) | Leaking strats, spam | Hard separation: spectator chat ≠ team chat |
| **“Undo last pick” without audit** | Disputes in scrims | If ever needed: host-only with visible log entry |

---

## Feature Dependencies

Conceptual ordering: **identity & room → roles & lobby rules → realtime draft state → presentation layers (chat, timers, UI) → failure modes → post-draft**.

```
Room + join link
  → Presence / membership
      → Team assignment (auth) vs spectator (guest)
          → Captain resolution
              → Host pre-draft controls (roster moves, kick/mute)
                  → Start draft (gating: min players, captains)
                      → Authoritative draft engine (order, pool, locks)
                          → Turn timer (server-driven)
                              → Client: acting player UX vs read-only spectator
                                  → Team chat (requires team membership)
                                  → Spectator chat (requires spectator role)
                                      → Disconnect / pause / captain promotion
                                          → Post-draft summary (reads final state)
```

**Key dependencies (explicit):**

| Dependent | Depends on |
|-----------|------------|
| **Start draft** | Room exists; membership; captain per team; host action |
| **Fair pick/ban** | Single source of truth for pool + turn + locks (server) |
| **Turn timer** | Turn ownership + server clock; client display only |
| **Team chat** | Stable team id + auth player membership |
| **Spectator chat** | Spectator role; must not receive team payloads |
| **Post-draft summary** | Completed or terminal draft state persisted or reconstructible |
| **Kick / mute** | Host role + realtime policy broadcast |
| **Captain disconnect recovery** | Pause state machine + promotion rules tied to team roster |

---

## Confidence & gaps

| Area | Confidence | Notes |
|------|------------|--------|
| Table stakes vs PROJECT.md | **HIGH** | Requirements already encode most expectations |
| Cross-title esports parity | **MEDIUM** | Web search mixed generic tools + game-specific rules; validate per target game if you add presets |
| Optimal default ban/pick script | **MEDIUM** | Should be **data-driven** from your primary game; expose as config, not hard-coded magic |

**Phase-level follow-up:** Pick a **reference default order** (e.g. “6 bans → 6 picks” style) from your primary title’s competitive or scrim mode and encode it as the **default preset** in room settings research.
