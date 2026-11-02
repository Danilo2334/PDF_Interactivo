import { withOperationDiagnostics } from "@/lib/diagnostics/operation";
import { postSummaryReview } from "@/lib/reinforcements/summary-review-service";
export const runtime = "nodejs";
type Context = { params: Promise<{ projectId: string; requestId: string }> };
async function handlePOST(request: Request, { params }: Context) { const { projectId, requestId } = await params; return postSummaryReview(request, projectId, requestId); }

export const POST = withOperationDiagnostics("reinforcement.review", handlePOST);
