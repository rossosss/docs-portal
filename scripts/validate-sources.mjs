import {loadSources} from './sources.mjs';
const projects=await loadSources();
console.log('Valid sources:',projects.map(p=>p.id).join(', '));

