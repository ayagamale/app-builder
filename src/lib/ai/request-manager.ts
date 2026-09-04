import { query, queryOne } from "@/lib/db/client";
import { decrypt } from "@/lib/crypto/encryption";
import { logAudit } from "@/lib/audit/logger";
import { notify, notifyAdmins } from "@/lib/notifications/manager";
import type {
  AiRequest,
  AiResponse,
  AiError,
  ResolvedCredential,
  CompatibilityType,
  ApiKeyStatus,
} from "./types";
import { openaiAdapter } from "./adapters/openai";
import { anthropicAdapter } from "./adapters/anthropic";
import type { ProviderAdapter } from "./adapters/base";

/** Pick the right adapter for a provider's compatibility type. */
function getAdapter(type: CompatibilityType): ProviderAdapter {
  switch (type) {
    case "anthropic":
      return anthropicAdapter;
    case "openai":
    case "custom":
    default:
      return openaiAdapter;
  }
}

/** Map an AiError code to a database status + cooldown. */
function errorToStatus(
  error: AiError
): { status: ApiKeyStatus; cooldownSeconds: number } {
  switch (error.code) {
    case "RATE_LIMITED":
      return { status: "rate_limited", cooldownSeconds: 60 };
    case "INVALID_KEY":
      return { status: "invalid", cooldownSeconds: 0 };
    case "QUOTA_EXHAUSTED":
      return { status: "quota_exhausted", cooldownSeconds: 0 };
    case "TIMEOUT":
      return { status: "cooling_down", cooldownSeconds: 30 };
    case "PROVIDER_ERROR":
      return { status: "error", cooldownSeconds: 60 };
    default:
      return { status: "error", cooldownSeconds: 30 };
  }
}

interface CredentialWithKey {
  id: string;
  model_id: string;
  label: string;
  encrypted_key: string;
  key_iv: string;
  key_auth_tag: string;
  key_suffix: string;
  status: string;
  priority: number;
}

interface ModelWithProvider {
  model_id: string;
  model_name: string;
  model_display_name: string | null;
  model_priority: number;
  provider_id: string;
  provider_name: string;
  provider_base_url: string;
  provider_auth_header_name: string;
  provider_auth_header_prefix: string;
  provider_compatibility_type: CompatibilityType;
}

/**
 * Resolve the ordered list of (model → credentials) to try.
 * Models are ordered by priority; within each model, credentials are ordered
 * by priority and filtered to active + not-in-cooldown.
 */
async function resolvePool(): Promise<
  { model: ModelWithProvider; credentials: CredentialWithKey[] }[]
> {
  // Get all active models with their provider info, ordered by priority
  const models = await query<ModelWithProvider>(
    `SELECT
       m.id as model_id, m.name as model_name, m.display_name as model_display_name,
       m.priority as model_priority,
       p.id as provider_id, p.name as provider_name, p.base_url as provider_base_url,
       p.auth_header_name as provider_auth_header_name,
       p.auth_header_prefix as provider_auth_header_prefix,
       p.compatibility_type as provider_compatibility_type
     FROM ai_models m
     JOIN ai_providers p ON m.provider_id = p.id
     WHERE m.is_active = true AND p.is_active = true
     ORDER BY m.priority ASC, m.created_at ASC`
  );

  const pool: { model: ModelWithProvider; credentials: CredentialWithKey[] }[] = [];

  for (const model of models) {
    // Get active, non-cooling-down credentials for this model, ordered by priority
    const creds = await query<CredentialWithKey>(
      `SELECT id, model_id, label, encrypted_key, key_iv, key_auth_tag,
              key_suffix, status, priority
       FROM api_credentials
       WHERE model_id = $1
         AND status = 'active'
         AND (cooldown_until IS NULL OR cooldown_until < now())
       ORDER BY priority ASC, created_at ASC`,
      [model.model_id]
    );

    if (creds.length > 0) {
      pool.push({ model, credentials: creds });
    }
  }

  return pool;
}

/** Update a credential's status after a failure. */
async function updateCredentialStatus(
  credentialId: string,
  error: AiError
): Promise<void> {
  const { status, cooldownSeconds } = errorToStatus(error);
  const cooldownUntil =
    cooldownSeconds > 0
      ? new Date(Date.now() + cooldownSeconds * 1000).toISOString()
      : null;

  await query(
    `UPDATE api_credentials
     SET status = $1,
         cooldown_until = $2,
         failed_requests = failed_requests + 1,
         last_error = $3,
         last_error_at = now(),
         last_used_at = now()
     WHERE id = $4`,
    [status, cooldownUntil, error.message, credentialId]
  );
}

/** Mark a credential as successfully used. */
async function markCredentialSuccess(credentialId: string): Promise<void> {
  await query(
    `UPDATE api_credentials
     SET last_used_at = now(),
         total_requests = total_requests + 1,
         successful_requests = successful_requests + 1,
         last_error = NULL,
         last_error_at = NULL
     WHERE id = $1`,
    [credentialId]
  );
}

export type RequestResult = {
  ok: true;
  data: AiResponse;
  switches: { fromCredential?: string; toCredential: string; reason: string }[];
} | {
  ok: false;
  error: AiError;
  switches: { fromCredential?: string; toCredential: string; reason: string }[];
};

/**
 * The AI Request Manager — the single entry point for all AI requests.
 * Handles two-level fallback: rotate API keys within a model, then
 * escalate to the next model/provider.
 */
export async function executeAiRequest(
  request: AiRequest,
  userId?: string
): Promise<RequestResult> {
  const pool = await resolvePool();

  if (pool.length === 0) {
    await logAudit({
      userId,
      action: "ai_request_failed",
      reason: "No active API credentials available",
      outcome: "failure",
    });
    await notifyAdmins(
      "ai_request_failed",
      "error",
      "No active API credentials available for AI requests"
    );
    return {
      ok: false,
      error: {
        code: "NO_CREDENTIALS",
        message: "No active API credentials are configured. Add one in the admin panel.",
        retryable: false,
      },
      switches: [],
    };
  }

  const switches: { fromCredential?: string; toCredential: string; reason: string }[] = [];
  let lastError: AiError | null = null;

  for (const { model, credentials } of pool) {
    for (const cred of credentials) {
      // Decrypt the API key
      let apiKey: string;
      try {
        apiKey = decrypt({
          ciphertext: cred.encrypted_key,
          iv: cred.key_iv,
          authTag: cred.key_auth_tag,
        });
      } catch {
        await query(
          `UPDATE api_credentials SET status = 'invalid', last_error = 'Decryption failed' WHERE id = $1`,
          [cred.id]
        );
        continue;
      }

      const resolved: ResolvedCredential = {
        credentialId: cred.id,
        modelId: model.model_id,
        providerId: model.provider_id,
        providerName: model.provider_name,
        providerBaseUrl: model.provider_base_url,
        authHeaderName: model.provider_auth_header_name,
        authHeaderPrefix: model.provider_auth_header_prefix,
        compatibilityType: model.provider_compatibility_type,
        modelName: model.model_name,
        apiKey,
        priority: cred.priority,
      };

      const adapter = getAdapter(resolved.compatibilityType);
      const result = await adapter.chat(resolved, request);

      if (!result.ok) {
        // Failure — update credential status and continue
        const err = (result as { ok: false; error: AiError }).error;
        lastError = err;
        await updateCredentialStatus(cred.id, err);
        await logAudit({
          userId,
          action: "api_failed",
          providerId: model.provider_id,
          modelId: model.model_id,
          apiCredentialId: cred.id,
          reason: err.message,
          outcome: "failure",
          metadata: { code: err.code, httpStatus: err.httpStatus },
        });

        // Record the switch
        switches.push({
          fromCredential: switches.length > 0 ? undefined : cred.id,
          toCredential: cred.id,
          reason: err.message,
        });

        // If the error is non-retryable (invalid key, quota), skip remaining
        // keys for this model only if they're all likely the same issue
        if (!err.retryable && err.code === "INVALID_KEY") {
          break; // try the next model
        }
        continue;
      }

      // Success
      await markCredentialSuccess(cred.id);
      await logAudit({
        userId,
        action: "ai_request_success",
        providerId: model.provider_id,
        modelId: model.model_id,
        apiCredentialId: cred.id,
        outcome: "success",
        metadata: { model: model.model_name, provider: model.provider_name },
      });

      // Notify about any switches that happened
      if (switches.length > 0 && userId) {
        await notify({
          userId,
          type: "api_switch",
          level: "info",
          message: `Request completed after ${switches.length} API switch(es). Final: ${model.provider_name} / ${model.model_name}`,
        });
      }

      return { ok: true, data: result.data, switches };
    }

    // All credentials for this model exhausted — log the model switch
    await logAudit({
      userId,
      action: "model_switch",
      modelId: model.model_id,
      reason: "All API credentials for this model exhausted",
      outcome: "info",
    });
  }

  // All models and credentials exhausted
  await logAudit({
    userId,
    action: "ai_request_failed",
    reason: "All API credentials across all models exhausted",
    outcome: "failure",
  });
  await notifyAdmins(
    "all_apis_exhausted",
    "error",
    "All API credentials across all models are exhausted. Please add or restore API keys."
  );

  return {
    ok: false,
    error: lastError || {
      code: "ALL_EXHAUSTED",
      message: "All API keys across all models and providers have been exhausted.",
      retryable: false,
    },
    switches,
  };
}

/** Run a health check on a single API credential. */
export async function healthCheckCredential(
  credentialId: string
): Promise<{ success: boolean; responseTimeMs: number; error?: string }> {
  const cred = await queryOne<{
    id: string;
    encrypted_key: string;
    key_iv: string;
    key_auth_tag: string;
    model_id: string;
  }>(
    `SELECT id, encrypted_key, key_iv, key_auth_tag, model_id
     FROM api_credentials WHERE id = $1`,
    [credentialId]
  );
  if (!cred) return { success: false, responseTimeMs: 0, error: "Credential not found" };

  const model = await queryOne<ModelWithProvider>(
    `SELECT
       m.id as model_id, m.name as model_name, m.display_name as model_display_name,
       m.priority as model_priority,
       p.id as provider_id, p.name as provider_name, p.base_url as provider_base_url,
       p.auth_header_name as provider_auth_header_name,
       p.auth_header_prefix as provider_auth_header_prefix,
       p.compatibility_type as provider_compatibility_type
     FROM ai_models m
     JOIN ai_providers p ON m.provider_id = p.id
     WHERE m.id = $1`,
    [cred.model_id]
  );
  if (!model) return { success: false, responseTimeMs: 0, error: "Model not found" };

  let apiKey: string;
  try {
    apiKey = decrypt({
      ciphertext: cred.encrypted_key,
      iv: cred.key_iv,
      authTag: cred.key_auth_tag,
    });
  } catch {
    return { success: false, responseTimeMs: 0, error: "Decryption failed" };
  }

  const resolved: ResolvedCredential = {
    credentialId: cred.id,
    modelId: model.model_id,
    providerId: model.provider_id,
    providerName: model.provider_name,
    providerBaseUrl: model.provider_base_url,
    authHeaderName: model.provider_auth_header_name,
    authHeaderPrefix: model.provider_auth_header_prefix,
    compatibilityType: model.provider_compatibility_type,
    modelName: model.model_name,
    apiKey,
    priority: 0,
  };

  // Send a minimal test request
  const start = Date.now();
  const adapter = getAdapter(resolved.compatibilityType);
  const result = await adapter.chat(resolved, {
    messages: [{ role: "user", content: "Hi" }],
    maxTokens: 5,
  });
  const responseTimeMs = Date.now() - start;

  if (!result.ok) {
    // Update status based on the error
    const err = (result as { ok: false; error: AiError }).error;
    await updateCredentialStatus(credentialId, err);
    return {
      success: false,
      responseTimeMs,
      error: err.message,
    };
  }

  // Success — promote back to active if it was in a bad state
  await query(
    `UPDATE api_credentials
     SET status = 'active', cooldown_until = NULL, last_error = NULL, last_error_at = NULL
     WHERE id = $1 AND status NOT IN ('active', 'disabled')`,
    [credentialId]
  );
  return { success: true, responseTimeMs };
}
