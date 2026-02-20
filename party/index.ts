import type * as Party from 'partykit/server';
import type { DraftState, Player, ServerMessage, TeamId } from './types';

function createInitialState(): DraftState {
	return {
		options: {},
		teamA: { id: 1, name: 'Team A', captainId: null, picks: [], members: [] },
		teamB: { id: 2, name: 'Team B', captainId: null, picks: [], members: [] },
		players: [],
		turn: 0,
		phase: 'lobby'
	};
}

export default class Server implements Party.Server {
	state: DraftState = createInitialState();

	constructor(readonly room: Party.Room) {}

	onMessage(raw: string, sender: Party.Connection) {
		let msg: { type: string; [k: string]: unknown };
		try {
			msg = JSON.parse(raw) as { type: string; [k: string]: unknown };
		} catch {
			return;
		}

		switch (msg.type) {
			case 'join':
				this.handleJoin(sender, msg as { username?: string; avatar_url?: string });
				break;
			case 'change_team':
				this.handleChangeTeam(sender, msg as { team?: TeamId; playerId?: string });
				break;
			default:
				console.error('Unknown message type:', msg.type);
		}
	}

	onClose(conn: Party.Connection) {
		const player = this.state.players.find((p) => p.id === conn.id);
		if (player) {
			this.removePlayer(player);
		}
		this.broadcast('connection_closed');
	}

	private handleJoin(sender: Party.Connection, msg: { username?: string; avatar_url?: string }) {
		this.state.players.push({
			id: sender.id,
			username: msg.username ?? 'Anonymous',
			avatar_url: msg.avatar_url,
			team: undefined
		});
		this.broadcast('new_connection');
	}

	private handleChangeTeam(
		sender: Party.Connection,
		msg: { team?: TeamId; playerId?: string }
	) {
		const player = this.state.players.find((p) => p.id === msg.playerId);
		const teamId = msg.team;

		if (teamId !== 0 && teamId !== 1 && teamId !== 2) return;
		if (!player || player.id !== sender.id) return;

		this.removeFromTeams(player);
		if (teamId === 1) {
			this.state.teamA.members.push(player.id);
			player.team = 1;
		} else if (teamId === 2) {
			this.state.teamB.members.push(player.id);
			player.team = 2;
		}
		// teamId === 0: already removed, player.team stays undefined
		this.broadcast('state_update');
	}

	private removeFromTeams(player: Player) {
		if (!player) return;
		player.team = undefined;
		this.state.teamA.members = this.state.teamA.members.filter((id) => id !== player.id);
		this.state.teamB.members = this.state.teamB.members.filter((id) => id !== player.id);
	}

	private removePlayer(player: Player) {
		this.state.players = this.state.players.filter((p) => p.id !== player.id);
		this.removeFromTeams(player);
	}

	private broadcast(type: ServerMessage['type']) {
		const message: ServerMessage = { type, data: this.state };
		this.room.broadcast(JSON.stringify(message));
	}
}

Server satisfies Party.Worker;
