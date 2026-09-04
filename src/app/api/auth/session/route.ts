import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: true, data: null });
  }
  return NextResponse.json({
    ok: true,
    data: { id: user.id, email: user.email, role: user.role },
  });
}
