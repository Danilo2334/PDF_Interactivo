import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { PASSWORD_RECOVERY_COOKIE } from "@/lib/auth/password-recovery";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Nueva contraseña | PDF Interactivo",
  description: "Establece una nueva contraseña para recuperar tu cuenta.",
};

export default async function ResetPasswordPage() {
  const cookieStore = await cookies();

  if (cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value !== "verified") {
    redirect("/forgot-password?error=invalid-link");
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    redirect("/forgot-password?error=invalid-link");
  }

  return (
    <main className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-2">
      <section className="hidden bg-gradient-to-br from-blue-950 via-blue-800 to-cyan-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <p className="text-xl font-bold">PDF Interactivo</p>
        <div className="max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200">
            Protege tu cuenta
          </p>
          <h1 className="text-5xl font-bold leading-tight">
            Crea una nueva contraseña segura.
          </h1>
          <p className="mt-6 text-lg leading-8 text-blue-100">
            El acceso de recuperación es temporal y se cerrará al guardar el cambio.
          </p>
        </div>
        <p className="text-sm text-blue-200">
          No compartas el enlace de recuperación con otras personas.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl sm:p-10">
          <div className="mb-8">
            <p className="mb-2 font-semibold text-blue-700 lg:hidden">
              PDF Interactivo
            </p>
            <h2 className="text-3xl font-bold text-slate-900">
              Nueva contraseña
            </h2>
            <p className="mt-2 text-slate-600">
              Escribe y confirma la contraseña que utilizarás desde ahora.
            </p>
          </div>
          <ResetPasswordForm />
        </div>
      </section>
    </main>
  );
}
