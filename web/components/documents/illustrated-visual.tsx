import { ART_COLORS, artMarkCenter, type VisualArtwork, type ArtMark } from "@/lib/validations/visual-artwork";
const lineColors={...ART_COLORS,muted:"#64748b",blue:"#2563eb",green:"#15803d",amber:"#a16207",red:"#b91c1c"};

function wrap(text:string,width=22){
  const lines:string[]=[];let line="";
  for(const word of text.split(/\s+/)){
    const characters=Array.from(word);
    if(characters.length>width){if(line){lines.push(line);line="";}while(characters.length>width)lines.push(characters.splice(0,width).join(""));line=characters.join("");}
    else if(line&&line.length+word.length+1>width){lines.push(line);line=word;}else line+=`${line?" ":""}${word}`;
  }
  if(line)lines.push(line);return lines;
}
function Mark({mark,arrowId}:{mark:ArtMark;arrowId:string}){
  if(mark.shape==="ellipse")return <ellipse cx={mark.cx} cy={mark.cy} rx={mark.rx} ry={mark.ry} fill={ART_COLORS[mark.fill]} stroke="#334155" strokeWidth="2.5"/>;
  if(mark.shape==="rectangle")return <rect x={mark.x} y={mark.y} width={mark.width} height={mark.height} rx="5" fill={ART_COLORS[mark.fill]} stroke="#334155" strokeWidth="2.5"/>;
  if(mark.shape==="polygon")return <polygon points={mark.points.map(p=>`${p.x},${p.y}`).join(" ")} fill={ART_COLORS[mark.fill]} stroke="#334155" strokeWidth="2.5" strokeLinejoin="round"/>;
  return <polyline points={mark.points.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke={lineColors[mark.color]} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={mark.dashed?"6 5":undefined} markerEnd={mark.arrow?`url(#${arrowId})`:undefined}/>;
}
export function IllustratedVisual({artwork,id}:{artwork:VisualArtwork;id:string}){
  return <div className="space-y-5 p-3 sm:p-5">
    <p className="text-base font-medium leading-relaxed text-slate-900">{artwork.objective}</p>
    <div className="grid gap-5" style={artwork.layout==="process"?undefined:{gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 30rem), 1fr))"}}>
      {artwork.figures.map((figure,index)=>{
        const arrowId=`${id}-${figure.id}-arrow`,titleId=`${id}-${figure.id}-title`,descId=`${id}-${figure.id}-desc`;
        const annotations=[...figure.annotations].sort((a,b)=>{
          const left=artMarkCenter(figure.marks.find(m=>m.id===a.targetId)!),right=artMarkCenter(figure.marks.find(m=>m.id===b.targetId)!);
          return left.y-right.y||left.x-right.x;
        });
        return <figure key={figure.id} className="min-w-0 space-y-3 rounded-xl border border-slate-200 bg-white p-3">
          <h4 className="text-base font-semibold text-slate-900">{artwork.layout==="process"?`${index+1}. `:""}{figure.title}</h4>
          <svg viewBox="0 0 560 280" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby={`${titleId} ${descId}`} className="h-auto w-full" fontFamily="sans-serif">
            <title id={titleId}>{figure.title}</title><desc id={descId}>{figure.explanation}</desc><rect width="560" height="280" fill="white"/>
            <defs><marker id={arrowId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#334155"/></marker></defs>
            <g transform="translate(12 28)">{figure.marks.map(mark=><Mark key={mark.id} mark={mark} arrowId={arrowId}/>)}</g>
            {annotations.map((annotation,i)=>{
              const mark=figure.marks.find(m=>m.id===annotation.targetId)!,center=artMarkCenter(mark),labelY=45+i*78;
              return <g key={annotation.targetId+":"+i}>
                <path d={`M${center.x+12} ${center.y+28}L360 ${labelY}H375`} stroke="#64748b" strokeWidth="1.5" fill="none"/>
                <circle cx={center.x+12} cy={center.y+28} r="10" fill="#1e3a8a"/><text x={center.x+12} y={center.y+32} textAnchor="middle" fontSize="12" fontWeight="bold" fill="white">{i+1}</text>
                <text x="385" y={labelY-3} fontSize="14" fill="#0f172a">{wrap(annotation.label,21).map((line,j)=><tspan key={j} x="385" dy={j?18:0}>{line}</tspan>)}</text>
              </g>;
            })}
          </svg>
          <figcaption className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">{figure.explanation}</figcaption>
          <ol className="list-decimal space-y-2 pl-5 text-sm">{annotations.map((a,i)=><li key={i} className="break-words leading-relaxed"><strong>{a.label}: </strong>{a.explanation}</li>)}</ol>
          <details className="text-sm text-slate-600"><summary className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-blue-600">Ver respaldo en el PDF</summary><blockquote className="mt-2 border-l-2 border-slate-300 pl-3">{figure.evidence}</blockquote>{annotations.map((a,i)=><p key={i} className="mt-2 break-words"><strong>{i+1}. {a.label}: </strong>«{a.evidence}»</p>)}</details>
        </figure>;
      })}
    </div>
    <ul aria-label="Leyenda del gráfico" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">{artwork.legend.map(item=><li key={item.color} className="flex items-center gap-2"><span aria-hidden="true" className="inline-block h-3 w-3 rounded-full border border-slate-500" style={{backgroundColor:ART_COLORS[item.color]}}/>{item.label}</li>)}</ul>
    <p className="rounded-lg border-l-4 border-blue-600 bg-blue-50 p-3 font-medium leading-relaxed text-slate-900">{artwork.takeaway}</p>
    <p className="text-sm leading-relaxed text-slate-600">{artwork.scopeNote}</p>
  </div>;
}
