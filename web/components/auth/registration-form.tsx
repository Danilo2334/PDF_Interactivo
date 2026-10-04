"use client";

import { FormEvent, useState } from "react";

type FieldErrors = {
  fullName?: string;
  email?: string;
  password?: string;
};

export function RegistrationForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    // Temporal: SCRUM-153 reemplazará esto por el registro real.
    await new Promise((resolve) => setTimeout(resolve, 700));

    setIsSubmitting(false);
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      <div>
        <label
          className="mb-2 block text-sm font-semibold text-slate-700"
          htmlFor="fullName"
        >
          Nombre completo
        </label>

        <input
          aria-describedby="fullName-help fullName-error"
          aria-invalid={Boolean(errors.fullName)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          id="fullName"
          name="fullName"
          placeholder="Ingresa tu nombre completo"
          type="text"
          autoComplete="name"
        />

        <p className="mt-1 text-xs text-slate-500" id="fullName-help">
          Escribe tu nombre y apellidos.
        </p>

        {errors.fullName && (
          <p className="mt-1 text-sm text-red-600" id="fullName-error" role="alert">
            {errors.fullName}
          </p>
        )}
      </div>

      <div>
        <label
          className="mb-2 block text-sm font-semibold text-slate-700"
          htmlFor="email"
        >
          Correo electrónico
        </label>

        <input
          aria-describedby="email-help email-error"
          aria-invalid={Boolean(errors.email)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          id="email"
          name="email"
          placeholder="ejemplo@correo.com"
          type="email"
          autoComplete="email"
        />

        <p className="mt-1 text-xs text-slate-500" id="email-help">
          Utilizaremos este correo para acceder a tu cuenta.
        </p>

        {errors.email && (
          <p className="mt-1 text-sm text-red-600" id="email-error" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <label
          className="mb-2 block text-sm font-semibold text-slate-700"
          htmlFor="password"
        >
          Contraseña
        </label>

        <div className="relative">
          <input
            aria-describedby="password-help password-error"
            aria-invalid={Boolean(errors.password)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-24 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            id="password"
            name="password"
            placeholder="Crea una contraseña segura"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
          />

          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-blue-700 hover:text-blue-900"
            type="button"
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </button>
        </div>

        <p className="mt-1 text-xs text-slate-500" id="password-help">
          Mínimo 8 caracteres, una mayúscula, una minúscula y un número.
        </p>

        {errors.password && (
          <p className="mt-1 text-sm text-red-600" id="password-error" role="alert">
            {errors.password}
          </p>
        )}
      </div>

      <button
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting && (
          <span
            aria-hidden="true"
            className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
          />
        )}

        {isSubmitting ? "Creando cuenta..." : "Registrarse"}
      </button>

      <p className="text-center text-sm text-slate-600">
        ¿Ya tienes una cuenta?{" "}
        <a className="font-semibold text-blue-700 hover:underline" href="/login">
          Inicia sesión
        </a>
      </p>
    </form>
  );
}