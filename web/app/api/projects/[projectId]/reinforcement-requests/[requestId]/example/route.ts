import { withOperationDiagnostics } from "@/lib/diagnostics/operation";
import { getExample, postExample } from "@/lib/reinforcements/run-example";
export const runtime = "nodejs";
type Context = { params: Promise<{ projectId: string; requestId: string }> };
export async function GET(request: Request, { params }: Context) { const { projectId, requestId } = await params; return getExample(request, projectId, requestId); }
async function handlePOST(request: Request, { params }: Context) { const { projectId, requestId } = await params; return postExample(request, projectId, requestId); }

export const POST = withOperationDiagnostics("reinforcement.example", handlePOST);
