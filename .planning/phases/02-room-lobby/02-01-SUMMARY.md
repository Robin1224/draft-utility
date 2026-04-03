---
phase: 02-room-lobby
plan: 01
subsystem: database
tags: [drizzle, postgres, nanoid, vitest, sveltekit]

requires:
  - phase: 01-auth-realtime-transport
    provides: Neon Drizzle client, auth schema, Better Auth user ids as text
provides:
  - room and room_member Drizzle tables with migration SQL
  - parseRoomCode (client-safe) for bare codes and /draft/<code> URLs
  - createRoom, getRoomByPublicCode, generatePublicCode, topicForRoom with unit tests
affects:
  - 02-02 (create/join routes and actions)
  - 02-03 (realtime topic strings)

tech-stack:
  added: [nanoid, explicit dependencies entries for svelte-realtime, svelte-adapter-uws]
  patterns:
    - "7-char public_code via customAlphabet; retry insert on Postgres 23505"
    - "Partial unique indexes on room_member for (room_id, user_id) and (room_id, guest_id) when non-null"

key-files:
  created:
    - src/lib/join-parse.js
    - src/lib/join-parse.spec.js
    - src/lib/server/rooms.js
    - src/lib/server/rooms.spec.js
    - drizzle/0000_omniscient_pixie.sql
    - drizzle/meta/_journal.json
    - drizzle/meta/0000_snapshot.json
  modified:
    - package.json
    - package-lock.json
    - src/lib/server/db/schema.js
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Initial Drizzle migration snapshots full schema (task, auth, room) — greenfield baseline under drizzle/"

patterns-established:
  - "Lobby realtime topic: topicForRoom(code) => 'lobby:' + publicCode"

requirements-completed: [ROOM-01]

duration: 12min
completed: 2026-04-03
---

# Phase 2 Plan 1: Room schema & persistence helpers Summary

**Drizzle `room` / `room_member` tables with nanoid-based 7-character public codes, client-safe join URL parsing, and tested `createRoom` / `getRoomByPublicCode` helpers plus `topicForRoom` for realtime.**

## Performance

- **Duration:** 12 min (approximate)
- **Started:** 2026-04-03T14:35:00Z
- **Completed:** 2026-04-03T14:47:00Z
- **Tasks:** 3
- **Files modified:** 11 (including planning)

## Accomplishments

- Production `dependencies` now list `nanoid`, `svelte-realtime`, and `svelte-adapter-uws` for reproducible installs.
- `room` and `room_member` schema with partial unique indexes for non-null `user_id` / `guest_id` pairs per room.
- `parseRoomCode` implements D-04 (bare code, `/draft/<code>`, nested paths).
- `createRoom` retries up to five times on `public_code` collisions; `getRoomByPublicCode` normalizes input before query.

## Task Commits

1. **Task 1: Dependencies + Drizzle schema + migration** — `0b9bf14` (feat)
2. **Task 2: parseRoomCode + unit tests (D-04)** — `f9e3a4d` (feat)
3. **Task 3: rooms.js — generate code, createRoom, getRoomByPublicCode** — `43ecc07` (feat)

**Plan metadata:** Final commit on branch with message `docs(02-01): complete room schema plan` (STATE.md, ROADMAP.md, REQUIREMENTS.md, this file).

## Files Created/Modified

- `package.json` / `package-lock.json` — runtime deps
- `src/lib/server/db/schema.js` — `room`, `room_member` definitions
- `drizzle/0000_omniscient_pixie.sql` — generated migration (includes baseline tables from full schema export)
- `drizzle/meta/*` — Drizzle Kit journal and snapshot
- `src/lib/join-parse.js` — `parseRoomCode`
- `src/lib/join-parse.spec.js` — Vitest coverage
- `src/lib/server/rooms.js` — room helpers
- `src/lib/server/rooms.spec.js` — mocked-db tests
- `.planning/REQUIREMENTS.md` — ROOM-01 marked complete via GSD traceability

## Decisions Made

- Followed 02-RESEARCH alphabet and length 7 for public codes.
- Used Drizzle `uniqueIndex` with `WHERE col IS NOT NULL` for member uniqueness (Postgres partial indexes).

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

### Verification note

- **Task verify** specified `npm run lint && npm run check`. Repository-wide **Prettier** (`prettier --check .`) reports many pre-existing issues under `.cursor/`, `.planning/`, and unrelated `src/` files not touched by this plan. **`npm run check`** fails on pre-existing implicit-`any` diagnostics in `src/lib/vitest-examples/greet.js` and `src/lib/components/molecules/Join.svelte`.
- **What was run instead:** `eslint` on all files changed in this plan; `npm run test:unit -- --run --project server` (all server tests pass, including new specs).

## Issues Encountered

None blocking. Drizzle `db:generate` required a `DATABASE_URL` value in the environment (used a placeholder local URL — generate is schema-driven).

## User Setup Required

None. Apply migrations with `npm run db:push` or `npm run db:migrate` when `DATABASE_URL` points at your database (per team practice).

## Next Phase Readiness

- Plan **02-02** can wire SvelteKit actions and `/draft/[id]` load using `createRoom`, `getRoomByPublicCode`, and `parseRoomCode`.
- Plan **02-03** can import `topicForRoom` for stream topics.

## Self-Check: PASSED

- `src/lib/join-parse.js`, `src/lib/server/rooms.js`, `drizzle/0000_omniscient_pixie.sql` exist on disk.
- Task commits `0b9bf14`, `f9e3a4d`, `43ecc07` and docs commit `docs(02-01): complete room schema plan` present in `git log`.

---
_Phase: 02-room-lobby_
_Completed: 2026-04-03_
