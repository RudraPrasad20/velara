// middleware.ts
// Protects /dashboard and /upload routes.
// Redirects logged-in users from / to /dashboard.
// Uses betterFetch to check session — reads cookie from request headers.

import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "better-auth/types";
import { NextResponse, type NextRequest } from "next/server";

async function getSession(request: NextRequest): Promise<Session | null> {
  try {
    const { data } = await betterFetch<Session>("/api/auth/get-session", {
      baseURL: request.nextUrl.origin,
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
    });
    return data ?? null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect logged-in users from landing page → dashboard
  if (pathname === "/") {
    const session = await getSession(request);
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Protect these routes
  const session = await getSession(request);
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/upload/:path*",
  ],
};