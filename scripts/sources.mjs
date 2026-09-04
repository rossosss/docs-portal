import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';
import {z} from 'zod';
import dotenv from 'dotenv';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({path:path.join(root,'.env'),quiet:true});
export const safeRelative = value => typeof value === 'string' && value.length > 0 &&
  value.split('/').every(p => /^[a-zA-Z0-9_-][a-zA-Z0-9._-]*$/.test(p) && p !== '.' && p !== '..' && !p.endsWith('.'));
const schema=z.object({projects:z.array(z.object({
  id:z.string().regex(/^[a-z][a-z0-9-]*$/),name:z.string().min(1),
  owner:z.string().regex(/^[a-zA-Z0-9_-]+$/),
  repository:z.string().regex(/^[a-zA-Z0-9_-][a-zA-Z0-9._-]*$/),
  branch:z.literal('main'),
  docsPath:z.string().refine(safeRelative),
  targetPath:z.string().refine(safeRelative),
}).strict()).min(1)}).strict();
export async function loadSources(){
  const {projects}=schema.parse(parse(await fs.readFile(path.join(root,'sources.yml'),'utf8')));
  for(const p of projects){
    if(p.owner==='YOUR_GITHUB_USERNAME' && process.env.GITHUB_OWNER) p.owner=process.env.GITHUB_OWNER;
    if(!/^[a-zA-Z0-9_-]+$/.test(p.owner)) throw new Error('Invalid GITHUB_OWNER');
  }
  if(new Set(projects.map(p=>p.id)).size!==projects.length) throw new Error('Duplicate project id');
  for(let i=0;i<projects.length;i++) for(let j=i+1;j<projects.length;j++){
    const a=projects[i].targetPath.toLowerCase(),b=projects[j].targetPath.toLowerCase();
    if(a===b || a.startsWith(b+'/') || b.startsWith(a+'/')) throw new Error('Overlapping targetPath');
  }
  return projects;
}
export function localPath(p){
  const key='LOCAL_'+p.id.toUpperCase().replaceAll('-','_')+'_PATH';
  if(process.env[key]) return path.resolve(root,process.env[key]);
  // The central repository always uses the current checkout, including PR checks.
  if(p.repository==='docs-portal') return root;
  return null;
}

