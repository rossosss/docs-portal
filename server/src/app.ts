import Fastify from 'fastify';
import cors from '@fastify/cors';
import {ZodError} from 'zod';
import {ApiError,type GitHubPort} from './types/index.js';
import {loadConfig} from './config.js';
import {GitHubService,PatCredentialProvider} from './services/github.service.js';
import {DocumentService} from './services/document.service.js';
import {projectsRoute} from './routes/projects.js';
import {documentsRoute} from './routes/documents.js';
import {authorize} from './auth.js';
export async function buildApp(github?:GitHubPort){
 const config=await loadConfig();
 const app=Fastify({logger:{redact:['req.headers.authorization','req.headers.cookie','token']},bodyLimit:128_000});
 await app.register(cors,{origin:config.origins,methods:['GET','POST','PUT']});
 app.addHook('preHandler',authorize);
 app.setErrorHandler((error,request,reply)=>{
  // Log bounded diagnostic fields, never Octokit request objects/headers or document bodies.
  const e=error as Error & {statusCode?:number;status?:number;code?:string;branch?:string;cause?:Error};
  request.log.error({name:e.name,code:e.code,status:e.statusCode??e.status,branch:e.branch,causeName:e.cause?.name},'API request failed');
  if(error instanceof ZodError)return reply.code(400).send({success:false,error:error.issues.map(i=>i.message).join('; '),code:'VALIDATION_ERROR'});
  if(error instanceof ApiError)return reply.code(error.statusCode).send({success:false,error:error.message,code:error.code});
  if(e.statusCode===413)return reply.code(413).send({success:false,error:'Запрос слишком большой',code:'BODY_TOO_LARGE'});
  if(e.statusCode===400)return reply.code(400).send({success:false,error:'Некорректный запрос',code:'INVALID_REQUEST'});
  return reply.code(502).send({success:false,error:e.status===404?'Проект недоступен':'GitHub API недоступен',code:'GITHUB_UNAVAILABLE'});
 });
 const service=github??new GitHubService(new PatCredentialProvider(config.githubToken));
 projectsRoute(app,config.projects,service);
 documentsRoute(app,new DocumentService(config.projects,service));
 app.get('/health',async()=>({status:'ok'}));
 return app;
}

