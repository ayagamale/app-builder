import { NextResponse } from "next/server";
import { query } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/server";
import { logAudit } from "@/lib/audit/logger";

const TABLES: Record<string, string> = {
  providers: "ai_providers",
  models: "ai_models",
  api_keys: "api_credentials",
};

export async function POST(req: Request) {
  try {
    const user = await requireRole("admin");
    const { table, items } = await req.json() as { table: string; items: { id: string; priority: number }[] };

    const tableName = TABLES[table];
    if (!tableName) return NextResponse.json({ ok: false, error: "Invalid table" }, { status: 400 });
    if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ ok: false, error: "No items" }, { status: 400 });

    // Update priorities in order
    for (const item of items) {
      await query(`UPDATE ${tableName} SET priority = $1 WHERE id = $2`, [item.priority, item.id]);
    }

    await logAudit({ userId: user.id, action: `${table}_reordered`, entityType: table, outcome: "success", metadata: { count: items.length } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
