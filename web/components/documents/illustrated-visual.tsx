import { ART_COLORS, artMarkCenter, type VisualArtwork, type ArtMark } from "@/lib/validations/visual-artwork";
const lineColors={...ART_COLORS,muted:"#64748b",blue:"#2563eb",green:"#15803d",amber:"#a16207",red:"#b91c1c"};

function Mark({mark,arrowId}:{mark:ArtMark;arrowId:string}){
  if(mark.shape==="ellipse")return <ellipse cx={mark.cx} cy={mark.cy} rx={mark.rx} ry={mark.ry} fill={ART_COLORS[mark.fill]} stroke="#334155" strokeWidth="2.5"/>;
  if(mark.shape==="rectangle")return <rect x={mark.x} y={mark.y} width={mark.width} height={mark.height} rx="5" fill={ART_COLORS[mark.fill]} stroke="#334155" strokeWidth="2.5"/>;
  if(mark.shape==="polygon")return <polygon points={mark.points.map(p=>`${p.x},${p.y}`).join(" ")} fill={ART_COLORS[mark.fill]} stroke="#334155" strokeWidth="2.5" strokeLinejoin="round"/>;
  return <polyline points={mark.points.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke={lineColors[mark.color]} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={mark.dashed?"6 5":undefined} markerEnd={mark.arrow?`url(#${arrowId})`:undefined}/>;
}
export function IllustratedVisual({artwork,id}:{artwork:VisualArtwork;id:string}){
  return <div className="space-y-5 sm:p-5">
    <div className="rounded-lg bg-blue-50 p-3 text-slate-900"><h4 className="font-semibold">Qué vas a entender</h4><p className="mt-1 text-base leading-relaxed">{artwork.objective}</p></div>
    <div className="grid gap-5" style={artwork.layout==="process"?undefined:{gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 30rem), 1fr))"}}>
      {artwork.figures.map((figure,index)=>{
        const arrowId=`${id}-${figure.id}-arrow`,titleId=`${id}-${figure.id}-title`,descId=`${id}-${figure.id}-desc`;
        const annotations=[...figure.annotations].sort((a,b)=>{
          const left=artMarkCenter(figure.marks.find(m=>m.id===a.targetId)!),right=artMarkCenter(figure.marks.find(m=>m.id===b.targetId)!);
          return left.y-right.y||left.x-right.x;
        });
        return <figure key={figure.id} className="min-w-0 space-y-3 rounded-xl border border-slate-200 bg-white p-2 sm:p-3">
          <h4 className="text-base font-semibold text-slate-900">{artwork.layout==="process"?`${index+1}. `:""}{figure.title}</h4>
          <svg viewBox="0 0 364 276" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby={`${titleId} ${descId}`} className="mx-auto h-auto w-full max-w-xl" fontFamily="sans-serif">
            <title id={titleId}>{figure.title}</title><desc id={descId}>{figure.explanation}</desc><rect width="364" height="276" rx="12" fill="#f8fafc"/>
            <defs><marker id={arrowId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#334155"/></marker></defs>
            <g transform="translate(12 28)">{figure.marks.map(mark=><Mark key={mark.id} mark={mark} arrowId={arrowId}/>)}</g>
            {annotations.map((annotation,i)=>{
              const mark=figure.marks.find(m=>m.id===annotation.targetId)!,center=artMarkCenter(mark);
              return <g key={annotation.targetId+":"+i}>
                <title>{`${i+1}. ${annotation.label}: ${annotation.explanation}`}</title>
                <circle cx={center.x+12} cy={center.y+28} r="11" fill="#1e3a8a" stroke="white" strokeWidth="2"/><text x={center.x+12} y={center.y+32} textAnchor="middle" fontSize="13" fontWeight="bold" fill="white">{i+1}</text>
              </g>;
            })}
          </svg>
          <figcaption className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">{figure.explanation}</figcaption>
          <h5 className="text-sm font-semibold text-slate-900">Cómo leer la figura</h5>
          <ol className="space-y-3 text-sm">{annotations.map((a,i)=><li key={i} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3"><span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-900 font-bold text-white">{i+1}</span><div className="min-w-0 break-words leading-relaxed"><strong>{a.label}</strong><p className="mt-1">{a.explanation}</p></div></li>)}</ol>
          <details className="text-sm text-slate-600"><summary className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-blue-600">Ver respaldo en el PDF</summary><blockquote className="mt-2 border-l-2 border-slate-300 pl-3">{figure.evidence}</blockquote>{annotations.map((a,i)=><p key={i} className="mt-2 break-words"><strong>{i+1}. {a.label}: </strong>«{a.evidence}»</p>)}</details>
        </figure>;
      })}
    </div>
    <ul aria-label="Leyenda del gráfico" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">{artwork.legend.map(item=><li key={item.color} className="flex items-center gap-2"><span aria-hidden="true" className="inline-block h-3 w-3 rounded-full border border-slate-500" style={{backgroundColor:ART_COLORS[item.color]}}/>{item.label}</li>)}</ul>
    <div className="rounded-lg border-l-4 border-blue-600 bg-blue-50 p-3 text-slate-900"><h4 className="font-semibold">La idea que debes recordar</h4><p className="mt-1 leading-relaxed">{artwork.takeaway}</p></div>
    <p className="text-sm leading-relaxed text-slate-600">{artwork.scopeNote}</p>
  </div>;
}
