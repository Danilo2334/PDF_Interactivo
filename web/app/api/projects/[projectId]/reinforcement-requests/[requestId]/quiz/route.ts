import { withOperationDiagnostics } from "@/lib/diagnostics/operation";
import { getQuiz, postQuiz } from "@/lib/reinforcements/quiz-service";
export const runtime = "nodejs";
type Context = { params: Promise<{ projectId: string; requestId: string }> };
export async function GET(request: Request, { params }: Context) { const { projectId, requestId } = await params; return getQuiz(request, projectId, requestId); }
async function handlePOST(request: Request, { params }: Context) { const { projectId, requestId } = await params; return postQuiz(request, projectId, requestId); }

export const POST = withOperationDiagnostics("reinforcement.quiz", handlePOST);
