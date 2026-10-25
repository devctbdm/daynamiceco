import { asc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDatabase } from "../db/database.js";
import { paymentGateways } from "../db/schema.js";
import { getSSLCommerzConfigStatus } from "../payments/sslcommerz-config.js";

// Gateways live in the legacy document-envelope table: the JSONB `document`
// column holds `{ name, enabled, config }` exactly like the Mongo collection.

const CONFIG_KEYS = {
  sslcommerz: [],
  bkash: [],
  nagad: [],
  cod: ["label", "description", "minOrder", "maxOrder", "extraCharge"],
};

const safeConfig = (name, config) => {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(config).filter(([key]) => CONFIG_KEYS[name]?.includes(key)),
  );
};

const serializeGateway = (row) => {
  const name = row.document?.name ?? "";
  return {
    _id: row.id,
    name,
    enabled: row.document?.enabled === true,
    config: safeConfig(name, row.document?.config),
  };
};

const findByGatewayName = (name, database) =>
  database
    .select()
    .from(paymentGateways)
    .where(sql`${paymentGateways.document} ->> 'name' = ${String(name)}`)
    .limit(1);

const sanitizeStoredConfig = async (database, row) => {
  const name = row.document?.name ?? "";
  const config = safeConfig(name, row.document?.config);
  if (JSON.stringify(config) === JSON.stringify(row.document?.config ?? {})) {
    return row;
  }

  const document = { ...row.document, config };
  await database
    .update(paymentGateways)
    .set({ document, updatedAt: new Date() })
    .where(eq(paymentGateways.id, row.id));
  return { ...row, document };
};

export const getPaymentGateways = async (_req, res) => {
  try {
    const database = getDatabase();
    const rows = await database
      .select()
      .from(paymentGateways)
      .orderBy(asc(sql`${paymentGateways.document} ->> 'name'`));
    const sanitizedRows = await Promise.all(
      rows.map((row) => sanitizeStoredConfig(database, row)),
    );
    res.json({
      success: true,
      gateways: sanitizedRows.map(serializeGateway),
      sslcommerzConfig: getSSLCommerzConfigStatus(),
    });
  } catch (error) {
    console.error("Payment method read failed:", error?.name || "Error");
    res
      .status(500)
      .json({ success: false, message: "Could not load payment methods" });
  }
};

export const getActivePaymentGateways = async (_req, res) => {
  try {
    const rows = await getDatabase()
      .select()
      .from(paymentGateways)
      .where(sql`${paymentGateways.document} ->> 'enabled' = 'true'`)
      .orderBy(asc(sql`${paymentGateways.document} ->> 'name'`));

    const gateways = rows.map((row) => {
      const name = row.document?.name ?? "";
      const config = safeConfig(name, row.document?.config);
      return {
        name,
        label: name === "sslcommerz" ? "SSLCommerz" : config.label || name,
        description:
          name === "sslcommerz"
            ? "Pay with cards and mobile wallets."
            : config.description || "",
      };
    });
    res.json({ success: true, gateways });
  } catch (error) {
    console.error("Active payment method read failed:", error?.name || "Error");
    res
      .status(500)
      .json({ success: false, message: "Could not load payment methods" });
  }
};

export const updatePaymentGateway = async (req, res) => {
  try {
    const name = String(req.params.id);
    const { enabled, config } = req.body || {};
    if (!Object.hasOwn(CONFIG_KEYS, name)) {
      return res
        .status(404)
        .json({ success: false, message: "Unknown payment method" });
    }
    if (typeof enabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "A boolean enabled value is required",
      });
    }
    if (
      config !== undefined &&
      (!config || typeof config !== "object" || Array.isArray(config))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method settings",
      });
    }
    const submittedConfig = config ?? {};
    if (
      Object.keys(submittedConfig).some(
        (key) => !CONFIG_KEYS[name].includes(key),
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment credentials and mode are managed by the server",
      });
    }

    const database = getDatabase();
    const now = new Date();

    const [existing] = await findByGatewayName(name, database);
    const document = {
      name,
      enabled,
      config: {
        ...safeConfig(name, existing?.document?.config),
        ...safeConfig(name, submittedConfig),
      },
    };

    let id = existing?.id;
    if (existing) {
      await database
        .update(paymentGateways)
        .set({ document, updatedAt: now })
        .where(eq(paymentGateways.id, existing.id));
    } else {
      id = randomUUID();
      await database
        .insert(paymentGateways)
        .values({ id, document, createdAt: now, updatedAt: now });
    }

    res.json({ success: true, gateway: serializeGateway({ id, document }) });
  } catch (error) {
    console.error("Payment method update failed:", error?.name || "Error");
    res
      .status(500)
      .json({ success: false, message: "Could not update payment method" });
  }
};
