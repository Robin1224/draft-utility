import { eq } from 'drizzle-orm';
import { customAlphabet } from 'nanoid';
import { parseRoomCode } from '$lib/join-parse.js';
import { room } from './db/schema.js';

export const ROOM_CODE_ALPHABET =
	'23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
export const CODE_LENGTH = 7;

const genPublicCode = customAlphabet(ROOM_CODE_ALPHABET, CODE_LENGTH);

export function generatePublicCode() {
	return genPublicCode();
}

/** @param {string} publicCode */
export function topicForRoom(publicCode) {
	return 'lobby:' + publicCode;
}

/** @param {unknown} err */
function isUniqueViolation(err) {
	if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
		return true;
	}
	if (err && typeof err === 'object' && 'cause' in err && err.cause) {
		return isUniqueViolation(err.cause);
	}
	return false;
}

const CREATE_ROOM_MAX_ATTEMPTS = 5;

/**
 * @param {any} db Drizzle database instance
 * @param {string} hostUserId
 */
export async function createRoom(db, hostUserId) {
	for (let attempt = 0; attempt < CREATE_ROOM_MAX_ATTEMPTS; attempt++) {
		const public_code = generatePublicCode();
		try {
			const [row] = await db
				.insert(room)
				.values({
					public_code,
					host_user_id: hostUserId,
					phase: 'lobby'
				})
				.returning({
					id: room.id,
					public_code: room.public_code,
					host_user_id: room.host_user_id,
					phase: room.phase
				});
			return row;
		} catch (e) {
			if (isUniqueViolation(e) && attempt < CREATE_ROOM_MAX_ATTEMPTS - 1) {
				continue;
			}
			throw e;
		}
	}
}

/**
 * @param {any} db Drizzle database instance
 * @param {string} code
 */
export async function getRoomByPublicCode(db, code) {
	const normalized = parseRoomCode(code);
	const rows = await db.select().from(room).where(eq(room.public_code, normalized)).limit(1);
	return rows[0] ?? null;
}
