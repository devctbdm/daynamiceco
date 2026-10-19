CREATE TABLE "question_entries" (
	"id" text PRIMARY KEY,
	"product_id" text NOT NULL,
	"user_id" text NOT NULL,
	"question" text NOT NULL,
	"answer" text DEFAULT '' NOT NULL,
	"answered_by" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"answered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_entries_status_check" CHECK ("status" in ('pending', 'answered', 'rejected')),
	CONSTRAINT "question_entries_question_length_check" CHECK (length(trim("question")) between 1 and 1000),
	CONSTRAINT "question_entries_answer_length_check" CHECK (length("answer") <= 2000)
);
--> statement-breakpoint
CREATE INDEX "question_entries_product_status_created_at_idx" ON "question_entries" ("product_id","status","created_at");--> statement-breakpoint
CREATE INDEX "question_entries_created_at_idx" ON "question_entries" ("created_at");