import { getPublication, postPublication } from "@/lib/publications/service";
export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) { return getPublication(request, (await params).projectId); }
export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) { return postPublication(request, (await params).projectId); }
