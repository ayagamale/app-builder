// Core types for the provider-agnostic AI layer.

export type CompatibilityType = "openai" | "anthropic" | "custom";

export type ApiKeyStatus =
  | "active"
  | "disabled"
  | "rate_limited"
  | "quota_exhausted"
  | "invalid"
  | "error"
  | "suspended"
  | "cooling_down"
  | "testing"
  | "unknown";

export interface ProviderRow {
  id: string;
  name: string;
  base_url: string;
  auth_header_name: string;
  auth_header_prefix: string;
  compatibility_type: CompatibilityType;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface ModelRow {
  id: string;
  provider_id: string;
  name: string;
  display_name: string | null;
  is_active: boolean;
  priority: number;
  max_tokens: number | null;
  temperature: number | null;
  created_at: string;
  updated_at: string;
}

export interface ApiCredentialRow {
  id: string;
  model_id: string;
  label: string;
  key_suffix: string;
  status: ApiKeyStatus;
  priority: number;
  cooldown_until: string | null;
  last_used_at: string | null;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  last_error: string | null;
  last_error_at: string | null;
  created_at: string;
  updated_at: string;
}

/** A resolved credential with its decrypted key — server-only, never sent to browser. */
export interface ResolvedCredential {
  credentialId: string;
  modelId: string;
  providerId: string;
  providerName: string;
  providerBaseUrl: string;
  authHeaderName: string;
  authHeaderPrefix: string;
  compatibilityType: CompatibilityType;
  modelName: string;
  apiKey: string; // decrypted — server only
  priority: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiRequest {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface AiResponse {
  content: string;
  model: string;
  provider: string;
  credentialId: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AiError {
  code: string;
  message: string;
  httpStatus?: number;
  retryable: boolean;
}

/** Result of a rotation attempt — either success or the reason for moving on. */
export interface RotationAttempt {
  credentialId: string;
  modelId: string;
  providerId: string;
  success: boolean;
  error?: AiError;
  response?: AiResponse;
  durationMs: number;
}

export interface HealthCheckResult {
  credentialId: string;
  success: boolean;
  responseTimeMs: number;
  error?: string;
  modelAvailable?: boolean;
}
