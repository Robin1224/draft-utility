# Handoff: Real-time Pick & Ban — "Cyber" terminal direction

## Overview
This is a real-time, multiplayer **pick & ban drafting tool** (think MOBA/arena draft lobbies). Two teams (A and B) take alternating turns to **ban** and **pick** entities (champions) from a shared catalog, on a turn timer, while spectators watch. A host creates a room, players join via a room code or Discord, captains run the draft, and everyone sees state update live over a websocket.

This bundle documents the **"Cyber" visual direction** — a saturated, monospace, terminal/ANSI aesthetic — across the full flow plus the secondary screens (settings, host console, connecting, guest gate, cancelled).

## About the Design Files
The files in `prototype/` are **design references created in HTML/React (via in-browser Babel)** — prototypes that show the intended look, layout, and behavior. **They are not production code to copy directly.**

Your task is to **recreate these designs in the target codebase's environment**. The original product is a **SvelteKit** app (see "Source app mapping" below) — if you are building into that codebase, reimplement these screens as Svelte components using its existing patterns, stores, and socket layer. If you're starting fresh, pick the most appropriate framework and port the visuals faithfully.

The prototype is React only because that's the prototyping medium; **do not treat React as a requirement.** What matters is the visual system, layout, copy, and interaction model documented here.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, ANSI/ASCII treatments, and interactions are all intentional and specified below with exact values. Recreate the UI pixel-faithfully using your codebase's libraries — but reproduce the *design tokens* (below) exactly, since this aesthetic depends on them.

Note: the prototype screens are **visual mocks** — the drag-to-reorder script editor and the boot/connect log typing are genuinely interactive, but screens do not share live draft state. The live behavior you implement should follow "Interactions & Behavior" + "State Management" below, not the mock's static wiring.

---

## Design System / Tokens

Everything is scoped under `.cy-app` as CSS custom properties (`prototype/variants/cyber.css`, top of file). These are the single source of truth — port them verbatim.

### Colors
| Token | Hex | Use |
|---|---|---|
| `--cy-bg` | `#050409` | App background (near-black, violet-tinted) |
| `--cy-bg-2` | `#0a0814` | Panel / card / header background |
| `--cy-bg-3` | `#110d22` | Raised / nested surfaces |
| `--cy-line` | `#2a1f4a` | Default borders / dividers |
| `--cy-line-2` | `#4a3580` | Emphasized borders, inputs, dim ASCII |
| `--cy-text` | `#e8e0ff` | Primary text (cool white) |
| `--cy-text-2` | `#9080c0` | Secondary text |
| `--cy-text-3` | `#5a4880` | Tertiary / muted labels |
| `--cy-lime` | `#b3ff3d` | **Primary accent** — active state, picks, CTAs, brand |
| `--cy-violet` | `#c44bff` | **Secondary accent** — room code, team B, decoration |
| `--cy-amber` | `#ffaa00` | Warnings, "waiting", gating hints |
| `--cy-red` | `#ff2255` | Bans, destructive (kick/cancel), errors (403/SIGKILL) |

Glow effects are box/text shadows, not filters:
- `--cy-lime-glow: 0 0 12px #b3ff3d80;`
- `--cy-violet-glow: 0 0 12px #c44bff80;`

Background also carries two faint radial gradients on `.cy-app` (top `#1a0f2a`, bottom-right `#1a0a30`, each fading to transparent at 60%).

### Typography
- **Font:** `--cy-mono: "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace;` — **everything is monospace.** Load JetBrains Mono (weights 400/500/600/700).
- Headings/labels are frequently **UPPERCASE** with letter-spacing `0.04em`–`0.1em`.
- Scale (px): body 12–13, labels 11 (uppercase, tracked `0.1em`), screen titles 18–24, hero wordmark is ASCII art (see below).
- Brand name weight 700 with lime glow; most body text 400.

### Spacing & shape
- **No border-radius anywhere** — hard rectangular edges are core to the aesthetic. Corners are squared; "rounding" is done with ANSI box-drawing characters instead.
- Card padding ~ 28–32px; compact rows 7–14px.
- Borders are always 1px, occasionally a 3px colored left-border accent (e.g. guest gate uses `border-left: 3px solid --cy-amber`).
- Gaps: flex/grid `gap` of 6–18px depending on density.

### Signature treatments (the soul of this direction — reproduce these)
1. **ASCII plasma shader** — a full-bleed `<canvas>` behind content rendering a grid of monospace glyphs (`" .:-=+*o#%@"` density ramp) driven by an animated domain-warped plasma field, colored on a violet→lime brightness ramp. Pauses off-screen via IntersectionObserver; respects `prefers-reduced-motion`. See `CYShader` in `cyber.jsx`. Two intensities: ambient (`opacity 0.05` range) and `hot` (brighter, on hero).
2. **Scanline overlay** — `repeating-linear-gradient(0deg, transparent 0 2px, rgba(196,75,255,0.04) 2px 3px)`, `z-index: 5`, `pointer-events: none`.
3. **ANSI box-drawing borders** — panels framed with `╔═╗ ║ ╚═╝` characters and section headers like `// SPECTATORS [3]`.
4. **Shaded ASCII wordmark** — the hero logo is `░▒▓█`-shaded block art (the `CY_LOGO_LINES` array), revealed line-by-line.
5. **CLI / terminal framing** — actions read as function calls and commands: `$ START_DRAFT()`, `SAVE_CONFIG()`, `kick()`, `> prompts`, `[ OK ]` / `[ .. ]` log lines, `[ 01 ]` zero-padded numbering, blinking block cursor `▮` (`@keyframes cy-blink`, 1s step-end).
6. **Modal chrome** — overlays carry a fake terminal title bar: three square "traffic light" dots (red/amber/lime outlines) + a path title (`~/draft/config.sh`) + an `esc ✕` close button.

---

## Screens / Views

All screens share the **chrome** (`CYChrome`): a fixed header (`.cy-header`, 3-col grid) with the bracketed brand wordmark + blinking cursor on the left, the **phase tracker** centered (`LOBBY · BAN · PICK · REVIEW`, active phase lime-glowed), and room meta on the right (`CODE: K7-MIRA` in violet + a copy button). The shader canvas + scanlines sit behind; `.cy-body` scrolls.

### 1. Home (`CYHome`)
- **Purpose:** Landing / entry. Create a room or join one.
- **Layout:** Centered hero. Boot-sequence log (`CY_BOOT_LINES`) types out, then the shaded ASCII wordmark reveals line-by-line, then primary actions appear.
- **Components:** Typed boot log (`[ OK ] mounting entity catalog … 28 found`, etc.); ASCII `DRAFT` wordmark hero; CTAs `$ CREATE_DRAFT()` (lime primary) and a join-by-code input + `$ JOIN()`. Discord sign-in option.

### 2. Login (`CYLogin`)
- **Purpose:** Authenticate (Discord OAuth) or continue as guest.
- **Components:** Card with Discord sign-in button (brand blurple `.cy-btn-discord` with inline Discord SVG), guest continue, terminal-styled framing.

### 3. Lobby (`CYLobby`) — and its body `CYLobbyBody`
- **Purpose:** Pre-draft staging. See both team rosters, spectators, room code; host configures and launches.
- **Layout:** Two team columns (Team A / Team B), each listing member slots (filled = name; empty = `[ open slot ]`), captain marked. Below: spectators strip (`// SPECTATORS [n]` with name pills). Host bar with `CONFIG`, host console, and `START_DRAFT()`.
- **Note:** `CYLobbyBody` is the lobby content extracted so the settings/host modals can render over it.

### 4. Drafting — active (`CYDrafting`)
- **Purpose:** The live draft. Pick/ban entities on a timer with team chat.
- **Layout:** Central entity catalog grid; current turn + countdown timer prominent; team panels showing each side's picks (lime) and bans (red, struck/dimmed); chat as a sidebar or drawer (`chatMode` prop: `"sidebar"` | `"drawer"`).
- **States:** active team highlighted; timer urgency; locked-in selections.

### 5. Drafting — paused (`CYPause`)
- **Purpose:** Draft paused (host or disconnect). Shows a pause card + event log over the draft.

### 6. Review (`CYReview`)
- **Purpose:** Post-draft summary. Final compositions for both teams, full ban list, draft order recap.

---

### Secondary screens (built in the Cyber style to complete the flow)

### 7. Draft Settings — modal over lobby (`CYSettings`)
- **Purpose:** Host configures turn timer and the pick/ban execution order before launch.
- **Layout:** Renders `CYLobbyBody` dimmed behind a centered modal (`.cy-modal-scrim` → `.cy-modal`, max-width 560px). Terminal title bar reads `~/draft/config.sh`.
- **Components:**
  - **Timer stepper** (`.cy-stepper`): `−` / value / `+`. Value shows seconds (`30` + small `sec`), tabular-nums. Range clamped 10–120, step 5. `−`/`+` buttons are lime on `--cy-bg`, invert to bg-on-lime on hover.
  - **Pick/ban script editor** (`CYScriptEditor`, `.cy-script`): a drag-to-reorder list. Each row (`.cy-script-row`, grid `18px 22px 1fr 1fr auto`): grip glyph `⠿`, zero-padded index, a **team** `<select>` (TEAM_A lime / TEAM_B violet), an **action** `<select>` (`ban()` red / `pick()` lime), and a `rm` button (hover → red). `+ ADD_TURN` appends `{team:'A', action:'ban'}`. Drag uses native HTML5 DnD; dragging row gets `.is-drag` (dashed amber, 0.6 opacity).
  - **Footer:** `CANCEL` + `SAVE_CONFIG()` (lime primary).
- **Default script** comes from `window.DEFAULT_SCRIPT` (see data).

### 8. Host Console — modal over lobby (`CYHostControls`)
- **Purpose:** Host manages rosters before launch.
- **Layout:** Same modal pattern; title bar `~/draft/host_console`, subhead `// root@K7-MIRA`.
- **Components:**
  - **move_player:** a player `<select>` + a `→ A` / `→ B` destination `<select>` + `EXEC` button.
  - **kick:** roster list (`.cy-kick-list`) of all non-host members, each row shows name + `team_X · cap` meta + a `kick()` button (red, glows on hover).
  - **Gating hint** (`.cy-hc-hint`): dashed amber banner with a `!` glyph — *"both teams need a captain before START_DRAFT() unlocks."* Shown whenever either team lacks a captain.
  - **Footer:** `CANCEL_ROOM` (danger) on the left; `▶ START_DRAFT()` on the right, **disabled** (50% opacity, not-allowed) while gated.

### 9. Connecting / Loading (`CYLoading`)
- **Purpose:** Socket connecting / room hydrating.
- **Components:** Card titled `ESTABLISHING_LINK` with animated trailing dots (`@keyframes cy-dots`). A typed connect log (`CY_CONNECT_LINES`: `$ ./draftnet connect …`, `[ OK ] tcp handshake … 24ms`, `websocket upgrade … 101`, etc.) using the `useTypedLog` hook, with a blinking cursor until done. Below: a marquee progress bar of `█` chars with a clip-path fill animation (`@keyframes cy-fill`) and a `sync…` percent readout.

### 10. Guest Gate — sign-in required (`CYGuestGate`)
- **Purpose:** A guest hitting a private room before it's opened to spectators.
- **Components:** Amber-left-bordered card titled `$ ROOM.ACCESS()`. A request/response readout: `> GET /draft/K7-MIRA` → `< 403 SIGN_IN_REQUIRED` (red) → identity/hint lines. Copy: *"sign in to join this draft as a player or captain — or wait for the host to start it, then spectate."* Actions: `SIGN_IN_DISCORD()` (Discord button w/ SVG) + `RETRY_AS_GUEST()` (ghost). Foot note: *"you can still watch once the draft goes live."*

### 11. Room Cancelled (`CYCancelled`)
- **Purpose:** Terminal state after the host kills the room.
- **Components:** Red-bordered card (`box-shadow` red glow) titled `$ ROOM.KILL()`. A SIGKILL log: `[SIG] host issued SIGKILL → room K7-MIRA` (red), flush/notify/release lines, ending `[ OK ] socket closed cleanly (code 1000)` (lime). Actions: `$ COPY_LOG()` + `$ NEW_DRAFT()` (primary).

---

## Interactions & Behavior
- **Phase flow:** `LOBBY → BAN/PICK (alternating per script) → REVIEW`. Header phase tracker reflects current phase (active = lime glow, done = dimmed).
- **Turn timer:** each turn has a countdown (configurable, default 30s, 10–120 range). On expiry the turn auto-resolves (skip ban / random or no-pick per product rules — confirm with product owner).
- **Script-driven draft:** the pick/ban order is an ordered list of `{ team: 'A'|'B', action: 'pick'|'ban' }` turns (`DEFAULT_SCRIPT`). The draft walks this list; the settings editor lets the host reorder (drag), add, remove turns before launch.
- **Start gating:** `START_DRAFT()` is disabled until **both teams have a captain**. Surface the amber hint while gated.
- **Host actions:** move player between teams, kick members (not the host), cancel the room (→ Room Cancelled state for everyone).
- **Connecting:** show `CYLoading` while the socket is opening / state hydrating; transition to lobby (or draft, if rejoining) on ready.
- **Access control:** unauthenticated users hitting a not-yet-public room get `CYGuestGate` (403). Once the host opens spectating / starts, guests can watch.
- **Animations:** typed logs via `useTypedLog` (char-by-char, ~9ms/char, ~60ms line gap; **skips to full text under `prefers-reduced-motion`**). Blinking cursor 1s step-end. Shader pauses off-screen. Modal scrim/modal appear instantly (no entrance animation — intentional, so they never get stuck mid-fade when throttled). Honor `prefers-reduced-motion` throughout.
- **Copy room code:** the header copy button writes the code to clipboard.
- **Chat:** team chat with a filter ("chat filter armed"); `chatMode` toggles sidebar vs drawer layout.

## State Management
Core state the implementation needs (names illustrative):
- `room`: `{ code, status: 'lobby'|'connecting'|'drafting'|'paused'|'review'|'cancelled', isPublic }`
- `teams`: `{ A: Member[], B: Member[] }`, `Member = { userId, displayName, isHost, isCaptain }`
- `spectators`: `Member[]`
- `settings`: `{ turnTimerSec: number, script: ScriptTurn[] }`, `ScriptTurn = { id, team:'A'|'B', action:'pick'|'ban' }`
- `draft`: `{ currentTurnIndex, deadlineTs, picks: {A:[],B:[]}, bans: {A:[],B:[]} }`
- `viewer`: `{ userId|null, isGuest, role: 'host'|'captain'|'player'|'spectator' }`
- `catalog`: the entity list (`window.CHAMPIONS` in the mock).

Transitions are driven by **websocket events** (the source app uses a socket bridge). Optimistically reflect local host edits (settings, roster moves) then reconcile on server ack.

## Source app mapping (SvelteKit)
The original product lives in the attached `draft-utility/` SvelteKit project. Key references:
- Routes: `src/routes/+page.svelte` (home: Header + Create + Join), `src/routes/draft/[id]/+page.svelte` (the draft room — phases, rosters, timer).
- Components: `src/lib/components/molecules/` — `Header`, `Create`, `Join`, `LobbyHostBar`, `DraftSettingsPanel`; `src/lib/components/atoms/` — `Phases`, `ScriptTurnRow`.
- The settings panel (`DraftSettingsPanel` + `ScriptTurnRow`) and host bar (`LobbyHostBar`) are the source of truth for the timer input, the drag-reorder script rows, and host roster controls reproduced here in Cyber styling.

Reimplement these as the real components; this bundle defines how they should **look and behave** in the Cyber direction.

## Design Tokens
See "Design System / Tokens" above — colors, the two glow shadows, `--cy-mono` font stack, **0 border-radius**, 1px borders, the shader ramp `" .:-=+*o#%@"`, and the scanline gradient `rgba(196,75,255,0.04)`.

## Assets
- **Font:** JetBrains Mono (Google Fonts) — weights 400/500/600/700. Fallbacks: IBM Plex Mono, `ui-monospace`.
- **Icons:** Discord glyph is an inline `<svg>` (in `cyber.jsx`, guest gate / login). No icon library — keep iconography minimal/inline.
- **ASCII art:** the `DRAFT` wordmark (`CY_LOGO_LINES`) and the density ramp are literal strings in `cyber.jsx` — copy them as-is.
- No raster images; all imagery is procedural (shader) or ASCII.

## Files (in this bundle, under `prototype/`)
- `Pick and Ban Directions.html` — entry point. Open it in a browser to see all directions; the **Cyber** direction is the lead. Use the on-canvas overview, or open the Cyber prototype fullscreen and toggle **Tweaks** → **Screen** dropdown to view each screen (incl. the 5 secondary ones: Draft settings, Host console, Connecting, Guest gate, Room cancelled).
- `variants/cyber.jsx` — **all Cyber screen components** + the shader, typed-log hook, ASCII art, and the new screens (`CYLoading`, `CYGuestGate`, `CYCancelled`, `CYSettings`, `CYScriptEditor`, `CYHostControls`). **This is the primary reference file.**
- `variants/cyber.css` — **all Cyber styles + tokens.** The authoritative source for every value above.
- `shared/data.js` — sample data: `window.CHAMPIONS`, `window.SAMPLE_LOBBY`, `window.DEFAULT_SCRIPT`.
- `app.jsx` — harness that mounts screens into the canvas + Tweaks Screen dropdown (prototyping scaffold, not product code).
- `design-canvas.jsx`, `tweaks-panel.jsx` — prototyping infrastructure (pan/zoom canvas + tweak panel). **Not part of the product** — ignore for implementation.

### How to run the prototype locally
It uses in-browser Babel, so just serve the `prototype/` folder over HTTP (e.g. `npx serve prototype` or `python3 -m http.server`) and open `Pick and Ban Directions.html`. Opening via `file://` may block the JSX `<script src>` loads.
