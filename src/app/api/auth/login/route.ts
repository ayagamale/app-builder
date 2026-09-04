import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db/client";
import { verifyPassword, createSession } from "@/lib/auth/server";
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

    const user = await queryOne<{ id: string; email: string; password_hash: string; role: string; is_active: boolean }>(
      "SELECT id, email, password_hash, role, is_active FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );

    if (!user || !user.is_active) {
      await logAudit({ action: "auth_login_failed", reason: "User not found or inactive", outcome: "failure", metadata: { email } });
      return NextResponse.json(
        { ok: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      await logAudit({ userId: user.id, action: "auth_login_failed", reason: "Wrong password", outcome: "failure" });
      return NextResponse.json(
        { ok: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    await createSession({ id: user.id, email: user.email, role: user.role as "super_admin" | "admin" | "user", isActive: true });
    await logAudit({ userId: user.id, action: "auth_login", outcome: "success" });

    return NextResponse.json({
      ok: true,
      data: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("[auth/login] error:", err);
    return NextResponse.json(
      { ok: false, error: "Login failed" },
      { status: 500 }
    );
  }
}
