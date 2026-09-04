import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const isProduction = process.env.NODE_ENV === "production";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
const appOrigin = appUrl ? new URL(appUrl).origin : "";
const JWT_SECRET = process.env.JWT_SECRET || "vibebuild-dev-jwt-secret";
const COOKIE_NAME = "vibebuild-session";

// Paths that don't require authentication
const PUBLIC_PATHS = ["/login", "/signup"];
const PUBLIC_PREFIXES = ["/api/", "/_next/", "/favicon.ico", "/icon.svg"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

function isAllowedOrigin(origin: string, request: NextRequest): boolean {
  if (!isProduction) return true;
  if (appOrigin && origin === appOrigin) return true;
  if (/^https:\/\/[^/]+\.totalum-project\.com$/.test(origin)) return true;
  const host = request.headers.get("host");
  if (host && origin === `https://${host}`) return true;
  return false;
}

function addCorsHeaders(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && isAllowedOrigin(origin, request)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Max-Age", "86400");
    response.headers.set("Vary", "Origin");
  }
  return response;
}

function addCspHeaders(response: NextResponse) {
  response.headers.set("Content-Security-Policy", "frame-ancestors *");
  response.headers.delete("X-Frame-Options");
  return response;
}

/** Read and verify the JWT from the session cookie. */
function getSessionRole(request: NextRequest): { role: string } | null {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    return { role: payload.role };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    addCorsHeaders(response, request);
    addCspHeaders(response);
    return response;
  }

  const { pathname } = request.nextUrl;

  // Auth check — redirect to login if not authenticated
  if (!isPublic(pathname)) {
    const session = getSessionRole(request);

    if (!session) {
      // Redirect to login, preserving the intended destination
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Admin-only routes
    if (pathname.startsWith("/admincp") && session.role !== "admin" && session.role !== "super_admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  const response = NextResponse.next();
  addCorsHeaders(response, request);
  addCspHeaders(response);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
