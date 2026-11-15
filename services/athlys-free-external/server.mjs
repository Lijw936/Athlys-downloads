// Public, minimal external reference/decoder service. No generative weights or secrets.
import http from 'node:http';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {assertAnonymousText} from '../../web/athlys-external-rtc.mjs';
const require=createRequire(import.meta.url);
require('../../web/athlys-neural-intent-model.js');
const engine=require('../../web/athlys-local-intelligence.js');
const knowledge=require('../../web/athlys-device-mesh.js');
const deny=code=>{throw Object.assign(Error(code),{code});};
export async function authenticate(authorization,{env=process.env,fetchImpl=fetch}={}){
 if(typeof authorization!=='string'||!/^Bearer [^\s]+$/.test(authorization)||authorization.length>8192)deny('AUTHENTICATION_REQUIRED');
 const url=new URL(env.SUPABASE_URL||'');const key=env.SUPABASE_PUBLISHABLE_KEY;
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/'||!key||/service_role|sb_secret_/.test(key))deny('CONFIGURATION_INVALID');
 const headers={apikey:key,Authorization:authorization};
 const userResponse=await fetchImpl(url.origin+'/auth/v1/user',{headers,signal:AbortSignal.timeout(8000)});
 if(!userResponse.ok)deny('AUTHENTICATION_FAILED');
 const user=await userResponse.json();if(typeof user.id!=='string'||!/^[-a-f0-9]{36}$/.test(user.id))deny('AUTHENTICATION_FAILED');
 const profileResponse=await fetchImpl(url.origin+'/rest/v1/profiles?id=eq.'+encodeURIComponent(user.id)+'&select=role',{headers,signal:AbortSignal.timeout(8000)});
 if(!profileResponse.ok)deny('PROFILE_ACCESS_FAILED');
 const rows=await profileResponse.json(),role=Array.isArray(rows)&&rows.length===1?rows[0].role:null;
 if(!['coach','athlete','club'].includes(role))deny('ROLE_DENIED');
 return {role,id:user.id};
}
export function convertSource(text){
 const parsed=engine.parseProgram(text);
 const questions=new Set(parsed.global_ambiguities.map(x=>x.message));
 questions.add('Vérifier les blocs et préciser séparément la durée totale et le RPE de chaque séance.');
 const sessions=parsed.sessions.map(s=>({day:s.title,start:s.source_span.start,end:s.source_span.end,planned_date:null,duration_total_minutes:null,blocks:(()=>{let cursor=s.source_span.start;return s.blocks.map(b=>{
  let start=b.source_start,end=b.source_end;
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<cursor||text.slice(start,end)!==b.text){start=text.indexOf(b.text,cursor);end=start+b.text.length;}
  if(start<cursor||end>s.source_span.end)deny('SOURCE_OFFSET_MISMATCH');cursor=end;
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>text.length||text.slice(start,end)!==b.text)deny('SOURCE_OFFSET_MISMATCH');
  // Numeric interpretations stay proposals: preserve only exact source quotes in fields.
  const fields=[];
  const rpe=/\bRPE\s*(?:[:=@]|de)?\s*(\d{1,2}(?:[.,]\d+)?)\b/gi;let m;
  while((m=rpe.exec(b.text))!==null)fields.push({field:'RPE',raw:m[1],start:start+m.index,end:start+m.index+m[0].length,quote:m[0]});
  return {type:b.type,text:b.text,start,end,active:!/(?:ne\s+pas\s+faire|pas de|annul|supprim)/i.test(b.text),fields,requires_coach_review:true};
 });})()}));
 return {sessions,clarification_questions:[...questions],source_sha256:createHash('sha256').update(text).digest('hex'),source_length:text.length,requires_coach_review:true,automatically_imported:false};
}
export function infer(task,text,role){
 if(!['chat','program_parse'].includes(task)||typeof text!=='string'||!text.trim()||text.length>(task==='chat'?4000:20000))deny('INVALID_INPUT');
 assertAnonymousText(text);
 if(task==='program_parse'&&role!=='coach')deny('COACH_REQUIRED');
 const common={mode:'external_reference_fallback',fallback_used:true,model:null,action_executed:false,execution:'external_server',notice:'Secours distant sans génération LM. Vérification du coach requise.'};
 if(task==='program_parse')return {...common,program:convertSource(text),lm_proposals:{clarifications:[],interpretations:[],discarded:true}};
 const record=knowledge.offlineAnswerFor(text);
 if(record)return {...common,reply:record.reply||record.text,sources:record.sources||[]};
 const classification=engine.classifyIntent(text);
 return {...common,reply:'Précise l’indicateur à expliquer (RPE, CTL, ATL, ACWR, EWMA), ou colle un programme dans l’import du coach. Le LM génératif n’est pas disponible sur ce service gratuit.',intent:classification.intent,intent_experimental:true};
}
export function createServer({env=process.env,fetchImpl=fetch,inferImpl=(task,text,actor)=>infer(task,text,actor.role),healthProvider=()=>({})}={}){
 const origins=new Set((env.ATHLYS_ALLOWED_ORIGINS||'').split(',').filter(Boolean));
 let inflight=0;
 return http.createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const reply=(status,value)=>{res.writeHead(status);res.end(JSON.stringify(value));};
  const origin=req.headers.origin;
  if(origin&&!origins.has(origin)){reply(403,{error:'ORIGIN_DENIED'});return;}
  if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  if(req.method==='OPTIONS'&&req.url==='/infer'){res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.writeHead(204);res.end();return;}
  if(req.method==='GET'&&req.url==='/health'){reply(200,{status:'ready',execution:'external_server',generative_lm:false,tasks:['chat','program_parse'],mode:'external_reference_fallback',scientific_models_promoted:false,budget_eur:0,...healthProvider()});return;}
  if(req.method!=='POST'||req.url!=='/infer'){reply(404,{error:'NOT_FOUND'});return;}
  if(env.ATHLYS_FREE_ONLY!=='true'){reply(503,{error:'FREE_ONLY_POLICY_REQUIRED'});return;}
  if(inflight>=4){reply(503,{error:'CAPACITY_REACHED',retry_after_seconds:30});return;}
  if(!String(req.headers['content-type']||'').startsWith('application/json')){reply(415,{error:'JSON_REQUIRED'});return;}
  inflight++;
  try{
   const actor=await authenticate(req.headers.authorization,{env,fetchImpl});
   const chunks=[];let bytes=0;req.setTimeout(15000,()=>req.destroy());
   for await(const chunk of req){bytes+=chunk.length;if(bytes>90000)deny('MESSAGE_TOO_LARGE');chunks.push(chunk);}
   let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{deny('INVALID_JSON');}
   if(!input||Array.isArray(input)||Object.keys(input).sort().join(',')!=='id,task,text,v'||input.v!==1||typeof input.id!=='string'||!/^[-a-f0-9]{36}$/.test(input.id))deny('INVALID_ENVELOPE');
   req.setTimeout(0);const result=await inferImpl(input.task,input.text,actor,{id:input.id});reply(200,{id:input.id,result});
  }catch(e){
   const code=e.code||e.message;
   const status=code==='COACH_REQUIRED'||code==='ROLE_DENIED'||code==='REQUEST_SCOPE_CHANGED'?403:/^AUTHENTICATION/.test(code)?401:['INVALID_INPUT','INVALID_JSON','INVALID_ENVELOPE','SOURCE_OFFSET_MISMATCH','MESSAGE_TOO_LARGE','REMOVE_PERSONAL_SENSITIVE_INFORMATION','INVALID_PROJECTION','REQUEST_ID_REUSED','PROGRAM_TOO_COMPLEX'].includes(code)?400:503;
   if(!res.headersSent&&!res.destroyed)reply(status,{error:status===503?'SERVICE_UNAVAILABLE':code});
  }finally{inflight--;}
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const server=createServer();server.requestTimeout=30000;server.headersTimeout=10000;server.maxHeadersCount=30;server.listen(Number(process.env.PORT||10000),'0.0.0.0');
}
