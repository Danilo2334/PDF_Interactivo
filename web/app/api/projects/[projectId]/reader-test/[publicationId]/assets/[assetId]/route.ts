import { getReaderAsset } from "@/lib/readers/service";
export async function GET(request: Request, { params }: { params: Promise<{ projectId: string; publicationId: string; assetId: string }> }) { const p = await params; return getReaderAsset(request, `private_${p.publicationId}`, p.assetId); }
