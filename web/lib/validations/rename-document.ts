import { z } from "zod";

export const renameDocumentSchema = z.object({
  projectId: z.uuid("El documento no está disponible."),
  name: z.string().trim()
    .min(1, "El nombre no puede estar vacío.")
    .max(255, "El nombre no puede superar los 255 caracteres."),
});

export type RenameDocumentInput = z.input<typeof renameDocumentSchema>;
