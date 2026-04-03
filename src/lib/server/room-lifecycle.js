/** 24 hours — lobby rooms older than this from `created_at` are lazily ended on read (ROOM-08). */
export const LOBBY_ABANDON_TTL_MS = 86400000;

/**
 * @param {unknown} v
 * @returns {number | null}
 */
function toTimestampMs(v) {
	if (v == null) return null;
	if (typeof v === 'number') return v;
	if (v instanceof Date) return v.getTime();
	if (typeof v === 'string') {
		const t = new Date(v).getTime();
		return Number.isNaN(t) ? null : t;
	}
	return null;
}

/**
 * Rooms that are ended or cancelled must not resolve for public code join (ROOM-08).
 *
 * @param {{ phase?: string | null, ended_at?: Date | string | number | null }} row
 * @param {Date | number} [_now] reserved for API symmetry with {@link shouldAbandonLobby}
 * @returns {boolean}
 */
export function shouldHideRoomFromPublic(row, _now) {
	if (row.ended_at != null) return true;
	if (row.phase === 'ended') return true;
	return false;
}

/**
 * Lobby rows abandoned for {@link LOBBY_ABANDON_TTL_MS} since `created_at` (ROOM-08).
 *
 * @param {{ phase?: string | null, created_at?: Date | string | number | null }} row
 * @param {Date | number} now
 * @returns {boolean}
 */
export function shouldAbandonLobby(row, now) {
	if (row.phase !== 'lobby') return false;
	const created = toTimestampMs(row.created_at);
	const t = toTimestampMs(now);
	if (created == null || t == null) return false;
	return t - created >= LOBBY_ABANDON_TTL_MS;
}
