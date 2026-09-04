import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/server";
import { logAudit } from "@/lib/audit/logger";
import type { ProviderRow } from "@/lib/ai/types";

export async function GET() {
  try {
    await requireRole("admin");
    const rows = await query<ProviderRow>(
      `SELECT * FROM ai_providers ORDER BY priority ASC, created_at DESC`
    );
    return NextResponse.json({ ok: true, data: rows });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: "Failed to fetch providers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole("admin");
    const body = await req.json();
    const { name, base_url, auth_header_name, auth_header_prefix, compatibility_type, priority } = body;

    if (!name || !base_url) {
      return NextResponse.json({ ok: false, error: "Name and base URL are required" }, { status: 400 });
    }

    const row = await queryOne<ProviderRow>(
      `INSERT INTO ai_providers (name, base_url, auth_header_name, auth_header_prefix, compatibility_type, priority)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name,
        base_url,
        auth_header_name || "Authorization",
        auth_header_prefix || "Bearer ",
        compatibility_type || "openai",
        priority || 100,
      ]
    );

    await logAudit({
      userId: user.id,
      action: "provider_created",
      entityType: "provider",
      entityId: row?.id,
      outcome: "success",
      metadata: { name, base_url },
    });

    return NextResponse.json({ ok: true, data: row });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: "Failed to create provider" }, { status: 500 });
  }
}


