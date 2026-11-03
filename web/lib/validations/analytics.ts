import { z } from "zod";
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const analyticsFilterSchema = z.object({ projectId: z.string().uuid(), documentId: z.string().uuid(), from: z.iso.date(), to: z.iso.date(), through: z.iso.datetime({ offset: true }).optional() })
  .refine(v => v.from <= v.to, "La fecha inicial debe ser anterior o igual a la final.");
export const analyticsDocumentSchema = z.object({ id: z.string().uuid(), projectId: z.string().uuid(), name: z.string() }).strict();
export const documentAnalyticsSchema = z.object({ document: analyticsDocumentSchema, from: z.iso.date(), to: z.iso.date(), timeZone: z.literal("America/Bogota"), through: z.iso.datetime({ offset: true }),
  totals: z.object({ visits: count, opens: count, quizAttempts: count, correctAnswers: count, answeredQuestions: count, accuracy: z.number().min(0).max(100).nullable(), feedback: count, useful: count, unclear: count, excludedQuizAttempts: count }).strict(),
  reinforcements: z.array(z.object({ id: z.string().uuid(), title: z.string(), pageNumber: z.number().int().positive(), publicationVersion: z.number().int().positive().nullable(), opens: count, useful: count, unclear: count }).strict()),
  quizzes: z.array(z.object({ id: z.string().uuid(), title: z.string(), pageNumber: z.number().int().positive(), publicationVersion: z.number().int().positive(), quizVersion: z.number().int().positive(), attempts: count, correct: count, questions: count, accuracy: z.number().min(0).max(100) }).strict()),
}).strict().refine(v => v.totals.feedback === v.totals.useful + v.totals.unclear && v.totals.correctAnswers <= v.totals.answeredQuestions, "Indicadores incoherentes.");
export type AnalyticsDocument = z.infer<typeof analyticsDocumentSchema>;
export type DocumentAnalytics = z.infer<typeof documentAnalyticsSchema>;
