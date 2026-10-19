import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { questionEntries, serializeQuestion } from "../src/models/Question.js";
import { QuestionsService } from "../src/questions/questions.service.js";

test("question table defines normalized fields, indexes, and constraints", () => {
  const table = getTableConfig(questionEntries);
  assert.equal(table.name, "question_entries");
  assert.deepEqual(
    table.columns.map((column) => column.name),
    [
      "id",
      "product_id",
      "user_id",
      "question",
      "answer",
      "answered_by",
      "status",
      "featured",
      "answered_at",
      "created_at",
      "updated_at",
    ],
  );
  assert.ok(
    table.indexes.some(
      (index) =>
        index.config.name === "question_entries_product_status_created_at_idx",
    ),
  );
  assert.equal(table.checks.length, 3);
});

test("question serialization retains Mongo-compatible ids and response fields", () => {
  const createdAt = new Date("2026-10-18T12:00:00.000Z");
  assert.deepEqual(
    serializeQuestion({
      id: "0123456789abcdef01234567",
      productId: "1123456789abcdef01234567",
      userId: "2123456789abcdef01234567",
      question: "Is this available?",
      answer: null,
      answeredBy: null,
      status: "pending",
      featured: null,
      answeredAt: null,
      createdAt,
      updatedAt: createdAt,
    }),
    {
      _id: "0123456789abcdef01234567",
      id: "0123456789abcdef01234567",
      product: "1123456789abcdef01234567",
      user: "2123456789abcdef01234567",
      question: "Is this available?",
      answer: "",
      answeredBy: null,
      status: "pending",
      featured: false,
      answeredAt: null,
      createdAt,
      updatedAt: createdAt,
    },
  );
});

test("question submission and updates validate before touching Neon", async () => {
  const service = new QuestionsService({
    insert() {
      assert.fail("Invalid question must not reach the database");
    },
    transaction() {
      assert.fail("Invalid update must not reach the database");
    },
  });
  await assert.rejects(service.ask({}, "0123456789abcdef01234567"), (error) => {
    assert.equal(error.getStatus(), 400);
    assert.equal(
      error.getResponse().message,
      "Product and question are required",
    );
    return true;
  });
  await assert.rejects(
    service.ask(
      {
        productId: "0123456789abcdef01234567",
        question: ` ${"x".repeat(1001)} `,
      },
      "1123456789abcdef01234567",
    ),
    (error) => {
      assert.equal(error.getStatus(), 400);
      assert.equal(
        error.getResponse().message,
        "Question cannot be more than 1000 characters",
      );
      return true;
    },
  );
  await assert.rejects(
    service.update("0123456789abcdef01234567", { status: "unknown" }, "user"),
    (error) => {
      assert.equal(error.getStatus(), 400);
      assert.equal(error.getResponse().message, "Invalid status");
      return true;
    },
  );
});

test("question update validates answer type and maximum length", async () => {
  const service = new QuestionsService({});
  await assert.rejects(
    service.update(
      "0123456789abcdef01234567",
      { answer: { html: "bad" } },
      "2123456789abcdef01234567",
    ),
    (error) =>
      error.getStatus() === 400 &&
      error.getResponse().message === "Answer must be a string",
  );
  await assert.rejects(
    service.update(
      "0123456789abcdef01234567",
      { answer: "x".repeat(2001) },
      "2123456789abcdef01234567",
    ),
    (error) =>
      error.getStatus() === 400 &&
      error.getResponse().message ===
        "Answer cannot be more than 2000 characters",
  );
});

test("answering a question records metadata and leaving answered clears it", async () => {
  const id = "0123456789abcdef01234567";
  const userId = "2123456789abcdef01234567";
  const pendingQuestion = {
    id,
    answer: "",
    answeredBy: null,
    answeredAt: null,
    status: "pending",
    featured: false,
  };
  const { service, getUpdates } = createUpdateService(pendingQuestion);
  const answered = await service.update(
    id,
    { answer: "  Available now.  " },
    userId,
  );

  assert.equal(answered.question.answer, "Available now.");
  assert.equal(getUpdates().status, "answered");
  assert.equal(getUpdates().answeredBy, userId);
  assert.ok(getUpdates().answeredAt instanceof Date);

  const answeredQuestion = {
    ...pendingQuestion,
    status: "answered",
    answeredBy: userId,
    answeredAt: new Date("2026-10-18T12:00:00.000Z"),
  };
  const rejectedService = createUpdateService(answeredQuestion);
  const rejected = await rejectedService.service.update(
    id,
    { status: "rejected" },
    "3123456789abcdef01234567",
  );

  assert.equal(rejected.question.status, "rejected");
  assert.equal(rejectedService.getUpdates().answeredBy, null);
  assert.equal(rejectedService.getUpdates().answeredAt, null);
});

function createUpdateService(row) {
  let updates;
  const database = {
    transaction(callback) {
      return callback({
        select() {
          return {
            from() {
              return {
                where() {
                  return {
                    for() {
                      return {
                        limit: async () => [row],
                      };
                    },
                  };
                },
              };
            },
          };
        },
        update() {
          return {
            set(values) {
              updates = values;
              return {
                where() {
                  return {
                    returning: async () => [{ ...row, ...updates }],
                  };
                },
              };
            },
          };
        },
      });
    },
  };

  return {
    service: new QuestionsService(database),
    getUpdates: () => updates,
  };
}
