// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LiveError } from 'svelte-realtime/server';
import { createTestEnv } from 'svelte-realtime/test';

// These modules do not exist yet — mock declarations only (vi.mock hoisted)
vi.mock('$lib/server/rooms.js', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		getRoomByPublicCode: vi.fn(),
		loadLobbySnapshot: vi.fn(),
		startDraftIfReady: vi.fn()
	};
});

vi.mock('$lib/server/draft.js', () => ({
	writeDraftAction: vi.fn(),
	loadDraftSnapshot: vi.fn(),
	completeDraft: vi.fn(),
	updateDraftState: vi.fn(),
	advanceTurnIfCurrent: vi.fn()
}));

describe('draft live RPCs (DRAFT-02 through DRAFT-06)', () => {
	const env = createTestEnv();

	afterEach(() => {
		env.cleanup();
		vi.clearAllMocks();
	});

	describe('startDraft with settings (DRAFT-02)', () => {
		it.todo('writes draft_state with turnIndex=0 and turnEndsAt timestamp to room');
		it.todo('publishes snapshot with phase:drafting and draftState');
		it.todo('non-host startDraft rejects with FORBIDDEN');
	});

	describe('pickBan — captain validation (DRAFT-03)', () => {
		it.todo('non-captain pickBan rejects with FORBIDDEN');
		it.todo('wrong team captain pickBan rejects with FORBIDDEN');
		it.todo('duplicate champion (already in draft_action) rejects with FORBIDDEN');
	});

	describe('pickBan — timer interaction (DRAFT-04)', () => {
		it.todo('timer callback is a no-op when turn already advanced (conditional update returns 0 rows)');
		it.todo('timer callback advances turn and publishes when still current');
	});

	describe('pickBan — draft completion (DRAFT-05)', () => {
		it.todo('pickBan on last turn calls completeDraft and sets phase to ended');
	});

	describe('startDraft with custom script (DRAFT-06)', () => {
		it.todo('startDraft with custom script payload uses that script instead of DEFAULT_SCRIPT');
		it.todo('startDraft with invalid script payload rejects with VALIDATION error');
	});
});
