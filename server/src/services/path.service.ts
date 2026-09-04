import {posix} from 'node:path';
import {randomUUID} from 'node:crypto';
import {slugSchema,sectionSchema} from '../validation/document.schema.js';
import {ApiError,type Project} from '../types/index.js';
export function findProject(projects:Project[],id:string):Project{
 const p=projects.find(p=>p.id===id);if(!p)throw new ApiError(404,'Проект недоступен','PROJECT_UNAVAILABLE');return p;
}
export function validatePath(p:Project,file:string):string{
 const parts=file.split('/');
 if(file.includes('\\')||file.includes('%')||parts.some(s=>!s||s==='.'||s==='..'||!/^[-a-zA-Z0-9_][-a-zA-Z0-9_.]*$/.test(s)||s.endsWith('.'))||
 !file.startsWith(p.docsPath+'/')||!file.endsWith('.md')||posix.normalize(file)!==file)
 throw new ApiError(400,'Недопустимый путь документа','INVALID_PATH');
 return file;
}
export function buildFilePath(p:Project,section:string,slug:string):string{
 sectionSchema.parse(section);slugSchema.parse(slug);
 return validatePath(p,[p.docsPath,section,slug+'.md'].filter(Boolean).join('/'));
}
export function branchName(slug:string,operation:'add'|'edit'='add',now=Date.now()):string{
 slugSchema.parse(slug);return 'docs/'+operation+'-'+slug+'-'+now+'-'+randomUUID().slice(0,8);
}
export function sectionsFromFiles(p:Project,files:string[]):string[]{
 const sections=new Set<string>(['']);
 for(const file of files){
  if(!file.startsWith(p.docsPath+'/')||!file.endsWith('.md'))continue;
  const dirs=file.slice(p.docsPath.length+1).split('/').slice(0,-1);
  for(let n=1;n<=dirs.length;n++){const s=dirs.slice(0,n).join('/');if(sectionSchema.safeParse(s).success)sections.add(s);}
 }
 return [...sections].sort();
}

