import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { DATABASE } from "../db/database.js";
import { productEntries } from "../models/Product.js";
import { shoppingCartItems, shoppingCarts } from "../models/Cart.js";

class CartService {
  constructor(database) {
    this.database = database;
  }

  async getCart(userId) {
    const [cart] = await this.database
      .select()
      .from(shoppingCarts)
      .where(eq(shoppingCarts.userId, userId))
      .limit(1);

    if (!cart) {
      return emptyCart(userId);
    }

    return this.serializeCart(cart);
  }

  async addItem(userId, input) {
    const {
      productId,
      quantity,
      name,
      price,
      image,
      promoDiscount = 0,
    } = input ?? {};

    if (!productId || !quantity) {
      throw new BadRequestException({
        success: false,
        message: "Product ID and quantity are required",
      });
    }
    assertQuantity(quantity);
    assertNonnegativeNumber(price, "Price");
    assertNonnegativeNumber(promoDiscount, "Promo discount");
    if (typeof name !== "string" || typeof image !== "string") {
      throw new BadRequestException({
        success: false,
        message: "Product name and image are required",
      });
    }

    const cart = await this.database.transaction(async (transaction) => {
      await transaction
        .insert(shoppingCarts)
        .values({ id: randomUUID(), userId })
        .onConflictDoNothing({ target: shoppingCarts.userId });

      const [currentCart] = await transaction
        .select()
        .from(shoppingCarts)
        .where(eq(shoppingCarts.userId, userId))
        .for("update");

      const [existingItem] = await transaction
        .select()
        .from(shoppingCartItems)
        .where(
          and(
            eq(shoppingCartItems.cartId, currentCart.id),
            eq(shoppingCartItems.productId, String(productId)),
          ),
        )
        .limit(1);

      if (existingItem) {
        await transaction
          .update(shoppingCartItems)
          .set({
            quantity: existingItem.quantity + quantity,
            promoDiscount,
            updatedAt: new Date(),
          })
          .where(eq(shoppingCartItems.id, existingItem.id));
      } else {
        await transaction.insert(shoppingCartItems).values({
          id: randomUUID(),
          cartId: currentCart.id,
          productId: String(productId),
          name,
          price,
          quantity,
          image,
          promoDiscount,
        });
      }

      return this.recalculate(transaction, currentCart);
    });

    return this.serializeCart(cart);
  }

  async updateItem(userId, productId, quantity) {
    if (!productId) {
      throw new BadRequestException({
        success: false,
        message: "Product ID is required",
      });
    }
    assertQuantity(quantity);

    const cart = await this.database.transaction(async (transaction) => {
      const currentCart = await this.getLockedCart(transaction, userId);
      if (!currentCart) {
        throw new NotFoundException({
          success: false,
          message: "Cart not found",
        });
      }

      const [item] = await transaction
        .select()
        .from(shoppingCartItems)
        .where(
          and(
            eq(shoppingCartItems.cartId, currentCart.id),
            eq(shoppingCartItems.productId, String(productId)),
          ),
        )
        .limit(1);

      if (!item) {
        throw new NotFoundException({
          success: false,
          message: "Item not found in cart",
        });
      }

      await transaction
        .update(shoppingCartItems)
        .set({ quantity, updatedAt: new Date() })
        .where(eq(shoppingCartItems.id, item.id));

      return this.recalculate(transaction, currentCart);
    });

    return this.serializeCart(cart);
  }

  async removeItem(userId, productId) {
    const cart = await this.database.transaction(async (transaction) => {
      const currentCart = await this.getLockedCart(transaction, userId);
      if (!currentCart) {
        throw new NotFoundException({
          success: false,
          message: "Cart not found",
        });
      }

      await transaction
        .delete(shoppingCartItems)
        .where(
          and(
            eq(shoppingCartItems.cartId, currentCart.id),
            eq(shoppingCartItems.productId, String(productId)),
          ),
        );

      return this.recalculate(transaction, currentCart);
    });

    return this.serializeCart(cart);
  }

  async clearCart(userId) {
    await this.database.transaction(async (transaction) => {
      const currentCart = await this.getLockedCart(transaction, userId);
      if (!currentCart) return;

      await transaction
        .delete(shoppingCartItems)
        .where(eq(shoppingCartItems.cartId, currentCart.id));
      await transaction
        .update(shoppingCarts)
        .set({ totalItems: 0, totalPrice: 0, updatedAt: new Date() })
        .where(eq(shoppingCarts.id, currentCart.id));
    });
  }

  async getLockedCart(transaction, userId) {
    const [cart] = await transaction
      .select()
      .from(shoppingCarts)
      .where(eq(shoppingCarts.userId, userId))
      .for("update");
    return cart;
  }

  async recalculate(transaction, cart) {
    const [totals] = await transaction
      .select({
        totalItems: sql`coalesce(sum(${shoppingCartItems.quantity}), 0)::integer`,
        totalPrice: sql`coalesce(sum(${shoppingCartItems.price} * ${shoppingCartItems.quantity}), 0)::numeric(12, 2)`,
      })
      .from(shoppingCartItems)
      .where(eq(shoppingCartItems.cartId, cart.id));

    const [updatedCart] = await transaction
      .update(shoppingCarts)
      .set({
        totalItems: Number(totals.totalItems),
        totalPrice: Number(totals.totalPrice),
        updatedAt: new Date(),
      })
      .where(eq(shoppingCarts.id, cart.id))
      .returning();

    return updatedCart;
  }

  async serializeCart(cart) {
    const items = await this.database
      .select()
      .from(shoppingCartItems)
      .where(eq(shoppingCartItems.cartId, cart.id));
    const productIds = [...new Set(items.map((item) => item.productId))];
    const productRows = productIds.length
      ? await this.database
          .select()
          .from(productEntries)
          .where(inArray(productEntries.id, productIds))
      : [];
    const productById = new Map(
      productRows.map((product) => [product.id, product]),
    );

    return {
      _id: cart.id,
      id: cart.id,
      user: cart.userId,
      items: items.map((item) => ({
        _id: item.id,
        product: serializeProduct(
          productById.get(item.productId),
          item.productId,
        ),
        name: item.name,
        price: item.price,
        promoDiscount: item.promoDiscount,
        quantity: item.quantity,
        image: item.image,
      })),
      totalItems: cart.totalItems,
      totalPrice: cart.totalPrice,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }
}

function serializeProduct(product, productId) {
  if (!product) return null;

  const id = String(product.id ?? product._id ?? productId);
  return {
    _id: id,
    id,
    name: product.name,
    price: product.price,
    images: product.images,
    stock: product.stock,
  };
}

function emptyCart(userId) {
  return { user: userId, items: [], totalItems: 0, totalPrice: 0 };
}

function assertQuantity(quantity) {
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new BadRequestException({
      success: false,
      message: "Quantity must be at least 1",
    });
  }
}

function assertNonnegativeNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new BadRequestException({
      success: false,
      message: `${label} must be a nonnegative number`,
    });
  }
}

Injectable()(CartService);
Inject(DATABASE)(CartService, undefined, 0);

export { CartService };
