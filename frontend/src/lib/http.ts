// src/lib/http.ts
// Thin fetch helpers built on the platform's built-in fetch().
//
// This is NOT an HTTP client: there is no instance, no interceptors, no
// axios-style object. `apiFetch` simply builds the full URL (with the central
// `/api` prefix) and calls the global fetch(), normalising JSON/FormData
// bodies, cookies, auth, and errors. Native RequestInit options — including
// Next.js `cache` and `next: { revalidate, tags }` — pass straight through.
import { API_ROOT, buildApiUrl, getApiBase } from './apiConfig';

export { API_ROOT, buildApiUrl, getApiBase };
export const API_BASE = API_ROOT;

export class ApiError extends Error {
  status: number;
  data: any;
  response: { data: any; status: number; statusText: string };

  constructor(message: string, status: number, data: any, statusText = '') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.response = { data, status, statusText };
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

export type ApiFetchOptions = Omit<RequestInit, 'body' | 'method'> & {
  method?: string;
  body?: any;
  /** Query-string params, appended safely (skips null/undefined). */
  params?: Record<string, unknown>;
  /** Abort the attempt after this many ms (default 20s). 0 disables. */
  timeout?: number;
  /**
   * How many times to retry failed attempts. Defaults to 2 for idempotent
   * methods (GET/HEAD/OPTIONS) and 0 otherwise — a write is never replayed
   * automatically. Only network errors, user-request timeouts, and
   * retryable statuses (408/429/500/502/503/504) trigger a retry.
   */
  retries?: number;
};

export type ApiResponse<T = any> = { data: T; status: number; ok: boolean };

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const DEFAULT_TIMEOUT_MS = 20_000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const makeTimeoutSignal = (timeoutMs: number, userSignal?: AbortSignal | null) => {
  if (!timeoutMs || (!AbortSignal.timeout && !userSignal)) return undefined;
  const signals: AbortSignal[] = [];
  if (userSignal) signals.push(userSignal);
  if (timeoutMs && AbortSignal.timeout) signals.push(AbortSignal.timeout(timeoutMs));
  if (!signals.length) return undefined;
  // AbortSignal.any (baseline 2024) when available, otherwise the timeout
  // signal alone (user aborts are then detected via the listed listener).
  return (
    typeof AbortSignal.any === 'function'
      ? AbortSignal.any(signals)
      : signals[0]
  );
};

/**
 * Call the API with the built-in fetch(). Returns the parsed body plus status.
 * Idempotent requests are retried automatically on transient failures
 * (network drop, server 5xx, cold database start), so a page does not need a
 * manual browser refresh to recover.
 *
 * @example
 *   apiFetch('/categories')
 *   apiFetch('/categories', { method: 'POST', body: formData })
 *   apiFetch('/products', { params: { page: 1 }, next: { revalidate: 60 } })
 */
export async function apiFetch<T = any>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<ApiResponse<T>> {
  const method = (options.method || 'GET').toUpperCase();
  const fullUrl = buildApiUrl(path, options.params);

  const headers = new Headers(options.headers);

  let body: BodyInit | undefined;
  const raw = options.body;
  if (raw instanceof FormData) {
    // Leave Content-Type unset so the browser writes the multipart boundary.
    body = raw;
  } else if (
    typeof raw === 'string' ||
    raw instanceof Blob ||
    raw instanceof ArrayBuffer ||
    raw instanceof URLSearchParams
  ) {
    body = raw;
  } else if (raw !== undefined && raw !== null) {
    body = JSON.stringify(raw);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  // Inject the mobile/hybrid Bearer token when present (mirrors the old interceptor).
  if (typeof window !== 'undefined' && !headers.has('Authorization')) {
    const token = localStorage.getItem('mobile_token');
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const {
    method: _method,
    body: _body,
    params: _params,
    credentials,
    retries: retriesOption,
    signal,
    ...init
  } = options;

  const retries =
    retriesOption ??
    (IDEMPOTENT_METHODS.has(method) ? 2 : 0);

  // Multipart uploads have no default timeout: a large file can legitimately
  // take longer than a JSON request. Pass `timeout` explicitly to bound one.
  const timeout =
    options.timeout ?? (body instanceof FormData ? 0 : DEFAULT_TIMEOUT_MS);

  for (let attempt = 0; ; attempt += 1) {
    const combinedSignal = makeTimeoutSignal(timeout, signal ?? undefined);

    let res: Response;
    try {
      res = await fetch(fullUrl, {
        ...init,
        method,
        headers,
        body,
        credentials: credentials || 'include',
        ...(combinedSignal ? { signal: combinedSignal } : {}),
      });
    } catch (error) {
      // User-initiated aborts are never retried, they are intentional.
      // Our own timeout/network errors go through the retry loop below.
      if (attempt < retries && !signal?.aborted) {
        await delay(700 * attempt + 300);
        continue;
      }
      throw error;
    }

    let data: any = null;
    if (res.status !== 204 && res.status !== 205) {
      const contentType = res.headers.get('content-type') || '';
      data = contentType.includes('application/json')
        ? await res.json().catch(() => null)
        : await res.text().catch(() => null);
    }

    if (!res.ok) {
      const message =
        (data && typeof data === 'object' && (data.message || data.error)) ||
        res.statusText ||
        'Request failed';
      if (RETRYABLE_STATUS.has(res.status) && attempt < retries) {
        await delay(700 * attempt + 300);
        continue;
      }
      throw new ApiError(message, res.status, data, res.statusText);
    }

    return { data: data as T, status: res.status, ok: res.ok };
  }
}

export default apiFetch;
