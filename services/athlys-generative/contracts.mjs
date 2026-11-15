import {assertAnonymousText} from '../../web/athlys-external-rtc.mjs';
export const MODEL={repository:'LiquidAI/LFM2.5-350M-GGUF',revision:'657e078c94084481950a2d555a941481f715536b',file:'LFM2.5-350M-Q6_K.gguf',sha256:'3ed48149a87dd9a0b04688780828854fc0c607d8c241af2b1100045e0d6b45c7',bytes:293381856,license:'LFM Open License v1.0; research/IRL trial; commercial revenue threshold applies',runtime:'llama.cpp-b12420',scientific_qualification:false,athlys_finetuned:false};
const words={un:1,une:1,deux:2,trois:3,quatre:4,cinq:5,six:6,sept:7,huit:8,neuf:9,dix:10};
const numeric=n=>typeof n==='number'&&Number.isFinite(n);
export function explicitRpes(text){
 const result=[];const re=/\bRPE\s*(?:(?:global|(?:de\s+(?:la\s+)?)?s[ée]ance|pr[ée]vu|cible|vis[ée]|de)\s*)*(?:[:=@]\s*)?(\d{1,2}(?:[.,]\d+)?|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\b/gi;let m;
 while((m=re.exec(text))!==null){const value=words[m[1].toLowerCase()]??Number(m[1].replace(',','.'));result.push({value,quote:m[0],start:m.index,end:m.index+m[0].length,session:/global|s[ée]ance/i.test(m[0])});}
 return result;
}
export function validateInterpretation(unit,raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||!['easy','moderate','hard','maximal','unknown'].includes(raw.intensity)||typeof raw.summary!=='string')return null;
 const found=explicitRpes(unit.text),otherScale=/\bBorg\b|6\s*[-–]\s*20|\/\s*20\b/i.test(unit.text),negated=/\b(?:pas|annul|supprim|repos)\b|non\s+pr[ée]cis|inconnue?|[àa]\s+d[ée]finir/i.test(unit.text);
 const writtenByModel=numeric(raw.rpe_written)&&found.some(x=>x.value===raw.rpe_written)?raw.rpe_written:null;
 let written=found.length===1?found[0].value:writtenByModel;
 const anchor={easy:3,moderate:5,hard:7,maximal:10};const modelSuggestion=anchor[raw.intensity]??raw.rpe_suggestion;
 const healthRating=/douleur|blessur|m[ée]dic|sommeil|stress|patholog/i.test(unit.text);
 let suggestion=!otherScale&&!negated&&!healthRating&&written===null&&numeric(modelSuggestion)&&modelSuggestion>=1&&modelSuggestion<=10&&/facile|ais[ée]|mod[ée]r|soutenu|intens|dur|maximal|parler|conversation|tranquill|lent|rapide|pique|difficil|conversation/i.test(unit.text)?modelSuggestion:null;
 if(written!==null&&(written<0||written>20))written=null;
 const lower=unit.text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const anchored=/maximal|a fond|tout donner/.test(lower)?'maximal':/soutenu|difficile|tres dur|conversation impossible/.test(lower)?'hard':/modere/.test(lower)?'moderate':/facile|aise|parler normalement|conversation normale|tranquill/.test(lower)?'easy':null;
 if(suggestion!==null&&anchored&&raw.intensity!==anchored)suggestion=null;
 if(suggestion!==null&&Math.abs(suggestion*10-Math.round(suggestion*10))>1e-8)suggestion=null;
 const scope=written!==null&&found.some(x=>x.value===written&&x.session)?'session':'block';
 let explanation=typeof raw.summary==='string'?raw.summary.trim():typeof raw.explanation==='string'?raw.explanation.trim():'';
 if(!explanation||explanation.length>220||/https?:|<[^>]+>|diagnosti|sans risque|garanti|probabilit[ée].*blessure/i.test(explanation))explanation='Interprétation du LM à vérifier dans le texte source.';
 if(/\d/.test(explanation))explanation='Le commentaire du LM contenant des chiffres est écarté ; les valeurs source font autorité.';
 if(written!==null)explanation='RPE identifié dans la source ; il reste distinct du RPE global de séance.';
 if(suggestion!==null)explanation='Interprétation générative de l’intensité : '+raw.intensity+'. Cible indicative selon un barème de travail Athlys non validé, à confirmer par le coach.';
 if(otherScale)explanation='Échelle source à conserver ; aucune conversion vers CR10.';
 return {written_value_origin:written!==null?'verified_source_decoder':null,rpe_written_by_model:writtenByModel,quote:unit.text,source_start:unit.start,source_end:unit.end,session_index:unit.session_index,explanation,rpe_written:written,rpe_suggestion:suggestion,scope:otherScale?'other_scale':scope,scale:otherScale?'source_scale_not_converted':'CR10_to_confirm',requires_coach_review:true,suggestion_is_estimate:suggestion!==null,automatically_applied:false};
}
export function projectionInput(text){
 let p;try{p=JSON.parse(text);}catch{throw Error('INVALID_PROJECTION');}
 const keys=['plannedRpe','projectedRpe','sampleCount','personalized','confidence','method','durationMinutes','sessionText'];
 if(!p||Array.isArray(p)||Object.keys(p).some(k=>!keys.includes(k))||p.method!=='athlys-individual-rpe-v1'||!numeric(p.plannedRpe)||!numeric(p.projectedRpe)||p.plannedRpe<1||p.plannedRpe>10||p.projectedRpe<1||p.projectedRpe>10||!Number.isInteger(p.sampleCount)||p.sampleCount<0||p.sampleCount>10000||typeof p.personalized!=='boolean'||!['limited','exploratory','insufficient'].includes(p.confidence))throw Error('INVALID_PROJECTION');
 if(p.sampleCount<4&&(p.personalized||Math.abs(p.projectedRpe-p.plannedRpe)>0.001))throw Error('INVALID_PROJECTION');
 if(p.durationMinutes!==null&&p.durationMinutes!==undefined&&(!numeric(p.durationMinutes)||p.durationMinutes<=0||p.durationMinutes>900))throw Error('INVALID_PROJECTION');
 if(p.sessionText!==undefined&&(typeof p.sessionText!=='string'||p.sessionText.length>600))throw Error('INVALID_PROJECTION');
 if(p.sessionText)assertAnonymousText(p.sessionText);
 return p;
}
const fr=x=>Number(x).toLocaleString('fr-FR',{maximumFractionDigits:2});
export function projectionFacts(p){return 'RPE projeté : '+fr(p.projectedRpe)+'/10 ; cible du coach : '+fr(p.plannedRpe)+'/10 ; '+p.sampleCount+' séance(s) appariée(s). '+(p.personalized?'Correction individuelle exploratoire.':'Historique insuffisant : la cible du coach est conservée.')+' Cette estimation ne remplace pas le ressenti déclaré après la séance.';}
export function validateNarrative(raw){
 if(!raw||typeof raw!=='object')return null;
 const values=['explanation','draft'].map(k=>typeof raw[k]==='string'?raw[k].trim():'');
 const unsupported=/\d|\b(?:deux|trois|quatre|cinq|six|sept|huit|neuf|dix|vingt|cent)\b|diagnosti|blessure|sans risque|garanti|\bcertain(?:e|s|es)?\b|probabilit|augment|diminu|r[ée]dui|arr[êe]t|prescri|doit faire|squat|sprint|kilom[èe]tre|https?:|<[^>]+>/i;
 if(values.some(s=>!s||s.length>400||unsupported.test(s)))return null;
 return {explanation:values[0],draft:values[1]};
}
export const extractionSchema={type:'object',properties:{intensity:{type:'string',enum:['easy','moderate','hard','maximal','unknown']},summary:{type:'string',maxLength:180}},required:['intensity','summary'],additionalProperties:false};
export const narrativeSchema={type:'object',properties:{explanation:{type:'string',maxLength:280},draft:{type:'string',maxLength:280}},required:['explanation','draft'],additionalProperties:false};
