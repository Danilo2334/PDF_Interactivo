import "server-only";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
function secret() { const value = process.env.REINFORCEMENT_REQUEST_SECRET; if (!value || !/^[a-f0-9]{64}$/.test(value)) throw Error("Reader signing is not configured"); return value; }
const digest = (value: string) => createHmac("sha256", secret()).update("reader-session:" + value).digest("hex");
export function readerCookieName(token: string) { return "reader_" + digest(token).slice(0, 16); }
export type ReaderSession = { reader: string; identified: boolean; identity: string };
export function createReaderSession(token: string, identity: { name: string; email: string }, now = Date.now(), previous?: ReaderSession | null) {
  // Identification is declared, never an authenticated identity or owner permission.
  // No raw name/email is retained in the cookie or server logs.
  const body = Buffer.from(JSON.stringify({ token: digest(token), identity: digest(JSON.stringify(identity)), reader: previous?.reader ?? randomUUID(),
    identified: !!identity.name || !!identity.email, expires: Math.floor(now / 1000) + 1800 })).toString("base64url");
  return body + "." + digest(body);
}
export function getReaderSession(request: Request, token: string, now = Date.now()): ReaderSession | null {
  try {
    const cookie = request.headers.get("cookie")?.split(";").map(c => c.trim()).find(c => c.startsWith(readerCookieName(token) + "="))?.split("=").slice(1).join("=") ?? "";
    if (cookie.length > 1200) return null;
    const [body, signature] = cookie.split("."); if (!body || !signature || !/^[a-f0-9]{64}$/.test(signature)) return null;
    if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(digest(body), "hex"))) return null;
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString());
    if (parsed.token !== digest(token) || !Number.isInteger(parsed.expires) || parsed.expires <= now / 1000 || parsed.expires > now / 1000 + 1801
      || !/^[a-f0-9-]{36}$/.test(parsed.reader ?? "") || !/^[a-f0-9]{64}$/.test(parsed.identity ?? "")
      || parsed.identified !== undefined && typeof parsed.identified !== "boolean") return null;
    // Older cookies were issued only after the identification form was validated.
    return { reader: parsed.reader, identity: parsed.identity, identified: parsed.identified ?? true };
  } catch { return null; }
}
export function hasReaderSession(request: Request, token: string, now = Date.now()) { return getReaderSession(request, token, now)?.identified === true; }
export function attachReaderCookie(response: Response, request: Request, token: string, value: string) {
  const path = new URL(request.url).pathname.replace(/\/identify$/, "");
  response.headers.set("Set-Cookie", `${readerCookieName(token)}=${value}; Path=${path}; Max-Age=1800; HttpOnly; SameSite=Lax${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`);
}
