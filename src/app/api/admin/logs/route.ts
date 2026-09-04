import { NextResponse } from "next/server";
import { getAuditLogs } from "@/lib/audit/logger";
import { requireRole } from "@/lib/auth/server";

export async function GET(req: Request) {
  try {
    await requireRole("admin");
    const url = new URL(req.url);
    const logs = await getAuditLogs({
      limit: parseInt(url.searchParams.get("limit") || "50"),
      offset: parseInt(url.searchParams.get("offset") || "0"),
      action: url.searchParams.get("action") || undefined,
      outcome: url.searchParams.get("outcome") || undefined,
      userId: url.searchParams.get("userId") || undefined,
      entityType: url.searchParams.get("entityType") || undefined,
      dateFrom: url.searchParams.get("dateFrom") || undefined,
      dateTo: url.searchParams.get("dateTo") || undefined,
    });
    return NextResponse.json({ ok: true, data: logs });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
