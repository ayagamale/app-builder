import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/server";

export async function GET() {
  try {
    await requireRole("admin");

    const [users, projects, providers, models, keys, activeKeys, errorKeys, disabledKeys, rateLimitedKeys, logs, recentLogs, recentFailures, recentFallbacks] = await Promise.all([
      queryOne<{ count: string }>("SELECT count(*)::text as count FROM users"),
      queryOne<{ count: string }>("SELECT count(*)::text as count FROM projects"),
      queryOne<{ count: string }>("SELECT count(*)::text as count FROM ai_providers"),
      queryOne<{ count: string }>("SELECT count(*)::text as count FROM ai_models"),
      queryOne<{ count: string }>("SELECT count(*)::text as count FROM api_credentials"),
      queryOne<{ count: string }>("SELECT count(*)::text as count FROM api_credentials WHERE status = 'active'"),
      queryOne<{ count: string }>("SELECT count(*)::text as count FROM api_credentials WHERE status NOT IN ('active', 'disabled')"),
      queryOne<{ count: string }>("SELECT count(*)::text as count FROM api_credentials WHERE status = 'disabled'"),
      queryOne<{ count: string }>("SELECT count(*)::text as count FROM api_credentials WHERE status = 'rate_limited'"),
      queryOne<{ count: string }>("SELECT count(*)::text as count FROM audit_logs"),
      query(
        `SELECT action, outcome, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10`
      ),
      query(
        `SELECT action, reason, created_at FROM audit_logs WHERE outcome = 'failure' AND action IN ('api_failed', 'ai_request_failed') ORDER BY created_at DESC LIMIT 5`
      ),
      query(
        `SELECT action, reason, created_at FROM audit_logs WHERE action IN ('model_switch', 'api_switch') ORDER BY created_at DESC LIMIT 5`
      ),
    ]);

    // Success/failure rates and request count from audit logs
    const successCount = await queryOne<{ count: string }>(
      "SELECT count(*)::text as count FROM audit_logs WHERE outcome = 'success' AND action = 'ai_request_success'"
    );
    const failureCount = await queryOne<{ count: string }>(
      "SELECT count(*)::text as count FROM audit_logs WHERE outcome = 'failure' AND action IN ('ai_request_failed', 'api_failed')"
    );
    const totalRequests = await queryOne<{ count: string }>(
      "SELECT (sum(total_requests))::text as count FROM api_credentials"
    );

    // Model consumption stats
    const modelStats = await query<{ model_name: string; provider_name: string; total: string; success: string; failed: string }>(
      `SELECT
         m.name as model_name, p.name as provider_name,
         count(c.id)::text as total,
         count(c.id) FILTER (WHERE c.status = 'active')::text as success,
         count(c.id) FILTER (WHERE c.status NOT IN ('active', 'disabled'))::text as failed
       FROM ai_models m
       JOIN ai_providers p ON m.provider_id = p.id
       LEFT JOIN api_credentials c ON c.model_id = m.id
       GROUP BY m.name, p.name, m.priority
       ORDER BY m.priority ASC`
    );

    return NextResponse.json({
      ok: true,
      data: {
        counts: {
          users: parseInt(users?.count || "0"),
          projects: parseInt(projects?.count || "0"),
          providers: parseInt(providers?.count || "0"),
          models: parseInt(models?.count || "0"),
          apiKeys: parseInt(keys?.count || "0"),
          activeApiKeys: parseInt(activeKeys?.count || "0"),
          errorApiKeys: parseInt(errorKeys?.count || "0"),
          disabledApiKeys: parseInt(disabledKeys?.count || "0"),
          rateLimitedApiKeys: parseInt(rateLimitedKeys?.count || "0"),
          totalLogs: parseInt(logs?.count || "0"),
          totalRequests: parseInt(totalRequests?.count || "0"),
        },
        rates: {
          success: parseInt(successCount?.count || "0"),
          failure: parseInt(failureCount?.count || "0"),
        },
        modelStats,
        recentLogs,
        recentFailures,
        recentFallbacks,
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
