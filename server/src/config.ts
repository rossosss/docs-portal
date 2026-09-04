import {loadSources,root,localPath} from '../../scripts/sources.mjs';
export {root,localPath};
export async function loadConfig(){
 return {
  projects:await loadSources(),
  githubToken:process.env.GITHUB_TOKEN || '',
  port:Number(process.env.PORT || 4000),
  host:process.env.HOST || '127.0.0.1',
  origins:(process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000').split(',').map(s=>s.trim()).filter(Boolean),
 };
}

