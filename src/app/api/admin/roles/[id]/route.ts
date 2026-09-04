import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/server";
import { logAudit } from "@/lib/audit/logger";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("super_admin");
    const { id } = await params;
    const body = await req.json();

    // Update description if provided
    if (body.description !== undefined) {
      await queryOne(`UPDATE roles SET description = $1 WHERE id = $2`, [body.description, id]);
    }

    // Update permissions if provided (array of permission IDs)
    if (Array.isArray(body.permissionIds)) {
      const role = await queryOne<{ is_system: boolean; name: string }>(
        `SELECT is_system, name FROM roles WHERE id = $1`, [id]
      );
      if (!role) return NextResponse.json({ ok: false, error: "Role not found" }, { status: 404 });

      // Super_admin system role always has all permissions — don't allow removing
      if (role.is_system && role.name === "super_admin") {
        return NextResponse.json({ ok: false, error: "Cannot modify super_admin permissions" }, { status: 403 });
      }

      await query(`DELETE FROM role_permissions WHERE role_id = $1`, [id]);
      for (const permId of body.permissionIds) {
        await query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [id, permId]
        );
      }
    }

    await logAudit({ userId: user.id, action: "role_updated", entityType: "role", entityId: id, outcome: "success" });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("super_admin");
    const { id } = await params;
    const role = await queryOne<{ is_system: boolean }>(`SELECT is_system FROM roles WHERE id = $1`, [id]);
    if (!role) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    if (role.is_system) return NextResponse.json({ ok: false, error: "Cannot delete system roles" }, { status: 403 });

    await query(`DELETE FROM roles WHERE id = $1`, [id]);
    await logAudit({ userId: user.id, action: "role_deleted", entityType: "role", entityId: id, outcome: "success" });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
