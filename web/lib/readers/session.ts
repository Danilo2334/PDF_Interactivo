import "server-only";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
function secret() { const value = process.env.REINFORCEMENT_REQUEST_SECRET; if (!value || !/^[a-f0-9]{64}$/.test(value)) throw Error("Reader signing is not configured"); return value; }
const digest = (value: string) => createHmac("sha256", secret()).update("reader-session:" + value).digest("hex");
export function readerCookieName(token: string) { return "reader_" + digest(token).slice(0, 16); }
export function createReaderSession(token: string, identity: { name: string; email: string }, now = Date.now()) {
  // Identification is declared, never an authenticated identity or owner permission.
  // No raw name/email is retained in the cookie or server logs.
  const body = Buffer.from(JSON.stringify({ token: digest(token), identity: digest(JSON.stringify(identity)), reader: randomUUID(), expires: Math.floor(now / 1000) + 1800 })).toString("base64url");
  return body + "." + digest(body);
}
export function hasReaderSession(request: Request, token: string, now = Date.now()) {
  try {
    const cookie = request.headers.get("cookie")?.split(";").map(c => c.trim()).find(c => c.startsWith(readerCookieName(token) + "="))?.split("=").slice(1).join("=") ?? "";
    if (cookie.length > 1200) return false;
    const [body, signature] = cookie.split("."); if (!body || !signature || !/^[a-f0-9]{64}$/.test(signature)) return false;
    if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(digest(body), "hex"))) return false;
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString());
    return parsed.token === digest(token) && Number.isInteger(parsed.expires) && parsed.expires > now / 1000 && parsed.expires <= now / 1000 + 1801;
  } catch { return false; }
}
