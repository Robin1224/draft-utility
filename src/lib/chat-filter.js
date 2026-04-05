// @ts-nocheck
import slurList from '$lib/slur-list.json' with { type: 'json' };

// Zero-width characters to strip before slur check (D-11)
// \u200B zero-width space, \u200C zero-width non-joiner, \u200D zero-width joiner
// \uFEFF BOM, \u00AD soft hyphen
const ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF\u00AD]/g;

// Build word-boundary regex set once at module load time (not per-message) — RESEARCH.md Pitfall 3
const SLUR_PATTERNS = slurList.map(
	(entry) => new RegExp('\\b' + entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i')
);

const MAX_LENGTH = 500;

/**
 * Apply the server-side filter pipeline to a chat message body.
 *
 * Pipeline order (must not be changed — RESEARCH.md Pattern 3):
 * 1. Length check
 * 2. NFKC normalize
 * 3. Strip zero-width chars
 * 4. Slur check (case-insensitive word-boundary regex)
 *
 * @param {string} body
 * @returns {{ blocked: true, reason: 'TOO_LONG' | 'SLUR' } | { blocked: false, body: string }}
 */
export function filterMessage(body) {
	// Step 1: length cap (D-10) — reject before any normalization
	if (body.length > MAX_LENGTH) {
		return { blocked: true, reason: 'TOO_LONG' };
	}

	// Step 2: NFKC normalize (D-11)
	body = body.normalize('NFKC');

	// Step 3: strip zero-width chars (D-11)
	body = body.replace(ZERO_WIDTH_RE, '');

	// Step 4: slur check — word-boundary regex, case-insensitive (D-09, Pitfall 3)
	for (const pattern of SLUR_PATTERNS) {
		if (pattern.test(body)) {
			return { blocked: true, reason: 'SLUR' };
		}
	}

	return { blocked: false, body };
}
