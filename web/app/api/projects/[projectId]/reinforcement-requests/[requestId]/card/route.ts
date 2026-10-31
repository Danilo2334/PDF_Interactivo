import { postCard } from "@/lib/reinforcements/card-service";
export const runtime = "nodejs";
type Context = { params: Promise<{ projectId: string; requestId: string }> };
export async function POST(request: Request, { params }: Context) {
  const { projectId, requestId } = await params; return postCard(request, projectId, requestId);
}
