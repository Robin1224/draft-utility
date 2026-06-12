# Phase 9: Signature Effects Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-12
**Phase:** 09-signature-effects-infrastructure
**Areas discussed:** Wordmark text, Shader wire-in timing, Verification approach, Reduced-motion shader

> Note: This phase already had an approved UI-SPEC (`09-UI-SPEC.md`) that transcribes nearly all
> implementation values verbatim from the prototype. Discussion was scoped to the genuinely open
> decisions the spec did not lock, including its one explicit FLAG.

---

## Wordmark text (UI-SPEC FLAG)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep DRAFT | Port CY_LOGO_LINES verbatim; header carries [ DRAFT_EM ]; accepted long/short split; zero fidelity risk | ✓ |
| Regenerate as DRAFT_EM | New ░▒▓█ block-art for the longer string; hand-work, fidelity-drift risk, own planning task | |

**User's choice:** Keep DRAFT (verbatim).
**Notes:** Recommended default from the UI-SPEC FLAG; confirmed by user.

---

## Shader wire-in timing

| Option | Description | Selected |
|--------|-------------|----------|
| Wire in now, ambient | Mount <CyShader /> into CyShell's empty slot at ambient default; app-wide immediately; FX-01/02 verifiable in Phase 9 | ✓ |
| Build component only | Ship CyShader.svelte but leave slot empty; Phase 10 wires; FX-01/02 not visually verifiable until Phase 10 | |

**User's choice:** Wire in now, ambient.
**Notes:** `hot` variant remains a Phase 10 (Home) concern; shell passes ambient default only.

---

## Verification approach

| Option | Description | Selected |
|--------|-------------|----------|
| Component tests only | Browser vitest specs drive CyLogo + typed-log in isolation; no throwaway UI; visual confirm via Phase 10 | ✓ |
| Temporary dev-only demo route | Throwaway /dev/effects route for live eyeballing; extra build + cleanup task | |
| Both | Tests + demo route; most thorough, most work, demo still needs removal | |

**User's choice:** Component tests only.
**Notes:** Uses the existing chromium browser test project pattern (CyShell.svelte.spec.js); no new test infra.

---

## Reduced-motion shader

| Option | Description | Selected |
|--------|-------------|----------|
| Render one static frame | Draw a single plasma frame at fixed t, then no rAF; preserves violet→lime texture; mirrors wordmark static-final approach | ✓ |
| Render nothing (blank) | Skip drawing entirely; only --cy-bg gradient shows; simplest, but reduced-motion users lose the texture | |

**User's choice:** Render one static frame.
**Notes:** Hard rule honored either way — zero ongoing animation under prefers-reduced-motion (FX-02).

---

## Claude's Discretion

- Typed-log form (rune `.svelte.js` factory vs thin component wrapper) — UI-SPEC explicitly defers to planner.
- Test file placement/naming (following `*.svelte.spec.js`).
- How the single static reduced-motion shader frame is produced (fixed `t`).

## Deferred Ideas

- `DRAFT_EM` hero block-art (declined; own ASCII-authoring task if ever revisited).
- Boot-log copy finalization (`./draftnet` flavor) — Phase 10.
- Connect log / SIGKILL log content — Phase 12.
- Temporary dev demo route — considered and declined in favor of component tests.
