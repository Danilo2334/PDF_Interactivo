import "server-only";
import { getGeminiConfiguration, generateGeminiJson, GeminiFailure } from "@/lib/reinforcements/gemini-provider";
import { generateOpenAiJson, OpenAiFailure, type JsonGenerationInput } from "@/lib/reinforcements/openai-provider";

export type AiConfiguration = { key: string; model: string; provider: "gemini" | "openai" };
export class AiFailure extends Error {
  constructor(public kind: "unavailable" | "refused" | "invalid" | "timeout", public quotaExhausted = false) { super(kind); }
}
export function getAiConfiguration(): AiConfiguration | null {
  // Existing Gemini installations retain their explicit Gemini model; switching
  // to OpenAI requires AI_PROVIDER=openai, never merely finding an OpenAI key.
  const provider = process.env.AI_PROVIDER?.trim() ?? "gemini";
  if (provider === "openai") {
    const key = process.env.OPENAI_API_KEY?.trim(), model = process.env.OPENAI_ANALYSIS_MODEL?.trim();
    return key && model && /^gpt-[a-zA-Z0-9._-]{1,90}$/.test(model) ? { key, model, provider } : null;
  }
  if (provider !== "gemini") return null;
  const config = getGeminiConfiguration();
  return config ? { ...config, provider } : null;
}
export async function generateJson(config: AiConfiguration, input: JsonGenerationInput, transport: typeof fetch = fetch) {
  if (config.provider !== "openai" && config.provider !== "gemini") throw new AiFailure("unavailable");
  try {
    return config.provider === "openai" ? await generateOpenAiJson(config, input, transport) : await generateGeminiJson(config, input, transport);
  } catch (error) {
    if (error instanceof OpenAiFailure || error instanceof GeminiFailure) throw new AiFailure(error.kind, error.quotaExhausted);
    throw new AiFailure("unavailable");
  }
}
