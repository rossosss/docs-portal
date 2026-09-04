import test from 'node:test';
import assert from 'node:assert/strict';
import {slugSchema,sectionSchema,createSchema} from '../src/validation/document.schema.js';
import {buildFilePath,validatePath,findProject,branchName,sectionsFromFiles} from '../src/services/path.service.js';
import {DocumentService,renderDocument,splitDocument} from '../src/services/document.service.js';
import {buildApp} from '../src/app.js';
import {GitHubService,PatCredentialProvider} from '../src/services/github.service.js';
import type {Project,GitHubPort} from '../src/types/index.js';
const p:Project={id:'terminal',name:'Terminal',owner:'demo',repository:'terminal-demo',branch:'main',docsPath:'docs',targetPath:'projects/terminal'};
const sha='a'.repeat(40),changed='b'.repeat(40);
const draft={projectId:'terminal',section:'identification',title:'Проверка клиента',slug:'client-check',content:'# Проверка клиента\n\nТекст'};
class FakeGitHub implements GitHubPort{
 calls:Array<{action:string;branch?:string;path?:string;sha?:string;content?:string}>=[];
 exists=false;fileSha=sha;failure='';baseCalls=0;changedBase=false;
 async getBranchSha(){this.baseCalls++;return this.changedBase&&this.baseCalls>1?changed:sha;}
 async listFiles(){return ['docs/index.md','docs/identification/overview.md',...(this.exists?['docs/identification/client-check.md']:[])];}
 async getFile(_p:Project,path:string){return this.exists&&path==='docs/identification/client-check.md'?{sha:this.fileSha,content:'---\ntitle: Старое\nsidebar_position: 7\n---\n\n# Текст'}:null;}
 async createBranch(_p:Project,branch:string,sha:string){if(this.failure==='branch')throw new Error('upstream');this.calls.push({action:'branch',branch,sha});}
 async createFile(_p:Project,path:string,branch:string,content:string,sha?:string){if(this.failure==='commit')throw new Error('upstream');this.calls.push({action:'commit',path,branch,sha,content});}
 async createPullRequest(_p:Project,branch:string){if(this.failure==='pr')throw new Error('upstream');this.calls.push({action:'pr',branch});return {number:42,html_url:'https://github.com/demo/terminal-demo/pull/42'};}
}
test('slug allowlist',()=>{for(const s of ['client-check','a','pay-2'])assert.ok(slugSchema.safeParse(s).success);for(const s of ['../a','a/b','A','a--b','-a','a.md','a b','а','a'.repeat(81)])assert.ok(!slugSchema.safeParse(s).success,s);});
test('section and path reject traversal',()=>{
 for(const s of ['../x','a/../x','/x','C:/x','x\\y','%2e%2e','x//y','x/.'])assert.ok(!sectionSchema.safeParse(s).success,s);
 for(const s of ['../file.md','docs/../file.md','docs-evil/x.md','/docs/x.md','docs/a%2fb.md','docs/x.mdx','docs/a\\b.md'])assert.throws(()=>validatePath(p,s),s);
});
test('path generation stays inside docsPath',()=>{assert.equal(buildFilePath(p,'identification','client-check'),'docs/identification/client-check.md');assert.equal(buildFilePath({...p,docsPath:'docs/common'},'','intro'),'docs/common/intro.md');});
test('project lookup rejects repository injection and unknown ids',()=>{assert.equal(findProject([p],'terminal'),p);assert.throws(()=>findProject([p],'https://evil.test/repo'));assert.ok(!createSchema.safeParse({...draft,repository:'other'}).success);});
test('branch names unique and never main',()=>{const a=branchName('client-check','add',123),b=branchName('client-check','add',123);assert.match(a,/^docs\/add-client-check-123-[a-f0-9]{8}$/);assert.notEqual(a,b);});
test('sections derive only from Markdown documents',()=>assert.deepEqual(sectionsFromFiles(p,['docs/images/a.png','docs/id/sub/a.md','src/x.md']),['','id','id/sub']));
test('frontmatter quotes title, does not duplicate H1, rejects supplied metadata',()=>{const out=renderDocument('Название: пример',draft.content);assert.equal((out.match(/^# /gm)||[]).length,1);assert.equal(splitDocument(out).metadata.title,'Название: пример');assert.throws(()=>renderDocument('Test','---\ntitle: injected\n---\nbody'));});
test('payload limits count UTF-8 bytes',()=>{assert.ok(!createSchema.safeParse({...draft,title:'a'.repeat(161)}).success);assert.ok(!createSchema.safeParse({...draft,content:'я'.repeat(50001)}).success);});
test('create writes branch, commit, PR in order',async()=>{const gh=new FakeGitHub();const result=await new DocumentService([p],gh).create(draft);assert.equal(result.pullRequestNumber,42);assert.deepEqual(gh.calls.map(c=>c.action),['branch','commit','pr']);assert.ok(gh.calls.every(c=>c.branch!=='main'));assert.equal(gh.calls[1].path,'docs/identification/client-check.md');assert.equal(gh.calls[0].sha,sha);});
test('existing file fails before mutation',async()=>{const gh=new FakeGitHub();gh.exists=true;await assert.rejects(new DocumentService([p],gh).create(draft),/Файл уже существует/);assert.equal(gh.calls.length,0);});
test('unknown section fails before mutation',async()=>{const gh=new FakeGitHub();await assert.rejects(new DocumentService([p],gh).create({...draft,section:'invented'}),/Недопустимый раздел/);assert.equal(gh.calls.length,0);});
test('edit preserves frontmatter and uses file SHA',async()=>{const gh=new FakeGitHub();gh.exists=true;const service=new DocumentService([p],gh);const read=await service.read(p.id,'docs/identification/client-check.md');assert.equal(read.sha,sha);await service.edit({projectId:p.id,path:read.path,expectedSha:read.sha,title:'Новое',content:'# Новое'});assert.equal(gh.calls[1].sha,sha);assert.match(gh.calls[1].content!,/sidebar_position: 7/);assert.match(gh.calls[0].branch!,/^docs\/edit-/);});
test('stale editor SHA fails before mutation',async()=>{const gh=new FakeGitHub();gh.exists=true;gh.fileSha=changed;await assert.rejects(new DocumentService([p],gh).edit({projectId:p.id,path:'docs/identification/client-check.md',expectedSha:sha,title:'Новое',content:'Текст'}),/Документ изменился/);assert.equal(gh.calls.length,0);});
test('main moves during submission: fail before mutation',async()=>{const gh=new FakeGitHub();gh.changedBase=true;await assert.rejects(new DocumentService([p],gh).create(draft),/main обновилась/);assert.equal(gh.calls.length,0);});
test('each upstream mutation has a useful bounded error',async()=>{for(const [failure,message] of [['branch','Не удалось создать ветку'],['commit','Не удалось создать commit'],['pr','Не удалось создать Pull Request']]){const gh=new FakeGitHub();gh.failure=failure;await assert.rejects(new DocumentService([p],gh).create(draft),new RegExp(message));}});
test('GitHub adapter blocks direct main writes before authentication',async()=>{const gh=new GitHubService(new PatCredentialProvider(''));await assert.rejects(gh.createFile(p,'docs/x.md','main','body'),/отдельную docs-ветку/);await assert.rejects(gh.createBranch(p,'main',sha),/отдельную docs-ветку/);});
test('HTTP routes validate, serialize PR, hide internal errors and enforce body size',async()=>{
 const gh=new FakeGitHub(),app=await buildApp(gh);
 try{
  const created=await app.inject({method:'POST',url:'/api/documents',payload:draft});assert.equal(created.statusCode,201);assert.equal(created.json().pullRequestNumber,42);
  const bad=await app.inject({method:'POST',url:'/api/documents',payload:{...draft,section:'../'}});assert.equal(bad.statusCode,400);assert.ok(!bad.body.includes('stack'));
  const big=await app.inject({method:'POST',url:'/api/documents',payload:{...draft,content:'x'.repeat(130000)}});assert.equal(big.statusCode,413);
  const cors=await app.inject({method:'OPTIONS',url:'/api/documents',headers:{origin:'https://evil.test','access-control-request-method':'POST'}});assert.ok(!cors.headers['access-control-allow-origin']);
 }finally{await app.close();}
});
