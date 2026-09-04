import type { AiRequest, AiResponse, ResolvedCredential, AiError } from "./types";

/**
 * Base adapter interface — each provider compatibility type implements this.
 * The adapter takes a resolved credential (with decrypted key) and a request,
 * and returns either a response or a structured error.
 */
export interface ProviderAdapter {
  /** Send a chat completion request to the provider. */
  chat(
    credential: ResolvedCredential,
    request: AiRequest
  ): Promise<{ ok: true; data: AiResponse } | { ok: false; error: AiError }>;
}

/** Classify an HTTP error into a structured AiError with retryability. */
export function classifyHttpError(
  status: number,
  body: string
): AiError {
  if (status === 429) {
    return {
      code: "RATE_LIMITED",
      message: "Rate limit exceeded",
      httpStatus: status,
      retryable: true,
    };
  }
  if (status === 401 || status === 403) {
    return {
      code: "INVALID_KEY",
      message: "API key is invalid or unauthorized",
      httpStatus: status,
      retryable: false,
    };
  }
  if (status === 402) {
    return {
      code: "QUOTA_EXHAUSTED",
      message: "Quota exhausted or payment required",
      httpStatus: status,
      retryable: false,
    };
  }
  if (status >= 500) {
    return {
      code: "PROVIDER_ERROR",
      message: `Provider error (${status})`,
      httpStatus: status,
      retryable: true,
    };
  }
  return {
    code: "UNKNOWN_ERROR",
    message: body || `HTTP ${status}`,
    httpStatus: status,
    retryable: status >= 500,
  };
}

/** Extract an error message from a fetch response body. */
export async function readErrorBody(res: Response): Promise<string> {
  try {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      return json.error?.message || json.error || json.message || text;
    } catch {
      return text;
    }
  } catch {
    return `HTTP ${res.status}`;
  }
}
