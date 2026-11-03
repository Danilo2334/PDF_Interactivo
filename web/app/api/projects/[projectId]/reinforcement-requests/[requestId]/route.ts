import { readRequests } from "@/lib/reinforcements/read-requests";

export async function GET(request: Request, { params }: { params: Promise<{ projectId: string; requestId: string }> }) {
  const { projectId, requestId } = await params;
  return readRequests(request, projectId, requestId);
}
