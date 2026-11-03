import { withOperationDiagnostics } from "@/lib/diagnostics/operation";
import { postReview } from "@/lib/reinforcements/review-service";
export const runtime = "nodejs";
type Context = { params: Promise<{ projectId: string; requestId: string }> };
async function handlePOST(request: Request, { params }: Context) { const { projectId, requestId } = await params; return postReview(request, projectId, requestId); }

export const POST = withOperationDiagnostics("reinforcement.review", handlePOST);
