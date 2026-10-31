import { z } from "zod";
import { cardRecordSchema } from "@/lib/validations/reinforcement-card";
import { mediaRecordSchema } from "@/lib/validations/reinforcement-media";
import { reinforcementContentSchema } from "@/lib/validations/reinforcement-request";
export const playableQuizSchema = z.object({ id: z.string().uuid(), version: z.number().int().positive(), title: z.string(), allowRetries: z.boolean(),
  questions: z.array(z.object({ prompt: z.string(), options: z.array(z.string()).min(2).max(5) }).strict()).min(1).max(3) }).strict();
export type PlayableQuiz = z.infer<typeof playableQuizSchema>;
export const quizFeedbackSchema = z.object({ score: z.number().int().nonnegative(), total: z.number().int().positive(),
  questions: z.array(z.object({ correct: z.boolean(), explanation: z.string(), correctOption: z.string() }).strict()).min(1).max(3) }).strict();
export type QuizFeedback = z.infer<typeof quizFeedbackSchema>;
export const previewReinforcementSchema = z.object({ id: z.string().uuid(), document_id: z.string().uuid(), page_number: z.number().int().positive(), title: z.string(), content: z.record(z.string(), z.unknown()),
  source_request_id: z.string().uuid().nullable(), approved_version_id: z.string().uuid().nullable(),
  source: z.object({ id: z.string().uuid(), project_id: z.string().uuid(), document_id: z.string().uuid(), page_number: z.number().int().positive(), selection: reinforcementContentSchema.shape.fragment }).nullable(),
  card: cardRecordSchema.nullable(), media: z.array(mediaRecordSchema) });
export const previewItemSchema = z.object({ reinforcement: previewReinforcementSchema, state: z.enum(["approved", "draft"]),
  sourceVersionId: z.string().uuid().nullable(), quiz: playableQuizSchema.nullable(), quizState: z.enum(["approved", "draft"]).nullable() });
export const experiencePreviewSchema = z.object({ projectId: z.string().uuid(), documentId: z.string().uuid(), name: z.string(), items: z.array(previewItemSchema) });
export type ExperiencePreview = z.infer<typeof experiencePreviewSchema>;
export const previewGradeInputSchema = z.object({ documentId: z.string().uuid(), requestId: z.string().uuid(), sourceVersionId: z.string().uuid(), quizVersionId: z.string().uuid(),
  answers: z.array(z.number().int().min(0).max(4)).min(1).max(3) }).strict();
