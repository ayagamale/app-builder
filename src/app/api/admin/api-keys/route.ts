import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/server";
import { logAudit } from "@/lib/audit/logger";
import { encrypt, keySuffix } from "@/lib/crypto/encryption";
import type { ApiCredentialRow } from "@/lib/ai/types";

export async function GET(req: Request) {
  try {
    await requireRole("admin");
    const url = new URL(req.url);
    const modelId = url.searchParams.get("model_id");
    const rows = await query<ApiCredentialRow>(
      modelId
        ? `SELECT id, model_id, label, key_suffix, status, priority, cooldown_until,
                  last_used_at, total_requests, successful_requests, failed_requests,
                  last_error, last_error_at, created_at, updated_at
           FROM api_credentials WHERE model_id = $1 ORDER BY priority ASC, created_at DESC`
        : `SELECT id, model_id, label, key_suffix, status, priority, cooldown_until,
                  last_used_at, total_requests, successful_requests, failed_requests,
                  last_error, last_error_at, created_at, updated_at
           FROM api_credentials ORDER BY priority ASC, created_at DESC`,
      modelId ? [modelId] : []
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
    const { model_id, label, api_key, priority } = body;
    if (!model_id || !api_key || !label) {
      return NextResponse.json({ ok: false, error: "Model ID, label, and API key are required" }, { status: 400 });
    }

    // Encrypt the key at rest
    const encrypted = encrypt(api_key);
    const suffix = keySuffix(api_key);

    const row = await queryOne<ApiCredentialRow>(
      `INSERT INTO api_credentials
         (model_id, label, encrypted_key, key_iv, key_auth_tag, key_suffix, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, model_id, label, key_suffix, status, priority, created_at, updated_at`,
      [model_id, label, encrypted.ciphertext, encrypted.iv, encrypted.authTag, suffix, priority || 100]
    );

    await logAudit({
      userId: user.id,
      action: "api_key_added",
      entityType: "api_credential",
      entityId: row?.id,
      modelId: model_id,
      outcome: "success",
      metadata: { label, keySuffix: suffix },
    });

    return NextResponse.json({ ok: true, data: row });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: "Failed to add API key" }, { status: 500 });
  }
}
