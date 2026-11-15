import {createServer} from '../athlys-free-external/server.mjs';
import {LocalModel} from './model.mjs';import {GenerativeEngine} from './engine.mjs';
const model=new LocalModel(),engine=new GenerativeEngine(model);
const server=createServer({inferImpl:(task,text,actor,request)=>engine.request(task,text,actor,request),healthProvider:()=>engine.health()});
server.requestTimeout=30000;server.headersTimeout=10000;server.maxHeadersCount=30;
server.listen(Number(process.env.PORT||10000),'0.0.0.0');
if(process.env.ATHLYS_MODEL_USAGE==='research_trial'&&process.env.ATHLYS_FREE_ONLY==='true')model.start().then(()=>engine.selfTest()).catch(()=>{engine.accepting=false;model.close();console.warn('Generative model unavailable; authenticated external reference fallback retained.');});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{engine.accepting=false;model.close();server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),3000).unref();});
