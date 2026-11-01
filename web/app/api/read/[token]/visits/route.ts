import { postReaderOpen } from "@/lib/readers/visit-service";
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) { return postReaderOpen(request, (await params).token); }
