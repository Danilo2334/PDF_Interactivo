import { getVisual, postVisual } from "@/lib/reinforcements/run-visual";
type Context = { params: Promise<{ projectId: string; requestId: string }> };
export async function GET(request: Request, context: Context) { const { projectId, requestId } = await context.params; return getVisual(request, projectId, requestId); }
export async function POST(request: Request, context: Context) { const { projectId, requestId } = await context.params; return postVisual(request, projectId, requestId); }
export const runtime = "nodejs";
