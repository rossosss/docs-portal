import React,{useEffect,useMemo,useState} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {docsApi,type Project,type ExistingDocument,type Result} from '../../services/docsApi';
import ProjectSelector from '../ProjectSelector';
import MarkdownEditor from '../MarkdownEditor';
import MarkdownPreview from '../MarkdownPreview';
export default function DocumentForm({edit=false}:{edit?:boolean}){
 const {siteConfig}=useDocusaurusContext();
 const apiUrl=String(siteConfig.customFields?.docsApiUrl||'');
 const api=useMemo(()=>docsApi(apiUrl),[apiUrl]);
 const [projects,setProjects]=useState<Project[]>([]),[projectId,setProject]=useState(''),[section,setSection]=useState('');
 const [title,setTitle]=useState(''),[slug,setSlug]=useState(''),[content,setContent]=useState('');
 const [existing,setExisting]=useState<ExistingDocument|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[result,setResult]=useState<Result|null>(null);
 useEffect(()=>{
  let active=true;
 async function load(){
   try{
    if(!apiUrl)return;
    if(edit){
     const q=new URLSearchParams(window.location.search),id=q.get('project'),path=q.get('path');
     if(!id||!path)throw new Error('В ссылке не указан проект или путь документа.');
     const doc=await api.read(id,path);
     if(active){setExisting(doc);setProject(id);setTitle(doc.title);setContent(doc.content);}
    }else{
     const data=await api.projects();if(active){setProjects(data.projects);setProject(data.projects.find(p=>p.available)?.id||'');}
    }
   }catch(e){if(active)setError((e as Error).message);}finally{if(active)setLoading(false);}
  }
  void load();return()=>{active=false;};
 },[api,apiUrl,edit]);
 const project=projects.find(p=>p.id===projectId);
 async function submit(e:React.FormEvent){
  e.preventDefault();setError('');setBusy(true);setResult(null);
  try{
   if(new TextEncoder().encode(content).length>100000)throw new Error('Markdown не более 100 KB');
   const response=edit&&existing?await api.edit(existing,title,content):await api.create({projectId,section,title,slug,content});
   setResult(response);
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 if(!apiUrl)return <div className="notice" role="status"><h2>Редактор пока не подключён</h2><p>Документация уже опубликована. Для создания и редактирования документов нужно подключить Docs API.</p><p>До подключения API можно предложить изменение через ссылку «Открыть в GitHub» на странице документа.</p></div>;
 if(loading)return <p role="status">Загрузка проекта…</p>;
 return <form onSubmit={submit}>
 {error&&<div className="notice error" role="alert">{error}</div>}
 {result?<div className="notice success" role="status"><h2>Документ отправлен на проверку</h2><p>{result.repository} · {result.path}</p><a href={result.pullRequestUrl} target="_blank" rel="noreferrer">Открыть Pull Request #{result.pullRequestNumber} ↗</a><p>После review и merge документация появится в следующей сборке портала.</p></div>:<>
 {edit?<div className="notice">{existing?existing.projectId+' / '+existing.path+' · '+existing.sha.slice(0,8):'Не удалось загрузить документ. Откройте редактор со страницы документации.'}</div>:<div className="form-grid">
 <ProjectSelector projects={projects} value={projectId} onChange={v=>{setProject(v);setSection('');}} disabled={busy}/>
 <label className="field">Раздел<select value={section} onChange={e=>setSection(e.target.value)} disabled={busy||!project}>{project?.sections.map(s=><option key={s} value={s}>{s||'Корень документации'}</option>)}</select></label></div>}
 <div className="form-grid"><label className="field">Название документа<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={160} required disabled={busy}/></label>
 {!edit&&<label className="field">Slug<input value={slug} onChange={e=>setSlug(e.target.value)} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} placeholder="client-check" required disabled={busy}/><small>Латиница, цифры и дефисы. Расширение .md добавится автоматически.</small></label>}</div>
 <div className="editor-grid"><MarkdownEditor value={content} onChange={setContent} disabled={busy}/><MarkdownPreview content={content}/></div>
 <button className="button button--primary button--lg" type="submit" disabled={busy||(edit?!existing:!project?.available)}>{busy?'Создаём Pull Request…':'Отправить на проверку'}</button>
 <p style={{marginTop:12}}>Изменение будет сохранено в отдельной ветке. Для публикации нужен review и merge.</p>
 </>}
 </form>;
}
