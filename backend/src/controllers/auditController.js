import { listAuditLogs } from "../audit/audit.repository.js";

export const getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20),
    );
    const role =
      req.query.role && req.query.role !== "all"
        ? String(req.query.role)
        : undefined;
    const status =
      req.query.status === "success" || req.query.status === "failed"
        ? req.query.status
        : undefined;
    const search = req.query.search ? String(req.query.search).trim() : "";

    const { logs, total } = await listAuditLogs({
      page,
      limit,
      role,
      status,
      search: search || undefined,
    });

    res.json({
      success: true,
      logs,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
