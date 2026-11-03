import type { DocumentAnalytics } from "@/lib/validations/analytics";
// Quote every field (including commas/newlines) and prevent spreadsheet formula execution.
export function analyticsCsvCell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function analyticsCsv(data: DocumentAnalytics) {
  const rows: unknown[][] = [["Documento ID", "Documento", "Desde (incluido)", "Hasta (incluido)", "Zona horaria", "Corte de consulta", "Alcance", "Indicador", "Refuerzo o quiz", "Página", "Publicación", "Versión quiz", "Valor", "Unidad"]];
  const add = (scope: string, metric: string, value: number | null, unit: string, title = "", page: number | null = null, publication: number | null = null, version: number | null = null) =>
    rows.push([data.document.id, data.document.name, data.from, data.to, data.timeZone, data.through, scope, metric, title, page, publication, version, value, unit]);
  const t = data.totals;
  for (const [label, value, unit] of [["Visitas", t.visits, "visitas"], ["Aperturas de refuerzo", t.opens, "aperturas"], ["Intentos de quiz", t.quizAttempts, "intentos"],
    ["Respuestas correctas", t.correctAnswers, "respuestas"], ["Preguntas respondidas", t.answeredQuestions, "preguntas"], ["Aciertos", t.accuracy, "%"],
    ["Valoraciones", t.feedback, "opiniones"], ["Útil", t.useful, "opiniones"], ["Sigue sin ser claro", t.unclear, "opiniones"], ["Intentos inconsistentes excluidos", t.excludedQuizAttempts, "intentos"]] as const) add("Documento", label, value, unit);
  for (const r of data.reinforcements) {
    add("Refuerzo", "Aperturas", r.opens, "aperturas", r.title, r.pageNumber, r.publicationVersion);
    add("Refuerzo", "Útil", r.useful, "opiniones", r.title, r.pageNumber, r.publicationVersion);
    add("Refuerzo", "Sigue sin ser claro", r.unclear, "opiniones", r.title, r.pageNumber, r.publicationVersion);
  }
  for (const q of data.quizzes) for (const [label, value, unit] of [["Intentos", q.attempts, "intentos"], ["Correctas", q.correct, "respuestas"], ["Respondidas", q.questions, "preguntas"], ["Aciertos", q.accuracy, "%"]] as const)
    add("Quiz", label, value, unit, q.title, q.pageNumber, q.publicationVersion, q.quizVersion);
  return "\ufeff" + rows.map(row => row.map(analyticsCsvCell).join(",")).join("\r\n") + "\r\n";
}
