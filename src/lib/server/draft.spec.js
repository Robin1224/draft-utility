// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';

// draft.js does not exist yet — stub with todo
describe('draft DB layer', () => {
	describe('writeDraftAction', () => {
		it.todo('inserts a row with room_id, turn_index, team, action, champion_id');
		it.todo('unique constraint violation (room_id, turn_index) is re-thrown as DUPLICATE_TURN');
	});

	describe('loadDraftSnapshot', () => {
		it.todo('returns null when room not found');
		it.todo('returns snapshot with draftState and actions array when phase is drafting');
	});

	describe('completeDraft', () => {
		it.todo('sets room phase to ended and ended_at to now');
	});
});
