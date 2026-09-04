import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/server";
import { logAudit } from "@/lib/audit/logger";
import type { ModelRow } from "@/lib/ai/types";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("admin");
    const { id } = await params;
    const body = await req.json();
    const fields = ["name", "display_name", "is_active", "priority", "max_tokens", "temperature"];
    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    for (const f of fields) {
      if (body[f] !== undefined) {
        sets.push(`${f} = $${i++}`);
        vals.push(body[f]);
      }
    }
    if (sets.length === 0) return NextResponse.json({ ok: false, error: "No fields" }, { status: 400 });
    vals.push(id);
    const row = await queryOne<ModelRow>(
      `UPDATE ai_models SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      vals
    );
    await logAudit({ userId: user.id, action: "model_updated", entityType: "model", entityId: id, outcome: "success" });
    return NextResponse.json({ ok: true, data: row });
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
    const user = await requireRole("admin");
    const { id } = await params;
    await query("DELETE FROM ai_models WHERE id = $1", [id]);
    await logAudit({ userId: user.id, action: "model_deleted", entityType: "model", entityId: id, outcome: "success" });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
