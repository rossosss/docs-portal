import fs from 'node:fs/promises';
import path from 'node:path';
import type {FastifyInstance} from 'fastify';
import type {Project,GitHubPort} from '../types/index.js';
import {localPath} from '../config.js';
import {sectionsFromFiles} from '../services/path.service.js';
export function projectsRoute(app:FastifyInstance,projects:Project[],github:GitHubPort){
 app.get('/api/projects',async()=>{
  return {projects:await Promise.all(projects.map(async p=>{
   try{
    let files:string[]=[];const local=localPath(p);
    if(local){
     async function walk(dir:string,relative:string){
      for(const e of await fs.readdir(dir,{withFileTypes:true})){
       if(e.isSymbolicLink())continue;
       const r=relative+'/'+e.name;
       if(e.isDirectory())await walk(path.join(dir,e.name),r);else files.push(r);
      }
     }
     await walk(path.join(local,p.docsPath),p.docsPath);
    }else files=await github.listFiles(p,await github.getBranchSha(p));
    return {id:p.id,name:p.name,sections:sectionsFromFiles(p,files),available:true};
   }catch(error){app.log.warn({project:p.id,error:error instanceof Error?error.message:'unknown'},'Project unavailable');return {id:p.id,name:p.name,sections:[],available:false,error:'Проект недоступен'};}
  }))};
 });
}

