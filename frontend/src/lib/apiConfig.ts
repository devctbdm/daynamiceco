// src/lib/apiConfig.ts
// Centralized API base URL resolution.
//
// Environment variables hold the *root* origin only (no `/api`), e.g.
//   API_BASE_URL=http://localhost:5000
//   NEXT_PUBLIC_API_URL=http://localhost:5000
//
// The `/api` prefix is appended here exactly once so callers can never produce
// duplicate or malformed paths.

const RAW_BASE =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5000';

/** Root origin without any trailing slash or `/api` suffix. */
export const API_ROOT = RAW_BASE.replace(/\/+$/, '').replace(/\/api$/, '');

/** Full API base, e.g. `http://localhost:5000/api`. */
export function getApiBase(): string {
  return `${API_ROOT}/api`;
}

/**
 * Build an absolute API URL from a path.
 *
 * - Accepts paths with or without a leading slash.
 * - Accepts paths that already start with `/api` (no duplication).
 * - Accepts fully-qualified URLs, whose `/api` prefix is normalized.
 * - Query strings and hashes are preserved.
 */
export function buildApiUrl(
  path: string,
  params?: Record<string, unknown>
): string {
  let u = (path || '').trim();

  // Fully-qualified URL: keep its path/query and normalize the /api prefix.
  if (/^https?:\/\//i.test(u)) {
    u = u.replace(/^https?:\/\/[^/]+/i, '');
  }

  if (!u.startsWith('/')) u = `/${u}`;

  // Collapse a leading `/api` so it is appended exactly once below.
  if (u === '/api') u = '/';
  else if (u.startsWith('/api/')) u = u.slice(4);

  const [rawPath, hash] = u.split('#');
  const [pathname, search] = rawPath.split('?');

  let url = `${getApiBase()}${pathname === '/' ? '' : pathname}`;

  const qs = new URLSearchParams(search || '');
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      qs.append(key, String(value));
    }
  }
  const query = qs.toString();
  if (query) url += `?${query}`;
  if (hash) url += `#${hash}`;

  return url;
}
