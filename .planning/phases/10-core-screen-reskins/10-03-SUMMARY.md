---
phase: 10-core-screen-reskins
plan: 03
subsystem: ui
tags: [svelte5, cyber, login, discord-oauth, guest-spectate, plain-css]

# Dependency graph
requires:
  - phase: 10-core-screen-reskins (plan 01)
    provides: per-screen Cyber CSS in src/app.css (.cy-login, .cy-login-card, .cy-login-eyebrow, .cy-divider, .cy-foot, .cy-btn, .cy-btn-discord, .cy-btn-ghost)
  - phase: 08-cyber-foundation
    provides: app-wide CyShell chrome (header/scanlines) rendered by +layout.svelte
provides:
  - Cyber LoginCard (eyebrow -> USER_AUTH_REQUIRED -> body -> CONTINUE_DISCORD() Discord CTA -> SPECTATE_AS_GUEST() guest path -> chat-filter footer)
  - Login route rendering the card inside the layout CyShell (no duplicate Header)
affects: [10-04-lobby, 10-05-drafting, 10-06-pause, 10-07-review]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Login restyled in place (D-01): ?/signin Discord OAuth form + use:enhance loading state preserved byte-for-byte"
    - "Guest spectate is a plain <a href={redirect}> link — no auth, no server action; the room route handles unauthenticated viewers"
    - "Login renders inside CyShell .cy-body; route no longer renders its own <Header> (chrome is app-wide)"

key-files:
  created: []
  modified:
    - src/lib/components/molecules/LoginCard.svelte
    - src/routes/login/+page.svelte

key-decisions:
  - "Collapsed the register/signin mode toggle to a single ?/signin Discord action (server delegates both to the same Discord OAuth flow, so the toggle was redundant); kept mode $bindable('signin') so the route <title> binding does not break"
  - "Guest path reads ?redirect from the URL in the route and passes it to LoginCard so guests land back on the room they came from (or /) as spectators"

# Metrics
metrics:
  duration: 4min
  tasks: 2
  files: 2
  completed: 2026-06-15
---

# Phase 10 Plan 03: Login Reskin (UI-02) Summary

Reskinned the Login screen to the Cyber auth card: a `$ ./auth --provider=discord` eyebrow, `USER_AUTH_REQUIRED` heading, the guests-spectate-only body line, a `CONTINUE_DISCORD()` Discord OAuth button (unchanged `?/signin` action), a `SPECTATE_AS_GUEST()` guest-continue link to the `?redirect` room, and the chat-filter footer — all rendered inside the app-wide CyShell chrome with zero Tailwind.

## What Was Built

**Task 1 — LoginCard.svelte (Cyber auth card)** [commit 3fb6f1c]
- Replaced the Tailwind `<section>` card with the Cyber `.cy-login` / `.cy-login-card` markup, copy ported verbatim from `cyber.jsx` CYLogin (eyebrow, `USER_AUTH_REQUIRED`, body line, `--- // ---` divider, `// chat_filter: ENABLED · slur_block: ENABLED` footer).
- Preserved the Discord OAuth wiring (D-01): the `CONTINUE_DISCORD()` button submits the existing `use:enhance` POST `?/signin` form; `loading` state drives `CONNECTING…` / `disabled` / `aria-busy`.
- Added a `redirect` prop; the `SPECTATE_AS_GUEST()` guest path is an `<a href={redirect}>` link (spectator, no auth, no server action).
- Dropped the redundant register/signin mode toggle but kept `mode = $bindable('signin')` so the route `<title>` binding still works.
- Preserved the AUTH-03 error display (`{#if form?.error}`), restyled as a `.cy-foot` `[ERR]` line.
- Removed all Tailwind utility classes and the inline `style=` / hover JS on the Discord button.

**Task 2 — login/+page.svelte (route inside CyShell)** [commit 7af5c6f]
- Removed `import Header` and `<Header />` (the layout's CyShell renders the header app-wide; a second one duplicated the wordmark).
- Removed the Tailwind `<main class="flex min-h-[…]">` wrapper; the card's `.cy-login` root centers itself.
- Read the redirect target via `import { page } from '$app/state'` → `const redirect = $derived(page.url.searchParams.get('redirect') ?? '/')` and passed it through to `<LoginCard bind:mode {form} {redirect} />`.
- Kept the bindable `mode` `$state` driving the page `<title>`.

## Verification

- `npm run check`: 10 errors, all PRE-EXISTING (CyShell.svelte, CyShell.svelte.spec.js, phase8/phase10 spec files — tracked in deferred-items.md). Zero errors in the login route or LoginCard.
- All Task 1 grep acceptance criteria matched (verbatim copy strings, `?/signin`, `use:enhance`, `redirect`, Tailwind-leftover count 0).
- All Task 2 grep acceptance criteria matched (no `import Header`, `LoginCard` present, `redirect` wired, Tailwind main-wrapper count 0).

## Deviations from Plan

None - plan executed exactly as written.

## Notes

- The Svelte MCP `svelte-autofixer` tool is not available in this environment (same as Phase 9). Substituted `prettier --write` + `npm run check` (svelte-check) for markup validation, consistent with the Phase 9 precedent.

## Self-Check: PASSED
- FOUND: src/lib/components/molecules/LoginCard.svelte
- FOUND: src/routes/login/+page.svelte
- FOUND commit: 3fb6f1c
- FOUND commit: 7af5c6f
