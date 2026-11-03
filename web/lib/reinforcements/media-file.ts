import "server-only";
import { mediaFileMetadata } from "@/lib/validations/reinforcement-media";

// Content sniffing rejects renamed HTML/SVG and truncated containers. Browser
// decoding remains necessary for preview; this does not promise malware scanning.
export function validMediaBytes(bytes: Uint8Array, mime: string): boolean {
  const b = Buffer.from(bytes);
  if (mime === "image/png") return b.length >= 45 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    && b.toString("ascii",12,16) === "IHDR" && b.readUInt32BE(8) === 13
    && b.readUInt32BE(16) > 0 && b.readUInt32BE(20) > 0 && b.readUInt32BE(16) * b.readUInt32BE(20) <= 16000000
    && b.toString("ascii",b.length-8,b.length-4) === "IEND";
  if (mime === "image/jpeg") {
    if (b.length < 20 || b[0] !== 255 || b[1] !== 216 || b.at(-2) !== 255 || b.at(-1) !== 217) return false;
    let p=2, hasFrame=false;
    while (p+4 < b.length) {
      if (b[p++] !== 255) return false; const marker=b[p++];
      if (marker === 218) return hasFrame;
      const length=b.readUInt16BE(p); if (length<2 || p+length>b.length) return false;
      if ([192,193,194].includes(marker)) {
        if (length<8) return false; const h=b.readUInt16BE(p+3),w=b.readUInt16BE(p+5);
        if (!w || !h || w*h>16000000) return false; hasFrame=true;
      }
      p+=length;
    }
    return false;
  }
  if (mime !== "video/mp4" || b.length < 64) return false;
  let p=0, ftyp=false, moov=false, mdat=false;
  while (p+8<=b.length) {
    const length=b.readUInt32BE(p),type=b.toString("ascii",p+4,p+8);
    if (length<8 || p+length>b.length) return false;
    if (p===0) { if (type!=="ftyp" || length<16 || !["isom","iso2","mp41","mp42","avc1","M4V ","dash"].includes(b.toString("ascii",p+8,p+12))) return false; ftyp=true; }
    if (type==="moov") moov=length>32 && ["trak","mvhd","vide"].every(marker => b.subarray(p+8,p+length).includes(Buffer.from(marker)));
    if (type==="mdat") mdat=length>8;
    p+=length;
  }
  return ftyp && moov && mdat && p===b.length;
}
export async function validateMediaFile(file: File) {
  const meta=mediaFileMetadata(file); if (meta.error !== undefined) return { error: meta.error };
  const bytes=new Uint8Array(await file.arrayBuffer());
  return validMediaBytes(bytes,meta.mime) ? { ...meta, bytes } : { error: "El contenido del archivo está dañado o no corresponde al formato permitido." };
}
