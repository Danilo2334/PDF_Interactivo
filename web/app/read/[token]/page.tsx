import type { Metadata } from "next";
import { ReaderExperience } from "@/components/readers/reader-experience";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Lectura | PDF Interactivo", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function ReaderPage({ params }: { params: Promise<{ token: string }> }) { return <ReaderExperience token={(await params).token} />; }
