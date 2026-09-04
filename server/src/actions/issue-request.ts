import fs from 'node:fs/promises';
import {Octokit} from '@octokit/rest';
import {z} from 'zod';
import {loadSources} from '../../../scripts/sources.mjs';
import {createSchema,editSchema} from '../validation/document.schema.js';
import {DocumentService} from '../services/document.service.js';
import {GitHubService,PatCredentialProvider} from '../services/github.service.js';
import {ApiError,type Project} from '../types/index.js';
export const marker='<!-- docs-portal:v1 -->';
const schema=z.discriminatedUnion('operation',[
 createSchema.extend({operation:z.literal('create')}),
 editSchema.extend({operation:z.literal('edit')}),
]);
export function parseRequest(body:string){
 if(body.length>60_000)throw new ApiError(413,'Запрос не более 60000 символов');
 const match=body.match(/^<!-- docs-portal:v1 -->\s*```json\r?\n([\s\S]+)\r?\n```\s*$/);
 if(!match)throw new ApiError(400,'Вставьте полный запрос из Docs Portal без изменения его формата');
 return schema.parse(JSON.parse(match[1]));
}
export function validateTarget(projects:Project[],id:string,repository:string,association:string){
 if(association!=='OWNER')throw new ApiError(403,'В этом PoC запросы обрабатываются только от владельца репозитория');
 const project=projects.find(p=>p.id===id);
 if(!project||project.owner+'/'+project.repository!==repository)throw new ApiError(400,'Проект не соответствует репозиторию запроса');
 return project;
}
async function run(){
 const event=JSON.parse(await fs.readFile(process.env.GITHUB_EVENT_PATH!,'utf8'));
 const issue=event.issue;
 if(!issue||!issue.title.startsWith('[docs-portal]')||issue.pull_request)return;
 const repository=process.env.GITHUB_REPOSITORY!;
 const [owner,repo]=repository.split('/');
 const client=new Octokit({auth:process.env.GITHUB_TOKEN,request:{timeout:15000}});
 const issueMarker='<!-- docs-portal-issue:'+issue.number+' -->';
 try{
  const request=parseRequest(issue.body||'');
  const projects=await loadSources();
  validateTarget(projects,request.projectId,repository,issue.author_association);
  const pulls=await client.paginate(client.pulls.list,{owner,repo,state:'all',per_page:100});
  const previous=pulls.find(p=>p.body?.includes(issueMarker));
  if(previous){console.log('Request already processed:',previous.html_url);return;}
  class IssueGitHubService extends GitHubService{
   override async createPullRequest(p:Project,branch:string,title:string,path:string){
    if(!/^docs\/(add|edit)-[a-z0-9-]+$/.test(branch))throw new ApiError(400,'Недопустимая ветка');
    return (await client.pulls.create({owner:p.owner,repo:p.repository,head:branch,base:'main',
     title:'docs: '+(request.operation==='edit'?'обновить':'добавить')+' "'+title+'"',
     body:issueMarker+'\n\nДокумент подготовлен в Docs Portal и подтверждён владельцем через GitHub Issue.\n\nПуть: `'+path+'`\n\nCloses #'+issue.number,
    })).data;
   }
  }
  const service=new DocumentService(projects,new IssueGitHubService(new PatCredentialProvider(process.env.GITHUB_TOKEN||'')));
  const {operation,...data}=request;
  const result=operation==='create'?await service.create(data):await service.edit(data);
  await client.issues.createComment({owner,repo,issue_number:issue.number,
   body:'Готов Pull Request: '+result.pullRequestUrl+'\n\nФайл: `'+result.path+'`\n\nВетка: `'+result.branch+'`. Изменения появятся на портале после review, merge и сборки.',
  });
  console.log('Created Pull Request:',result.pullRequestUrl);
 }catch(error){
  const message=error instanceof ApiError?error.message:error instanceof z.ZodError?'Некорректные поля запроса. Сформируйте его заново в портале.':'Не удалось обработать запрос. Проверьте журнал workflow и разрешение Actions создавать Pull Request.';
  console.error('Document request failed:',error instanceof Error?error.name:'unknown');
  await client.issues.createComment({owner,repo,issue_number:issue.number,body:'Запрос не выполнен: '+message});
  process.exitCode=1;
 }
}
if(process.env.GITHUB_EVENT_NAME==='issues'&&process.env.GITHUB_EVENT_PATH)await run();
