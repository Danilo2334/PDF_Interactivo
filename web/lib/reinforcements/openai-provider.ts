import "server-only";
import { z } from "zod";

export class OpenAiFailure extends Error {
  constructor(public kind: "unavailable" | "refused" | "invalid" | "timeout", public quotaExhausted = false) { super(kind); }
}
export type JsonGenerationInput = { instructions: string; data: object; schema: object; maxOutputTokens: number; maxTextLength: number; timeoutMs?: number };

// OpenAI strict schemas reject newline literals inside enums. Preserve the exact
// language with an anchored regex; domain validators still check literal quotes.
export function responsesSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(responsesSchema);
  if (!value || typeof value !== "object") return value;
  const result: Record<string, unknown> = Object.fromEntries(Object.entries(value).filter(([key]) => key !== "$schema").map(([key, entry]) => [key, responsesSchema(entry)]));
  if (Array.isArray(result.enum) && result.enum.some(entry => typeof entry === "string" && /[\r\n]/.test(entry))) {
    if (!result.enum.every(entry => typeof entry === "string")) throw new OpenAiFailure("invalid");
    const escaped = result.enum.map(entry => (entry as string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\n/g, "\\n").replace(/\r/g, "\\r"));
    result.pattern = `^(?:${escaped.join("|")})$`;
    delete result.enum;
  }
  return result;
}
const envelopeSchema = z.object({
  status: z.string(), output: z.array(z.object({ type: z.string(), content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional() })),
  usage: z.object({ input_tokens: z.number().int().nonnegative(), output_tokens: z.number().int().nonnegative(),
    input_tokens_details: z.object({ cached_tokens: z.number().int().nonnegative() }).optional() }).optional(),
});

// One bounded request. No tools, conversation reuse, retries, or provider fallback.
export async function generateOpenAiJson(config: { key: string; model: string }, input: JsonGenerationInput, transport: typeof fetch = fetch) {
  try {
    const response = await transport("https://api.openai.com/v1/responses", {
      method: "POST", headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(Math.min(45000, Math.max(1, input.timeoutMs ?? 45000))), cache: "no-store", redirect: "error",
      body: JSON.stringify({ model: config.model, instructions: input.instructions, input: JSON.stringify(input.data),
        reasoning: { effort: "low" }, max_output_tokens: input.maxOutputTokens, store: false, service_tier: "default",
        text: { format: { type: "json_schema", name: "reinforcement", strict: true, schema: responsesSchema(input.schema) } } }),
    });
    if (!response.ok) throw new OpenAiFailure("unavailable", response.status === 429);
    // Upstream content and errors can contain private document text. Never log them.
    const raw = await response.text();
    if (raw.length > 100000) throw new OpenAiFailure("invalid");
    let body: unknown; try { body = JSON.parse(raw); } catch { throw new OpenAiFailure("invalid"); }
    const parsed = envelopeSchema.safeParse(body);
    if (!parsed.success) throw new OpenAiFailure("invalid");
    const { status, output, usage } = parsed.data;
    if (usage && process.env.AI_USAGE_LOG === "1") console.info(JSON.stringify({ event: "reinforcement_ai_usage", provider: "openai", model: config.model,
      inputTokens: usage.input_tokens, outputTokens: usage.output_tokens, cachedInputTokens: usage.input_tokens_details?.cached_tokens ?? 0 }));
    if (output.some(item => item.content?.some(part => part.type === "refusal"))) throw new OpenAiFailure("refused");
    const messages = output.filter(item => item.type === "message");
    if (status !== "completed" || messages.length !== 1 || !messages[0].content?.length
      || messages[0].content.some(part => part.type !== "output_text" || typeof part.text !== "string")) throw new OpenAiFailure("invalid");
    const text = messages[0].content.map(part => part.text).join("");
    if (!text || text.length > input.maxTextLength) throw new OpenAiFailure("invalid");
    try { return JSON.parse(text) as unknown; } catch { throw new OpenAiFailure("invalid"); }
  } catch (error) {
    if (error instanceof OpenAiFailure) throw error;
    throw new OpenAiFailure(error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name) ? "timeout" : "unavailable");
  }
}
