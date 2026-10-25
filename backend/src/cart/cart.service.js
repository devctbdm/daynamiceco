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
import {
  assertProductPurchaseStock,
  resolveProductPurchase,
} from "../products/products.repository.js";
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
    const { productId, quantity } = input ?? {};
    const variantId = typeof input?.variantId === "string" ? input.variantId : "";

    if (!productId || !quantity) {
      throw new BadRequestException({
        success: false,
        message: "Product ID and quantity are required",
      });
    }
    assertQuantity(quantity);

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

      const [product] = await transaction
        .select()
        .from(productEntries)
        .where(eq(productEntries.id, String(productId)))
        .for("update")
        .limit(1);
      if (!product) {
        throw new NotFoundException({
          success: false,
          message: "Product not found",
        });
      }
      const purchase = resolveProductPurchase(product, variantId);
      const { price, promoDiscount, variantLabel, image } = purchase;

      const [existingItem] = await transaction
        .select()
        .from(shoppingCartItems)
        .where(
          and(
            eq(shoppingCartItems.cartId, currentCart.id),
            eq(shoppingCartItems.productId, String(productId)),
            eq(shoppingCartItems.variantId, variantId),
          ),
        )
        .limit(1);

      assertProductPurchaseStock(
        purchase,
        (existingItem?.quantity ?? 0) + quantity,
        product.name,
      );

      if (existingItem) {
        await transaction
          .update(shoppingCartItems)
          .set({
            quantity: existingItem.quantity + quantity,
            name: product.name,
            price,
            promoDiscount,
            image,
            variantLabel,
            updatedAt: new Date(),
          })
          .where(eq(shoppingCartItems.id, existingItem.id));
      } else {
        await transaction.insert(shoppingCartItems).values({
          id: randomUUID(),
          cartId: currentCart.id,
          productId: String(productId),
          variantId,
          variantLabel,
          name: product.name,
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

  async updateItem(userId, productId, variantId, quantity) {
    if (arguments.length === 3) {
      quantity = variantId;
      variantId = "";
    }
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
            eq(shoppingCartItems.variantId, variantId || ""),
          ),
        )
        .limit(1);

      if (!item) {
        throw new NotFoundException({
          success: false,
          message: "Item not found in cart",
        });
      }

      const [product] = await transaction
        .select()
        .from(productEntries)
        .where(eq(productEntries.id, String(productId)))
        .limit(1);
      const variant = product?.variants?.find(
        (entry) => entry?._id === item.variantId && entry.enabled !== false,
      );
      const stock = item.variantId
        ? Number(variant?.stock ?? 0)
        : Number(product?.stock ?? 0);
      if (!product || (item.variantId && !variant) || quantity > stock) {
        throw new BadRequestException({
          success: false,
          message: "The requested quantity is no longer available",
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

  async removeItem(userId, productId, variantId = "") {
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
            eq(shoppingCartItems.variantId, variantId || ""),
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
        variantId: item.variantId || "",
        variantLabel: item.variantLabel || "",
        sku:
          productById
            .get(item.productId)
            ?.variants?.find((variant) => variant?._id === item.variantId)
            ?.sku || "",
        price: item.price,
        promoDiscount: item.promoDiscount,
        quantity: item.quantity,
        image: item.image,
        stock: item.variantId
          ? Number(
              productById
                .get(item.productId)
                ?.variants?.find((variant) => variant?._id === item.variantId)
                ?.stock ?? 0,
            )
          : Number(productById.get(item.productId)?.stock ?? 0),
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

Injectable()(CartService);
Inject(DATABASE)(CartService, undefined, 0);

export { CartService };
