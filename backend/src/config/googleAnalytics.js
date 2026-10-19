import dotenv from "dotenv";

dotenv.config();

const value = (name) => (process.env[name] || "").trim();

const googleAnalyticsConfig = {
  enabled: process.env.GA_ENABLED === "true",
  propertyId: value("GA4_PROPERTY_ID"),
  clientEmail: value("GA4_CLIENT_EMAIL"),
  privateKey: (process.env.GA4_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
};

export const isGoogleAnalyticsConfigured = () =>
  Boolean(
    googleAnalyticsConfig.enabled &&
    googleAnalyticsConfig.propertyId &&
    googleAnalyticsConfig.clientEmail &&
    googleAnalyticsConfig.privateKey,
  );

export default googleAnalyticsConfig;
