import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { executeAiRequest } from "@/lib/ai/request-manager";
import { logAudit } from "@/lib/audit/logger";
import type { ChatMessage } from "@/lib/ai/types";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { messages, model, maxTokens, temperature } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ ok: false, error: "Messages array is required" }, { status: 400 });
    }

    const result = await executeAiRequest(
      {
        messages: messages as ChatMessage[],
        model,
        maxTokens,
        temperature,
      },
      user.id
    );

    if (!result.ok) {
      const err = (result as { ok: false; error: { message: string; code: string }; switches: unknown[] }).error;
      return NextResponse.json(
        { ok: false, error: err.message, code: err.code, switches: result.switches },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        content: result.data.content,
        model: result.data.model,
        provider: result.data.provider,
        switches: result.switches,
        usage: result.data.usage,
      },
    });
  } catch (err) {
    console.error("[ai/chat] error:", err);
    return NextResponse.json({ ok: false, error: "AI request failed" }, { status: 500 });
  }
}
