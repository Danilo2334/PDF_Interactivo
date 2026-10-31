import { getMediaFile } from "@/lib/reinforcements/media-service";
export const runtime = "nodejs";
type Context = { params: Promise<{ projectId: string; requestId: string; assetId: string }> };
export async function GET(request: Request, { params }: Context) { const { projectId, requestId, assetId } = await params; return getMediaFile(request, projectId, requestId, assetId); }
