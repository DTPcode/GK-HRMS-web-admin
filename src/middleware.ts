// ============================================================================
// GK-HRMS — Middleware
// Bảo vệ route: chưa login → redirect /login
// Mock phase: check cookie "mock_current_role"
// TODO: Replace với real JWT/session check khi backend sẵn
// ============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Routes không cần đăng nhập */
const PUBLIC_PATHS = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets, API routes, Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isPublicPath = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // Mock auth: check cookie
  const mockRole = request.cookies.get("mock_current_role")?.value;
  const isLoggedIn = !!mockRole;

  // Chưa login + route cần auth → redirect /login
  if (!isLoggedIn && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Đã login + vào /login → redirect /dashboard
  if (isLoggedIn && isPublicPath) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on all routes except static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
