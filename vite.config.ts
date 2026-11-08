import { sveltekit } from '@sveltejs/kit/vite';
import adapter from 'svelte-adapter-uws';
import uws from 'svelte-adapter-uws/vite';
import realtime from 'svelte-realtime/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit({ adapter: adapter({ websocket: true }) }), uws(), realtime()]
});
