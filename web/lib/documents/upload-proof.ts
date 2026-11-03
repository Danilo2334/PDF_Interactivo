import "server-only";
import { createHmac, createHash } from "node:crypto";

export function uploadFingerprint(file: { name: string; size: number }, bytes: ArrayBuffer) {
  const sha256 = createHash("sha256").update(Buffer.from(bytes)).digest("hex");
  return createHash("sha256").update(JSON.stringify([file.name, file.size, sha256])).digest("hex");
}

export function signUploadProof(input: { action: "prepare" | "commit"; userId: string; operationId: string;
  fingerprint: string; originalName: string; sizeBytes: number; pageCount: number }) {
  const secret = process.env.REINFORCEMENT_REQUEST_SECRET;
  if (!secret || !/^[a-f0-9]{64}$/.test(secret)) throw new Error("Upload signing is not configured");
  const payload = JSON.stringify({ purpose: "pdf-upload", ...input, expiresAt: Math.floor(Date.now() / 1000) + 300 });
  return { p_payload: payload, p_signature: createHmac("sha256", secret).update(payload).digest("hex") };
}
