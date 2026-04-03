// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock $lib/server/auth before importing the module under test
vi.mock('$lib/server/auth', () => ({
	auth: {
		api: {
			signInSocial: vi.fn(),
			signOut: vi.fn()
		}
	}
}));

// Import after mock setup
const { load, actions } = await import('./+page.server.js');

describe('/login load', () => {
	it('redirects authenticated user to ?redirect param', async () => {
		const event = {
			locals: { user: { id: '1', name: 'Test' } },
			url: new URL('http://localhost/login?redirect=/lobby')
		};
		await expect(load(event)).rejects.toMatchObject({ status: 302, location: '/lobby' });
	});

	it('redirects authenticated user to / when no redirect param', async () => {
		const event = {
			locals: { user: { id: '1', name: 'Test' } },
			url: new URL('http://localhost/login')
		};
		await expect(load(event)).rejects.toMatchObject({ status: 302, location: '/' });
	});

	it('returns empty object for unauthenticated user', async () => {
		const event = {
			locals: {},
			url: new URL('http://localhost/login')
		};
		const result = await load(event);
		expect(result).toEqual({});
	});
});

describe('/login actions.signout', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('calls auth.api.signOut and redirects to /login', async () => {
		const { auth } = await import('$lib/server/auth');
		auth.api.signOut.mockResolvedValue({});

		const event = {
			request: { headers: new Headers() }
		};
		await expect(actions.signout(event)).rejects.toMatchObject({ status: 302, location: '/login' });
		expect(auth.api.signOut).toHaveBeenCalledWith({ headers: event.request.headers });
	});
});
