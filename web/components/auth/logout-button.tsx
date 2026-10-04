"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { logoutAction } from "@/app/actions/logout";
import { initialLogoutActionState } from "@/lib/auth/logout-state";

function LogoutSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {pending ? "Cerrando sesión..." : "Cerrar sesión"}
    </button>
  );
}

export function LogoutButton() {
  const [state, formAction] = useActionState(
    logoutAction,
    initialLogoutActionState,
  );

  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <LogoutSubmitButton />
      {state.message && (
        <p
          className={
            state.tone === "error" ? "text-xs text-red-600" : "text-xs text-blue-700"
          }
          role="status"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
