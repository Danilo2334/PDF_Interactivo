import { postReview } from "@/lib/reinforcements/review-service";
export const runtime="nodejs";
export async function POST(request:Request,context:{params:Promise<{projectId:string;requestId:string}>}){const {projectId,requestId}=await context.params;return postReview(request,projectId,requestId)}
