// @ts-nocheck
import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
// Live cascade so dialog/host-console styles apply (closed-dialog visibility
// contract + visible-button filtering both depend on it).
import '../../../app.css';
import LobbyHostBar from './LobbyHostBar.svelte';

/** @param {Partial<any>} overrides */
function member(overrides) {
	return {
		userId: null,
		guestId: null,
		displayName: '',
		isCaptain: false,
		isHost: false,
		...overrides
	};
}

/** Lobby snapshot: host captains A, registered captain on B, one guest on B. */
function bothCaptains() {
	return {
		phase: 'lobby',
		teams: {
			A: [
				member({ userId: 'u1', displayName: 'HOST_A', isCaptain: true, isHost: true }),
				member({ userId: 'u2', displayName: 'RUNNER_2' })
			],
			B: [
				member({ userId: 'u3', displayName: 'RUNNER_3', isCaptain: true }),
				member({ guestId: 'g1', displayName: 'GHOST_1' })
			]
		}
	};
}

/** Same roster but team B has no captain → START gated (D-02). */
function missingBCaptain() {
	const snap = bothCaptains();
	snap.teams.B = snap.teams.B.map((m) => ({ ...m, isCaptain: false }));
	return snap;
}

/** Roster where every member is the host → empty kick list. */
function allHosts() {
	return {
		phase: 'lobby',
		teams: {
			A: [member({ userId: 'u1', displayName: 'HOST_A', isCaptain: true, isHost: true })],
			B: []
		}
	};
}

/** Default render props — frozen callback surface as vi.fn()s. */
function makeProps(overrides = {}) {
	return {
		isHost: true,
		snapshot: bothCaptains(),
		code: 'K7-MIRA',
		onKick: vi.fn(),
		onMove: vi.fn(),
		onStartDraft: vi.fn(),
		onCancelRoom: vi.fn(),
		script: [],
		timerSeconds: 30,
		...overrides
	};
}

/** @returns {HTMLDialogElement | null} */
function consoleDialog() {
	return document.querySelector('dialog[aria-label="~/draft/host_console"]');
}

/** Buttons currently rendered (visible), by trimmed label. */
function visibleButtonNames() {
	return [...document.querySelectorAll('button')]
		.filter((b) => b.checkVisibility())
		.map((b) => b.textContent.trim());
}

/** Both ▶ START_DRAFT() instances (bar + console footer), DOM-level. */
function startButtons() {
	return [...document.querySelectorAll('button')].filter((b) =>
		b.textContent.includes('▶ START_DRAFT()')
	);
}

async function openConsole() {
	await page.getByRole('button', { name: 'HOST_CONSOLE()' }).click();
	const dialog = page.getByRole('dialog');
	await expect.element(dialog).toBeVisible();
	return dialog;
}

describe('LobbyHostBar (MOD-02) — slim launcher bar + ~/draft/host_console modal', () => {
	it('renders nothing at all for non-hosts (T-11-01 guard)', async () => {
		render(LobbyHostBar, makeProps({ isHost: false }));
		expect(document.querySelector('.cy-host-panel')).toBeNull();
		expect(document.querySelector('dialog')).toBeNull();
		expect(document.body.textContent).not.toContain('HOST_CONSOLE()');
		expect(document.body.textContent).not.toContain('CONFIG()');
	});

	it('slim bar shows only the launchers + gated START — inline host UI is gone (D-01)', async () => {
		render(LobbyHostBar, makeProps());
		const names = visibleButtonNames();
		expect(names).toContain('CONFIG()');
		expect(names).toContain('HOST_CONSOLE()');
		expect(names).toContain('▶ START_DRAFT()');
		// Inline move/kick/cancel UI removed from the bar; console is closed.
		expect(names).not.toContain('EXEC');
		expect(names).not.toContain('CANCEL_ROOM');
		expect(names.some((n) => /^kick/i.test(n))).toBe(false);
		expect(document.querySelector('.cy-spec-pill')).toBeNull();
	});

	it('both START_DRAFT() instances share the captain gate; footer START fires onStartDraft (D-02 / SC-4)', async () => {
		const gated = render(LobbyHostBar, makeProps({ snapshot: missingBCaptain() }));
		await expect.element(page.getByRole('button', { name: '▶ START_DRAFT()' })).toBeDisabled();
		await openConsole();
		const gatedStarts = startButtons();
		expect(gatedStarts).toHaveLength(2);
		expect(gatedStarts.every((b) => b.disabled)).toBe(true);
		await expect
			.element(page.getByText('both teams need a captain before START_DRAFT() unlocks'))
			.toBeVisible();
		gated.unmount();

		const onStartDraft = vi.fn();
		render(LobbyHostBar, makeProps({ onStartDraft }));
		await openConsole();
		const starts = startButtons();
		expect(starts).toHaveLength(2);
		expect(starts.every((b) => !b.disabled)).toBe(true);
		expect(document.querySelector('.cy-hc-hint')).toBeNull();
		const footerStart = starts.find((b) => b.closest('.cy-modal-foot'));
		await page.elementLocator(footerStart).click();
		expect(onStartDraft).toHaveBeenCalledTimes(1);
	});

	it('console move_player calls onMove(userId, toTeam) via EXEC; EXEC gated on selection (MOD-02)', async () => {
		const onMove = vi.fn();
		render(LobbyHostBar, makeProps({ onMove }));
		await openConsole();

		await expect.element(page.getByRole('button', { name: 'EXEC' })).toBeDisabled();

		await page.getByRole('combobox', { name: 'Move player' }).selectOptions('u2');
		await page.getByRole('combobox', { name: 'To team' }).selectOptions('B');
		await page.getByRole('button', { name: 'EXEC' }).click();

		expect(onMove).toHaveBeenCalledTimes(1);
		expect(onMove).toHaveBeenCalledWith('u2', 'B');
	});

	it('console kick list shows non-host members and calls onKick with the frozen payload (MOD-02)', async () => {
		const onKick = vi.fn();
		const withMembers = render(LobbyHostBar, makeProps({ onKick }));
		await openConsole();

		const items = [...document.querySelectorAll('.cy-kick-item')];
		expect(items.map((li) => li.querySelector('.cy-kick-name')?.textContent)).toEqual([
			'RUNNER_2',
			'RUNNER_3',
			'GHOST_1'
		]);
		// Host is never listed; captain meta rendered as team_X · cap.
		expect(items.some((li) => li.textContent.includes('HOST_A'))).toBe(false);
		expect(items[1].querySelector('.cy-kick-team')?.textContent).toBe('team_B · cap');

		await page.getByRole('button', { name: 'kick RUNNER_2' }).click();
		expect(onKick).toHaveBeenCalledWith({ userId: 'u2' });
		await page.getByRole('button', { name: 'kick GHOST_1' }).click();
		expect(onKick).toHaveBeenCalledWith({ guestId: 'g1' });
		withMembers.unmount();

		render(LobbyHostBar, makeProps({ snapshot: allHosts() }));
		await openConsole();
		await expect.element(page.getByText('// no removable players')).toBeVisible();
		expect(document.querySelector('.cy-kick-list')).toBeNull();
	});

	it('CANCEL_ROOM lives in the console footer as a danger button and calls onCancelRoom (D-03)', async () => {
		const onCancelRoom = vi.fn();
		render(LobbyHostBar, makeProps({ onCancelRoom }));
		await openConsole();

		const cancel = [...document.querySelectorAll('button')].find(
			(b) => b.textContent.trim() === 'CANCEL_ROOM'
		);
		expect(cancel).not.toBeUndefined();
		expect(cancel.classList.contains('cy-btn-danger')).toBe(true);
		expect(cancel.closest('.cy-modal-foot')).not.toBeNull();

		await page.getByRole('button', { name: 'CANCEL_ROOM' }).click();
		expect(onCancelRoom).toHaveBeenCalledTimes(1);
	});

	it('console chrome: ~/draft/host_console title, root@{code} head, free Escape close (D-05)', async () => {
		render(LobbyHostBar, makeProps());
		await page.getByRole('button', { name: 'HOST_CONSOLE()' }).click();
		await expect.element(page.getByRole('dialog', { name: '~/draft/host_console' })).toBeVisible();
		await expect
			.element(page.getByText('// root@K7-MIRA — manage rosters before launch'))
			.toBeVisible();

		await userEvent.keyboard('{Escape}');
		// No dirty state, no confirm — closes on first Escape (D-05). A closed
		// dialog leaves the a11y tree, so poll the DOM node (Plan 01 precedent).
		await expect.poll(() => consoleDialog().open).toBe(false);
		expect(consoleDialog().checkVisibility()).toBe(false);
	});

	it('CONFIG() launches the Plan 02 Settings modal (~/draft/config.sh)', async () => {
		render(LobbyHostBar, makeProps());
		await page.getByRole('button', { name: 'CONFIG()' }).click();
		await expect.element(page.getByRole('dialog', { name: '~/draft/config.sh' })).toBeVisible();
	});
});
