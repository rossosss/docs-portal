import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {root,loadSources} from './sources.mjs';
const build=path.join(root,'build');
const projects=await loadSources();
for(const route of ['index.html','create-document/index.html','edit-document/index.html',...projects.map(p=>'docs/'+p.targetPath+'/index.html')]){
 const html=await fs.readFile(path.join(build,route),'utf8');
 assert.ok(html.includes('Docs Portal'),route+' has rendered content');
 assert.ok(!html.includes('Internal Server Error'),route);
}
const manifest=JSON.parse(await fs.readFile(path.join(build,'build-manifest.json'),'utf8'));
assert.equal(manifest.sources.length,projects.length);
const pages=JSON.parse(await fs.readFile(path.join(build,'source-manifest.json'),'utf8'));
for(const project of projects)assert.ok(Object.values(pages).some(p=>p.sourceProject===project.id));
for(const source of Object.values(pages))assert.ok(source.sourceProject&&source.sourcePath&&source.sha256);
async function walk(dir){
 for(const entry of await fs.readdir(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);
  if(entry.isDirectory())await walk(file);
  else{
   assert.ok(!entry.name.startsWith('.env'),'env file leaked into build');
   if(/\.(js|html|json|css)$/.test(entry.name)){
    const text=await fs.readFile(file,'utf8');
    assert.ok(!text.includes('POC_TOKEN_DO_NOT_BUNDLE'),'server token leaked into build');
   }
  }
 }
}
await walk(build);
console.log('PASS: static routes, all source manifests, provenance, no .env or sentinel token in build');
