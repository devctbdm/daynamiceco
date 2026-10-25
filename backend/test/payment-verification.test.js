import test from "node:test";
import assert from "node:assert/strict";
import {
  isSuccessfulPaymentStatus,
  isSuccessfulPaymentValidation,
} from "../src/payments/payment-verification.js";

const transaction = {
  status: "VALID",
  tran_id: "order123_456",
  amount: "125.00",
  currency: "BDT",
};

test("accepts an authenticated gateway result for the exact transaction", () => {
  assert.equal(
    isSuccessfulPaymentValidation(transaction, {
      tranId: "order123_456",
      expectedAmount: 125,
    }),
    true,
  );
});

test("rejects unverified, mismatched, or invalid gateway results", () => {
  assert.equal(isSuccessfulPaymentStatus("VALID"), true);
  assert.equal(
    isSuccessfulPaymentValidation(null, {
      tranId: "order123_456",
      expectedAmount: 125,
    }),
    false,
  );
  assert.equal(
    isSuccessfulPaymentValidation(
      { ...transaction, tran_id: "another_order_456" },
      { tranId: "order123_456", expectedAmount: 125 },
    ),
    false,
  );
  assert.equal(
    isSuccessfulPaymentValidation(
      { ...transaction, amount: "124.99" },
      { tranId: "order123_456", expectedAmount: 125 },
    ),
    false,
  );
  assert.equal(
    isSuccessfulPaymentValidation(
      { ...transaction, currency: "USD" },
      { tranId: "order123_456", expectedAmount: 125 },
    ),
    false,
  );
  assert.equal(
    isSuccessfulPaymentValidation(
      { ...transaction, status: "FAILED" },
      { tranId: "order123_456", expectedAmount: 125 },
    ),
    false,
  );
  assert.equal(
    isSuccessfulPaymentValidation(
      { ...transaction, amount: "not-an-amount" },
      { tranId: "order123_456", expectedAmount: "not-an-amount" },
    ),
    false,
  );
});
