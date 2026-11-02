import { withOperationDiagnostics } from "@/lib/diagnostics/operation";
import { getExplanation, postExplanation } from "@/lib/reinforcements/run-explanation";

export const runtime = "nodejs";
type Context = { params: Promise<{ projectId: string; requestId: string }> };
export async function GET(request: Request, { params }: Context) {
  const { projectId, requestId } = await params;
  return getExplanation(request, projectId, requestId);
}
async function handlePOST(request: Request, { params }: Context) {
  const { projectId, requestId } = await params;
  return postExplanation(request, projectId, requestId);
}

export const POST = withOperationDiagnostics("reinforcement.explanation", handlePOST);
