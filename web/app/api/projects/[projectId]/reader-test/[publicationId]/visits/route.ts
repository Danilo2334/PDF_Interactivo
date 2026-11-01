import { postReaderOpen } from "@/lib/readers/visit-service";
export async function POST(request: Request, { params }: { params: Promise<{ projectId: string; publicationId: string }> }) { return postReaderOpen(request, "private_" + (await params).publicationId); }
