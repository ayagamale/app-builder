import { query } from "@/lib/db/client";

export interface AuditEntry {
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  providerId?: string;
  modelId?: string;
  apiCredentialId?: string;
  reason?: string;
  outcome?: "success" | "failure" | "info";
  metadata?: Record<string, unknown>;
}

/** Write an audit log entry. Never logs secret values. */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_logs
         (user_id, action, entity_type, entity_id, provider_id, model_id,
          api_credential_id, reason, outcome, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        entry.userId || null,
        entry.action,
        entry.entityType || null,
        entry.entityId || null,
        entry.providerId || null,
        entry.modelId || null,
        entry.apiCredentialId || null,
        entry.reason || null,
        entry.outcome || "info",
        entry.metadata ? JSON.stringify(entry.metadata) : null,
      ]
    );
  } catch (err) {
    console.error("[audit] failed to write log:", err);
  }
}

/** Fetch audit logs with pagination. */
export async function getAuditLogs(
  opts: { limit?: number; offset?: number; action?: string } = {}
) {
  const limit = Math.min(opts.limit || 50, 200);
  const offset = opts.offset || 0;
  const params: unknown[] = [limit, offset];
  let where = "";
  if (opts.action) {
    where = "WHERE action = $3";
    params.push(opts.action);
  }
  const rows = await query(
    `SELECT a.*, u.email as user_email
     FROM audit_logs a
     LEFT JOIN users u ON a.user_id = u.id
     ${where}
     ORDER BY a.created_at DESC
     LIMIT $1 OFFSET $2`,
    params
  );
  return rows;
}
