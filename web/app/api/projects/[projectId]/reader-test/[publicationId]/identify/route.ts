import { identifyReader } from "@/lib/readers/service";
export async function POST(request: Request, { params }: { params: Promise<{ projectId: string; publicationId: string }> }) { return identifyReader(request, `private_${(await params).publicationId}`); }
