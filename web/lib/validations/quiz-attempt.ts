import { z } from "zod";
import { quizFeedbackSchema } from "@/lib/validations/experience-preview";
export const quizAttemptInputSchema = z.object({ operationId: z.string().uuid(), answers: z.array(z.number().int().min(0).max(4)).min(1).max(3) }).strict();
export const quizAttemptReceiptSchema = z.object({ attemptId: z.string().uuid(), number: z.number().int().positive(), createdAt: z.string(),
  answers: z.array(z.number().int().min(0).max(4)).min(1).max(3), feedback: quizFeedbackSchema, privateTest: z.boolean() }).strict()
  .refine(r => r.answers.length === r.feedback.total && r.feedback.questions.length === r.feedback.total && r.feedback.score <= r.feedback.total, "Inconsistent quiz result");
export const quizAttemptStatusSchema = z.object({ latest: quizAttemptReceiptSchema.nullable(), attempts: z.number().int().nonnegative(), allowRetries: z.boolean() }).strict()
  .refine(s => s.latest ? s.latest.number === s.attempts : s.attempts === 0, "Inconsistent attempt history");
export type QuizAttemptReceipt = z.infer<typeof quizAttemptReceiptSchema>;
export type QuizAttemptStatus = z.infer<typeof quizAttemptStatusSchema>;
