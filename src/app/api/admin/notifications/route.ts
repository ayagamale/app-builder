import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { getNotifications, markAllRead } from "@/lib/notifications/manager";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: true, data: [] });
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get("unread") === "true";
    const rows = await getNotifications(user.id, { unreadOnly });
    return NextResponse.json({ ok: true, data: rows });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}

export async function PATCH() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    await markAllRead(user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
