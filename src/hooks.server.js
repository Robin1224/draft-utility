import { building } from '$app/environment';
import { sequence } from '@sveltejs/kit/hooks';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';

const DRAFT_GUEST_COOKIE = 'draft_guest';
const DRAFT_GUEST_MAX_AGE = 60 * 60 * 24 * 400;

/** Ensures stable anonymous id for WS kick targets and post-login guestId (02-04). */
/** @type {import('@sveltejs/kit').Handle} */
const guestCookieHandle = async ({ event, resolve }) => {
	if (!event.cookies.get(DRAFT_GUEST_COOKIE)) {
		event.cookies.set(DRAFT_GUEST_COOKIE, crypto.randomUUID(), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: DRAFT_GUEST_MAX_AGE
		});
	}
	return resolve(event);
};

/** @type {import('@sveltejs/kit').Handle} */ const handleBetterAuth = async ({
	event,
	resolve
}) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export /** @type {import('@sveltejs/kit').Handle} */ const handle = sequence(
	guestCookieHandle,
	handleBetterAuth
);
