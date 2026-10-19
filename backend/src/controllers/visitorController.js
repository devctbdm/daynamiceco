import { getVisitorOverview } from "../services/googleAnalyticsService.js";

export const getVisitorOverviewController = async (req, res) => {
  try {
    const requestedDays = Number(req.query.days || 30);
    const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
    const data = await getVisitorOverview(days);
    res.json({ success: true, data });
  } catch (error) {
    const status = error.code === "GA_NOT_CONFIGURED" ? 503 : 502;
    res.status(status).json({ success: false, message: error.message });
  }
};
