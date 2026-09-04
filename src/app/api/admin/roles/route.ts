import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/server";
import { logAudit } from "@/lib/audit/logger";

export async function GET() {
  try {
    await requireRole("admin");
    const roles = await query<{ id: string; name: string; description: string | null; is_system: boolean; created_at: string }>(
      `SELECT id, name, description, is_system, created_at FROM roles ORDER BY is_system DESC, name ASC`
    );
    const perms = await query<{ id: string; key: string; description: string | null; category: string }>(
      `SELECT id, key, description, category FROM permissions ORDER BY category, key`
    );
    const rolePerms = await query<{ role_id: string; permission_id: string }>(
      `SELECT role_id, permission_id FROM role_permissions`
    );

    // Map permissions to roles
    const permMap = new Map<string, string[]>();
    for (const rp of rolePerms) {
      if (!permMap.has(rp.role_id)) permMap.set(rp.role_id, []);
      permMap.get(rp.role_id)!.push(rp.permission_id);
    }

    return NextResponse.json({
      ok: true,
      data: {
        roles: roles.map(r => ({ ...r, permissionIds: permMap.get(r.id) || [] })),
        permissions: perms,
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole("super_admin");
    const { name, description } = await req.json();
    if (!name) return NextResponse.json({ ok: false, error: "Name required" }, { status: 400 });

    const row = await queryOne<{ id: string; name: string }>(
      `INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING id, name`,
      [name, description || null]
    );
    await logAudit({ userId: user.id, action: "role_created", entityType: "role", entityId: row?.id, outcome: "success", metadata: { name } });
    return NextResponse.json({ ok: true, data: row });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
