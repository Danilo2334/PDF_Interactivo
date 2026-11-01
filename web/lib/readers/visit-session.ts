import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
const name = "pdf_visit_session", seconds = 12 * 60 * 60;
function digest(value: string) {
  const key = process.env.REINFORCEMENT_REQUEST_SECRET;
  if (!key || !/^[a-f0-9]{64}$/.test(key)) throw Error("Visit signing unavailable");
  return createHmac("sha256", key).update(value).digest("hex");
}
export function visitSession(request: Request, operationId?: string, now = Date.now()) {
  const cookie = request.headers.get("cookie")?.split(";").map(c => c.trim()).find(c => c.startsWith(name + "="))?.slice(name.length + 1);
  try {
    if (!cookie || cookie.length > 500) throw Error("Missing session");
    const parts = cookie.split(".");
    const [body, signature] = parts;
    if (parts.length !== 2 || !body || !/^[a-f0-9]{64}$/.test(signature ?? "") || !timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(digest("visit-session:" + body), "hex"))) throw Error("Invalid session");
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!/^[a-f0-9]{64}$/.test(data.nonce) || !Number.isInteger(data.expires) || data.expires <= now / 1000 || data.expires > now / 1000 + seconds + 1) throw Error("Expired session");
    return { nonce: data.nonce as string, cookie: null };
  } catch {
    // A lost first response must not create a different session on retry.
    // The raw operation UUID is never retained as the session nonce.
    const nonce = operationId ? digest("visit-bootstrap:" + operationId) : randomBytes(32).toString("hex");
    const body = Buffer.from(JSON.stringify({ nonce, expires: Math.floor(now / 1000) + seconds })).toString("base64url");
    return { nonce, cookie: body + "." + digest("visit-session:" + body) };
  }
}
export function documentVisitor(documentId: string, nonce: string) { return digest("visit-document:" + documentId + ":" + nonce); }
export function attachVisitSession(response: Response, value: string) {
  response.headers.append("Set-Cookie", `${name}=${value}; Path=/api/read; Max-Age=${seconds}; HttpOnly; Secure; SameSite=Lax`);
}
export function signReaderOpen(input: Record<string, unknown>) {
  const payload = JSON.stringify({ ...input, operation: "reader-open", expiresAt: Math.floor(Date.now() / 1000) + 300 });
  return { p_payload: payload, p_signature: digest(payload) };
}
export function signReinforcementOpen(input: Record<string, unknown>) {
  const payload = JSON.stringify({ ...input, operation: "reinforcement-open", expiresAt: Math.floor(Date.now() / 1000) + 300 });
  return { p_payload: payload, p_signature: digest(payload) };
}
