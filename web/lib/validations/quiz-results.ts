import { z } from "zod";
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const storedQuizAttemptSchema = z.object({ id: z.string().uuid(), publication_id: z.string().uuid(), quiz_version_id: z.string().uuid(),
  owner_id: z.string().uuid(), reader_id: z.string().uuid(), publication_hash: z.string().regex(/^[a-f0-9]{64}$/), attempt_number: z.number().int().positive(),
  answers: z.array(z.number().int().min(0).max(4)).min(1).max(3), score: count, total: z.number().int().min(1).max(3), created_at: z.string().datetime({ offset: true }),
  feedback: z.object({ score: count, total: count, questions: z.array(z.object({ correct: z.boolean(), explanation: z.string(), correctOption: z.string() })).min(1).max(3) }),
});
const question = z.object({ prompt: z.string(), options: z.array(z.string()), correctOption: z.string(), answers: count, correct: count,
  percentage: z.number().min(0).max(100), optionCounts: z.array(count) }).strict();
const group = z.object({ id: z.string(), title: z.string(), pageNumber: z.number().int().positive(), publicationVersion: z.number().int().positive(),
  quizVersion: z.number().int().positive(), identificationRequired: z.boolean(), attempts: count, participants: count, questions: z.array(question) }).strict();
const attempt = z.object({ id: z.string().uuid(), groupId: z.string(), participant: z.string(), number: z.number().int().positive(), createdAt: z.string(), score: count, total: count,
  answers: z.array(z.object({ selected: z.string(), correct: z.boolean(), explanation: z.string() }).strict()) }).strict();
export const quizResultsSchema = z.object({ through: z.string(), totalAttempts: count, excluded: count, duplicatesIgnored: count, groups: z.array(group),
  attempts: z.array(attempt).max(20), page: z.number().int().positive(), pageSize: z.literal(20), pages: z.number().int().positive() }).strict();
export type QuizResults = z.infer<typeof quizResultsSchema>;
