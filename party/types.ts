/**
 * Shared types for the draft party server and clients.
 */

export type Phase = "lobby" | "drafting" | "done";

export interface DraftState {
  options: Record<string, string>;
  teamA: TeamState
  teamB: TeamState
  players: {id: string; username: string | undefined }[];
  turn: 0 | 1 | 2;
  phase: Phase;
}

export interface TeamState {
  captainId: string | null;
  picks: string[];
  members: string[];
}

/** Messages sent from client to server */
export type ClientMessage =
  | { type: "join"; username: string }
  | { type: "claim_captain"; team: "A" | "B" }
  | { type: "set_options"; options: string[] }
  | { type: "start_draft" }
  | { type: "pick"; option: string }
  | { type: "reset_draft" };

/** Messages sent from server to clients */
export interface ServerMessage {
  type: "initial_state" | "new_connection";
  data: DraftState;
}

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

function createInitialState(options: string[] = DEFAULT_OPTIONS): DraftState {
  return {
    options: [...options],
    teamACaptainId: null,
    teamBCaptainId: null,
    teamAPicks: [],
    teamBPicks: [],
    turn: "A",
    phase: "lobby",
  };
}

export { createInitialState };
