"use client";

import { type FormEvent, useState, useTransition } from "react";
import { updateProfileAction } from "@/app/actions/update-profile";
import {
  getProfileFieldErrors,
  profileSchema,
  type ProfileFieldErrors,
  type ProfileInput,
} from "@/lib/validations/profile";

type ProfileFormProps = {
  email: string;
  initialFullName: string;
};

type Feedback = {
  type: "success" | "error";
  text: string;
} | null;

function inputClass(hasError: boolean, isReadOnly = false) {
  return [
    "w-full rounded-xl border px-4 py-3 outline-none transition",
    hasError
      ? "border-red-500 bg-red-50 focus:ring-4 focus:ring-red-100"
      : isReadOnly
        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-600"
      : "border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100",
  ].join(" ");
}

export function ProfileForm({ email, initialFullName }: ProfileFormProps) {
  const [savedFullName, setSavedFullName] = useState(initialFullName);
  const [fullName, setFullName] = useState(initialFullName);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isEditing) {
      return;
    }

    setFeedback(null);

    const values: ProfileInput = { fullName };
    const clientResult = profileSchema.safeParse(values);

    if (!clientResult.success) {
      setErrors(getProfileFieldErrors(clientResult.error));
      setFeedback({
        type: "error",
        text: "Revisa los datos marcados.",
      });
      return;
    }

    setErrors({});

    startTransition(async () => {
      try {
        const serverResult = await updateProfileAction(values);
        setErrors(serverResult.errors);
        setFeedback({
          type: serverResult.success ? "success" : "error",
          text: serverResult.message,
        });

        if (serverResult.success) {
          setFullName(clientResult.data.fullName);
          setSavedFullName(clientResult.data.fullName);
          setIsEditing(false);
        }
      } catch {
        setFeedback({
          type: "error",
          text: "No fue posible actualizar el perfil. Inténtalo nuevamente.",
        });
      }
    });
  }

  function handleCancel() {
    setFullName(savedFullName);
    setErrors({});
    setFeedback(null);
    setIsEditing(false);
  }

  return (
    <form className="space-y-6" noValidate onSubmit={handleSubmit}>
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
          autoComplete="name"
          className={inputClass(Boolean(errors.fullName), !isEditing)}
          id="fullName"
          maxLength={100}
          name="fullName"
          onChange={(event) => {
            setFullName(event.target.value);
            setErrors({});
            setFeedback(null);
          }}
          placeholder="Ingresa tu nombre completo"
          readOnly={!isEditing}
          type="text"
          value={fullName}
        />
        <p className="mt-1 text-xs text-slate-500" id="fullName-help">
          Este nombre se mostrará dentro de tu cuenta.
        </p>
        {errors.fullName && (
          <p
            className="mt-1 text-sm text-red-600"
            id="fullName-error"
            role="alert"
          >
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
          aria-describedby="email-help"
          className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-600 outline-none"
          id="email"
          name="email"
          readOnly
          type="email"
          value={email}
        />
        <p className="mt-1 text-xs text-slate-500" id="email-help">
          El cambio de correo no está habilitado en esta versión.
        </p>
      </div>

      {isEditing ? (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={handleCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-400"
            disabled={isPending}
            type="submit"
          >
            {isPending && (
              <span
                aria-hidden="true"
                className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
              />
            )}
            {isPending ? "Guardando cambios..." : "Guardar cambios"}
          </button>
        </div>
      ) : (
        <button
          className="w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800"
          onClick={() => {
            setFeedback(null);
            setIsEditing(true);
          }}
          type="button"
        >
          Editar perfil
        </button>
      )}

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
    </form>
  );
}
