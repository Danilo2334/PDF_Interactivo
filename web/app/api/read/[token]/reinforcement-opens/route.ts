import { postReinforcementOpen } from "@/lib/readers/reinforcement-open-service";
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) { return postReinforcementOpen(request, (await params).token); }
