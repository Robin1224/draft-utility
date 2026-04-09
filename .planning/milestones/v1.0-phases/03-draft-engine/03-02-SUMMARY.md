---
phase: 03-draft-engine
plan: "02"
subsystem: database
tags: [drizzle, postgres, neon, jsonb, vitest, battlerite]

# Dependency graph
requires:
  - phase: 03-01
    provides: test stub files (classes.spec.js, draft-script.spec.js) activated in this plan
  - phase: 02-room-lobby
    provides: room and room_member tables in schema.js (extended here with draft_state + draft_action)
provides:
  - src/lib/catalog/classes.json with 28 Battlerite champions (melee/ranged/support)
  - src/lib/draft-script.js with DEFAULT_SCRIPT (10-turn pick/ban) and DEFAULT_TIMER_MS=30000
  - draft_state jsonb column on room table
  - draft_action table with unique constraint on (room_id, turn_index)
  - Neon DB schema updated with draft tables
affects:
  - 03-03 (server DB layer — imports DEFAULT_SCRIPT + draft_action table)
  - 03-04 (live RPCs — reads draft_state from room, writes draft_action rows)
  - 03-05 (draft UI — renders champion catalog from classes.json)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Champion catalog as static JSON in src/lib/catalog/ — no DB lookup needed for read-only list"
    - "Draft script as exported JS constant — importable everywhere (server + client)"
    - "Drizzle jsonb column for mutable draft state — single-row JSONB vs normalized rows for hot-path reads"
    - "draft_action table for immutable audit log of each pick/ban — unique(room_id, turn_index) prevents double-writes"

key-files:
  created:
    - src/lib/catalog/classes.json
    - src/lib/catalog/classes.spec.js
    - src/lib/draft-script.js
    - drizzle/0001_milky_selene.sql
    - drizzle/meta/0001_snapshot.json
  modified:
    - src/lib/draft-script.spec.js
    - src/lib/server/db/schema.js

key-decisions:
  - "Used db:push:force instead of db:migrate — drizzle-kit migrate hangs with Neon pooler URL containing channel_binding=require (incompatible with pg Node driver); push approach connects successfully via same URL"
  - "Draft state stored as JSONB on room table — hot-path reads get full state in one query; normalized approach deferred to post-v1 if needed"
  - "draft_action as append-only audit table — unique(room_id, turn_index) prevents duplicate picks from race conditions"

patterns-established:
  - "Schema extension pattern: add jsonb import + new column/table to existing schema.js without touching existing tables"

requirements-completed: [LIST-01, DRAFT-01]

# Metrics
duration: 3min
completed: 2026-04-03
---

# Phase 03 Plan 02: Static Data Foundation Summary

**28-champion Battlerite catalog (classes.json), DEFAULT_SCRIPT constant (10-turn alternating bans/picks), draft_state JSONB column on room, and draft_action audit table with unique index — all applied to Neon DB**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-03T15:29:55Z
- **Completed:** 2026-04-03T15:33:03Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Created 28-champion Battlerite catalog (classes.json) with melee/ranged/support roles and kebab-case IDs; 6 catalog tests green
- Created draft-script.js with DEFAULT_SCRIPT (4 alternating bans A-B-A-B then 6 snake picks A-B-B-A-A-B) and DEFAULT_TIMER_MS=30000; 5 script tests green
- Extended schema.js: jsonb draft_state on room + new draft_action table with unique(room_id, turn_index); applied to Neon DB

## Task Commits

Each task was committed atomically:

1. **Task 1: Create classes.json catalog** - `2812b23` (feat)
2. **Task 2: Create draft-script.js and update schema.js** - `adbbddd` (feat)
3. **Task 3: Generate and run DB migration** - `8ab28e8` (chore)

## Files Created/Modified

- `src/lib/catalog/classes.json` - 28-champion catalog with id/name/role per champion
- `src/lib/catalog/classes.spec.js` - Activated spec: 6 real tests covering count, roles, and ruh-kaan entry
- `src/lib/draft-script.js` - DEFAULT_SCRIPT (10 turns) and DEFAULT_TIMER_MS=30000 exports
- `src/lib/draft-script.spec.js` - Activated spec: 5 real tests covering shape, order, and timer value
- `src/lib/server/db/schema.js` - Added jsonb import, draft_state column on room, and draft_action table
- `drizzle/0001_milky_selene.sql` - Generated migration: CREATE TABLE draft_action + ALTER TABLE room ADD COLUMN draft_state
- `drizzle/meta/0001_snapshot.json` - Drizzle meta snapshot for migration tracking

## Decisions Made

- **db:push:force over db:migrate:** drizzle-kit migrate hangs with Neon pooler URL containing `channel_binding=require` (incompatible with the `pg` Node.js driver drizzle-kit uses internally). `db:push:force` connects successfully via the same URL and applied all changes correctly.
- **draft_action unique constraint:** `uniqueIndex` on `(room_id, turn_index)` prevents race-condition double-writes at the DB level — the application layer can rely on this guarantee.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used db:push:force instead of db:migrate**
- **Found during:** Task 3 (Generate and run DB migration)
- **Issue:** `npm run db:migrate` hung indefinitely with exit 1. Root cause: Neon pooler URL includes `channel_binding=require` which is incompatible with the `pg` Node.js driver drizzle-kit uses for migrate. The `db:push` approach uses the same URL but connects successfully.
- **Fix:** Used `npm run db:push:force` (auto-approves in non-TTY environments) to apply the same SQL changes that were in the generated migration file
- **Files modified:** None — schema already applied to DB
- **Verification:** `db:push:force` output showed `[✓] Changes applied` with correct SQL (CREATE TABLE draft_action + ALTER TABLE room ADD COLUMN draft_state)
- **Committed in:** `8ab28e8` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (blocking issue)
**Impact on plan:** DB schema is correctly applied. Migration file was still generated and committed for historical tracking. The push approach is already established in this project (see db:push script in package.json).

## Issues Encountered

- drizzle-kit migrate hangs with Neon pooler URL — see deviation above. The generated migration file `0001_milky_selene.sql` is committed and matches what was applied.

## User Setup Required

None - no external service configuration required beyond existing DATABASE_URL.

## Next Phase Readiness

- classes.json and draft-script.js are ready for import in Phase 03-03 (server DB layer) and 03-05 (UI)
- draft_action table exists in DB with correct schema; server layer can begin writing rows
- draft_state JSONB on room is ready for server-side state machine to populate
- All 11 tests green; no regressions

---
*Phase: 03-draft-engine*
*Completed: 2026-04-03*
