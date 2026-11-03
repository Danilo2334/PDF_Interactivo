import { getAnalytics } from "@/lib/analytics/service";
export async function GET(request: Request) { return getAnalytics(request); }
