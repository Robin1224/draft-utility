CREATE TABLE "draft_action" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"turn_index" integer NOT NULL,
	"team" text NOT NULL,
	"action" text NOT NULL,
	"champion_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "room" ADD COLUMN "draft_state" jsonb;--> statement-breakpoint
ALTER TABLE "draft_action" ADD CONSTRAINT "draft_action_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "draft_action_room_id_idx" ON "draft_action" USING btree ("room_id");--> statement-breakpoint
CREATE UNIQUE INDEX "draft_action_room_turn_unique" ON "draft_action" USING btree ("room_id","turn_index");