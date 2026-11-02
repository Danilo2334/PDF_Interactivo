import { withOperationDiagnostics } from "@/lib/diagnostics/operation";
import { getRegeneration, postRegeneration } from "@/lib/reinforcements/regeneration-service";
export const runtime="nodejs";
type Context={params:Promise<{projectId:string;requestId:string}>};
export async function GET(request:Request,context:Context){const {projectId,requestId}=await context.params;return getRegeneration(request,projectId,requestId)}
async function handlePOST(request:Request,context:Context){const {projectId,requestId}=await context.params;return postRegeneration(request,projectId,requestId)}

export const POST = withOperationDiagnostics("reinforcement.regeneration", handlePOST);
