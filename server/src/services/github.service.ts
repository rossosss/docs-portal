import {Octokit} from '@octokit/rest';
import {ApiError,type Project,type GitHubPort} from '../types/index.js';
export interface CredentialProvider{getToken():Promise<string>}
export class PatCredentialProvider implements CredentialProvider{
 constructor(private token:string){}
 async getToken(){if(!this.token)throw new ApiError(503,'GitHub API не настроен: требуется токен','GITHUB_NOT_CONFIGURED');return this.token;}
}
export class GitHubService implements GitHubPort{
 constructor(private credentials:CredentialProvider){}
 private async client(){return new Octokit({auth:await this.credentials.getToken(),request:{timeout:15000}});}
 private repo(p:Project){return {owner:p.owner,repo:p.repository};}
 async getBranchSha(p:Project){return (await (await this.client()).git.getRef({...this.repo(p),ref:'heads/main'})).data.object.sha;}
 async listFiles(p:Project,ref:string){
  const {data}=await (await this.client()).git.getTree({...this.repo(p),tree_sha:ref,recursive:'1'});
  if(data.truncated)throw new ApiError(503,'Дерево проекта слишком большое','TREE_TRUNCATED');
  return data.tree.filter(e=>e.type==='blob'&&(e.mode==='100644'||e.mode==='100755')).map(e=>e.path!).filter(Boolean);
 }
 async getFile(p:Project,path:string,ref:string){
  try{
   const {data}=await (await this.client()).repos.getContent({...this.repo(p),path,ref});
   if(Array.isArray(data)||data.type!=='file'||!('content' in data))throw new ApiError(400,'Путь не является обычным файлом');
   if(data.size>100_000)throw new ApiError(413,'Markdown не более 100 KB');
   return {sha:data.sha,content:Buffer.from(data.content,'base64').toString('utf8')};
  }catch(e){if((e as {status?:number}).status===404)return null;throw e;}
 }
 async fileExists(p:Project,path:string,ref:string){return (await this.getFile(p,path,ref))!==null;}
 async createBranch(p:Project,branch:string,sha:string){
  this.assertBranch(branch);await (await this.client()).git.createRef({...this.repo(p),ref:'refs/heads/'+branch,sha});
 }
 private assertBranch(branch:string){if(!/^docs\/(add|edit)-[a-z0-9-]+$/.test(branch))throw new ApiError(400,'Запись разрешена только в отдельную docs-ветку');}
 async createFile(p:Project,path:string,branch:string,content:string,sha?:string){
  this.assertBranch(branch);
  await (await this.client()).repos.createOrUpdateFileContents({...this.repo(p),path,branch,
   message:'docs: '+(sha?'обновить ':'добавить ')+path,content:Buffer.from(content,'utf8').toString('base64'),...(sha?{sha}:{})});
 }
 async createPullRequest(p:Project,branch:string,title:string,path:string){
  this.assertBranch(branch);
  return (await (await this.client()).pulls.create({...this.repo(p),head:branch,base:'main',
   title:'docs: '+(branch.startsWith('docs/edit-')?'обновить':'добавить')+' "'+title+'"',
   body:'Документ создан через Docs Portal.\n\nПроект: '+p.name+'\n\nПуть:\n'+String.fromCharCode(96)+path+String.fromCharCode(96)})).data;
 }
}

