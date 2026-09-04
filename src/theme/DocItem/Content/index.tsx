import React,{useEffect,useState} from 'react';
import Original from '@theme-original/DocItem/Content';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Link from '@docusaurus/Link';
interface Source{sourceProject:string;sourceRepository:string;sourcePath:string;sourceCommit:string|null;dirty:boolean;branch:string}
export default function Content(props:React.ComponentProps<typeof Original>){
 const {metadata}=useDoc();const [sources,setSources]=useState<Record<string,Source>>({});
 const manifestUrl=useBaseUrl('/source-manifest.json');
 useEffect(()=>{let active=true;fetch(manifestUrl).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{if(active)setSources(data);}).catch(()=>{});return()=>{active=false;};},[manifestUrl]);
 const key=metadata.source.replace(/^@site\/generated-docs\//,'');
 const s=sources[key];
 const github=s?'https://github.com/'+s.sourceRepository:'';
 const encoded=s?.sourcePath.split('/').map(encodeURIComponent).join('/');
 return <><Original {...props}/>{s&&<aside className="source-meta" aria-label="Источник документа">
 <p>Источник: {s.sourceRepository}/{s.sourcePath}<br/>Версия: {s.sourceCommit?.slice(0,12)||'локальная копия'}{s.dirty?' · есть локальные изменения':''}</p>
 <a href={github+'/blob/'+(s.sourceCommit||s.branch)+'/'+encoded} target="_blank" rel="noreferrer">Открыть в GitHub ↗</a>
 {s.sourcePath.endsWith('.md')?<Link to={'/edit-document?'+new URLSearchParams({project:s.sourceProject,path:s.sourcePath})}>Редактировать</Link>:<a href={github+'/edit/'+s.branch+'/'+encoded}>Редактировать в GitHub</a>}
 </aside>}</>;
}

