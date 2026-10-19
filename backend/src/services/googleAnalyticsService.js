import { google } from "googleapis";
import config, {
  isGoogleAnalyticsConfigured,
} from "../config/googleAnalytics.js";

const getAnalyticsClient = () => {
  if (!isGoogleAnalyticsConfigured()) return null;
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: config.clientEmail,
      private_key: config.privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
  return google.analyticsdata({ version: "v1beta", auth });
};

const runReport = async (analytics, request) => {
  const response = await analytics.properties.runReport({
    property: `properties/${config.propertyId}`,
    requestBody: request,
  });
  return response.data.rows || [];
};

const metricValue = (row, index = 0) =>
  Number(row.metricValues?.[index]?.value || 0);

export const getVisitorOverview = async (days = 30) => {
  const analytics = getAnalyticsClient();
  if (!analytics) {
    const error = new Error("Google Analytics is not configured.");
    error.code = "GA_NOT_CONFIGURED";
    throw error;
  }

  const dateRange = { startDate: `${days}daysAgo`, endDate: "today" };
  const [summaryRows, dailyRows, deviceRows, pageRows] = await Promise.all([
    runReport(analytics, {
      dateRanges: [dateRange],
      metrics: [
        { name: "activeUsers" },
        { name: "newUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "engagementRate" },
      ],
    }),
    runReport(analytics, {
      dateRanges: [dateRange],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    }),
    runReport(analytics, {
      dateRanges: [dateRange],
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
    }),
    runReport(analytics, {
      dateRanges: [dateRange],
      dimensions: [{ name: "pageTitle" }, { name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: "10",
    }),
  ]);

  const summary = summaryRows[0];
  return {
    days,
    summary: {
      activeUsers: metricValue(summary, 0),
      newUsers: metricValue(summary, 1),
      sessions: metricValue(summary, 2),
      pageViews: metricValue(summary, 3),
      engagementRate: Number((metricValue(summary, 4) * 100).toFixed(1)),
    },
    daily: dailyRows.map((row) => ({
      date: row.dimensionValues?.[0]?.value || "",
      activeUsers: metricValue(row, 0),
      sessions: metricValue(row, 1),
    })),
    devices: deviceRows.map((row) => ({
      device: row.dimensionValues?.[0]?.value || "unknown",
      activeUsers: metricValue(row, 0),
      sessions: metricValue(row, 1),
    })),
    topPages: pageRows.map((row) => ({
      title: row.dimensionValues?.[0]?.value || "(untitled)",
      path: row.dimensionValues?.[1]?.value || "/",
      pageViews: metricValue(row, 0),
      activeUsers: metricValue(row, 1),
    })),
  };
};
