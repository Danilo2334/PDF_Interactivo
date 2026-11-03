import {randomUUID} from 'node:crypto';
import {load,owner,other,projectId,documentId} from './reinforcement-test-helpers.mjs';
import {schemas as reviews} from './example-test-helpers.mjs';
import {schemas as visualSchemas} from './visual-test-helpers.mjs';
import {schemas as summarySchemas} from './summary-test-helpers.mjs';
import {validation} from './reinforcement-test-helpers.mjs';
export {load,owner,other,projectId,documentId};
export const schemas=load('lib/validations/reader.ts'),quizzes=load('lib/validations/quiz.ts',{'@/lib/validations/example':reviews});
export const model=load('lib/readers/model.ts',{'@/lib/validations/quiz':quizzes,'@/lib/validations/reinforcement-request':validation,
 '@/lib/validations/reinforcement-media':load('lib/validations/reinforcement-media.ts'),'@/lib/validations/reader':schemas,
 '@/lib/validations/visual':visualSchemas,'@/lib/validations/summary':summarySchemas});
export const sessions=load('lib/readers/session.ts');
export const id=randomUUID(),sourceId=randomUUID(),requestId=randomUUID(),quizId=randomUUID(),mediaId=randomUUID(),publicationId=randomUUID();
export const snapshot={schemaVersion:1,name:'QA-reader',requireIdentification:false,document:{id:documentId,storagePath:owner+'/original.pdf',name:'QA.pdf',sizeBytes:100},items:[{
 id,requestId,sourceVersionId:sourceId,pageNumber:1,title:'Approved conservation',initialExpanded:true,selection:null,content:{type:'explanation',text:'Fixed approved text.',privateOwnerNote:'DO_NOT_SERIALIZE'},
 media:[{id:mediaId,reinforcement_id:id,approved_version_id:sourceId,owner_id:owner,document_id:documentId,status:'approved',kind:'image',title:'Energy diagram',storage_path:owner+'/image.png',url:null,mime_type:'image/png',size_bytes:64}],
 quiz:{id:quizId,version:1,content:{title:'Check conservation',allowRetries:false,questions:[{prompt:'What happens to the total energy?',options:['Conserved','Disappears'],correctIndex:0,explanation:'PRIVATE_FEEDBACK. The energy remains constant.',sourceQuote:'The total energy is constant.'}]}}
}]};
export const context={id:publicationId,projectId,documentId,ownerId:owner,version:4,hash:'a'.repeat(64),snapshot,privateTest:true,db:{}};
