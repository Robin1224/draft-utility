// @ts-nocheck
import { describe, it, vi } from 'vitest';

vi.mock('svelte-realtime/server', () => ({
  live: Object.assign(vi.fn(), { stream: vi.fn() }),
  LiveError: class LiveError extends Error {
    constructor(code, message) { super(message); this.code = code; }
  },
}));

vi.mock('$lib/server/rooms.js', () => ({
  getRoomByPublicCode: vi.fn(),
  topicForRoom: vi.fn((code) => `lobby:${code}`),
  loadLobbySnapshot: vi.fn(),
}));

vi.mock('$lib/server/db', () => ({ db: {} }));

vi.mock('$lib/slur-list.json', () => ({ default: [] }), { with: { type: 'json' } });

describe('chat — channel authorization (CHAT-01, CHAT-02)', () => {
  it.todo('Team A player cannot subscribe to chatTeamB topic');
  it.todo('Team B player cannot subscribe to chatTeamA topic');
  it.todo('Guest spectator cannot subscribe to chatTeamA or chatTeamB topic');
  it.todo('Player cannot subscribe to chatSpectators topic');
  it.todo('Team A player sendMessage publishes only to room:{code}:chat:teamA');
  it.todo('Guest spectator sendMessage publishes only to room:{code}:chat:spectators');
});

describe('chat — rate limiting (CHAT-03)', () => {
  it.todo('5 messages in 5 seconds are allowed');
  it.todo('6th message in 5-second window is silently dropped (no publish, no error)');
  it.todo('rate limit key includes userId + connectionId + roomId — different rooms not shared');
  it.todo('rate limit resets after window expires');
});

describe('chat — filter pipeline (CHAT-04 integration)', () => {
  it.todo('message over 500 chars throws VALIDATION LiveError');
  it.todo('message containing slur after NFKC normalization is silently dropped');
  it.todo('message with zero-width chars stripped before slur check');
});

describe('chat — mute (HOST-04)', () => {
  it.todo('muteMember RPC adds userId/guestId to muteMap for the room');
  it.todo('unmuteMember RPC removes userId/guestId from muteMap for the room');
  it.todo('muted spectator sendMessage is silently dropped before publish');
  it.todo('non-host calling muteMember throws FORBIDDEN LiveError');
  it.todo('muted spectator is not notified they are muted');
});
