import { createAuditLog } from "../audit/audit.repository.js";

const safeChanges = (body = {}) => {
  const changes = { ...body };
  for (const key of ["password", "apiKey", "token", "pendingToken", "otp"]) {
    delete changes[key];
  }
  return Object.keys(changes).length ? changes : null;
};

const actorOf = (user) =>
  user
    ? { id: user.id ?? user._id, name: user.name, role: user.role }
    : { id: undefined, name: undefined, role: undefined };

/**
 * Records an audit entry for every admin request once the response finished.
 * Writing is fire-and-forget: an audit failure must never break the request.
 */
export const auditAdminRequest = (req, res, next) => {
  res.on("finish", () => {
    if (req.originalUrl.startsWith("/api/audit")) return;
    createAuditLog({
      actor: actorOf(req.user),
      action: `${req.method} ${req.baseUrl}${req.path}`,
      target: req.params?.id || req.body?.orderId || "",
      changes: { request: safeChanges(req.body), statusCode: res.statusCode },
      ip: req.ip || req.connection?.remoteAddress || "",
      userAgent: req.headers["user-agent"] || "",
    }).catch(() => {});
  });
  next();
};

/** Records a LOGIN audit entry. Fire-and-forget, resolves when written. */
export const recordLogin = (req, account) =>
  createAuditLog({
    actor: actorOf(account),
    action: "LOGIN",
    target: "authentication",
    ip: req.ip || req.connection?.remoteAddress || "",
    userAgent: req.headers["user-agent"] || "",
  }).catch(() => {});
