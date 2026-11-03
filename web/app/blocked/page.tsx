import { LogoutButton } from "@/components/auth/logout-button";

export default function BlockedPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-12">
      <section className="mx-auto max-w-xl rounded-xl bg-white p-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Cuenta bloqueada
        </h1>

        <p role="alert" className="mt-4 text-slate-700">
          Tu cuenta no tiene acceso habilitado. Contacta al administrador
          para solicitar su reactivación.
        </p>

        <div className="mt-6">
          <LogoutButton />
        </div>
      </section>
    </main>
  );
}
