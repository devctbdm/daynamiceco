import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const questionEntries = pgTable(
  "question_entries",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").notNull(),
    userId: text("user_id").notNull(),
    question: text("question").notNull(),
    answer: text("answer").notNull().default(""),
    answeredBy: text("answered_by"),
    status: text("status").notNull().default("pending"),
    featured: boolean("featured").notNull().default(false),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("question_entries_product_status_created_at_idx").on(
      table.productId,
      table.status,
      table.createdAt,
    ),
    index("question_entries_created_at_idx").on(table.createdAt),
    check(
      "question_entries_status_check",
      sql`${table.status} in ('pending', 'answered', 'rejected')`,
    ),
    check(
      "question_entries_question_length_check",
      sql`length(trim(${table.question})) between 1 and 1000`,
    ),
    check(
      "question_entries_answer_length_check",
      sql`length(${table.answer}) <= 2000`,
    ),
  ],
);

export function serializeQuestion(question) {
  if (!question) return null;
  return {
    _id: question.id,
    id: question.id,
    product: question.productId,
    user: question.userId,
    question: question.question,
    answer: question.answer ?? "",
    answeredBy: question.answeredBy ?? null,
    status: question.status,
    featured: question.featured ?? false,
    answeredAt: question.answeredAt ?? null,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
  };
}
