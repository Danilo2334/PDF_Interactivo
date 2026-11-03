import { readerFeedback } from "@/lib/readers/feedback-service";
type Context = { params: Promise<{ token: string; reinforcementId: string }> };
export async function GET(request: Request, { params }: Context) { const p = await params; return readerFeedback(request, p.token, p.reinforcementId, false); }
export async function POST(request: Request, { params }: Context) { const p = await params; return readerFeedback(request, p.token, p.reinforcementId, true); }
