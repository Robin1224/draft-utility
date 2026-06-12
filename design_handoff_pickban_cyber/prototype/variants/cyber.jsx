/* global React */
const { useState, useEffect, useRef } = React;

// ============================================================
// CYBER/NEON — saturated, monospace, scanlines, terminal feel
// ============================================================

// Shaded "Bloody" ANSI wordmark — the hero. Grungy ░▒▓█ block style.
// Rendered line-by-line so each row can reveal on its own delay.
const CY_LOGO_LINES = [
  " ▓█████▄  ██▀███   ▄▄▄        █████▒▄▄▄█████▓",
  " ▒██▀ ██▌▓██ ▒ ██▒▒████▄    ▓██   ▒▓  ██▒ ▓▒",
  " ░██   █▌▓██ ░▄█ ▒▒██  ▀█▄  ▒████ ░▒ ▓██░ ▒░",
  " ░▓█▄   ▌▒██▀▀█▄  ░██▄▄▄▄██ ░▓█▒  ░░ ▓██▓ ░ ",
  " ░▒████▓ ░██▓ ▒██▒ ▓█   ▓██▒░▒█░     ▒██▒ ░ ",
  "  ░▒▒▓  ▒ ░ ▒▓ ░▒▓░ ▒▒   ▓▒█░ ▒ ░     ▒ ░░   ",
  "  ░ ▒  ▒   ░▒ ░ ▒░  ▒   ▒▒ ░ ░         ░    ",
  "  ░ ░  ░   ░░   ░   ░   ▒    ░ ░     ░      ",
  "    ░       ░           ░  ░               ",
];

// Boot-sequence log that types out, then hands off to the logo reveal.
const CY_BOOT_LINES = [
  "$ ./draftnet --init",
  "[ OK ] mounting entity catalog ......... 28 found",
  "[ OK ] websocket bridge ................ connected",
  "[ OK ] chat filter ..................... armed",
  "[ OK ] render protocol ................. ready",
  "> booting interface_",
];

// Types a list of lines character-by-character; returns the visible text plus
// a `done` flag once the whole buffer has printed. Falls straight to done if
// the user prefers reduced motion (also keeps the static canvas legible).
function useTypedLog(lines, { speed = 9, lineGap = 60 } = {}) {
  const full = lines.join("\n");
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [n, setN] = useState(reduced ? full.length : 0);
  useEffect(() => {
    if (reduced) return;
    let i = 0;
    let timer;
    const step = () => {
      i += 1;
      setN(i);
      if (i >= full.length) return;
      const justTypedNewline = full[i - 1] === "\n";
      timer = setTimeout(step, justTypedNewline ? lineGap : speed);
    };
    timer = setTimeout(step, 300);
    return () => clearTimeout(timer);
  }, [full, reduced, speed, lineGap]);
  return { text: full.slice(0, n), done: n >= full.length };
}

// ── ASCII shader ────────────────────────────────────────────────────────────
// A grid of monospace glyphs whose density is driven by an animated,
// domain-warped plasma field. Renders to a <canvas> scoped inside .cy-app
// (absolute, behind content). Pauses via IntersectionObserver when off-screen
// so the multi-artboard canvas page doesn't run a dozen loops at once.
const CY_RAMP = " .:-=+*o#%@"; // low → high density (mono-safe ASCII)
function CYShader({ intensity = 1, hot = false }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const cell = hot ? 16 : 14;  // glyph cell size in CSS px
    let cols = 0, rows = 0, w = 0, h = 0, dpr = 1;
    let raf = 0, last = 0, t0 = performance.now();
    let visible = true;
    const sp = hot ? 1.25 : 1;   // motion speed multiplier (slowed)
    const fps = hot ? 60 : 30;   // frame cap

    // Precompute a small palette: alpha + lime↔violet hue ramp by brightness.
    const levels = CY_RAMP.length;
    const colors = [];
    for (let i = 0; i < levels; i++) {
      const v = i / (levels - 1);
      // low: dim violet · mid: violet→lime · high: bright lime
      const r = Math.round(140 + (179 - 140) * v + (v > 0.6 ? (v - 0.6) * 120 : 0));
      const g = Math.round(40 + (255 - 40) * v);
      const b = Math.round(200 - 160 * v);
      const a = (hot ? 0.26 + v * v * 0.95 : 0.05 + v * v * 0.5) * intensity;
      colors.push(`rgba(${Math.min(r,205)},${Math.min(g,255)},${Math.max(b,40)},${a.toFixed(3)})`);
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      cols = Math.ceil(w / cell);
      rows = Math.ceil(h / cell);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `${cell}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textBaseline = "top";
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      if (now - last < 1000 / fps) return; // frame cap
      last = now;
      if (!cols || !rows) { resize(); if (!cols) return; }
      const t = (now - t0) * 0.001 * sp;
      ctx.clearRect(0, 0, w, h);
      const cx = cols * 0.5, cy = rows * 0.5;
      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          // domain warp for organic, large-scale drift
          const wx = Math.sin(gy * 0.12 + t * 0.9) * 2.6;
          const wy = Math.cos(gx * 0.10 - t * 0.7) * 2.6;
          const dx = gx - cx, dy = gy - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          let v =
            Math.sin((gx + wx) * 0.11 + t * 1.3) +
            Math.sin((gy + wy) * 0.10 - t * 1.05) +
            Math.sin((gx + gy) * 0.07 + t * 0.85) +
            0.7 * Math.sin(d * 0.09 - t * 1.6);
          v = (v + 3.7) / 7.4;        // → ~0..1
          if (v < 0) v = 0; else if (v > 1) v = 1;
          v = hot ? Math.pow(v, 1.5) : v * v * v; // hot = denser; calm = sparse ridges
          let lvl = (v * (levels - 1)) | 0;
          if (lvl <= 0) continue;     // skip spaces — big perf win
          if (lvl > levels - 1) lvl = levels - 1;
          ctx.fillStyle = colors[lvl];
          ctx.fillText(CY_RAMP[lvl], gx * cell, gy * cell);
        }
      }
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(
      (entries) => { visible = entries[0].isIntersecting; },
      { threshold: 0.01 }
    );
    io.observe(canvas);
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [intensity, hot]);

  return <canvas ref={canvasRef} className={`cy-shader${hot ? " cy-shader-hot" : ""}`} aria-hidden="true" />;
}

function CYChrome({ phase = "lobby", code = "K7-MIRA", hot = false, children }) {
  const phases = ["lobby", "drafting", "review"];
  const idx = phases.indexOf(phase);
  return (
    <div className="cy-app">
      <CYShader hot={hot} />
      <div className="cy-scanlines" />
      <header className="cy-header">
        <div className="cy-brand">
          <span className="cy-brand-bracket">[</span>
          <span className="cy-brand-name">DRAFT_NET</span>
          <span className="cy-brand-bracket">]</span>
          <span className="cy-brand-cur">▮</span>
        </div>
        <div className="cy-phases">
          {phases.map((p, i) => (
            <span key={p} className={`cy-phase ${i === idx ? "is-active" : i < idx ? "is-done" : ""}`}>
              {String(i + 1).padStart(2, "0")}_{p}
            </span>
          ))}
        </div>
        <div className="cy-meta">
          <span className="cy-meta-key">$ ROOM=</span><span className="cy-meta-val">{code}</span>
          <button className="cy-meta-copy">[copy]</button>
        </div>
      </header>
      <div className="cy-body">{children}</div>
    </div>
  );
}

// Full ASCII box-drawing border. Measures the frame, fills top/bottom edges
// with ═, the sides with ║, with real ╔╗╚╝ corners. Re-measures on resize so
// the box always fits. Purely decorative (pointer-events:none, aria-hidden).
function CYFrameBorder({ label }) {
  const ref = useRef(null);
  const measRef = useRef(null);
  const [grid, setGrid] = useState({ cols: 0, rows: 0, cw: 0, ch: 0 });
  useEffect(() => {
    const el = ref.current, meas = measRef.current;
    if (!el || !meas) return;
    const MEAS_N = 20;
    const compute = () => {
      const rect = el.getBoundingClientRect();
      const mrect = meas.getBoundingClientRect();
      const cw = mrect.width / MEAS_N;
      const ch = mrect.height;
      if (!cw || !ch || !rect.width) return;
      const cols = Math.max(2, Math.floor(rect.width / cw));
      const rows = Math.max(2, Math.floor(rect.height / ch));
      setGrid((g) => (g.cols === cols && g.rows === rows ? g : { cols, rows, cw, ch }));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { cols, rows, cw, ch } = grid;
  const top = cols ? "╔" + "═".repeat(cols - 2) + "╗" : "";
  const bot = cols ? "╚" + "═".repeat(cols - 2) + "╝" : "";
  const side = rows > 2 ? Array(rows - 2).fill("║").join("\n") : "";
  const lh = { lineHeight: ch + "px" };
  return (
    <div className="cy-frame-border" ref={ref} aria-hidden="true">
      <span className="cy-frame-meas" ref={measRef}>{"═".repeat(20)}</span>
      {cols > 0 && (
        <>
          <div className="cy-frame-edge cy-frame-top" style={lh}>{top}</div>
          <pre className="cy-frame-edge cy-frame-side" style={{ ...lh, top: ch + "px" }}>{side}</pre>
          <pre className="cy-frame-edge cy-frame-side" style={{ ...lh, top: ch + "px", left: (cols - 1) * cw + "px" }}>{side}</pre>
          <div className="cy-frame-edge cy-frame-bottom" style={{ ...lh, top: (rows - 1) * ch + "px" }}>{bot}</div>
        </>
      )}
      {label && <span className="cy-frame-label">┤ {label} ├</span>}
    </div>
  );
}

function CYHome() {
  const boot = useTypedLog(CY_BOOT_LINES);
  return (
    <CYChrome phase="lobby" code="—" hot>
      <div className="cy-home">
        <div className="cy-hero">
          <div className="cy-frame">
            <CYFrameBorder label="DRAFT_NET · v1.0" />

            <div className="cy-boot" aria-hidden="true">{boot.text}</div>

            <div className={`cy-logo-wrap ${boot.done ? "is-rendered" : ""}`} role="img" aria-label="DRAFT">
              <pre className="cy-logo">
                {CY_LOGO_LINES.map((line, i) => (
                  <span key={i} className="cy-logo-line">{line + "\n"}</span>
                ))}
              </pre>
              <div className="cy-logo-glitch" aria-hidden="true">
                <pre>{CY_LOGO_LINES.join("\n")}</pre>
              </div>
            </div>

            <div className="cy-hero-tagline">
              <span className="cy-prompt">&gt;</span> REAL-TIME PICK<span className="cy-slash">/</span>BAN PROTOCOL
            </div>
          </div>
        </div>

        <div className="cy-home-grid">
          <button className="cy-card">
            <div className="cy-card-head">
              <span className="cy-card-num">[ 01 ]</span>
              <span className="cy-card-title"><span className="cy-card-prompt">&gt;</span> SPAWN_ROOM</span>
            </div>
            <div className="cy-card-rule" aria-hidden="true" />
            <p className="cy-card-desc">Initialize a new draft session. You become host.</p>
            <div className="cy-card-action">
              <span className="cy-card-btn">▸ EXECUTE</span>
            </div>
          </button>
          <div className="cy-card">
            <div className="cy-card-head">
              <span className="cy-card-num">[ 02 ]</span>
              <span className="cy-card-title"><span className="cy-card-prompt">&gt;</span> JOIN_ROOM</span>
            </div>
            <div className="cy-card-rule" aria-hidden="true" />
            <p className="cy-card-desc">Connect to an existing session via room code or URL.</p>
            <div className="cy-card-action">
              <label className="cy-input-wrap">
                <span className="cy-input-prompt">&gt;</span>
                <input className="cy-input cy-input-bare" placeholder="K7-MIRA" />
              </label>
              <button className="cy-card-btn" type="button">▸ CONNECT</button>
            </div>
          </div>
        </div>
      </div>
    </CYChrome>
  );
}

function CYLogin() {
  return (
    <CYChrome phase="lobby" code="—">
      <div className="cy-login">
        <div className="cy-login-card">
          <div className="cy-login-eyebrow">$ ./auth --provider=discord</div>
          <h2>USER_AUTH_REQUIRED</h2>
          <p>// signed-in users can host or captain. guests = spectate only.</p>
          <button className="cy-btn cy-btn-discord">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.249.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
            CONTINUE_DISCORD()
          </button>
          <div className="cy-divider">--- // ---</div>
          <button className="cy-btn cy-btn-ghost">SPECTATE_AS_GUEST()</button>
          <p className="cy-foot">// chat_filter: ENABLED · slur_block: ENABLED</p>
        </div>
      </div>
    </CYChrome>
  );
}

function CYTeamLobby({ team, members }) {
  const slots = [0, 1, 2];
  const accent = team === "A" ? "lime" : "violet";
  return (
    <div className={`cy-team cy-team-${accent}`}>
      <div className="cy-team-head">
        <span className="cy-bracket">[</span>
        TEAM_{team}
        <span className="cy-bracket">]</span>
        <span className="cy-team-status">{members.length}/3</span>
      </div>
      <ul className="cy-slot-list">
        {slots.map((i) => {
          const m = members[i];
          if (!m) return (
            <li key={i} className="cy-slot cy-slot-empty">
              <span className="cy-slot-num">[{String(i).padStart(2, "0")}]</span>
              <span className="cy-slot-empty-label">&lt;EMPTY&gt;</span>
            </li>
          );
          return (
            <li key={i} className="cy-slot">
              <span className="cy-slot-num">[{String(i).padStart(2, "0")}]</span>
              <span className="cy-slot-name">{m.displayName}</span>
              {m.isCaptain && <span className="cy-tag cy-tag-cap">CAPTAIN</span>}
              {m.isHost && <span className="cy-tag">HOST</span>}
            </li>
          );
        })}
      </ul>
      <button className={`cy-btn cy-btn-${accent} cy-btn-block`}>JOIN_TEAM_{team}()</button>
    </div>
  );
}

function CYLobbyBody() {
  const lobby = window.SAMPLE_LOBBY;
  return (
      <div className="cy-lobby">
        <div className="cy-banner">
          <div>
            <div className="cy-banner-eyebrow">// status: AWAITING_HOST_SIGNAL</div>
            <h2>LOBBY.INIT()</h2>
            <p>&gt; assemble both teams. captains required. configure script via [SETTINGS].</p>
          </div>
          <div className="cy-banner-stats">
            <div><b>{lobby.teams.A.length + lobby.teams.B.length}</b><span>PLAYERS</span></div>
            <div><b>{lobby.spectators.length}</b><span>SPECTATORS</span></div>
            <div><b>10</b><span>TURNS</span></div>
          </div>
        </div>

        <div className="cy-host-panel">
          <div className="cy-host-head">[HOST_CONSOLE]</div>
          <div className="cy-host-row">
            <select className="cy-input"><option>--move--</option></select>
            <select className="cy-input"><option>--to--</option></select>
            <button className="cy-btn cy-btn-sm">EXEC</button>
            <button className="cy-btn cy-btn-sm">CONFIG</button>
            <div className="cy-grow" />
            <button className="cy-btn cy-btn-sm cy-btn-danger">CANCEL</button>
            <button className="cy-btn cy-btn-primary">▶ START_DRAFT()</button>
          </div>
        </div>

        <div className="cy-lobby-grid">
          <CYTeamLobby team="A" members={lobby.teams.A} />
          <CYTeamLobby team="B" members={lobby.teams.B} />
        </div>

        <div className="cy-spec">
          <div className="cy-spec-head">// SPECTATORS [{lobby.spectators.length}]</div>
          <div className="cy-spec-list">
            {lobby.spectators.map((s) => (
              <div key={s.userId} className="cy-spec-pill">{s.displayName}</div>
            ))}
          </div>
        </div>
      </div>
  );
}

function CYLobby() {
  const lobby = window.SAMPLE_LOBBY;
  return (
    <CYChrome phase="lobby" code={lobby.code}>
      <CYLobbyBody />
    </CYChrome>
  );
}

function CYChamp({ champ, state, onClick }) {
  return (
    <button type="button" className={`cy-champ cy-champ-${state}`} onClick={onClick} disabled={state !== "default" && state !== "selected"}>
      <div className={`cy-champ-art cy-champ-art-${champ.role}`}>
        <span>{champ.name[0]}{champ.name[1] || ""}</span>
        {state === "banned" && <div className="cy-champ-x">✕</div>}
      </div>
      <div className="cy-champ-meta">
        <span className="cy-champ-name">{champ.name}</span>
        <span className="cy-champ-role">.{champ.role}</span>
      </div>
    </button>
  );
}

function CYDraftSlot({ action, champ, isActive, accent }) {
  if (!champ) return (
    <div className={`cy-pickslot cy-pickslot-empty cy-pickslot-${accent} ${isActive ? "is-active" : ""}`}>
      <span className="cy-pickslot-action">{action}_</span>
      <span className="cy-pickslot-fill">{isActive ? "█▓░ ACTIVE" : "──────"}</span>
    </div>
  );
  return (
    <div className={`cy-pickslot cy-pickslot-${accent} ${action === "ban" ? "is-ban" : ""}`}>
      <div className={`cy-pickslot-art cy-champ-art-${champ.role}`}><span>{champ.name[0]}{champ.name[1] || ""}</span></div>
      <div>
        <div className="cy-pickslot-name">{champ.name}</div>
        <div className="cy-pickslot-action">{action}</div>
      </div>
    </div>
  );
}

function CYDrafting({ chatMode = "sidebar" }) {
  const lobby = window.SAMPLE_LOBBY;
  const ds = window.SAMPLE_DRAFT_STATE;
  const script = window.DEFAULT_SCRIPT;
  const usedIds = ds.actions.map(a => a.champion_id);
  const currentTurn = script[ds.turnIndex];
  const [selected, setSelected] = useState(null);
  const [seconds, setSeconds] = useState(ds.timerSeconds);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 30)), 1000);
    return () => clearInterval(id);
  }, []);
  const pct = (seconds / 30) * 100;
  const cardState = (champ) => {
    if (usedIds.includes(champ.id)) {
      const act = ds.actions.find(a => a.champion_id === champ.id);
      return act.action === "ban" ? "banned" : "picked";
    }
    return selected === champ.id ? "selected" : "default";
  };
  function teamSlots(team) {
    return script.map((t, i) => ({ ...t, i })).filter(t => t.team === team).map((t) => {
      const act = ds.actions.find(a => a.turn_index === t.i);
      return { action: t.action, champ: act ? window.lookupChamp(act.champion_id) : null, isActive: t.i === ds.turnIndex };
    });
  }
  return (
    <CYChrome phase="drafting" code={lobby.code}>
      <div className={`cy-draft cy-draft-chat-${chatMode}`}>
        <div className={`cy-turn cy-turn-${currentTurn.team === "A" ? "lime" : "violet"}`}>
          <div className="cy-turn-readout">
            <span className="cy-turn-label">$ TURN_{String(ds.turnIndex + 1).padStart(2, "0")}/10</span>
            <span className="cy-turn-team">TEAM_{currentTurn.team} :: {currentTurn.action.toUpperCase()}</span>
            <span className="cy-turn-cap">cap=&gt;{(currentTurn.team === "A" ? lobby.teams.A : lobby.teams.B).find(m => m.isCaptain).displayName}</span>
          </div>
          <div className={`cy-turn-clock ${seconds <= 10 ? "is-urgent" : ""}`}>
            <div className="cy-turn-clock-num">{String(seconds).padStart(2, "0")}<span>s</span></div>
            <div className="cy-turn-clock-bar"><div style={{ width: `${pct}%` }} /></div>
          </div>
          <div className="cy-turn-pips">
            {script.map((t, i) => (
              <span key={i} className={`cy-pip cy-pip-${t.team === "A" ? "lime" : "violet"} cy-pip-${t.action} ${i < ds.turnIndex ? "is-done" : i === ds.turnIndex ? "is-active" : ""}`}>
                {t.action === "ban" ? "▲" : "■"}
              </span>
            ))}
          </div>
        </div>

        <div className="cy-draft-grid">
          <aside className="cy-draft-col cy-draft-col-lime">
            <div className="cy-draft-col-head">// TEAM_A</div>
            <div className="cy-draft-col-section">
              <div className="cy-draft-col-label">&gt; bans</div>
              {teamSlots("A").filter(s => s.action === "ban").map((s, i) => <CYDraftSlot key={i} {...s} accent="lime" />)}
            </div>
            <div className="cy-draft-col-section">
              <div className="cy-draft-col-label">&gt; picks</div>
              {teamSlots("A").filter(s => s.action === "pick").map((s, i) => <CYDraftSlot key={i} {...s} accent="lime" />)}
            </div>
          </aside>

          <main className="cy-roster">
            <div className="cy-roster-head">
              <h3>&gt; SELECT_TARGET[ {28 - usedIds.length} / 28 available ]</h3>
              <div className="cy-roster-filters">
                <button className="cy-chip is-active">all</button>
                <button className="cy-chip">.melee</button>
                <button className="cy-chip">.ranged</button>
                <button className="cy-chip">.support</button>
              </div>
            </div>
            <div className="cy-champ-grid">
              {window.CHAMPIONS.map((c) => (
                <CYChamp key={c.id} champ={c} state={cardState(c)} onClick={() => setSelected(selected === c.id ? null : c.id)} />
              ))}
            </div>
            {selected && (
              <button className={`cy-submit cy-submit-${currentTurn.action}`}>
                $ {currentTurn.action}({window.lookupChamp(selected).name}) [LOCK_IN]
              </button>
            )}
          </main>

          <aside className="cy-draft-col cy-draft-col-violet">
            <div className="cy-draft-col-head">// TEAM_B</div>
            <div className="cy-draft-col-section">
              <div className="cy-draft-col-label">&gt; bans</div>
              {teamSlots("B").filter(s => s.action === "ban").map((s, i) => <CYDraftSlot key={i} {...s} accent="violet" />)}
            </div>
            <div className="cy-draft-col-section">
              <div className="cy-draft-col-label">&gt; picks</div>
              {teamSlots("B").filter(s => s.action === "pick").map((s, i) => <CYDraftSlot key={i} {...s} accent="violet" />)}
            </div>
          </aside>
        </div>

        {chatMode === "sidebar" && <CYChat dock="right" />}
        {chatMode === "drawer" && <CYChat dock="drawer" />}
      </div>
    </CYChrome>
  );
}

function CYChat({ dock }) {
  const [tab, setTab] = useState("team");
  const msgs = window.SAMPLE_CHAT[tab] || [];
  return (
    <aside className={`cy-chat cy-chat-${dock}`}>
      <div className="cy-chat-head">
        <span>// chat.{tab}</span>
        <div className="cy-chat-tabs">
          <button className={tab === "all" ? "is-active" : ""} onClick={() => setTab("all")}>all</button>
          <button className={tab === "team" ? "is-active" : ""} onClick={() => setTab("team")}>team</button>
          <button className={tab === "spectator" ? "is-active" : ""} onClick={() => setTab("spectator")}>spec</button>
        </div>
      </div>
      <div className="cy-chat-list">
        {msgs.map((m, i) => (
          <div key={i} className={`cy-chat-msg ${m.sender === "shotcaller" ? "is-self" : ""}`}>
            <span className="cy-chat-prefix">{m.sender === "shotcaller" ? "&gt;" : "&lt;"}</span>
            <span className="cy-chat-sender">{m.sender}:</span>
            <span className="cy-chat-body">{m.body}</span>
          </div>
        ))}
        <div className="cy-chat-cursor">$ _</div>
      </div>
      <div className="cy-chat-input">
        <span>&gt;</span>
        <input placeholder="enter message" />
      </div>
    </aside>
  );
}

function CYReview() {
  const lobby = window.SAMPLE_LOBBY;
  const finalActions = [
    { team: "A", action: "ban", champion_id: "shifu" }, { team: "B", action: "ban", champion_id: "thorn" },
    { team: "A", action: "ban", champion_id: "jade" }, { team: "B", action: "ban", champion_id: "croak" },
    { team: "A", action: "pick", champion_id: "freya" }, { team: "B", action: "pick", champion_id: "ashka" },
    { team: "B", action: "pick", champion_id: "pearl" }, { team: "A", action: "pick", champion_id: "blossom" },
    { team: "A", action: "pick", champion_id: "jumong" }, { team: "B", action: "pick", champion_id: "rook" },
  ];
  const teamPicks = (t) => finalActions.filter(a => a.team === t && a.action === "pick").map(a => window.lookupChamp(a.champion_id));
  const teamBans = (t) => finalActions.filter(a => a.team === t && a.action === "ban").map(a => window.lookupChamp(a.champion_id));
  return (
    <CYChrome phase="review" code={lobby.code}>
      <div className="cy-review">
        <div className="cy-review-head">
          <div className="cy-review-eyebrow">// status: COMPLETE</div>
          <h2>$ DRAFT.RESULT()</h2>
          <pre className="cy-review-receipt">{`code: ${lobby.code}\nturns: 10\nelapsed: 04:32\nhash: a8f2c1`}</pre>
        </div>
        <div className="cy-review-grid">
          {[
            { team: "A", accent: "lime" },
            { team: "B", accent: "violet" },
          ].map(({ team, accent }) => (
            <div key={team} className={`cy-review-team cy-review-team-${accent}`}>
              <div className="cy-review-team-head">
                &gt; TEAM_{team}.roster = [{(team === "A" ? lobby.teams.A : lobby.teams.B).map(m => `"${m.displayName}"`).join(", ")}]
              </div>
              <div className="cy-review-picks">
                {teamPicks(team).map((c, i) => (
                  <div key={i} className="cy-review-pick">
                    <div className={`cy-review-pick-art cy-champ-art-${c.role}`}><span>{c.name[0]}{c.name[1] || ""}</span></div>
                    <div className="cy-review-pick-name">{c.name}</div>
                    <div className="cy-review-pick-role">.{c.role}</div>
                  </div>
                ))}
              </div>
              <div className="cy-review-bans">
                <span>BANS:</span>
                {teamBans(team).map((c, i) => <span key={i} className="cy-review-ban">{c.name}</span>)}
              </div>
            </div>
          ))}
        </div>
        <div className="cy-review-actions">
          <button className="cy-btn">$ COPY_LINK()</button>
          <button className="cy-btn cy-btn-primary">$ NEW_DRAFT()</button>
        </div>
      </div>
    </CYChrome>
  );
}

function CYPause() {
  return (
    <CYChrome phase="drafting" code="K7-MIRA">
      <div className="cy-pause">
        <div className="cy-pause-card">
          <div className="cy-pause-eyebrow">// CONNECTION_LOST</div>
          <h2>$ DRAFT.HOLD()</h2>
          <pre className="cy-pause-log">{`[ERR] team_b.captain.socket: closed
[INF] grace_period: 30s
[INF] awaiting reconnect…`}</pre>
          <div className="cy-pause-timer">
            <div className="cy-pause-timer-num">23<span>s</span></div>
            <div className="cy-pause-bar"><div style={{ width: "60%" }} /></div>
          </div>
          <p>&gt; if no reconnect, captaincy promotes to next team_b member</p>
        </div>
      </div>
    </CYChrome>
  );
}

// ── LOADING / CONNECTING ─────────────────────────────────────────────────
const CY_CONNECT_LINES = [
  "$ ./draftnet connect --room=K7-MIRA",
  "[ .. ] resolving host ..................",
  "[ OK ] tcp handshake ................... 24ms",
  "[ OK ] websocket upgrade ............... 101",
  "[ .. ] subscribing draft channel ......",
  "[ .. ] hydrating snapshot ..............",
];
function CYLoading() {
  const log = useTypedLog(CY_CONNECT_LINES, { speed: 7, lineGap: 120 });
  return (
    <CYChrome phase="lobby" code="K7-MIRA">
      <div className="cy-loading">
        <div className="cy-loading-card">
          <div className="cy-loading-eyebrow">$ ./draftnet --status</div>
          <h2>ESTABLISHING_LINK<span className="cy-dots" aria-hidden="true"></span></h2>
          <pre className="cy-loading-log">{log.text}{!log.done && <span className="cy-chat-cursor">▮</span>}</pre>
          <div className="cy-loading-meter">
            <div className="cy-loading-bar">
              <b>{"█".repeat(40)}</b>
            </div>
            <span className="cy-loading-pct">sync…</span>
          </div>
        </div>
      </div>
    </CYChrome>
  );
}

// ── GUEST GATE (sign-in required to view room) ───────────────────────────
function CYGuestGate() {
  return (
    <CYChrome phase="lobby" code="K7-MIRA">
      <div className="cy-gate">
        <div className="cy-gate-card">
          <div className="cy-gate-eyebrow">// access: RESTRICTED</div>
          <h2>$ ROOM.ACCESS()</h2>
          <pre className="cy-gate-readout">{`> GET /draft/K7-MIRA
`}<span className="cy-403">{`< 403 SIGN_IN_REQUIRED`}</span>{`
> identity = <guest:anon>
> hint: host has not opened this room to spectators`}</pre>
          <p>// sign in to join this draft as a player or captain — or wait for the host to start it, then spectate.</p>
          <div className="cy-gate-actions">
            <button className="cy-btn cy-btn-discord">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.249.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
              SIGN_IN_DISCORD()
            </button>
            <button className="cy-btn cy-btn-ghost">RETRY_AS_GUEST()</button>
          </div>
          <p className="cy-gate-foot">// you can still watch once the draft goes live</p>
        </div>
      </div>
    </CYChrome>
  );
}

// ── ROOM CANCELLED ────────────────────────────────────────────────────────
function CYCancelled() {
  return (
    <CYChrome phase="lobby" code="K7-MIRA">
      <div className="cy-cancel">
        <div className="cy-cancel-card">
          <div className="cy-cancel-eyebrow">// SESSION_TERMINATED</div>
          <h2>$ ROOM.KILL()</h2>
          <pre className="cy-cancel-log"><span className="cy-sig">{`[SIG] host issued SIGKILL → room K7-MIRA`}</span>{`
[INF] flushing draft state ............ done
[INF] notifying 6 players, 3 spectators
[INF] releasing room code ............. K7-MIRA
`}<span className="cy-ok">{`[ OK ] socket closed cleanly (code 1000)`}</span></pre>
          <div className="cy-cancel-actions">
            <button className="cy-btn">$ COPY_LOG()</button>
            <button className="cy-btn cy-btn-primary">$ NEW_DRAFT()</button>
          </div>
        </div>
      </div>
    </CYChrome>
  );
}

// ── SCRIPT EDITOR (used inside settings modal) ───────────────────────────
function CYScriptEditor() {
  const [rows, setRows] = useState(() =>
    window.DEFAULT_SCRIPT.map((t, i) => ({ id: `t${i}`, team: t.team, action: t.action }))
  );
  const drag = useRef(-1);
  const seq = useRef(window.DEFAULT_SCRIPT.length);
  const update = (i, field, value) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  const remove = (i) => setRows((rs) => rs.filter((_, idx) => idx !== i));
  const add = () => setRows((rs) => [...rs, { id: `t${seq.current++}`, team: "A", action: "ban" }]);
  const onDrop = (i) => {
    const from = drag.current;
    if (from === -1 || from === i) return;
    setRows((rs) => {
      const next = [...rs];
      const [m] = next.splice(from, 1);
      next.splice(i, 0, m);
      return next;
    });
    drag.current = -1;
  };
  return (
    <ul className="cy-script" aria-label="pick/ban order">
      {rows.map((r, i) => (
        <li
          key={r.id}
          className="cy-script-row"
          draggable
          onDragStart={() => (drag.current = i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => onDrop(i)}
        >
          <span className="cy-script-grip" aria-hidden="true">⠿</span>
          <span className="cy-script-idx">{String(i + 1).padStart(2, "0")}</span>
          <select
            className={r.team === "A" ? "team-a" : "team-b"}
            value={r.team}
            onChange={(e) => update(i, "team", e.target.value)}
          >
            <option value="A">TEAM_A</option>
            <option value="B">TEAM_B</option>
          </select>
          <select
            className={r.action === "ban" ? "is-ban" : "is-pick"}
            value={r.action}
            onChange={(e) => update(i, "action", e.target.value)}
          >
            <option value="ban">ban()</option>
            <option value="pick">pick()</option>
          </select>
          <button className="cy-script-rm" onClick={() => remove(i)}>rm</button>
        </li>
      ))}
      <button className="cy-btn cy-btn-sm cy-script-add" onClick={add}>+ ADD_TURN</button>
    </ul>
  );
}

// ── DRAFT SETTINGS (modal over lobby) ────────────────────────────────────
function CYSettings() {
  const lobby = window.SAMPLE_LOBBY;
  const [open, setOpen] = useState(true);
  const [timer, setTimer] = useState(30);
  return (
    <CYChrome phase="lobby" code={lobby.code}>
      <CYLobbyBody />
      {open && (
        <div className="cy-modal-scrim" onClick={() => setOpen(false)}>
          <div className="cy-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cy-modal-bar">
              <span className="cy-dot cy-dot-r"></span>
              <span className="cy-dot cy-dot-a"></span>
              <span className="cy-dot cy-dot-g"></span>
              <span className="cy-modal-title">~/draft/config.sh</span>
              <button className="cy-modal-x" onClick={() => setOpen(false)}>esc ✕</button>
            </div>
            <div className="cy-modal-body">
              <div className="cy-modal-head">
                <h3>&gt; DRAFT_SETTINGS</h3>
                <p>// configure turn timer and the pick/ban execution order</p>
              </div>
              <div className="cy-field">
                <span className="cy-field-label">turn_timer</span>
                <div className="cy-stepper">
                  <button onClick={() => setTimer((t) => Math.max(10, t - 5))} aria-label="decrease">−</button>
                  <div className="cy-stepper-val">{timer}<span>sec</span></div>
                  <button onClick={() => setTimer((t) => Math.min(120, t + 5))} aria-label="increase">+</button>
                </div>
              </div>
              <div className="cy-field">
                <span className="cy-field-label">pick / ban order — drag ⠿ to reorder</span>
                <CYScriptEditor />
              </div>
            </div>
            <div className="cy-modal-foot">
              <span className="cy-grow" />
              <button className="cy-btn cy-btn-sm" onClick={() => setOpen(false)}>CANCEL</button>
              <button className="cy-btn cy-btn-primary cy-btn-sm" onClick={() => setOpen(false)}>SAVE_CONFIG()</button>
            </div>
          </div>
        </div>
      )}
    </CYChrome>
  );
}

// ── EXPANDED HOST CONTROLS (console modal over lobby) ────────────────────
function CYHostControls() {
  const lobby = window.SAMPLE_LOBBY;
  const [open, setOpen] = useState(true);
  const roster = [
    ...lobby.teams.A.map((m) => ({ ...m, side: "A" })),
    ...lobby.teams.B.map((m) => ({ ...m, side: "B" })),
  ];
  // sample state: team B has no captain → start gated
  const hasCapA = lobby.teams.A.some((m) => m.isCaptain);
  const hasCapB = false;
  return (
    <CYChrome phase="lobby" code={lobby.code}>
      <CYLobbyBody />
      {open && (
        <div className="cy-modal-scrim" onClick={() => setOpen(false)}>
          <div className="cy-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cy-modal-bar">
              <span className="cy-dot cy-dot-r"></span>
              <span className="cy-dot cy-dot-a"></span>
              <span className="cy-dot cy-dot-g"></span>
              <span className="cy-modal-title">~/draft/host_console</span>
              <button className="cy-modal-x" onClick={() => setOpen(false)}>esc ✕</button>
            </div>
            <div className="cy-modal-body">
              <div className="cy-modal-head">
                <h3>&gt; HOST_CONSOLE</h3>
                <p>// root@K7-MIRA — manage rosters before launch</p>
              </div>

              <div className="cy-hc-section">
                <span className="cy-field-label">move_player</span>
                <div className="cy-hc-row">
                  <div className="cy-field">
                    <select className="cy-input">
                      {roster.filter((m) => m.userId).map((m) => (
                        <option key={m.userId}>{m.displayName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="cy-field" style={{ flex: "0 0 90px" }}>
                    <select className="cy-input"><option>→ A</option><option>→ B</option></select>
                  </div>
                  <button className="cy-btn cy-btn-sm">EXEC</button>
                </div>
              </div>

              <div className="cy-hc-section">
                <span className="cy-field-label">kick</span>
                <ul className="cy-kick-list">
                  {roster.filter((m) => !m.isHost).map((m) => (
                    <li key={`${m.userId}-${m.side}`} className="cy-kick-item">
                      <span className="cy-kick-name">{m.displayName}</span>
                      <span className="cy-kick-team">team_{m.side}{m.isCaptain ? " · cap" : ""}</span>
                      <span className="cy-grow" />
                      <button className="cy-kick-btn">kick()</button>
                    </li>
                  ))}
                </ul>
              </div>

              {(!hasCapA || !hasCapB) && (
                <div className="cy-hc-hint">both teams need a captain before START_DRAFT() unlocks</div>
              )}
            </div>
            <div className="cy-modal-foot">
              <button className="cy-btn cy-btn-sm cy-btn-danger" onClick={() => setOpen(false)}>CANCEL_ROOM</button>
              <span className="cy-grow" />
              <button className="cy-btn cy-btn-primary cy-btn-sm" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>▶ START_DRAFT()</button>
            </div>
          </div>
        </div>
      )}
    </CYChrome>
  );
}

window.Cyber = { CYHome, CYLogin, CYLobby, CYDrafting, CYReview, CYPause, CYLoading, CYGuestGate, CYCancelled, CYSettings, CYHostControls };
