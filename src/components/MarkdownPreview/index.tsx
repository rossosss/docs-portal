import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
export default function MarkdownPreview({content}:{content:string}){
 return <section aria-label="Предпросмотр"><strong>Предпросмотр</strong><div className="panel preview"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{content||'Предпросмотр появится, когда вы начнёте писать.'}</ReactMarkdown></div></section>;
}

