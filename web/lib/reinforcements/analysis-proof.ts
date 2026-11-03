import "server-only";
import { createHmac } from "node:crypto";

// Domain-separated from the HU016 creation proof. Clients cannot certify a
// diagnosis, advance a request or impersonate the model by calling the RPC.
export function signAnalysisProof(input: Record<string, unknown>) {
  const secret = process.env.REINFORCEMENT_REQUEST_SECRET;
  if (!secret || !/^[a-f0-9]{64}$/.test(secret)) throw Error("Analysis signing is not configured");
  const payload = JSON.stringify({ ...input, operation: "contextual-analysis", expiresAt: Math.floor(Date.now() / 1000) + 90 });
  return { p_payload: payload, p_signature: createHmac("sha256", secret).update(payload).digest("hex") };
}
