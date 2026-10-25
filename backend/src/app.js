import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import { sql } from "drizzle-orm";
import helmet from "helmet";
import morgan from "morgan";
// Import route files (with .js extension)
import { getDatabase } from "./db/database.js";
import { getRedis } from "./config/redis.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import metaRoutes from "./routes/metaRoutes.js";
import paymentSettingsRoutes from "./routes/paymentSettingsRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import visitorRoutes from "./routes/visitorRoutes.js";

// Set DNS servers to avoid DNS resolution issues
import { setServers } from "node:dns/promises";
setServers(["8.8.8.8", "1.1.1.1", "9.9.9.9"]);

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// ------- Trust proxy (correct req.ip behind Nginx/Cloudflare/load balancer) -------
// Without this, every visitor shares the proxy's IP -> rate limiters would lock
// everyone out together and session logs would record the wrong IP.
// TRUST_PROXY accepts:
//   'false'            -> app is exposed directly (no proxy)
//   '1' | number       -> number of trusted proxy hops (Nginx on same host = 1)
//   'true'             -> trust all hops (only ok if the proxy overwrites XFF)
//   'ip1,ip2'          -> explicit proxy IPs/CIDRs (e.g. your load balancer)
// Default when unset: 1 (the typical single-Nginx setup).
const trustProxyEnv = process.env.TRUST_PROXY;
let trustProxySetting;
if (trustProxyEnv === undefined || trustProxyEnv === "") {
  trustProxySetting = 1;
} else if (trustProxyEnv === "true") {
  trustProxySetting = true;
} else if (trustProxyEnv === "false") {
  trustProxySetting = false;
} else if (!Number.isNaN(Number(trustProxyEnv))) {
  trustProxySetting = Number(trustProxyEnv);
} else {
  trustProxySetting = trustProxyEnv.split(",").map((s) => s.trim());
}
app.set("trust proxy", trustProxySetting);

// Disable ETag so cached API responses don't come back as 304 (304 is non-2xx and would be treated as an error)
app.set("etag", false);

// ------- Middlewares -------

// 1. Security headers
app.use(helmet());

// 2. CORS (allow frontend and mobile apps)
const allowedOrigins = new Set(
  [
    "http://localhost:3000",

    process.env.FRONTEND_URL?.trim(),
    ...(process.env.CORS_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ].filter(Boolean),
);
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin) || allowedOrigins.has("*")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Never cache API responses (auth data must stay fresh; avoids 304 being treated as an error)
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// 3. Rate limiting (prevent brute force)
// General API limit: generous for a storefront (products, categories, cart, user, etc.)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 1000, // limit each IP to 1000 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api", limiter);

// Stricter limiter for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 50, // 50 login/register attempts per windowMs per IP
  message: "Too many login attempts from this IP, please try again later.",
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/verify-otp", authLimiter);
// Very tight limit for the one-time initial setup endpoint. It only works
// while no super admin exists, but lock it down anyway so it can't be probed.
const setupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // 10 setup attempts per windowMs per IP
  message: "Too many setup attempts from this IP, please try again later.",
});
app.use("/api/setup", setupLimiter);

// 4. Logging (dev format)
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// 5. Compression (gzip)
app.use(compression());

// 6. Parse JSON and URL-encoded bodies
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ------- Routes -------
app.use("/api/invoices", invoiceRoutes);

app.use("/api/customers", customerRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/payment-settings", paymentSettingsRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/visitors", visitorRoutes);
app.use("/api/upload", uploadRoutes);

// Health check endpoint
const checkDatabase = async () => {
  try {
    await getDatabase().execute(sql`select 1`);
    return { status: "healthy", message: "PostgreSQL is connected" };
  } catch (error) {
    return { status: "unhealthy", message: error.message };
  }
};

app.get("/", (req, res) => {
  res
    .status(200)
    .json({ status: "OK", message: "Apple IT Zone backend is running" });
});

app.get("/api/health", async (req, res) => {
  const database = await checkDatabase();
  const redisEnabled = process.env.REDIS_ENABLED !== "false";
  const redisReady = Boolean(getRedis());
  const services = {
    api: { status: "healthy", message: "API is responding" },
    database,
    redis: {
      status: !redisEnabled ? "disabled" : redisReady ? "healthy" : "unhealthy",
      message: !redisEnabled
        ? "Redis is disabled"
        : redisReady
          ? "Redis is connected"
          : "Redis is not ready",
    },
  };
  const overall = Object.values(services).some(
    (service) => service.status === "unhealthy",
  )
    ? "unhealthy"
    : "healthy";

  res.status(overall === "healthy" ? 200 : 503).json({
    success: overall === "healthy",
    status: overall,
    checkedAt: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    memory: {
      usedMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
    nodeVersion: process.version,
    services,
  });
});

// ------- Error Handling Middleware -------
app.use((err, req, res, _next) => {
  console.error("❌ Error:", err.stack);

  // PostgreSQL unique constraint violation (Neon)
  if (err.code === "23505") {
    return res.status(400).json({
      success: false,
      message: `Duplicate value for field: ${err.constraint || "unknown"}`,
    });
  }

  // PostgreSQL check / foreign key constraint violation (Neon)
  if (err.code === "23514" || err.code === "23503") {
    return res.status(400).json({
      success: false,
      message: err.message || "Validation error",
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }

  // Default to 500
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// Catch 404 and forward to error handler.
// Paths served by the NestJS host (registered before this Express app is
// mounted) must fall through instead of being answered with the legacy 404
// payload, so the Nest exception filters can handle them.
const NEST_HANDLED_PATHS = ["/api", "/api/health"];
const NEST_HANDLED_PREFIXES = [
  "/api/auth",
  "/api/cart",
  "/api/categories",
  "/api/holiday",
  "/api/home-content",
  "/api/home-slider-texts",
  "/api/maintenance",
  "/api/loyalty",
  "/api/notifications",
  "/api/offers",
  "/api/orders",
  "/api/pc-builder",
  "/api/payment",
  "/api/permission-groups",
  "/api/physical-stores",
  "/api/popup-offer",
  "/api/products",
  "/api/product-filters",
  "/api/promo",
  "/api/questions",
  "/api/service-finders",
  "/api/setup",
  "/api/sliders",
  "/api/sms",
  "/api/staff",
  "/api/store",
  "/api/team",
  "/api/users",
];

app.use((req, res, next) => {
  const handled =
    NEST_HANDLED_PATHS.includes(req.path) ||
    NEST_HANDLED_PREFIXES.some(
      (prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`),
    );
  if (handled) return next();
  res.status(404).json({ success: false, message: "Route not found" });
});

export default app;
