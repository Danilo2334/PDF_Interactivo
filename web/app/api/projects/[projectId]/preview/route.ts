import { getExperiencePreview, postPreviewGrade } from "@/lib/previews/service";
export const runtime = "nodejs";
type Context = { params: Promise<{ projectId: string }> };
export async function GET(request: Request, { params }: Context) { return getExperiencePreview(request, (await params).projectId); }
export async function POST(request: Request, { params }: Context) { return postPreviewGrade(request, (await params).projectId); }
