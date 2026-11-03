import { getQuizResults } from "@/lib/readers/quiz-results-service";
export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) { return getQuizResults(request, (await params).projectId); }
