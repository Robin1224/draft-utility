export async function POST({ request, platform }) {
	// In dev, SvelteKit doesn't inject platform; the uws Vite plugin exposes it globally
	const platformOrDev = platform ?? globalThis.__uws_dev_platform;
	if (!platformOrDev?.publish) {
		return new Response('Platform not available', { status: 503 });
	}
	const data = await request.json();

	// This sends to ALL clients subscribed to 'notifications'
	platformOrDev.publish('notifications', 'new-message', data);

	return new Response('OK');
}
