import { postReview } from "@/lib/reinforcements/review-service";
export const runtime = "nodejs";
type Context = { params: Promise<{ projectId: string; requestId: string }> };
export async function POST(request: Request, { params }: Context) { const { projectId, requestId } = await params; return postReview(request, projectId, requestId); }
