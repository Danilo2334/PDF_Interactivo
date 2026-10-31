import { getAnalysis, postAnalysis } from "@/lib/reinforcements/run-analysis";

export const runtime = "nodejs";
export const maxDuration = 90;
type Context = { params: Promise<{ projectId: string; requestId: string }> };
export async function GET(request: Request, { params }: Context) {
  const { projectId, requestId } = await params;
  return getAnalysis(request, projectId, requestId);
}
export async function POST(request: Request, { params }: Context) {
  const { projectId, requestId } = await params;
  return postAnalysis(request, projectId, requestId);
}
