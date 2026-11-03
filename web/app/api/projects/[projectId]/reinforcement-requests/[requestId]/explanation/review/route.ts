import { withOperationDiagnostics } from "@/lib/diagnostics/operation";
import { postReview } from "@/lib/reinforcements/review-service";
export const runtime="nodejs";
async function handlePOST(request:Request,context:{params:Promise<{projectId:string;requestId:string}>}){const {projectId,requestId}=await context.params;return postReview(request,projectId,requestId)}

export const POST = withOperationDiagnostics("reinforcement.review", handlePOST);
