import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareRequest,readDocument,type Project} from '../../src/services/githubDocs.js';
const p:Project={id:'terminal',name:'Terminal',available:true,sections:['','identification'],repository:'rossosss/terminal-demo',docsPath:'docs'};
const draft={projectId:'terminal',section:'identification',title:'Проверка',slug:'client-check',content:'# Проверка'};
test('static form creates a correctly addressed GitHub issue draft',async()=>{const r=await prepareRequest(p,draft);const url=new URL(r.url);assert.equal(url.origin,'https://github.com');assert.equal(url.pathname,'/rossosss/terminal-demo/issues/new');assert.equal(url.searchParams.get('body'),r.body);assert.match(r.body,/"operation": "create"/);assert.equal(r.path,'docs/identification/client-check.md');});
test('large Markdown uses explicit clipboard handoff instead of oversized URL',async()=>{const r=await prepareRequest(p,{...draft,content:'a'.repeat(7000)});assert.equal(r.needsPaste,true);assert.equal(new URL(r.url).searchParams.has('body'),false);});
test('oversized Issue and unsafe sections are rejected before handoff',async()=>{await assert.rejects(prepareRequest(p,{...draft,content:'a'.repeat(60000)}),/лимит GitHub Issue/);await assert.rejects(prepareRequest(p,{...draft,section:'../'}),/раздел/);});
test('static reader decodes Russian text and sends no authorization token',async t=>{
 t.mock.method(globalThis,'fetch',async(_url:string,init:RequestInit)=>{assert.deepEqual(init.headers,{Accept:'application/vnd.github+json'});return new Response(JSON.stringify({type:'file',size:100,encoding:'base64',sha:'a'.repeat(40),content:Buffer.from('---\ntitle: Проверка\n---\n\n# Текст').toString('base64')}));});
 const doc=await readDocument(p,'docs/payments.md');assert.equal(doc.title,'Проверка');assert.equal(doc.content,'# Текст');
});
test('static edit detects changed SHA before creating an issue',async t=>{
 t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({type:'file',size:10,encoding:'base64',sha:'b'.repeat(40),content:Buffer.from('# Updated').toString('base64')})));
 await assert.rejects(prepareRequest(p,draft,{projectId:p.id,path:'docs/payments.md',title:'Test',content:'Old',sha:'a'.repeat(40)}),/Документ изменился/);
});
