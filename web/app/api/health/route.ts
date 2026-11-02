export const dynamic = "force-dynamic";

// Public liveness only: no dependency queries, environment dump or credentials.
export async function GET() {
  const source = process.env.APP_BUILD_REVISION;
  return Response.json({ status: "alive", revision: source && /^[a-f0-9]{40}$/.test(source) ? source : null,
    checkedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
