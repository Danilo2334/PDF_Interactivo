import { identifyReader } from "@/lib/readers/service";
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) { return identifyReader(request, (await params).token); }
