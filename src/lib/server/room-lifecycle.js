export const LOBBY_ABANDON_TTL_MS = 86400000;

/** @param {object} _row @param {Date | number} [_now] */
export function shouldHideRoomFromPublic(_row, _now) {
	return false;
}

/** @param {object} _row @param {Date | number} _now */
export function shouldAbandonLobby(_row, _now) {
	return false;
}
