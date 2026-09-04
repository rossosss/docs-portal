import {parse} from 'yaml';
export interface Project{id:string;name:string;sections:string[];available:boolean;repository:string;docsPath:string}
export interface ExistingDocument{projectId:string;path:string;title:string;content:string;sha:string}
export interface Draft{projectId:string;section:string;title:string;slug:string;content:string}
export interface PreparedRequest{url:string;body:string;needsPaste:boolean;path:string;repository:string}
interface BuildSource{id:string;repository:string;docsPath:string;files:Array<{path:string}>}
export async function loadProjects(url:string,names:Array<{id:string;name:string}>):Promise<Project[]>{
 const response=await fetch(url);if(!response.ok)throw new Error('Не удалось загрузить список проектов');
 const manifest=await response.json() as {sources:BuildSource[]};
 return manifest.sources.map(p=>{
  if(!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(p.repository))throw new Error('Некорректный repository');
  const sections=new Set(['']);
  for(const f of p.files.filter(f=>f.path.endsWith('.md'))){const dirs=f.path.split('/').slice(0,-1);for(let i=1;i<=dirs.length;i++)sections.add(dirs.slice(0,i).join('/'));}
  return {id:p.id,name:names.find(n=>n.id===p.id)?.name||p.id,sections:[...sections].sort(),available:true,repository:p.repository,docsPath:p.docsPath};
 });
}
export async function readDocument(p:Project,path:string):Promise<ExistingDocument>{
 if(!path.startsWith(p.docsPath+'/')||!path.endsWith('.md')||path.split('/').some(v=>!/^[-a-zA-Z0-9_][-a-zA-Z0-9_.]*$/.test(v)||v==='..'||v==='.')||path.includes('%'))throw new Error('Недопустимый путь документа');
 const response=await fetch('https://api.github.com/repos/'+p.repository+'/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref=main',{headers:{Accept:'application/vnd.github+json'}});
 if(!response.ok)throw new Error(response.status===403?'GitHub ограничил частоту запросов. Повторите позже.':'Не удалось прочитать документ в GitHub');
 const file=await response.json();if(file.type!=='file'||file.size>128000||file.encoding!=='base64')throw new Error('Неподдерживаемый файл');
 const raw=new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0)));
 const front=raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/),meta=front?parse(front[1]):{};
 return {projectId:p.id,path,sha:file.sha,title:String(meta?.title||path.split('/').pop()),content:front?raw.slice(front[0].length).replace(/^\s*\n/,''):raw};
}
export async function prepareRequest(p:Project,draft:Draft,existing?:ExistingDocument):Promise<PreparedRequest>{
 if(!draft.title.trim()||draft.title.length>160)throw new Error('Название: от 1 до 160 символов');
 if(new TextEncoder().encode(draft.content).length>100000)throw new Error('Markdown не более 100 KB');
 if(/^\s*---\r?\n/.test(draft.content))throw new Error('Вводите Markdown без frontmatter');
 if(!existing&&(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)||!p.sections.includes(draft.section)))throw new Error('Некорректный slug или раздел');
 if(existing&&(await readDocument(p,existing.path)).sha!==existing.sha)throw new Error('Документ изменился после открытия редактора. Обновите страницу и повторите изменения.');
 const path=existing?.path||[p.docsPath,draft.section,draft.slug+'.md'].filter(Boolean).join('/');
 const payload=existing?{operation:'edit',projectId:p.id,path,expectedSha:existing.sha,title:draft.title,content:draft.content}:{operation:'create',...draft,projectId:p.id};
 const body='<!-- docs-portal:v1 -->\n```json\n'+JSON.stringify(payload,null,2)+'\n```';
 if(body.length>60000)throw new Error('Запрос превышает лимит GitHub Issue: 60000 символов. Разделите документ.');
 const url=new URL('https://github.com/'+p.repository+'/issues/new');url.searchParams.set('title','[docs-portal] '+draft.title);
 const full=new URL(url);full.searchParams.set('body',body);const needsPaste=full.href.length>6000;
 return {url:needsPaste?url.href:full.href,body,needsPaste,path,repository:p.repository};
}

