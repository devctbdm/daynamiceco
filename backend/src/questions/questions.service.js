import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, count, desc, eq, or, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { DATABASE } from "../db/database.js";
import { questionEntries, serializeQuestion } from "../models/Question.js";
import {
  findProductById,
  findProductsByIds,
} from "../products/products.repository.js";
import { findUsersByIds } from "../users/users.repository.js";

const QUESTION_STATUSES = new Set(["pending", "answered", "rejected"]);

class QuestionsService {
  constructor(database) {
    this.database = database;
  }

  async findAll(query = {}) {
    const page = positiveInteger(query.page, 1);
    const limit = positiveInteger(query.limit, 10);
    const conditions = [];
    if (query.status) conditions.push(eq(questionEntries.status, query.status));
    if (query.featured === "true" || query.featured === true) {
      conditions.push(eq(questionEntries.featured, true));
    } else if (query.featured === "false" || query.featured === false) {
      conditions.push(eq(questionEntries.featured, false));
    }
    if (query.productId) {
      if (!isId(query.productId)) {
        throw badRequest("Invalid product id");
      }
      conditions.push(eq(questionEntries.productId, query.productId));
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const [totalRow] = await this.database
      .select({ total: count() })
      .from(questionEntries)
      .where(where);
    let questionQuery = this.database
      .select()
      .from(questionEntries)
      .where(where)
      .orderBy(desc(questionEntries.createdAt));
    if (!query.search) {
      questionQuery = questionQuery.limit(limit).offset((page - 1) * limit);
    }
    const rows = await questionQuery;
    const { productsById, usersById } = await this.populateReferences(rows);
    let questions = rows.map((row) =>
      serializeAdminQuestion(
        row,
        productsById.get(row.productId),
        usersById.get(row.userId),
        usersById.get(row.answeredBy),
      ),
    );
    if (query.search) {
      const needle = String(query.search).toLocaleLowerCase();
      questions = questions.filter((question) =>
        [
          question.question,
          question.answer,
          question.product?.name,
          question.user?.name,
        ].some((value) =>
          String(value ?? "")
            .toLocaleLowerCase()
            .includes(needle),
        ),
      );
    }
    const total = query.search
      ? questions.length
      : Number(totalRow?.total ?? 0);
    if (query.search) {
      questions = questions.slice((page - 1) * limit, page * limit);
    }
    return {
      success: true,
      count: questions.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      questions,
    };
  }

  async getStats() {
    const [row] = await this.database
      .select({
        total: count(),
        pending: sql`count(*) filter (where ${questionEntries.status} = 'pending')`,
        answered: sql`count(*) filter (where ${questionEntries.status} = 'answered')`,
        rejected: sql`count(*) filter (where ${questionEntries.status} = 'rejected')`,
        featured: sql`count(*) filter (where ${questionEntries.featured})`,
      })
      .from(questionEntries);
    return {
      success: true,
      stats: {
        total: Number(row?.total ?? 0),
        pending: Number(row?.pending ?? 0),
        answered: Number(row?.answered ?? 0),
        rejected: Number(row?.rejected ?? 0),
        featured: Number(row?.featured ?? 0),
      },
    };
  }

  async findAnsweredForProduct(productId) {
    if (!isId(productId)) throw badRequest("Invalid product id");
    const rows = await this.database
      .select()
      .from(questionEntries)
      .where(
        and(
          eq(questionEntries.productId, productId),
          eq(questionEntries.status, "answered"),
        ),
      )
      .orderBy(desc(questionEntries.featured), desc(questionEntries.createdAt));
    const { usersById } = await this.populateReferences(rows);
    return {
      success: true,
      count: rows.length,
      questions: rows.map((row) => ({
        ...serializeQuestion(row),
        user: usersById.get(row.userId) ?? row.userId,
      })),
    };
  }

  async ask(input, userId) {
    const productId = input?.productId;
    if (
      !productId ||
      typeof input.question !== "string" ||
      !input.question.trim()
    ) {
      throw badRequest("Product and question are required");
    }
    if (input.question.trim().length > 1000) {
      throw badRequest("Question cannot be more than 1000 characters");
    }
    if (!isId(String(userId ?? ""))) {
      throw badRequest("Please provide a valid asker");
    }
    const product = await findProductById(String(productId), this.database);
    if (!product) {
      throw new NotFoundException({
        success: false,
        message: "Product not found",
      });
    }
    const now = new Date();
    const [row] = await this.database
      .insert(questionEntries)
      .values({
        id: randomBytes(12).toString("hex"),
        productId: String(productId),
        userId: String(userId),
        question: input.question.trim(),
        answer: "",
        answeredBy: null,
        status: "pending",
        featured: false,
        answeredAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    if (!row) throw new Error("Failed to create question");
    return { success: true, question: serializeQuestion(row) };
  }

  async update(id, input, userId) {
    if (!isId(id)) throw questionNotFound();
    const answer =
      input?.answer === undefined ? undefined : validateAnswer(input.answer);
    const status = input?.status;
    if (status && !QUESTION_STATUSES.has(status)) {
      throw badRequest("Invalid status");
    }

    const result = await this.database.transaction(async (transaction) => {
      const [row] = await transaction
        .select()
        .from(questionEntries)
        .where(eq(questionEntries.id, id))
        .for("update")
        .limit(1);
      if (!row) return null;

      const updates = { updatedAt: new Date() };
      let answeredBy = row.answeredBy;
      let answeredAt = row.answeredAt;
      let nextStatus = row.status;
      if (answer !== undefined) {
        updates.answer = answer;
        if (answer.trim()) {
          answeredBy = String(userId);
          answeredAt = new Date();
          if (nextStatus === "pending") nextStatus = "answered";
        }
      }
      if (status) {
        nextStatus = status;
        if (status === "answered") {
          answeredAt ??= new Date();
          answeredBy ??= String(userId);
        } else {
          answeredAt = null;
          answeredBy = null;
        }
      }
      if (input?.featured !== undefined) {
        updates.featured = input.featured === true || input.featured === "true";
      }
      updates.status = nextStatus;
      updates.answeredBy = answeredBy;
      updates.answeredAt = answeredAt;
      const [updated] = await transaction
        .update(questionEntries)
        .set(updates)
        .where(eq(questionEntries.id, id))
        .returning();
      return updated;
    });
    if (!result) throw questionNotFound();
    return { success: true, question: serializeQuestion(result) };
  }

  async delete(id) {
    if (!isId(id)) throw questionNotFound();
    const [deleted] = await this.database
      .delete(questionEntries)
      .where(eq(questionEntries.id, id))
      .returning({ id: questionEntries.id });
    if (!deleted) throw questionNotFound();
  }

  async populateReferences(rows) {
    const [products, users] = await Promise.all([
      findProductsByIds(
        rows.map((row) => row.productId),
        this.database,
      ),
      findUsers([
        ...rows.map((row) => row.userId),
        ...rows.map((row) => row.answeredBy),
      ]),
    ]);
    return {
      productsById: new Map(products.map((product) => [product._id, product])),
      usersById: new Map(users.map((user) => [String(user._id), user])),
    };
  }
}

function serializeAdminQuestion(row, product, user, answeredBy) {
  const question = serializeQuestion(row);
  return {
    ...question,
    product: product
      ? {
          _id: product._id,
          name: product.name,
          slug: product.slug,
          image: product.images?.[0],
        }
      : null,
    user: user ? { _id: user._id, name: user.name || "Unknown" } : null,
    answeredBy: answeredBy
      ? { _id: answeredBy._id, name: answeredBy.name || "Unknown" }
      : null,
  };
}

async function findUsers(ids) {
  const validIds = [...new Set(ids.filter(isId))];
  if (!validIds.length) return [];
  return findUsersByIds(validIds, { fields: ["name"] });
}

function validateAnswer(value) {
  if (typeof value !== "string") throw badRequest("Answer must be a string");
  if (value.length > 2000) {
    throw badRequest("Answer cannot be more than 2000 characters");
  }
  return value.trim();
}

function positiveInteger(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function isId(value) {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
}

function badRequest(message) {
  return new BadRequestException({ success: false, message });
}

function questionNotFound() {
  return new NotFoundException({
    success: false,
    message: "Question not found",
  });
}

Injectable()(QuestionsService);
Inject(DATABASE)(QuestionsService, undefined, 0);

export { QuestionsService, serializeAdminQuestion, validateAnswer };
