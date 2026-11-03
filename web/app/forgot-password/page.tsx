import type { Metadata } from "next";
import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form";

export const metadata: Metadata = {
  title: "Recuperar contraseña | PDF Interactivo",
  description: "Solicita instrucciones para recuperar el acceso a tu cuenta.",
};

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const { error } = await searchParams;
  const invalidLink = error === "invalid-link";

  return (
    <main className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-2">
      <section className="hidden bg-gradient-to-br from-blue-950 via-blue-800 to-cyan-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <p className="text-xl font-bold">PDF Interactivo</p>
        <div className="max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200">
            Recupera el acceso
          </p>
          <h1 className="text-5xl font-bold leading-tight">
            Vuelve a gestionar tus documentos interactivos.
          </h1>
          <p className="mt-6 text-lg leading-8 text-blue-100">
            Solicita las instrucciones utilizando el correo asociado con tu cuenta.
          </p>
        </div>
        <p className="text-sm text-blue-200">
          Por seguridad, la plataforma no confirma si una cuenta existe.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl sm:p-10">
          <div className="mb-8">
            <p className="mb-2 font-semibold text-blue-700 lg:hidden">
              PDF Interactivo
            </p>
            <h2 className="text-3xl font-bold text-slate-900">
              Recuperar contraseña
            </h2>
            <p className="mt-2 text-slate-600">
              Te indicaremos cómo recuperar el acceso de forma segura.
            </p>
          </div>
          {invalidLink && (
            <p
              className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              El enlace es inválido o expiró. Solicita uno nuevo.
            </p>
          )}
          <PasswordRecoveryForm />
        </div>
      </section>
    </main>
  );
}
