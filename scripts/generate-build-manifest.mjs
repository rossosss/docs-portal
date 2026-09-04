import fs from 'node:fs/promises';
import path from 'node:path';
import {root} from './sources.mjs';
const manifest=JSON.parse(await fs.readFile(path.join(root,'.collection.json'),'utf8'));
if(!manifest.sources.length) throw new Error('Run docs:collect first');
if(process.env.CI && manifest.sources.some(s=>!s.commit||s.dirty)) throw new Error('CI requires clean commit SHAs');
await fs.writeFile(path.join(root,'static','build-manifest.json'),JSON.stringify(manifest,null,2));
console.log('Build manifest generated');

