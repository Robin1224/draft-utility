import { fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { db } from '$lib/server/db';
import { createRoom } from '$lib/server/rooms';

/** @type {import('@sveltejs/kit').ServerLoad} */
export const load = async () => ({});

export const actions = {
	/** ROOM-01: authenticated user creates a persisted room and lands on /draft/<code> */
	createRoom: async (event) => {
		if (!event.locals.user?.id) {
			return fail(401, { message: 'Sign in to create a room' });
		}
		const result = await createRoom(db, event.locals.user.id);
		redirect(303, resolve('/draft/[id]', { id: result.public_code }));
	}
};
