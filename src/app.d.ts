import type { User, Session } from 'better-auth/minimal';
import type { Platform as AdapterPlatform } from 'svelte-adapter-uws';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user?: User;
			session?: Session;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- adapter augments Platform
		interface Platform extends AdapterPlatform {}
	}
}

export {};
