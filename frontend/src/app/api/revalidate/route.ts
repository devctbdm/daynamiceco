// app/api/revalidate/route.ts
//
// On-demand revalidation for the storefront. The admin CMS calls this after a
// successful write so the homepage stops serving the previously cached data
// (otherwise changes only appeared after the 60s ISR window).
//
// Only signed-in staff may purge, and only whitelisted tags/paths are honoured.
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { getApiBase } from '@/lib/apiConfig';
import {
  SERVICE_FINDER_CACHE_PATHS,
  SERVICE_FINDER_CACHE_TAG,
} from '@/lib/cacheTags';

const ALLOWED_TAGS = new Set<string>([SERVICE_FINDER_CACHE_TAG]);
const ALLOWED_PATHS = new Set<string>(SERVICE_FINDER_CACHE_PATHS);
const ADMIN_ROLES = new Set(['admin', 'super_admin', 'manager']);

export async function POST(request: Request) {
  // Browsers send Origin for cross-site requests only; reject foreign origins.
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (origin && host && new URL(origin).host !== host) {
    return fail(403, 'Forbidden');
  }

  const authorization = request.headers.get('authorization');
  if (!authorization) return fail(401, 'Not authorized, no token');

  try {
    const me = await fetch(`${getApiBase()}/auth/me`, {
      headers: { authorization },
      cache: 'no-store',
    });
    if (!me.ok) return fail(401, 'Not authorized');

    const payload = (await me.json().catch(() => null)) as {
      user?: { role?: string };
    } | null;
    const role = payload?.user?.role;
    if (!role || !ADMIN_ROLES.has(role)) return fail(403, 'Forbidden');
  } catch {
    return fail(503, 'Authorization check unavailable');
  }

  const body = (await request.json().catch(() => null)) as {
    tags?: unknown;
    paths?: unknown;
  } | null;

  const tags = stringList(body?.tags).filter((tag) => ALLOWED_TAGS.has(tag));
  const paths = stringList(body?.paths).filter((path) =>
    ALLOWED_PATHS.has(path)
  );

  if (!tags.length && !paths.length) {
    return fail(400, 'No revalidatable tags or paths provided');
  }

  // Next 16 requires a cacheLife profile. "max" would serve stale content once
  // and refresh in the background, so the page right after an edit would still
  // look outdated; `{ expire: 0 }` drops the entry immediately, which is what
  // an explicit "I just saved this" edit wants.
  tags.forEach((tag) => revalidateTag(tag, { expire: 0 }));
  // Literal paths (like "/") are revalidated without a `type`; that parameter
  // is only for dynamic route patterns (e.g. "/products/[slug]").
  paths.forEach((path) => revalidatePath(path));

  return NextResponse.json({
    success: true,
    revalidated: { tags, paths },
    now: Date.now(),
  });
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function fail(status: number, message: string) {
  return NextResponse.json({ success: false, message }, { status });
}
