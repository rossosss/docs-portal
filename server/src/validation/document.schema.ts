import {z} from 'zod';
export const slugSchema=z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/,'Slug: только a-z, 0-9 и одиночные дефисы');
const part='[a-zA-Z0-9_-][a-zA-Z0-9._-]*';
export const sectionSchema=z.string().max(240).refine(s=>s==='' || (new RegExp('^'+part+'(?:/'+part+')*$').test(s) && s.split('/').every(p=>p!=='.'&&p!=='..'&&!p.endsWith('.'))),'Недопустимый раздел');
const content=z.string().min(1).refine(s=>Buffer.byteLength(s,'utf8')<=100_000,'Markdown не более 100 KB').refine(s=>!s.includes('\0'),'Недопустимый символ');
const title=z.string().trim().min(1).max(160).refine(s=>!Array.from(s).some(c=>c.charCodeAt(0)<32),'Недопустимое название');
export const createSchema=z.object({projectId:z.string().min(1).max(80),section:sectionSchema,title,slug:slugSchema,content}).strict();
export const editSchema=z.object({projectId:z.string().min(1).max(80),path:z.string().max(400),expectedSha:z.string().regex(/^[a-f0-9]{40}$/),title,content}).strict();
export const readSchema=z.object({projectId:z.string().min(1).max(80),path:z.string().max(400)}).strict();
