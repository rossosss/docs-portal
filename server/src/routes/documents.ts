import type {FastifyInstance} from 'fastify';
import type {DocumentService} from '../services/document.service.js';
import {readSchema} from '../validation/document.schema.js';
export function documentsRoute(app:FastifyInstance,service:DocumentService){
 app.post('/api/documents',async(request,reply)=>reply.code(201).send(await service.create(request.body)));
 app.get('/api/documents',async request=>{const q=readSchema.parse(request.query);return service.read(q.projectId,q.path);});
 app.put('/api/documents',async(request,reply)=>reply.code(201).send(await service.edit(request.body)));
}

