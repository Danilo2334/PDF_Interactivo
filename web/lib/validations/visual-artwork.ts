import { z } from "zod";

export const ART_COLORS = { ink: "#334155", muted: "#cbd5e1", blue: "#dbeafe", green: "#dcfce7", amber: "#fef3c7", red: "#fee2e2", paper: "#ffffff", none: "none" } as const;
const color = z.enum(["ink", "muted", "blue", "green", "amber", "red", "paper", "none"]);
const x = z.number().min(0).max(340), y = z.number().min(0).max(220);
const point = z.object({x,y}).strict();
const id = z.string().regex(/^m(?:[1-9]|[1-3][0-9]|4[0-8])$/);
// These branches have distinct literal shapes. z.union emits anyOf, supported
// by the provider's strict JSON schema, without weakening local validation.
export const artMarkSchema = z.union([
  z.object({id, shape:z.literal("ellipse"), cx:x, cy:y, rx:z.number().min(3).max(160), ry:z.number().min(3).max(105), fill:color}).strict(),
  z.object({id, shape:z.literal("rectangle"), x,y, width:z.number().min(4).max(340), height:z.number().min(4).max(220), fill:color}).strict(),
  z.object({id, shape:z.literal("polygon"), points:z.array(point).min(3).max(12), fill:color}).strict(),
  z.object({id, shape:z.literal("line"), points:z.array(point).min(2).max(12), color, dashed:z.boolean(), arrow:z.boolean()}).strict(),
]);
export type ArtMark = z.infer<typeof artMarkSchema>;
export function artMarkCenter(mark: ArtMark) {
  if(mark.shape==="ellipse") return {x:mark.cx,y:mark.cy};
  if(mark.shape==="rectangle") return {x:mark.x+mark.width/2,y:mark.y+mark.height/2};
  return {x:mark.points.reduce((n,p)=>n+p.x,0)/mark.points.length,y:mark.points.reduce((n,p)=>n+p.y,0)/mark.points.length};
}
export const visualArtworkSchema = z.object({
  layout:z.enum(["illustration","process","comparison"]),
  objective:z.string().trim().min(25).max(260), takeaway:z.string().trim().min(30).max(400),
  scopeNote:z.string().trim().min(15).max(240),
  legend:z.array(z.object({color,label:z.string().trim().min(3).max(70)}).strict()).min(1).max(5),
  figures:z.array(z.object({
    id:z.string().regex(/^f[1-3]$/), title:z.string().trim().min(3).max(80),
    explanation:z.string().trim().min(30).max(400), evidence:z.string().trim().min(8).max(300),
    conceptIds:z.array(z.string().regex(/^n[1-6]$/)).min(1).max(6),
    marks:z.array(artMarkSchema).min(3).max(16),
    annotations:z.array(z.object({targetId:id,label:z.string().trim().min(3).max(60),
      explanation:z.string().trim().min(15).max(200),evidence:z.string().trim().min(8).max(200)}).strict()).min(1).max(3),
  }).strict()).min(1).max(3),
}).strict().superRefine((art,ctx)=>{
  const issue=(message:string)=>ctx.addIssue({code:"custom",message});
  if(new Set(art.figures.map(f=>f.id)).size!==art.figures.length)issue("Repeated illustration figure");
  if(new Set(art.legend.map(l=>l.color)).size!==art.legend.length)issue("Repeated illustration legend color");
  if(art.layout!=="illustration"&&art.figures.length<2)issue("A process or comparison needs multiple figures");
  for(const figure of art.figures){
    const ids=new Set(figure.marks.map(m=>m.id));
    if(ids.size!==figure.marks.length||figure.annotations.some(a=>!ids.has(a.targetId)))issue("Invalid illustration references");
    if(new Set(figure.marks.map(m=>m.shape)).size<2)issue("Illustration needs a composed drawing");
    for(const mark of figure.marks){
      if(mark.shape==="rectangle"&&(mark.x+mark.width>340||mark.y+mark.height>220))issue("Rectangle outside drawing");
      if(mark.shape==="ellipse"&&(mark.cx-mark.rx<0||mark.cx+mark.rx>340||mark.cy-mark.ry<0||mark.cy+mark.ry>220))issue("Ellipse outside drawing");
    }
  }
});
export type VisualArtwork = z.infer<typeof visualArtworkSchema>;
