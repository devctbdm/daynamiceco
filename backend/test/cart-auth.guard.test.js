import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import { CartAuthGuard } from "../src/cart/cart-auth.guard.js";

function makeContext(authorization) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization } }),
    }),
  };
}

test("cart auth rejects requests without a bearer token", async () => {
  await assert.rejects(
    new CartAuthGuard().canActivate(makeContext(undefined)),
    (error) => {
      assert.equal(error.getStatus(), 401);
      assert.equal(error.getResponse().message, "Not authorized, no token");
      return true;
    },
  );
});

test("cart auth rejects signed tokens without a Mongo user id", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "cart-auth-test-secret";
  const token = jwt.sign({ id: "not-an-object-id" }, process.env.JWT_SECRET);

  try {
    await assert.rejects(
      new CartAuthGuard().canActivate(makeContext(`Bearer ${token}`)),
      (error) => {
        assert.equal(error.getStatus(), 401);
        assert.equal(error.getResponse().message, "Invalid token");
        return true;
      },
    );
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
