import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { findTeamMemberById } from "./team-members/team-members.repository.js";
import { findUserById } from "./users/users.repository.js";

const ADMIN_ROLES = ["admin", "super_admin", "manager"];

let io = null;

// Attach Socket.io to the existing HTTP server. Only admin/manager accounts
// are allowed to join the "admin" room where real-time notifications are sent.
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
        if (
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
