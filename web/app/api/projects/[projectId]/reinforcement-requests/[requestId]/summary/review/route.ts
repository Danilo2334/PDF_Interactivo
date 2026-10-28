import { postSummaryReview } from "@/lib/reinforcements/summary-review-service";
export const runtime = "nodejs";
type Context = { params: Promise<{ projectId: string; requestId: string }> };
export async function POST(request: Request, { params }: Context) { const { projectId, requestId } = await params; return postSummaryReview(request, projectId, requestId); }
