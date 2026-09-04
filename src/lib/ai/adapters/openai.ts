import type { AiRequest, AiResponse, ResolvedCredential, AiError } from "../types";
import { ProviderAdapter, classifyHttpError, readErrorBody } from "./base";

/**
 * OpenAI-compatible adapter — works with OpenAI, DeepSeek, Groq, OpenRouter,
 * Together AI, Mistral, Cerebras, xAI, and any provider that follows the
 * OpenAI chat completions API shape.
 */
export class OpenAIAdapter implements ProviderAdapter {
  async chat(
    cred: ResolvedCredential,
    request: AiRequest
  ): Promise<{ ok: true; data: AiResponse } | { ok: false; error: AiError }> {
    const url = `${cred.providerBaseUrl.replace(/\/$/, "")}/v1/chat/completions`;
    const start = Date.now();

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [cred.authHeaderName]: `${cred.authHeaderPrefix}${cred.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model || cred.modelName,
          messages: request.messages,
          max_tokens: request.maxTokens,
          temperature: request.temperature,
          stream: false,
        }),
        signal: AbortSignal.timeout(120_000),
      });

      if (!res.ok) {
        const body = await readErrorBody(res);
        return { ok: false, error: classifyHttpError(res.status, body) };
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content || "";
      const durationMs = Date.now() - start;

      return {
        ok: true,
        data: {
          content,
          model: json.model || cred.modelName,
          provider: cred.providerName,
          credentialId: cred.credentialId,
          usage: json.usage
            ? {
                promptTokens: json.usage.prompt_tokens,
                completionTokens: json.usage.completion_tokens,
                totalTokens: json.usage.total_tokens,
              }
            : undefined,
        },
      };
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === "TimeoutError";
      return {
        ok: false,
        error: {
          code: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
          message: err instanceof Error ? err.message : String(err),
          retryable: true,
        },
      };
    }
  }
}

/** Shared singleton — adapters are stateless. */
export const openaiAdapter = new OpenAIAdapter();
