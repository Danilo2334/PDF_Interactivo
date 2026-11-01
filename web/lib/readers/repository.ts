import "server-only";
import { checkPermission } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicationOrigin } from "@/lib/publications/proof";
import { readerSnapshotSchema, validateSnapshotSources, type ReaderSnapshot } from "@/lib/readers/model";
import { readerTokenSchema } from "@/lib/validations/reader";
export class ReaderUnavailable extends Error { constructor(public status = 404) { super(status === 503 ? "La lectura no está disponible temporalmente. Reintenta más tarde." : "Esta experiencia no está disponible para lectura."); } }
export type ReaderContext = { id: string; projectId: string; documentId: string; ownerId: string; version: number; hash: string; snapshot: ReaderSnapshot;
  privateTest: boolean; db: SupabaseClient; accessToken?: string; accessVersion?: number };
async function checkCurrent(context: ReaderContext) {
  const [project, profile, document, publication] = await Promise.all([
    context.db.from("projects").select("id,document_id,owner_id,status,name").eq("id", context.projectId).eq("owner_id", context.ownerId).maybeSingle(),
    context.db.from("profiles").select("is_active,role").eq("id", context.ownerId).maybeSingle(),
    context.db.from("documents").select("id,status,owner_id,storage_path,size_bytes").eq("id", context.documentId).eq("owner_id", context.ownerId).maybeSingle(),
    context.db.from("experience_publications").select("id,snapshot_hash,visibility,visibility_version,token").eq("id", context.id).eq("owner_id", context.ownerId).maybeSingle(),
  ]);
  if ([project, profile, document, publication].some(q => q.error)) throw new ReaderUnavailable(503);
  if (!project.data || project.data.document_id !== context.documentId || project.data.status === "deleting" || !profile.data?.is_active || !["owner", "admin"].includes(profile.data.role)
    || !document.data || !["uploaded", "ready"].includes(document.data.status) || document.data.storage_path !== context.snapshot.document.storagePath
    || document.data.size_bytes !== context.snapshot.document.sizeBytes || !publication.data || publication.data.snapshot_hash !== context.hash
    || !["public", "private"].includes(publication.data.visibility)
    || !context.privateTest && (publication.data.visibility !== "public" || publication.data.token !== context.accessToken || publication.data.visibility_version !== context.accessVersion)) throw new ReaderUnavailable();
}
export function serverReaderConfigured() {
  const key = process.env.SUPABASE_SERVER_KEY, url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // A publishable/anon key is never silently treated as a privileged server key.
  let privileged = key?.startsWith("sb_secret_");
  try { privileged ||= JSON.parse(Buffer.from(key?.split(".")[1] ?? "", "base64url").toString()).role === "service_role"; } catch { /* New secret keys need no JWT decoding. */ }
  return !!url && !!key && !!privileged;
}
function serverClient() {
  if (!serverReaderConfigured()) throw new ReaderUnavailable(503);
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVER_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function loadReader(request: Request, token: string): Promise<ReaderContext> {
  const ownerRoute = /^\/api\/projects\/([a-f0-9-]{36})\/reader-test\/([a-f0-9-]{36})(?:\/|$)/.exec(new URL(request.url).pathname);
  if (ownerRoute && token === "private_" + ownerRoute[2]) return loadOwnerReader(ownerRoute[1], ownerRoute[2]);
  if (!readerTokenSchema.safeParse(token).success) throw new ReaderUnavailable();
  const origin = publicationOrigin();
  if (!origin || new URL(request.url).origin !== origin) throw new ReaderUnavailable();
  const db = serverClient(), result = await db.from("experience_publications").select("id,owner_id,project_id,document_id,version,snapshot,snapshot_hash,published_at,origin,visibility,visibility_version")
    .eq("token", token).maybeSingle();
  if (result.error) throw new ReaderUnavailable(503);
  const row = result.data; if (!row?.published_at || row.origin !== origin) throw new ReaderUnavailable();
  if (row.visibility === "private") return loadOwnerReader(row.project_id, row.id);
  if (row.visibility !== "public") throw new ReaderUnavailable();
  const latest = await db.from("experience_publications").select("id").eq("project_id", row.project_id).not("published_at", "is", null).order("version", { ascending: false }).limit(1).maybeSingle();
  if (latest.error) throw new ReaderUnavailable(503); if (latest.data?.id !== row.id) throw new ReaderUnavailable();
  const snapshot = readerSnapshotSchema.parse(row.snapshot); validateSnapshotSources(snapshot, row.owner_id, row.document_id);
  const context: ReaderContext = { id: row.id, projectId: row.project_id, documentId: row.document_id, ownerId: row.owner_id, version: row.version, hash: row.snapshot_hash, snapshot, privateTest: false, db, accessToken: token, accessVersion: row.visibility_version };
  await checkCurrent(context); return context;
}
async function loadOwnerReader(projectId: string, publicationId: string) {
  const access = await checkPermission("documents.manage.own"); if (!access.ok) throw new ReaderUnavailable(access.status);
  const db = await createClient(), ownerId = access.userId;
  const result = await db.from("experience_publications").select("id,project_id,document_id,owner_id,version,snapshot,snapshot_hash,visibility")
    .eq("id", publicationId).eq("project_id", projectId).eq("owner_id", ownerId).maybeSingle();
  if (result.error) throw new ReaderUnavailable(503); const row = result.data; if (!row || !["public", "private"].includes(row.visibility)) throw new ReaderUnavailable();
  const snapshot = readerSnapshotSchema.parse(row.snapshot);
  validateSnapshotSources(snapshot, ownerId, row.document_id);
  const context: ReaderContext = { id: row.id, projectId, documentId: row.document_id, ownerId, version: row.version, hash: row.snapshot_hash, snapshot, privateTest: true, db };
  await checkCurrent(context);
  return context;
}
