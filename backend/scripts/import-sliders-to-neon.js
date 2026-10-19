import "dotenv/config";
import pg from "pg";
import { loadMongoose } from "./lib/mongo-driver.js";

const { Pool } = pg;
const EXECUTE_CONFIRMATION = "--confirm-import-sliders";

export function normalizeMongoSlider(document) {
  const now = new Date();
  return {
    id: String(document._id ?? ""),
    title: String(document.title ?? "").trim(),
    description: String(document.description ?? "").trim(),
    image: String(document.image ?? ""),
    link: String(document.link ?? "").trim(),
    type: document.type || "hero",
    active: document.active !== false,
    sortOrder: Number(document.sortOrder ?? 0),
    createdBy: document.createdBy ? String(document.createdBy) : null,
    createdAt: toDate(document.createdAt) ?? now,
    updatedAt: toDate(document.updatedAt) ?? now,
  };
}

export function normalizeMongoSliderSetting(document) {
  const interval = Number(document.interval ?? 5);
  if (
    typeof document.enabled !== "boolean" ||
    typeof document.autoSlide !== "boolean" ||
    !Number.isInteger(interval) ||
    interval < 3 ||
    interval > 10
  ) {
    throw new Error("Mongo slider settings do not satisfy Neon constraints");
  }
  return {
    enabled: document.enabled,
    autoSlide: document.autoSlide,
    interval,
  };
}

function toDate(value) {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Mongo slider data contains an invalid date");
  }
  return date;
}

function validateSliders(sliders) {
  const invalid = sliders.filter(
    (slider) =>
      !/^[a-f\d]{24}$/i.test(slider.id) ||
      slider.title.length > 200 ||
      slider.description.length > 500 ||
      !["hero", "ad_top", "ad_bottom"].includes(slider.type) ||
      !Number.isFinite(slider.sortOrder) ||
      slider.sortOrder < 0,
  );
  if (invalid.length) {
    throw new Error(
      `${invalid.length} Mongo slider record(s) do not satisfy Neon constraints; import stopped without writing data`,
    );
  }
}

async function main() {
  const execute = process.argv.includes("--execute");
  if (!execute && !process.argv.includes("--dry-run")) {
    throw new Error(
      "No action selected. Use --dry-run to inspect or --execute --confirm-import-sliders to import.",
    );
  }
  if (execute && !process.argv.includes(EXECUTE_CONFIRMATION)) {
    throw new Error(
      `Import writes slider records and settings to Neon. Add ${EXECUTE_CONFIRMATION} to confirm.`,
    );
  }
  if (!process.env.DB_URI) throw new Error("DB_URI must be configured");
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be configured");
  }

  const mongoose = await loadMongoose();
  const mongo = await mongoose
    .createConnection(process.env.DB_URI, { serverSelectionTimeoutMS: 5000 })
    .asPromise();
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.DATABASE_SSL === "false"
        ? false
        : { rejectUnauthorized: false },
  });
  try {
    const rawSliders = await mongo.collection("sliders").find({}).toArray();
    const sliders = rawSliders.map(normalizeMongoSlider);
    validateSliders(sliders);
    const rawSettings = await mongo
      .collection("slidersettings")
      .find({})
      .limit(1)
      .toArray();
    const setting = rawSettings[0]
      ? normalizeMongoSliderSetting(rawSettings[0])
      : null;
    const [sliderCount] = await pool.query(
      "select count(*)::int as count from slider_entries",
    );
    const [settingCount] = await pool.query(
      "select count(*)::int as count from slider_setting_entries",
    );
    console.log(
      `Validated ${sliders.length} Mongo slider(s) and ${setting ? "one" : "no"} slider setting; Neon has ${sliderCount.rows[0].count} slider row(s) and ${settingCount.rows[0].count} setting row(s).`,
    );
    if (!execute) {
      console.log("Dry run complete. No records were written.");
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("begin");
      let imported = 0;
      for (const slider of sliders) {
        const result = await client.query(
          `insert into slider_entries (
            id, title, description, image, link, type, active, sort_order,
            created_by, created_at, updated_at
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          on conflict (id) do nothing`,
          [
            slider.id,
            slider.title,
            slider.description,
            slider.image,
            slider.link,
            slider.type,
            slider.active,
            slider.sortOrder,
            slider.createdBy,
            slider.createdAt,
            slider.updatedAt,
          ],
        );
        imported += result.rowCount;
      }
      if (setting) {
        await client.query(
          `insert into slider_setting_entries (
            id, enabled, auto_slide, interval
          ) values ('default', $1, $2, $3)
          on conflict (id) do nothing`,
          [setting.enabled, setting.autoSlide, setting.interval],
        );
      }
      await client.query("commit");
      console.log(
        `Imported ${imported} slider(s) and ${setting ? "the slider setting" : "no slider setting"}; skipped ${sliders.length - imported} existing slider ID(s).`,
      );
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await Promise.all([mongo.close(), pool.end()]);
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  await main();
}
