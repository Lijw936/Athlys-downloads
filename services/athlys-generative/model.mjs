import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
export class LocalModel{
 constructor({base='http://127.0.0.1:8191',root=process.cwd(),spawnImpl=spawn}={}){this.base=base;this.root=root;this.spawnImpl=spawnImpl;this.process=null;this.key=randomBytes(24).toString('hex');this.ready=false;this.lastError=null;this.peakCombinedKiB=0;}
 async start(){
  const binary=path.join(this.root,'.athlys-runtime/llama-b12420/llama-server'),model=path.join(this.root,'.athlys-model/model.gguf');
  const args=['-m',model,'-c','1024','-b','8','-ub','4','-t','1','-tb','1','-np','1','--no-warmup','--no-repack','--cache-ram','0','--no-cache-prompt','--ctx-checkpoints','0','--reasoning','off','--no-context-shift','--host','127.0.0.1','--port','8191','--api-key',this.key];
  this.process=this.spawnImpl(binary,args,{stdio:'ignore'});this.process.on('error',()=>{this.lastError='MODEL_START_FAILED';this.ready=false;});this.process.on('exit',()=>{this.ready=false;});
  for(let attempt=0;attempt<240;attempt++){
   if(this.process.exitCode!==null)throw Error('MODEL_START_FAILED');
   try{const r=await fetch(this.base+'/health',{headers:{Authorization:'Bearer '+this.key},signal:AbortSignal.timeout(1500)});if(r.ok){this.ready=true;await this.memory();this.memoryMonitor=setInterval(()=>this.memory().catch(()=>{}),1000);this.memoryMonitor.unref();return;}}catch{}
   await delay(500);
  }
  this.close();throw Error('MODEL_START_TIMEOUT');
 }
 async memory(){
  let child=0;try{const s=await readFile('/proc/'+this.process.pid+'/status','utf8');child=Number(/^VmRSS:\s+(\d+)/m.exec(s)?.[1]||0);}catch{}
  const combined=child+Math.ceil(process.memoryUsage().rss/1024);this.peakCombinedKiB=Math.max(this.peakCombinedKiB,combined);
  // Reserve 24 MiB below the free plan's 512 MiB; fail closed under memory pressure.
  if(combined>488*1024){this.lastError='MODEL_MEMORY_BUDGET';this.close();throw Error('MODEL_MEMORY_BUDGET');}
  return combined;
 }
 async complete(messages,{schema,maxTokens=112}={}){
  if(!this.ready)throw Error('MODEL_NOT_READY');
  await this.memory();
  const body={messages,max_tokens:maxTokens,temperature:0,stream:false,chat_template_kwargs:{enable_thinking:false}};
  if(schema)body.response_format={type:'json_object',schema};
  const r=await fetch(this.base+'/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+this.key},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
  if(!r.ok)throw Error(r.status===400?'MODEL_CONTEXT_LIMIT':'MODEL_UNAVAILABLE');
  const j=await r.json();await this.memory();const value=j.choices?.[0]?.message?.content;
  if(typeof value!=='string'||j.choices[0].finish_reason!=='stop'||value.length>2200||/<\/?think>/.test(value))throw Error('MODEL_INCOMPLETE_OUTPUT');
  if(!schema)return value.trim();
  try{return JSON.parse(value);}catch{throw Error('MODEL_INVALID_JSON');}
 }
 close(){clearInterval(this.memoryMonitor);this.ready=false;if(this.process&&this.process.exitCode===null)this.process.kill('SIGTERM');}
}
