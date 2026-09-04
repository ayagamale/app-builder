import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/server";
import { logAudit } from "@/lib/audit/logger";

export async function GET() {
  try {
    await requireRole("admin");
    const rows = await query(
      `SELECT r.*, m.name as model_name, p.name as provider_name
       FROM routing_rules r
       JOIN ai_models m ON r.model_id = m.id
       JOIN ai_providers p ON m.provider_id = p.id
       ORDER BY r.priority ASC`
    );
    return NextResponse.json({ ok: true, data: rows });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole("admin");
    const body = await req.json();
    const { name, model_id, priority, is_active } = body;
    if (!model_id) return NextResponse.json({ ok: false, error: "Model ID required" }, { status: 400 });
    const row = await queryOne<{ id: string }>(
      `INSERT INTO routing_rules (name, model_id, priority, is_active)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [name || "Rule", model_id, priority || 100, is_active !== false]
    );
    await logAudit({ userId: user.id, action: "routing_rule_created", entityType: "routing_rule", entityId: row?.id, outcome: "success" });
    return NextResponse.json({ ok: true, data: row });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
