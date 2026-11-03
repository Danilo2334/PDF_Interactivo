import { withOperationDiagnostics } from "@/lib/diagnostics/operation";
import { getVisual, postVisual } from "@/lib/reinforcements/run-visual";
type Context = { params: Promise<{ projectId: string; requestId: string }> };
export async function GET(request: Request, context: Context) { const { projectId, requestId } = await context.params; return getVisual(request, projectId, requestId); }
async function handlePOST(request: Request, context: Context) { const { projectId, requestId } = await context.params; return postVisual(request, projectId, requestId); }
export const runtime = "nodejs";

export const POST = withOperationDiagnostics("reinforcement.visual", handlePOST);
