import { describe, it } from 'vitest';

// handleCaptainDisconnect will be imported from '$live/room' (or a future-extracted module)
// once Plan 02 implements the production code. For Wave 0, no real imports are needed.
// vi.mock will be wired in Plan 02 implementation phase.

describe('handleCaptainDisconnect', () => {
	it.todo(
		'sets draft_state.paused=true and graceEndsAt when active captain disconnects during drafting'
	);
	it.todo(
		'publishes paused snapshot to topicForRoom so all clients see the overlay immediately'
	);
	it.todo(
		'is a no-op when the disconnecting user is not a captain or room is not in drafting phase'
	);
});

describe('disconnectGraceExpired — captain reconnected', () => {
	it.todo(
		'is a no-op when draft_state.paused is false (captain already reconnected and cleared flag)'
	);
	it.todo(
		'is a no-op when room phase is no longer drafting (draft ended for other reasons)'
	);
});

describe('disconnectGraceExpired — promote eligible member (DISC-02)', () => {
	it.todo(
		'promotes the oldest eligible team member (lowest joined_at) to captain when grace expires'
	);
	it.todo('clears paused flag and publishes resume snapshot after promotion');
	it.todo('demotes previous captain before promoting new one (is_captain=false on old, true on new)');
});

describe('disconnectGraceExpired — no eligible member (DISC-03)', () => {
	it.todo('calls cancelDraftNoCaption when no eligible team member exists after grace expires');
	it.todo('cancelDraftNoCaption sets room.phase=cancelled without requiring host check');
	it.todo('publishes cancellation snapshot to topic after cancel');
});
