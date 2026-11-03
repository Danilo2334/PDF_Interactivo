import "server-only";
import { z } from "zod";
import { reviewHeadSchema, reviewVersionSchema } from "@/lib/validations/example";
import { quizHeadSchema, quizVersionSchema, type QuizContent } from "@/lib/validations/quiz";
import { experiencePreviewSchema, type PlayableQuiz } from "@/lib/validations/experience-preview";
import { reinforcementContentSchema } from "@/lib/validations/reinforcement-request";
import type { Reinforcement } from "@/lib/types/reinforcement";
const one = (value: unknown) => Array.isArray(value) ? value[0] ?? null : value;
const requestSchema = z.object({ id: z.string().uuid(), project_id: z.string().uuid(), document_id: z.string().uuid(), page_number: z.number().int().positive(),
  selection: reinforcementContentSchema.shape.fragment, recommended_type: z.string().nullable(),
  review: z.unknown(), versions: z.array(reviewVersionSchema.extend({ visual_content: z.record(z.string(), z.unknown()).nullable().optional(), summary_content: z.record(z.string(), z.unknown()).nullable().optional() })),
  quizHead: z.unknown(), quizVersions: z.array(quizVersionSchema), generation: z.unknown() });
export function projectQuiz(id: string, version: number, content: QuizContent): PlayableQuiz {
  return { id, version, title: content.title, allowRetries: content.allowRetries, questions: content.questions.map(q => ({ prompt: q.prompt, options: [...q.options] })) };
}
export function buildPreview(project: { id: string; document_id: string; name: string }, published: Reinforcement[], input: unknown[]) {
  const items = new Map(published.filter(p => p.document_id === project.document_id).map(p => [p.source_request_id ?? p.id, {
    reinforcement: { ...p, source_request_id: p.source_request_id ?? null, approved_version_id: p.approved_version_id ?? null, source: p.source ?? null, card: p.card ?? null, media: p.media ?? [] },
    state: "approved" as "approved" | "draft", sourceVersionId: p.approved_version_id ?? null, quiz: null as PlayableQuiz | null, quizState: null as "approved" | "draft" | null,
  }]));
  const grading = new Map<string, { requestId: string; sourceVersionId: string; content: QuizContent }>();
  for (const raw of input) {
    const row = requestSchema.parse(raw);
    if (row.project_id !== project.id || row.document_id !== project.document_id || row.selection && (row.selection.documentId !== project.document_id || row.selection.pageNumber !== row.page_number)) throw Error("Foreign preview source");
    const head = reviewHeadSchema.nullable().parse(one(row.review)), base = items.get(row.id);
    const current = head?.decision !== "discarded" ? row.versions.find(v => v.version === head?.current_version) : undefined;
    const generation = z.object({ status: z.string(), content: z.record(z.string(), z.unknown()).nullable() }).nullable().parse(one(row.generation));
    if (current && head?.decision === "pending") {
      if (current.request_id !== row.id) throw Error("Foreign review version");
      const content = { type: current.summary_content ? "summary" : current.visual_content ? "visual" : row.recommended_type ?? "explanation",
        text: current.text, summary: current.summary_content, visual: current.visual_content, generatedByAI: true, editedByOwner: current.origin === "owner" };
      items.set(row.id, { reinforcement: { id: base?.reinforcement.id ?? current.id, document_id: project.document_id, page_number: row.page_number, title: current.title, content,
        source_request_id: row.id, approved_version_id: base?.reinforcement.approved_version_id ?? null,
        source: { id: row.id, project_id: project.id, document_id: project.document_id, page_number: row.page_number, selection: row.selection }, card: base?.reinforcement.card ?? null, media: base?.reinforcement.media ?? [] },
        state: "draft", sourceVersionId: current.id, quiz: null, quizState: null });
    } else if (!head && !base && row.recommended_type === "explanation" && generation?.status === "ready" && generation.content && typeof generation.content.title === "string" && typeof generation.content.text === "string") {
      items.set(row.id, { reinforcement: { id: row.id, document_id: project.document_id, page_number: row.page_number, title: generation.content.title,
        content: { type: "explanation", text: generation.content.text, generatedByAI: true }, source_request_id: row.id, approved_version_id: null,
        source: { id: row.id, project_id: project.id, document_id: project.document_id, page_number: row.page_number, selection: row.selection }, card: null, media: [] },
        state: "draft", sourceVersionId: null, quiz: null, quizState: null });
    }
    const item = items.get(row.id), qHead = quizHeadSchema.nullable().parse(one(row.quizHead));
    if (!item?.sourceVersionId || qHead?.choice !== "generate" || qHead.target_source_version_id !== item.sourceVersionId) continue;
    const candidates = row.quizVersions.filter(q => q.request_id === row.id && q.source.documentId === project.document_id && q.source_version_id === item.sourceVersionId);
    const currentQuiz = qHead.decision !== "discarded" ? candidates.find(q => q.version === qHead.current_version) : undefined;
    const quiz = currentQuiz ?? candidates.find(q => q.id === qHead.approved_version_id);
    if (quiz) {
      item.quiz = projectQuiz(quiz.id, quiz.version, quiz.content); item.quizState = quiz.id === qHead.approved_version_id ? "approved" : "draft";
      grading.set(quiz.id, { requestId: row.id, sourceVersionId: item.sourceVersionId, content: quiz.content });
    }
  }
  return { view: experiencePreviewSchema.parse({ projectId: project.id, documentId: project.document_id, name: project.name,
    items: [...items.values()].sort((a, b) => a.reinforcement.page_number - b.reinforcement.page_number) }), grading };
}
export function gradeQuiz(content: QuizContent, answers: number[]) {
  if (answers.length !== content.questions.length || answers.some((a, i) => !Number.isInteger(a) || a < 0 || a >= content.questions[i].options.length)) throw Error("Answer every question");
  const questions = content.questions.map((q, i) => ({ correct: answers[i] === q.correctIndex, explanation: q.explanation, correctOption: q.options[q.correctIndex] }));
  return { score: questions.filter(q => q.correct).length, total: questions.length, questions };
}
