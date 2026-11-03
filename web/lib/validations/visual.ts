import { z } from "zod";
import { explanationRecordSchema } from "@/lib/validations/explanation";
import { reviewHeadSchema, reviewVersionSchema, reviewEventSchema } from "@/lib/validations/example";
import type { AnalysisContext, ContextDiagnosis } from "@/lib/validations/contextual-analysis";
import { visualArtworkSchema } from "@/lib/validations/visual-artwork";

export const VISUAL_MODES = ["image", "diagram"] as const;
export type VisualMode = typeof VISUAL_MODES[number];
export const VISUAL_LABELS = { image: "Imagen", diagram: "Diagrama" };
export const VISUAL_SYMBOLS = ["pendulum", "water", "sun", "cloud", "plant", "book", "atom", "energy", "cycle"] as const;
export const VISUAL_RELATION_LABELS = { transformation: "Transformación", cause: "Causa", sequence: "Secuencia", part_of: "Composición", comparison: "Comparación", definition: "Definición" } as const;
const visualEdgeSchema = z.object({ from: z.string().regex(/^n[1-6]$/), to: z.string().regex(/^n[1-6]$/),
  label: z.string().trim().min(1).max(40), relationType: z.enum(["transformation", "cause", "sequence", "part_of", "comparison", "definition"]),
  evidence: z.string().trim().min(8).max(300) }).strict();
const sceneShape = {
  kind: z.enum(VISUAL_MODES),
  nodes: z.array(z.object({ id: z.string().regex(/^n[1-6]$/), label: z.string().trim().min(1).max(60),
    detail: z.string().trim().min(1).max(160), symbol: z.enum(VISUAL_SYMBOLS) }).strict()).min(1).max(6),
};
function checkScene(scene: { kind: string; nodes: {id: string}[]; edges: {from: string; to: string}[] }, ctx: z.RefinementCtx) {
  const ids = new Set(scene.nodes.map(n => n.id));
  if (ids.size !== scene.nodes.length || scene.edges.some(e => !ids.has(e.from) || !ids.has(e.to) || e.from === e.to)) ctx.addIssue({ code: "custom", message: "Invalid visual references" });
  if (scene.kind === "diagram" && (scene.nodes.length < 2 || !scene.edges.length)
    || scene.kind === "image" && (scene.nodes.length > 4 || scene.edges.length)) ctx.addIssue({ code: "custom", message: "Visual structure does not match the selected mode" });
}
// Older owner-reviewed versions remain readable; new generations require both fields.
export const visualSceneSchema = z.object({ ...sceneShape,
  edges: z.array(visualEdgeSchema.partial({relationType: true, evidence: true})).max(8),artwork:visualArtworkSchema.optional() }).strict().superRefine(checkScene);
const generatedSceneSchema = z.object({ ...sceneShape, edges: z.array(visualEdgeSchema).max(8),artwork:visualArtworkSchema }).strict().superRefine(checkScene);
export const visualContentSchema = z.object({ title: z.string().trim().min(3).max(160), text: z.string().trim().min(80).max(1600),
  sourceQuote: z.string().trim().min(8).max(500), topicReference: z.string().min(3).max(200), consistentWithSource: z.boolean(), scene: visualSceneSchema }).strict();
export const generatedVisualContentSchema = visualContentSchema.extend({scene: generatedSceneSchema});
export type VisualContent = z.infer<typeof visualContentSchema>;
export function validateVisual(value: unknown, context: AnalysisContext, diagnosis: ContextDiagnosis, mode: VisualMode) {
  const output = generatedVisualContentSchema.parse(value);
  if (!context.enough || !diagnosis.sufficient || !output.consistentWithSource || output.scene.kind !== mode
    || !context.selectedText.includes(output.sourceQuote) || output.topicReference !== diagnosis.topic) throw Error("Visual does not match its saved source");
  // Apply to new AI outputs without making historical owner-reviewed versions
  // unreadable. The renderer never truncates labels to make a bad answer pass.
  const labels = [...output.scene.nodes.map(node => node.label), ...output.scene.edges.map(edge => edge.label)];
  if (labels.some(label => /[\u00ad\u200b-\u200d\ufeff]|(?:…|\.{3}|[-–—])\s*$/u.test(label))) throw Error("Visual contains a truncated label");
  if (/\b(?:nodos?|elementos?)\s+(?:superiores?|inferiores?)\b/iu.test(output.text)) throw Error("Visual description assumes an unsupported layout");
  const normalize = (text: string) => text.normalize("NFC").replace(/\s+/g, " ").trim();
  const nodeLabels = output.scene.nodes.map(node => normalize(node.label).toLocaleLowerCase("es"));
  if (new Set(nodeLabels).size !== nodeLabels.length) throw Error("Visual repeats concept labels");
  const sources = [context.selectedText, context.nearbyText].map(normalize), links = new Set<string>();
  if(new TextEncoder().encode(JSON.stringify(output)).length>30000)throw Error("Visual exceeds the storage budget");
  for (const edge of output.scene.edges) {
    if (!sources.some(source => source.includes(normalize(edge.evidence)))) throw Error("Visual relation has no source evidence");
    if (/^(?:se relaciona con|relacionad[oa] con|conecta con|conduce a|permite|contiene|integra(?: la suma)?|alterna con)$/iu.test(edge.label.trim()))
      throw Error("Visual relation is ambiguous");
    const key = `${edge.from}:${edge.to}:${edge.relationType}`;
    if (links.has(key)) throw Error("Visual repeats a relation");
    links.add(key);
  }
  if (mode === "diagram") {
    const connected = new Set([output.scene.nodes[0].id]);
    for (let pass = 0; pass < output.scene.nodes.length; pass++) for (const edge of output.scene.edges)
      if (connected.has(edge.from) || connected.has(edge.to)) { connected.add(edge.from); connected.add(edge.to); }
    if (connected.size !== output.scene.nodes.length) throw Error("Visual contains disconnected concepts");
  }
  const art=output.scene.artwork,ids=new Set(output.scene.nodes.map(n=>n.id)),covered=new Set<string>();
  const prose=[output.title,output.text,...output.scene.nodes.flatMap(n=>[n.label,n.detail]),art.objective,art.takeaway,art.scopeNote,...art.legend.map(l=>l.label),
    ...art.figures.flatMap(f=>[f.title,f.explanation,...f.annotations.flatMap(a=>[a.label,a.explanation])])];
  // Detect generation artifacts in Spanish explanations, without rejecting
  // legitimate non-Latin source terms that actually occur in the PDF.
  const sourceText=sources.join(" ");
  if(prose.some(text=>/[\uFFFD\u00ad\u200b-\u200d\ufeff]/u.test(text)||Array.from(text).some(char=>/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(char)&&!sourceText.includes(char))))
    throw Error("Illustration contains corrupted text");
  const checkEvidence=(quote:string)=>{if(!sources.some(source=>source.includes(normalize(quote))))throw Error("Illustration has no source evidence");};
  for(const figure of art.figures){
    if([figure.explanation,...figure.annotations.map(a=>a.explanation)].some(text=>!/[.!?][»"')\]]?$/u.test(text.trim())))throw Error("Illustration has an unfinished explanation");
    if(figure.conceptIds.some(id=>!ids.has(id)))throw Error("Illustration refers to a foreign concept");
    figure.conceptIds.forEach(id=>covered.add(id));checkEvidence(figure.evidence);
    figure.annotations.forEach(a=>checkEvidence(a.evidence));
    if([...figure.annotations.map(a=>a.label),figure.title].some(label=>/[\u00ad\u200b-\u200d\ufeff]|(?:…|\.{3})\s*$/u.test(label)))throw Error("Illustration has an incomplete label");
  }
  if(covered.size!==ids.size)throw Error("Illustration omits a concept");
  if(art.layout==="process")for(let i=1;i<art.figures.length;i++){
    const previous=art.figures[i-1].conceptIds,next=art.figures[i].conceptIds;
    if(!output.scene.edges.some(e=>previous.includes(e.from)&&next.includes(e.to)&&["cause","sequence","transformation"].includes(e.relationType)))throw Error("Illustration invents a process order");
  }
  return output;
}
export const VISUAL_FAILURES = ["provider_unavailable", "provider_refused", "invalid_visual", "timeout"] as const;
export type VisualFailureCode = typeof VISUAL_FAILURES[number];
export const VISUAL_MESSAGES: Record<VisualFailureCode, string> = {
  provider_unavailable: "El servicio de IA no está disponible o se agotó su cuota. Espera antes de reintentar; no se cambiará de proveedor automáticamente.",
  provider_refused: "No fue posible generar este recurso. Revisa el fragmento y su dificultad.",
  invalid_visual: "El recurso no ofrece relaciones claras y verificables con el fragmento. No se publicó. Amplía el contexto o solicita otro resultado.",
  timeout: "La generación agotó su tiempo. Puedes reintentar sin publicar un recurso incompleto.",
};
export const visualRecordSchema = explanationRecordSchema.omit({ detail_level: true }).extend({ mode: z.enum(VISUAL_MODES),
  visual_brief: z.string().min(20).max(2000), instructions: z.string().max(500),
  content: visualContentSchema.nullable(), error_code: z.enum(VISUAL_FAILURES).nullable() });
export const visualReviewVersionSchema = reviewVersionSchema.extend({ visual_content: visualContentSchema.nullable() });
export const visualReviewEventSchema = reviewEventSchema.extend({ action: z.enum(["edit", "approve", "discard", "regenerate"]) });
export const visualViewSchema = z.object({ generation: visualRecordSchema.nullable(), choiceVersion: z.number().int().nonnegative(),
  visualChosen: z.boolean(), providerAvailable: z.boolean(), canConfigure: z.boolean(), canGenerate: z.boolean(), canRegenerate: z.boolean(),
  review: reviewHeadSchema.nullable(), versions: z.array(visualReviewVersionSchema).max(20), events: z.array(visualReviewEventSchema).max(20) });
export type VisualView = z.infer<typeof visualViewSchema>;
const common = { documentId: z.string().uuid(), expectedVersion: z.number().int().nonnegative(), choiceVersion: z.number().int().positive() };
export const visualInputSchema = z.discriminatedUnion("action", [
  z.object({ ...common, action: z.literal("configure"), mode: z.enum(VISUAL_MODES) }).strict(),
  z.object({ ...common, action: z.literal("generate") }).strict(),
  z.object({ ...common, action: z.literal("regenerate"), reviewVersion: z.number().int().positive(), instructions: z.string().trim().max(500).default("") }).strict(),
]);
