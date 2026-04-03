import { message } from 'svelte-realtime/server';
import { auth } from '$lib/server/auth';

// Required: svelte-realtime built-in message router for RPC dispatch
export { message };

const DRAFT_GUEST_COOKIE = 'draft_guest';

/**
 * @param {Headers} headers
 * @param {string} name
 * @returns {string | null}
 */
function cookieFromHeaders(headers, name) {
	const raw = headers.get('cookie');
	if (!raw) return null;
	for (const part of raw.split(';')) {
		const idx = part.indexOf('=');
		if (idx === -1) continue;
		const key = part.slice(0, idx).trim();
		if (key !== name) continue;
		let val = part.slice(idx + 1).trim();
		try {
			val = decodeURIComponent(val);
		} catch {
			// keep raw
		}
		return val || null;
	}
	return null;
}

/**
 * Called at WebSocket upgrade time for every incoming connection.
 * Returns the user context object stored as ws.getUserData() — available as ctx.user in live functions.
 *
 * D-12: Unauthenticated connections are ALLOWED (never return false for missing session).
 * D-12: Guests receive role: 'guest' and can only access public/spectator topics (enforced Phase 2+).
 * D-13: Downstream live handlers check ctx.user.role before allowing publish/subscribe.
 *
 * @param {{ headers: Headers }} param
 */
export async function upgrade({ headers }) {
	// auth.api.getSession is wrapped in try/catch because the sveltekitCookies
	// Better Auth plugin calls getRequestEvent() in its after-hook when a
	// set-cookie header is present (e.g. session refresh). getRequestEvent()
	// throws outside a SvelteKit request context, which is always the case
	// during a WebSocket upgrade. Falling back to guest on any error is safe —
	// the session lookup is best-effort and the WS upgrade must never throw.
	let session = null;
	try {
		session = await auth.api.getSession({ headers });
	} catch {
		// getSession threw (e.g. sveltekitCookies after-hook called
		// getRequestEvent() outside SK context) — treat as unauthenticated
	}

	if (!session) {
		// D-12: allow unauthenticated connections through as guests
		const fromCookie = cookieFromHeaders(headers, DRAFT_GUEST_COOKIE);
		return {
			role: 'guest',
			guestId: fromCookie ?? crypto.randomUUID()
		};
	}

	return {
		id: session.user.id,
		name: session.user.name,
		role: 'player'
	};
}

/**
 * Live functions — callable by the client via svelte-realtime RPC.
 *
 * D-14: In-place role upgrade when a guest authenticates while their WS connection is live.
 * The client calls live.auth.refreshSession() after Discord OAuth completes.
 * ctx.user is the mutable userData object from uWS.getUserData() — mutations persist for the connection lifetime.
 *
 * Note: ctx.platform contains the raw uWS request context at live-call time.
 * If ctx.platform.headers is unavailable, the client must reconnect to trigger a fresh upgrade().
 * Phase 1 establishes this mechanism; full enforcement of role gating is Phase 2+.
 */
export const live = {
	auth: {
		/**
		 * Re-reads the Better Auth session and upgrades the connection role in-place.
		 * Call this from the client immediately after Discord OAuth callback completes.
		 *
		 * @param {{ ctx: { user: { role: string, id?: string, name?: string, guestId?: string }, platform: { req: { headers: Headers } } } }} _
		 */
		async refreshSession({ ctx }) {
			const headers = ctx.platform?.req?.headers ?? new Headers();
			const session = await auth.api.getSession({ headers });

			if (session) {
				ctx.user.role = 'player';
				ctx.user.id = session.user.id;
				ctx.user.name = session.user.name;
				const fromCookie = cookieFromHeaders(headers, DRAFT_GUEST_COOKIE);
				if (ctx.user.guestId == null && fromCookie) {
					ctx.user.guestId = fromCookie;
				}
			}
		}
	}
};
