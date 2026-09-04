import type { AiRequest, AiResponse, ResolvedCredential, AiError } from "../types";
import { ProviderAdapter, classifyHttpError, readErrorBody } from "./base";

/**
 * Anthropic adapter — uses the Messages API with x-api-key header
 * and anthropic-version header.
 */
export class AnthropicAdapter implements ProviderAdapter {
  async chat(
    cred: ResolvedCredential,
    request: AiRequest
  ): Promise<{ ok: true; data: AiResponse } | { ok: false; error: AiError }> {
    const url = `${cred.providerBaseUrl.replace(/\/$/, "")}/v1/messages`;
    const start = Date.now();

    // Convert OpenAI-style messages to Anthropic format
    const systemMsg = request.messages.find((m) => m.role === "system");
    const conversationMsgs = request.messages.filter((m) => m.role !== "system");

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": cred.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: request.model || cred.modelName,
          max_tokens: request.maxTokens || 4096,
          messages: conversationMsgs.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          ...(systemMsg ? { system: systemMsg.content } : {}),
          ...(request.temperature != null ? { temperature: request.temperature } : {}),
        }),
        signal: AbortSignal.timeout(120_000),
      });

      if (!res.ok) {
        const body = await readErrorBody(res);
        return { ok: false, error: classifyHttpError(res.status, body) };
      }

      const json = await res.json();
      const content = json.content?.map((c: { text: string }) => c.text).join("") || "";
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
                promptTokens: json.usage.input_tokens,
                completionTokens: json.usage.output_tokens,
                totalTokens: (json.usage.input_tokens || 0) + (json.usage.output_tokens || 0),
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

export const anthropicAdapter = new AnthropicAdapter();
