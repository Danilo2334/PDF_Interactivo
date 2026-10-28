import { getExplanation, postExplanation } from "@/lib/reinforcements/run-explanation";

export const runtime = "nodejs";
type Context = { params: Promise<{ projectId: string; requestId: string }> };
export async function GET(request: Request, { params }: Context) {
  const { projectId, requestId } = await params;
  return getExplanation(request, projectId, requestId);
}
export async function POST(request: Request, { params }: Context) {
  const { projectId, requestId } = await params;
  return postExplanation(request, projectId, requestId);
}
