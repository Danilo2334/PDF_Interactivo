import { getMedia, postMedia } from "@/lib/reinforcements/media-service";
export const runtime = "nodejs";
type Context = { params: Promise<{ projectId: string; requestId: string }> };
export async function GET(request: Request, { params }: Context) { const { projectId, requestId } = await params; return getMedia(request, projectId, requestId); }
export async function POST(request: Request, { params }: Context) { const { projectId, requestId } = await params; return postMedia(request, projectId, requestId); }
