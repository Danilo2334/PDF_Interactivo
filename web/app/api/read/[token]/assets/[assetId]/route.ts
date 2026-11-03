import { getReaderAsset } from "@/lib/readers/service";
export async function GET(request: Request, { params }: { params: Promise<{ token: string; assetId: string }> }) { const p = await params; return getReaderAsset(request, p.token, p.assetId); }
