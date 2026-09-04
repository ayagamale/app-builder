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

/** Fetch audit logs with pagination and filtering. */
export async function getAuditLogs(
  opts: {
    limit?: number;
    offset?: number;
    action?: string;
    outcome?: string;
    userId?: string;
    entityType?: string;
    providerId?: string;
    modelId?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}
) {
  const limit = Math.min(opts.limit || 50, 200);
  const offset = opts.offset || 0;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (opts.action) {
    conditions.push(`a.action = $${paramIdx++}`);
    params.push(opts.action);
  }
  if (opts.outcome) {
    conditions.push(`a.outcome = $${paramIdx++}`);
    params.push(opts.outcome);
  }
  if (opts.userId) {
    conditions.push(`a.user_id = $${paramIdx++}`);
    params.push(opts.userId);
  }
  if (opts.entityType) {
    conditions.push(`a.entity_type = $${paramIdx++}`);
    params.push(opts.entityType);
  }
  if (opts.providerId) {
    conditions.push(`a.provider_id = $${paramIdx++}`);
    params.push(opts.providerId);
  }
  if (opts.modelId) {
    conditions.push(`a.model_id = $${paramIdx++}`);
    params.push(opts.modelId);
  }
  if (opts.dateFrom) {
    conditions.push(`a.created_at >= $${paramIdx++}`);
    params.push(opts.dateFrom);
  }
  if (opts.dateTo) {
    conditions.push(`a.created_at <= $${paramIdx++}`);
    params.push(opts.dateTo);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(limit, offset);

  const rows = await query(
    `SELECT a.*, u.email as user_email
     FROM audit_logs a
     LEFT JOIN users u ON a.user_id = u.id
     ${where}
     ORDER BY a.created_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    params
  );
  return rows;
}
