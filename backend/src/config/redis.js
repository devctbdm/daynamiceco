// backend/src/config/redis.js
// Centralized Redis client + safe cache helpers.
// If Redis is unavailable or disabled, every helper degrades gracefully
// (no cache) so the API keeps working against MongoDB.
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false';
const REDIS_HOST = process.env.REDIS_HOST;

let client = null;
let isReady = false;

/**
 * Lazily create (but do not yet connect) the Redis client.
 * Returns null when Redis is disabled or no host is configured.
 */
export const createRedisClient = () => {
  if (client) return client;
  if (!REDIS_ENABLED || !REDIS_HOST) {
    console.log('⚠️  Redis disabled (set REDIS_ENABLED=true and REDIS_HOST to enable).');
    return null;
  }

  // Fail fast if Redis is unreachable so it can never wedge cached endpoints.
  // Note: redis.io / Redis Cloud managed endpoints often accept plain TCP with
  // the credentials embedded in the URL (the separate username/password options
  // trip the RESP3 HELLO AUTH handshake on those servers). Use REDIS_URL when
  // provided, otherwise build redis:// or rediss:// from the env values.
  const CONNECT_TIMEOUT = Number(process.env.REDIS_CONNECT_TIMEOUT_MS) || 3000;
  const COMMAND_TIMEOUT = Number(process.env.REDIS_COMMAND_TIMEOUT_MS) || 2000;

  const parseAuth = (value = '') => {
    if (!value) return '';
    const s = String(value).trim().replace(/^\/+|\/+$/g, '');
    return encodeURIComponent(s);
  };

  let connectionUrl =
    process.env.REDIS_URL && process.env.REDIS_URL.trim() !== ''
      ? process.env.REDIS_URL.trim()
      : null;

  if (!connectionUrl) {
    const scheme = process.env.REDIS_TLS === 'true' ? 'rediss' : 'redis';
    const user = parseAuth(process.env.REDIS_USERNAME || 'default');
    const pass = parseAuth(process.env.REDIS_PASSWORD);
    const auth = pass ? `${user}:${pass}@` : user ? `${user}@` : '';
    connectionUrl = `${scheme}://${auth}${REDIS_HOST}:${Number(process.env.REDIS_PORT) || 19809}`;
  }

  client = createClient({
    url: connectionUrl,
    socket: {
      connectTimeout: CONNECT_TIMEOUT,
      timeout: COMMAND_TIMEOUT,
      // rediss:// URLs already imply TLS; this is a no-op safety flag.
      tls: process.env.REDIS_TLS === 'true' ? true : undefined,
    },
  });

  client.on('error', (err) => {
    console.error('❌ Redis Client Error:', err.message);
    isReady = false;
  });
  client.on('connect', () => console.log('🔗 Redis connecting...'));
  client.on('ready', () => {
    isReady = true;
    console.log('✅ Redis connected and ready');
  });
  client.on('end', () => {
    isReady = false;
    console.log('🔌 Redis connection closed');
  });

  return client;
};

/**
 * Connect to Redis at startup. Failures are non-fatal.
 */
export const connectRedis = async () => {
  const c = createRedisClient();
  if (!c) return null;
  // Never let a broken Redis stall server startup. The socket connectTimeout
  // makes the underlying connect() reject, but we guard anyway.
  let timer;
  const connectRace = Promise.race([
    c.connect(),
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('Redis connect timed out')),
        Number(process.env.REDIS_CONNECT_TIMEOUT_MS) || 3000
      );
    }),
  ]);
  try {
    await connectRace;
    return c;
  } catch (err) {
    clearTimeout(timer);
    console.error('❌ Redis connection failed (continuing without cache):', err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/** Returns the connected client, or null if not ready. */
export const getRedis = () => (isReady ? client : null);

// Wrap a redis command with a timeout so a wedged connection can never hang a request.
const withTimeout = (promise, ms = 2000) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Redis command timed out')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

/** Get a cached string value (null on miss / error). */
export const cacheGet = async (key) => {
  const c = getRedis();
  if (!c) return null;
  try {
    return await withTimeout(c.get(key), Number(process.env.REDIS_COMMAND_TIMEOUT_MS) || 2000);
  } catch (e) {
    if (e?.message === 'Redis command timed out') console.warn('⚠️  Redis get timeout');
    return null;
  }
};

/** Store a string value with a TTL in seconds. */
export const cacheSet = async (key, value, ttlSeconds = 300) => {
  const c = getRedis();
  if (!c) return;
  try {
    await withTimeout(c.set(key, value, { EX: ttlSeconds }), Number(process.env.REDIS_COMMAND_TIMEOUT_MS) || 2000);
  } catch {
    /* ignore cache write failures */
  }
};

/**
 * Delete one or more keys. Supports an exact key or a glob pattern
 * (e.g. 'products:*'). Pattern deletes are best-effort.
 */
export const cacheDel = async (keyOrPattern) => {
  const c = getRedis();
  if (!c) return;
  try {
    const ms = Number(process.env.REDIS_COMMAND_TIMEOUT_MS) || 2000;
    if (typeof keyOrPattern === 'string' && keyOrPattern.includes('*')) {
      const keys = await withTimeout(c.keys(keyOrPattern), ms);
      if (keys.length) await withTimeout(c.del(keys), ms);
    } else {
      await withTimeout(c.del(keyOrPattern), ms);
    }
  } catch {
    /* ignore */
  }
};

/**
 * Convenience wrapper: return cached JSON if present, otherwise run `fn`,
 * cache its (JSON-serializable) result, and return it.
 */
export const cacheWrap = async (key, ttlSeconds, fn) => {
  const cached = await cacheGet(key);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      /* fall through to recompute */
    }
  }
  const value = await fn();
  await cacheSet(key, JSON.stringify(value), ttlSeconds);
  return value;
};
