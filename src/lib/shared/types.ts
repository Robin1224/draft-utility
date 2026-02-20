/** 0 = unassigned, 1 = Team A, 2 = Team B */
export type TeamId = 0 | 1 | 2;

export interface Player {
	id: string;
	username: string | undefined;
	avatar_url: string | undefined;
	team: TeamId | undefined;
}

export interface TeamState {
    id: number;
    name: string;
    captainId: string | null;
	picks: string[];
	members: string[];
}

export type Phase = 'lobby' | 'drafting' | 'done';

export interface DraftState {
	options: Record<string, string>;
	teamA: TeamState;
	teamB: TeamState;
	players: Player[];
	turn: 0 | 1 | 2;
	phase: Phase;
}
