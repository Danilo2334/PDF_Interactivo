"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changePasswordAction } from "@/app/actions/change-password";
import { changePasswordSchema, changePasswordErrors, type ChangePasswordErrors, type ChangePasswordInput } from "@/lib/validations/change-password";

export function ChangePasswordForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<ChangePasswordErrors>({});
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget, data = new FormData(form);
    const input: ChangePasswordInput = { currentPassword: String(data.get("currentPassword") ?? ""), password: String(data.get("password") ?? ""), confirmPassword: String(data.get("confirmPassword") ?? "") };
    const parsed = changePasswordSchema.safeParse(input);
    setMessage("");
    if (!parsed.success) { setErrors(changePasswordErrors(parsed.error)); return; }
    setErrors({});
    startTransition(async () => {
      try {
        const result = await changePasswordAction(input);
        form.reset();
        if (result.success) { router.replace("/login?password-reset=success"); router.refresh(); return; }
        setErrors(result.errors); setMessage(result.message);
      } catch { form.reset(); setMessage("No fue posible completar el cambio. Inténtalo más tarde."); }
    });
  }
  return <section className="mt-8 border-t border-slate-200 pt-8" aria-labelledby="change-password-title">
    <h2 id="change-password-title" className="text-xl font-bold text-slate-900">Cambiar contraseña</h2>
    <p className="mt-2 text-sm text-slate-600">Confirma tu contraseña actual y elige una nueva. Al guardar tendrás que iniciar sesión nuevamente.</p>
    <form aria-label="Cambiar contraseña" noValidate onSubmit={submit} className="mt-5 space-y-5">
      <fieldset disabled={pending} className="space-y-5">
        {([
          ["currentPassword", "Contraseña actual", "current-password"],
          ["password", "Nueva contraseña", "new-password"],
          ["confirmPassword", "Confirmar nueva contraseña", "new-password"],
        ] as const).map(([field, label, autoComplete]) => <div key={field}>
          <label htmlFor={`change-${field}`} className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
          <input id={`change-${field}`} name={field} type="password" autoComplete={autoComplete} maxLength={1024} required
            aria-invalid={Boolean(errors[field])} aria-describedby={`change-${field}-error${field === "password" ? " change-password-help" : ""}`}
            onChange={() => { setErrors(current => ({ ...current, [field]: undefined })); setMessage(""); }}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
          {field === "password" && <p id="change-password-help" className="mt-1 text-xs text-slate-500">Mínimo 8 caracteres, una mayúscula, una minúscula y un número. Usa una contraseña diferente a la actual.</p>}
          {errors[field] && <p id={`change-${field}-error`} role="alert" className="mt-1 text-sm text-red-700">{errors[field]}</p>}
        </div>)}
        <button type="submit" className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{pending ? "Cambiando contraseña…" : "Guardar nueva contraseña"}</button>
      </fieldset>
      {message && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{message}</p>}
    </form>
  </section>;
}
