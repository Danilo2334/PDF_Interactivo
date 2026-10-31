import "server-only";
import { createHmac } from "node:crypto";
export function signPublicationProof(input: Record<string, unknown>) {
  const secret = process.env.REINFORCEMENT_REQUEST_SECRET;
  if (!secret || !/^[a-f0-9]{64}$/.test(secret)) throw Error("Publication signing is not configured");
  const payload = JSON.stringify({ ...input, operation: "experience-publication", expiresAt: Math.floor(Date.now() / 1000) + 300 });
  return { p_payload: payload, p_signature: createHmac("sha256", secret).update(payload).digest("hex") };
}
export function publicationOrigin(): string | null {
  // No request Host/X-Forwarded-Host inference, localhost URLs or paid fallbacks.
  if (process.env.PUBLICATION_HTTPS_VERIFIED !== "true") return null;
  try {
    const raw = process.env.PUBLICATION_ORIGIN ?? "", url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash
      || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(url.hostname)
      || url.hostname.endsWith(".localhost") || url.hostname.endsWith(".local") || url.hostname.endsWith(".invalid")
      || url.hostname.endsWith(".test") || url.hostname.endsWith(".example") || ["example.com", "example.org", "example.net"].includes(url.hostname)) return null;
    return url.origin;
  } catch { return null; }
}
