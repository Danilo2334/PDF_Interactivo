import { RegistrationForm } from "@/components/auth/registration-form";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-2">
      <section className="hidden bg-gradient-to-br from-blue-950 via-blue-800 to-cyan-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="text-xl font-bold">PDF Interactivo</p>
        </div>

        <div className="max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200">
            Aprende de una forma diferente
          </p>

          <h1 className="text-5xl font-bold leading-tight">
            Convierte tus PDF en experiencias interactivas.
          </h1>

          <p className="mt-6 text-lg leading-8 text-blue-100">
            Conserva el documento original y agrega explicaciones, recursos
            visuales, contenido interactivo y miniquices con ayuda de
            inteligencia artificial.
          </p>
        </div>

        <p className="text-sm text-blue-200">
          Tu PDF original permanece intacto.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl sm:p-10">
          <div className="mb-8">
            <p className="mb-2 font-semibold text-blue-700 lg:hidden">
              PDF Interactivo
            </p>

            <h2 className="text-3xl font-bold text-slate-900">
              Crear una cuenta
            </h2>

            <p className="mt-2 text-slate-600">
              Regístrate para cargar y gestionar tus documentos.
            </p>
          </div>

          <RegistrationForm />
        </div>
      </section>
    </main>
  );
}