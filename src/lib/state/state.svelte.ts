import type { DraftState } from '../../../party/types';

export const globalState = $state<{ data: DraftState }>({
	data: {
		options: {},
		teamA: {
			captainId: null,
			picks: [],
			members: []
		},
		teamB: {
			captainId: null,
			picks: [],
			members: []
		},
		players: [],
		turn: 0,
		phase: 'lobby'
	}
});
