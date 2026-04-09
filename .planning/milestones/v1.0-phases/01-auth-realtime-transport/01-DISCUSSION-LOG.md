# Phase 1: Auth & Realtime Transport - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 01-auth-realtime-transport
**Areas discussed:** Auth Routes, OAuth Providers, Adapter Swap Scope, Guest WS Handling

---

## Auth Routes

| Option | Description | Selected |
|--------|-------------|----------|
| New dedicated routes | Create `/login` and `/register` (or combined `/auth`). Clean URLs, replaces demo path. Minimal design for Phase 1. | ✓ |
| Promote demo routes | Move `src/routes/demo/better-auth/` → `src/routes/auth/`. Keeps existing logic, re-paths. | |
| Keep demo routes for Phase 1 | Auth works, URL is ugly; real UI comes later. | |

**User's choice:** New dedicated routes — `/login` as single page (sign-in default, inline toggle to register).

---

### Auth Routes — Combined or separate pages?

| Option | Description | Selected |
|--------|-------------|----------|
| Single `/login` page | Sign-in by default, "create account" toggle/link reveals register inline | ✓ |
| Separate `/login` and `/register` | Two distinct routes, each with its own form | |
| Your call | Claude decides the split | |

**User's choice:** Single `/login` page with inline toggle to register.

---

### Auth Routes — Post-sign-in redirect

| Option | Description | Selected |
|--------|-------------|----------|
| Home (`/`) | Always redirect to home after auth | |
| Back to where they came from | Return-to behavior; redirect param; fallback to `/` | ✓ |
| Both | Return-to when param present, else `/` | |

**User's choice:** Return-to behavior (origin URL; fallback to `/`).

---

## OAuth Providers

| Option | Description | Selected |
|--------|-------------|----------|
| Google only | Widest user base | |
| GitHub only | Dev/gamer audience fit | |
| Both Google + GitHub | Maximum coverage | |
| Discord only (freeform) | Fits competitive gaming audience; user-specified | ✓ |

**User's choice:** Discord only — not one of the presented options; user specified Discord as the preferred provider for the gaming/competitive audience.

---

### OAuth Providers — Discord + email/password or Discord only?

| Option | Description | Selected |
|--------|-------------|----------|
| Discord only | Remove email/password; Discord is the sole sign-in method | ✓ |
| Discord + email/password | Both available; Discord primary | |
| Discord + email/password, Discord prominent | Same as above but UI leads with Discord | |

**User's choice:** Discord only — `emailAndPassword` disabled.

---

## Adapter Swap Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full swap + production validation | Swap adapter, wire `hooks.ws.js`, validate on real host in Phase 1 | |
| Dev-proven only | Swap adapter, prove WS identity in dev. Production validation not a Phase 1 gate. | ✓ |
| Minimal wire-up | Prove WS auth pattern without fully committing adapter swap | |

**User's choice:** Dev-proven only — adapter swapped, WS identity verified locally; production hosting validation deferred.

---

### Adapter Swap — Verification method

| Option | Description | Selected |
|--------|-------------|----------|
| Vitest integration test | Server-side test asserting session/role read from mock WS connection | |
| Manual dev verification | Developer confirms via `npm run dev`; no automated test for Phase 1 | ✓ |
| Your call | Claude decides test coverage | |

**User's choice:** Manual dev verification.

---

## Guest WS Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Allow upgrade, tag as guest | Let connection through, `role: 'guest'`. Downstream handlers restrict. | ✓ |
| Reject at upgrade | Auth-only WS; guests use SSE/polling instead | |
| Allow upgrade, dedicated read-only topic | Same as option 1 but enforced at upgrade step | |

**User's choice:** Allow upgrade, tag as `role: 'guest'`.

---

### Guest WS — Role upgrade on sign-in

| Option | Description | Selected |
|--------|-------------|----------|
| Force reconnect | Sign-in invalidates guest connection; client reconnects with auth | |
| Seamless in-place upgrade | Server promotes role on existing connection after session cookie set | ✓ |
| Your call | Claude decides | |

**User's choice:** Seamless in-place upgrade — no reconnect after Discord OAuth completes.

---

## Claude's Discretion

- Exact `hooks.ws.js` structure and session-reading pattern (follow `svelte-realtime` README)
- How `redirect` query param is set/read in sign-in flow
- Whether `@sveltejs/adapter-node` is fully removed or kept in devDependencies

## Deferred Ideas

None — discussion stayed within Phase 1 scope.
