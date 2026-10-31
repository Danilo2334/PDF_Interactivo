"use client";

import { type FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updatePasswordAction } from "@/app/actions/update-password";
import {
  getUpdatePasswordFieldErrors,
  updatePasswordSchema,
  type UpdatePasswordFieldErrors,
  type UpdatePasswordInput,
} from "@/lib/validations/update-password";

type Feedback = {
  type: "error";
  text: string;
} | null;

function inputClass(hasError: boolean) {
  return [
    "w-full rounded-xl border px-4 py-3 pr-24 outline-none transition",
    hasError
      ? "border-red-500 bg-red-50 focus:ring-4 focus:ring-red-100"
      : "border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100",
  ].join(" ");
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [showPasswords, setShowPasswords] = useState(false);
  const [errors, setErrors] = useState<UpdatePasswordFieldErrors>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();

  function clearFieldError(field: keyof UpdatePasswordInput) {
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
    const values: UpdatePasswordInput = {
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    };

    const clientResult = updatePasswordSchema.safeParse(values);

    if (!clientResult.success) {
      setErrors(getUpdatePasswordFieldErrors(clientResult.error));
      setFeedback({
        type: "error",
        text: "Revisa las contraseñas ingresadas.",
      });
      return;
    }

    setErrors({});

    startTransition(async () => {
      try {
        const serverResult = await updatePasswordAction(values);
        setErrors(serverResult.errors);

        if (serverResult.success) {
          router.replace("/login?password-reset=success");
          router.refresh();
          return;
        }

        setFeedback({
          type: "error",
          text: serverResult.message,
        });
      } catch {
        setFeedback({
          type: "error",
          text: "No fue posible actualizar la contraseña. Solicita un enlace nuevo.",
        });
      }
    });
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      <div>
        <label
          className="mb-2 block text-sm font-semibold text-slate-700"
          htmlFor="password"
        >
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            aria-describedby="password-help password-error"
            aria-invalid={Boolean(errors.password)}
            autoComplete="new-password"
            className={inputClass(Boolean(errors.password))}
            id="password"
            name="password"
            onChange={() => clearFieldError("password")}
            placeholder="Crea una contraseña segura"
            type={showPasswords ? "text" : "password"}
          />
          <button
            aria-pressed={showPasswords}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-blue-700 hover:text-blue-900"
            onClick={() => setShowPasswords((current) => !current)}
            type="button"
          >
            {showPasswords ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500" id="password-help">
          Usa mínimo 8 caracteres, una mayúscula, una minúscula y un número.
        </p>
        {errors.password && (
          <p
            className="mt-1 text-sm text-red-600"
            id="password-error"
            role="alert"
          >
            {errors.password}
          </p>
        )}
      </div>

      <div>
        <label
          className="mb-2 block text-sm font-semibold text-slate-700"
          htmlFor="confirmPassword"
        >
          Confirmar contraseña
        </label>
        <input
          aria-describedby="confirm-password-error"
          aria-invalid={Boolean(errors.confirmPassword)}
          autoComplete="new-password"
          className={inputClass(Boolean(errors.confirmPassword))}
          id="confirmPassword"
          name="confirmPassword"
          onChange={() => clearFieldError("confirmPassword")}
          placeholder="Repite la nueva contraseña"
          type={showPasswords ? "text" : "password"}
        />
        {errors.confirmPassword && (
          <p
            className="mt-1 text-sm text-red-600"
            id="confirm-password-error"
            role="alert"
          >
            {errors.confirmPassword}
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
        {isPending ? "Actualizando contraseña..." : "Guardar nueva contraseña"}
      </button>

      {feedback && (
        <p
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {feedback.text}
        </p>
      )}

      <p className="text-center text-sm text-slate-600">
        ¿Necesitas otro enlace?{" "}
        <Link
          className="font-semibold text-blue-700 hover:underline"
          href="/forgot-password"
        >
          Solicitar recuperación
        </Link>
      </p>
    </form>
  );
}
