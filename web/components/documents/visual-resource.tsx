import { useId, useState } from "react";
import { visualContentSchema, type VisualContent } from "@/lib/validations/visual";

function lines(text: string, width = 23) {
  const words = text.match(new RegExp(`.{1,${width}}(?:\\s|$)|.{1,${width}}`, "g")) ?? [text];
  return words.map(word => word.trim());
}
function Symbol({ name }: { name: VisualContent["scene"]["nodes"][number]["symbol"] }) {
  if (name === "pendulum") return <><path d="M-58 -45H58M0 -45L42 38" /><circle cx="42" cy="38" r="17" fill="currentColor" /><path d="M-45 40Q0 78 45 40" strokeDasharray="5 5" /></>;
  if (name === "water") return <path d="M0 -62C-18 -30 -49 0 -43 29C-34 73 34 73 43 29C49 0 18 -30 0 -62Z" fill="currentColor" />;
  if (name === "sun") return <><circle r="29" fill="currentColor" /><path d="M0 -60V-42M0 42V60M-60 0H-42M42 0H60M-44 -44L-31 -31M31 31L44 44M-44 44L-31 31M31 -31L44 -44" /></>;
  if (name === "cloud") return <path d="M-49 28C-83 -2 -43 -36 -21 -19C-17 -66 48 -54 45 -16C88 -18 83 37 44 37H-36Z" fill="currentColor" />;
  if (name === "plant") return <><path d="M0 61V-25M0 10C-74 10 -64 -58 -5 -20M0 31C69 23 61 -40 4 -7" /><path d="M-40 63H40" /></>;
  if (name === "book") return <><path d="M0 -40Q-30 -62 -65 -40V50Q-30 28 0 50Q30 28 65 50V-40Q30 -62 0 -40ZM0 -40V50" /><path d="M-51 -20L-15 -15M15 -15L51 -20M-51 0L-15 5M15 5L51 0" /></>;
  if (name === "atom") return <><ellipse rx="64" ry="23" /><ellipse rx="64" ry="23" transform="rotate(60)" /><ellipse rx="64" ry="23" transform="rotate(120)" /><circle r="10" fill="currentColor" /></>;
  if (name === "cycle") return <><path d="M-48 -13A51 51 0 0 1 45 -25M45 13A51 51 0 0 1 -45 25M45 -25L45 -58M45 -25L13 -26M-45 25L-45 58M-45 25L-13 26" /></>;
  return <path d="M15 -65L-43 9H-6L-19 65L45 -10H7Z" fill="currentColor" />;
}
const palette = ["#dbeafe", "#fef3c7", "#dcfce7", "#ede9fe"];
export function VisualResource({ value, title, description }: { value: unknown; title?: string; description?: string }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, ""), parsed = visualContentSchema.safeParse(value);
  if (!parsed.success) return <p role="alert">El recurso visual no pudo verificarse.</p>;
  const content = parsed.data, image = content.scene.kind === "image", count = content.scene.nodes.length;
  const cols = image ? Math.min(2, count) : Math.min(3, count), rows = Math.ceil(count / cols), height = rows * 280 + 25;
  const nodes = content.scene.nodes.map((node, i) => ({ ...node, x: (i % cols + 0.5) * 960 / cols, y: Math.floor(i / cols) * 280 + 125 }));
  return <figure className="min-w-0 space-y-3">
    <button type="button" aria-expanded={expanded} aria-controls={`${id}-viewport`}
      onClick={() => setExpanded(previous => !previous)}
      className="rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
      {expanded ? "Ajustar recurso al ancho" : "Ampliar recurso visual"}
    </button>
    {expanded && <p className="text-sm text-slate-700">Desplázate horizontalmente para ver todo el recurso. Con teclado, enfoca el gráfico y usa las flechas.</p>}
    <div id={`${id}-viewport`} role="region" aria-label="Vista del recurso visual" tabIndex={expanded ? 0 : undefined}
      className="max-w-full overflow-x-auto rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
    <svg role="img" aria-labelledby={`${id}-title ${id}-description`} viewBox={`0 0 960 ${height}`}
      className={`h-auto w-full rounded-xl border border-slate-300 bg-white${expanded ? " min-w-[60rem]" : ""}`} xmlns="http://www.w3.org/2000/svg">
      <title id={`${id}-title`}>{title ?? content.title}</title><desc id={`${id}-description`}>{description ?? content.text}</desc>
      <defs><marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#475569" /></marker></defs>
      {!image && content.scene.edges.map((edge, i) => {
        const from = nodes.find(n => n.id === edge.from)!, to = nodes.find(n => n.id === edge.to)!;
        const vertical = from.y !== to.y, sx = from.x, sy = from.y + (vertical ? 65 : 0), tx = to.x, ty = to.y - (vertical ? 65 : 0);
        const x1 = vertical ? sx : sx + (tx > sx ? 125 : -125), x2 = vertical ? tx : tx + (tx > sx ? -135 : 135);
        return <g key={i}><path d={`M${x1} ${sy}L${x2} ${ty}`} stroke="#475569" strokeWidth="3" markerEnd={`url(#${id}-arrow)`} />
          <text x={(x1+x2)/2} y={vertical ? (sy+ty)/2-15 : sy-101} textAnchor="middle" fontSize="15" fill="#334155" stroke="white" strokeWidth="4" paintOrder="stroke">{lines(edge.label, 18).map((line, j) => <tspan key={j} x={(x1+x2)/2} dy={j ? 17 : 0}>{line}</tspan>)}</text></g>;
      })}
      {nodes.map((node, i) => <g key={node.id} transform={`translate(${node.x} ${node.y})`}>
        {image ? <><rect x="-190" y="-105" width="380" height="240" rx="28" fill={palette[i%4]} /><g transform="translate(0 -10)" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" color="#1e40af"><Symbol name={node.symbol} /></g></>
          : <rect x="-125" y="-62" width="250" height="124" rx="16" stroke="#64748b" strokeWidth="2" fill={palette[i%4]} />}
        <text textAnchor="middle" fontFamily="sans-serif" fontSize={image ? 25 : 21} fontWeight="600" fill="#0f172a" y={image ? 89 : -10}>
          {lines(node.label, image ? 27 : 21).map((line, j) => <tspan key={j} x="0" dy={j ? 26 : 0}>{line}</tspan>)}
        </text>
      </g>)}
    </svg>
    </div>
    <figcaption className="whitespace-pre-wrap break-words text-sm text-slate-800">{description ?? content.text}</figcaption>
    <details className="text-sm"><summary className="cursor-pointer font-medium">Descripción de los elementos</summary>
      <ul className="mt-2 space-y-2">{content.scene.nodes.map(node => <li key={node.id}><strong>{node.label}: </strong>{node.detail}</li>)}</ul>
      {content.scene.edges.length > 0 && <ul className="mt-2 space-y-1">{content.scene.edges.map((edge, i) => <li key={i}>{content.scene.nodes.find(n => n.id===edge.from)?.label} → {content.scene.nodes.find(n => n.id===edge.to)?.label}: {edge.label}</li>)}</ul>}
    </details>
  </figure>;
}
