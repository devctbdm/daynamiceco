import dotenv from "dotenv";

dotenv.config();

const trimValue = (value) => (typeof value === "string" ? value.trim() : "");
const isConfiguredValue = (value) =>
  Boolean(value) && !value.startsWith("your_");

const metaConfig = {
  enabled: process.env.META_CATALOG_SYNC_ENABLED === "true",
  apiVersion: trimValue(process.env.META_API_VERSION) || "v23.0",
  businessId: trimValue(process.env.META_BUSINESS_ID),
  catalogId: trimValue(process.env.META_CATALOG_ID),
  accessToken: trimValue(process.env.META_ACCESS_TOKEN),
  country: trimValue(process.env.META_CATALOG_COUNTRY) || "BD",
  currency: trimValue(process.env.META_CATALOG_CURRENCY) || "BDT",
  graphUrl: "https://graph.facebook.com",
};

export const isMetaCatalogConfigured = () =>
  Boolean(metaConfig.enabled && isMetaCredentialsConfigured());

export const isMetaCredentialsConfigured = () =>
  Boolean(
    isConfiguredValue(metaConfig.catalogId) &&
    isConfiguredValue(metaConfig.accessToken),
  );

export default metaConfig;
