import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {root} from './sources.mjs';
test('collector records clean SHAs and exact provenance; missing source fails without partial publication',async()=>{
 const fixture=await fs.mkdtemp(path.join(root,'.collector-test-'));
 try{
  const portal=path.join(fixture,'portal'),repo=path.join(fixture,'source');
  await fs.mkdir(path.join(portal,'scripts'),{recursive:true});await fs.mkdir(path.join(repo,'docs'),{recursive:true});
  for(const file of ['sources.mjs','collect-docs.mjs','generate-build-manifest.mjs'])await fs.copyFile(path.join(root,'scripts',file),path.join(portal,'scripts',file));
  await fs.writeFile(path.join(portal,'sources.yml'),'projects:\n  - id: fixture\n    name: Fixture\n    owner: demo\n    repository: fixture\n    branch: main\n    docsPath: docs\n    targetPath: projects/fixture\n');
  await fs.writeFile(path.join(repo,'docs','index.md'),'# Original\n');
  const git=args=>execFileSync('git',args,{cwd:repo,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  git(['init','-b','main']);git(['add','.']);git(['-c','user.name=PoC test','-c','user.email=poc@example.invalid','commit','-m','fixture']);
  const sha=git(['rev-parse','HEAD']);
  const env={...process.env,LOCAL_FIXTURE_PATH:repo,CI:'true'};
  const run=()=>spawnSync(process.execPath,['scripts/collect-docs.mjs'],{cwd:portal,env,encoding:'utf8'});
  const good=run();assert.equal(good.status,0,good.stderr);
  const manifest=JSON.parse(await fs.readFile(path.join(portal,'static','build-manifest.json'),'utf8'));
  assert.equal(manifest.sources[0].commit,sha);assert.equal(manifest.sources[0].dirty,false);
  const provenance=JSON.parse(await fs.readFile(path.join(portal,'static','source-manifest.json'),'utf8'));
  assert.equal(provenance['projects/fixture/index.md'].sourcePath,'docs/index.md');
  assert.equal(provenance['projects/fixture/index.md'].sourceCommit,sha);
  await fs.writeFile(path.join(repo,'docs','index.md'),'# Changed\n');
  assert.notEqual(run().status,0,'CI must reject dirty docs');
  env.CI='';assert.equal(run().status,0);
  const dirty=JSON.parse(await fs.readFile(path.join(portal,'static','build-manifest.json'),'utf8'));assert.equal(dirty.sources[0].dirty,true);
  env.LOCAL_FIXTURE_PATH=path.join(fixture,'missing');
  assert.notEqual(run().status,0,'missing source must fail');
  assert.equal(await fs.readFile(path.join(portal,'generated-docs','projects','fixture','index.md'),'utf8'),'# Changed\n');
 }finally{await fs.rm(fixture,{recursive:true,force:true});}
});

