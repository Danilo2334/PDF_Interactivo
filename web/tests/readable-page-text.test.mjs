import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {PDFDocument} from 'pdf-lib';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {load} from './reinforcement-test-helpers.mjs';
const extraction=load('lib/pdf/extract-selection-text.ts');
class Element {
  children=[];attributes={};
  append(...children){for(const c of children){c.parentElement=this;this.children.push(c);}}
  remove(){this.parentElement.children=this.parentElement.children.filter(c=>c!==this);}
  querySelector(){return this.children[0];}
  getAttribute(k){return this.attributes[k]??null;}setAttribute(k,v){this.attributes[k]=v;}removeAttribute(k){delete this.attributes[k];}
}
function fixture(){
  const figure=new Element(),body=new Element(),canvas=new Element();body.append(canvas);figure.append(body);canvas.setAttribute('aria-describedby','previous');
  const api=load('lib/pdf/readable-page-text.ts',{'./extract-selection-text':extraction},{document:{createElement:()=>new Element()}});
  return {figure,body,canvas,...api};
}

test('HU035 readable alternative uses the real loaded PDF text without changing its bytes and releases its description on redraw',async()=>{
  const pdf=await PDFDocument.create();pdf.addPage([600,800]).drawText('El agua se evapora.',{x:40,y:700,size:16});
  const bytes=await pdf.save(),hash=createHash('sha256').update(bytes).digest('hex');
  const loading=getDocument({data:new Uint8Array(bytes),standardFontDataUrl:fileURLToPath(new URL('../node_modules/pdfjs-dist/standard_fonts/',import.meta.url)).replaceAll('\\','/')});
  try{
    const original=await loading.promise,f=fixture(),page=await original.getPage(1),clear=await f.decorateReadablePageText(page,f.body,'page-one');
    const details=f.figure.children[1];assert.equal(details.children[0].textContent,'Texto digital de la página 1');
    assert.equal(details.children[1].textContent,'El agua se evapora.');assert.equal(f.canvas.getAttribute('aria-describedby'),'page-one');
    assert.equal(createHash('sha256').update(bytes).digest('hex'),hash);assert.equal(original.numPages,1);
    clear();assert.equal(f.figure.children.length,1);assert.equal(f.canvas.getAttribute('aria-describedby'),'previous');
  }finally{await loading.destroy();}
});

test('HU035 unavailable and image-only text alternatives remain honest and do not remove the original canvas',async()=>{
  for(const failed of [false,true]){
    const f=fixture(),page={pageNumber:2,getTextContent:async()=>{if(failed)throw Error('unreadable');return {items:[],styles:{}};},getViewport:()=>({})};
    const clear=await f.decorateReadablePageText(page,f.body,'page-two'),text=f.figure.children[1].children[1].textContent;
    assert.match(text,failed?/No fue posible obtener/:/no dispone de texto digital/);if(!failed)assert.match(text,/no se realizó OCR/);
    assert.equal(f.body.children[0],f.canvas);clear();assert.equal(f.figure.children.length,1);
  }
});
