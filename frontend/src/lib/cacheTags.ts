// Next.js cache tags used for on-demand revalidation.
//
// The storefront data helpers in `serverApi.ts` tag their `fetch` calls, and
// `app/api/revalidate/route.ts` purges those tags after an admin edit so the
// homepage reflects the change immediately instead of waiting for the 60s
// background revalidation.
export const SERVICE_FINDER_CACHE_TAG = 'service-finder';

/** Storefront routes that depend on the tag above. */
export const SERVICE_FINDER_CACHE_PATHS = ['/'];
