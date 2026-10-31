import type { QuizContent } from "@/lib/validations/quiz";
type Question = QuizContent["questions"][number];
export function addQuizOption(question: Question): Question {
  return question.options.length >= 5 ? question : { ...question, options: [...question.options, ""] };
}
export function removeQuizOption(question: Question, index: number): Question {
  if (question.options.length <= 2 || index < 0 || index >= question.options.length) return question;
  return { ...question, options: question.options.filter((_, i) => i !== index),
    correctIndex: question.correctIndex === index ? -1 : question.correctIndex > index ? question.correctIndex - 1 : question.correctIndex };
}
export function moveQuizOption(question: Question, from: number, to: number): Question {
  if (from < 0 || to < 0 || from >= question.options.length || to >= question.options.length || from === to) return question;
  const order = question.options.map((_, index) => index), [moved] = order.splice(from, 1); order.splice(to, 0, moved);
  return { ...question, options: order.map(index => question.options[index]), correctIndex: order.indexOf(question.correctIndex) };
}
