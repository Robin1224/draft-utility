/** 0 = unassigned, 1 = Team A, 2 = Team B */
export type TeamId = 0 | 1 | 2;

/** Maximum players per team (Team A / Team B). Unassigned has no limit. */
export const MAX_TEAM_SIZE = 3;

export interface Player {
	id: string;
	username: string | undefined;
	avatar_url: string | undefined;
	/** 0 = unassigned, 1 = Team A, 2 = Team B */
	team: TeamId;
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
