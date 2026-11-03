import { readerQuizAttempt } from "@/lib/readers/attempt-service";
type Context = { params: Promise<{ projectId: string; publicationId: string; quizId: string }> };
export async function GET(request: Request, { params }: Context) { const p = await params; return readerQuizAttempt(request, `private_${p.publicationId}`, p.quizId, false); }
export async function POST(request: Request, { params }: Context) { const p = await params; return readerQuizAttempt(request, `private_${p.publicationId}`, p.quizId, true); }
