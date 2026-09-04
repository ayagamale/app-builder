import { NextResponse } from "next/server";
import { destroySession, getCurrentUser } from "@/lib/auth/server";
import { logAudit } from "@/lib/audit/logger";

export async function POST() {
  const user = await getCurrentUser();
  if (user) {
    await logAudit({ userId: user.id, action: "auth_logout", outcome: "success" });
  }
  await destroySession();
  return NextResponse.json({ ok: true });
}
