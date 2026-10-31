import { getSummary, postSummary } from "@/lib/reinforcements/run-summary";
export const runtime = "nodejs";
type Context = { params: Promise<{ projectId: string; requestId: string }> };
export async function GET(request: Request, { params }: Context) { const { projectId, requestId } = await params; return getSummary(request, projectId, requestId); }
export async function POST(request: Request, { params }: Context) { const { projectId, requestId } = await params; return postSummary(request, projectId, requestId); }
