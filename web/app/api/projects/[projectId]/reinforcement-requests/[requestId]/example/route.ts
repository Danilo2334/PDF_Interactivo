import { getExample, postExample } from "@/lib/reinforcements/run-example";
export const runtime = "nodejs";
type Context = { params: Promise<{ projectId: string; requestId: string }> };
export async function GET(request: Request, { params }: Context) { const { projectId, requestId } = await params; return getExample(request, projectId, requestId); }
export async function POST(request: Request, { params }: Context) { const { projectId, requestId } = await params; return postExample(request, projectId, requestId); }
