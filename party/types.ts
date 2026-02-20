/**
 * Shared types for the draft party server and clients.
 */

export type Phase = "lobby" | "drafting" | "done";

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

export interface DraftState {
	options: Record<string, string>;
	teamA: TeamState;
	teamB: TeamState;
	players: Player[];
	turn: 0 | 1 | 2;
	phase: Phase;
}

/** Messages sent from client to server */
export type ClientMessage =
  | { type: "join"; username: string }
  | { type: "change_team"; team: TeamId; playerId: string }
  | { type: "claim_captain"; team: number }
  | { type: "set_options"; options: string[] }
  | { type: "start_draft" }
  | { type: "pick"; option: string }
  | { type: "reset_draft" };

/** Messages sent from server to clients */
export type ServerMessage =
  | { type: "initial_state"; data: DraftState }
  | { type: "new_connection"; data: DraftState }
  | { type: "connection_closed"; data: DraftState }
  | { type: "state_update"; data: DraftState };

export const DEFAULT_OPTIONS = [
  "Option 1",
  "Option 2",
  "Option 3",
  "Option 4",
  "Option 5",
  "Option 6",
  "Option 7",
  "Option 8",
  "Option 9",
  "Option 10",
  "Option 11",
  "Option 12",
];