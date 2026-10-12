import Link from "next/link";
import { redirect } from "next/navigation";
import { checkPermission } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AdminUser = {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  is_active: boolean;
};

type AdminPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
  }>;
};

const roleLabels: Record<string, string> = {
  owner: "Propietario",
  viewer: "Lector",
  admin: "Administrador",
};

export default async function AdminPage({
  searchParams,
}: AdminPageProps) {
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

  const params = await searchParams;
  const query =
    typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";

  const requestedPage =
    typeof params.page === "string" ? Number(params.page) : 1;

  const page =
    Number.isInteger(requestedPage) &&
    requestedPage >= 1 &&
    requestedPage <= 2147483647
      ? requestedPage
      : 1;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_users", {
    p_search: query,
    p_page: page,
  });

  if (error) {
    console.error("Error consultando usuarios:", error.code);
  }

  const rows = (data ?? []) as AdminUser[];
  const users = rows.slice(0, 20);
  const hasNextPage = rows.length > 20;

  function pageHref(targetPage: number) {
    const search = new URLSearchParams({
      q: query,
      page: String(targetPage),
    });

    return `/admin?${search.toString()}`;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6">
      <section className="mx-auto max-w-6xl rounded-xl bg-white p-5 sm:p-8">
        <Link href="/dashboard" className="font-semibold text-blue-700">
          Volver al panel
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-slate-900">
          Administración de usuarios
        </h1>

        <p className="mt-3 text-slate-600">
          Consulta los usuarios registrados, sus roles y el estado de sus cuentas.
        </p>

        <form action="/admin" method="get" className="mt-6">
          <label
            htmlFor="user-search"
            className="block text-sm font-semibold text-slate-800"
          >
            Buscar por nombre o correo
          </label>

          <div className="mt-2 flex flex-wrap gap-3">
            <input
              key={query}
              id="user-search"
              name="q"
              type="search"
              maxLength={100}
              defaultValue={query}
              placeholder="Escribe un nombre o correo"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 text-slate-900"
            />

            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
            >
              Buscar
            </button>

            <Link
              href="/admin"
              className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700"
            >
              Limpiar
            </Link>
          </div>
        </form>

        {error ? (
          <p
            role="alert"
            className="mt-6 rounded-lg bg-red-50 p-4 text-red-700"
          >
            No fue posible consultar los usuarios. Intenta nuevamente.
          </p>
        ) : users.length === 0 ? (
          <p role="status" className="mt-6 rounded-lg bg-slate-100 p-4">
            {query
              ? "No se encontraron usuarios con ese nombre o correo."
              : "No hay usuarios para mostrar en esta página."}
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">
                Usuarios registrados, roles y estados de cuenta
              </caption>

              <thead className="bg-slate-100 text-slate-800">
                <tr>
                  <th scope="col" className="px-4 py-3">Nombre</th>
                  <th scope="col" className="px-4 py-3">Correo</th>
                  <th scope="col" className="px-4 py-3">Rol</th>
                  <th scope="col" className="px-4 py-3">Estado</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="break-words px-4 py-4 text-slate-900">
                      {user.full_name || "Sin nombre"}
                    </td>
                    <td className="break-all px-4 py-4 text-slate-700">
                      {user.email}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {roleLabels[user.role] ?? user.role}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 font-medium ${
                          user.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {user.is_active ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!error && (
          <nav
            aria-label="Paginación de usuarios"
            className="mt-6 flex flex-wrap items-center gap-4"
          >
            {page > 1 && (
              <Link
                href={pageHref(page - 1)}
                className="font-semibold text-blue-700"
              >
                Anterior
              </Link>
            )}

            <p className="text-sm text-slate-600">
              Página {page} · {users.length} usuarios en esta página
            </p>

            {hasNextPage && (
              <Link
                href={pageHref(page + 1)}
                className="font-semibold text-blue-700"
              >
                Siguiente
              </Link>
            )}
          </nav>
        )}
      </section>
    </main>
  );
}
