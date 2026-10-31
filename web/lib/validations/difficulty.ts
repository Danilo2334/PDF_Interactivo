import type { DocumentFragmentSelection } from "@/lib/pdf/fragment-selection";

// HU014 does not prescribe a taxonomy or numeric limit. Keep both in one place.
export const DIFFICULTY_CATEGORIES = [
  { value: "concept", label: "Concepto poco claro" },
  { value: "vocabulary", label: "Vocabulario técnico" },
  { value: "procedure", label: "Procedimiento o cálculo" },
  { value: "connection", label: "Relación entre ideas" },
  { value: "other", label: "Otra dificultad" },
] as const;
export const DIFFICULTY_MIN_LENGTH = 20;
export const DIFFICULTY_MAX_LENGTH = 2000;
export type DifficultyCategory = typeof DIFFICULTY_CATEGORIES[number]["value"];
export type DifficultyInput = { category: string; observation: string };
export const EMPTY_DIFFICULTY_INPUT: DifficultyInput = { category: "", observation: "" };
export type DifficultyContext = { documentId: string; pageNumber: number; fragment: DocumentFragmentSelection | null };
export type DifficultyDraft = DifficultyContext & { category: DifficultyCategory; observation: string };
export type DifficultyErrors = { category?: string; observation?: string };

export function validateDifficulty(input: { category: unknown; observation: unknown }):
  | { success: true; value: { category: DifficultyCategory; observation: string } }
  | { success: false; errors: DifficultyErrors } {
  const errors: DifficultyErrors = {};
  if (!DIFFICULTY_CATEGORIES.some(item => item.value === input.category)) errors.category = "Selecciona una categoría de dificultad.";
  const observation = typeof input.observation === "string" ? input.observation.trim() : "";
  if (observation.length < DIFFICULTY_MIN_LENGTH) errors.observation = `Explica la dificultad con al menos ${DIFFICULTY_MIN_LENGTH} caracteres, sin contar los espacios de los extremos.`;
  else if (observation.length > DIFFICULTY_MAX_LENGTH) errors.observation = `La explicación debe tener como máximo ${DIFFICULTY_MAX_LENGTH} caracteres.`;
  return Object.keys(errors).length ? { success: false, errors }
    : { success: true, value: { category: input.category as DifficultyCategory, observation } };
}

export function createDifficultyDraft(context: DifficultyContext, input: DifficultyInput): DifficultyDraft | null {
  const result = validateDifficulty(input);
  if (!result.success || !context.documentId || !Number.isInteger(context.pageNumber) || context.pageNumber < 1
    || (context.fragment && (context.fragment.documentId !== context.documentId || context.fragment.pageNumber !== context.pageNumber))) return null;
  // Copy the selection so later edits cannot silently mutate a confirmed association.
  return { ...context, fragment: context.fragment ? structuredClone(context.fragment) : null, ...result.value };
}
