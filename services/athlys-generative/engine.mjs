import {createHash} from 'node:crypto';
import {infer as referenceInfer,convertSource} from '../athlys-free-external/server.mjs';
import {assertAnonymousText} from '../../web/athlys-external-rtc.mjs';
import {MODEL,validateInterpretation,projectionInput,projectionFacts,validateNarrative,extractionSchema,narrativeSchema} from './contracts.mjs';
export function sourceUnits(program,text){
 const units=[];
 program.sessions.forEach((s,session_index)=>s.blocks.forEach(b=>{
  let offset=b.start;
  while(offset<b.end){let end=Math.min(offset+320,b.end);if(end<b.end){const gap=text.lastIndexOf(' ',end);if(gap>offset+160)end=gap;}
   const quote=text.slice(offset,end);if(quote.trim())units.push({text:quote,start:offset,end,session_index});offset=end;
  }
 }));
 if(units.length>100)throw Error('PROGRAM_TOO_COMPLEX');
 return units;
}
const provenance={model:MODEL,execution:'external_server',action_executed:false,requires_coach_review:true};
export class GenerativeEngine{
 constructor(model){this.accepting=false;this.model=model;this.jobs=new Map();this.active=false;this.canary=null;}
 health(){return {mode:this.accepting&&this.model.ready?'external_lm':'external_reference_fallback',generative_lm:this.accepting&&this.model.ready,model:MODEL,model_status:this.accepting&&this.model.ready?'ready':'unavailable',canary:this.canary,peak_combined_memory_kib:this.model.peakCombinedKiB||0,tasks:['chat','program_parse','rpe_explain'],scientific_models_promoted:false};}
 validate(task,text,role){
  if(!['chat','program_parse','rpe_explain'].includes(task)||typeof text!=='string'||!text.trim()||text.length>(task==='program_parse'?20000:4000))throw Error('INVALID_INPUT');
  assertAnonymousText(text);
  if(task==='program_parse'){if(text.trim().length<10)throw Error('INVALID_INPUT');try{convertSource(text);}catch{throw Error('INVALID_INPUT');}}
  if(task==='program_parse'&&role!=='coach'||task==='rpe_explain'&&role==='club')throw Error('COACH_REQUIRED');
  if(task==='rpe_explain')projectionInput(text);
 }
 fallback(task,text,role,reason){
  if(task!=='rpe_explain')return {...referenceInfer(task,text,role),fallback_reason:reason};
  const p=projectionInput(text);return {...provenance,mode:'external_reference_fallback',fallback_used:true,model:null,reply:projectionFacts(p),draft:null,notice:'Calcul fourni par le noyau client. Le LM est indisponible ; aucune reformulation générative.',fallback_reason:reason};
 }
 request(task,text,actor,{id}){
  this.validate(task,text,actor.role);
  const key=createHash('sha256').update(actor.id+':'+id).digest('hex'),digest=createHash('sha256').update(task+'\0'+text).digest('hex');
  const now=Date.now();for(const [k,j]of this.jobs)if(now-j.created>20*60*1000&&j.state!=='pending')this.jobs.delete(k);
  let job=this.jobs.get(key);
  if(job){if(job.role!==actor.role)throw Error('REQUEST_SCOPE_CHANGED');job.lastPoll=now;if(job.digest!==digest)throw Error('REQUEST_ID_REUSED');return job.state==='complete'?job.result:{...provenance,state:'pending',progress:job.progress,retry_after_ms:2500};}
  if(!this.accepting||!this.model.ready)return this.fallback(task,text,actor.role,'model_unavailable');
  if(this.active)return this.fallback(task,text,actor.role,'model_busy');
  if(this.jobs.size>=12){const old=[...this.jobs].find(([,j])=>j.state==='complete');if(old)this.jobs.delete(old[0]);else return this.fallback(task,text,actor.role,'capacity');}
  job={digest,role:actor.role,lastPoll:now,created:now,state:'pending',progress:{completed:0,total:1}};this.jobs.set(key,job);this.active=true;
  this.run(task,text,actor.role,p=>{if(Date.now()-job.lastPoll>90000)throw Error('JOB_POLL_EXPIRED');job.progress=p;}).then(result=>{job.result=result;job.state='complete';}).catch(()=>{job.result=this.fallback(task,text,actor.role,'generation_rejected');job.state='complete';}).finally(()=>{this.active=false;});
  return {...provenance,state:'pending',progress:job.progress,retry_after_ms:2500};
 }
 async run(task,text,role,onProgress=()=>{}){
  this.validate(task,text,role);
  if(task==='program_parse'){
   const program=convertSource(text),units=sourceUnits(program,text),interpretations=[];let attempted=0,rejected=0;const deadline=Date.now()+15*60*1000;
   for(const unit of units){
    if(Date.now()>deadline){rejected+=units.length-attempted;break;}
    try{
     const raw=await this.model.complete([{role:'system',content:'Read the sports fragment. Classify intensity: easy (facile/aisé), moderate (modéré), hard (difficile/soutenu), maximal, or unknown (rest or not stated). Sets, distance and duration do not define intensity. Add a short French summary without numbers.'},{role:'user',content:unit.text}],{schema:extractionSchema,maxTokens:112});
     const x=validateInterpretation(unit,raw);if(x)interpretations.push(x);else rejected++;
    }catch{rejected++;}
    attempted++;onProgress({completed:attempted,total:units.length});
   }
   return {...provenance,program,mode:interpretations.length?'external_lm':'external_reference_fallback',model:interpretations.length?MODEL:null,fallback_used:rejected>0||!interpretations.length,lm_proposals:{interpretations,clarifications:[],discarded:!interpretations.length},lm_coverage:{accepted:interpretations.length,attempted,total:units.length,rejected},notice:'Analyse générative expérimentale. RPE écrit, hypothèse du LM et RPE de séance restent distincts ; le coach confirme chaque cible.'};
  }
  if(task==='rpe_explain'){
   const p=projectionInput(text),direction=p.projectedRpe>p.plannedRpe?'supérieure':p.projectedRpe<p.plannedRpe?'inférieure':'égale';
   const source=p.personalized?'La projection est '+direction+' à la cible. Elle utilise les écarts de séances comparables. Elle est exploratoire et le ressenti réel peut différer.':'Historique insuffisant : la projection conserve la cible du coach. Le ressenti sera déclaré après la séance.';
   const raw=await this.model.complete([{role:'system',content:'Reformule chaque texte en français. Respecte les faits et renvoie les deux champs JSON, chacun en une phrase.'},{role:'user',content:JSON.stringify({explanation:source,draft:'Conserver le contenu et la cible confirmés par le coach, puis recueillir le ressenti après la séance.'})}],{schema:narrativeSchema,maxTokens:128});
   const narrative=validateNarrative(raw);if(!narrative)throw Error('NARRATIVE_REJECTED');
   return {...provenance,mode:'external_lm',fallback_used:false,reply:projectionFacts(p)+'\n\n'+narrative.explanation,draft:narrative.draft+(p.sessionText?'\nContenu confirmé à conserver : '+p.sessionText:''),projection_facts:p,notice:'Le noyau client calcule la projection. Le LM reformule ; le brouillon ne modifie aucune séance. Validation coach requise.'};
  }
  if(text.length>600)return this.fallback(task,text,role,'shorter_question_required');
  const ref=referenceInfer(task,text,role),facts=/\brpe\b/i.test(text)?'RPE = perception subjective de l’effort déclarée par l’athlète, pas une force ou une mesure physiologique. Une estimation ne remplace pas le ressenti.':ref.intent_experimental?'Demande une précision si le programme ou la cible RPE manque. Aide à reformuler les textes sportifs anonymisés.':ref.reply;
  const reply=await this.model.complete([{role:'system',content:'Réponds en français en deux phrases, uniquement à partir de cette référence, sans chiffres nouveaux ni diagnostic : '+facts},{role:'user',content:text}],{maxTokens:96});
  if(/rpe/i.test(text)&&/\bforce\b|puissance|r[ée]sistance [ée]nerg[ée]tique/i.test(reply))throw Error('CHAT_REJECTED');
  if(/garanti|sans risque|diagnosti|https?:|<[^>]+>/i.test(reply))throw Error('CHAT_REJECTED');
  return {...provenance,mode:'external_lm',fallback_used:false,reply,notice:'Réponse du LM externe expérimental, à vérifier.'};
 }
 async selfTest(){
  const actorRole='coach',source='Lundi : 3 x 8 squats à RPE 7';const result=await this.run('program_parse',source,actorRole);
  const pass=result.mode==='external_lm'&&result.lm_proposals.interpretations.some(x=>x.rpe_written===7&&x.scope==='block');
  this.canary={passed:pass,fixture:'synthetic-fixed-rpe-block',source_sha256:createHash('sha256').update(source).digest('hex'),rpe_written:pass?7:null,not_scientific_validation:true};if(!pass)throw Error('MODEL_CANARY_FAILED');
  const implicit=await this.run('program_parse','Lundi : footing facile','coach');this.canary.implicit_intensity_passed=implicit.lm_proposals.interpretations.some(x=>x.rpe_written===null&&x.rpe_suggestion===3);if(!this.canary.implicit_intensity_passed)throw Error('MODEL_CANARY_FAILED');
  const p={plannedRpe:6,projectedRpe:6.5,sampleCount:8,personalized:true,confidence:'limited',method:'athlys-individual-rpe-v1',durationMinutes:40};const narrative=await this.run('rpe_explain',JSON.stringify(p),'coach');
  this.canary.projection_narrative_passed=narrative.mode==='external_lm'&&!!narrative.draft;this.canary.fixed_generated_explanation=narrative.reply;
  if(!this.canary.projection_narrative_passed)throw Error('MODEL_CANARY_FAILED');this.accepting=true;
  return this.canary;
 }
}
