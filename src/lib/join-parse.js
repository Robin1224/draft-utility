/** @param {string} raw */
export function parseRoomCode(raw) {
	const trimmed = raw.trim();
	try {
		const u = new URL(trimmed);
		const parts = u.pathname.split('/').filter(Boolean);
		const draftIdx = parts.indexOf('draft');
		if (draftIdx >= 0 && parts[draftIdx + 1]) return parts[draftIdx + 1];
	} catch {
		// not a parseable absolute URL
	}
	return trimmed;
}
