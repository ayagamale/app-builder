import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/server";
import { logAudit } from "@/lib/audit/logger";
import type { ModelRow } from "@/lib/ai/types";

export async function GET(req: Request) {
  try {
    await requireRole("admin");
    const url = new URL(req.url);
    const providerId = url.searchParams.get("provider_id");
    const rows = await query<ModelRow>(
      providerId
        ? "SELECT * FROM ai_models WHERE provider_id = $1 ORDER BY priority ASC, created_at DESC"
        : "SELECT * FROM ai_models ORDER BY priority ASC, created_at DESC",
      providerId ? [providerId] : []
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
    const { provider_id, name, display_name, max_tokens, temperature, priority } = body;
    if (!provider_id || !name) {
      return NextResponse.json({ ok: false, error: "Provider ID and model name are required" }, { status: 400 });
    }
    const row = await queryOne<ModelRow>(
      `INSERT INTO ai_models (provider_id, name, display_name, max_tokens, temperature, priority)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [provider_id, name, display_name || null, max_tokens || null, temperature || null, priority || 100]
    );
    await logAudit({ userId: user.id, action: "model_created", entityType: "model", entityId: row?.id, outcome: "success", metadata: { name, provider_id } });
    return NextResponse.json({ ok: true, data: row });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: "Failed to create model" }, { status: 500 });
  }
}
