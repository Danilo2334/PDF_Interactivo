import { getVisitTotals } from "@/lib/readers/visit-service";
export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) { return getVisitTotals(request, (await params).projectId); }
