"use client";

import { type FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { requestPasswordRecoveryAction } from "@/app/actions/request-password-recovery";
import {
  getPasswordRecoveryFieldErrors,
  passwordRecoverySchema,
  type PasswordRecoveryFieldErrors,
  type PasswordRecoveryInput,
} from "@/lib/validations/password-recovery";

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

export function PasswordRecoveryForm() {
  const [errors, setErrors] = useState<PasswordRecoveryFieldErrors>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const formData = new FormData(event.currentTarget);
    const values: PasswordRecoveryInput = {
      email: String(formData.get("email") ?? ""),
    };

    const clientResult = passwordRecoverySchema.safeParse(values);

    if (!clientResult.success) {
      setErrors(getPasswordRecoveryFieldErrors(clientResult.error));
      setFeedback({
        type: "error",
        text: "Revisa el correo ingresado.",
      });
      return;
    }

    setErrors({});

    startTransition(async () => {
      try {
        const serverResult = await requestPasswordRecoveryAction(values);
        setErrors(serverResult.errors);
        setFeedback({
          type: serverResult.success ? "success" : "error",
          text: serverResult.message,
        });
      } catch {
        setFeedback({
          type: "error",
          text: "No fue posible procesar la solicitud. Inténtalo nuevamente.",
        });
      }
    });
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
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
          autoComplete="email"
          className={inputClass(Boolean(errors.email))}
          id="email"
          name="email"
          onChange={() => {
            setErrors({});
            setFeedback(null);
          }}
          placeholder="ejemplo@correo.com"
          type="email"
        />
        <p className="mt-1 text-xs text-slate-500" id="email-help">
          Ingresa el correo asociado con tu cuenta.
        </p>
        {errors.email && (
          <p className="mt-1 text-sm text-red-600" id="email-error" role="alert">
            {errors.email}
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
        {isPending ? "Procesando solicitud..." : "Recuperar contraseña"}
      </button>

      {feedback && (
        <p
          className={`rounded-xl px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
          role={feedback.type === "error" ? "alert" : "status"}
        >
          {feedback.text}
        </p>
      )}

      <p className="text-center text-sm text-slate-600">
        ¿Recordaste tu contraseña?{" "}
        <Link className="font-semibold text-blue-700 hover:underline" href="/login">
          Volver al inicio de sesión
        </Link>
      </p>
    </form>
  );
}
