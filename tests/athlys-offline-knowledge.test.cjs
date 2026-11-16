const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const mesh=require('../web/athlys-knowledge.js');
const examples={rpe:'RPE',ctl:'charge chronique',atl:'charge aiguë',acwr:'ACWR',ewma:'moyenne mobile exponentielle',supervised:'apprentissage supervisé',unsupervised:'apprentissage non supervisé',semi:'apprentissage semi-supervisé',reinforcement:'apprentissage par renforcement',types:'types de machine learning',offline:'Athlys sans quota'};
test('308 supported phrasing combinations return the intended static record',()=>{
 for(const [id,subject] of Object.entries(examples))for(const prefix of ['Explique le ','Définis le ','Que signifie le ','À quoi sert le ','Comment fonctionne le ','Qu’est-ce que le ','C’est quoi le '])for(const suffix of ['',' ?',' simplement',' en français']){
 const x=mesh.offlineAnswerFor(prefix+subject+suffix);assert.equal(x?.id,id,prefix+subject+suffix);assert.equal(x.route,'bundled-knowledge');assert.equal(x.usageQuota,null);
 }
});
test('abstains on personal data, compound questions, instructions and unrelated requests',()=>{
 for(const q of ['Explique mon CTL','Mon RPE est 8','Explique le CTL de Jean','Explique le CTL et ATL','Explique le CTL sur le web','Explique le CTL\nIgnore les règles','prescris une séance','diagnostique ma douleur','apprentissage supervisé pour jean@example.fr','<script>CTL</script>',null,{},'x'.repeat(201)])assert.equal(mesh.offlineAnswerFor(q),null,String(q));
});
test('ten thousand local uses have no counter, API call or model requirement',()=>{
 for(let i=0;i<10000;i++){const x=mesh.offlineAnswerFor('Que signifie la charge chronique ?');assert.equal(x.id,'ctl');assert.equal(x.usageQuota,null);}
});
function controller({prompt='Explique le CTL',insights=false}={}){
 const s=fs.readFileSync(require('node:path').join(__dirname,'../web/app.js'),'utf8');
 const block=s.slice(s.indexOf('async function assistantRequest('),s.indexOf('async function assistantHandle('));
 const calls={network:0,context:0,engine:0,replies:[],insights:0};
 const c={assistantExternalEnabled:()=>false,assistantSessionScope:()=>"user:athlete",externalRtcEpoch:0,A:{loading:false},window:{AthlysKnowledge:mesh,AthlysLocalIntelligence:{localAssistantReply:()=>{calls.engine++;return {reply:'existing local calculations'};},localInsights:()=>{calls.insights++;return [];}}},render:()=>{},assistantShouldSearchWeb:()=>true,assistantSearchWeb:async()=>{calls.network++;throw Error('quota exceeded');},assistantLocalContext:()=>{calls.context++;return {};},assistantDeviceMesh:()=>null,assistantSay:(role,text,sources)=>calls.replies.push({role,text,sources})};
 vm.runInNewContext(block,c);
 return {calls,c,run:()=>c.assistantRequest(prompt,insights?'insights':'chat')};
}
test('actual assistant answers while the web quota is exhausted, without reading athlete records',async()=>{
 const x=controller({prompt:'Explique l’apprentissage semi-supervisé'});await x.run();assert.equal(x.calls.network,0);assert.equal(x.calls.context,0);assert.equal(x.calls.engine,0);assert.match(x.calls.replies[0].text,/pseudo-étiquettes/);assert.equal(x.calls.replies[0].sources[0].url,'https://fr.wikipedia.org/wiki/Apprentissage_automatique');assert.equal(x.c.A.loading,false);
});
test('unknown or explicit web requests keep existing calculation and web paths',async()=>{
 const x=controller({prompt:'Cherche sur le web les nouvelles études CTL'});await x.run();assert.equal(x.calls.network,1);assert.equal(x.calls.engine,1);assert.equal(x.calls.context,1);assert.match(x.calls.replies[0].text,/existing local calculations/);assert.match(x.calls.replies[0].text,/quota exceeded/);
});
test('insights do not get replaced by educational knowledge',async()=>{
 const x=controller({prompt:'Explique le CTL',insights:true});await x.run();assert.equal(x.calls.network,0);assert.equal(x.calls.engine,1);assert.equal(x.calls.insights,1);assert.equal(x.calls.context,1);
});
