/* global React, ReactDOM */
const { useState } = React;

// Pull all variant components
const { DBHome, DBLogin, DBLobby, DBDrafting, DBReview, DBPause } = window.DarkBroadcast;
const { ARHome, ARLogin, ARLobby, ARDrafting, ARReview, ARPause } = window.Arcade;
const { CYHome, CYLogin, CYLobby, CYDrafting, CYReview, CYPause, CYLoading, CYGuestGate, CYCancelled, CYSettings, CYHostControls } = window.Cyber;

// Screens that only exist in the lead Cyber direction (built out from the source app)
const CY_EXTRA = {
  loading: CYLoading, gate: CYGuestGate, cancelled: CYCancelled,
  settings: CYSettings, host: CYHostControls,
};

// ============================================================
// LEAD PROTOTYPE — fullscreen, tweakable
// ============================================================

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "variant": "cyber",
  "screen": "home",
  "chatMode": "sidebar",
  "showSpectatorChat": true
}/*EDITMODE-END*/;

function LeadPrototype() {
  const [tweaks, setTweaks] = useTweaks(TWEAK_DEFAULTS);
  const { variant, screen, chatMode } = tweaks;

  const variants = {
    "dark-broadcast": { Home: DBHome, Login: DBLogin, Lobby: DBLobby, Drafting: DBDrafting, Review: DBReview, Pause: DBPause },
    "arcade": { Home: ARHome, Login: ARLogin, Lobby: ARLobby, Drafting: ARDrafting, Review: ARReview, Pause: ARPause },
    "cyber": { Home: CYHome, Login: CYLogin, Lobby: CYLobby, Drafting: CYDrafting, Review: CYReview, Pause: CYPause },
  };
  const V = variants[variant];
  const Comp = {
    home: V.Home, login: V.Login, lobby: V.Lobby,
    drafting: V.Drafting, review: V.Review, pause: V.Pause,
  }[screen] || CY_EXTRA[screen];

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex" }}>
      <Comp chatMode={chatMode} />
      <TweaksPanel title="Tweaks" defaultPos={{ right: 16, bottom: 16 }}>
        <TweakSection title="Visual variant">
          <TweakSelect value={variant} onChange={(v) => setTweaks({ variant: v })} options={[
            { value: "dark-broadcast", label: "Dark Broadcast" },
            { value: "arcade", label: "Arcade" },
            { value: "cyber", label: "Cyber/Neon" },
          ]} />
        </TweakSection>
        <TweakSection title="Screen">
          <TweakSelect value={screen} onChange={(v) => setTweaks({ screen: v })} options={[
            { value: "home", label: "Landing / Home" },
            { value: "login", label: "Sign-in" },
            { value: "lobby", label: "Lobby (pre-draft)" },
            { value: "drafting", label: "Drafting (active)" },
            { value: "pause", label: "Drafting (paused)" },
            { value: "review", label: "Review (post-draft)" },
            { value: "settings", label: "Draft settings (Cyber)" },
            { value: "host", label: "Host console (Cyber)" },
            { value: "loading", label: "Connecting (Cyber)" },
            { value: "gate", label: "Guest gate (Cyber)" },
            { value: "cancelled", label: "Room cancelled (Cyber)" },
          ]} />
        </TweakSection>
        <TweakSection title="Chat placement (Drafting only)">
          <TweakRadio value={chatMode} onChange={(v) => setTweaks({ chatMode: v })} options={[
            { value: "sidebar", label: "Sidebar" },
            { value: "drawer", label: "Drawer" },
          ]} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// ============================================================
// DESIGN CANVAS — overview of all variants × all screens
// ============================================================

function ScreenFrame({ children, w = 1280, h = 800 }) {
  // Render each screen at native scale inside an artboard sized to fit
  return (
    <div style={{
      width: w, height: h,
      overflow: "hidden",
      background: "#000",
      position: "relative",
    }}>
      {children}
    </div>
  );
}

function CanvasRoot() {
  const variants = [
    { id: "dark-broadcast", label: "Dark Broadcast", subtitle: "Esports tournament HUD — black, electric cyan + magenta", components: { Home: DBHome, Login: DBLogin, Lobby: DBLobby, Drafting: DBDrafting, Review: DBReview, Pause: DBPause } },
    { id: "arcade", label: "Arcade", subtitle: "Chunky, playful — cream + hot pink + cobalt + yellow", components: { Home: ARHome, Login: ARLogin, Lobby: ARLobby, Drafting: ARDrafting, Review: ARReview, Pause: ARPause } },
    { id: "cyber", label: "Cyber/Neon", subtitle: "Terminal aesthetic — monospace, scanlines, lime + violet", components: { Home: CYHome, Login: CYLogin, Lobby: CYLobby, Drafting: CYDrafting, Review: CYReview, Pause: CYPause } },
  ];
  const screens = [
    { id: "home", label: "Landing / Home", w: 1280, h: 800 },
    { id: "login", label: "Sign-in", w: 1280, h: 800 },
    { id: "lobby", label: "Lobby", w: 1280, h: 920 },
    { id: "drafting", label: "Drafting", w: 1600, h: 1100 },
    { id: "pause", label: "Drafting · paused", w: 1280, h: 800 },
    { id: "review", label: "Review", w: 1280, h: 1000 },
  ];
  // Screens built out only in the lead Cyber direction
  const cyberExtra = [
    { id: "settings", label: "Draft settings · modal over lobby", w: 1280, h: 940, Comp: CYSettings },
    { id: "host", label: "Host console · modal over lobby", w: 1280, h: 940, Comp: CYHostControls },
    { id: "loading", label: "Connecting / loading", w: 1280, h: 800, Comp: CYLoading },
    { id: "gate", label: "Guest gate · sign-in required", w: 1280, h: 800, Comp: CYGuestGate },
    { id: "cancelled", label: "Room cancelled", w: 1280, h: 800, Comp: CYCancelled },
  ];

  return (
    <DesignCanvas>
      <DCSection id="intro" title="Real-time pick & ban — three directions"
        subtitle="Three full visual systems × six screens. Toggle the lead prototype above with Tweaks for live behavior.">
        <DCPostIt width={300}>
          {`Stack:
• Dark Broadcast — fits an esports / tournament context. Tight grid, scanlines, glowing accents, monospace meta. Reads "serious & high stakes."
• Arcade — playful and approachable. Chunky borders, drop shadows, stickers, hand-feel typography. For a casual community.
• Cyber/Neon — terminal-aesthetic, all monospace, ASCII flourishes. Speaks to a hacker / indie crowd.

Each variant covers all 6 states: Home, Sign-in, Lobby, Drafting (active + paused), Review.`}
        </DCPostIt>
        <DCArtboard id="lead" label="★ Lead prototype — open fullscreen, then toggle Tweaks" width={1400} height={900}>
          <LeadPrototype />
        </DCArtboard>
      </DCSection>

      {variants.map((variant) => (
        <DCSection key={variant.id} id={variant.id} title={variant.label} subtitle={variant.subtitle}>
          {screens.map((s) => {
            const Comp = variant.components[
              s.id === "home" ? "Home" : s.id === "login" ? "Login" : s.id === "lobby" ? "Lobby" :
              s.id === "drafting" ? "Drafting" : s.id === "pause" ? "Pause" : "Review"
            ];
            return (
              <DCArtboard key={s.id} id={`${variant.id}-${s.id}`} label={s.label} width={s.w} height={s.h}>
                <ScreenFrame w={s.w} h={s.h}>
                  <Comp chatMode="sidebar" />
                </ScreenFrame>
              </DCArtboard>
            );
          })}
          {variant.id === "cyber" && cyberExtra.map((s) => (
            <DCArtboard key={s.id} id={`cyber-${s.id}`} label={s.label} width={s.w} height={s.h}>
              <ScreenFrame w={s.w} h={s.h}>
                <s.Comp chatMode="sidebar" />
              </ScreenFrame>
            </DCArtboard>
          ))}
        </DCSection>
      ))}
    </DesignCanvas>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<CanvasRoot />);
