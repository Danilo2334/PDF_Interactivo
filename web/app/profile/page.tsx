import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { ProfileForm } from "@/components/profile/profile-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Mi perfil | PDF Interactivo",
  description: "Consulta y actualiza los datos básicos de tu cuenta.",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const metadataName = user.user_metadata?.full_name;
  const fullName = typeof metadataName === "string" ? metadataName : "";
  const email = user.email ?? "Correo no disponible";

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <Link className="text-xl font-bold text-blue-900" href="/dashboard">
            PDF Interactivo
          </Link>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-12">
        <Link
          className="text-sm font-semibold text-blue-700 hover:underline"
          href="/dashboard"
        >
          ← Volver al panel
        </Link>

        <div className="mt-6 rounded-3xl bg-white p-7 shadow-xl sm:p-10">
          <div className="mb-8">
            <p className="font-semibold text-blue-700">Cuenta del propietario</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Mi perfil
            </h1>
            <p className="mt-2 text-slate-600">
              Consulta tus datos y actualiza el nombre asociado con tu cuenta.
            </p>
          </div>

          <ProfileForm email={email} initialFullName={fullName} />
        </div>
      </section>
    </main>
  );
}
