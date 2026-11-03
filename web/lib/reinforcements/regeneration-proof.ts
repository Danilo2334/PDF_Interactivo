import "server-only";
import { createHmac } from "node:crypto";
export function signRegenerationProof(input:Record<string,unknown>) {
  const secret=process.env.REINFORCEMENT_REQUEST_SECRET;
  if(!secret||!/^[a-f0-9]{64}$/.test(secret))throw Error("Regeneration signing is not configured");
  const payload=JSON.stringify({...input,operation:"reinforcement-regeneration",expiresAt:Math.floor(Date.now()/1000)+90});
  return {p_payload:payload,p_signature:createHmac("sha256",secret).update(payload).digest("hex")};
}
