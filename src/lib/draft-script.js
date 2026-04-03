// @ts-check

/**
 * Default pick/ban script — esports-style alternating bans then picks.
 * 4 bans (2 per team, alternating A-B-A-B) followed by 6 picks in snake order (A-B-B-A-A-B).
 * Total: 10 turns across 28-champion Battlerite catalog.
 *
 * @type {{ team: 'A'|'B', action: 'pick'|'ban' }[]}
 */
export const DEFAULT_SCRIPT = [
	{ team: 'A', action: 'ban' },
	{ team: 'B', action: 'ban' },
	{ team: 'A', action: 'ban' },
	{ team: 'B', action: 'ban' },
	{ team: 'A', action: 'pick' },
	{ team: 'B', action: 'pick' },
	{ team: 'B', action: 'pick' },
	{ team: 'A', action: 'pick' },
	{ team: 'A', action: 'pick' },
	{ team: 'B', action: 'pick' }
];

/** Default turn timer duration in milliseconds (30 seconds). */
export const DEFAULT_TIMER_MS = 30_000;
