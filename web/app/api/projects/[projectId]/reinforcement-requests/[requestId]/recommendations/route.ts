import { getRecommendations, postRecommendations } from "@/lib/reinforcements/run-recommendations";

export const runtime = "nodejs";
export const maxDuration = 90;
type Context = { params: Promise<{ projectId: string; requestId: string }> };
export async function GET(request: Request, { params }: Context) {
  const { projectId, requestId } = await params;
  return getRecommendations(request, projectId, requestId);
}
export async function POST(request: Request, { params }: Context) {
  const { projectId, requestId } = await params;
  return postRecommendations(request, projectId, requestId);
}
