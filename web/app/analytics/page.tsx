import Link from "next/link";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { hasPermission } from "@/lib/auth/permissions";
import { analyticsDocuments } from "@/lib/analytics/service";
import { DocumentAnalyticsPanel } from "@/components/analytics/document-analytics-panel";
export default async function AnalyticsPage() {
  const access = await requireActiveUser();
  if (!hasPermission(access.role, "documents.manage.own")) return <main className="p-6"><p>No tienes permiso para consultar analítica del propietario.</p><Link href="/dashboard">Volver al panel</Link></main>;
  const to = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const date = new Date(to + "T00:00:00Z"); date.setUTCDate(date.getUTCDate() - 29); const from = date.toISOString().slice(0, 10);
  let documents;
  try { documents = await analyticsDocuments(); } catch { return <main className="space-y-4 p-6"><Link href="/dashboard">Volver al panel</Link><p role="alert">No fue posible cargar tus documentos para la analítica.</p><a href="/analytics" className="underline">Reintentar</a></main>; }
  return <main className="min-h-screen min-w-0 bg-slate-50 px-4 py-8 sm:px-6"><div className="mx-auto max-w-6xl space-y-6">
    <Link href="/dashboard" className="text-blue-700 underline">Volver al panel</Link>
    <header><h1 className="text-3xl font-bold">Analítica privada</h1><p className="mt-2 text-slate-600">Consulta el uso y los resultados de tus experiencias. La exportación contiene indicadores agregados, sin identificar lectores.</p></header>
    <DocumentAnalyticsPanel documents={documents} initialFrom={from} initialTo={to} />
  </div></main>;
}
