import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { findTeamMemberById } from "./team-members/team-members.repository.js";
import { findUserById } from "./users/users.repository.js";

const ADMIN_ROLES = ["admin", "super_admin", "manager"];

let io = null;
let notificationRefreshTimer = null;
let pendingNotificationPayload = null;

const NOTIFICATION_REFRESH_INTERVAL_MS = 1000;

// Attach Socket.io and place authenticated admins and customers in separate
// rooms so notification events can only reach their intended audience.
export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: (process.env.CORS_ORIGINS || "http://localhost:3000").split(","),
      credentials: true,
    },
  });

  io.on("connection", async (socket) => {
    const token = socket.handshake.auth?.token;
    let joined = false;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [user, member] = await Promise.all([
          findUserById(decoded.id),
          findTeamMemberById(decoded.id),
        ]);

        const account = user || member;
        if (!member && account?.role === "customer") {
          socket.join(`customer:${decoded.id}`);
          joined = true;
        } else if (
          account &&
          (!member || member.active) &&
          ADMIN_ROLES.includes(account.role)
        ) {
          socket.join("admin");
          joined = true;
        }
      } catch {
        joined = false;
      }
    }

    if (!joined) {
      // Not an admin session — reject the connection.
      socket.disconnect(true);
    }
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error(
      "Socket.io has not been initialized. Call initSocket(server) first.",
    );
  }
  return io;
}

// Emit an event to everyone in the admin room (all connected admin dashboards).
export function emitToAdmins(event, payload) {
  getIO().to("admin").emit(event, payload);
}

export function emitToCustomer(userId, event, payload) {
  getIO().to(`customer:${userId}`).emit(event, payload);
}

// Notification records are durable, so socket events only need to signal that
// the admin list should refresh; coalesce bursts rather than broadcasting each
// database insert to every connected admin.
export function queueAdminNotificationRefresh(payload) {
  pendingNotificationPayload = payload;
  if (notificationRefreshTimer) return;

  notificationRefreshTimer = setTimeout(() => {
    const latestPayload = pendingNotificationPayload;
    notificationRefreshTimer = null;
    pendingNotificationPayload = null;
    try {
      emitToAdmins("notification:new", latestPayload);
    } catch (error) {
      console.error("Failed to emit notification refresh:", error.message);
    }
  }, NOTIFICATION_REFRESH_INTERVAL_MS);
  notificationRefreshTimer.unref?.();
}
