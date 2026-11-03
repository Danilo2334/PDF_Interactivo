import { readerQuizAttempt } from "@/lib/readers/attempt-service";
type Context = { params: Promise<{ token: string; quizId: string }> };
export async function GET(request: Request, { params }: Context) { const p = await params; return readerQuizAttempt(request, p.token, p.quizId, false); }
export async function POST(request: Request, { params }: Context) { const p = await params; return readerQuizAttempt(request, p.token, p.quizId, true); }
