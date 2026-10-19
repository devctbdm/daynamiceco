CREATE TABLE "sequence_counters" (
	"key" text PRIMARY KEY,
	"seq" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sequence_counters_seq_nonnegative" CHECK ("seq" >= 0)
);
