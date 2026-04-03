import { redirect, fail } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';

/** @type {import('@sveltejs/kit').ServerLoad} */
export const load = async (event) => {
	if (event.locals.user) {
		const returnTo = event.url.searchParams.get('redirect') ?? '/';
		return redirect(302, returnTo);
	}
	return {};
};

export const actions = {
	/**
	 * D-05, D-07: Discord-only sign-in. Calls auth.api.signInSocial which returns
	 * a Discord authorization URL. Redirect the user there.
	 */
	signin: async (event) => {
		const returnTo = event.url.searchParams.get('redirect') ?? '/';
		try {
			const result = await auth.api.signInSocial({
				body: { provider: 'discord', callbackURL: returnTo },
				headers: event.request.headers
			});
			if (result?.url) return redirect(302, result.url);
		} catch {
			return fail(500, { error: 'Discord sign-in failed. Please try again.' });
		}
		return fail(500, { error: 'Something went wrong. Contact the host.' });
	},

	/**
	 * D-05: Discord auto-creates the account on first sign-in.
	 * Register and signin both delegate to the same Discord OAuth flow (requestSignUp hint).
	 */
	register: async (event) => {
		const returnTo = event.url.searchParams.get('redirect') ?? '/';
		try {
			const result = await auth.api.signInSocial({
				body: { provider: 'discord', callbackURL: returnTo, requestSignUp: true },
				headers: event.request.headers
			});
			if (result?.url) return redirect(302, result.url);
		} catch {
			return fail(500, { error: 'Discord sign-in failed. Please try again.' });
		}
		return fail(500, { error: 'Something went wrong. Contact the host.' });
	},

	/**
	 * AUTH-03: Sign out from any page. Called when the user clicks a sign-out button anywhere.
	 * Redirects to /login after clearing the session.
	 */
	signout: async (event) => {
		await auth.api.signOut({ headers: event.request.headers });
		return redirect(302, '/login');
	}
};
