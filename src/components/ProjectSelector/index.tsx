import React from 'react';
import type {Project} from '../../services/docsApi';
export default function ProjectSelector({projects,value,onChange,disabled}:{projects:Project[];value:string;onChange:(value:string)=>void;disabled?:boolean}){
 return <label className="field">Проект<select value={value} onChange={e=>onChange(e.target.value)} disabled={disabled} required>
 <option value="" disabled>Выберите проект</option>{projects.map(p=><option key={p.id} value={p.id} disabled={!p.available}>{p.name}{p.available?'':' — недоступен'}</option>)}</select></label>;
}

