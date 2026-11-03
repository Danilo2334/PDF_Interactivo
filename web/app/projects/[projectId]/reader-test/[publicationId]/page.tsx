import type { Metadata } from "next";
import { ReaderExperience } from "@/components/readers/reader-experience";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Prueba privada de lectura | PDF Interactivo", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function PrivateReaderTest({ params }: { params: Promise<{ projectId: string; publicationId: string }> }) {
  const p = await params; return <ReaderExperience token={`private_${p.publicationId}`} endpointOverride={`/api/projects/${p.projectId}/reader-test/${p.publicationId}`} />;
}
