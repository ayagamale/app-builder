import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/server";

export async function GET() {
  try {
    await requireRole("admin");
    const rows = await query<{ key: string; value: string }>("SELECT key, value FROM system_settings ORDER BY key");
    const settings: Record<string, string> = {};
    for (const row of rows) settings[row.key] = row.value;
    return NextResponse.json({ ok: true, data: settings });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole("admin");
    const { key, value } = await req.json();
    if (!key) return NextResponse.json({ ok: false, error: "Key required" }, { status: 400 });
    await queryOne(
      `INSERT INTO system_settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`,
      [key, value]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
