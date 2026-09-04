import React from 'react';
export default function MarkdownEditor({value,onChange,disabled}:{value:string;onChange:(value:string)=>void;disabled?:boolean}){
 return <label className="field">Содержимое Markdown<textarea value={value} onChange={e=>onChange(e.target.value)} disabled={disabled} required maxLength={100000} placeholder="# Название раздела" spellCheck={false}/><small>До 100 KB. Frontmatter будет сформирован автоматически.</small></label>;
}

