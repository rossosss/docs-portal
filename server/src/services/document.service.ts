import {parse,stringify} from 'yaml';
import {createSchema,editSchema} from '../validation/document.schema.js';
import {ApiError,type GitHubPort,type Project} from '../types/index.js';
import {findProject,buildFilePath,branchName,validatePath,sectionsFromFiles} from './path.service.js';
const conflict=()=>new ApiError(409,'Документ изменился после открытия редактора. Обновите страницу и повторите изменения.','DOCUMENT_CHANGED');
export function splitDocument(raw:string):{metadata:Record<string,unknown>;content:string}{
 const match=raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
 if(!match)return {metadata:{},content:raw};
 const metadata=parse(match[1]);
 if(!metadata||typeof metadata!=='object'||Array.isArray(metadata))throw new ApiError(400,'Некорректный frontmatter');
 return {metadata,content:raw.slice(match[0].length).replace(/^\s*\n/,'')};
}
export function renderDocument(title:string,content:string,metadata:Record<string,unknown>={}){
 if(/^\s*---\r?\n/.test(content))throw new ApiError(400,'Вводите Markdown без frontmatter: метаданные формируются автоматически','FRONTMATTER_NOT_ALLOWED');
 // H1 is never injected. Docusaurus displays the title from frontmatter if the body has no H1.
 return '---\n'+stringify({...metadata,title,sidebar_label:title})+'---\n\n'+content.trim()+'\n';
}
export class DocumentService{
 constructor(private projects:Project[],private github:GitHubPort){}
 async read(id:string,path:string){
  const p=findProject(this.projects,id);validatePath(p,path);
  const commit=await this.github.getBranchSha(p);
  const files=await this.github.listFiles(p,commit);
  if(!files.includes(path))throw new ApiError(404,'Документ не найден');
  const f=await this.github.getFile(p,path,commit);if(!f)throw new ApiError(404,'Документ не найден');
  const {metadata,content}=splitDocument(f.content);
  return {projectId:id,path,sha:f.sha,commit,title:String(metadata.title??path.split('/').pop()),content};
 }
 async create(input:unknown){
  const d=createSchema.parse(input),p=findProject(this.projects,d.projectId);
  const path=buildFilePath(p,d.section,d.slug),body=renderDocument(d.title,d.content);
  const base=await this.github.getBranchSha(p),files=await this.github.listFiles(p,base);
  if(!sectionsFromFiles(p,files).includes(d.section))throw new ApiError(400,'Недопустимый раздел');
  if(files.some(f=>f.toLowerCase()===path.toLowerCase())||await this.github.getFile(p,path,base))
   throw new ApiError(409,'Файл уже существует','FILE_EXISTS');
  return this.submit(p,path,d.title,body,branchName(d.slug),base);
 }
 async edit(input:unknown){
  const d=editSchema.parse(input),p=findProject(this.projects,d.projectId);validatePath(p,d.path);
  const base=await this.github.getBranchSha(p),files=await this.github.listFiles(p,base);
  if(!files.includes(d.path))throw conflict();
  const file=await this.github.getFile(p,d.path,base);
  if(!file||file.sha!==d.expectedSha)throw conflict();
  const {metadata}=splitDocument(file.content);
  const body=renderDocument(d.title,d.content,metadata);
  const stem=d.path.split('/').pop()!.slice(0,-3).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70).replace(/-$/,'')||'document';
  return this.submit(p,d.path,d.title,body,branchName(stem,'edit'),base,file.sha);
 }
 private async submit(p:Project,path:string,title:string,body:string,branch:string,base:string,fileSha?:string){
  // Detect changes between opening the editor, snapshot validation, and branch creation.
  const latest=await this.github.getBranchSha(p);
  if(latest!==base){
   const current=await this.github.getFile(p,path,latest);
   if(fileSha ? current?.sha!==fileSha : current!==null)throw conflict();
   // Even unrelated main changes require retry; never create a stale snapshot silently.
   throw new ApiError(409,'Ветка main обновилась. Повторите отправку.','BASE_CHANGED');
  }
  try{await this.github.createBranch(p,branch,base);}
  catch(e){throw Object.assign(new ApiError(502,'Не удалось создать ветку','BRANCH_FAILED'),{cause:e});}
  try{await this.github.createFile(p,path,branch,body,fileSha);}
  catch(e){throw Object.assign(new ApiError(502,'Не удалось создать commit','COMMIT_FAILED'),{cause:e,branch});}
  try{
   const pr=await this.github.createPullRequest(p,branch,title,path);
   return {success:true,repository:p.owner+'/'+p.repository,branch,path,pullRequestNumber:pr.number,pullRequestUrl:pr.html_url};
  }catch(e){throw Object.assign(new ApiError(502,'Не удалось создать Pull Request','PR_FAILED'),{cause:e,branch});}
 }
}
