import {buildApp} from './app.js';
import {loadConfig} from './config.js';
const app=await buildApp(),config=await loadConfig();
await app.listen({port:config.port,host:config.host});
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,async()=>{await app.close();process.exit(0);});

