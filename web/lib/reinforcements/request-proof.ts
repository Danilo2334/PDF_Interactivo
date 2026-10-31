import "server-only";
import { createHash, createHmac } from "node:crypto";
import { requestContentKey, type ReinforcementContent } from "@/lib/validations/reinforcement-request";

export function requestHash(projectId: string, content: ReinforcementContent) {
  return createHash("sha256").update(requestContentKey(projectId, content)).digest("hex");
}

// A scoped proof lets the database trust the PDF page count checked by Next.js,
// without giving the web application a key that bypasses all Supabase RLS.
export function signRequestProof(input: { userId: string; projectId: string; content: ReinforcementContent;
  idempotencyKey: string; pageCount: number; storagePath: string; sizeBytes: number }) {
  const secret = process.env.REINFORCEMENT_REQUEST_SECRET;
  if (!secret || !/^[a-f0-9]{64}$/.test(secret)) throw new Error("Request signing is not configured");
  const payload = JSON.stringify({ ...input, inputHash: requestHash(input.projectId, input.content),
    expiresAt: Math.floor(Date.now() / 1000) + 300 });
  return { p_payload: payload, p_signature: createHmac("sha256", secret).update(payload).digest("hex") };
}
