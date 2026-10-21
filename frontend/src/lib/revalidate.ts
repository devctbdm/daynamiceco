import {
  SERVICE_FINDER_CACHE_PATHS,
  SERVICE_FINDER_CACHE_TAG,
} from './cacheTags';

/**
 * Ask the Next.js server to drop the cached storefront data for a tag after an
 * admin edit. Without this the homepage keeps serving the old data until its
 * 60s revalidation window elapses (which is why a new card seemed to need a
 * hard refresh).
 *
 * Call it from the browser (it posts to the relative `/api/revalidate` route
 * handler, which authenticates the staff token before purging). Best effort:
 * it never throws, and the timed revalidation still applies.
 */
export async function revalidateStorefront(
  tags: string[] = [SERVICE_FINDER_CACHE_TAG],
  paths: string[] = SERVICE_FINDER_CACHE_PATHS
): Promise<boolean> {
  try {
    const token =
      typeof window === 'undefined'
        ? null
        : localStorage.getItem('mobile_token');

    const response = await fetch('/api/revalidate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ tags, paths }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
