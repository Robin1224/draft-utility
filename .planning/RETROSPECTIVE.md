# Retrospective

## Milestone: v1.0 — Draft Utility MVP

**Shipped:** 2026-04-09
**Phases:** 7 | **Plans:** 31 | **Tasks:** ~60
**Timeline:** 62 days (2026-02-06 → 2026-04-09)
**Source:** ~6,800 lines JS/Svelte

### What Was Built

- Discord OAuth + session-aware WebSocket identity (Better Auth + svelte-realtime/UWS)
- Real-time lobby with team formation, captain auto-assign, host moderation, room lifecycle
- Server-authoritative pick/ban FSM with configurable script, turn timer, and race-safe auto-advance
- Captain disconnect resilience — 30s grace, promote-or-cancel, snapshot hydration on reconnect
- Team-isolated chat with slur filtering, rate limiting, and host mute controls
- Post-draft review with full pick/ban summary; shareable without auth
- Phase 7: grace-timer publish fix + Nyquist VALIDATION.md coverage across all 6 phases

### What Worked

- **Wave-based parallel execution** — Phase 7 ran 07-01 and 07-02 in parallel with no conflicts (different files)
- **Plan checker iteration loop** — caught the broken `svelte-realtime/server` import before execution saved a runtime failure
- **Audit-first approach** — v1.0-MILESTONE-AUDIT.md provided exact file/line/fix for the grace-timer bug; no research needed for Phase 7
- **Nyquist retroactive fill** — filling all 6 VALIDATION.md files in one cleanup phase was efficient; doing it phase-by-phase would have been disruptive mid-build
- **Manual UAT checkpoints** — Phase 4 and Phase 5's browser testing caught 4 real bugs that automated tests missed

### What Was Inefficient

- **AUTH requirements text drift** — AUTH-01/02/04 still describe email/pw + Google/GitHub despite Discord-only implementation throughout; should have been updated in Phase 1
- **Phase 4 VERIFICATION.md missing** — UAT passed but no VERIFICATION.md was created; manual checkpoint plan (04-05) completed but left no structured artifact
- **3 stale chat.spec.js assertions** — `message` vs `set` event mismatch survived all 5 Chat phases unnoticed; tests were never red
- **Rate limits causing mid-session pauses** — two plan-phase executions hit rate limits and had to resume; wave-based parallelization is expensive on context

### Patterns Established

- Grace-timer publish pattern: thread `publishFn` as an optional parameter rather than relying on module-level singletons
- Nyquist VALIDATION.md: fill retroactively in a dedicated cleanup phase if phases complete without them
- Plan checker catches non-existent library exports before execution wastes time
- `autonomous: false` checkpoint plans need a corresponding HUMAN-UAT.md for traceability

### Key Lessons

1. Update auth provider text in REQUIREMENTS.md at the moment of implementation decision — not retroactively
2. Manual checkpoint plans should produce a VERIFICATION.md even if abbreviated
3. Stale test assertions (wrong event names) are invisible unless CI enforces "no todo stubs" policy
4. Rate limit budget: plan + check + revise + execute for a 2-plan phase costs ~3-4 rate limit windows

### Cost Observations

- Model: Claude Sonnet 4.6 throughout
- Sessions: ~8 active sessions over 62 days
- Notable: Plan checker revision loop for Phase 7 (1 iteration) prevented a runtime failure at near-zero cost

---

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases | 7 |
| Plans | 31 |
| Requirements | 34/34 |
| Test pass rate | 130/130 (+ 34 todo) |
| Manual UAT | ~20 scenarios |
| Timeline (days) | 62 |
| Source LOC | ~6,800 |
