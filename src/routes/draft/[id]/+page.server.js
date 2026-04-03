import { error } from '@sveltejs/kit';
import { parseRoomCode } from '$lib/join-parse.js';
import { db } from '$lib/server/db';
import { getRoomByPublicCode } from '$lib/server/rooms';

/** @type {import('@sveltejs/kit').ServerLoad} */
export async function load({ params, locals, url }) {
	const code = parseRoomCode(params.id ?? '');
	const row = await getRoomByPublicCode(db, code);
	if (!row) {
		error(404, { message: 'Room not found' });
	}
	return {
		room: {
			public_code: row.public_code,
			phase: row.phase,
			host_user_id: row.host_user_id
		},
		userId: locals.user?.id ?? null,
		appOrigin: url.origin
	};
}
