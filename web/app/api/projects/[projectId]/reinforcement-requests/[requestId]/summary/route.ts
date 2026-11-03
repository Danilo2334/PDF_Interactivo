import { withOperationDiagnostics } from "@/lib/diagnostics/operation";
import { getSummary, postSummary } from "@/lib/reinforcements/run-summary";
export const runtime = "nodejs";
type Context = { params: Promise<{ projectId: string; requestId: string }> };
export async function GET(request: Request, { params }: Context) { const { projectId, requestId } = await params; return getSummary(request, projectId, requestId); }
async function handlePOST(request: Request, { params }: Context) { const { projectId, requestId } = await params; return postSummary(request, projectId, requestId); }

export const POST = withOperationDiagnostics("reinforcement.summary", handlePOST);
