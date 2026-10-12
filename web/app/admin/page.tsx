import Link from "next/link";
import { redirect } from "next/navigation";
import { checkPermission } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const access = await checkPermission("users.read");

  if (!access.ok) {
    if (access.status === 401) {
      redirect("/login");
    }

    return (
      <main className="min-h-screen bg-slate-100 px-6 py-12">
        <section className="mx-auto max-w-3xl rounded-xl bg-white p-8">
          <h1 className="text-2xl font-bold text-slate-900">
            {access.status === 503
              ? "No fue posible comprobar el acceso"
              : "Acceso restringido"}
          </h1>

          <p role="alert" className="mt-4 text-slate-700">
            {access.message}
          </p>

          <Link
            href="/dashboard"
            className="mt-6 inline-block font-semibold text-blue-700"
          >
            Volver al panel
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-12">
      <section className="mx-auto max-w-5xl rounded-xl bg-white p-8">
        <Link href="/dashboard" className="font-semibold text-blue-700">
          Volver al panel
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-slate-900">
          Administración
        </h1>

        <p className="mt-3 text-slate-600">
          Gestión de usuarios, roles y acceso a la plataforma.
        </p>
      </section>
    </main>
  );
}
