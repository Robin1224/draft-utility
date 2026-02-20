import type * as Party from 'partykit/server';
import type { DraftState } from './types';

export default class Server implements Party.Server {
	state: DraftState = {
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
	};

	constructor(readonly room: Party.Room) {}

	onConnect(conn: Party.Connection) {
		this.state.players.push({ id: conn.id, username: undefined });

		// Send full state to the new connection
		conn.send(JSON.stringify({
			type: 'initial_state',
			data: this.state
		}));

		// Broadcast only connections change to other connections
		this.room.broadcast(
			JSON.stringify({
				type: 'new_connection',
				data: this.state
			}), [conn.id]
		);
	}
	
	// onMessage(message: string, sender: Party.Connection) {
	// 	// get parcel sent from client by parsing 'message'
	// 	const parcel: { message: string; username: string } = JSON.parse(message);

	// 	// what we are sending back
	// 	const envelope = JSON.stringify({
	// 		content: `[ID: ${sender.id}] ${parcel.username}: ${parcel.message}`
	// 	});

	// 	// broadcast what was said to everyone
	// 	this.room.broadcast(envelope);
	// }

	onClose(conn: Party.Connection) {
		this.state.players = this.state.players.filter(player => player.id !== conn.id);
		this.room.broadcast(JSON.stringify({
			type: 'connection_closed',
			data: this.state
		}));
	}
}

Server satisfies Party.Worker;
