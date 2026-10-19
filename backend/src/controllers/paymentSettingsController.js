import { asc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDatabase } from "../db/database.js";
import { paymentGateways } from "../db/schema.js";

// Gateways live in the legacy document-envelope table: the JSONB `document`
// column holds `{ name, enabled, config }` exactly like the Mongo collection.

const serializeGateway = (row) => ({
  _id: row.id,
  name: row.document?.name ?? "",
  enabled: row.document?.enabled === true,
  config: row.document?.config ?? {},
});

const findByGatewayName = (name, database) =>
  database
    .select()
    .from(paymentGateways)
    .where(sql`${paymentGateways.document} ->> 'name' = ${String(name)}`)
    .limit(1);

export const getPaymentGateways = async (_req, res) => {
  try {
    const rows = await getDatabase()
      .select()
      .from(paymentGateways)
      .orderBy(asc(sql`${paymentGateways.document} ->> 'name'`));
    res.json({ success: true, gateways: rows.map(serializeGateway) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getActivePaymentGateways = async (_req, res) => {
  try {
    const rows = await getDatabase()
      .select()
      .from(paymentGateways)
      .where(sql`${paymentGateways.document} ->> 'enabled' = 'true'`)
      .orderBy(asc(sql`${paymentGateways.document} ->> 'name'`));

    const gateways = rows.map((row) => ({
      name: row.document?.name ?? "",
      label: row.document?.config?.label || row.document?.name || "",
      description: row.document?.config?.description || "",
    }));
    res.json({ success: true, gateways });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePaymentGateway = async (req, res) => {
  try {
    const name = String(req.params.id);
    const { enabled, config } = req.body || {};
    const database = getDatabase();
    const now = new Date();

    const [existing] = await findByGatewayName(name, database);
    const document = {
      ...(existing?.document ?? { name, enabled: false, config: {} }),
    };
    document.name = name;
    if (typeof enabled === "boolean") document.enabled = enabled;
    if (config && typeof config === "object") {
      document.config = { ...(document.config ?? {}), ...config };
    }

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
    res.status(500).json({ success: false, message: error.message });
  }
};
