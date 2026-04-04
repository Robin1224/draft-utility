import { describe, it } from 'vitest';

// loadDraftSnapshot will be imported from '$lib/server/draft'
// once Plan 02 implements the paused-state fields. For Wave 0, no real imports are needed.
// The lobby stream phase-branching stubs reference the stream init logic in src/live/room.js.

describe('loadDraftSnapshot — shape (DISC-04, DRAFT-07)', () => {
	it.todo('returns lobbySnapshot fields merged with draftState and actions[]');
	it.todo('draftState.turnIndex is a number indicating which script step is active');
	it.todo('draftState.turnEndsAt is an ISO timestamp string');
	it.todo('draftState.timerMs is a number in milliseconds');
	it.todo('actions[] is ordered by turn_index ascending');
	it.todo('actions[] entries include team, action (pick|ban|timeout), champion_id, created_at');
});

describe('loadDraftSnapshot — paused state (DISC-01)', () => {
	it.todo('when draftState.paused is true, snapshot includes pausedUserId and graceEndsAt');
	it.todo('when draftState.paused is false or absent, pausedUserId and graceEndsAt are absent');
});

describe('lobby stream init — phase branching (DISC-04)', () => {
	it.todo('returns loadDraftSnapshot result when room.phase === drafting');
	it.todo('returns loadLobbySnapshot result when room.phase === lobby');
});
