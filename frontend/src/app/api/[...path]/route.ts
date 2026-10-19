// app/api/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { buildApiUrl } from '@/lib/apiConfig';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, await params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, await params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, await params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, await params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, await params);
}

/**
 * Core proxy function – forwards any request to the backend.
 */
async function proxyRequest(request: NextRequest, params: { path: string[] }) {
  const path = params.path.join('/');
  const url = buildApiUrl(`/${path}`);

  // Build the request headers
  const headers = new Headers(request.headers);

  // 🔐 Inject auth token from cookies (HTTP‑Only) or Authorization header
  const cookieToken = request.cookies.get('token')?.value;
  const authHeader = request.headers.get('authorization');

  if (cookieToken) {
    headers.set('Authorization', `Bearer ${cookieToken}`);
  } else if (authHeader) {
    headers.set('Authorization', authHeader);
  }

  // 🧹 Remove host header to avoid conflicts
  headers.delete('host');

  // Prepare the request body for non‑GET methods
  let body: BodyInit | null = null;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.arrayBuffer();
  }

  // 🚀 Forward the request to your backend
  const response = await fetch(url, {
    method: request.method,
    headers,
    body,
    // Optionally add a timeout
    // signal: AbortSignal.timeout(10000),
  });

  // 🔁 Return the response as-is
  const responseHeaders = new Headers(response.headers);
  // Remove CORS headers from backend (your domain already handles this)
  responseHeaders.delete('access-control-allow-origin');
  responseHeaders.delete('access-control-allow-credentials');

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
