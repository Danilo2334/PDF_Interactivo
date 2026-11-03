import { summaryContentSchema } from "@/lib/validations/summary";
export function SummaryResource({ value }: { value: unknown }) {
  const parsed = summaryContentSchema.safeParse(value);
  if (!parsed.success) return <p role="alert">El resumen guardado no pudo verificarse.</p>;
  return <div className="min-w-0 space-y-3 text-sm">
    <p className="whitespace-pre-wrap break-words">{parsed.data.text}</p>
    <p className="font-semibold">Conceptos clave</p>
    <ul className="space-y-2">{parsed.data.concepts.map(concept => <li key={concept.name} className="break-words">
      <strong>{concept.name}</strong><details><summary className="cursor-pointer">Cita que sustenta el concepto</summary><blockquote className="mt-1 whitespace-pre-wrap border-l-2 border-slate-300 pl-3">{concept.sourceQuote}</blockquote></details>
    </li>)}</ul>
  </div>;
}
