import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/server";
import { logAudit } from "@/lib/audit/logger";
import { healthCheckCredential } from "@/lib/ai/request-manager";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("admin");
    const { id } = await params;
    const body = await req.json();
    const fields = ["label", "status", "priority"];
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
    await queryOne(
      `UPDATE api_credentials SET ${sets.join(", ")} WHERE id = $${i} RETURNING id`,
      vals
    );
    await logAudit({ userId: user.id, action: "api_key_updated", entityType: "api_credential", entityId: id, outcome: "success" });
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
    const user = await requireRole("admin");
    const { id } = await params;
    await query("DELETE FROM api_credentials WHERE id = $1", [id]);
    await logAudit({ userId: user.id, action: "api_key_deleted", entityType: "api_credential", entityId: id, outcome: "success" });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}

/** Health check — POST /api/admin/api-keys/[id]/health-check */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("admin");
    const { id } = await params;
    const result = await healthCheckCredential(id);
    await logAudit({
      userId: user.id,
      action: "health_check",
      entityType: "api_credential",
      entityId: id,
      outcome: result.success ? "success" : "failure",
      metadata: { responseTimeMs: result.responseTimeMs, error: result.error },
    });
    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: "Health check failed" }, { status: 500 });
  }
}
