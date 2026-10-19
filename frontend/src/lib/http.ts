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
};

export type ApiResponse<T = any> = { data: T; status: number; ok: boolean };

/**
 * Call the API with the built-in fetch(). Returns the parsed body plus status.
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
    ...init
  } = options;

  const res = await fetch(fullUrl, {
    ...init,
    method,
    headers,
    body,
    credentials: credentials || 'include',
  });

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
    throw new ApiError(message, res.status, data, res.statusText);
  }

  return { data: data as T, status: res.status, ok: res.ok };
}

export default apiFetch;
