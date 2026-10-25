import test from "node:test";
import assert from "node:assert/strict";
import {
  getSSLCommerzConfig,
  getSSLCommerzConfigStatus,
} from "../src/payments/sslcommerz-config.js";

const environmentKeys = ["SSL_STORE_ID", "SSL_STORE_PASSWORD", "SSL_IS_LIVE"];

const withEnvironment = async (values, callback) => {
  const previous = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  try {
    for (const key of environmentKeys) {
      if (values[key] === undefined) delete process.env[key];
      else process.env[key] = values[key];
    }
    await callback();
  } finally {
    for (const key of environmentKeys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
};

test("reports readiness and mode without returning credentials", async () => {
  await withEnvironment(
    {
      SSL_STORE_ID: "sandbox-store",
      SSL_STORE_PASSWORD: "secret",
      SSL_IS_LIVE: "false",
    },
    () => {
      assert.deepEqual(getSSLCommerzConfigStatus(), {
        configured: true,
        mode: "sandbox",
      });
      assert.deepEqual(getSSLCommerzConfig(), {
        storeId: "sandbox-store",
        storePassword: "secret",
        isLive: false,
      });
    },
  );
});

test("reports incomplete credentials or invalid mode as not configured", async () => {
  await withEnvironment(
    {
      SSL_STORE_ID: "sandbox-store",
      SSL_STORE_PASSWORD: "",
      SSL_IS_LIVE: "false",
    },
    () => {
      assert.deepEqual(getSSLCommerzConfigStatus(), {
        configured: false,
        mode: "sandbox",
      });
      assert.throws(getSSLCommerzConfig, /configuration is incomplete/);
    },
  );

  await withEnvironment(
    {
      SSL_STORE_ID: "sandbox-store",
      SSL_STORE_PASSWORD: "secret",
      SSL_IS_LIVE: "yes",
    },
    () => {
      assert.deepEqual(getSSLCommerzConfigStatus(), {
        configured: false,
        mode: null,
      });
      assert.throws(getSSLCommerzConfig, /configuration is incomplete/);
    },
  );
});
