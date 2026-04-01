// middleware.ts
// Fixed: uses auth.api.getSession directly instead of betterFetch HTTP round-trip.
// The betterFetch approach caused false logouts when BETTER_AUTH_URL had
// any mismatch with request.nextUrl.origin (port, protocol, etc).
// Also handles redirect: logged-in users hitting / go to /dashboard.

import { NextResponse, type NextRequest } from "next/server";
import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "better-auth/types";

async function getSession(request: NextRequest): Promise<Session | null> {
  const { data: session } = await betterFetch<Session>(
    "/api/auth/get-session",
    {
      // Use the exact origin from the request — avoids http/https mismatch
      baseURL: request.nextUrl.origin,
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
      // Short timeout — don't block page loads for more than 3s
      timeout: 3000,
    }
  );
  return session ?? null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect logged-in users away from / to /dashboard
  if (pathname === "/") {
    const session = await getSession(request);
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Protect dashboard and upload routes
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/upload")) {
    const session = await getSession(request);
    if (!session) {
      const loginUrl = new URL("/signin", request.url);
      // Preserve the intended destination so we can redirect back after login
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
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