import { NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db/client";
import { hashPassword, createSession } from "@/lib/auth/server";
import { logAudit } from "@/lib/audit/logger";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password are required" },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const existing = await queryOne(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // First user becomes super_admin, rest are regular users
    const userCount = await queryOne<{ count: string }>(
      "SELECT count(*)::text as count FROM users"
    );
    const role = userCount?.count === "0" ? "super_admin" : "user";

    const hash = await hashPassword(password);
    const user = await queryOne<{ id: string; email: string; role: string }>(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role`,
      [email.toLowerCase().trim(), hash, role]
    );

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Failed to create account" },
        { status: 500 }
      );
    }

    await createSession({ id: user.id, email: user.email, role: user.role as "super_admin" | "admin" | "user", isActive: true });
    await logAudit({ userId: user.id, action: "auth_signup", outcome: "success", metadata: { role } });

    return NextResponse.json({
      ok: true,
      data: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("[auth/signup] error:", err);
    return NextResponse.json(
      { ok: false, error: "Signup failed" },
      { status: 500 }
    );
  }
}
