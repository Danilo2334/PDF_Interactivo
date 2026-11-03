import { getReader } from "@/lib/readers/service";
export async function GET(request: Request, { params }: { params: Promise<{ projectId: string; publicationId: string }> }) { return getReader(request, `private_${(await params).publicationId}`); }
