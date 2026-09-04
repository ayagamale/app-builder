import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db/client";
import { requireRole, requireRole as requireAdmin, type Role } from "@/lib/auth/server";
import { logAudit } from "@/lib/audit/logger";

export async function GET() {
  try {
    await requireAdmin("admin");
    const rows = await query<{ id: string; email: string; role: Role; is_active: boolean; created_at: string }>(
      "SELECT id, email, role, is_active, created_at FROM users ORDER BY created_at DESC"
    );
    return NextResponse.json({ ok: true, data: rows });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireAdmin("super_admin");
    const body = await req.json();
    const { id, role, is_active } = body;
    if (!id) return NextResponse.json({ ok: false, error: "User ID required" }, { status: 400 });
    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (role !== undefined) { sets.push(`role = $${i++}`); vals.push(role); }
    if (is_active !== undefined) { sets.push(`is_active = $${i++}`); vals.push(is_active); }
    if (sets.length === 0) return NextResponse.json({ ok: false, error: "No fields" }, { status: 400 });
    vals.push(id);
    await queryOne(`UPDATE users SET ${sets.join(", ")} WHERE id = $${i} RETURNING id`, vals);
    await logAudit({ userId: user.id, action: "user_updated", entityType: "user", entityId: id, outcome: "success", metadata: { role, is_active } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
