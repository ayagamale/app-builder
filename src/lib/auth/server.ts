import { queryOne } from "@/lib/db/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "vibebuild-dev-jwt-secret";
const COOKIE_NAME = "vibebuild-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type Role = "super_admin" | "admin" | "user";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
}

export interface SessionPayload {
  userId: string;
  email: string;
  role: Role;
}

/** Sign a JWT for a user and set it as an httpOnly cookie. */
export async function createSession(user: AuthUser): Promise<void> {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_MAX_AGE });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

/** Destroy the session cookie. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Read and verify the JWT from the cookie. Returns null if not authenticated. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as SessionPayload;
    return payload;
  } catch {
    return null;
  }
}

/** Resolve the current user from the session, or null. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await queryOne<{ id: string; email: string; role: Role; is_active: boolean }>(
    "SELECT id, email, role, is_active FROM users WHERE id = $1",
    [session.userId]
  );
  if (!user || !user.is_active) return null;
  return { id: user.id, email: user.email, role: user.role, isActive: user.is_active };
}

/** Require authentication — returns the user or throws a 401 response. */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

/** Require a specific role level — returns the user or throws a 403. */
export async function requireRole(minRole: Role): Promise<AuthUser> {
  const user = await requireAuth();
  const hierarchy: Record<Role, number> = { user: 0, admin: 1, super_admin: 2 };
  if (hierarchy[user.role] < hierarchy[minRole]) {
    throw new Response(
      JSON.stringify({ ok: false, error: "Forbidden: insufficient role" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
  return user;
}

/** Check if a role meets the minimum required level. */
export function hasRole(userRole: Role, minRole: Role): boolean {
  const hierarchy: Record<Role, number> = { user: 0, admin: 1, super_admin: 2 };
  return hierarchy[userRole] >= hierarchy[minRole];
}

/** Verify a password against a bcrypt hash. */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Hash a password with bcrypt. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
