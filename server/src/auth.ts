import type {FastifyRequest} from 'fastify';
// TODO production: verify identity here, enforce project roles, audit actor and rate limits.
// CORS is not authentication. This PoC defaults to loopback and must not be exposed publicly.
export async function authorize(_request:FastifyRequest):Promise<void>{void _request;}

