export type LogoutActionState = {
  message: string | null;
  tone: "info" | "error" | null;
};

export const initialLogoutActionState: LogoutActionState = {
  message: null,
  tone: null,
};
