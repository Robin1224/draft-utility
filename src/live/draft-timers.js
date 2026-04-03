// @ts-check
// Shared timer helpers — no live/RPC imports to avoid circular dependency.
// Imported by both src/live/draft.js and src/live/room.js.

/** @type {Map<string, ReturnType<typeof setTimeout>>} */
export const roomTimers = new Map();

/** @param {string} roomId */
export function clearRoomTimer(roomId) {
	const t = roomTimers.get(roomId);
	if (t != null) {
		clearTimeout(t);
		roomTimers.delete(roomId);
	}
}

/**
 * @param {string} roomId
 * @param {number} delayMs
 * @param {() => void} cb
 */
export function scheduleTimer(roomId, delayMs, cb) {
	clearRoomTimer(roomId);
	const t = setTimeout(cb, delayMs);
	roomTimers.set(roomId, t);
}
