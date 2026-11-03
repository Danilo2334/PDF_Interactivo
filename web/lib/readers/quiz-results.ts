import { storedQuizAttemptSchema, quizResultsSchema, type QuizResults } from "@/lib/validations/quiz-results";
import type { ReaderSnapshot } from "@/lib/readers/model";
export type ResultPublication = { id: string; ownerId: string; version: number; hash: string; snapshot: ReaderSnapshot };
export function consolidateQuizResults(publications: ResultPublication[], rows: unknown[], through: string, page: number, alias: (id: string) => string) {
  const sources = new Map<string, { publication: ResultPublication; quiz: NonNullable<ReaderSnapshot["items"][number]["quiz"]>; participants: Set<string>; group: QuizResults["groups"][number] }>();
  for (const publication of publications) for (const item of publication.snapshot.items) {
    if (!item.quiz) continue;
    const quiz = item.quiz, id = publication.id + ":" + quiz.id;
    sources.set(id, { publication, quiz, participants: new Set<string>(), group: { id, title: quiz.content.title, pageNumber: item.pageNumber,
      publicationVersion: publication.version, quizVersion: quiz.version, identificationRequired: publication.snapshot.requireIdentification, attempts: 0, participants: 0,
      questions: quiz.content.questions.map(q => ({ prompt: q.prompt, options: [...q.options], correctOption: q.options[q.correctIndex], answers: 0, correct: 0, percentage: 0, optionCounts: q.options.map(() => 0) })) } });
  }
  const attempts = [], seen = new Set<string>(), numbers = new Set<string>(); let excluded = 0, duplicatesIgnored = 0;
  for (const raw of rows) {
    const parsed = storedQuizAttemptSchema.safeParse(raw); if (!parsed.success) { excluded++; continue; }
    const row = parsed.data;
    if (seen.has(row.id)) { duplicatesIgnored++; continue; } seen.add(row.id);
    const source = sources.get(row.publication_id + ":" + row.quiz_version_id);
    const numberKey = `${row.publication_id}:${row.quiz_version_id}:${row.reader_id}:${row.attempt_number}`;
    if (!source || source.publication.ownerId !== row.owner_id || source.publication.hash !== row.publication_hash || numbers.has(numberKey)) { excluded++; continue; }
    const questions = source.quiz.content.questions;
    if (row.total !== questions.length || row.answers.length !== questions.length || row.feedback.total !== row.total || row.feedback.score !== row.score || row.feedback.questions.length !== row.total) { excluded++; continue; }
    let score = 0, coherent = true;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i], answer = row.answers[i], feedback = row.feedback.questions[i], correct = answer === q.correctIndex;
      if (answer >= q.options.length || feedback.correct !== correct || feedback.correctOption !== q.options[q.correctIndex] || feedback.explanation !== q.explanation) coherent = false;
      if (correct) score++;
    }
    // Check the saved version without modifying or regrading any stored attempt.
    if (!coherent || score !== row.score || row.score > row.total) { excluded++; continue; }
    numbers.add(numberKey); source.participants.add(row.reader_id); source.group.attempts++;
    for (let i = 0; i < questions.length; i++) {
      const result = source.group.questions[i]; result.answers++; result.optionCounts[row.answers[i]]++;
      if (row.feedback.questions[i].correct) result.correct++;
    }
    attempts.push({ id: row.id, groupId: source.group.id, participant: alias(row.reader_id), number: row.attempt_number, createdAt: row.created_at, score: row.score, total: row.total,
      answers: questions.map((q, i) => ({ selected: q.options[row.answers[i]], correct: row.feedback.questions[i].correct, explanation: row.feedback.questions[i].explanation })) });
  }
  const groups = [...sources.values()].map(source => ({ ...source.group, participants: source.participants.size,
    questions: source.group.questions.map(q => ({ ...q, percentage: q.answers ? Math.round(q.correct * 10000 / q.answers) / 100 : 0 })) }))
    .sort((a, b) => a.publicationVersion - b.publicationVersion || a.pageNumber - b.pageNumber || a.title.localeCompare(b.title, "es"));
  attempts.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id));
  const pages = Math.max(1, Math.ceil(attempts.length / 20)), selectedPage = Math.min(page, pages);
  return quizResultsSchema.parse({ through, totalAttempts: attempts.length, excluded, duplicatesIgnored, groups, page: selectedPage, pageSize: 20, pages,
    attempts: attempts.slice((selectedPage - 1) * 20, selectedPage * 20) });
}
