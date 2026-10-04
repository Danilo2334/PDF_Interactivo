"use client";

import { type FormEvent, useState, useTransition } from "react";
import { validateRegistrationAction } from "@/app/actions/register";
import {
  getRegistrationFieldErrors,
  registrationSchema,
  type RegistrationFieldErrors,
  type RegistrationInput,
} from "@/lib/validations/register";

type Feedback = {
  type: "success" | "error";
  text: string;
} | null;

function inputClass(hasError: boolean) {
  return [
    "w-full rounded-xl border px-4 py-3 outline-none transition",
    hasError
      ? "border-red-500 bg-red-50 focus:ring-4 focus:ring-red-100"
      : "border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100",
  ].join(" ");
}

export function RegistrationForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<RegistrationFieldErrors>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();

  function clearFieldError(field: keyof RegistrationInput) {
    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));

    setFeedback(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const formData = new FormData(event.currentTarget);

    const values: RegistrationInput = {
      fullName: String(formData.get("fullName") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    const clientResult = registrationSchema.safeParse(values);

    if (!clientResult.success) {
      setErrors(getRegistrationFieldErrors(clientResult.error));
      setFeedback({
        type: "error",
        text: "Revisa los datos marcados.",
      });
      return;
    }

    setErrors({});

    startTransition(async () => {
      try {
        const serverResult = await validateRegistrationAction(values);

        setErrors(serverResult.errors);
        setFeedback({
          type: serverResult.success ? "success" : "error",
          text: serverResult.message,
        });
      } catch {
        setFeedback({
          type: "error",
          text: "No fue posible validar la información. Inténtalo nuevamente.",
        });
      }
    });
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
          className={inputClass(Boolean(errors.fullName))}
          id="fullName"
          name="fullName"
          placeholder="Ingresa tu nombre completo"
          type="text"
          autoComplete="name"
          onChange={() => clearFieldError("fullName")}
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
          className={inputClass(Boolean(errors.email))}
          id="email"
          name="email"
          placeholder="ejemplo@correo.com"
          type="email"
          autoComplete="email"
          onChange={() => clearFieldError("email")}
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
            className={`${inputClass(Boolean(errors.password))} pr-24`}
            id="password"
            name="password"
            placeholder="Crea una contraseña segura"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            onChange={() => clearFieldError("password")}
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
        disabled={isPending}
        type="submit"
      >
        {isPending && (
          <span
            aria-hidden="true"
            className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
          />
        )}

        {isPending ? "Validando..." : "Registrarse"}
      </button>

      {feedback && (
        <p
          className={`rounded-xl px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
          role="status"
        >
          {feedback.text}
        </p>
      )}

      <p className="text-center text-sm text-slate-600">
        ¿Ya tienes una cuenta?{" "}
        <a className="font-semibold text-blue-700 hover:underline" href="/login">
          Inicia sesión
        </a>
      </p>
    </form>
  );
}