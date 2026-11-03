import { getReader } from "@/lib/readers/service";
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) { return getReader(request, (await params).token); }
