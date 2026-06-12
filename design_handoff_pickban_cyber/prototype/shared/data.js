// Battlerite-style champion catalog from the source codebase
window.CHAMPIONS = [
  { id: "bakko", name: "Bakko", role: "melee" },
  { id: "jamila", name: "Jamila", role: "melee" },
  { id: "croak", name: "Croak", role: "melee" },
  { id: "freya", name: "Freya", role: "melee" },
  { id: "raigon", name: "Raigon", role: "melee" },
  { id: "rook", name: "Rook", role: "melee" },
  { id: "ruh-kaan", name: "Ruh Kaan", role: "melee" },
  { id: "shifu", name: "Shifu", role: "melee" },
  { id: "thorn", name: "Thorn", role: "melee" },
  { id: "alysia", name: "Alysia", role: "ranged" },
  { id: "ashka", name: "Ashka", role: "ranged" },
  { id: "destiny", name: "Destiny", role: "ranged" },
  { id: "ezmo", name: "Ezmo", role: "ranged" },
  { id: "iva", name: "Iva", role: "ranged" },
  { id: "jade", name: "Jade", role: "ranged" },
  { id: "jumong", name: "Jumong", role: "ranged" },
  { id: "shen-rao", name: "Shen Rao", role: "ranged" },
  { id: "taya", name: "Taya", role: "ranged" },
  { id: "varesh", name: "Varesh", role: "ranged" },
  { id: "blossom", name: "Blossom", role: "support" },
  { id: "lucie", name: "Lucie", role: "support" },
  { id: "oldur", name: "Oldur", role: "support" },
  { id: "pearl", name: "Pearl", role: "support" },
  { id: "pestilus", name: "Pestilus", role: "support" },
  { id: "poloma", name: "Poloma", role: "support" },
  { id: "sirius", name: "Sirius", role: "support" },
  { id: "ulric", name: "Ulric", role: "support" },
  { id: "zander", name: "Zander", role: "support" },
];

// Default pick/ban script: 4 alternating bans, then 6 picks in snake order
window.DEFAULT_SCRIPT = [
  { team: "A", action: "ban" },
  { team: "B", action: "ban" },
  { team: "A", action: "ban" },
  { team: "B", action: "ban" },
  { team: "A", action: "pick" },
  { team: "B", action: "pick" },
  { team: "B", action: "pick" },
  { team: "A", action: "pick" },
  { team: "A", action: "pick" },
  { team: "B", action: "pick" },
];

// Plausible team rosters
window.SAMPLE_LOBBY = {
  code: "K7-MIRA",
  hostUserId: "u-host",
  phase: "drafting",
  teams: {
    A: [
      { userId: "u-host", displayName: "shotcaller", isCaptain: true, isHost: true },
      { userId: "u-2", displayName: "kira.exe", isCaptain: false, isHost: false },
      { userId: "u-3", displayName: "ronin", isCaptain: false, isHost: false },
    ],
    B: [
      { userId: "u-4", displayName: "vesper", isCaptain: true, isHost: false },
      { userId: "u-5", displayName: "zephyr_", isCaptain: false, isHost: false },
      { userId: "u-6", displayName: "mothlight", isCaptain: false, isHost: false },
    ],
  },
  spectators: [
    { userId: "s-1", displayName: "coachByte" },
    { userId: "s-2", displayName: "lurker.42" },
    { userId: "s-3", displayName: "casterMK" },
  ],
};

// Sample chat
window.SAMPLE_CHAT = {
  all: [
    { sender: "shotcaller", body: "gl hf", ts: Date.now() - 240000 },
    { sender: "vesper", body: "hf", ts: Date.now() - 230000 },
    { sender: "casterMK", body: "ready when you are", ts: Date.now() - 200000 },
  ],
  team: [
    { sender: "shotcaller", body: "i'll first ban shifu", ts: Date.now() - 180000 },
    { sender: "kira.exe", body: "agreed, then we ban jade", ts: Date.now() - 160000 },
    { sender: "ronin", body: "leaving freya for me?", ts: Date.now() - 120000 },
    { sender: "shotcaller", body: "yep, lock it in", ts: Date.now() - 60000 },
  ],
  spectator: [
    { sender: "coachByte", body: "good comp shaping up", ts: Date.now() - 90000 },
    { sender: "lurker.42", body: "team B looks lost", ts: Date.now() - 60000 },
  ],
};

// Sample state mid-draft (turnIndex = 5, A banned shifu/jade, B banned thorn/croak, A picked freya)
window.SAMPLE_DRAFT_STATE = {
  turnIndex: 5,
  timerSeconds: 22,
  totalTimerSeconds: 30,
  actions: [
    { turn_index: 0, team: "A", action: "ban", champion_id: "shifu" },
    { turn_index: 1, team: "B", action: "ban", champion_id: "thorn" },
    { turn_index: 2, team: "A", action: "ban", champion_id: "jade" },
    { turn_index: 3, team: "B", action: "ban", champion_id: "croak" },
    { turn_index: 4, team: "A", action: "pick", champion_id: "freya" },
  ],
};

window.lookupChamp = function (id) {
  return window.CHAMPIONS.find((c) => c.id === id) || null;
};
