// Browser-only transport. No model library, provider key, numerical model or parser.
const waitIce=pc=>new Promise((resolve,reject)=>{if(pc.iceGatheringState==='complete')return resolve();const timer=setTimeout(()=>{pc.removeEventListener('icegatheringstatechange',changed);reject(Error('ICE_TIMEOUT'));},15000);function changed(){if(pc.iceGatheringState==='complete'){clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',changed);resolve();}}pc.addEventListener('icegatheringstatechange',changed);});
const digest=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');
// Minimize data BEFORE transport. Heuristic only: users must anonymize free text.
export function assertAnonymousText(text){
 const personal=/\b(?:je|j[’']|mon|ma|mes|son|sa)\b/i.test(text),health=/blessur|douleur|fatigu|sommeil|menstru|m[ée]dical|mal au|sant[ée]|stress/i.test(text);
 if(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\b[0-9a-f]{8}-[0-9a-f-]{27,}\b|\b(?:nom|pr[ée]nom|athl[èe]te|coach|adresse|t[ée]l[ée]phone)\s*[:=]\s*\S+|(?:\+\d|00\d)[\d .()-]{7,}|\b(?:sb_secret_|ghp_|sk-)[A-Za-z0-9_]+|Bearer\s+\S+/i.test(text)||(personal&&health))throw Error('REMOVE_PERSONAL_SENSITIVE_INFORMATION');
}
export function adaptExternalProgram(result,discipline=''){
 const p=result?.program;if(!p||!Array.isArray(p.sessions)||p.sessions.length>160)throw Error('INVALID_EXTERNAL_PROGRAM');
 const questions=[...(p.clarification_questions||[]),...(result.lm_proposals?.clarifications||[]).map(q=>'Proposition du LM à vérifier : '+q)];
 const sessions=p.sessions.map((s,i)=>{
  if(!Array.isArray(s.blocks))throw Error('INVALID_EXTERNAL_PROGRAM');
  // A block RPE or duration is never promoted to session RPE or total duration.
  const blocks=s.blocks.map(b=>({type:String(b.type||'unknown'),text:String(b.text||''),source_start:b.start,source_end:b.end,source_fields:Array.isArray(b.fields)?b.fields:[],active:b.active!==false,requires_coach_review:true}));
  for(const b of s.blocks)for(const q of b.clarification_questions||[])questions.push(q);
  return {sequence_number:i+1,title:String(s.day||('Séance '+(i+1))),session_type:blocks.length&&blocks.every(b=>b.type==='rest')?'rest':'training',discipline,duration_minutes:Number.isFinite(s.duration_total_minutes)&&s.duration_total_minutes>0?s.duration_total_minutes:null,planned_rpe:null,intensity:null,planned_date:/^\d{4}-\d{2}-\d{2}$/.test(s.planned_date||'')?s.planned_date:null,blocks,source_start:s.start,source_end:s.end};
 });
 return {schema_version:'athlys.program.v1',parser_version:'external-rtc-source-v1',execution:'external_server',model_used:result.mode==='external_lm',fallback_used:!!result.fallback_used,sessions,global_ambiguities:[...new Set(questions.filter(x=>typeof x==='string'))].map(message=>({session:null,message})),requires_coach_review:true,automatically_imported:false,lm_proposals:result.lm_proposals||null,lm_coverage:result.lm_coverage||null};
}
export class AthlysExternalRTC{
 constructor({authorize,onState=()=>{},onStatus=()=>{},iceServers=[]}){this.authorize=authorize;this.onState=onState;this.onStatus=onStatus;this.iceServers=iceServers;this.epoch=0;this.pending=null;this.pc=null;this.channel=null;this.session=null;}
 disconnect(){this.epoch++;if(this.pending){this.pending.reject(Error('SESSION_CLOSED'));this.pending=null;}this.channel?.close();this.pc?.close();this.channel=null;this.pc=null;this.session=null;this.onState('disconnected');}
 async connect(nodeIndex=0){
  this.disconnect();const epoch=this.epoch;this.onState('connecting');const auth=await this.authorize({kind:'connect',node_index:nodeIndex});if(epoch!==this.epoch)throw Error('STALE_SESSION');
  const url=new URL(auth.signal_url);if(url.protocol!=='https:'&&!(['127.0.0.1','localhost'].includes(url.hostname)&&url.protocol==='http:'))throw Error('INVALID_SIGNAL_URL');
  const pc=new RTCPeerConnection({iceServers:auth.ice_servers?.length?auth.ice_servers:this.iceServers});this.pc=pc;const ch=pc.createDataChannel('athlys-inference-v1',{ordered:true});this.channel=ch;this.session=auth;
  ch.onmessage=e=>{if(epoch!==this.epoch)return;let data;try{data=JSON.parse(e.data)}catch{return;}if(data.type==='status')this.onStatus(data);if(!this.pending||data.id!==this.pending.id)return;const p=this.pending;
   if(data.type==='begin'){if(!Number.isInteger(data.bytes)||data.bytes<1||data.bytes>512000||!Number.isInteger(data.chunks)||data.chunks<1||data.chunks>100){this.pending=null;p.reject(Error('INVALID_RESPONSE_FRAMES'));return;}p.parts=[];p.total=data.chunks;p.bytes=data.bytes;return;}
   if(data.type==='chunk'){if(!p.parts||data.sequence!==p.parts.length||typeof data.data!=='string'||data.data.length>12000){this.pending=null;p.reject(Error('INVALID_RESPONSE_FRAMES'));return;}p.parts.push(data.data);if(p.parts.length<p.total)return;const raw=p.parts.join('');if(new TextEncoder().encode(raw).length!==p.bytes){this.pending=null;p.reject(Error('INVALID_RESPONSE_SIZE'));return;}try{data=JSON.parse(raw);}catch{this.pending=null;p.reject(Error('INVALID_RESPONSE_JSON'));return;}if(data.id!==p.id){this.pending=null;p.reject(Error('INVALID_RESPONSE_BINDING'));return;}}
   if(data.type==='result'){this.pending=null;p.resolve(data.result);}else if(data.type==='error'){this.pending=null;const error=Error(data.code);error.retryable=!!data.retryable;p.reject(error);}};
  const opened=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('RTC_CONNECT_TIMEOUT')),25000);ch.onopen=()=>{clearTimeout(timer);resolve();};ch.onclose=()=>{clearTimeout(timer);reject(Error('RTC_CLOSED'));if(epoch===this.epoch&&this.pending){const p=this.pending;this.pending=null;const e=Error('RTC_CLOSED');e.retryable=true;p.reject(e);}this.onState('disconnected');};});opened.catch(()=>{});
  await pc.setLocalDescription(await pc.createOffer());await waitIce(pc);if(epoch!==this.epoch)throw Error('STALE_SESSION');
  const response=await fetch(url.href,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sdp:pc.localDescription.sdp,type:'offer',ticket:auth.ticket}),signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('SIGNAL_HTTP_'+response.status);const answer=await response.json();if(epoch!==this.epoch)throw Error('STALE_SESSION');await pc.setRemoteDescription(answer);await opened;if(epoch!==this.epoch)throw Error('STALE_SESSION');this.onState('connected');
 }
 async _request(task,text){
  if(this.pending)throw Error('ONE_REQUEST_AT_A_TIME');if(this.channel?.readyState!=='open'||!this.session)throw Object.assign(Error('RTC_NOT_CONNECTED'),{retryable:true});
  const epoch=this.epoch,id=crypto.randomUUID();const proof=await this.authorize({kind:'request',sid:this.session.sid,node_id:this.session.node_id,id,task,text_sha256:await digest(text)});if(epoch!==this.epoch)throw Error('STALE_SESSION');
  return await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{if(this.pending?.id===id){this.pending=null;reject(Object.assign(Error('INFERENCE_TIMEOUT'),{retryable:true}));}},100000);this.pending={id,resolve:x=>{clearTimeout(timer);resolve(x)},reject:e=>{clearTimeout(timer);reject(e)}};try{const payload=JSON.stringify({v:1,id,task,text,authorization:proof.ticket});if(new TextEncoder().encode(payload).length>60000)throw Error('MESSAGE_TOO_LARGE');this.channel.send(payload);}catch(e){this.pending=null;clearTimeout(timer);reject(e);}});
 }
 async request(task,text){
  if(this.busy)throw Error("ONE_REQUEST_AT_A_TIME");this.busy=true;
  try{return await this._runRequest(task,text);}finally{this.busy=false;}
 }
 async _runRequest(task,text){
  if(!['chat','program_parse'].includes(task)||typeof text!=='string'||!text.trim()||text.length>(task==='chat'?4000:20000))throw Error('INVALID_INPUT');
  assertAnonymousText(text);
  let last,degraded=null;
  // Only configured peers supplied by the Athlys gateway may be tried.
  for(let attempt=0;attempt<2;attempt++){
   try{
    if(this.channel?.readyState!=='open')await this.connect(attempt);
    const result=await this._request(task,text);
    if(attempt===0&&result.fallback_used&&this.session?.node_id==='peer-0'&&this.session.peer_count>1){degraded=result;this.onState('switching_external_peer');this.disconnect();continue;}
    return result;
   }catch(e){
    last=e;const capacity=e.retryable||/RTC_|ICE_|SIGNAL_HTTP_5/.test(e.message);
    if(!capacity)throw e;
    if(attempt===1){if(degraded)return degraded;throw e;}
    this.onState('switching_external_peer');this.disconnect();
   }
  }
  if(degraded)return degraded;
  throw last;
 }
}
// HTTPS fallback for hosts with no WebRTC/TURN path. Computation stays external.
export class AthlysExternalHTTPS{
 constructor({authorize,onState=()=>{},onStatus=()=>{},fallbackAvailable=false,maxWaitMs=17*60*1000,pollDelay=null}){this.authorize=authorize;this.onState=onState;this.onStatus=onStatus;this.fallbackAvailable=fallbackAvailable;this.maxWaitMs=maxWaitMs;this.pollDelay=pollDelay;this.epoch=0;this.busy=false;this.controller=null;}
 disconnect(){this.epoch++;this.controller?.abort();this.onState('disconnected');}
 async pause(ms,signal){
  if(this.pollDelay)return this.pollDelay(ms);
  return new Promise((resolve,reject)=>{const aborted=()=>{clearTimeout(timer);reject(Error('STALE_SESSION'));};const timer=setTimeout(()=>{signal.removeEventListener('abort',aborted);resolve();},ms);signal.addEventListener('abort',aborted,{once:true});if(signal.aborted)aborted();});
 }
 async request(task,text){
  if(this.busy)throw Error('ONE_REQUEST_AT_A_TIME');
  if(!['chat','program_parse','rpe_explain'].includes(task)||typeof text!=='string'||!text.trim()||text.length>(task==='program_parse'?20000:4000))throw Error('INVALID_INPUT');
  assertAnonymousText(text);const epoch=this.epoch,id=crypto.randomUUID(),deadline=Date.now()+this.maxWaitMs;this.controller=new AbortController();const signal=this.controller.signal;this.busy=true;this.onState('connecting_https');
  try{
   for(let node=0;node<(this.fallbackAvailable&&task!=='rpe_explain'?2:1);node++){
    try{
     while(true){
      if(signal.aborted||epoch!==this.epoch)throw Error('STALE_SESSION');
      if(Date.now()>deadline)throw Error('GENERATION_TIMEOUT');
      const response=await this.authorize({v:1,id,task,text},node,signal);
      if(epoch!==this.epoch||signal.aborted)throw Error('STALE_SESSION');
      if(!response||response.id!==id||!response.result||response.result.execution!=='external_server')throw Error('INVALID_RESPONSE_BINDING');
      const result=response.result;
      if(result.state==='pending'){
       const p=result.progress;if(!p||!Number.isInteger(p.completed)||!Number.isInteger(p.total)||p.completed<0||p.total<1||p.completed>p.total||p.total>100)throw Error('INVALID_PROGRESS');
       this.onStatus({task,completed:p.completed,total:p.total});this.onState('generating_external');await this.pause(Math.min(5000,Math.max(500,result.retry_after_ms||2500)),signal);continue;
      }
      this.onState('connected_https');return result;
     }
    }catch(e){
     if(epoch!==this.epoch||signal.aborted)throw Error('STALE_SESSION');
     const capacity=e.retryable||['TypeError','TimeoutError','AbortError'].includes(e.name);
     if(!capacity||node===1||!this.fallbackAvailable||task==='rpe_explain')throw e;
     this.onState('switching_external_peer');
    }
   }
  }finally{this.busy=false;this.controller=null;}
 }
}
