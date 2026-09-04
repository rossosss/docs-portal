import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {root,loadSources,localPath} from './sources.mjs';
const git=(args,cwd,env=process.env)=>execFileSync('git',args,{cwd,encoding:'utf8',env,stdio:['ignore','pipe','pipe']}).trim();
const stage=await fs.mkdtemp(path.join(root,'.docs-stage-'));
const scratch=await fs.mkdtemp(path.join(os.tmpdir(),'docs-clones-'));
const pages={},sources=[];
const hash=b=>createHash('sha256').update(b).digest('hex');
try{
  const projects=await loadSources();
  for(const p of projects){
    let checkout=localPath(p),mode='local';
    if(!checkout){
      mode='git'; checkout=path.join(scratch,p.id);
      const env={...process.env,GIT_TERMINAL_PROMPT:'0'};
      const token=process.env.DOCS_READ_TOKEN;
      if(token){
        env.GIT_CONFIG_COUNT='1';env.GIT_CONFIG_KEY_0='http.https://github.com/.extraheader';
        env.GIT_CONFIG_VALUE_0='AUTHORIZATION: basic '+Buffer.from('x-access-token:'+token).toString('base64');
      }
      git(['clone','--depth','1','--branch',p.branch,'--single-branch','https://github.com/'+p.owner+'/'+p.repository+'.git',checkout],root,env);
    }
    let commit=null,dirty=true;
    try{
      const gitRoot=git(['rev-parse','--show-toplevel'],checkout);
      if(path.resolve(gitRoot)!==path.resolve(checkout)) throw new Error('Not an independent repository');
      commit=git(['rev-parse','HEAD'],checkout);
      dirty=git(['status','--porcelain','--untracked-files=all','--',p.docsPath],checkout).length>0;
    }catch{ if(mode==='git'||process.env.CI) throw new Error('Cannot resolve source SHA: '+p.id); }
    if(process.env.CI && dirty) throw new Error('Dirty source in CI: '+p.id);
    const sourceDir=path.join(checkout,p.docsPath),dest=path.join(stage,p.targetPath);
    // Reject symlinked roots and intermediate directories as well as symlinked files.
    let cursor=checkout;
    for(const segment of p.docsPath.split('/')){
      cursor=path.join(cursor,segment);
      if((await fs.lstat(cursor)).isSymbolicLink()) throw new Error('Symlink source: '+p.id);
    }
    const entries=[];
    async function copy(dir,rel=''){
      for(const ent of (await fs.readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)){
        const r=rel?rel+'/'+ent.name:ent.name,src=path.join(dir,ent.name),target=path.join(dest,r);
        if(ent.isSymbolicLink()) throw new Error('Symlinks are forbidden: '+p.id+'/'+r);
        if(ent.isDirectory()){await fs.mkdir(target,{recursive:true});await copy(src,r);}
        else if(ent.isFile()){
          const data=await fs.readFile(src);
          entries.push({path:r,sha256:hash(data)});
          await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,data);
          if(/\.mdx?$/.test(r)) pages[p.targetPath+'/'+r]={
            sourceProject:p.id,sourceRepository:p.owner+'/'+p.repository,
            sourcePath:p.docsPath+'/'+r,sourceCommit:commit,dirty,
            sha256:hash(data),branch:p.branch,
          };
        }
      }
    }
    await copy(sourceDir);
    if(!entries.some(e=>/\.mdx?$/.test(e.path))) throw new Error('No documents: '+p.id);
    await fs.writeFile(path.join(dest,'_category_.json'),JSON.stringify({label:p.name,position:p.targetPath==='common'?1:projects.indexOf(p)+1}));
    sources.push({id:p.id,repository:p.owner+'/'+p.repository,commit,dirty,mode,docsPath:p.docsPath,treeSha256:hash(JSON.stringify(entries)),files:entries});
    console.log('Collected',p.id,commit??'uncommitted local directory',dirty?'(working tree)':'');
  }
  await fs.mkdir(path.join(stage,'projects'),{recursive:true});
  await fs.writeFile(path.join(stage,'projects','_category_.json'),JSON.stringify({label:'Проекты',position:2}));
  // Publish only after every required source has succeeded.
  await fs.rm(path.join(root,'generated-docs'),{recursive:true,force:true});
  await fs.rename(stage,path.join(root,'generated-docs'));
  await fs.writeFile(path.join(root,'generated-docs','.gitkeep'),'');
  await fs.mkdir(path.join(root,'static'),{recursive:true});
  await fs.writeFile(path.join(root,'static','source-manifest.json'),JSON.stringify(pages,null,2));
  await fs.writeFile(path.join(root,'.collection.json'),JSON.stringify({generatedAt:new Date().toISOString(),sources},null,2));
  await import('./generate-build-manifest.mjs');
}catch(error){
  // Do not print command environment or raw Git errors which can contain credentials.
  console.error('Collection failed:',error instanceof Error ? error.message.split('\n')[0].replace(/https:\/\/[^ ]+/g,'[repository]') : 'unknown error');
  process.exitCode=1;
}finally{
  await fs.rm(stage,{recursive:true,force:true});await fs.rm(scratch,{recursive:true,force:true});
}
