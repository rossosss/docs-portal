import React,{useEffect,useState} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {loadProjects,readDocument,prepareRequest,type Project,type ExistingDocument,type PreparedRequest} from '../../services/githubDocs';
import ProjectSelector from '../ProjectSelector';
import MarkdownEditor from '../MarkdownEditor';
import MarkdownPreview from '../MarkdownPreview';
export default function DocumentForm({edit=false}:{edit?:boolean}){
 const {siteConfig}=useDocusaurusContext(),manifestUrl=useBaseUrl('/build-manifest.json');
 const names=siteConfig.customFields?.projects as Array<{id:string;name:string}>;
 const [projects,setProjects]=useState<Project[]>([]),[projectId,setProject]=useState(''),[section,setSection]=useState('');
 const [title,setTitle]=useState(''),[slug,setSlug]=useState(''),[content,setContent]=useState('');
 const [existing,setExisting]=useState<ExistingDocument|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[result,setResult]=useState<PreparedRequest|null>(null),[copied,setCopied]=useState(false);
 useEffect(()=>{
  let active=true;
  async function load(){
   try{
    const list=await loadProjects(manifestUrl,names);if(!active)return;setProjects(list);
    if(edit){
     const query=new URLSearchParams(window.location.search),id=query.get('project'),path=query.get('path'),project=list.find(p=>p.id===id);
     if(!project||!path)throw new Error('В ссылке не указан допустимый проект или путь');
     const doc=await readDocument(project,path);if(active){setExisting(doc);setProject(project.id);setTitle(doc.title);setContent(doc.content);}
    }else setProject(list[0]?.id||'');
   }catch(e){if(active)setError((e as Error).message);}finally{if(active)setLoading(false);}
  }
  void load();return()=>{active=false;};
 },[manifestUrl,names,edit]);
 const project=projects.find(p=>p.id===projectId);
 async function submit(event:React.FormEvent){
  event.preventDefault();if(!project)return;setError('');setBusy(true);
  try{setResult(await prepareRequest(project,{projectId,section,title,slug,content},existing||undefined));setCopied(false);}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 async function copy(){try{await navigator.clipboard.writeText(result!.body);setCopied(true);}catch{setError('Скопируйте запрос из поля ниже вручную.');}}
 if(loading)return <p role="status">Загрузка проекта…</p>;
 return <form onSubmit={submit}>
 {error&&<div className="notice error" role="alert">{error}</div>}
 {result?<section className="notice success" aria-label="Подтверждение GitHub">
 <h2>Подтвердите запрос в GitHub</h2><p>{result.repository} · {result.path}</p>
 <p>Откройте запрос и нажмите <strong>Create / Submit new issue</strong>. GitHub Action проверит документ и добавит в комментарий ссылку на Pull Request.</p>
 {result.needsPaste&&<><p>Документ слишком большой для ссылки: скопируйте запрос и вставьте его в описание Issue.</p>
 <button type="button" className="button button--secondary" onClick={()=>void copy()}>{copied?'Запрос скопирован':'Скопировать запрос'}</button>
 <label className="field">Подготовленный запрос<textarea readOnly value={result.body} rows={6}/></label></>}
 <p><a className="button button--primary" href={result.url} target="_blank" rel="noreferrer">Открыть запрос в GitHub ↗</a></p>
 <p>Запрос должен быть создан владельцем репозитория. Изменения публикуются после review и merge PR.</p>
 <button type="button" className="button button--secondary" onClick={()=>setResult(null)}>Вернуться к редактированию</button>
 </section>:<>
 {edit?<div className="notice">{existing?existing.projectId+' / '+existing.path+' · '+existing.sha.slice(0,8):'Не удалось загрузить документ.'}</div>:<div className="form-grid">
 <ProjectSelector projects={projects} value={projectId} onChange={value=>{setProject(value);setSection('');}} disabled={busy}/>
 <label className="field">Раздел<select value={section} onChange={e=>setSection(e.target.value)} disabled={busy||!project}>{project?.sections.map(s=><option key={s} value={s}>{s||'Корень документации'}</option>)}</select></label></div>}
 <div className="form-grid"><label className="field">Название документа<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={160} required disabled={busy}/></label>
 {!edit&&<label className="field">Slug<input value={slug} onChange={e=>setSlug(e.target.value)} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} placeholder="client-check" required disabled={busy}/></label>}</div>
 <div className="editor-grid"><MarkdownEditor value={content} onChange={setContent} disabled={busy}/><MarkdownPreview content={content}/></div>
 <button className="button button--primary button--lg" type="submit" disabled={busy||(edit?!existing:!project)}>{busy?'Проверяем документ…':'Подготовить Pull Request'}</button>
 <p style={{marginTop:12}}>Следующий шаг — подтверждение запроса в GitHub. Отдельный сервер и личный токен не нужны.</p>
 </>}
 </form>;
}
