import { getReinforcementUsage } from "@/lib/readers/reinforcement-open-service";
export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) { return getReinforcementUsage(request, (await params).projectId); }
