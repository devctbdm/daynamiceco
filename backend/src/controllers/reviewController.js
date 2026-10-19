import { eq } from "drizzle-orm";
import { cacheDel } from "../config/redis.js";
import { getDatabase } from "../db/database.js";
import { productEntries } from "../models/Product.js";
import {
  allProductRows,
  serializeProduct,
} from "../products/products.repository.js";
import { findUsersByIds } from "../users/users.repository.js";

export const getAllReviews = async (req, res) => {
  try {
    const {
      search,
      rating,
      status,
      featured,
      page = 1,
      limit = 10,
    } = req.query;
    const rows = await allProductRows();
    const flattened = rows.flatMap((row) =>
      (Array.isArray(row.ratings) ? row.ratings : []).map((review) => ({
        row,
        review,
      })),
    );
    const users = await findUsers(flattened.map(({ review }) => review.user));
    const usersById = new Map(users.map((user) => [String(user._id), user]));
    const matches = flattened
      .map(({ row, review }) => ({
        product: serializeProduct(row),
        review,
        user: usersById.get(String(review.user)),
      }))
      .filter(({ product, review, user }) => {
        if (rating && Number(review.rating) !== Number(rating)) return false;
        if (status && review.status !== status) return false;
        if (featured === "true" || featured === true) {
          if (!review.featured) return false;
        } else if (featured === "false" || featured === false) {
          if (review.featured) return false;
        }
        if (search) {
          const needle = String(search).toLocaleLowerCase();
          return [review.comment, product.name, user?.name].some((value) =>
            String(value || "")
              .toLocaleLowerCase()
              .includes(needle),
          );
        }
        return true;
      })
      .sort(
        (left, right) =>
          new Date(right.review.createdAt || 0) -
          new Date(left.review.createdAt || 0),
      );
    const pageNumber = positiveInteger(page, 1);
    const pageSize = positiveInteger(limit, 10);
    const total = matches.length;
    const reviews = matches
      .slice((pageNumber - 1) * pageSize, pageNumber * pageSize)
      .map(({ product, review, user }) => ({
        _id: review._id,
        rating: review.rating,
        comment: review.comment || "",
        status: review.status,
        featured: review.featured,
        createdAt: review.createdAt,
        user: user ? { _id: user._id, name: user.name || "Unknown" } : null,
        product: {
          _id: product._id,
          name: product.name,
          slug: product.slug,
          image: product.images?.[0],
        },
      }));

    res.json({
      success: true,
      count: reviews.length,
      total,
      page: pageNumber,
      pages: Math.ceil(total / pageSize),
      reviews,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getReviewStats = async (_req, res) => {
  try {
    const rows = await allProductRows();
    const reviews = rows.flatMap((row) =>
      Array.isArray(row.ratings) ? row.ratings : [],
    );
    const approvedRatings = reviews
      .filter((review) => review.status !== "rejected")
      .map((review) => Number(review.rating))
      .filter(Number.isFinite);
    const distributionCounts = new Map();
    for (const review of reviews) {
      const value = Number(review.rating);
      distributionCounts.set(value, (distributionCounts.get(value) || 0) + 1);
    }
    res.json({
      success: true,
      stats: {
        total: reviews.length,
        approved: reviews.filter((review) => review.status === "approved")
          .length,
        pending: reviews.filter((review) => review.status === "pending").length,
        rejected: reviews.filter((review) => review.status === "rejected")
          .length,
        featured: reviews.filter((review) => review.featured).length,
        averageRating: approvedRatings.length
          ? approvedRatings.reduce((sum, value) => sum + value, 0) /
            approvedRatings.length
          : 0,
        distribution: [5, 4, 3, 2, 1].map((value) => ({
          rating: value,
          count: distributionCounts.get(value) || 0,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { status, featured } = req.body;
    if (status && !["pending", "approved", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }
    const match = await findReviewProduct(reviewId);
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }
    const review = await getDatabase().transaction(async (transaction) => {
      const [row] = await transaction
        .select()
        .from(productEntries)
        .where(eq(productEntries.id, match.product.id))
        .for("update")
        .limit(1);
      const ratings = Array.isArray(row?.ratings) ? [...row.ratings] : [];
      const index = ratings.findIndex((entry) => entry._id === reviewId);
      if (index < 0) return null;
      if (status) ratings[index].status = status;
      if (featured !== undefined) {
        ratings[index].featured = featured === true || featured === "true";
      }
      const [updated] = await transaction
        .update(productEntries)
        .set({
          ratings,
          averageRating: calculateAverage(ratings),
          updatedAt: new Date(),
        })
        .where(eq(productEntries.id, match.product.id))
        .returning();
      return { product: serializeProduct(updated), review: ratings[index] };
    });
    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }
    await cacheDel("product:*");
    await cacheDel("products:*");
    res.json({
      success: true,
      review: {
        ...review.review,
        product: {
          _id: review.product._id,
          name: review.product.name,
          slug: review.product.slug,
          image: review.product.images[0],
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const match = await findReviewProduct(req.params.reviewId);
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }
    const deleted = await getDatabase().transaction(async (transaction) => {
      const [row] = await transaction
        .select()
        .from(productEntries)
        .where(eq(productEntries.id, match.product.id))
        .for("update")
        .limit(1);
      const ratings = Array.isArray(row?.ratings) ? row.ratings : [];
      const remaining = ratings.filter(
        (entry) => entry._id !== req.params.reviewId,
      );
      if (remaining.length === ratings.length) return false;
      await transaction
        .update(productEntries)
        .set({
          ratings: remaining,
          averageRating: calculateAverage(remaining),
          updatedAt: new Date(),
        })
        .where(eq(productEntries.id, match.product.id));
      return true;
    });
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    }
    await cacheDel("product:*");
    await cacheDel("products:*");
    res.json({ success: true, message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

async function findReviewProduct(reviewId) {
  const rows = await allProductRows();
  for (const product of rows) {
    const review = (Array.isArray(product.ratings) ? product.ratings : []).find(
      (entry) => entry._id === reviewId,
    );
    if (review) return { product, review };
  }
  return null;
}

async function findUsers(userIds) {
  const ids = [...new Set(userIds.filter(Boolean).map(String))];
  if (!ids.length) return [];
  return findUsersByIds(ids, { fields: ["name"] });
}

function calculateAverage(ratings) {
  const approved = ratings.filter((review) => review.status === "approved");
  if (!approved.length) return 0;
  const total = approved.reduce(
    (sum, review) => sum + Number(review.rating || 0),
    0,
  );
  return Number((total / approved.length).toFixed(1));
}

function positiveInteger(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}
