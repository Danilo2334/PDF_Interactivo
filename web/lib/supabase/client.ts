import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Falta la configuración pública de almacenamiento.");
  // The server already refreshes the SSR session. Do not start a second
  // background refresh loop just to transfer a private file.
  return createBrowserClient(url, key, { auth: { autoRefreshToken: false } });
}
