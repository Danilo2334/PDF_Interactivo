import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión | PDF Interactivo",
  description: "Accede de forma segura a tus proyectos de PDF interactivos.",
};

type LoginPageProps = {
  searchParams: Promise<{
    logout?: string | string[];
    "password-reset"?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { logout, "password-reset": passwordReset } = await searchParams;
  const sessionClosed = logout === "success";
  const passwordUpdated = passwordReset === "success";

  return (
    <main className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-2">
      <section className="hidden bg-gradient-to-br from-blue-950 via-blue-800 to-cyan-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <p className="text-xl font-bold">PDF Interactivo</p>
        <div className="max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200">
            Continúa creando
          </p>
          <h1 className="text-5xl font-bold leading-tight">
            Vuelve a tus documentos y refuerzos interactivos.
          </h1>
          <p className="mt-6 text-lg leading-8 text-blue-100">
            Accede de forma segura para gestionar tus PDF y acompañar a tus lectores.
          </p>
        </div>
        <p className="text-sm text-blue-200">
          Tu sesión se mantiene protegida mediante Supabase Auth.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl sm:p-10">
          <div className="mb-8">
            <p className="mb-2 font-semibold text-blue-700 lg:hidden">
              PDF Interactivo
            </p>
            <h2 className="text-3xl font-bold text-slate-900">
              Iniciar sesión
            </h2>
            <p className="mt-2 text-slate-600">
              Ingresa con el correo y la contraseña de tu cuenta.
            </p>
          </div>
          {sessionClosed && (
            <p
              className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              role="status"
            >
              Cerraste sesión correctamente.
            </p>
          )}
          {passwordUpdated && (
            <p
              className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              role="status"
            >
              Contraseña actualizada. Inicia sesión con tu nueva contraseña.
            </p>
          )}
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
