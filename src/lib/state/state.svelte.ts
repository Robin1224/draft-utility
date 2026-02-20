import PartySocket from 'partysocket';
import type { DraftState, Player } from '$lib/shared/types';
import type { Session } from '@supabase/supabase-js';

export const globalState = $state<{ data: DraftState }>({
	data: {
		options: {},
		teamA: {
			id: 1,
			name: 'Team A',
			captainId: null,
			picks: [],
			members: []
		},
		teamB: {
			id: 2,
			name: 'Team B',
			captainId: null,
			picks: [],
			members: []
		},
		players: [],
		turn: 0,
		phase: 'lobby'
	},
});

let socket = $state<PartySocket | null>(null);

export const getSocket = (): PartySocket | null => {
	return socket;
};

export const getUnassignedPlayers = (): Player[] => {
	return globalState.data.players.filter(
		(p: Player) =>
			!globalState.data.teamA.members.includes(p.id) &&
			!globalState.data.teamB.members.includes(p.id)
	);
};

export const getTeam1Players = (): Player[] => {
	return globalState.data.players.filter((p: Player) =>
		globalState.data.teamA.members.includes(p.id)
	);
};

export const getTeam2Players = (): Player[] => {
	return globalState.data.players.filter((p: Player) =>
		globalState.data.teamB.members.includes(p.id)
	);
};

export const connectToParty = (session: Session, roomId: string): void => {
	const s = new PartySocket({
		host: import.meta.env.VITE_PARTYKIT_HOST ?? 'localhost:1999',
		room: roomId
	});
	s.onmessage = (event: MessageEvent) => {
		const json = JSON.parse(event.data);
		console.log('[WS] Received message:', json);
		if (
			json.type === 'initial_state' ||
			json.type === 'new_connection' ||
			json.type === 'connection_closed' ||
			json.type === 'state_update'
		) {
			globalState.data = json.data;
		} else {
			console.error('Unknown message type:', json.type);
		}
		console.log($state.snapshot(globalState).data);
	};

	s.onopen = () => {
		s.send(
			JSON.stringify({
				type: 'join',
				username: session?.user?.identities?.[0]?.identity_data?.['full_name'] ?? undefined,
				avatar_url: session?.user?.identities?.[0]?.identity_data?.['avatar_url'] ?? undefined
			})
		);
	};
	socket = s;
};

export const getCurrentPlayerId = (): string | undefined => {
	return socket?.id;
};

/** 0 = unassign, 1 = Team A, 2 = Team B */
export const changeTeam = (team: 0 | 1 | 2, playerId: string) => {
	socket?.send(JSON.stringify({ type: 'change_team', team, playerId }));
};

export const isCurrentPlayer = (playerId: string): boolean => {
	return socket?.id === playerId;
};

export const getCurrentPlayer = (): Player | undefined => {
	return globalState.data.players.find((p: Player) => p.id === socket?.id) ?? undefined;
};
