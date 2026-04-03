import { sql } from 'drizzle-orm';
import {
	boolean,
	index,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar
} from 'drizzle-orm/pg-core';

export const task = pgTable('task', {
	id: serial('id').primaryKey(),
	title: text('title').notNull(),
	priority: integer('priority').notNull().default(1)
});

export const room = pgTable('room', {
	id: uuid('id').defaultRandom().primaryKey(),
	public_code: varchar('public_code', { length: 12 }).notNull().unique(),
	host_user_id: text('host_user_id').notNull(),
	phase: text('phase').notNull().default('lobby'),
	created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
	ended_at: timestamp('ended_at', { withTimezone: true })
});

export const room_member = pgTable(
	'room_member',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		room_id: uuid('room_id')
			.notNull()
			.references(() => room.id, { onDelete: 'cascade' }),
		user_id: text('user_id'),
		guest_id: text('guest_id'),
		team: text('team'),
		is_captain: boolean('is_captain').notNull().default(false),
		joined_at: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [
		index('room_member_room_id_idx').on(t.room_id),
		uniqueIndex('room_member_room_user_unique')
			.on(t.room_id, t.user_id)
			.where(sql`${t.user_id} IS NOT NULL`),
		uniqueIndex('room_member_room_guest_unique')
			.on(t.room_id, t.guest_id)
			.where(sql`${t.guest_id} IS NOT NULL`)
	]
);

export * from './auth.schema';
