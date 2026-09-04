import { NextResponse } from "next/server";
import { getAuditLogs } from "@/lib/audit/logger";
import { requireRole } from "@/lib/auth/server";

export async function GET(req: Request) {
  try {
    await requireRole("admin");
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const action = url.searchParams.get("action") || undefined;
    const logs = await getAuditLogs({ limit, offset, action });
    return NextResponse.json({ ok: true, data: logs });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
