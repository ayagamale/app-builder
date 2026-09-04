import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/server";
import { logAudit } from "@/lib/audit/logger";

export async function GET() {
  try {
    await requireRole("admin");
    const rows = await query(
      `SELECT f.*, fm.name as from_model_name, tm.name as to_model_name
       FROM fallback_rules f
       JOIN ai_models fm ON f.from_model_id = fm.id
       JOIN ai_models tm ON f.to_model_id = tm.id
       ORDER BY f.priority ASC`
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
    const { name, from_model_id, to_model_id, priority, is_active } = body;
    if (!from_model_id || !to_model_id) return NextResponse.json({ ok: false, error: "From and to model IDs required" }, { status: 400 });
    const row = await queryOne(
      `INSERT INTO fallback_rules (name, from_model_id, to_model_id, priority, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name || "Fallback", from_model_id, to_model_id, priority || 100, is_active !== false]
    );
    await logAudit({ userId: user.id, action: "fallback_rule_created", entityType: "fallback_rule", entityId: row?.id, outcome: "success" });
    return NextResponse.json({ ok: true, data: row });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
