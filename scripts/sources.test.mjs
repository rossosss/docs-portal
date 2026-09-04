import test from 'node:test';
import assert from 'node:assert/strict';
import {safeRelative,loadSources} from './sources.mjs';
test('manifest contains unique projects with safe paths',async()=>{
 const p=await loadSources();assert.ok(p.length>0);assert.equal(new Set(p.map(s=>s.id)).size,p.length);
});
test('manifest paths reject traversal, absolute, Windows and encoded paths',()=>{
 for(const p of ['../docs','a/../b','/docs','C:/docs','a\\b','%2e%2e/docs','a//b','a/.','a/b.'])assert.equal(safeRelative(p),false,p);
 assert.equal(safeRelative('projects/terminal'),true);
});
