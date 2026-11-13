(function(){
"use strict";
var root,db,session,profile,view="home",modal=null,notice="",busy=false,selectedAthleteId=null,selectedMessageAthlete=null,channel=null,teamFilterId="all";
var D={roster:[],events:[],checkins:[],logs:[],programs:[],sessions:[],goals:[],records:[],measurements:[],exercises:[],equipment:[],results:[],teams:[],members:[],teamPeople:[],teamMessages:[],questionnaires:[],responses:[],notifications:[],messages:[],notes:[],videos:[],details:null,coachDetails:null,coachCode:""};
var P={theme:"dark",level:2,sophistication:2,fontSize:2,reminders:false};
var H={available:null,platform:"web",reason:"",busy:false,error:"",lastSync:null,shareWithCoach:false,readAuthorized:[],lastCount:0,consents:{activity:false,recovery:false,body:false,cycle:false},apiStatus:null,apiRecords:[],apiLoaded:false,apiLoading:false,apiError:"",healthRecords:[],recordsLoading:false,recordsLoaded:false,recordsAt:0,recordsError:"",recordsPromise:null};
var A={open:false,history:[],pending:null,loading:false,insightLoaded:false,historyLoaded:false,programDraft:null,insights:[]};
var activeChatMode="direct",activeChatTeamId=null,loadedTeamMessagesFor=null,chatMobileListOpen=true;
var chatTransportMode="auto",chatRtcChannel=null,chatRtcTopic=null,chatRtcPeer=null,chatRtcData=null,chatRtcState="WebSocket natif",chatRtcCurrent="websocket",chatRtcPeerUser=null,chatRtcIceQueue=[],chatRtcProbeTimer=null,chatRtcDisconnectTimer=null,chatRtcHandshakeTimer=null,chatRtcOfferBusy=false,chatRtcNetworkRtt=null,chatRtcProbeSent=0;
var perfTab="overview",perfRange=30,offlineFetchHadErrors=false,offlineSyncBusy=false,riskAssessmentCache={},riskAssessmentLoading=false,digitalTwinCache={},digitalTwinLoading=false;
var quantumCache={},quantumLedgerCache={},quantumOverviewCache={},quantumLedgerLoading={},quantumBusy=false,quantumDecisionBusy=false,quantumMode="monitor";
var performanceCache={},performanceLoading={},performanceRiskCache={},performanceRiskLoading={},teamAnalyticsCache=null,teamAnalyticsLoading=false;
var cfg=window.ATHLYS_CONFIG||{};
var $=function(s){return root&&root.querySelector(s)};
var esc=function(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
var num=function(v){return v===""||v==null?null:(Number.isFinite(Number(v))?Number(v):null)};
var today=function(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
var localDT=function(){return new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)};
var dateFR=function(v,t){if(!v)return "—";var d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString("fr-FR",t?{dateStyle:"medium",timeStyle:"short"}:{dateStyle:"medium"})};
var own=function(){return profile&&profile.id};
var isCoach=function(){return !!(profile&&profile.role==="coach")};
var coachId=function(){return isCoach()?own():(D.coachDetails&&D.coachDetails.coach_id)||null};
var by=function(rows,id){return (rows||[]).find(function(x){return x.id===id})||null};
var nameOf=function(id){return id===own()?(profile.full_name||"Moi"):(by(D.roster,id)||{}).full_name||"Athlète"};
var toast=function(s){notice=s||"";render();if(s)window.setTimeout(function(){if(notice===s){notice="";var n=$("#toast");if(n)n.remove()}},4000)};
async function q(p){var r=await p;if(r&&r.error)throw r.error;return r&&r.data!==undefined?r.data:null}
async function opt(p,fb){try{return await q(p)}catch(e){if(/fetch|network|timeout|connection/i.test(String(e&&e.message||e)))offlineFetchHadErrors=true;console.warn("Athlys:",e.message);return fb}}
var offlineTables={calendar_events:"events",training_logs:"logs",athlete_checkins:"checkins",athlete_goals:"goals",personal_records:"records",competition_results:"results",athlete_measurements:"measurements"};
function offlineId(){return window.crypto&&crypto.randomUUID?crypto.randomUUID():"athlys-"+Date.now()+"-"+Math.random().toString(16).slice(2)}
async function applyOfflineQueue(){if(!window.AthlysOfflineStore||!own())return;var items=await window.AthlysOfflineStore.list(own());items.forEach(function(item){var key=offlineTables[item.table];if(!key)return;var rows=D[key]||[],ix=rows.findIndex(function(x){return x.id===item.payload.id});if(ix>=0)rows[ix]=Object.assign({},rows[ix],item.payload);else rows.unshift(item.payload);D[key]=rows})}
async function syncOfflineQueue(){
 if(offlineSyncBusy||!navigator.onLine||!db||!own()||!window.AthlysOfflineStore)return;
 offlineSyncBusy=true;
 try{var items=await window.AthlysOfflineStore.list(own()),allowed=Object.keys(offlineTables);if(!items.length)return;
  for(var i=0;i<items.length;i++){var item=items[i];if(allowed.indexOf(item.table)<0)continue;var result=await db.from(item.table).insert(item.payload);if(result.error){if(result.error.code==="23505"){var existing=await db.from(item.table).select("id").eq("id",item.payload.id).maybeSingle();if(existing.data){await window.AthlysOfflineStore.remove(item.id);continue}}console.warn("Athlys offline sync paused:",result.error.message);break}await window.AthlysOfflineStore.remove(item.id)}
  var remaining=await window.AthlysOfflineStore.count(own());
  if(remaining===0){await fetchData();render();toast("Synchronisation hors ligne terminée.")}else{await applyOfflineQueue();render()}
 }catch(error){console.warn("Athlys offline sync:",error.message)}finally{offlineSyncBusy=false}
}
function prefsLoad(){try{P=Object.assign(P,JSON.parse(localStorage.getItem("athlys-full-prefs-"+own())||"{}"));chatTransportMode=localStorage.getItem("athlys-chat-transport-"+own())||"auto";activeChatMode=localStorage.getItem("athlys-chat-mode-"+own())||"direct";activeChatTeamId=localStorage.getItem("athlys-chat-team-"+own())||null}catch(e){}}
function prefsSave(){try{localStorage.setItem("athlys-full-prefs-"+own(),JSON.stringify(P))}catch(e){}}
function latestCheck(id){return D.checkins.find(function(x){return x.athlete_id===id})||null}
function sportOf(id){var d=id===own()?D.details:(D.athleteDetails||[]).find(function(x){return x.athlete_id===id});return d&&d.sport||d&&d.disciplines&&d.disciplines.join(", ")||"Sport non renseigné"}
async function performanceLoad(id,days,force){
 days=[7,30,90,180].indexOf(Number(days))>=0?Number(days):30;
 if(!id||performanceLoading[id])return;
 var cached=performanceCache[id];
 if(!force&&cached&&cached.days===days&&Date.now()-cached.loadedAt<300000)return;
 performanceLoading[id]=true;
 try{
  var data=await q(db.functions.invoke("athlys-performance-analysis",{body:{action:"performance",athleteId:id,days:days,asOf:today()}}));
  performanceCache[id]=Object.assign({},data,{days:days,loadedAt:Date.now()});
 }catch(e){performanceCache[id]={error:String(e&&e.message||"Analyse serveur indisponible"),days:days,loadedAt:Date.now()};}
 finally{performanceLoading[id]=false;if(["home","team","performance"].includes(view))render();}
}
async function performanceLoadTeam(force){
 if(!isCoach()||teamAnalyticsLoading)return;
 if(!force&&teamAnalyticsCache&&Date.now()-teamAnalyticsCache.loadedAt<300000)return;
 teamAnalyticsLoading=true;
 try{
  var data=await q(db.functions.invoke("athlys-performance-analysis",{body:{action:"team",asOf:today()}}));
  teamAnalyticsCache=Object.assign({},data,{loadedAt:Date.now()});
 }catch(e){teamAnalyticsCache={error:String(e&&e.message||"Synthèse d’équipe indisponible"),loadedAt:Date.now()};}
 finally{teamAnalyticsLoading=false;if(["home","team","performance"].includes(view))render();}
}
async function performanceLoadRisk(id,force){
 if(!id||performanceRiskLoading[id])return;
 var cached=performanceRiskCache[id];
 if(!force&&cached&&Date.now()-cached.loadedAt<300000)return;
 performanceRiskLoading[id]=true;
 try{
  var data=await q(db.functions.invoke("athlys-performance-analysis",{body:{action:"risk",athleteId:id,asOf:today()}}));
  performanceRiskCache[id]=Object.assign({},data,{loadedAt:Date.now()});
 }catch(e){performanceRiskCache[id]={error:String(e&&e.message||"Simulation serveur indisponible"),loadedAt:Date.now()};}
 finally{performanceRiskLoading[id]=false;if(view==="performance")render();}
}
function teamRow(id){return teamAnalyticsCache&&Array.isArray(teamAnalyticsCache.rows)?teamAnalyticsCache.rows.find(function(x){return x.id===id})||null:null}
function load7(id){var p=performanceCache[id],r=teamRow(id);return p&&p.summary?Number(p.summary.acuteLoad)||0:r&&r.shared?Number(r.load7)||0:0}
function ratio(id){var p=performanceCache[id],r=teamRow(id);return p&&p.summary?p.summary.acuteChronicRatioPercent:r&&r.shared?r.ratioPercent:null}
function readiness(c){if(!c)return null;var id=c.athlete_id||c.id,p=performanceCache[id],r=teamRow(id);return p&&p.summary?p.summary.readiness:r&&r.shared?r.readiness:null}
function fatigue(c){if(!c)return null;var id=c.athlete_id||c.id,p=performanceCache[id],r=teamRow(id);return p&&p.summary?p.summary.fatigue:r&&r.shared?r.fatigue:null}
function alerts(){
 if(isCoach()){
  var rows=teamAnalyticsCache&&Array.isArray(teamAnalyticsCache.alerts)?teamAnalyticsCache.alerts:[];
  return rows.map(function(x){var a=by(D.roster,x.athleteId)||{};return{name:a.full_name||"Athlète",kind:x.kind,text:x.text,athleteId:x.athleteId}});
 }
 var p=performanceCache[own()],rows=p&&Array.isArray(p.alerts)?p.alerts:[];
 return rows.map(function(x){return{name:"Mon suivi",kind:x.kind,text:x.text,athleteId:own()}});
}
async function loadProfile(){try{profile=await q(db.from("profiles").select("*").eq("id",session.user.id).maybeSingle())}catch(error){if(!window.AthlysOfflineStore||!/fetch|network|timeout|connection/i.test(String(error&&error.message||error)))throw error;var cached=await window.AthlysOfflineStore.loadSnapshot(session.user.id);profile=cached&&cached.profile||null}if(!profile)throw new Error("Profil Athlys introuvable. Connecte-toi une première fois en ligne pour activer le mode hors ligne.")}
async function loadMessages(){var c=isCoach()?own():coachId(),a=isCoach()?selectedMessageAthlete:own();D.messages=c&&a?await opt(db.from("coach_messages").select("*").eq("coach_id",c).eq("athlete_id",a).order("created_at").limit(200),[]):[]}
async function loadTeamMessages(teamId){if(!teamId){D.teamMessages=[];loadedTeamMessagesFor=null;return}D.teamMessages=await opt(db.from("coach_team_messages").select("*").eq("team_id",teamId).order("created_at").limit(300),[]);loadedTeamMessagesFor=teamId}
function teamMemberName(id){if(id===own())return profile&&profile.full_name||"Moi";var p=(D.teamPeople||[]).find(function(x){return x.id===id})||(D.roster||[]).find(function(x){return x.id===id});return p&&p.full_name||"Membre"}
function teamBubble(x){var mine=x.sender_id===own();return '<article class="message-bubble '+(mine?"mine":"")+'"><small class="team-message-author">'+esc(teamMemberName(x.sender_id))+'</small><p>'+esc(x.content)+'</p><small>'+dateFR(x.created_at,true)+'</small></article>'}
function appendTeamChatMessage(message){if(!message||message.team_id!==activeChatTeamId||D.teamMessages.some(function(x){return x.id===message.id}))return;D.teamMessages.push(message);var box=$("#message-list");if(box){box.insertAdjacentHTML("beforeend",teamBubble(message));box.scrollTop=box.scrollHeight}}
async function fetchData(){
 if(!profile)return;
 if(!navigator.onLine&&window.AthlysOfflineStore){var cached=await window.AthlysOfflineStore.loadSnapshot(own());if(cached&&cached.data){Object.keys(D).forEach(function(k){if(cached.data[k]!==undefined)D[k]=cached.data[k]});await applyOfflineQueue()}if(isCoach()){["checkins","logs","notes","goals","records","results","measurements","weekly"].forEach(function(k){D[k]=[]});teamAnalyticsCache=null;performanceCache={};performanceRiskCache={}}return}
 offlineFetchHadErrors=false;
 var links=[],ids=[],cId=coachId();
 if(isCoach()){
  links=await opt(db.from("coach_athletes").select("*").eq("coach_id",own()),[]);
  D.roster=links.length?await opt(db.from("profiles").select("id,full_name,first_name,last_name,role").in("id",links.map(function(x){return x.athlete_id})),[]):[];
  ids=D.roster.map(function(x){return x.id});
  D.coachDetails=await opt(db.from("coach_details").select("*").eq("coach_id",own()).maybeSingle(),null);
  D.athleteDetails=ids.length?await opt(db.from("athlete_details").select("*").in("athlete_id",ids),[]):[];
  D.coachCode=await opt(db.rpc("get_my_coach_code"),"");
 }else{
  links=await opt(db.from("coach_athletes").select("*").eq("athlete_id",own()),[]);
  cId=links[0]&&links[0].coach_id||null;D.coachDetails=cId?{coach_id:cId}:null;D.roster=[];
  D.details=await opt(db.from("athlete_details").select("*").eq("athlete_id",own()).maybeSingle(),null);
  D.athleteDetails=D.details?[D.details]:[];ids=[own()];
 }
 var sharedIds=isCoach()?D.athleteDetails.filter(function(x){return x.share_with_coach===true}).map(function(x){return x.athlete_id}):ids;var safeIds=sharedIds.length?sharedIds:["00000000-0000-0000-0000-000000000000"];
 D.events=await opt(db.from("calendar_events").select("*").gte("starts_at",new Date(Date.now()-30*86400000).toISOString()).order("starts_at").limit(300),[]);
 D.events=D.events.filter(function(x){return isCoach()?x.coach_id===own():(x.coach_id===cId&&(x.athlete_id===own()||x.athlete_id===null))});
 D.checkins=await opt(db.from("athlete_checkins").select("*").in("athlete_id",safeIds).order("created_at",{ascending:false}).limit(500),[]);
 D.logs=await opt(db.from("training_logs").select("*").in("athlete_id",safeIds).gte("session_date",new Date(Date.now()-180*86400000).toISOString().slice(0,10)).order("session_date",{ascending:false}).limit(600),[]);
 if(isCoach())D.programs=await opt(db.from("training_programs").select("*").eq("coach_id",own()).order("created_at",{ascending:false}),[]);
 else D.programs=cId?await opt(db.from("training_programs").select("*").eq("coach_id",cId).or("athlete_id.eq."+own()+",athlete_id.is.null").order("created_at",{ascending:false}),[]):[];
 var pids=D.programs.map(function(x){return x.id});D.sessions=pids.length?await opt(db.from("program_sessions").select("*").in("program_id",pids).order("sequence_number"),[]):[];
 D.goals=await opt(db.from("athlete_goals").select("*").in("athlete_id",safeIds).order("target_date"),[]);
 D.records=await opt(db.from("personal_records").select("*").in("athlete_id",safeIds).order("achieved_on",{ascending:false}),[]);
 D.measurements=await opt(db.from("athlete_measurements").select("*").in("athlete_id",safeIds).order("measured_at",{ascending:false}).limit(250),[]);
 D.exercises=await opt(db.from("exercise_library").select("*").order("title").limit(300),[]);
 D.equipment=await opt(db.from("athlete_equipment").select("*").in("athlete_id",safeIds).order("created_at",{ascending:false}),[]);
 D.results=await opt(db.from("competition_results").select("*").in("athlete_id",safeIds).order("result_date",{ascending:false}),[]);
 D.teams=await opt(db.from("coach_teams").select("*").eq("coach_id",isCoach()?own():cId).order("name"),[]);
 var tids=D.teams.map(function(x){return x.id});D.members=tids.length?await opt(db.from("coach_team_members").select("*").in("team_id",tids),[]):[];var teamPersonIds=Array.from(new Set(D.members.map(function(x){return x.athlete_id}).concat(D.teams.map(function(x){return x.coach_id}))));D.teamPeople=teamPersonIds.length?await opt(db.from("profiles").select("id,full_name").in("id",teamPersonIds),[]):[];
 if(isCoach())D.questionnaires=await opt(db.from("coach_questionnaires").select("*").eq("coach_id",own()).order("created_at",{ascending:false}),[]);
 else D.questionnaires=await opt(db.from("coach_questionnaires").select("*").eq("active",true).or("athlete_id.eq."+own()+",athlete_id.is.null"),[]);
 var qids=D.questionnaires.map(function(x){return x.id});D.responses=qids.length?await opt(db.from("questionnaire_responses").select("*").in("questionnaire_id",qids),[]):[];
 D.notifications=await opt(db.from("athlys_notifications").select("*").order("created_at",{ascending:false}).limit(50),[]);
 D.notes=await opt(db.from("athlete_notes").select("*").in("athlete_id",safeIds).order("created_at",{ascending:false}).limit(100),[]);
 D.weekly=await opt(db.from("athlete_weekly_reviews").select("*").in("athlete_id",safeIds).order("week_start",{ascending:false}).limit(60),[]);
 D.videos=await opt(db.from("athlete_technique_videos").select("*").in("athlete_id",safeIds).order("created_at",{ascending:false}).limit(60),[]);
 if(isCoach()&&!selectedMessageAthlete&&D.roster.length)selectedMessageAthlete=D.roster[0].id;
 if(!isCoach())selectedMessageAthlete=own();
 try{await loadMessages()}catch(messageError){if(/fetch|network|timeout|connection/i.test(String(messageError&&messageError.message||messageError)))offlineFetchHadErrors=true;else throw messageError}
 if(offlineFetchHadErrors&&window.AthlysOfflineStore){var fallback=await window.AthlysOfflineStore.loadSnapshot(own());if(fallback&&fallback.data){Object.keys(D).forEach(function(k){if(fallback.data[k]!==undefined)D[k]=fallback.data[k]});await applyOfflineQueue()}return}
 if(window.AthlysOfflineStore&&navigator.onLine){try{await window.AthlysOfflineStore.saveSnapshot(own(),profile,D);Promise.resolve().then(syncOfflineQueue)}catch(cacheError){console.warn("Athlys cache local:",cacheError.message)}}
}
function chatPeerId(){return isCoach()?selectedMessageAthlete:coachId()}
function chatConversationTopic(){var c=coachId(),a=chatPeerId();return c&&a?"athlys-rtc:"+c+":"+a:null}
function chatNetworkLooksWeak(){
 if(!navigator.onLine)return false;
 var n=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
 if(!n)return false;
 return /^(slow-2g|2g)$/.test(String(n.effectiveType||""))||Number(n.rtt||0)>=650||(Number(n.downlink||99)>0&&Number(n.downlink)<0.65);
}
function chatTransportLabel(){
 if(chatTransportMode==="websocket")return "WebSocket natif · sélection manuelle";
 if(chatRtcCurrent==="webrtc"&&chatRtcData&&chatRtcData.readyState==="open")return "WebRTC direct · secours WebSocket";
 if(chatTransportMode==="webrtc")return chatRtcState||"Tentative WebRTC · secours WebSocket";
 if(chatNetworkLooksWeak())return "Réseau lent · tentative WebRTC";
 return "WebSocket natif · connexion stable";
}
function updateChatTransportUI(){
 var n=$("#chat-transport-status");
 if(n){n.textContent=chatTransportLabel();n.classList.toggle("rtc-active",chatRtcCurrent==="webrtc"&&chatRtcData&&chatRtcData.readyState==="open")}
}
function closeChatRtcPeer(){
 if(chatRtcDisconnectTimer){clearTimeout(chatRtcDisconnectTimer);chatRtcDisconnectTimer=null}
 if(chatRtcHandshakeTimer){clearTimeout(chatRtcHandshakeTimer);chatRtcHandshakeTimer=null}
 if(chatRtcData){try{chatRtcData.close()}catch(e){}chatRtcData=null}
 if(chatRtcPeer){try{chatRtcPeer.close()}catch(e){}chatRtcPeer=null}
 chatRtcIceQueue=[];chatRtcOfferBusy=false;chatRtcCurrent="websocket";
}
function stopChatRtc(reason){
 if(chatRtcProbeTimer){clearInterval(chatRtcProbeTimer);chatRtcProbeTimer=null}
 closeChatRtcPeer();
 if(chatRtcChannel&&db){var old=chatRtcChannel;chatRtcChannel=null;db.removeChannel(old).catch(function(){})}
 chatRtcTopic=null;chatRtcPeerUser=null;chatRtcState=reason||"WebSocket natif";updateChatTransportUI();
}
async function sendChatRtcSignal(type,data){
 if(!chatRtcChannel||!chatRtcTopic)return false;
 try{
  var result=await chatRtcChannel.send({type:"broadcast",event:"signal",payload:Object.assign({type:type,from:own(),sent_at:Date.now()},data||{})});
  return result==="ok";
 }catch(e){console.warn("Athlys RTC signal:",e.message);return false}
}
function chatRtcAppendMessage(message){
 if(!message||!message.id||message.coach_id!==coachId()||message.athlete_id!==chatPeerId()||message.sender_id!==chatRtcPeerUser)return;
 if(D.messages.some(function(x){return x.id===message.id}))return;
 D.messages.push(message);D.messages.sort(function(a,b){return new Date(a.created_at)-new Date(b.created_at)});
 var box=$("#message-list");if(box){box.insertAdjacentHTML("beforeend",bubble(message));box.scrollTop=box.scrollHeight}
}
function appendChatMessageOnce(message){
 if(!message||message.athlete_id!==(isCoach()?selectedMessageAthlete:own()))return;
 if(D.messages.some(function(x){return x.id===message.id}))return;
 D.messages.push(message);
 var box=$("#message-list");if(box){box.insertAdjacentHTML("beforeend",bubble(message));box.scrollTop=box.scrollHeight}
}
function armChatRtcHandshakeTimeout(){if(chatRtcHandshakeTimer)clearTimeout(chatRtcHandshakeTimer);chatRtcHandshakeTimer=setTimeout(function(){if(chatRtcCurrent!=="webrtc"){closeChatRtcPeer();chatRtcState="Connexion directe impossible · WebSocket";updateChatTransportUI()}},15000)}
function bindChatRtcData(data){
 chatRtcData=data;
 data.onopen=function(){if(chatRtcHandshakeTimer){clearTimeout(chatRtcHandshakeTimer);chatRtcHandshakeTimer=null}chatRtcCurrent="webrtc";chatRtcState="WebRTC direct";updateChatTransportUI()};
 data.onclose=function(){if(chatRtcData===data){chatRtcData=null;chatRtcCurrent="websocket";chatRtcState="Canal WebRTC fermé · secours WebSocket";updateChatTransportUI()}};
 data.onerror=function(){chatRtcCurrent="websocket";chatRtcState="Erreur WebRTC · secours WebSocket";updateChatTransportUI()};
 data.onmessage=function(event){
  var packet;try{packet=JSON.parse(event.data)}catch(e){return}
  if(packet.type==="chat")chatRtcAppendMessage(packet.message);
  else if(packet.type==="ping"&&data.readyState==="open"){try{data.send(JSON.stringify({type:"pong",id:packet.id}))}catch(e){}}
  else if(packet.type==="pong"&&packet.id===chatRtcProbeSent){chatRtcNetworkRtt=Date.now()-Number(packet.sent_at||Date.now());chatRtcProbeSent=0}
 };
}
function createChatRtcPeer(){
 if(chatRtcPeer)return chatRtcPeer;
 if(!window.RTCPeerConnection)throw new Error("WebRTC n’est pas pris en charge par ce navigateur.");
 var pc=new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"}],iceCandidatePoolSize:2});
 chatRtcPeer=pc;
 pc.onicecandidate=function(e){if(e.candidate)sendChatRtcSignal("candidate",{candidate:e.candidate})};
 pc.ondatachannel=function(e){bindChatRtcData(e.channel)};
 pc.onconnectionstatechange=function(){
  if(pc.connectionState==="connected"){chatRtcState="WebRTC direct";chatRtcCurrent="webrtc";updateChatTransportUI()}
  else if(pc.connectionState==="failed"||pc.connectionState==="closed"){
   closeChatRtcPeer();chatRtcState="Liaison directe indisponible · WebSocket";updateChatTransportUI()
  }else if(pc.connectionState==="disconnected"){
   if(chatRtcDisconnectTimer)clearTimeout(chatRtcDisconnectTimer);
   chatRtcDisconnectTimer=setTimeout(function(){if(chatRtcPeer===pc&&pc.connectionState==="disconnected"){closeChatRtcPeer();chatRtcState="WebRTC interrompu · WebSocket";updateChatTransportUI()}},5000);
  }
 };
 if(isCoach())bindChatRtcData(pc.createDataChannel("athlys-chat",{ordered:true}));
 return pc;
}
async function flushChatRtcIce(){
 if(!chatRtcPeer||!chatRtcPeer.remoteDescription)return;
 var queued=chatRtcIceQueue.slice();chatRtcIceQueue=[];
 for(var i=0;i<queued.length;i++){try{await chatRtcPeer.addIceCandidate(queued[i])}catch(e){console.warn("Athlys RTC ICE:",e.message)}}
}
async function createChatRtcOffer(){
 if(!isCoach()||!chatRtcChannel)return;
 var pc=createChatRtcPeer();
 if(pc.localDescription&&pc.localDescription.type==="offer"){await sendChatRtcSignal("offer",{description:pc.localDescription});return}
 if(pc.signalingState!=="stable"||chatRtcOfferBusy)return;
 chatRtcOfferBusy=true;
 try{
  var offer=await pc.createOffer();await pc.setLocalDescription(offer);
  await sendChatRtcSignal("offer",{description:pc.localDescription});
  armChatRtcHandshakeTimeout();chatRtcState="Négociation WebRTC…";updateChatTransportUI();
 }catch(e){chatRtcState="Négociation impossible · WebSocket";console.warn("Athlys RTC offer:",e.message);updateChatTransportUI()}
 finally{chatRtcOfferBusy=false}
}
async function handleChatRtcSignal(raw){
 var signal=raw&&raw.payload&&raw.payload.type?raw.payload:raw;
 if(!signal||signal.from!==chatRtcPeerUser)return;
 if(signal.type==="probe"){sendChatRtcSignal("probe-ack",{id:signal.id});return}
 if(signal.type==="probe-ack"){
  if(signal.id===chatRtcProbeSent){
   chatRtcNetworkRtt=Date.now()-chatRtcProbeSent;chatRtcProbeSent=0;
   if(chatTransportMode==="auto"&&chatRtcNetworkRtt>=850)attemptChatRtc("latence WebSocket élevée");
  }
  return;
 }
 if(signal.type==="need-offer"){if(isCoach()&&chatTransportMode!=="websocket")createChatRtcOffer();return}
 if(signal.type==="offer"&&!isCoach()){
  try{
   var pc=createChatRtcPeer();if(pc.remoteDescription&&pc.remoteDescription.type==="offer")return;await pc.setRemoteDescription(signal.description);await flushChatRtcIce();
   var answer=await pc.createAnswer();await pc.setLocalDescription(answer);
   await sendChatRtcSignal("answer",{description:pc.localDescription});
   armChatRtcHandshakeTimeout();chatRtcState="Négociation WebRTC…";updateChatTransportUI();
  }catch(e){chatRtcState="Offre WebRTC refusée · WebSocket";console.warn("Athlys RTC answer:",e.message);updateChatTransportUI()}
  return;
 }
 if(signal.type==="answer"&&isCoach()){
  try{if(!chatRtcPeer)return;await chatRtcPeer.setRemoteDescription(signal.description);await flushChatRtcIce();chatRtcState="Négociation WebRTC…";updateChatTransportUI()}
  catch(e){chatRtcState="Réponse WebRTC invalide · WebSocket";console.warn("Athlys RTC remote answer:",e.message);updateChatTransportUI()}
  return;
 }
 if(signal.type==="candidate"&&signal.candidate){
  try{if(chatRtcPeer&&chatRtcPeer.remoteDescription)await chatRtcPeer.addIceCandidate(signal.candidate);else chatRtcIceQueue.push(signal.candidate)}catch(e){console.warn("Athlys RTC candidate:",e.message)}
 }
}
function chatStartProbe(){
 if(chatRtcProbeTimer)clearInterval(chatRtcProbeTimer);
 function tick(){
  if(!chatRtcChannel||chatTransportMode==="websocket"||chatRtcCurrent==="webrtc")return;
  if(chatTransportMode==="webrtc"||chatNetworkLooksWeak()){
   if(isCoach())createChatRtcOffer();else sendChatRtcSignal("need-offer",{});
   return;
  }
  if(chatRtcProbeSent)return;
  chatRtcProbeSent=Date.now();var probeId=chatRtcProbeSent;
  sendChatRtcSignal("probe",{id:probeId}).then(function(ok){if(!ok&&chatRtcProbeSent===probeId)chatRtcProbeSent=0});
  setTimeout(function(){if(chatRtcProbeSent===probeId&&Date.now()-probeId>5000)chatRtcProbeSent=0},5200);
 }
 tick();chatRtcProbeTimer=setInterval(tick,10000);
}
async function attemptChatRtc(reason){
 if(!chatRtcChannel||chatRtcCurrent==="webrtc")return;
 if(!window.RTCPeerConnection){chatRtcState="WebRTC indisponible · WebSocket";updateChatTransportUI();return}
 chatRtcState="Tentative WebRTC ("+(reason||"réseau lent")+")…";updateChatTransportUI();
 if(isCoach())await createChatRtcOffer();else await sendChatRtcSignal("need-offer",{});
}
async function activateChatTransport(){
 if(view!=="messages"||!coachId()||!chatPeerId())return;
 if(chatTransportMode==="websocket"){stopChatRtc("WebSocket natif · sélection manuelle");return}
 var topic=chatConversationTopic();
 if(chatRtcTopic&&chatRtcTopic!==topic)stopChatRtc("Changement de conversation");
 if(!chatRtcChannel){
  if(!window.RTCPeerConnection){chatRtcState="WebRTC non pris en charge · WebSocket";chatRtcCurrent="websocket";updateChatTransportUI();return}
  chatRtcTopic=topic;chatRtcPeerUser=chatPeerId();chatRtcState="Connexion au canal de négociation…";updateChatTransportUI();
  chatRtcChannel=db.channel(topic,{config:{private:true,broadcast:{ack:true}}});
  chatRtcChannel.on("broadcast",{event:"signal"},function(payload){handleChatRtcSignal(payload)});
  chatRtcChannel.subscribe(function(status,error){
   if(status==="SUBSCRIBED"){
    chatRtcState="Canal de négociation prêt · WebSocket";updateChatTransportUI();
    chatStartProbe();
   }else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"||status==="CLOSED"){
    chatRtcState="Négociation indisponible · WebSocket";updateChatTransportUI();
    if(error)console.warn("Athlys RTC channel:",error.message||error);
   }
  });
 }else if(chatTransportMode==="webrtc"||chatNetworkLooksWeak()){
  if(isCoach())await createChatRtcOffer();else await sendChatRtcSignal("need-offer",{});
 }
}
function onChatNetworkChange(){
 if(!session||view!=="messages")return;
 if(!navigator.onLine){stopChatRtc("Hors ligne · messages en attente");return}
 if(chatTransportMode==="websocket"){updateChatTransportUI();return}
 if(chatTransportMode==="webrtc"||(chatTransportMode==="auto"&&chatNetworkLooksWeak()))activateChatTransport();
 else if(chatTransportMode==="auto"&&chatRtcCurrent==="webrtc"){closeChatRtcPeer();chatRtcState="Connexion stable · WebSocket natif";updateChatTransportUI()}
 else if(chatTransportMode==="auto")updateChatTransportUI();
}
function notifyIncomingChat(message){if(!message||message.sender_id===own())return;var title="Nouveau message Athlys",body=String(message.content||"Tu as reçu un message.").slice(0,140),nativePlatform=window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform(),plugin=window.athlysLocalNotifications||(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.LocalNotifications);if(nativePlatform&&plugin&&document.visibilityState!=="visible"){plugin.schedule({notifications:[{id:88730,title:title,body:body,schedule:{at:new Date(Date.now()+1200)} }] }).catch(console.warn)}else if(!nativePlatform&&document.visibilityState!=="visible"&&"Notification"in window&&Notification.permission==="granted"){new Notification(title,{body:body,icon:"/assets/athlys-logo.png"})}}
function subscribeMessages(){if(channel)db.removeChannel(channel);if(!coachId())return;channel=db.channel("athlys-complete-"+own()).on("postgres_changes",{event:"INSERT",schema:"public",table:"coach_messages",filter:"coach_id=eq."+coachId()},function(p){if(p.new&&p.new.athlete_id===(isCoach()?selectedMessageAthlete:own())){appendChatMessageOnce(p.new);notifyIncomingChat(p.new)}}).on("postgres_changes",{event:"INSERT",schema:"public",table:"coach_team_messages",filter:"coach_id=eq."+coachId()},function(p){if(p.new&&p.new.team_id===activeChatTeamId)appendTeamChatMessage(p.new)}).subscribe()}
function loadNotifs(){if(db)db.from("athlys_notifications").select("*").order("created_at",{ascending:false}).limit(50).then(function(r){if(!r.error){D.notifications=r.data||[];var el=$("#notification-count"),v=D.notifications.filter(function(x){return !x.read_at}).length;if(el){el.textContent=v||"";el.hidden=!v}}})}
function avatar(n){return '<span class="avatar">'+esc(String(n||"A").trim().split(/\s+/).slice(0,2).map(function(x){return x[0]}).join("").toUpperCase())+'</span>'}
function pill(t,k){return '<span class="pill '+(k||"")+'">'+esc(t)+'</span>'}
function btn(t,a,k,id){return '<button class="btn '+(k||"secondary")+'" type="button" data-action="'+a+'" '+(id?'data-id="'+id+'"':"")+'>'+t+'</button>'}
function card(t,b,right){return '<section class="card"><div class="card-head"><h2>'+t+'</h2>'+(right||"")+'</div>'+b+'</section>'}
function metric(t,v,s){return '<div class="metric"><small>'+t+'</small><b>'+esc(v==null?"—":String(v))+'</b><span>'+esc(s||"")+'</span></div>'}
function empty(t,d,a){return '<div class="empty"><b>'+t+'</b><p>'+d+'</p>'+(a||"")+'</div>'}
function field(t,n,type,v,min,max,step){return '<label>'+t+'<input name="'+n+'" type="'+(type||"text")+'" value="'+esc(v==null?"":v)+'" '+(min!=null?'min="'+min+'"':"")+(max!=null?' max="'+max+'"':"")+(step?' step="'+step+'"':"")+'></label>'}
function sel(t,n,opts,v){return '<label>'+t+'<select name="'+n+'">'+opts.map(function(x){return '<option value="'+esc(x[0])+'" '+(String(x[0])===String(v)?"selected":"")+' >'+esc(x[1])+'</option>'}).join("")+'</select></label>'}
function moodSvg(level,kind){
 var n=kind==="stress"?6-level:level;
 var mouths=["M6.8 17.2 Q12 11.2 17.2 17.2","M7 16.2 Q12 13 17 16.2","M7 15.2 H17","M7 14 Q12 18.2 17 14","M6.5 12.8 Q12 21 17.5 12.8"];
 return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="9" cy="9.4" r="1" fill="currentColor"/><circle cx="15" cy="9.4" r="1" fill="currentColor"/><path d="'+mouths[Math.max(0,Math.min(4,n-1))]+'" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
}
function feelingScale(label,name,value,kind){
 var v=Math.max(1,Math.min(5,Number(value)||3));
 var labels={feeling:["Très basse","Basse","Moyenne","Bonne","Très bonne"],stress:["Très faible","Faible","Modéré","Élevé","Très élevé"],recovery:["Très faible","Faible","Moyenne","Bonne","Excellente"],mental_wellbeing:["Très bas","Bas","Moyen","Bon","Très bon"],energy:["Très basse","Basse","Moyenne","Bonne","Élevée"]}[name]||["1","2","3","4","5"];
 return '<fieldset class="feeling-scale"><legend>'+esc(label)+' /5</legend><input type="hidden" name="'+name+'" value="'+v+'" data-scale-input="'+name+'"><div class="feeling-scale-options">'+[1,2,3,4,5].map(function(n){return '<button type="button" class="feeling-scale-option" data-scale-option="'+name+'" data-value="'+n+'" aria-pressed="'+(v===n)+'" aria-label="'+esc(label+" : "+labels[n-1])+'">'+moodSvg(n,kind||name)+'<b>'+n+'</b><small>'+esc(labels[n-1])+'</small></button>'}).join("")+'</div></fieldset>';
}
function area(t,n,v,r){return '<label>'+t+'<textarea name="'+n+'" rows="'+(r||3)+'">'+esc(v||"")+'</textarea></label>'}
function heading(k,t,d,a){return '<div class="heading"><div><small>'+k+'</small><h1>'+t+'</h1><p>'+d+'</p></div><div class="actions">'+(a||"")+'</div></div>'}
function rowEvent(e){return '<div class="list-row"><div class="date-box"><b>'+new Date(e.starts_at||e.session_date+"T12:00:00").getDate()+'</b><small>'+new Date(e.starts_at||e.session_date+"T12:00:00").toLocaleDateString("fr-FR",{month:"short"})+'</small></div><div class="row-main"><b>'+esc(e.title)+'</b><small>'+dateFR(e.starts_at||e.session_date,true)+(e.discipline?" · "+esc(e.discipline):"")+'</small></div><div class="row-end">'+(e.planned_intensity?pill("RPE "+e.planned_intensity):e.rpe?pill("RPE "+e.rpe):"")+'</div></div>'}
function rowLog(x){return '<div class="list-row"><div class="symbol">◷</div><div class="row-main"><b>'+esc(x.title)+'</b><small>'+dateFR(x.session_date)+(x.discipline?" · "+esc(x.discipline):"")+'</small></div><div class="row-end"><b>'+(x.duration_minutes||"—")+' min</b><small>'+(x.rpe?"RPE "+x.rpe:"")+'</small></div></div>'}
function rowsGoals(list){if(!list.length)return empty("Pas encore d’objectif","Définis une cible sportive mesurable.",btn("Créer un objectif","goal-new","primary"));return list.map(function(g){var p=g.target_value?Math.max(0,Math.min(100,Number(g.current_value||0)/Number(g.target_value)*100)):0;return '<div class="goal"><div><b>'+esc(g.title)+'</b>'+pill(g.status==="completed"?"Terminé":"En cours")+'</div><small>'+(g.current_value==null?"—":g.current_value)+" "+esc(g.unit)+" / "+(g.target_value==null?"—":g.target_value)+" "+esc(g.unit)+'</small><div class="progress"><i style="width:'+p+'%"></i></div></div>'}).join("")}
function rowsAlerts(){var a=alerts();return a.length?a.map(function(x){return '<div class="alert '+x.kind+'"><b>'+esc(x.name)+'</b><p>'+esc(x.text)+'</p></div>'}).join(""):empty("Aucun point de vigilance","Les alertes reposent sur les données déclarées.")}
function rowsRoster(list){return list.length?list.map(function(x){return '<button class="roster-row" data-action="select-athlete" data-name="'+esc(x.full_name.toLowerCase())+'" data-id="'+x.id+'">'+avatar(x.full_name)+'<span><b>'+esc(x.full_name)+'</b><small>'+esc((D.athleteDetails||[]).find(function(d){return d.athlete_id===x.id})?.sport||"Sport à compléter")+'</small></span><b class="roster-num">'+(latestCheck(x.id)?readiness(latestCheck(x.id))+"/100":"—")+'</b></button>'}).join(""):empty("Aucun athlète relié","Génère un code coach pour inviter ton groupe.",btn("Créer un code","make-code","primary"))}
function quick(){return '<div class="quick-grid">'+[['schedule','Agenda','Planifier'],['training','Séances','Enregistrer'],['goals','Objectifs','Progresser'],['messages','Messages','Échanger']].map(function(x){return '<button data-nav="'+x[0]+'"><b>'+x[1]+'</b><small>'+x[2]+'</small></button>'}).join("")+'</div>'}
function coachWeekPanel(){
 if(!teamAnalyticsCache&&!teamAnalyticsLoading)performanceLoadTeam();
 var now=Date.now(),week=7*86400000,upcoming=D.events.filter(function(x){var d=new Date(x.starts_at).getTime();return d>=now&&d<now+week}),summary=teamAnalyticsCache&&teamAnalyticsCache.summary||{},shared=Number(summary.sharedAthletes)||0,needs=Number(summary.staleCheckins)||0,mean=Number(summary.meanLoad7)||0,done=Number(summary.sessions7)||0,completion=Number(summary.freshRatePercent)||0,alertsNow=alerts().filter(function(x){return x.kind==="warn"}).slice(0,3);
 var body='<div class="coach-pulse"><div class="pulse-head"><div><small>VUE D’ENSEMBLE · 7 JOURS</small><h3>Le groupe en un coup d’œil</h3></div><span class="pulse-period">Cette semaine</span></div><div class="pulse-grid"><div><b>'+(shared?completion+"%":"—")+'</b><small>Suivis récents</small><i><em style="width:'+completion+'%"></em></i></div><div><b>'+(teamAnalyticsCache?done:"—")+'</b><small>Séances réalisées</small></div><div><b>'+upcoming.length+'</b><small>À venir</small></div><div><b>'+(shared?mean:"—")+'</b><small>Charge moyenne · UA</small></div></div><div class="pulse-footer"><span>'+needs+' suivi(s) à actualiser</span><button data-nav="team">Ouvrir l’effectif <b>→</b></button><button data-nav="schedule">Planning <b>→</b></button></div>';
 if(alertsNow.length)body+='<div class="pulse-alerts">'+alertsNow.map(function(x){return '<div><b>'+esc(x.name)+'</b><span>'+esc(x.text)+'</span></div>'}).join("")+'</div>';
 if(teamAnalyticsCache&&teamAnalyticsCache.error)body+='<p class="muted">Synthèse distante indisponible : '+esc(teamAnalyticsCache.error)+'</p>';
 else if(teamAnalyticsLoading)body+='<p class="muted">Calcul des indicateurs sur les serveurs Athlys…</p>';
 return card("Pilotage hebdomadaire",body+'</div>').replace('<section class="card">','<section class="card coach-week-card">');
}

function viewHome(){
 if(isCoach()){
  if(!teamAnalyticsCache&&!teamAnalyticsLoading)performanceLoadTeam();
  var summary=teamAnalyticsCache&&teamAnalyticsCache.summary||{},risks=alerts().filter(function(x){return x.kind==="warn"}),up=D.events.filter(function(x){return new Date(x.starts_at)>=new Date()}).slice(0,5),recent=Number(summary.sessions7)||0;
  return heading("TABLEAU DE BORD","Bonjour "+esc(profile.first_name||"Coach"),"Les priorités de ton équipe, sans perdre de vue le terrain.",btn("＋ Planifier","event-new","primary")+btn("＋ Programme","program-new"))+'<div class="metrics">'+metric("Athlètes",D.roster.length,"Effectif actif")+metric("Vigilances",teamAnalyticsCache?risks.length:"—","À examiner avec le sportif")+metric("Séances 7j",teamAnalyticsCache?recent:"—","Calcul serveur")+metric("À venir",up.length,"Prochains rendez-vous")+'</div>'+coachWeekPanel()+'<div class="columns"><div>'+card("Ton équipe",rowsRoster(D.roster.slice(0,8)),btn("Tout voir","team-open","link"))+card("Prochaines séances",up.map(rowEvent).join("")||empty("Planning vide","Ajoute un entraînement."),btn("Ouvrir l’agenda","schedule-open","link"))+'</div><div>'+card("Points de vigilance",rowsAlerts())+card("Raccourcis",quick())+'</div></div>';
 }
 var id=own();if(!performanceCache[id]&&!performanceLoading[id])performanceLoad(id,30);
 var c=latestCheck(id),next=D.events.filter(function(x){return new Date(x.starts_at)>=new Date()}).sort(function(a,b){return new Date(a.starts_at)-new Date(b.starts_at)})[0],goals=D.goals.filter(function(x){return x.status==="in_progress"}),summary=performanceCache[id]&&performanceCache[id].summary||{};
 return heading("ESPACE ATHLÈTE","Salut "+esc(profile.first_name||"à toi"),"Suis l’essentiel et concentre-toi sur ta progression.",btn("＋ Séance réalisée","log-new","primary")+btn("Mon ressenti","checkin-new"))+'<div class="hero"><div><small>FORME DÉCLARÉE</small><b>'+(c?c.feeling+"/5":"—/5")+'</b><p>'+(c?"Dernier point · "+dateFR(c.created_at):"Renseigne ton état du jour.")+'</p><div class="hero-track"><i style="width:'+(c?c.feeling*20:0)+'%"></i></div></div><div><small>PROCHAINE SÉANCE</small><h2>'+(next?esc(next.title):"Rien de planifié")+'</h2><p>'+(next?dateFR(next.starts_at,true):"Ton agenda est à jour.")+'</p>'+btn("Ouvrir l’agenda","schedule-open","hero-btn")+'</div></div><div class="metrics">'+metric("Charge 7 jours",summary.acuteLoad==null?"—":Math.round(summary.acuteLoad)+" UA","Calcul serveur · durée × RPE")+metric("Séances réalisées",summary.observedSessions==null?"—":summary.observedSessions,"Historique disponible")+metric("Objectifs actifs",goals.length,"À poursuivre")+metric("Records",D.records.length,"Performances")+'</div><div class="columns"><div>'+card("Entraînement récent",D.logs.slice(0,5).map(rowLog).join("")||empty("Pas de séance enregistrée","Ajoute ta première séance."))+card("Mes objectifs",rowsGoals(goals.slice(0,4)))+'</div><div>'+card("Ressenti du jour",c?"Forme "+c.feeling+"/5 · Stress "+c.stress+"/5 · Récupération "+c.recovery+"/5":checkinCard())+'</div></div>';
}

function viewTeam(){
 if(!isCoach())return heading("ESPACE COACH","Équipe","La gestion des groupes est réservée aux entraîneurs.")+card("Mon coach",D.coachDetails? "Ton coach est relié à ton compte.":"Aucun coach relié.");
 if(!teamAnalyticsCache&&!teamAnalyticsLoading)performanceLoadTeam();
 var athletes=D.roster.slice(),groups=D.teams.slice(),active=selectedAthleteId&&by(athletes,selectedAthleteId)?selectedAthleteId:null;
 if(!active&&athletes.length)active=athletes[0].id;
 selectedAthleteId=active;
 var memberships=D.members||[];
 var groupOpts=[["all","Tous les groupes"]].concat(groups.map(function(g){return [g.id,g.name]}));
 var filtered=teamFilterId==="all"?athletes:athletes.filter(function(a){return memberships.some(function(m){return m.team_id===teamFilterId&&m.athlete_id===a.id})});
 var list=filtered.map(function(a){
  var row=teamRow(a.id),detail=(D.athleteDetails||[]).find(function(x){return x.athlete_id===a.id})||{},shared=!!(row&&row.shared),load=shared?row.load7:null,r=shared?row.ratioPercent:null,read=shared?row.readiness:null;
  return '<button class="team-athlete '+(a.id===active?'selected':'')+'" data-action="select-athlete" data-name="'+esc(String(a.full_name||'').toLowerCase())+'" data-id="'+a.id+'">'+avatar(a.full_name)+'<span class="team-athlete-main"><b>'+esc(a.full_name||"Athlète")+'</b><small>'+esc(detail.sport||"Sport non renseigné")+'</small></span><span class="team-athlete-stats"><b>'+(shared&&read!==null?read+"/100":shared?"—":"Partage privé")+'</b><small>'+(shared?Math.round(load||0)+" UA · "+(r===null?"—":Math.round(r)+"%"):"Données non partagées")+'</small></span></button>';
 }).join("");
 var body='<div class="team-toolbar"><input id="team-search" type="search" placeholder="Rechercher un athlète…" autocomplete="off"><select id="team-filter">'+groupOpts.map(function(o){return '<option value="'+esc(o[0])+'" '+(String(teamFilterId)===String(o[0])?'selected':'')+'>'+esc(o[1])+'</option>'}).join("")+'</select></div>';
 body+='<div class="team-summary"><div><b>'+athletes.length+'</b><small>ATHLÈTES</small></div><div><b>'+groups.length+'</b><small>GROUPES</small></div><div><b>'+alerts().filter(function(x){return x.kind==="warn"}).length+'</b><small>VIGILANCES</small></div></div>';
 body+='<div class="team-actions">'+btn("＋ Créer un groupe","team-new","primary")+btn("Code d’invitation","make-code","secondary")+'</div>';
 var cohort=athletes.map(function(a){var row=teamRow(a.id)||{};return {a:a,shared:row.shared===true,week:row.shared?row.weekSessions:0,load:row.shared?row.load7:0,read:row.shared?row.readiness:null,age:row.shared?row.checkinAgeDays:null,quality:row.shared?row.qualityScore:0}});
 var teamSummary=teamAnalyticsCache&&teamAnalyticsCache.summary||{},fresh=Number(teamSummary.freshCheckins)||0,stale=Number(teamSummary.staleCheckins)||0,meanLoad=Number(teamSummary.meanLoad7)||0;
 body+=card("Pilotage de l’effectif · 7 jours",'<div class="team-summary"><div><b>'+fresh+'/'+(Number(teamSummary.sharedAthletes)||0)+'</b><small>CHECK-INS RÉCENTS</small></div><div><b>'+meanLoad+'</b><small>CHARGE MOYENNE · UA</small></div><div><b>'+stale+'</b><small>SUIVIS À RELANCER</small></div></div><div class="athlys-cohort-table"><div class="athlys-cohort-row head"><span>Athlète</span><span>Séances</span><span>Charge</span><span>Forme</span><span>Données</span></div>'+cohort.map(function(x){return '<button class="athlys-cohort-row" data-action="select-analysis-athlete" data-id="'+x.a.id+'"><b>'+esc(x.a.full_name)+'</b><span>'+(x.shared?x.week:"—")+'</span><span>'+(x.shared?x.load+" UA":"Privé")+'</span><span>'+(x.shared?(x.read===null?"—":x.read+"/100"):"—")+'</span><span>'+(x.shared?x.quality+"%":"—")+'</span></button>'}).join("")+'</div><p class="muted">Les indicateurs sont des aides à la lecture. Une donnée absente n’est pas assimilée à une contre-performance.</p>');

 body+='<div class="team-layout"><div class="team-list">'+(list||empty("Aucun athlète dans ce groupe","Change le filtre ou invite un sportif."))+'</div><div class="team-groups">'+card("Groupes",groups.map(function(g){var count=memberships.filter(function(m){return m.team_id===g.id}).length;return '<div class="team-group-row"><div><b>'+esc(g.name)+'</b><small>'+esc(g.discipline||"Multidiscipline")+' · '+count+' membre(s)</small></div>'+btn("Modifier","team-new","link",g.id)+'</div>'}).join("")||empty("Aucun groupe créé","Crée des groupes pour organiser ton effectif."))+'</div></div>';
 if(active){
  var a=by(athletes,active),c=latestCheck(active),row=teamRow(active)||{},detail=(D.athleteDetails||[]).find(function(x){return x.athlete_id===active})||{},logs=D.logs.filter(function(x){return x.athlete_id===active}).slice(0,5),notes=D.notes.filter(function(x){return x.athlete_id===active}).slice(0,4),goals=D.goals.filter(function(x){return x.athlete_id===active}).slice(0,4),ratioVal=row.shared?row.ratioPercent:null;
  body+='<section class="team-profile"><div class="team-profile-head">'+avatar(a.full_name)+'<div><small>FICHE ATHLÈTE</small><h2>'+esc(a.full_name)+'</h2><p>'+esc(detail.sport||"Discipline à compléter")+'</p></div>'+btn("Message","open-athlete-chat","secondary")+'</div><div class="team-profile-metrics">'+metric("Forme",row.shared&&row.readiness!=null?row.readiness+"/100":"—",row.shared&&row.lastCheckinAt?"Dernier ressenti · "+dateFR(row.lastCheckinAt):"Données non partagées ou absentes")+metric("Charge 7j",row.shared?Math.round(row.load7||0)+" UA":"—","Calcul serveur · durée × RPE")+metric("Ratio charge",ratioVal===null?"—":Math.round(ratioVal)+"%","Comparaison indicative")+'</div><div class="team-profile-grid">'+card("Dernières séances",logs.map(rowLog).join("")||empty("Pas de séance","Les séances enregistrées apparaîtront ici."))+card("Objectifs",rowsGoals(goals))+card("Notes coach",notes.map(function(n){return '<div class="team-note"><b>'+esc(n.category||"Note")+'</b><p>'+esc(n.body||"")+'</p><small>'+dateFR(n.created_at)+'</small></div>'}).join("")||empty("Aucune note","Ajoute un retour individualisé.",btn("＋ Note","note-new","primary")))+'</div></section>';
 }
 return heading("MANAGEMENT SPORTIF","Ton équipe","Effectif, groupes et suivi individuel réunis au même endroit.",btn("＋ Athlète","make-code","primary"))+body;
}

function viewSchedule(){var rows=D.events.slice().sort(function(a,b){return new Date(a.starts_at)-new Date(b.starts_at)});return heading("PLANIFICATION","Agenda partagé","Entraînements, tests, compétitions et récupération.",btn("＋ Événement","event-new","primary"))+card("Événements · "+rows.length,rows.map(function(e){return '<div class="calendar-item">'+rowEvent(e)+'<div>'+btn("Modifier","event-edit","link",e.id)+btn("Supprimer","event-delete","danger",e.id)+'</div></div>'}).join("")||empty("Aucun événement","Planifie le prochain rendez-vous.",btn("Planifier","event-new","primary")))}

var ATHLYS_TRACK_TEMPLATES=[
{id:"sprint-100-200",title:"Sprint court · 100 / 200 m",discipline:"Athlétisme · sprint",goal:"Accélération, vitesse maximale, technique de course et maintien de vitesse.",sessions:[["Accélération & départs","Éducatifs, 6 à 8 départs de 10–30 m, récupération complète.",55,7],["Vitesse maximale","Progressifs, 4 à 6 passages lancés de 20–30 m, récupération longue.",65,8],["Force & coordination","Renforcement général, gainage, bonds à faible volume et mobilité.",50,6]]},
{id:"sprint-400",title:"Sprint long · 200 / 400 m",discipline:"Athlétisme · sprint long",goal:"Vitesse, endurance de vitesse, répétition des efforts et gestion d'allure.",sessions:[["Vitesse & accélération","Départs, accélérations progressives et sprints courts.",55,7],["Endurance de vitesse","Répétitions de 120 à 250 m à intensité contrôlée, récupération longue.",70,8],["Capacité aérobie & force","Tempo léger selon profil, renforcement général et mobilité.",55,5]]},
{id:"middle-distance",title:"Demi-fond · 800 / 1500 m",discipline:"Athlétisme · demi-fond",goal:"Développement aérobie, vitesse spécifique, économie de course et tolérance à l'allure.",sessions:[["Endurance fondamentale","Course facile, éducatifs de foulée et lignes droites relâchées.",50,4],["Travail d'allure","Fractions à allure 800–1500 m adaptées au niveau et récupérations définies.",65,7],["Seuil & technique","Effort au seuil, éducatifs et renforcement léger.",60,6]]},
{id:"distance",title:"Fond · 3000 m et plus",discipline:"Athlétisme · fond",goal:"Endurance, seuil, économie de course et progressivité du volume.",sessions:[["Endurance facile","Course en aisance respiratoire, mobilité et éducatifs courts.",55,4],["Seuil aérobie","Blocs au seuil individualisés, récupération active.",70,7],["Sortie longue","Sortie confortable, durée ajustée à l'expérience et charge habituelle.",80,5]]},
{id:"hurdles",title:"Haies · 100 / 110 / 400 m",discipline:"Athlétisme · haies",goal:"Rythme inter-haies, mobilité, coordination, vitesse et franchissement.",sessions:[["Technique de haies","Mobilité, éducatifs jambe d'attaque et de retour, haies basses.",55,5],["Vitesse & rythme","Accélérations et séquences courtes entre haies adaptées au niveau.",65,7],["Coordination & force","Travail de pied, gainage, renforcement et mobilité.",50,5]]},
{id:"jumps",title:"Sauts · longueur / triple / hauteur",discipline:"Athlétisme · sauts",goal:"Vitesse d'approche, coordination, impulsion, réception et maîtrise technique.",sessions:[["Approche & vitesse","Gammes, accélérations, marques d'élan et courses d'approche.",55,6],["Impulsion & technique","Éducatifs spécifiques, impulsions à volume limité et sauts techniques.",60,7],["Force & mobilité","Renforcement général, stabilité, gainage et mobilité.",50,6]]},
{id:"throws",title:"Lancers · poids / disque / javelot / marteau",discipline:"Athlétisme · lancers",goal:"Coordination, vitesse d'exécution, force générale et maîtrise technique.",sessions:[["Technique de lancer","Mobilité, éducatifs sans engin puis travail avec engin sous encadrement.",55,5],["Force générale","Renforcement global supervisé, gainage et vitesse sans charge maximale.",60,7],["Vitesse & coordination","Lancers techniques à volume modéré et déplacements spécifiques.",50,6]]},
{id:"pole-vault",title:"Saut à la perche",discipline:"Athlétisme · perche",goal:"Vitesse d'élan, présentation, planté, coordination aérienne et sécurité.",sessions:[["Course d'élan & présentation","Gammes, course progressive, marques et éducatifs au sol.",55,5],["Technique encadrée","Travail sur installations adaptées, perches et hauteurs définies par le coach.",60,7],["Préparation physique","Vitesse courte, gainage, force générale et mobilité.",50,6]]},
{id:"combined",title:"Épreuves combinées · décathlon / heptathlon",discipline:"Athlétisme · épreuves combinées",goal:"Socle polyvalent vitesse-force-endurance-technique et organisation multi-épreuves.",sessions:[["Vitesse & sauts","Accélérations, éducatifs et impulsions à faible volume.",60,6],["Lancers & force","Gestuelle des lancers, renforcement supervisé et mobilité.",60,6],["Endurance & haies","Endurance facile ou tempo léger et rappels techniques.",55,5]]}
];
function athleticsTemplateCard(t){return '<article class="athlys-template"><div><small>'+esc(t.discipline)+'</small><h3>'+esc(t.title)+'</h3><p>'+esc(t.goal)+'</p><span>4 semaines · 3 séances / semaine · 12 séances</span></div>'+btn("Créer ce cycle","template-apply","primary",t.id)+'</article>'}
async function applyAthleticsTemplate(id){
 if(!isCoach())throw new Error("La création de programmes est réservée aux entraîneurs.");
 var t=ATHLYS_TRACK_TEMPLATES.find(function(x){return x.id===id});if(!t)throw new Error("Modèle introuvable.");
 var start=new Date();start.setDate(start.getDate()+1);start.setHours(12,0,0,0);var end=new Date(start);end.setDate(end.getDate()+27);
 var p=await q(db.from("training_programs").insert({coach_id:own(),athlete_id:selectedAthleteId||null,title:t.title+" · cycle 4 semaines",discipline:t.discipline,start_date:start.toISOString().slice(0,10),end_date:end.toISOString().slice(0,10),goal:t.goal,notes:"Cycle de référence à personnaliser selon âge, expérience, calendrier, antécédents, matériel et charge habituelle. Semaine 4 allégée. Les séances techniques à risque nécessitent un encadrement qualifié."}).select("*").single());
 var rows=[];for(var w=0;w<4;w++)for(var j=0;j<t.sessions.length;j++){var d=new Date(start);d.setDate(d.getDate()+w*7+j*2);var factor=w===0 ? .9 : w===1 ? 1 : w===2 ? 1.05 : .75;var x=t.sessions[j];rows.push({program_id:p.id,sequence_number:rows.length+1,title:"S"+(w+1)+" · "+x[0],discipline:t.discipline,planned_date:d.toISOString().slice(0,10),duration_minutes:Math.round(x[2]*factor),intensity:w===3?Math.max(3,x[3]-2):x[3],content:{instructions:x[1]+" Progression indicative semaine "+(w+1)+"/4. Ajuster volume, intensité et récupération selon le niveau et les retours de l'athlète."}})}
 await q(db.from("program_sessions").insert(rows));await fetchData();render();toast("Cycle créé avec 12 séances.");
}

function viewTraining(){var body=heading("ENTRAÎNEMENT","Séances & programmes","Planifier, comparer le prévu au réalisé et structurer les cycles.",btn("＋ Séance réelle","log-new","primary")+(isCoach()?btn("＋ Programme","program-new"):""));if(!isCoach())body+=checkinCard();body+=card("Programmes actifs",D.programs.map(function(p){var n=D.sessions.filter(function(x){return x.program_id===p.id}).length;return '<article class="program"><div><small>'+esc(p.discipline)+'</small><h3>'+esc(p.title)+'</h3><p>'+esc(p.goal||p.notes||"")+'</p><small>'+dateFR(p.start_date)+' → '+dateFR(p.end_date)+' · '+n+' séance(s)</small></div>'+btn("Détails","program-detail","secondary",p.id)+(isCoach()?btn("＋ Séance","program-session-new","link",p.id):"")+'</article>'}).join("")||empty("Aucun programme","Les cycles partagés apparaîtront ici.",isCoach()?btn("Créer","program-new","primary"):""));if(isCoach())body+=card("Catalogue Athlys · athlétisme",'<p class="muted">Cycles de référence sur 4 semaines, modifiables après création. Bases de travail, pas prescriptions universelles.</p><div class="athlys-template-grid">'+ATHLYS_TRACK_TEMPLATES.map(athleticsTemplateCard).join("")+'</div>');body+=card("Journal des séances",D.logs.slice(0,30).map(rowLog).join("")||empty("Aucune séance réalisée","Enregistre tes premières données."));return body}
function checkinCard(){
 var c=latestCheck(own());
 return card("Ressenti du jour",'<p class="muted">Le sommeil est facultatif. Le suivi des jours de repos reste possible.</p><form data-form="checkin">'+
 sel("Type de journée","day_type",[["training","Entraînement"],["rest","Repos"],["competition","Compétition"]],"training")+
 feelingScale("Forme","feeling",c&&c.feeling||3)+
 feelingScale("Stress","stress",c&&c.stress||3,"stress")+
 feelingScale("Récupération","recovery",c&&c.recovery||3)+
 feelingScale("Bien-être","mental_wellbeing",c&&c.mental_wellbeing||3)+
 feelingScale("Énergie","energy",c&&c.energy||3)+
 '<div class="form-grid">'+field("Douleur /10","pain_level","number",c&&c.pain_level||0,0,10,1)+field("Zone douloureuse","pain_area","text",c&&c.pain_area||"")+'</div>'+
 field("Sommeil (h) facultatif","sleep_hours","number",c&&c.sleep_hours||"",0,24,.25)+area("Commentaire facultatif","note",c&&c.note||"",2)+
 '<div class="form-end"><button class="btn primary">Enregistrer</button></div></form>')
}

function perfChart(data,key){
 var values=data.map(function(x){return Number(x[key]||0)}),max=Math.max(1,...values),min=0,w=640,h=210,pad=24,coords=values.map(function(v,i){return {x:pad+i*(w-2*pad)/Math.max(1,values.length-1),y:h-pad-(v-min)/(max-min)*(h-2*pad)}}),line=coords.map(function(p){return p.x+","+p.y}).join(" "),area=pad+","+ (h-pad)+" "+line+" "+(w-pad)+","+(h-pad);
 return '<div class="athlys-chart"><svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Évolution de la charge d’entraînement"><line x1="'+pad+'" y1="'+(h-pad)+'" x2="'+(w-pad)+'" y2="'+(h-pad)+'" stroke="var(--line)" stroke-width="1"/><polygon points="'+area+'" fill="var(--cyan)" opacity=".09"/><polyline points="'+line+'" fill="none" stroke="var(--cyan)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'+coords.map(function(p,i){return '<circle cx="'+p.x+'" cy="'+p.y+'" r="5" fill="var(--surface)" stroke="var(--cyan)" stroke-width="3"><title>'+data[i].label+' : '+Math.round(values[i])+' UA</title></circle>'}).join("")+'</svg><div class="athlys-chart-labels">'+data.map(function(x){return '<span>'+esc(x.label)+'</span>'}).join("")+'</div></div>';
}

function perfNoteCard(x){return '<article class="perf-insight '+x.kind+'"><span class="perf-insight-mark">'+(x.kind==="warn"?"!":x.kind==="good"?"✓":"i")+'</span><div><b>'+esc(x.title)+'</b><p>'+esc(x.text)+'</p></div></article>'}
// Athlys · Modèle de charge à risque fondé sur les données athlète (modèle fourni)
function irView(id){
 var data=performanceRiskCache[id];
 if(!data&&!performanceRiskLoading[id])performanceLoadRisk(id);
 if(!data)return card("Analyse probabiliste de charge",'<p class="muted">La simulation de 5 000 trajectoires est exécutée sur les serveurs Athlys. Résultats en cours de calcul…</p>');
 if(data.error)return card("Analyse distante indisponible",'<p>'+esc(data.error)+'</p><p class="muted">Aucune simulation locale ne sera lancée.</p>');
 var h=data.history||{},feel=data.feel||{},forecast=data.forecast||{},r=data.result;
 if(!h.ok)return card("Historique insuffisant pour la simulation",'<p class="muted">Le modèle attend au moins 28 jours d’historique et 5 séances complètes.</p><div class="metrics">'+metric("Jours observés",h.days||0,"Historique serveur")+metric("Séances complètes",h.logs||0,"Durée + RPE")+metric("Séances incomplètes",h.incomplete||0,"Exclues du modèle")+metric("Dernier ressenti",feel.available?feel.last+"/5":"—",feel.available?"Il y a "+feel.age+" j":"Aucun ressenti exploitable")+'</div>');
 if(!r)return card("Simulation indisponible",'<p class="muted">Les données disponibles ne permettent pas encore de produire un résultat robuste.</p>');
 var hist=data.histogram||[],peak=Math.max(1,Number(data.peak)||1),bars=hist.map(function(v,i){var height=Math.max(1,Math.round(Number(v)/peak*64)),x=i*(100/hist.length),y=72-height;return '<rect x="'+x.toFixed(2)+'" y="'+y+'" width="'+Math.max(1,100/hist.length-1).toFixed(2)+'" height="'+height+'" rx="1" class="ir-risk-bar"></rect>'}).join("");
 var status=r.niveau==="vert"?"Repère stable":r.niveau==="orange"?"Écart à examiner":r.niveau==="rouge"?"Écart important":"Indisponible",ratioText=r.rrVaR===null?"—":Math.round(r.rrVaR*100)+"%",state=h.state||{},drivers=(r.drivers||[]).map(function(x){return '<div class="list-row"><span>'+esc(x.label)+'</span><b>'+Math.round(x.part*100)+'%</b></div>'}).join("");
 var body='<div class="ir-risk-header"><div><small>SIMULATION MONTE-CARLO · 5 000 TRAJECTOIRES</small><h3>'+status+'</h3><p class="muted">Comparaison à une trajectoire de charge constante, calculée côté serveur.</p></div><span class="ir-risk-level '+esc(r.niveau||"")+'">'+esc(ratioText)+'</span></div><div class="metrics">'+metric("VaR 95 %",Math.round(r.varR*100)+"%","Scénario planifié")+metric("CVaR 95 %",Math.round(r.cvarR*100)+"%","Moyenne de la queue supérieure")+metric("Référence",Math.round(r.refVaR*100)+"%","Charge constante")+metric("Charge cible J+1",data.maxLoad==null?"—":Math.round(data.maxLoad)+" UA","Repère pour discuter le programme")+'</div><div class="ir-risk-chart"><svg viewBox="0 0 100 80" preserveAspectRatio="none" role="img" aria-label="Distribution simulée de la probabilité de signal"><line x1="0" y1="72" x2="100" y2="72" class="ir-risk-axis"></line>'+bars+'</svg><div class="ir-risk-legend"><span>Faible probabilité</span><span>Probabilité simulée croissante →</span></div></div><div class="perf-two-metrics">'+metric("ATL",Math.round(state.atl||0)+" UA","Charge aiguë actuelle")+metric("CTL",Math.round(state.ctl||0)+" UA","Charge chronique actuelle")+metric("TSB",Math.round((state.ctl||0)-(state.atl||0))+" UA","CTL − ATL")+metric("Ressenti",feel.available?feel.last+"/5":"Non renseigné",feel.available?"Dernier point · "+feel.age+" j":"Distribution neutre utilisée")+'</div><div class="ir-risk-drivers"><h4>Contribution des facteurs</h4>'+(drivers||'<p class="muted">Pas de contribution calculable.</p>')+'</div><p class="muted">'+(forecast.hasPlan?forecast.count+" séance(s) planifiée(s) intégrée(s) aux 7 prochains jours.":"Aucune séance future trouvée : le modèle utilise la charge chronique comme scénario de référence.")+' Le ratio affiché est un signal expérimental d’aide à la gestion de la charge, pas une probabilité médicale de blessure.</p>';
 return card("Analyse probabiliste de charge",body);
}

async function calculateServerRisk(id){
 if(!id||riskAssessmentLoading)return;
 riskAssessmentLoading=true;render();
 try{var result=await q(db.rpc("calculate_athlete_load_assessment",{p_athlete_id:id,p_window_days:42}));riskAssessmentCache[id]=result;toast("Évaluation quantitative enregistrée.");}
 catch(error){toast("Calcul serveur impossible : "+error.message)}
 finally{riskAssessmentLoading=false;render()}
}
function serverRiskCard(id){
 var r=riskAssessmentCache[id],labels={insufficient_data:"Historique insuffisant",stable:"Signal faible",watch:"Vigilance",elevated:"Signal élevé",high:"Vigilance renforcée"};
 var body='<p class="muted">Évaluation indépendante exécutée côté serveur et conservée dans l’historique. Ce signal heuristique n’est ni une probabilité de blessure ni un diagnostic.</p><button class="btn primary" data-action="risk-assess" data-id="'+esc(id)+'" '+(riskAssessmentLoading?"disabled":"")+'>'+(riskAssessmentLoading?"Calcul en cours…":"Calculer le signal serveur")+'</button>';
 if(r){body+='<div class="ir-status '+(r.signalBand==="high"||r.signalBand==="elevated"?"bad":r.signalBand==="watch"?"warn":"good")+'"><b>'+esc(labels[r.signalBand]||r.signalBand)+'</b><p>'+(r.signalScore==null?"Score indisponible":("Indice : "+r.signalScore+"/100"))+' · confiance des données : '+r.confidenceScore+' %</p></div><div class="ir-stats"><div><b>'+Math.round(r.acuteLoad||0)+'</b><span>Charge aiguë 7 j</span></div><div><b>'+Math.round(r.chronicWeeklyLoad||0)+'</b><span>Référence hebdo 28 j</span></div><div><b>'+(r.acuteChronicRatio==null?"—":Number(r.acuteChronicRatio).toFixed(2)+"×")+'</b><span>Ratio aigu / chronique</span></div><div><b>'+r.completeSessions+'/'+r.observedSessions+'</b><span>Séances complètes</span></div></div>'+(Array.isArray(r.factors)&&r.factors.length?'<ul>'+r.factors.map(function(x){return '<li>'+esc(x.message)+'</li>'}).join("")+'</ul>':'<p class="muted">Aucun facteur de vigilance identifié dans les données disponibles.</p>')+'<small class="muted">Méthode '+esc(r.methodologyVersion||"load-signal-1.0")+' · calculé le '+esc(dateFR(r.assessedAt,true))+'</small>'}
 return card("Évaluation quantitative côté serveur",body);
}
async function calculateDigitalTwin(id){
 if(!id||digitalTwinLoading)return;
 digitalTwinLoading=true;render();
 try{
  var result=await q(db.rpc("calculate_athlete_digital_twin",{p_athlete_id:id,p_window_days:42}));
  digitalTwinCache[id]=result;
  toast("État bayésien expérimental calculé.");
 }catch(error){toast("Calcul du jumeau numérique impossible : "+error.message)}
 finally{digitalTwinLoading=false;render()}
}
function digitalTwinCard(id){
 var r=digitalTwinCache[id],signalLabels={insufficient_data:"Données insuffisantes",stable:"État stable",watch:"Vigilance",readiness_declining:"Forme en baisse",load_spike:"Hausse importante de charge"};
 var p=r&&r.readinessPosterior||{},l=r&&r.loadProfile||{};
 var body='<p class="muted">Estimation bayésienne expérimentale de l’état de forme, avec intervalle d’incertitude et contexte de charge. Ce module ne prédit pas les blessures et ne remplace pas le jugement du coach.</p><button class="btn primary" data-action="digital-twin" data-id="'+esc(id)+'" '+(digitalTwinLoading?"disabled":"")+'>'+(digitalTwinLoading?"Calcul en cours…":"Calculer le jumeau numérique")+'</button>';
 if(r){
  var signal=r.adaptationSignal||"insufficient_data";
  body+='<div class="ir-status '+(signal==="readiness_declining"||signal==="load_spike"?"warn":signal==="watch"?"warn":"good")+'"><b>'+esc(signalLabels[signal]||signal)+'</b><p>Confiance des données : '+esc(r.confidenceScore)+' % · observations : '+esc(p.observations||0)+'</p></div>';
  body+='<div class="ir-stats"><div><b>'+esc(p.mean==null?"—":Number(p.mean).toFixed(1)+"/100")+'</b><span>Forme estimée</span></div><div><b>'+esc(p.ci90Low==null?"—":Number(p.ci90Low).toFixed(1)+"–"+Number(p.ci90High).toFixed(1))+'</b><span>Intervalle crédible 90 %</span></div><div><b>'+esc(l.acute7d==null?"—":Math.round(l.acute7d)+" UA")+'</b><span>Charge aiguë · 7 j</span></div><div><b>'+esc(l.chronicWeekly==null?"—":Math.round(l.chronicWeekly)+" UA")+'</b><span>Référence hebdomadaire</span></div></div>';
  body+='<small class="muted">Modèle '+esc(r.modelKey||"AAIN")+" · "+esc(r.modelVersion||"0.1.0")+" · "+esc(r.methodology||"normal-normal")+'</small>';
 }
 return card("Jumeau numérique bayésien · expérimental",body);
}

/* ATHLYS QUANTUM · coach-in-the-loop decision intelligence */
function quantumDateOffset(days){var d=new Date();d.setDate(d.getDate()+days);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function quantumSelectedAthlete(){var rows=D.roster||[];return selectedAthleteId&&rows.some(function(a){return a.id===selectedAthleteId;})?selectedAthleteId:(rows[0]&&rows[0].id)||null}
async function quantumLoadLedger(id){
 if(!id||quantumLedgerLoading[id])return;
 quantumLedgerLoading[id]=true;
 try{
  var data=await q(db.functions.invoke("athlys-quantum-analysis",{body:{action:"overview",athleteId:id,asOf:today()}}));
  quantumOverviewCache[id]=data||{};
  quantumLedgerCache[id]=Array.isArray(data&&data.ledger)?data.ledger:[];
 }catch(e){
  quantumOverviewCache[id]={error:String(e&&e.message||"Données Quantum indisponibles")};
  quantumLedgerCache[id]=[];
  toast("Journal Quantum indisponible : "+String(e&&e.message||e));
 }finally{
  quantumLedgerLoading[id]=false;
  if(view==="quantum")render();
 }
}
async function quantumSimulate(id){
 if(!isCoach()||!id||quantumBusy)return;
 var dateEl=$("#quantum-date"),durationEl=$("#quantum-duration"),rpeEl=$("#quantum-rpe"),profileEl=$("#quantum-profile");
 var planDate=dateEl&&dateEl.value,duration=durationEl&&Number(durationEl.value),rpe=rpeEl&&Number(rpeEl.value),sessionProfile=profileEl&&profileEl.value||"mixed";
 if(!planDate||!Number.isFinite(duration)||duration<10||duration>600||!Number.isFinite(rpe)||rpe<1||rpe>10){toast("Vérifie la date, la durée (10–600 min) et le RPE (1–10).");return;}
 quantumBusy=true;render();
 try{
  var result=await q(db.functions.invoke("athlys-quantum-analysis",{body:{action:"simulate",athleteId:id,planDate:planDate,asOf:today(),durationMinutes:duration,rpe:rpe,profile:sessionProfile}}));
  if(!result||!result.predictionId)throw new Error("Le serveur n’a pas confirmé l’enregistrement de la comparaison.");
  quantumCache[id]=result;quantumMode="compare";
  await quantumLoadLedger(id);
  toast("Comparaison Quantum calculée sur les serveurs Athlys et enregistrée. La décision reste au coach.");
 }catch(e){toast("Simulation Quantum impossible : "+String(e&&e.message||e));}
 finally{quantumBusy=false;render();}
}
async function quantumDecision(id,option){
 if(!isCoach()||!id||quantumDecisionBusy)return;
 var cached=quantumCache[id],predId=cached&&cached.predictionId;
 if(!predId){toast("Lance d’abord une comparaison de scénarios.");return}
 quantumDecisionBusy=true;render();
 try{
  await q(db.functions.invoke("athlys-quantum-analysis",{body:{action:"decision",athleteId:id,predictionId:predId,selectedOption:option,reasonCode:($("#quantum-reason")||{}).value||"coach_context"}}));
  await quantumLoadLedger(id);
  toast("Arbitrage du coach enregistré sur les serveurs Athlys.");
 }catch(e){toast("Impossible d’enregistrer la décision : "+String(e&&e.message||e));}
 finally{quantumDecisionBusy=false;render();}
}
function quantumModeTabs(){
 var items=[["monitor","Suivre"],["compare","Comparer"],["learning","Fiabilité"]];
 return '<div class="quantum-mode-tabs" role="group" aria-label="Espaces Quantum">'+items.map(function(x){
  return '<button type="button" data-quantum-tab="'+x[0]+'" aria-pressed="'+(quantumMode===x[0])+'" class="'+(quantumMode===x[0]?"active":"")+'">'+x[1]+'</button>';
 }).join("")+'</div>';
}
function quantumMonitorCard(summary){
 summary=summary||{};
 var rows=Array.isArray(summary.daily)?summary.daily:[];
 var bars=rows.map(function(x){return '<div class="quantum-day" title="'+esc(dateFR(x.key))+' · '+Math.round(Number(x.load)||0)+' UA · '+Number(x.sessions||0)+' séance(s)"><div class="quantum-day-track"><i style="height:'+Math.max(4,Math.min(100,Number(x.height)||4))+'%"></i></div><b>'+Math.round(Number(x.load)||0)+'</b><small>'+esc(x.label||"")+'</small></div>';}).join("");
 var last=summary.lastCheckin||null;
 var feeling=last&&last.feeling!=null?'<div class="quantum-checkin"><b>Dernier ressenti : '+esc(last.feeling)+'/5</b><small>Renseigné le '+esc(dateFR(last.created_at,true))+'</small></div>':'<div class="quantum-checkin"><b>Pas de ressenti récent</b><small>Le retour de l’athlète aide à remettre les chiffres en contexte.</small></div>';
 var body='<p class="quantum-intro">La charge affichée et les indicateurs sont calculés sur les serveurs Athlys à partir des séances autorisées. La durée × RPE décrit une exposition déclarée, pas la fatigue à elle seule.</p><div class="quantum-monitor-summary"><div><b>'+Math.round(Number(summary.weekLoadAU)||0)+' UA</b><small>Charge saisie sur 7 jours</small></div><div><b>'+Number(summary.weekSessions||0)+'</b><small>Séances renseignées</small></div></div><div class="quantum-week-chart" role="img" aria-label="Charge quotidienne saisie sur les sept derniers jours">'+bars+'</div><div class="quantum-chart-legend"><span>Chaque barre représente le volume saisi ce jour-là.</span><span>0 UA = aucune séance complète renseignée.</span></div>'+feeling;
 return card("Suivi de la semaine",body);
}
function quantumScenarioCards(result){
 if(!result)return '<div class="quantum-empty">Lance une comparaison pour afficher les trois options.</div>';
 var risk=result.portfolioRisk,quality=result.dataQuality||risk&&risk.dataQuality||{level:"insufficient",label:"Historique limité"};
 var maxDose=Math.max.apply(null,(result.scenarios||[]).map(function(x){return Number(x.sessionLoadAU)||0}).concat([1]));
 var cards=(result.scenarios||[]).map(function(x){
  var r=risk&&risk.scenarios.find(function(y){return y.key===x.key;}),range=r&&r.loadRange90;
  var width=Math.max(0,Math.min(100,Math.round((Number(x.sessionLoadAU)||0)/maxDose*100)));
  var detail=quality.level!=="insufficient"&&range?'<div class="quantum-range"><small>Charge totale simulée sur la période</small><b>'+Math.round(r.expectedProjectedLoadAU)+' UA</b><span>Fourchette exploratoire : '+Math.round(range.low)+' à '+Math.round(range.high)+' UA</span></div>':'<div class="quantum-range muted"><small>Fourchette non affichée</small><span>Historique trop court ou trop incomplet pour présenter une plage utile.</span></div>';
  return '<article class="quantum-choice"><div class="quantum-choice-head"><b>'+esc(x.label)+'</b><strong>'+Math.round(Number(x.multiplier)*100)+' %</strong></div><div class="quantum-choice-load"><b>'+Math.round(x.sessionLoadAU)+' UA</b><small>Charge de cette séance</small></div><div class="quantum-dose-track" aria-hidden="true"><i style="width:'+width+'%"></i></div>'+detail+'</article>';
 }).join("");
 var qualityText=quality.level==="good"?"Les données disponibles permettent d’afficher une fourchette exploratoire.":quality.level==="partial"?"La base est partielle : lis la fourchette avec prudence.":"Les données sont trop limitées pour afficher une fourchette de simulation. Les charges de séance restent des calculs simples.";
 return '<div class="quantum-quality '+esc(quality.level||"insufficient")+'"><b>'+esc(quality.label||"Historique limité")+'</b><span>'+esc(quality.completeSessions||0)+' séances classées · '+esc(quality.activeDays||0)+' jours actifs sur '+esc(risk&&risk.history&&risk.history.windowDays||42)+' jours.</span><p>'+qualityText+'</p></div><div class="quantum-scenarios-readable">'+cards+'</div><p class="quantum-coach-note">Les trois options sont des hypothèses de calcul à 100 %, 85 % et 70 % de la charge saisie. Elles ne disent pas laquelle choisir : le contexte de l’athlète et ton observation restent déterminants.</p>';
}
function quantumTechnicalDetails(result){
 var r=result&&result.portfolioRisk;if(!r)return "";
 var rows=r.scenarios.map(function(x){
  return '<tr><td>'+esc(x.label)+'</td><td>'+Number(x.workloadStressIndexMean).toFixed(2)+'</td><td>'+Number(x.var95).toFixed(2)+'</td><td>'+Number(x.cvar95).toFixed(2)+'</td></tr>';
 }).join("");
 return '<details class="quantum-technical"><summary>Afficher les indicateurs statistiques (facultatif)</summary><p>Le moteur a effectué '+esc(r.simulations.toLocaleString("fr-FR"))+' simulations. Ces indicateurs décrivent la dispersion d’un indice synthétique de charge, pas un risque de blessure.</p><div class="quantum-technical-table"><table><thead><tr><th>Option</th><th>Indice moyen</th><th>VaR 95 %</th><th>CVaR 95 %</th></tr></thead><tbody>'+rows+'</tbody></table></div><ul>'+(r.limitations||[]).map(function(x){return '<li>'+esc(x)+'</li>';}).join("")+'</ul><small>Version '+esc(r.modelVersion)+' · calcul reproductible · hypothèses expérimentales.</small></details>';
}
function quantumReliabilityCard(reliability){
 reliability=reliability||{};
 var n=Number(reliability.count)||0;
 if(!n)return card("Ce qu’on apprend des séances réalisées",'<p class="quantum-intro">Quand une comparaison est enregistrée, puis qu’une option est choisie et que la séance est saisie, Athlys rapproche côté serveur la charge envisagée de la charge réellement déclarée.</p><div class="quantum-empty">Aucune comparaison complète pour le moment. Les premières observations apparaîtront ici.</div><p class="quantum-coach-note">Le suivi reste descriptif. Il ne modifie pas automatiquement les paramètres du modèle et ne constitue pas une validation prédictive.</p>');
 var recent=Array.isArray(reliability.recent)?reliability.recent:[];
 var latest=recent.map(function(x){return '<div class="quantum-ledger-row"><div><b>'+esc(dateFR(x.date))+'</b><small>'+esc(x.option==="maintain"?"Maintenir":x.option==="adjust"?"Ajuster":x.option==="reduce"?"Alléger":"Non utilisé")+'</small></div><div><b>'+Number(x.planned||0).toFixed(1)+' UA</b><small>Prévue</small></div><div><b>'+Number(x.observed||0).toFixed(1)+' UA</b><small>Déclarée</small></div><span class="'+(Number(x.error)>0?"over":Number(x.error)<0?"under":"")+'">'+(Number(x.error)>0?"+":"")+Number(x.error||0).toFixed(1)+' UA</span></div>';}).join("");
 var status=n<5?"Premiers relevés : l’échantillon est trop petit pour juger la fiabilité.":n<10?"Un premier écart moyen est calculable, mais le recul reste limité.":"Le suivi descriptif commence à avoir du recul ; une validation externe reste nécessaire.";
 return card("Écart entre charge prévue et réalisée",'<div class="quantum-reliability-metrics"><div><b>'+n+'</b><small>Séances comparables</small></div><div><b>'+Number(reliability.mae||0).toFixed(1)+' UA</b><small>Écart absolu moyen</small></div><div><b>'+(Number(reliability.bias)>0?"+":"")+Number(reliability.bias||0).toFixed(1)+' UA</b><small>Écart moyen (réalisé − prévu)</small></div></div><p class="quantum-intro">'+status+'</p><div class="quantum-ledger-list">'+latest+'</div><p class="quantum-coach-note">Cette mesure porte uniquement sur la charge de séance (durée × RPE), pas sur la performance, la récupération ou les blessures. Elle sert à auditer les estimations ; aucune adaptation automatique du modèle n’est activée.</p>');
}
function quantumLedgerCard(id){
 var rows=quantumLedgerCache[id]||[];
 if(quantumLedgerLoading[id]&&!rows.length)return card("Historique des décisions",'<p class="muted">Chargement des comparaisons…</p>');
 var preds=rows.filter(function(x){return x.event_type==="prediction";}).slice(0,8);
 if(!preds.length)return card("Historique des décisions",'<p class="muted">Les comparaisons enregistrées et les choix du coach apparaîtront ici.</p>');
 var html=preds.map(function(p){
  var d=rows.find(function(x){return x.event_type==="decision"&&x.prediction_id===p.id;}),o=rows.find(function(x){return x.event_type==="outcome"&&x.prediction_id===p.id;});
  var chosen=d&&d.payload&&d.payload.selectedOption,sc=chosen&&p.payload&&p.payload.scenarios&&p.payload.scenarios[chosen];
  var planned=sc&&sc.sessionLoadAU!=null?Number(sc.sessionLoadAU):null,observed=o&&o.payload?Number(o.payload.observedLoadAU):null;
  return '<div class="quantum-ledger-row"><div><b>'+esc(dateFR(p.plan_date))+'</b><small>'+(chosen?esc(chosen==="maintain"?"Maintenir":chosen==="adjust"?"Ajuster":chosen==="reduce"?"Alléger":"Non utilisé"):"Choix non enregistré")+'</small></div><div><b>'+(planned==null?"—":planned.toFixed(1)+" UA")+'</b><small>Prévue</small></div><div><b>'+(observed==null?"—":observed.toFixed(1)+" UA")+'</b><small>Réalisée</small></div><span>'+(observed==null?"En attente":(observed-planned>=0?"+":"")+(observed-planned).toFixed(1)+" UA")+'</span></div>';
 }).join("");
 return card("Historique des décisions",'<div class="quantum-ledger-list">'+html+'</div><div class="quantum-ledger-actions"><button class="btn ghost" data-action="quantum-ledger-refresh" data-id="'+esc(id)+'">Actualiser l’historique</button></div>');
}
function viewQuantum(){
 if(!isCoach())return viewPerformance();
 var roster=D.roster||[],id=quantumSelectedAthlete();
 if(!id)return heading("ATHLYS QUANTUM","Un appui simple pour préparer tes séances","Suis la charge, compare quelques options et garde la main sur la décision.")+card("Aucun athlète rattaché",empty("Ton équipe est vide","Ajoute ou rattache un athlète dans l’onglet Équipe pour commencer."));
 selectedAthleteId=id;
 var athlete=by(roster,id)||{},name=athlete.full_name||"Athlète",overview=quantumOverviewCache[id]||{},summary=overview.summary||{},cached=quantumCache[id],ledger=quantumLedgerCache[id]||[];
 var opts=roster.map(function(a){return '<option value="'+esc(a.id)+'" '+(a.id===id?"selected":"")+'>'+esc(a.full_name||"Athlète")+'</option>';}).join("");
 var sport=((D.athleteDetails||[]).find(function(x){return x.athlete_id===id;})||{}).sport||summary.sport||"Sport non renseigné";
 var selector='<div class="quantum-selector"><div><small>ATHLÈTE</small><b>'+esc(name)+'</b></div><label>Changer d’athlète<select id="quantum-athlete">'+opts+'</select></label><span>'+esc(sport)+'</span></div>';
 var summaryHtml='<div class="quantum-metrics">'+metric("Charge saisie · 7 j",summary.weekLoadAU==null?"—":Math.round(Number(summary.weekLoadAU))+" UA","Calcul serveur · durée × effort déclaré")+metric("Séances renseignées · 28 j",summary.complete28==null?"—":summary.complete28,"Historique disponible")+metric("Comparaisons",summary.predictionCount==null?"—":summary.predictionCount,"Prévisions conservées")+metric("Dernier ressenti",summary.lastCheckin&&summary.lastCheckin.feeling!=null?summary.lastCheckin.feeling+"/5":"—",summary.lastCheckin?dateFR(summary.lastCheckin.created_at):"À renseigner")+'</div>';
 var top=heading("ATHLYS QUANTUM","Préparer une séance avec plus de recul","Une lecture simple de l’historique, trois options à comparer et un suivi des séances réalisées.")+selector+summaryHtml+quantumModeTabs();
 if(!quantumLedgerCache[id]&&!quantumLedgerLoading[id])quantumLoadLedger(id);
 if(overview.error)return top+card("Données Quantum indisponibles",'<p class="quantum-intro">'+esc(overview.error)+'</p><button class="btn ghost" data-action="quantum-ledger-refresh" data-id="'+esc(id)+'">Réessayer</button>');
 if(quantumMode==="monitor")return top+(overview.summary?quantumMonitorCard(summary):card("Chargement sécurisé",'<p class="muted">Les indicateurs sont calculés sur les serveurs Athlys…</p>'))+card("Comment lire ces chiffres",'<p class="quantum-intro">Les unités de charge (UA) correspondent ici à la durée multipliée par l’effort déclaré (RPE). Elles aident à comparer les séances d’un même athlète dans le temps ; ce ne sont pas des unités médicales.</p><p class="quantum-coach-note">Une semaine plus chargée n’est pas automatiquement une mauvaise semaine. Mets toujours ces données en regard du contenu des séances, du ressenti, de la récupération et du calendrier.</p>')+quantumLedgerCard(id);
 if(quantumMode==="compare"){
  var prof=cached&&cached.quantumProfile||"mixed";
  var form='<div class="quantum-form"><div><b>Décrire la séance envisagée</b><small>Entre une durée, un effort estimé et le contenu dominant.</small></div><label>Date<input id="quantum-date" type="date" value="'+esc(cached&&cached.planDate||quantumDateOffset(1))+'" min="'+esc(today())+'" max="'+esc(quantumDateOffset(90))+'"></label><label>Durée prévue · minutes<input id="quantum-duration" type="number" min="10" max="600" step="5" value="'+esc(cached&&cached.plannedSession&&cached.plannedSession.durationMinutes||60)+'"></label><label>Effort estimé · RPE /10<input id="quantum-rpe" type="number" min="1" max="10" step=".5" value="'+esc(cached&&cached.plannedSession&&cached.plannedSession.rpe||6.5)+'"></label><label>Contenu dominant<select id="quantum-profile">'+[["mixed","Séance variée"],["endurance","Endurance"],["intervals","Intervalles / seuil"],["speed","Vitesse / explosivité"],["strength","Renforcement"],["competition","Compétition / match"]].map(function(x){return '<option value="'+x[0]+'" '+(prof===x[0]?"selected":"")+'>'+x[1]+'</option>';}).join("")+'</select></label><button class="btn primary" data-action="quantum-simulate" data-id="'+esc(id)+'" '+(quantumBusy?"disabled":"")+'>'+(quantumBusy?"Calcul en cours sur les serveurs…":"Comparer les 3 options")+'</button></div><p class="quantum-unit-note">Repère de calcul : 60 minutes × RPE 6 = 360 UA. Le résultat est une estimation de volume saisi, pas une mesure directe de fatigue.</p>';
  var result=cached?quantumScenarioCards(cached):'<div class="quantum-empty">Aucune comparaison pour cet athlète. Décris une séance puis sélectionne « Comparer les 3 options ».</div>';
  var decisions=cached?'<div class="quantum-decision"><label>Qu’est-ce qui motive ton choix ?<select id="quantum-reason"><option value="coach_context">Ce que j’observe à l’entraînement</option><option value="athlete_feedback">Le retour de l’athlète</option><option value="data_quality">La qualité des données</option><option value="other">Autre raison</option></select></label><div class="quantum-decision-buttons"><button class="btn" data-action="quantum-decision" data-id="'+esc(id)+'" data-option="maintain">Je maintiens</button><button class="btn" data-action="quantum-decision" data-id="'+esc(id)+'" data-option="adjust">J’adapte</button><button class="btn" data-action="quantum-decision" data-id="'+esc(id)+'" data-option="reduce">J’allège</button><button class="btn ghost" data-action="quantum-decision" data-id="'+esc(id)+'" data-option="not_used">Je ne retiens aucune option</button></div><small class="muted">Ton choix est conservé pour comparer ensuite la charge prévue à celle réellement déclarée. L’agenda n’est pas modifié.</small></div>':'';
  return top+card("Comparer une séance",form+result+decisions)+quantumTechnicalDetails(cached);
 }
 return top+quantumReliabilityCard(overview.reliability)+quantumLedgerCard(id);
}

function viewPerformance(){
 if(!isCoach()&&!H.recordsLoading&&(!H.recordsLoaded||Date.now()-H.recordsAt>300000))healthLoadRecords(30,false).then(function(){if(view==="performance")render()});
 var id=isCoach()?(selectedAthleteId||D.roster[0]&&D.roster[0].id):own(),days=perfRange||30,tab=perfTab||"overview";
 if(id&&tab!=="team"&&tab!=="risk")performanceLoad(id,days);
 if(isCoach()&&tab==="team")performanceLoadTeam();
 if(isCoach()&&tab==="risk")performanceLoadRisk(id);
 var data=performanceCache[id]||{},summary=data.summary||{},logs=D.logs.filter(function(x){return x.athlete_id===id&&x.session_date>=todayOffset(-days+1)}).sort(function(a,b){return new Date(b.session_date)-new Date(a.session_date)}),checks=D.checkins.filter(function(x){return x.athlete_id===id&&new Date(x.created_at).getTime()>=Date.now()-days*86400000}),records=D.records.filter(function(x){return x.athlete_id===id}),results=D.results.filter(function(x){return x.athlete_id===id}),goals=D.goals.filter(function(x){return x.athlete_id===id}),measures=D.measurements.filter(function(x){return x.athlete_id===id}),buckets=data.buckets||[],notes=data.notes||[],ewma=summary.ewma||{},confidence=summary.dataConfidence||{},sessionLoadById=data.sessionLoadById||{},ready=!!(data.summary&&!data.error);
 var title=isCoach()?"Analyse de l’athlète":"Ton analyse";
 var body=heading("ATHLYS PERFORMANCE",title,"Comprendre la charge, la récupération et la progression à partir des données réellement saisies.",btn("＋ Séance","log-new","primary")+btn("＋ Record","record-new"));
 if(isCoach()&&D.roster.length)body+='<label class="inline-field perf-athlete-select">Athlète <select id="performance-athlete">'+D.roster.map(function(a){return '<option value="'+a.id+'" '+(a.id===id?"selected":"")+'>'+esc(a.full_name)+'</option>'}).join("")+'</select></label>';
 body+='<div class="perf-toolbar"><div class="perf-tabs" role="tablist" aria-label="Espaces d’analyse">'+[['overview','Vue d’ensemble'],['load','Charge & récupération'],['risk','Vigilance & charge'],['sessions','Séances'],['progress','Progression'],['intelligence','Intelligence Athlys']].concat(isCoach()?[['team','Comparatif équipe']]:[]).map(function(x){return '<button type="button" role="tab" aria-selected="'+(tab===x[0])+'" class="'+(tab===x[0]?"active":"")+'" data-perf-tab="'+x[0]+'">'+x[1]+'</button>'}).join("")+'</div><div class="perf-ranges" aria-label="Période analysée">'+[[7,"7 j"],[30,"30 j"],[90,"90 j"],[180,"6 mois"]].map(function(x){return '<button type="button" class="'+(days===x[0]?"active":"")+'" data-perf-range="'+x[0]+'">'+x[1]+'</button>'}).join("")+'</div></div>';
 if(tab==="risk"){
  body+=(isCoach()?irView(id):card("Analyse probabiliste",'<p class="muted">Le calcul est exécuté sur les serveurs Athlys. Les résultats restent expérimentaux et ne constituent pas un diagnostic.</p>'))+serverRiskCard(id)+digitalTwinCard(id);
 }else if(tab==="team"&&isCoach()){
  var teamRows=teamAnalyticsCache&&Array.isArray(teamAnalyticsCache.rows)?teamAnalyticsCache.rows:[],teamSummary=teamAnalyticsCache&&teamAnalyticsCache.summary||{};
  if(teamAnalyticsCache&&teamAnalyticsCache.error)body+=card("Synthèse distante indisponible",'<p>'+esc(teamAnalyticsCache.error)+'</p>');
  else if(teamAnalyticsLoading)body+=card("Calcul en cours",'<p class="muted">Les indicateurs de l’effectif sont calculés sur les serveurs Athlys…</p>');
  body+='<div class="metrics perf-metrics">'+metric("Athlètes",teamSummary.athleteCount==null?"—":teamSummary.athleteCount,"Effectif rattaché")+metric("Charge moyenne",teamSummary.sharedAthletes?teamSummary.meanLoad7+" UA":"—","7 derniers jours · calcul serveur")+metric("Check-ins récents",teamSummary.sharedAthletes?teamSummary.freshCheckins+"/"+teamSummary.sharedAthletes:"—","Sur les 3 derniers jours")+metric("Vigilances",teamAnalyticsCache?(teamSummary.warningCount||0):"—","À examiner avec l’athlète")+'</div>';
  body+=card("Comparaison des athlètes",'<div class="athlys-cohort-table"><div class="athlys-cohort-row head"><span>Athlète</span><span>Séances 7j</span><span>Charge</span><span>Ratio</span><span>Forme</span><span>Check-in</span></div>'+teamRows.map(function(x){var a=by(D.roster,x.id)||{},age=x.checkinAgeDays;return '<button class="athlys-cohort-row wide" data-action="select-analysis-athlete" data-id="'+x.id+'"><b>'+esc(a.full_name||"Athlète")+'</b><span>'+(x.shared?x.weekSessions:"—")+'</span><span>'+(x.shared?Math.round(x.load7||0)+" UA":"Privé")+'</span><span>'+(x.shared&&x.ratioPercent!==null?Math.round(x.ratioPercent)+"%":"—")+'</span><span>'+(x.shared&&x.readiness!==null?x.readiness+"/100":"—")+'</span><span>'+(x.shared?(age===null?"Jamais":age===0?"Aujourd’hui":age+" j"):"Privé")+'</span></button>'}).join("")+'</div><p class="muted">Comparer des profils ne revient pas à classer les athlètes : discipline, âge, expérience, calendrier et qualité de saisie changent le sens des chiffres.</p>');
  body+=card("Priorités de pilotage",'<ul class="perf-learning-list"><li>Relancer les check-ins absents ou anciens.</li><li>Examiner les variations de charge avec l’athlète avant toute adaptation.</li><li>Comparer le programme prévu aux séances réellement enregistrées.</li><li>Respecter le choix de partage des données de chaque athlète.</li></ul>');
 }else if(tab==="overview"){
  if(!ready)body+=card(data.error?"Analyse distante indisponible":"Calcul en cours",'<p class="muted">'+esc(data.error||"Les indicateurs sont calculés sur les serveurs Athlys…")+'</p>');
  body+='<div class="metrics perf-metrics">'+metric("Charge · période",ready?Math.round(summary.totalLoad||0)+" UA":"—",days+" derniers jours · durée × RPE")+metric("Séances",ready?summary.observedSessions:"—","Enregistrées")+metric("Temps d’effort",ready?Math.round((summary.totalMinutes||0)/60*10)/10+" h":"—","Durée cumulée")+metric("RPE moyen",ready&&summary.avgRpe?Number(summary.avgRpe).toFixed(1)+"/10":"—","Sur les séances renseignées")+metric("ATL · 7 j",ready?Math.round(ewma.atl||0)+" UA":"—","Charge aiguë lissée · serveur")+metric("CTL · 42 j",ready?Math.round(ewma.ctl||0)+" UA":"—","Charge chronique lissée · serveur")+metric("TSB",ready?Math.round(ewma.tsb||0)+" UA":"—","CTL − ATL · serveur")+'</div>';
  body+=healthPerformanceCard(H.healthSummary);
  body+='<div class="perf-grid"><div>'+card("Évolution de la charge",perfChart(buckets,"load")+'<p class="muted">Charge sRPE = durée en minutes × effort perçu (RPE). Les indicateurs et agrégations sont calculés sur les serveurs Athlys.</p>')+card("Charge & disponibilité",'<div class="perf-two-metrics">'+metric("Charge 7 jours",ready?Math.round(summary.acuteLoad||0)+" UA":"—","Charge aiguë descriptive")+metric("Référence 3 semaines",ready?Math.round(summary.chronicWeeklyLoad||0)+" UA":"—","Moyenne hebdomadaire précédente")+metric("Disponibilité",ready&&summary.readiness!==null?summary.readiness+"/100":"—","Issue du check-in déclaré")+metric("Fatigue déclarée",ready&&summary.fatigue!==null?summary.fatigue+"/100":"—","Indicateur interne, non médical")+'</div>')+'</div><div>'+card("Lecture rapide",notes.slice(0,3).map(perfNoteCard).join("")||'<p class="muted">Les observations apparaîtront avec l’historique.</p>')+card("Dernières séances",logs.slice(0,5).map(rowLog).join("")||empty("Aucune séance sur cette période","Enregistre une séance pour commencer."))+card("Objectifs actifs",rowsGoals(goals.filter(function(x){return x.status==="in_progress"})))+'</div></div>';
 }else if(tab==="load"){
  if(!ready)body+=card(data.error?"Analyse distante indisponible":"Calcul en cours",'<p class="muted">'+esc(data.error||"Les indicateurs de charge sont calculés sur les serveurs Athlys…")+'</p>');
  body+='<div class="metrics perf-metrics">'+metric("Charge aiguë",ready?Math.round(summary.acuteLoad||0)+" UA":"—","7 derniers jours · serveur")+metric("Base récente",ready?Math.round(summary.chronicWeeklyLoad||0)+" UA":"—","Moyenne hebdomadaire des 3 semaines précédentes")+metric("Variation",ready&&summary.acuteChronicRatioPercent!==null?Math.round(summary.acuteChronicRatioPercent)+"%":"—","Rapport descriptif, pas un seuil médical")+metric("Check-ins",ready?summary.checkinsCount:"—","Sur la période")+metric("ATL · 7 j",ready?Math.round(ewma.atl||0)+" UA":"—","Moyenne exponentielle · serveur")+metric("CTL · 42 j",ready?Math.round(ewma.ctl||0)+" UA":"—","Moyenne exponentielle · serveur")+metric("TSB",ready?Math.round(ewma.tsb||0)+" UA":"—","Écart chronique − aigu · serveur")+'</div>';
  body+=healthPerformanceCard(H.healthRecords);
  body+='<div class="perf-grid"><div>'+card("Évolution hebdomadaire",perfChart(buckets,"load"))+card("Ressenti & récupération",checks.slice(0,10).map(function(c){var serverCheck=(data.checkins||[]).find(function(x){return x.created_at===c.created_at}),score=serverCheck?serverCheck.readiness:null;return '<div class="list-row"><div><b>'+dateFR(c.created_at)+'</b><small>Forme '+(c.feeling||"—")+'/5 · énergie '+(c.energy||"—")+'/5 · récupération '+(c.recovery||"—")+'/5</small></div><strong>'+(score===null?"—":score+"/100")+'</strong></div>'}).join("")||empty("Pas de check-in","Renseigne ton ressenti régulièrement."))+'</div><div>'+card("Interprétation",notes.map(perfNoteCard).join(""))+card("Comment lire ces indicateurs",'<p class="muted">La charge sRPE mesure une exposition d’entraînement déclarée, pas une fatigue physiologique. Le rapport aigu/référence sert uniquement à repérer une variation de volume. Il ne prédit ni blessure ni disponibilité et ne remplace pas l’avis de l’entraîneur.</p>')+'</div></div>';
 }else if(tab==="sessions"){
  body+=card("Journal analytique · "+(ready?summary.observedSessions:logs.length)+" séances",logs.length?'<div class="perf-session-list">'+logs.map(function(x){var l=Number(sessionLoadById[x.id]||0);return '<article class="perf-session"><div class="perf-session-date"><b>'+new Date(x.session_date+"T12:00:00").getDate()+'</b><small>'+new Date(x.session_date+"T12:00:00").toLocaleDateString("fr-FR",{month:"short"})+'</small></div><div class="perf-session-main"><b>'+esc(x.title||"Séance")+'</b><small>'+esc(x.discipline||"Discipline non précisée")+' · '+(x.duration_minutes||"—")+' min · '+(x.rpe?"RPE "+x.rpe:"RPE non renseigné")+'</small>'+(x.notes?'<p>'+esc(x.notes)+'</p>':"")+'</div><div class="perf-session-load"><b>'+Math.round(l)+'</b><small>UA · serveur</small></div></article>'}).join("")+'</div>':empty("Aucune séance sur cette période","Enregistre tes séances avec durée et RPE pour obtenir une analyse complète.",btn("Ajouter une séance","log-new","primary")))+card("Qualité des données",'<div class="perf-quality"><div><b>'+(ready?summary.completeSessions+"/"+summary.observedSessions:"—")+'</b><small>Séances complètes</small></div><div><b>'+(ready?confidence.complete+"/"+confidence.total:"—")+'</b><small>Durée + RPE</small></div><div><b>'+(ready?confidence.checks:"—")+'</b><small>Check-ins</small></div></div><p class="muted">Les séances incomplètes restent visibles, mais ne contribuent qu’aux calculs pour lesquels une donnée existe. Les indicateurs sont calculés côté serveur.</p>');
 }else if(tab==="progress"){
  body+='<div class="metrics perf-metrics">'+metric("Records",records.length,"Références personnelles")+metric("Résultats",results.length,"Compétitions enregistrées")+metric("Objectifs actifs",goals.filter(function(x){return x.status==="in_progress"}).length,"En cours")+metric("Mesures",measures.length,"Données facultatives")+'</div><div class="perf-grid"><div>'+card("Records personnels",records.slice().sort(function(a,b){return new Date(b.achieved_on)-new Date(a.achieved_on)}).map(function(r){return '<div class="list-row"><div><b>'+esc(r.metric)+'</b><small>'+esc(r.discipline||"")+' · '+dateFR(r.achieved_on)+'</small></div><strong>'+esc(r.result_value+" "+r.unit)+'</strong></div>'}).join("")||empty("Aucun record","Ajoute tes références sportives.",btn("＋ Record","record-new","primary")))+card("Résultats en compétition",results.slice().sort(function(a,b){return new Date(b.result_date)-new Date(a.result_date)}).map(function(r){return '<div class="list-row"><div><b>'+esc(r.competition_name)+'</b><small>'+esc(r.discipline||"")+' · '+dateFR(r.result_date)+'</small></div><strong>'+esc(r.result_value+" "+r.unit)+'</strong></div>'}).join("")||empty("Pas de résultat","Ajoute tes performances."))+'</div><div>'+card("Objectifs",rowsGoals(goals))+card("Mesures facultatives",measures.slice(0,12).map(function(x){return '<div class="list-row"><div><b>'+esc(x.metric_key)+'</b><small>'+dateFR(x.measured_at)+' · '+(x.share_with_coach?"Partagée":"Privée")+'</small></div><strong>'+esc(x.value+" "+x.unit)+'</strong></div>'}).join("")||empty("Aucune mesure","Poids, HRV, VMA et FTP restent facultatifs."),btn("＋ Mesure","measure-new","secondary"))+'</div></div>';
 }else{
  var level=ready&&summary.observedSessions>=12&&summary.checkinsCount>=8?"Intermédiaire":ready&&summary.observedSessions>=5?"Initial":"À construire";
  body+='<div class="perf-intro"><div><small>MOTEUR D’APPRENTISSAGE PROGRESSIF</small><h2>Une analyse qui se construit avec ton historique.</h2><p>La première version d’Athlys combine tes séances, tes ressentis et tes résultats. Elle privilégie les signaux observables et affiche ses limites plutôt que d’inventer une prédiction.</p></div><span class="perf-aprm-mark">A</span></div><div class="metrics perf-metrics">'+metric("Séances observées",ready?summary.observedSessions:"—","Calcul serveur")+metric("Check-ins",ready?summary.checkinsCount:"—","Calcul serveur")+metric("Résultats",results.length,"Éléments de performance")+metric("Qualité des données",ready?confidence.score+"%":"—",ready?confidence.label:"En attente du serveur")+metric("Séances complètes",ready?confidence.complete+"/"+confidence.total:"—","Durée + RPE")+metric("Niveau d’analyse",ready?level:"—","Historique progressif")+'</div><div class="perf-grid"><div>'+card("Signaux individualisés",notes.map(perfNoteCard).join("")||'<p class="muted">Les observations apparaîtront avec l’historique.</p>')+card("Ce qu’Athlys apprend",'<ul class="perf-learning-list"><li>Ta charge habituelle et ses variations.</li><li>La relation temporelle entre entraînement et ressentis déclarés.</li><li>La régularité des séances et les périodes de progression.</li><li>Les indicateurs les plus renseignés dans ton profil.</li></ul>')+'</div><div>'+card("Fiabilité de l’analyse",'<div class="perf-confidence"><b>'+(ready?level:"Calcul distant en attente")+'</b><p>La fiabilité dépend du nombre, de la régularité et de la qualité des observations. Aucune recommandation prédictive n’est présentée comme certaine.</p></div>')+card("Garde-fous",'<ul class="perf-learning-list"><li>Une corrélation ne prouve pas une causalité.</li><li>Un indicateur de charge n’est pas un diagnostic médical.</li><li>Les données manquantes ne sont jamais remplacées par des valeurs inventées.</li><li>Les recommandations sensibles restent à valider avec l’entraîneur.</li></ul>')+'</div></div>';
 }
 return body;
}

function renderGoals(){return heading("OBJECTIFS","Mes objectifs","Performance, régularité, technique et compétition.",btn("＋ Objectif","goal-new","primary"))+card("En cours",rowsGoals(D.goals.filter(function(x){return x.status==="in_progress"})))+card("Terminés ou en pause",rowsGoals(D.goals.filter(function(x){return x.status!=="in_progress"})))}
function renderLibrary(){return heading("BIBLIOTHÈQUE","Exercices","Référentiel commun et contenus personnalisés.",isCoach()?btn("＋ Exercice","exercise-new","primary"):"")+'<div class="filter"><input id="exercise-search" placeholder="Rechercher un exercice…"><select id="exercise-category"><option value="">Toutes catégories</option><option>force</option><option>vitesse</option><option>mobilité</option><option>pliométrie</option><option>technique</option></select></div><div class="exercise-grid">'+D.exercises.map(function(x){return '<article class="exercise" data-exercise="'+esc((x.title+" "+x.discipline+" "+x.category).toLowerCase())+'" data-category="'+esc(x.category)+'"><small>'+esc(x.category)+" · "+esc(x.discipline)+'</small><h3>'+esc(x.title)+'</h3><p>'+esc(x.instructions)+'</p><span>Difficulté '+x.difficulty+'/5 · '+(x.duration_minutes||"—")+' min</span></article>'}).join("")+'</div>'}
function bubble(x){return '<article class="message-bubble '+(x.sender_id===own()?"mine":"")+'"><p>'+esc(x.content)+'</p><small>'+dateFR(x.created_at,true)+'</small></article>'}
function viewMessages(){
 var body=heading("MESSAGERIE","Messages","Conversations privées et groupes de ton équipe.");
 if(!coachId())return body+empty("Aucun coach relié","Rejoins ton entraîneur avec son code.");
 var teams=(D.teams||[]).filter(function(t){return isCoach()||(D.members||[]).some(function(m){return m.team_id===t.id&&m.athlete_id===own()})});
 if(!activeChatTeamId||!teams.some(function(t){return t.id===activeChatTeamId}))activeChatTeamId=teams[0]&&teams[0].id||null;if(!activeChatTeamId){D.teamMessages=[];loadedTeamMessagesFor=null}if(activeChatMode==="group"&&activeChatTeamId&&loadedTeamMessagesFor!==activeChatTeamId)loadTeamMessages(activeChatTeamId).then(function(){if(view==="messages")render()});
 var contacts=isCoach()?D.roster.map(function(a){return '<button type="button" class="chat-contact '+(activeChatMode==="direct"&&a.id===selectedMessageAthlete?"active":"")+'" data-action="chat-open-direct" data-id="'+a.id+'">'+avatar(a.full_name)+'<span><b>'+esc(a.full_name||"Athlète")+'</b><small>Discussion privée</small></span></button>'}).join(""):'<button type="button" class="chat-contact '+(activeChatMode==="direct"?"active":"")+'" data-action="chat-open-direct" data-id="'+own()+'">'+avatar("Coach")+'<span><b>Mon coach</b><small>Discussion privée</small></span></button>';
 var groups=teams.map(function(t){var count=(D.members||[]).filter(function(m){return m.team_id===t.id}).length;return '<button type="button" class="chat-contact '+(activeChatMode==="group"&&t.id===activeChatTeamId?"active":"")+'" data-action="chat-open-team" data-id="'+t.id+'"><span class="chat-group-avatar">◎</span><span><b>'+esc(t.name)+'</b><small>'+count+' membres · Groupe équipe</small></span></button>'}).join("");
 var selected=teams.find(function(t){return t.id===activeChatTeamId})||{};
 var title=activeChatMode==="group"?(selected.name||"Groupe équipe"):(isCoach()?nameOf(selectedMessageAthlete):"Mon coach");
 var rows=activeChatMode==="group"?D.teamMessages:D.messages;
 var messages=activeChatMode==="group"?rows.map(teamBubble).join(""):rows.map(bubble).join("");
 var composer=activeChatMode==="group"?(activeChatTeamId?'<form data-form="team-message" class="composer chat-composer"><input name="content" maxlength="2000" required placeholder="Écrire au groupe…"><button class="btn primary" aria-label="Envoyer">➤</button></form>':'<div class="chat-empty">Tu ne fais partie d’aucun groupe d’équipe.</div>'):'<form data-form="message" class="composer chat-composer"><input name="content" maxlength="2000" required placeholder="Écrire un message…"><button class="btn primary" aria-label="Envoyer">➤</button></form>';
 setTimeout(function(){var box=$("#message-list");if(box)box.scrollTop=box.scrollHeight},0);
 return '<div class="chat-page '+(isMobileEntry()?(chatMobileListOpen?"mobile-list-open":"mobile-conversation-open"):"desktop-chat")+'">'+body+'<section class="chat-shell"><aside class="chat-contacts"><div class="chat-contacts-head"><b>Conversations</b><span>'+((isCoach()?D.roster.length:1)+teams.length)+'</span></div><div class="chat-contact-section">MESSAGES PRIVÉS</div>'+contacts+'<div class="chat-contact-section">GROUPES D’ÉQUIPE</div>'+groups+'</aside><section class="chat-conversation"><header class="chat-conversation-head"><button type="button" class="chat-back" data-action="chat-back" aria-label="Retour aux conversations">‹</button><span class="chat-group-avatar">'+(activeChatMode==="group"?"◎":"◉")+'</span><div><b>'+esc(title)+'</b><small>'+(activeChatMode==="group"?"Conversation collective de l’équipe":"Conversation privée et sécurisée")+'</small></div></header><div class="thread chat-thread" id="message-list">'+(messages||'<div class="chat-empty">Aucun message pour le moment.<br>Commence la conversation.</div>')+'</div>'+composer+'</section></section></div>';
}
function viewMore(){
 var items=[["team","Équipe","◉"],["training","Séances & exercices","▤"],["questionnaires","Questionnaires","☑"],["videos","Vidéos techniques","▶"],["equipment","Matériel","⚙"],["integrations","Connectivité","⌁"],["notifications","Notifications","♧"],["goals","Objectifs","◎"],["library","Bibliothèque","▤"],["competitions","Compétitions","🏁"],["reports","Rapports","▧"],["profile","Profil & réglages","◉"],["assistant","Assistant Athlys","✦"]];
 if(!isCoach()&&localStorage.getItem("athlys-cycle-sex-"+own())==="female")items.splice(5,0,["menstrual","Suivi menstruel","◒"]);
 var body=heading("ESPACE","Tous les modules","Les outils utiles, organisés dans un seul endroit.")+'<div class="tool-grid">'+items.map(function(x){return '<button '+(x[0]==="assistant"?'data-action="assistant-toggle"':'data-nav="'+x[0]+'"')+'><b>'+x[2]+'</b><span>'+x[1]+'</span></button>'}).join("")+'</div>';
 if(!isCoach())body+=card("Suivi menstruel · optionnel",'<p class="muted">Affiché uniquement si tu sélectionnes « Femme ». Le suivi est facultatif et reste enregistré sur cet appareil, pas dans ton dossier partagé.</p><form data-form="cycle-settings">'+sel("Sexe pour l’affichage de ce suivi","cycle_sex",[["unspecified","Ne pas renseigner"],["female","Femme"],["male","Homme"]],localStorage.getItem("athlys-cycle-sex-"+own())||"unspecified")+'<button class="btn primary">Enregistrer mon choix</button></form>');
 return body;
}
function viewQuestionnaires(){if(isCoach())return heading("QUESTIONNAIRES","Bilans du groupe","Crée des questions courtes et lis les retours.",btn("＋ Questionnaire","questionnaire-new","primary"))+card("Questionnaires",D.questionnaires.map(function(x){return '<div class="list-row"><div><b>'+esc(x.title)+'</b><small>'+(x.athlete_id?esc(nameOf(x.athlete_id)):"Groupe")+'</small></div><strong>'+D.responses.filter(function(r){return r.questionnaire_id===x.id}).length+' réponses</strong></div>'}).join("")||empty("Aucun questionnaire","Crée un bilan."));var pending=D.questionnaires.filter(function(x){return !D.responses.some(function(r){return r.questionnaire_id===x.id&&r.athlete_id===own()})});return heading("QUESTIONNAIRES","Mes bilans","Réponds aux questions de ton coach.")+card("À compléter",pending.map(function(x){return '<div class="list-row"><div><b>'+esc(x.title)+'</b><small>'+esc(x.description)+'</small></div>'+btn("Répondre","questionnaire-answer","primary",x.id)+'</div>'}).join("")||empty("Aucun questionnaire en attente","Tu es à jour."))}
function viewEquipment(){return heading("MATÉRIEL","Équipement sportif","Suivi de l’usage et seuils de remplacement.",btn("＋ Équipement","equipment-new","primary"))+card("Mon matériel",D.equipment.map(function(x){return '<div class="list-row"><div><b>'+esc(x.label)+'</b><small>'+esc(x.category)+" · "+esc(x.brand||x.model)+'</small></div><strong>'+esc(x.usage_value+" "+x.usage_unit)+'</strong></div>'}).join("")||empty("Aucun équipement","Ajoute tes chaussures, perches ou accessoires."))}
function viewCompetitions(){return heading("COMPÉTITIONS","Résultats & calendrier","Performances et classements.",btn("＋ Résultat","result-new","primary"))+card("Résultats",D.results.map(function(x){return '<div class="list-row"><div><b>'+esc(x.competition_name)+'</b><small>'+esc(x.discipline)+' · '+dateFR(x.result_date)+'</small></div><strong>'+esc(x.result_value+" "+x.unit)+'</strong></div>'}).join("")||empty("Aucun résultat","Ajoute une performance."))+card("Compétitions planifiées",D.events.filter(function(x){return String(x.session_type).toLowerCase().indexOf("comp")>=0}).map(rowEvent).join("")||empty("Aucune compétition","Ajoute-la dans l’agenda."))}
function viewReports(){var total=D.logs.reduce(function(s,x){return s+Number(x.duration_minutes||0)},0),load=D.logs.reduce(function(s,x){return s+Number(x.duration_minutes||0)*Number(x.rpe||0)},0);return heading("RAPPORTS","Synthèses & exports","Des données exportables et imprimables.",btn("Exporter CSV","export-csv","primary")+btn("Imprimer","print-report"))+card("Synthèse",'<div class="metrics">'+metric("Séances",D.logs.length,"Historique visible")+metric("Durée",total+" min","Temps saisi")+metric("Charge",Math.round(load)+" UA","sRPE")+metric("Objectifs actifs",D.goals.filter(function(x){return x.status==="in_progress"}).length,"À suivre")+'</div>')}
function viewVideos(){return heading("TECHNIQUE","Vidéos & observations","Partage privé de séquences pour retour du coach.",btn("＋ Vidéo","video-new","primary"))+card("Vidéos",D.videos.map(function(v){return '<div class="list-row"><div><b>'+esc(v.title)+'</b><small>'+dateFR(v.created_at)+' · '+esc(v.technical_notes)+'</small></div>'+btn("Voir","video-open","secondary",v.id)+'</div>'}).join("")||empty("Aucune vidéo","Les séquences partagées apparaîtront ici."))}
function viewMenstrual(){
 if(isCoach()||localStorage.getItem("athlys-cycle-sex-"+own())!=="female")return viewMore();
 var key="athlys-cycle-log-"+own(),rows=[];try{rows=JSON.parse(localStorage.getItem(key)||"[]")}catch(e){}
 rows=Array.isArray(rows)?rows:[];
 var sorted=rows.slice().sort(function(a,b){return b.start.localeCompare(a.start)});
 var diffs=[];for(var i=0;i<Math.min(6,sorted.length-1);i++)diffs.push(Math.round((new Date(sorted[i].start)-new Date(sorted[i+1].start))/86400000));
 var avg=diffs.length?Math.round(diffs.reduce(function(a,b){return a+b},0)/diffs.length):null;
 return heading("SANTÉ","Suivi menstruel","Un journal privé et facultatif de ton cycle.")+
 card("Ajouter des règles",'<form data-form="cycle-log">'+field("Premier jour des règles","start","date",today())+sel("Symptômes éventuels","symptoms",[["none","Aucun"],["mild","Légers"],["moderate","Modérés"],["strong","Importants"]],"none")+area("Notes personnelles","notes","",2)+'<button class="btn primary">Enregistrer</button></form>')+
 card("Historique",sorted.slice(0,8).map(function(x){return '<div class="list-row"><div><b>'+dateFR(x.start)+'</b><small>'+esc(x.symptoms||"")+(x.notes?" · "+esc(x.notes):"")+'</small></div></div>'}).join("")||empty("Aucune donnée","Ajoute une première date si tu souhaites suivre ton cycle."))+
 card("Repère indicatif",'<div class="metrics">'+metric("Cycles enregistrés",sorted.length,"Données stockées sur cet appareil")+metric("Intervalle moyen",avg?avg+" jours":"—","Estimation descriptive, non médicale")+'</div><p class="muted">Ce journal ne prédit pas l’ovulation, ne remplace pas un avis médical et ne constitue pas un moyen de contraception. Les données sont locales à cet appareil.</p>'+btn("Effacer mon historique","cycle-delete","danger"));
}
async function switchAccountRole(target){
 if(busy||!profile||!["coach","athlete"].includes(target)||target===profile.role)return;
 busy=true;
 try{
  var result=await db.rpc("switch_my_role",{target_role:target});
  if(result.error)throw result.error;
  cleanup();
  await loadProfile();
  selectedAthleteId=null;selectedMessageAthlete=null;
  A.history=[];A.historyLoaded=false;A.pending=null;A.insights=[];A.insightLoaded=false;A.open=false;
  view="home";
  await fetchData();
  subscribeMessages();
  toast("Mode "+(target==="coach"?"coach":"athlète")+" activé. Ton compte et tes données sont conservés.");
 }catch(error){
  toast("Changement de mode impossible : "+(error&&error.message||"erreur inconnue"));
 }finally{
  busy=false;
  render();
 }
}
function viewProfile(){var d=D.details||{},cd=D.coachDetails||{};var roleSwitch=card("Mode actif",'<p class="muted">Choisis l’espace que tu souhaites utiliser. Tu conserves la même adresse, le même compte et tes données dans les deux rôles.</p><div class="role-mode-switch" role="group" aria-label="Mode de compte">'+
 '<button type="button" class="role-mode-option '+(isCoach()?"active":"")+'" '+(isCoach()?'aria-pressed="true" disabled':'data-action="switch-role" data-role="coach" aria-pressed="false"')+'>Coach</button>'+
 '<button type="button" class="role-mode-option '+(!isCoach()?"active":"")+'" '+(!isCoach()?'aria-pressed="true" disabled':'data-action="switch-role" data-role="athlete" aria-pressed="false"')+'>Athlète</button></div><small class="muted">Le changement actualise les menus et les droits d’accès sans créer un deuxième compte.</small>');return heading("MON COMPTE","Profil & confidentialité","Contrôle les données et les autorisations de partage.")+roleSwitch+card("Profil",'<form data-form="profile"><div class="form-grid">'+field("Prénom","first_name","text",profile.first_name)+field("Nom","last_name","text",profile.last_name)+'</div><label>E-mail<input disabled value="'+esc(profile.email||"")+'"></label>'+(isCoach()?area("Disciplines entraînées","disciplines",(cd.disciplines||[]).join("\n"),3):field("Sport","sport","text",d.sport||"")+field("Spécialité","specialty","text",d.specialty||"")+field("Disciplines","disciplines","text",(d.disciplines||[]).join(", "))+field("Taille cm","height_cm","number",d.height_cm||"")+field("Longueur de foulée cm","stride_length_cm","number",d.stride_length_cm||"")+area("Records","records",d.records,2)+area("Notes techniques","technique_notes",d.technique_notes,2)+'<div class="check-list"><label><input type="checkbox" name="share_with_coach" '+(d.share_with_coach!==false?"checked":"")+'> Partager au coach</label><label><input type="checkbox" name="share_with_club" '+(d.share_with_club?"checked":"")+'> Partager au club</label><label><input type="checkbox" name="share_with_league" '+(d.share_with_league?"checked":"")+'> Partager à la ligue</label><label><input type="checkbox" name="share_with_federation" '+(d.share_with_federation?"checked":"")+'> Partager à la fédération</label></div>')+'<button class="btn primary">Sauvegarder</button></form>')+(isCoach()?"":card("Mon entraîneur",D.coachDetails&&D.coachDetails.coach_id?"Un entraîneur est déjà relié à ton compte.":'<form data-form="join-coach"><label>Code de ton entraîneur<input name="code" maxlength="32" required placeholder="Saisis le code reçu"></label><button class="btn primary">Rejoindre mon entraîneur</button></form>'))+card("Personnalisation",'<form data-form="prefs" class="preferences-form">'+sel("Thème","theme",[["light","Clair"],["dark","Sombre"]],P.theme)+'<div class="preference-intro"><b>Complexité de l’interface</b><p class="muted">Choisis le niveau de détail affiché. Les outils et les données restent disponibles à tous les niveaux.</p></div>'+sel("Sophistication de l’application","sophistication",[[1,"Essentiel · épuré"],[2,"Intermédiaire · équilibré"],[3,"Avancé · analytique"]],P.sophistication||2)+'<div class="preference-intro"><b>Lisibilité</b><p class="muted">Ajuste la taille du texte dans l’ensemble de l’espace.</p></div>'+sel("Taille de police","fontSize",[[1,"Petite"],[2,"Standard"],[3,"Grande"]],P.fontSize||2)+sel("Transport de la messagerie","chatTransportMode",[["auto","Automatique"],["websocket","WebSocket relayé (recommandé)"],["webrtc","WebRTC direct"]],chatTransportMode)+'<p class="muted">WebSocket conserve les échanges via le serveur. WebRTC peut établir une liaison directe et révéler des informations réseau à l’interlocuteur.</p><label class="check-inline"><input type="checkbox" name="reminders" '+(P.reminders?"checked":"")+' > Rappels espacés</label><button class="btn primary">Enregistrer les préférences</button></form>')+card("Objets connectés",'<p class="muted">Relie les données remontées dans Apple Santé ou Android Health Connect à ton suivi sportif Athlys.</p>'+'<button class="btn secondary" data-nav="integrations">Gérer mes appareils</button>')+card("Confidentialité",'<p class="muted">Les mesures importées sont privées par défaut. Elles ne sont partagées avec ton coach que si tu actives cette option dans les connecteurs.</p>'+btn("Déconnexion","logout","secondary")+btn("Supprimer mon compte","delete-account","danger"))}
function viewNotifications(){return heading("ACTIVITÉ","Notifications","Rappels et informations de ton espace.")+card("Récentes",D.notifications.map(function(n){return '<div class="list-row"><div><b>'+esc(n.title)+'</b><small>'+esc(n.body)+' · '+dateFR(n.created_at,true)+'</small></div>'+(n.read_at?"":btn("Lu","notification-read","link",n.id))+'</div>'}).join("")||empty("Aucune notification","Tu es à jour."),btn("Tout marquer lu","notifications-all","link"))}
function page(){switch(view){case"home":return viewHome();case"team":return viewTeam();case"schedule":return viewSchedule();case"training":return viewTraining();case"performance":return viewPerformance();case"quantum":return viewQuantum();case"goals":return renderGoals();case"library":return renderLibrary();case"messages":return viewMessages();case"more":return viewMore();case"questionnaires":return viewQuestionnaires();case"equipment":return viewEquipment();case"competitions":return viewCompetitions();case"reports":return viewReports();case"videos":return viewVideos();case"profile":return viewProfile();case"notifications":return viewNotifications();case"integrations":return viewIntegrations();case"menstrual":return viewMenstrual();default:return viewHome()}}
var HEALTH_TYPES=["steps","distance","calories","heartRate","weight"];
var HEALTH_MARKER="ATHLYS_HEALTH_IMPORT|";
var HEALTH_API_VERSION="2026-11-03";
var HEALTH_TYPES_BY_CATEGORY={activity:["steps","distance","calories"],recovery:["heartRate"],body:["weight"],cycle:[]};
var HEALTH_RECORD_TYPES={steps:"steps",distance:"distance",calories:"active_calories",heartRate:"heart_rate",weight:"weight"};
function healthApi(){return window.athlysHealth||(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Health)||null}
async function healthOpenSettings(){
 var launcher=window.AthlysIntentLauncher||(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.IntentLauncher);
 if(!launcher||typeof launcher.startActivityAsync!=="function")throw new Error("Le module Android d’ouverture des paramètres n’est pas installé. Réinstalle la dernière version d’Athlys.");
 try{
  await launcher.startActivityAsync({action:"android.health.connect.action.HEALTH_HOME_SETTINGS"});
 }catch(modernError){
  try{await launcher.startActivityAsync({action:"androidx.health.ACTION_HEALTH_CONNECT_SETTINGS"})}
  catch(legacyError){throw new Error("Android n’a pas pu ouvrir Health Connect. Vérifie que Health Connect est installé et activé dans les paramètres du téléphone.")}
 }
}
function healthIsNative(){return !!(window.Capacitor&&typeof window.Capacitor.isNativePlatform==="function"&&window.Capacitor.isNativePlatform())}
function healthTypeInfo(type){return {steps:{recordType:"steps",unit:"count",label:"Pas"},distance:{recordType:"distance",unit:"m",label:"Distance marchée / courue"},calories:{recordType:"active_calories",unit:"kcal",label:"Calories actives"},heartRate:{recordType:"heart_rate",unit:"bpm",label:"Fréquence cardiaque"},weight:{recordType:"weight",unit:"kg",label:"Poids"}}[type]}
function healthSourceCode(sample){var s=String(sample&&sample.sourceName||"")+" "+String(sample&&sample.sourceId||"");if(/garmin/i.test(s))return "garmin";if(/polar/i.test(s))return "polar";if(/whoop/i.test(s))return "whoop";if(/huawei/i.test(s))return "huawei";if(/samsung/i.test(s))return "samsung_health";return H.platform==="ios"?"apple_health":"health_connect"}
function healthSourceLabel(source){return ({apple_health:"Apple Santé",garmin:"Garmin",polar:"Polar",whoop:"WHOOP",huawei:"Huawei",samsung_health:"Samsung Health",health_connect:"Health Connect"})[source]||source||"Health Connect"}
async function healthStableId(value){var bytes;if(window.crypto&&window.crypto.subtle&&window.TextEncoder){var digest=await window.crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(value)));bytes=Array.from(new Uint8Array(digest).slice(0,16))}else{var hashes=[2166136261,2246822519,3266489917,668265263],str=String(value);for(var h=0;h<hashes.length;h++){var v=hashes[h];for(var i=0;i<str.length;i++){v^=str.charCodeAt(i);v=Math.imul(v,16777619)}hashes[h]=v>>>0}bytes=hashes.flatMap(function(v){return [(v>>>24)&255,(v>>>16)&255,(v>>>8)&255,v&255]})}bytes[6]=(bytes[6]&15)|80;bytes[8]=(bytes[8]&63)|128;var hex=bytes.map(function(x){return x.toString(16).padStart(2,"0")}).join("");return hex.slice(0,8)+"-"+hex.slice(8,12)+"-"+hex.slice(12,16)+"-"+hex.slice(16,20)+"-"+hex.slice(20,32)}
function healthUuid(){if(window.crypto&&typeof window.crypto.randomUUID==="function")return window.crypto.randomUUID();return null}
async function healthApiRequest(path,options){var auth=await db.auth.getSession(),token=auth&&auth.data&&auth.data.session&&auth.data.session.access_token;if(!token)throw new Error("Session Athlys expirée. Reconnecte-toi.");var base=String(cfg.url||"").replace(/\/+$/,"");if(!base)throw new Error("URL Supabase absente.");var request=Object.assign({method:"GET"},options||{});request.headers=Object.assign({"Authorization":"Bearer "+token,"apikey":cfg.anonKey,"Content-Type":"application/json","Accept":"application/json"},options&&options.headers||{});var response=await fetch(base+"/functions/v1/athlys-health-connect/v1/health-connect"+path,request);var body={};try{body=await response.json()}catch(e){}if(!response.ok){var err=body&&body.error||{};throw new Error(err.message||("API Health Connect : HTTP "+response.status))}return body}

function healthLoadRecords(days,force){
 if(isCoach()||!own()||!db)return Promise.resolve(null);
 if(H.recordsLoading)return H.recordsPromise||Promise.resolve(H.healthSummary||null);
 if(!force&&H.recordsLoaded&&Date.now()-H.recordsAt<120000)return Promise.resolve(H.healthSummary||null);
 H.recordsLoading=true;H.recordsError="";
 var windowDays=Math.max(1,Math.min(180,Number(days)||30)),timeZone="UTC";
 try{timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC"}catch(e){}
 var run=(async function(){
  try{
   var result=await db.functions.invoke("athlys-performance-analysis",{body:{action:"health_summary",days:windowDays,timeZone:timeZone}});
   if(result.error)throw result.error;
   if(result.data&&result.data.error)throw new Error(result.data.error);
   H.healthSummary=result.data||null;
   H.recordsLoaded=true;H.recordsAt=Date.now();
   H.recordsError=result&&result.truncated?"Historique partiel : limite serveur de 20 000 mesures atteinte.":"";
  }catch(e){
   H.recordsError=String(e&&e.message||e);H.recordsLoaded=true;H.recordsAt=Date.now();H.healthSummary=null;
  }finally{H.recordsLoading=false;H.recordsPromise=null}
  return H.healthSummary||null;
 })();
 H.recordsPromise=run;return run;
}
function healthPerformanceCard(summary){
 if(isCoach())return card("Données Health Connect",'<p class="muted">Les données issues des objets connectés restent privées au compte de l’athlète. Elles ne sont pas accessibles au coach dans cette version.</p>');
 if(H.recordsLoading&&!summary)return card("Données physiologiques · Health Connect",'<p class="muted">Le serveur Athlys agrège les mesures synchronisées…</p>');
 summary=summary||H.healthSummary;
 if(!summary||!Array.isArray(summary.daily)||!summary.daily.length)return card("Données physiologiques · Health Connect",'<p class="muted">'+esc(H.recordsError||"Aucune mesure disponible sur les 30 derniers jours.")+'</p><p class="muted">Synchronise d’abord tes données dans « Objets connectés ». Une mesure absente reste inconnue, jamais égale à zéro.</p>');
 var trend=summary.trend||{},fmt=function(v,d){return v===null||v===undefined?"—":Number(v).toLocaleString("fr-FR",{maximumFractionDigits:d===undefined?0:d,minimumFractionDigits:0})};
 var stepTrend=trend.steps&&trend.steps.changePercent,trendText=stepTrend===null||stepTrend===undefined?"Comparaison hebdomadaire indisponible : quatre jours mesurés au minimum sont nécessaires sur chacune des deux semaines.":(stepTrend>=20?"Hausse":stepTrend<=-20?"Baisse":"Stabilité relative")+" de l’activité pédestre observée ("+(stepTrend>0?"+":"")+fmt(stepTrend,0)+" % versus semaine précédente).";
 var rows=summary.daily.slice(-7).reverse().map(function(x){
  var detail=[];
  if(x.stepsRecords)detail.push(fmt(x.steps,0)+" pas");
  if(x.distanceRecords)detail.push(fmt(x.distanceKm,2)+" km");
  if(x.calorieRecords)detail.push(fmt(x.activeCalories,0)+" kcal actives");
  if(x.heartRateRecords)detail.push("FC échantillonnée "+fmt(x.heartRateMean,0)+" bpm");
  return '<div class="list-row"><div><b>'+dateFR(x.date)+'</b><small>'+esc(detail.join(" · ")||"Mesure reçue")+'</small></div><strong>'+(x.stepsRecords?fmt(x.steps,0)+" pas":"—")+'</strong></div>';
 }).join("");
 var metrics='<div class="metrics perf-metrics">'+metric("Pas moyens / jour",summary.averageSteps===null?"—":fmt(summary.averageSteps,0),summary.stepDays+" jours mesurés")+metric("Distance moyenne",summary.averageDistanceKm===null?"—":fmt(summary.averageDistanceKm,2)+" km",summary.distanceDays+" jours mesurés")+metric("Calories actives / jour",summary.averageActiveCalories===null?"—":fmt(summary.averageActiveCalories,0)+" kcal",summary.calorieDays+" jours mesurés")+metric("FC moyenne échantillonnée",summary.averageHeartRate===null?"—":fmt(summary.averageHeartRate,0)+" bpm",summary.heartRateDays+" jours mesurés · pas une FC au repos")+metric("Poids récent",summary.latestWeight?fmt(summary.latestWeight.value,1)+" kg":"—",summary.latestWeight?dateFR(summary.latestWeight.at):"Aucune mesure de poids")+'</div>';
 return card("Données physiologiques · Health Connect",metrics+'<p class="muted">'+esc(trendText)+'</p><div class="health-daily-list">'+rows+'</div><p class="muted">Période : '+esc(String(summary.period&&summary.period.days||30))+' derniers jours synchronisés. L’activité quotidienne complète le contexte de charge ; elle n’est pas ajoutée à la charge sRPE et ne modifie pas directement l’indice de risque de blessure. En présence de plusieurs sources, Athlys retient un flux quotidien par métrique pour limiter les doublons ; les totaux restent des estimations lorsque les sources se chevauchent. La FC affichée est la moyenne des échantillons disponibles, pas une fréquence cardiaque au repos. Les agrégations et comparaisons sont calculées sur les serveurs Athlys.</p>'+(H.recordsError?'<p class="muted">'+esc(H.recordsError)+'</p>':""));
}
async function healthRefreshStatus(){H.lastSync=localStorage.getItem("athlys-health-sync-"+own())||null;H.shareWithCoach=localStorage.getItem("athlys-health-share-"+own())==="true";var p=healthApi();if(!healthIsNative()||!p){H.available=false;H.platform=window.Capacitor&&window.Capacitor.getPlatform?window.Capacitor.getPlatform():"web";H.reason="Les données santé nécessitent l’application native Athlys. Le navigateur et la PWA n’exposent pas Health Connect.";return}try{var result=await p.isAvailable();H.available=!!result.available;H.platform=result.platform||window.Capacitor.getPlatform();H.reason=result.reason||""}catch(e){H.available=false;H.reason=e&&e.message||"Health Connect est indisponible."}try{var results=await Promise.all([healthApiRequest("/status"),healthApiRequest("/consents"),healthApiRequest("/records?limit=12")]);H.apiStatus=results[0];H.consents=results[1].categories||{activity:false,recovery:false,body:false,cycle:false};H.apiRecords=results[2].items||[];H.apiLoaded=true}catch(e){H.apiError=e&&e.message||"Impossible de joindre l’API Health Connect.";H.apiLoaded=true}}
async function healthSaveConsents(categories){var body={privacyPolicyVersion:HEALTH_API_VERSION,categories:{activity:!!categories.activity,recovery:!!categories.recovery,body:!!categories.body,cycle:!!categories.cycle}};var result=await healthApiRequest("/consents",{method:"PUT",body:JSON.stringify(body)});H.consents=body.categories;H.apiLoaded=true;if(!Object.values(body.categories).some(Boolean))await healthRevokeBackgroundSync();return result}
function healthSelectedConsents(){var selected={};["activity","recovery","body"].forEach(function(k){var input=$('input[data-health-consent="'+k+'"]');selected[k]=input?!!input.checked:!!(H.consents&&H.consents[k])});selected.cycle=!!(H.consents&&H.consents.cycle);return selected}

async function healthImportSamples(p){
 var selected=H.consents||{},requestedTypes=Object.keys(HEALTH_TYPES_BY_CATEGORY).filter(function(k){return k!=="cycle"&&selected[k]}).flatMap(function(k){return HEALTH_TYPES_BY_CATEGORY[k]});
 if(!requestedTypes.length)return {count:0,errors:["Aucune catégorie autorisée dans Athlys."]};
 var permission=await p.checkAuthorization({read:requestedTypes,write:[]}),authorizedTypes=permission&&Array.isArray(permission.readAuthorized)?permission.readAuthorized:[];
 var types=requestedTypes.filter(function(type){return authorizedTypes.indexOf(type)!==-1});
 if(!types.length)return {count:0,errors:["Aucun accès de lecture accordé par Health Connect. Ouvre « Autoriser dans Health Connect » pour revoir les autorisations."]};
 var start=new Date(Date.now()-30*86400000).toISOString(),end=new Date().toISOString(),deviceId=localStorage.getItem("athlys-health-device-id-"+own());
 if(!deviceId){deviceId=healthUuid()||await healthStableId("athlys-health-device|"+own());localStorage.setItem("athlys-health-device-id-"+own(),deviceId)}
 var counts={},errors=[],total=0;
 for(var i=0;i<types.length;i++){
  var type=types[i],info=healthTypeInfo(type);
  try{
   var records=[],seenRaw={};
   var result=await p.readSamples({dataType:type,startDate:start,endDate:end,limit:500}),samples=result&&Array.isArray(result.samples)?result.samples:[];
   for(var j=0;j<samples.length;j++){
    var sample=samples[j],value=Number(sample.value),date=sample.startDate;
    if(!Number.isFinite(value)||!date||Number.isNaN(new Date(date).getTime())||value<0)continue;
    if(type==="heartRate"&&(value<20||value>250))continue;
    if(type==="weight"&&(value<20||value>350))continue;
    var stamp=new Date(date).toISOString(),endDate=sample.endDate?new Date(sample.endDate).toISOString():stamp,origin=String(sample.sourceId||sample.sourceName||"Health Connect").slice(0,255),signature=[type,stamp,endDate,value].join("|");
    if(seenRaw[signature])continue;seenRaw[signature]=true;
    var recordId=await healthStableId([own(),type,stamp,endDate,origin,String(sample.sourceName||"")].join("|"));
    records.push({recordId:recordId,dataOrigin:origin,startTime:stamp,endTime:endDate,value:value,unit:info.unit,data:{platform:H.platform,provider:String(sample.sourceName||"Health Connect").slice(0,90),nativeType:type,aggregated:false}});
   }
   counts[type]=records.length;
   for(var offset=0;offset<records.length;offset+=250){
    var batch={batchId:healthUuid()||await healthStableId(deviceId+"|"+type+"|"+start+"|"+offset),deviceId:deviceId,recordType:info.recordType,syncFrom:start,syncTo:end,upserts:records.slice(offset,offset+250),deletions:[]};
    await healthApiRequest("/sync-batches",{method:"POST",headers:{"Idempotency-Key":batch.batchId},body:JSON.stringify(batch)});total+=batch.upserts.length;
   }
  }catch(e){errors.push(info.label+" : "+String(e&&e.message||e).slice(0,180))}
 }
 H.lastCount=total;H.counts=counts;H.lastSync=new Date().toISOString();localStorage.setItem("athlys-health-sync-"+own(),H.lastSync);H.error=errors.join(" · ");
 var fresh=await Promise.all([healthApiRequest("/status"),healthApiRequest("/records?limit=12")]);H.apiStatus=fresh[0];H.apiRecords=fresh[1].items||[];
 return {count:total,errors:errors};
}
async function healthConnect(){
 if(H.busy||isCoach())return;
 var selected=healthSelectedConsents();
 var requestedTypes=Object.keys(HEALTH_TYPES_BY_CATEGORY).filter(function(k){return k!=="cycle"&&selected[k]}).flatMap(function(k){return HEALTH_TYPES_BY_CATEGORY[k]});
 if(!requestedTypes.length){toast("Choisis au moins une catégorie à autoriser.");return}
 H.busy=true;H.error="";render();
 try{
  var p=healthApi();
  if(!healthIsNative()||!p)throw new Error("Ouvre Athlys dans son application Android pour accéder à Health Connect.");
  var available=await p.isAvailable();
  H.available=!!available.available;H.platform=available.platform||H.platform;H.reason=available.reason||"";
  if(!available.available)throw new Error(H.reason||"Health Connect est indisponible.");
  // Request the operating-system permissions directly from Health Connect.
  // Already granted scopes are excluded so that only missing permissions are prompted.
  var current=await p.checkAuthorization({read:requestedTypes,write:[]});
  var already=current&&Array.isArray(current.readAuthorized)?current.readAuthorized:[];
  var missing=requestedTypes.filter(function(type){return already.indexOf(type)===-1});
  var status=current;
  if(missing.length){
   // Android uses the current Jetpack Activity Result contract to launch the
   // Health Connect permission sheet; retain the Capgo path as a safe fallback.
   var nativePlugins=window.Capacitor&&window.Capacitor.Plugins;
   var nativePermission=nativePlugins&&nativePlugins.HealthConnectPermissions;
   if(healthIsNative()&&nativePermission&&typeof nativePermission.requestAuthorization==="function"){
    status=await nativePermission.requestAuthorization({read:missing,write:[]});
   }else{
    status=await p.requestAuthorization({read:missing,write:[]});
   }
  }
  var granted=status&&Array.isArray(status.readAuthorized)?status.readAuthorized:[];
  if(!granted.length)throw new Error("Aucun accès n’a été accordé. Vérifie les catégories sélectionnées puis réessaie la demande d’autorisation.");
  await healthSaveConsents(selected);
  H.consents=selected;
  var count=granted.filter(function(type){return requestedTypes.indexOf(type)!==-1}).length;
  toast("Athlys est autorisé à lire "+count+" type(s) de données dans Health Connect. Tu peux maintenant synchroniser.");
 }catch(e){H.error=String(e&&e.message||e);toast("Autorisation Health Connect : "+H.error)}
 finally{H.busy=false;render()}
}
async function healthManageSettings(){
 try{if(window.AthlysHealthBackground&&window.AthlysHealthBackground.openHealthConnectSettings)await window.AthlysHealthBackground.openHealthConnectSettings();else await healthOpenSettings()}
 catch(e){H.error=String(e&&e.message||e);toast("Paramètres Health Connect : "+H.error);render()}
}
async function healthConfigureBackgroundSync(){
 var bridge=window.AthlysHealthBackground;
 if(!healthIsNative()||!bridge||typeof bridge.configure!=="function")return {scheduled:false,reason:"plugin_unavailable"};
 var auth=await db.auth.getSession(),current=auth&&auth.data&&auth.data.session;
 if(!current)throw new Error("Session Athlys indisponible pour activer la synchronisation en arrière-plan.");
 var deviceId=localStorage.getItem("athlys-health-device-id-"+own());
 if(!deviceId){deviceId=healthUuid()||await healthStableId("athlys-health-device|"+own());localStorage.setItem("athlys-health-device-id-"+own(),deviceId)}
 var issued=await healthApiRequest("/background-token",{method:"POST",body:JSON.stringify({deviceId:deviceId})});
 var configured=await bridge.configure({deviceToken:issued.token,url:cfg.url,deviceId:deviceId,consents:JSON.stringify(H.consents||issued.scopes||{})});
 H.backgroundSync={scheduled:!!configured.scheduled,intervalHours:configured.intervalHours||1,timing:configured.timing||"best_effort_android"};
 H.backgroundStatus=await healthBackgroundStatus();H.backgroundStatusLoaded=true;
 return H.backgroundSync;
}
async function healthRevokeBackgroundSync(){
 var bridge=window.AthlysHealthBackground,deviceId=localStorage.getItem("athlys-health-device-id-"+own());
 try{if(deviceId)await healthApiRequest("/background-token",{method:"DELETE",body:JSON.stringify({deviceId:deviceId})})}catch(e){}
 try{if(bridge&&typeof bridge.disable==="function")await bridge.disable()}catch(e){}
 H.backgroundSync={scheduled:false};H.backgroundStatus={status:"not_configured"};H.backgroundStatusLoaded=true;
}
async function healthBackgroundStatus(){
 var bridge=window.AthlysHealthBackground;
 if(!bridge||typeof bridge.status!=="function")return null;
 try{return await bridge.status()}catch(e){return null}
}
async function healthSync(){
 if(H.busy||isCoach())return;
 H.busy=true;H.error="";render();
 try{
  var p=healthApi();
  if(!healthIsNative()||!p)throw new Error("La synchronisation santé nécessite l’application Android native.");
  var available=await p.isAvailable();
  H.available=!!available.available;H.platform=available.platform||H.platform;
  if(!available.available)throw new Error(H.reason||"Health Connect est indisponible.");
  var consent=await healthApiRequest("/consents");
  var saved=consent.categories||{};
  var requestedTypes=Object.keys(HEALTH_TYPES_BY_CATEGORY).filter(function(k){return k!=="cycle"&&saved[k]}).flatMap(function(k){return HEALTH_TYPES_BY_CATEGORY[k]});
  var permission=await p.checkAuthorization({read:requestedTypes,write:[]});
  var authorizedTypes=permission&&Array.isArray(permission.readAuthorized)?permission.readAuthorized:[];
  var granted={
   activity:!!saved.activity&&HEALTH_TYPES_BY_CATEGORY.activity.some(function(type){return authorizedTypes.indexOf(type)!==-1}),
   recovery:!!saved.recovery&&HEALTH_TYPES_BY_CATEGORY.recovery.some(function(type){return authorizedTypes.indexOf(type)!==-1}),
   body:!!saved.body&&HEALTH_TYPES_BY_CATEGORY.body.some(function(type){return authorizedTypes.indexOf(type)!==-1}),
   cycle:false
  };
  if(!requestedTypes.length)throw new Error("Aucune catégorie sélectionnée dans Athlys. Sélectionne au moins une catégorie puis ouvre les autorisations Health Connect.");
  if(!authorizedTypes.length)throw new Error("Aucun accès de lecture actif. Appuie sur « Autoriser Athlys dans Health Connect » pour afficher la demande d’autorisation Android.");
  H.consents=granted;
  if(JSON.stringify(saved)!==JSON.stringify(granted))await healthSaveConsents(granted);
  var result=await healthImportSamples(p);
  await healthLoadRecords(30,true);
  var bg=await healthConfigureBackgroundSync();
  if(bg.scheduled)toast("Synchronisation manuelle terminée. La synchronisation horaire en arrière-plan est planifiée ; Android peut différer son exécution.");
  toast(result.count?result.count+" mesure(s) synchronisée(s) via l’API Athlys.":(result.errors.length?result.errors.join(" · "):"Aucune nouvelle mesure sur les 30 derniers jours."));
 }catch(e){H.error=String(e&&e.message||e);toast("Synchronisation impossible : "+H.error)}
 finally{H.busy=false;render()}
}
async function healthDeleteImported(){if(H.busy||!confirm("Supprimer les mesures importées depuis Health Connect sur les serveurs Athlys ? Les données de santé originales du téléphone ne seront pas touchées."))return;H.busy=true;render();try{await healthApiRequest("/records?confirm=true",{method:"DELETE"});await q(db.from("athlete_measurements").delete().eq("athlete_id",own()).like("notes",HEALTH_MARKER+"%"));H.lastCount=0;H.apiRecords=[];H.healthRecords=[];H.healthSummary=null;H.recordsLoaded=true;H.recordsAt=Date.now();H.apiStatus=await healthApiRequest("/status");await fetchData();toast("Mesures importées supprimées d’Athlys. Les autorisations du téléphone restent inchangées.")}catch(e){toast("Suppression impossible : "+String(e&&e.message||e))}finally{H.busy=false;render()}}
function viewIntegrations(){if(!H.apiLoaded&&!H.apiLoading){H.apiLoading=true;healthRefreshStatus().then(function(){H.apiLoading=false;render()})}var native=healthIsNative();if(native&&!H.backgroundStatusLoaded&&!H.backgroundStatusLoading){H.backgroundStatusLoading=true;healthBackgroundStatus().then(function(v){H.backgroundStatus=v;H.backgroundStatusLoaded=true;H.backgroundStatusLoading=false;render()})}var bg=H.backgroundStatus||{},bgLabel=bg.status==="needs_background_permission"?"Autorisation Health Connect en arrière-plan requise":bg.status==="completed"?"Synchronisation en arrière-plan exécutée":bg.status==="token_revoked"?"Jeton révoqué — relance une synchronisation":bg.status==="consent_revoked"?"Consentement à vérifier":bg.status==="scheduled"?"Contrôle périodique planifié — intervalle d’une heure":"Non configurée",bgDetail=bg.lastAttemptAt?"Dernier contrôle : "+dateFR(new Date(bg.lastAttemptAt).toISOString(),true)+(bg.lastUploadedCount!=null?" · "+bg.lastUploadedCount+" mesures envoyées":""):"Le premier contrôle périodique intervient après activation.";var backgroundCard=native?card("Synchronisation en arrière-plan",'<p class="muted">'+esc(bgLabel)+'</p><p class="muted">'+esc(bgDetail)+'</p><p class="muted">Android peut différer l’exécution selon la veille, la batterie et le réseau. La permission de lecture en arrière-plan doit être accordée dans Health Connect.</p>'):"";var status=H.available===null?"Vérification du service…":H.available?"Disponible sur cet appareil":native?"Indisponible":"Disponible uniquement dans l’application native",explanation=isCoach()?"La synchronisation des données de santé est réservée aux comptes athlètes.":!native?"La version navigateur et la PWA ne peuvent pas lire les données de Health Connect. Installe l’APK Android pour activer la passerelle.":H.available?"Choisis les catégories puis appuie sur « Autoriser Athlys dans Health Connect ». Android affichera une demande d’accès pour Athlys. Tu pourras ensuite synchroniser uniquement les données autorisées. Les données sont transmises à l’API Athlys avec ton compte sécurisé. Après la première synchronisation, Athlys planifie un contrôle horaire en arrière-plan. Dans Health Connect, autorise aussi la lecture des données en arrière-plan pour Athlys.":"Service indisponible : "+(H.reason||"vérifie que Health Connect est installé et activé."),action=isCoach()?"":!native?'<p class="muted">Installe l’APK Athlys sur Android. Health Connect doit être installé et contenir les données des applications de tes appareils.</p>':H.available?'<div class="health-consents"><label><input type="checkbox" data-health-consent="activity" '+(H.consents&&H.consents.activity?"checked":"")+'> Activité — pas, distance et calories actives</label><label><input type="checkbox" data-health-consent="recovery" '+(H.consents&&H.consents.recovery?"checked":"")+'> Récupération — fréquence cardiaque</label><label><input type="checkbox" data-health-consent="body" '+(H.consents&&H.consents.body?"checked":"")+'> Données corporelles — poids</label><p class="muted">Cycle menstruel : catégorie prévue par l’API, non importée dans cette version Android.</p><div class="actions">'+btn("Autoriser Athlys dans Health Connect","health-connect","primary")+btn("Gérer les autorisations","health-settings","secondary")+btn("Lecture en arrière-plan","health-background-settings","secondary")+btn("Synchroniser · 30 jours","health-sync")+'</div></div>':(H.platform==="android"?'<a class="health-link" href="https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata" target="_blank" rel="noopener">Installer Health Connect</a>':"");var records=H.apiRecords||[],rows=records.slice(0,8).map(function(x){return '<div class="list-row"><div><b>'+esc(String(x.recordType||"").replace(/_/g," "))+'</b><small>'+esc(healthSourceLabel(x.data&&x.data.provider||"health_connect"))+' · '+dateFR(x.startTime,true)+'</small></div><strong>'+esc((x.value==null?"":x.value+" "+(x.unit||"")))+'</strong></div>'}).join("")||empty("Aucune mesure synchronisée","Autorise les catégories puis lance une synchronisation.");return heading("OBJETS CONNECTÉS","Health Connect","Une passerelle sécurisée entre les données de ton téléphone et Athlys.")+card("Passerelle santé",'<div class="health-status"><span class="health-dot '+(H.available?"ready":"")+'"></span><b>'+esc(status)+'</b><small>Android Health Connect · API Athlys v1</small></div><p class="muted">'+esc(explanation)+'</p>'+action+(H.error?'<p class="health-error">'+esc(H.error)+'</p>':"")+(H.apiError?'<p class="health-error">'+esc(H.apiError)+'</p>':"")+'<p class="muted">Lecture seule. Les données sont rattachées au compte Athlys connecté ; aucun accès en écriture à Health Connect n’est demandé.</p>')+backgroundCard+card("Mesures reçues",'<div class="metrics">'+metric("Mesures sur le serveur",H.apiStatus&&H.apiStatus.recordCount!=null?H.apiStatus.recordCount:records.length,"Enregistrements associés à ton compte") +metric("Dernière synchronisation",H.apiStatus&&H.apiStatus.lastSyncedAt?dateFR(H.apiStatus.lastSyncedAt,true):"Jamais","Synchronisation manuelle")+'</div>'+rows)+(function(){var sources=H.apiStatus&&Array.isArray(H.apiStatus.detectedSources)?H.apiStatus.detectedSources:[],catalog=H.apiStatus&&Array.isArray(H.apiStatus.providerCatalog)?H.apiStatus.providerCatalog:[];var detected=sources.length?sources.map(function(x){return '<div class="list-row"><div><b>'+esc(x.label)+'</b><small>Source remontée par Health Connect</small></div><strong>'+esc(String(x.recordCount))+'</strong></div>'}).join(""):empty("Aucune source détectée","Les applications compatibles doivent partager leurs mesures avec Health Connect.");var integrations=H.apiStatus&&Array.isArray(H.apiStatus.integrations)?H.apiStatus.integrations:[];var statusLabels={connected:"Connecté",pending_authorization:"Autorisation en attente",syncing:"Synchronisation",error:"Erreur",revoked:"Révoqué",not_connected:"Non connecté"};var planned=catalog.filter(function(x){return x.id!=="health_connect"}).map(function(x){var state=integrations.find(function(v){return v.provider===x.id});var label=state?(statusLabels[state.status]||state.status):(x.directOAuthReady?"Disponible":"À configurer");var last=state&&state.last_sync_at?" · dernière synchro "+dateFR(state.last_sync_at,true):"";return '<div class="list-row"><div><b>'+esc(x.label)+'</b><small>'+esc(x.note)+esc(last)+'</small></div><strong>'+esc(label)+'</strong></div>'}).join("");return card("Sources & connecteurs",'<p class="muted">Les marques détectées ici sont des sources importées via Health Connect, pas des connexions OAuth directes.</p>'+detected+'<div class="divider"></div>'+planned)})()+card("Partage & confidentialité",'<p class="muted">Le consentement de collecte est distinct du partage avec ton coach. Les mesures ne sont pas partagées par défaut. Tu peux retirer une catégorie en décochant son consentement et en enregistrant à nouveau tes choix.</p><p class="muted">Les mesures Health Connect restent privées au compte athlète. Le partage au coach n’est pas activé dans cette version ; aucune mesure ne lui est transmise.</p><p class="muted"><a class="health-link" href="/privacy-health.html" target="_blank" rel="noopener">Lire la notice sur les données de santé</a></p>'+btn("Supprimer les mesures importées","health-delete","danger"))}
function desktopNavGroups(){
 var primary=isCoach()?[["home","Vue d’ensemble","⌂"],["team","Équipe","◉"],["schedule","Agenda","▦"]]:[["home","Accueil","⌂"],["schedule","Agenda","▦"],["training","Mon suivi","◉"]];
 var progress=isCoach()?[["training","Programmes","▤"],["performance","Analyse","↗"],["quantum","Athlys Quantum","✧"],["goals","Objectifs","◎"]]:[["performance","Mes progrès","↗"],["goals","Objectifs","◎"]];
 return [
  {title:"PILOTAGE",items:primary},
  {title:"PERFORMANCE",items:progress},
  {title:"COMMUNICATION",items:[["messages","Messagerie","✉"],["questionnaires","Questionnaires","☑"],["videos","Vidéos techniques","▶"]]},
  {title:"RESSOURCES",items:[["library","Bibliothèque","▧"],["equipment","Matériel","⚙"],["competitions","Compétitions","⚑"],["reports","Rapports","▤"]]},
  {title:"COMPTE",items:[["profile","Mon profil","◌"],["integrations","Objets connectés","⌁"]]}
 ];
}
function desktopNavItems(){return desktopNavGroups().reduce(function(a,g){return a.concat(g.items.map(function(x){return {key:x[0],label:x[1]}}))},[])}
function nav(){
 var groups=desktopNavGroups();
 return '<aside class="sidebar"><div class="sidebar-workspace"><span class="sidebar-emblem"><img src="assets/athlys-logo.svg" alt="Athlys"></span><span><b>ATHLYS WORKSPACE</b><small>'+(isCoach()?"ESPACE COACH":"ESPACE ATHLÈTE")+'</small></span></div>'+
 groups.map(function(g){return '<section class="sidebar-group"><small>'+g.title+'</small>'+g.items.map(function(x){return '<button data-nav="'+x[0]+'" class="'+(view===x[0]?"active":"")+'"><i>'+x[2]+'</i><span>'+x[1]+'</span></button>'}).join("")+'</section>'}).join("")+
 '<div class="sidebar-bottom"><div class="sidebar-status"><i></i><span>Synchronisé avec Athlys</span></div><button class="logout" data-action="logout"><i>↪</i><span>Déconnexion</span></button></div></aside>';
}
function desktopSearchGo(){
 var input=$("#desktop-search"),term=(input&&input.value||"").trim().toLocaleLowerCase("fr");
 if(!term)return;
 var route=desktopNavItems().find(function(x){return x.label.toLocaleLowerCase("fr")===term||x.key.toLowerCase()===term});
 if(route){view=route.key;A.open=false;render();return}
 if(isCoach()){
  var athlete=D.roster.find(function(x){return String(x.full_name||"").toLocaleLowerCase("fr")===term||String(x.full_name||"").toLocaleLowerCase("fr").indexOf(term)>=0});
  if(athlete){selectedAthleteId=athlete.id;view="team";A.open=false;render();return}
 }
 toast("Aucun module ou athlète trouvé.");
}
function onKeyDown(e){if(e.target&&e.target.id==="desktop-search"&&e.key==="Enter"){e.preventDefault();desktopSearchGo()}}
function desktopSearchShortcut(e){if((e.metaKey||e.ctrlKey)&&String(e.key).toLowerCase()==="k"&&window.innerWidth>700){var input=$("#desktop-search");if(input){e.preventDefault();input.focus();input.select()}}}
function assistantPending(){var p=A.pending;if(!p)return "";var lines=p.type==="event"?[p.data.title,dateFR(p.data.starts_at,true),p.data.discipline||"Discipline à préciser"]:p.type==="checkin"?["Forme "+p.data.feeling+"/5","Stress "+p.data.stress+"/5","Récupération "+(p.data.recovery||"—")+"/5"]:["Objectif "+p.data.title];return '<div class="assistant-pending"><b>Action proposée · à confirmer</b>'+lines.map(function(x){return '<span>'+esc(x)+'</span>'}).join("")+'<div>'+btn("Confirmer","assistant-confirm","primary")+btn("Annuler","assistant-cancel")+'</div></div>'}
function assistantHistoryKey(){return "athlys-assistant-history-"+own()+"-"+(isCoach()?"coach":"athlete")}
function assistantHistoryLoad(){if(A.historyLoaded||!own())return;A.historyLoaded=true;try{A.history=JSON.parse(localStorage.getItem(assistantHistoryKey())||"[]").slice(-24)}catch(e){A.history=[]}}
function assistantHistorySave(){try{localStorage.setItem(assistantHistoryKey(),JSON.stringify(A.history.slice(-24)))}catch(e){}}
function assistantView(){
 assistantHistoryLoad();
 var intro='<div class="assistant-welcome"><span class="assistant-orb">A</span><b>Bonjour '+esc((profile&&profile.first_name)||"")+' !</b><p>Parle naturellement : analyse tes données, organise tes séances ou demande une recherche Web sourcée.</p></div><div class="assistant-quick"><button data-assistant="Fais le point sur ma forme et ma charge récente">Mon état de forme</button><button data-assistant="Qu’est-ce qui progresse et qu’est-ce qui stagne ?">Mes progrès</button><button data-assistant="Quelles sont les choses auxquelles je devrais faire attention ?">Points de vigilance</button><button data-assistant="Aide-moi à organiser ma prochaine semaine d’entraînement">Organiser ma semaine</button></div>';
 var insightHtml=A.insights&&A.insights.length?'<div class="assistant-insights"><b>✦ Insights repérés automatiquement</b>'+A.insights.map(function(x){return '<article><small>'+esc(x.category||"INSIGHT")+'</small><b>'+esc(x.title)+'</b><p>'+esc(x.detail)+'</p></article>'}).join("")+'</div>':"";


 return '<aside class="assistant '+(A.open?"open":"")+'"><button class="assistant-launch" data-action="assistant-toggle"><span>A</span> Assistant Athlys</button><section class="assistant-panel" '+(A.open?"":"hidden")+'><header><div><b>Assistant Athlys</b><small><i class="assistant-status"></i> '+"Moteur local autonome · actif"+'</small></div><div class="assistant-head-actions"><button class="close" title="Nouvelle conversation" data-action="assistant-reset">↻</button><button class="close" data-action="assistant-toggle" aria-label="Fermer">×</button></div></header><div class="assistant-content" id="assistant-content">'+(A.history.map(assistantMessageHtml).join("")||intro)+insightHtml+(A.loading?'<div class="assistant-msg assistant assistant-thinking"><span>A</span><p><i></i><i></i><i></i> Analyse locale…</p></div>':"")+(A.pending?assistantPending():"")+'</div><form data-form="assistant"><input name="prompt" maxlength="4000" autocomplete="off" placeholder="Écris librement… (ex. pourquoi je fatigue ?)" required><button class="btn primary" '+(A.loading?"disabled":"")+'>Envoyer</button></form><small>Le moteur local interprète les demandes avec des règles déterministes et calcule la charge sans serveur d’inférence. Il ne s’agit pas encore d’un LLM génératif embarqué : les demandes complexes ou ambiguës peuvent nécessiter une précision. Aucune inférence n’est envoyée à un serveur ; la recherche Web ne part que lorsque tu la demandes explicitement.</small></section></aside>';
}
function assistantSafeSources(sources){
 return (Array.isArray(sources)?sources:[]).slice(0,6).map(function(x){
  var url=String(x&&x.url||"");try{var u=new URL(url);if(u.protocol!=="https:"&&u.protocol!=="http:")return null}catch(e){return null}
  return {title:String(x.title||u.hostname).slice(0,140),url:url,domain:String(x.domain||u.hostname).slice(0,100),snippet:String(x.snippet||"").slice(0,900)};
 }).filter(Boolean);
}
function assistantMessageHtml(x){
 var sources=assistantSafeSources(x.sources||[]);
 return '<div class="assistant-msg '+(x.role==="user"?"user":"assistant")+'"><span>'+(x.role==="user"?"Vous":"A")+'</span><p>'+esc(x.text).replace(/\n/g,"<br>")+'</p>'+(sources.length?'<div class="assistant-sources"><small>Sources consultées</small>'+sources.map(function(s,i){return '<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">['+(i+1)+'] '+esc(s.title)+' <span>'+esc(s.domain)+'</span></a>'}).join("")+'</div>':"")+'</div>';
}
function assistantSay(role,text,sources){
 var item={role:role,text:text,sources:assistantSafeSources(sources)};
 A.history.push(item);if(A.history.length>24)A.history.shift();assistantHistorySave();
 var box=$("#assistant-content");if(box){box.insertAdjacentHTML("beforeend",assistantMessageHtml(item));box.scrollTop=box.scrollHeight}
}
function assistantNormalize(value){
 return String(value||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g," ");
}
function assistantDomains(prompt){
 var q=assistantNormalize(prompt),out=[];
 if(/(forme|fatigu|charge|recuper|rpe|atl|ctl|tsb|douleur|stress|sommeil|disponibilit|bien etre)/.test(q))out.push("performance");
 if(/(seance|entrain|programme|planification|planning|agenda|calendrier|semaine|microcycle|cycle|prepar)/.test(q))out.push("training");
 if(/(progres|progression|record|chrono|resultat|objectif|competition|classement|performance|evolution)/.test(q))out.push("progress");
 if(/(exercice|bibliotheque|materiel|equipement|perche|sprint|foulee|contact au sol|saut)/.test(q))out.push("library");
 if(/(montre|montre connectee|objet connecte|capteur|health connect|apple sante|healthkit|activite quotidienne|activite physique|pas quotidiens|nombre de pas|frequence cardiaque|rythme cardiaque|bpm|calories actives|distance marchee|distance parcourue|poids|masse corporelle|donnees sante|donnees de sante|hrv|variabilite cardiaque|sommeil)/.test(q))out.push("wearables");
 if(isCoach()&&/(equipe|groupe|effectif|athlete|collect|compar|duel)/.test(q))out.push("team");
 if(!out.length)out.push("overview");
 return Array.from(new Set(out));
}
function assistantShouldSearchWeb(prompt,domains){
 var q=assistantNormalize(prompt);
 return /(sur le web|sur internet|recherche web|cherche sur internet|va chercher|sources web|sources fiables|cite tes sources)/.test(q);
}
async function assistantSearchWeb(query){
 if(!db||!session)throw new Error("Connecte-toi pour lancer une recherche Web.");
 var result=await db.functions.invoke("athlys-assistant",{body:{mode:"search",query:String(query||"").slice(0,500)}});
 if(result.error)throw result.error;
 var data=result.data||{};
 if(data.error)throw new Error(data.error);
 return {sources:assistantSafeSources(data.sources||[]),provider:data.provider||"Recherche publique",notice:String(data.notice||"")};
}
function assistantLocalContext(){
 var athleteId=isCoach()?(selectedAthleteId||D.roster[0]&&D.roster[0].id):own();
 var programs=(D.programs||[]).filter(function(x){return !athleteId||!x.athlete_id||x.athlete_id===athleteId;});
 var programIds=programs.map(function(x){return x.id;});
 return {logs:athleteId?(D.logs||[]).filter(function(x){return x.athlete_id===athleteId;}):[],checkins:athleteId?(D.checkins||[]).filter(function(x){return x.athlete_id===athleteId;}):[],programs:programs,sessions:(D.sessions||[]).filter(function(x){return programIds.indexOf(x.program_id)>=0;})};
}
async function assistantRequest(prompt,mode){
 if(A.loading)return;
 A.loading=true;render();
 try{
  var webResult={sources:[]},webError="";
  if(mode!=="insights"&&assistantShouldSearchWeb(prompt,[])){
   try{webResult=await assistantSearchWeb(prompt)}catch(searchError){webError=searchError&&searchError.message||"Recherche Web indisponible";}
  }
  var engine=window.AthlysLocalIntelligence;
  if(!engine)throw new Error("Le moteur local Athlys n’est pas chargé.");
  var context=assistantLocalContext();
  var data=engine.localAssistantReply(prompt,context);
  var reply=data.reply||"Je peux analyser les données disponibles dans cet espace.";
  if(webError)reply+="\n\nRecherche Web non disponible : "+webError+".";
  if(webResult.notice)reply+="\n\n"+webResult.notice;
  assistantSay("assistant",reply,webResult.sources);
  if(mode==="insights"){A.insights=engine.localInsights(context);A.insightLoaded=true;}
 }catch(error){
  assistantSay("assistant","Le traitement local n’a pas abouti : "+(error&&error.message||"erreur inconnue")+". Aucune requête d’inférence distante n’a été tentée.");
 }finally{A.loading=false;render();}
}
async function assistantHandle(text){await assistantRequest(text,"chat")}
function assistantLoadInsights(force){
 if(!A.open||A.insightLoaded&&!force||A.insightLoading)return;
 A.insightLoading=true;
 try{
  A.insights=window.AthlysLocalIntelligence?window.AthlysLocalIntelligence.localInsights(assistantLocalContext()):[];
  A.insightLoaded=true;
 }catch(error){A.insights=[];A.insightLoaded=false;console.warn("assistant_local_insights_failed",error&&error.message||"local_error");}
 finally{A.insightLoading=false;if(A.open)render();}
}
async function assistantConfirm(){var p=A.pending;if(!p)return;try{if(p.type==="event"){var c=isCoach()?own():coachId();if(!c)throw new Error("Aucun coach relié.");await q(db.from("calendar_events").insert({coach_id:c,athlete_id:isCoach()?selectedAthleteId||null:own(),created_by:own(),title:p.data.title,starts_at:p.data.starts_at,discipline:p.data.discipline||"",session_type:p.data.session_type||"Entraînement",notes:p.data.notes||"Via assistant"}))}else if(p.type==="checkin"){if(isCoach())throw new Error("Un entraîneur ne peut pas enregistrer le ressenti à la place de l’athlète.");await q(db.from("athlete_checkins").insert({athlete_id:own(),day_type:p.data.day_type||"training",feeling:p.data.feeling,stress:p.data.stress,recovery:p.data.recovery||null,pain:!!p.data.pain,pain_level:p.data.pain_level||0,note:p.data.note||"Via assistant"}))}else if(p.type==="goal"){await q(db.from("athlete_goals").insert({athlete_id:isCoach()?(selectedAthleteId||D.roster[0]&&D.roster[0].id):own(),created_by:own(),title:p.data.title,category:p.data.category||"performance",target_date:p.data.target_date||null,notes:p.data.notes||"Via assistant"}))}A.pending=null;await fetchData();assistantSay("assistant","C’est enregistré. Je pourrai tenir compte de cette information dans les prochaines analyses.");render()}catch(e){A.pending=null;assistantSay("assistant","L’action n’a pas abouti : "+e.message);render()}}
function programAthleteAnalysis(sessions, athlete, discipline) {
 var engine=window.AthlysLocalIntelligence, athleteId=athlete&&athlete.id;
 var history=(D.logs||[]).filter(function(x){return x.athlete_id===athleteId;});
 var eligiblePrograms=(D.programs||[]).filter(function(p){return !p.athlete_id||p.athlete_id===athleteId;});
 var eligibleIds=eligiblePrograms.map(function(p){return p.id;});
 var eligibleSessions=(D.sessions||[]).filter(function(x){return eligibleIds.indexOf(x.program_id)>=0;});
 var projections=sessions.map(function(x){return engine.projectRPE({plannedRpe:x.planned_rpe!==undefined?x.planned_rpe:x.intensity,durationMinutes:x.duration_minutes,sport:discipline||x.discipline||"",sessionType:"training",history:history,programSessions:eligibleSessions});});
 var scenarios=engine.generateScenarios({sessions:sessions,athlete:{sport:discipline||"",history:history},programSessions:eligibleSessions});
 return {athlete:athlete,historyCount:history.length,projections:projections,scenarios:scenarios};
}
function programScenarioMarkup(analysis) {
 var name=analysis.athlete&&analysis.athlete.full_name||"Athlète";
 var rows=analysis.projections.map(function(p,i){
  var interval=p.projectedLoadIntervalAU&&p.projectedLoadIntervalAU.length?p.projectedLoadIntervalAU.join("–"):"—";
  return '<div class="list-row"><div><b>Séance '+(i+1)+'</b><small>RPE prévu par le coach : '+(p.plannedRpe==null?"non précisé":p.plannedRpe)+'</small><small>Base : '+p.sampleCount+' séance(s) appariée(s) · '+(p.confidence==="limited"?"historique exploitable mais non validé":p.confidence==="exploratory"?"exploratoire":"insuffisant")+'</small></div><div class="text-right"><b>'+(p.projectedRpe==null?"—":p.projectedRpe+"/10")+'</b><small>'+(p.projectedLoadAU==null?"Charge non calculable":p.projectedLoadAU+" UA projetées · plage indicative "+interval)+'</small></div></div>';
 }).join("");
 var scenarios=analysis.scenarios.map(function(x){
  var changes=x.changes.map(function(row){return '<li><b>'+esc(row.title)+':</b> '+row.changes.map(function(c){return esc(c.field.replace(/_/g," "))+' '+esc(c.before)+' → '+esc(c.after)}).join(" ; ")+'</li>';}).join("");
  var candidateSessions=x.sessions.map(function(session,index){
   var blocks=(session.blocks||[]).map(function(block){return block.text||block.type;}).filter(Boolean).join(" · ");
   return '<div class="list-row"><div><b>'+(session.sequence_number||index+1)+'. '+esc(session.title||("Séance "+(index+1)))+'</b><small>'+(session.duration_minutes==null?"Durée non déterminée":esc(session.duration_minutes)+" min")+' · '+((session.planned_rpe==null&&session.intensity==null)?"RPE non précisé":"RPE "+esc(session.planned_rpe==null?session.intensity:session.planned_rpe)+"/10")+'</small><small>'+esc(blocks||"Contenu source conservé")+'</small></div></div>';
  }).join("");
  var delta=x.projectedLoadDeltaAU==null?"non calculable":(x.projectedLoadDeltaAU>0?"+":"")+x.projectedLoadDeltaAU+" UA";
  var blockers=x.blockers&&x.blockers.length?'<p class="muted">'+x.blockers.map(esc).join(" ")+'</p>':"";
  var warnings=x.warnings&&x.warnings.length?'<p class="muted">'+x.warnings.map(esc).join(" ")+'</p>':"";
  return '<article class="athlys-local-scenario"><div class="list-row"><b>'+esc(x.label)+'</b><span class="badge">'+(x.status==="blocked"?"Bloqué":"Proposition")+'</span></div><small>Charge projetée : '+(x.projectedLoadBeforeAU==null?"—":x.projectedLoadBeforeAU+" UA")+' → '+(x.projectedLoadAfterAU==null?"—":x.projectedLoadAfterAU+" UA")+' · écart '+delta+'</small>'+(changes?'<h5>Modifications</h5><ul>'+changes+'</ul>':"")+'<details><summary>Voir le programme complet proposé ('+x.sessions.length+' séance(s))</summary>'+candidateSessions+'</details>'+blockers+warnings+'<p class="muted">'+esc(x.notice)+'</p></article>';
 }).join("");
 return '<section class="athlys-local-athlete"><h4>'+esc(name)+' · '+analysis.historyCount+' séance(s) historisée(s)</h4>'+rows+scenarios+'</section>';
}
function programBuildPreviewHtml(parsed,analyses){
 var sessions=parsed.sessions.map(function(x){
  var blockText=x.blocks.map(function(b){return b.text}).join(" · "),index=x.sequence_number-1;
  var dateValue=x.planned_date||"",durationValue=x.duration_minutes==null?"":x.duration_minutes,rpeValue=x.planned_rpe==null?"":x.planned_rpe;
  var edits='<div class="form-grid program-preview-edits"><label>Intitulé<input type="text" maxlength="160" data-program-edit="title" data-session-index="'+index+'" value="'+esc(x.title||"")+'"></label><label>Date prévue<input type="date" data-program-edit="planned_date" data-session-index="'+index+'" value="'+esc(dateValue)+'"></label><label>Durée (min)<input type="number" min="1" max="900" step="0.25" data-program-edit="duration_minutes" data-session-index="'+index+'" value="'+esc(durationValue)+'"></label><label>RPE prévu /10<input type="number" min="1" max="10" step="0.1" data-program-edit="planned_rpe" data-session-index="'+index+'" value="'+esc(rpeValue)+'"></label></div>';
  return '<article class="card program-preview-session"><div class="list-row"><b>'+esc(x.sequence_number)+'. '+esc(x.title)+'</b><span class="badge">'+(x.session_type==="rest"?"Repos":"Séance")+'</span></div><small>'+esc(x.discipline||"Discipline à confirmer")+' · '+(x.duration_minutes==null?"durée non déterminée":x.duration_minutes+" min")+' · '+(x.planned_rpe==null?"RPE non précisé":"RPE "+x.planned_rpe+"/10")+'</small><small>'+esc(blockText)+'</small><details><summary>Corriger les champs extraits</summary>'+edits+'</details></article>';
 }).join("");
 var ambiguity=parsed.global_ambiguities.length?'<ul>'+parsed.global_ambiguities.map(function(x){return '<li>Séance '+(x.session||"—")+' : '+esc(x.message)+'</li>';}).join("")+'</ul>':'<p class="muted">Aucune ambiguïté détectée par l’extracteur déterministe. La vérification du coach reste obligatoire.</p>';
 var athleteHtml=analyses.map(programScenarioMarkup).join("")||'<p class="muted">Aucun athlète associé : la projection individuelle sera calculée après affectation.</p>';
 return '<div class="card"><b>Aperçu extrait localement · '+parsed.sessions.length+' séance(s)</b><p class="muted">Version '+esc(parsed.parser_version)+' · moteur déterministe local. Les champs corrigés par le coach sont conservés dans l’audit. Les données absentes restent inconnues.</p>'+sessions+'<h4>Points à vérifier</h4>'+ambiguity+'<h4>RPE projeté et scénarios individuels</h4><div id="program-preview-scenarios">'+athleteHtml+'</div><p class="muted">UA session-RPE = RPE × durée. Une projection RPE personnalisée exige des séances comparables prévues/réalisées et reste subjective.</p></div>';
}
async function parseProgramDraft(button) {
 var form=button&&button.closest("form");
 if(!form)return;
 var sourceInput=form.elements.namedItem("source_text"),preview=form.querySelector("#program-parse-preview");
 var source=String(sourceInput&&sourceInput.value||""),discipline=String(form.elements.namedItem("discipline")&&form.elements.namedItem("discipline").value||"");
 if(!preview)return;
 if(source.trim().length<10){preview.innerHTML='<p class="error">Ajoute au moins 10 caractères de programme.</p>';return;}
 button.disabled=true;
 try{
  var engine=window.AthlysLocalIntelligence;
  if(!engine)throw new Error("Le moteur local Athlys n’est pas chargé.");
  var parsed=await engine.parseProgramLocally(source,{discipline:discipline});
  if(!parsed.sessions.length)throw new Error("Aucune séance n’a pu être extraite.");
  var athleteSelect=form.elements.namedItem("athlete_id"),athleteId=athleteSelect&&athleteSelect.value||"";
  var athletes=athleteId?D.roster.filter(function(x){return x.id===athleteId;}):D.roster.slice();
  var sourceDigestSha256=await engine.sha256Text(source);
  var analyses=athletes.map(function(athlete){return programAthleteAnalysis(parsed.sessions,athlete,discipline);});
  A.programDraft={sourceHash:engine.hashText(source),sourceDigestSha256:sourceDigestSha256,sourceText:source,discipline:discipline,parsed:parsed,analyses:analyses,coachEdits:{}};
  preview.innerHTML=programBuildPreviewHtml(parsed,analyses);
 }catch(error){A.programDraft=null;preview.innerHTML='<p class="error">'+esc(error.message||"Analyse locale impossible.")+'</p>';}
 finally{button.disabled=false;}
}
function programShowScenarios(programId) {
 var panel=$("#program-rpe-panel"),program=by(D.programs,programId);
 if(!panel||!program)return;
 var sessions=D.sessions.filter(function(x){return x.program_id===programId;}).map(function(x){
  var content=x.content||{};
  return Object.assign({},content,{id:x.id,sequence_number:x.sequence_number,title:x.title,discipline:x.discipline,duration_minutes:x.duration_minutes,intensity:x.intensity,planned_rpe:content.planned_rpe==null?x.intensity:content.planned_rpe,blocks:Array.isArray(content.blocks)?content.blocks:[]});
 });
 var athletes=program.athlete_id?D.roster.filter(function(x){return x.id===program.athlete_id;}):D.roster.slice();
 var html=athletes.map(function(a){return programScenarioMarkup(programAthleteAnalysis(sessions,a,program.discipline));}).join("");
 panel.innerHTML=sessions.length?html||'<p class="muted">Aucun athlète rattaché à ce coach.</p>':'<p class="muted">Ajoute et structure au moins une séance pour calculer les scénarios.</p>';
}
function modalView(){
 if(!modal)return "";
 var k=modal.kind,id=modal.id,b="",title="",rec=null;
 if(k==="event"){rec=by(D.events,id)||{};title=id?"Modifier la séance":"Planifier une séance";b=field("Nom","title","text",rec.title||"")+field("Date et heure","starts_at","datetime-local",rec.starts_at?new Date(new Date(rec.starts_at).getTime()-new Date(rec.starts_at).getTimezoneOffset()*60000).toISOString().slice(0,16):localDT())+field("Discipline","discipline","text",rec.discipline||"")+sel("Type","session_type",[["Entraînement","Entraînement"],["Compétition","Compétition"],["Récupération","Récupération"],["Test","Test"]],rec.session_type||"Entraînement")+(isCoach()?sel("Affectation","athlete_id",[["","Groupe"]].concat(D.roster.map(function(x){return [x.id,x.full_name]})),rec.athlete_id||selectedAthleteId||""):"")+'<div class="form-grid">'+field("Volume","planned_volume","number",rec.planned_volume||"",0,null,.1)+field("Unité","volume_unit","text",rec.volume_unit||"km")+field("Intensité /10","planned_intensity","number",rec.planned_intensity||"",1,10,1)+'</div>'+area("Consignes","notes",rec.notes,3)}
 if(k==="checkin"){
  title="Ressenti du jour";
  var current=latestCheck(own());
  b=sel("Type de journée","day_type",[["training","Entraînement"],["rest","Repos"],["competition","Compétition"]],"training")+
  feelingScale("Forme","feeling",current&&current.feeling||3)+
  feelingScale("Stress","stress",current&&current.stress||3,"stress")+
  feelingScale("Récupération","recovery",current&&current.recovery||3)+
  feelingScale("Bien-être","mental_wellbeing",current&&current.mental_wellbeing||3)+
  feelingScale("Énergie","energy",current&&current.energy||3)+
  '<div class="form-grid">'+field("Douleur /10","pain_level","number",current&&current.pain_level||0,0,10,1)+field("Zone douloureuse","pain_area","text",current&&current.pain_area||"")+'</div>'+
  field("Sommeil (h) facultatif","sleep_hours","number",current&&current.sleep_hours||"",0,24,.25)+area("Commentaire","note",current&&current.note||"",2)
 }
 if(k==="log"){var logAthleteId=isCoach()?(selectedAthleteId||D.roster[0]&&D.roster[0].id):own(),logPrograms=(D.programs||[]).filter(function(p){return !p.athlete_id||p.athlete_id===logAthleteId;}),logProgramIds=logPrograms.map(function(p){return p.id;}),logSessionOptions=(D.sessions||[]).filter(function(x){return logProgramIds.indexOf(x.program_id)>=0;}).map(function(x){var parent=logPrograms.find(function(p){return p.id===x.program_id;});return [x.id,(parent?parent.title+" · ":"")+x.sequence_number+". "+x.title+" · "+(x.intensity==null?"RPE non fixé":"RPE "+x.intensity)];});title="Séance réalisée";b=field("Titre","title","text","Séance")+field("Date","session_date","date",today())+field("Discipline","discipline","text",D.details&&D.details.sport||"")+(isCoach()?sel("Athlète","athlete_id",D.roster.map(function(x){return [x.id,x.full_name]}),selectedAthleteId||D.roster[0]&&D.roster[0].id):"")+sel("Séance planifiée associée (facultatif, utile à la calibration RPE)","program_session_id",[["","Aucune séance associée"]].concat(logSessionOptions),"")+sel("Type","session_type",[["training","Entraînement"],["competition","Compétition"],["recovery","Récupération"],["test","Test"]],"training")+'<div class="form-grid">'+field("Durée (min)","duration_minutes","number","",1,900,.1)+field("RPE /10","rpe","number","",1,10,.1)+field("Volume","volume","number","",0,null,.1)+field("Unité","volume_unit","text","km")+field("Distance km","distance_km","number","",0,null,.01)+field("FC moyenne","average_heart_rate","number","",20,250,1)+field("Chrono sprint (s)","sprint_time_seconds","number","",.01,null,.001)+field("Sauts","jump_count","number","",0,null,1)+field("Intensité sauts","jump_intensity","number","",1,10,1)+field("Contact au sol (ms)","ground_contact_ms","number","",.1,null,.1)+field("Foulées perche","pole_approach_steps","number","",1,40,1)+field("Perche utilisée","pole_used")+field("Levier perche","pole_lever","number","",.1,null,.01)+field("Marque intermédiaire","pole_intermediate_mark_cm","number","",.1,null,.1)+'</div>'+area("Observations","notes","",3)}
 if(k==="program"){title="Nouveau programme";b=field("Nom","title")+field("Discipline","discipline","text",D.coachDetails&&D.coachDetails.disciplines&&D.coachDetails.disciplines[0]||"")+(isCoach()?sel("Affectation","athlete_id",[["","Groupe"]].concat(D.roster.map(function(x){return [x.id,x.full_name]})),""):"")+field("Début","start_date","date",today())+field("Fin","end_date","date","")+area("Objectif","goal","",2)+area("Consignes","notes","",3)+area("Texte intégral du programme à structurer localement (facultatif)","source_text","",8)+'<p class="muted">Le texte est interprété sur cet appareil. Vérifie l’aperçu avant tout enregistrement.</p><button type="button" class="btn secondary" data-action="program-parse">Analyser le programme</button><div id="program-parse-preview"></div>'}
 if(k==="program-session"){title="Séance de programme";b='<input type="hidden" name="program_id" value="'+esc(id)+'">'+field("Ordre","sequence_number","number",1,1,1000,1)+field("Titre","title")+field("Discipline","discipline")+field("Date prévue","planned_date","date","")+field("Durée","duration_minutes","number","",1,900,1)+field("Intensité","intensity","number","",1,10,1)+area("Contenu","content","",4)}
 if(k==="goal"){title="Nouvel objectif";b=field("Titre","title")+sel("Catégorie","category",[["performance","Performance"],["consistency","Régularité"],["health","Forme"],["technique","Technique"],["competition","Compétition"],["other","Autre"]],"performance")+(isCoach()?sel("Athlète","athlete_id",D.roster.map(function(x){return [x.id,x.full_name]}),selectedAthleteId||D.roster[0]&&D.roster[0].id):"")+field("Indicateur","metric_key")+'<div class="form-grid">'+field("Valeur actuelle","current_value","number","",null,null,.01)+field("Cible","target_value","number","",null,null,.01)+field("Unité","unit")+field("Échéance","target_date","date","")+'</div>'+area("Notes","notes","",2)}
 if(k==="record"){title="Record personnel";b=field("Discipline","discipline","text",D.details&&D.details.sport||"")+(isCoach()?sel("Athlète","athlete_id",D.roster.map(function(x){return [x.id,x.full_name]}),selectedAthleteId||D.roster[0]&&D.roster[0].id):"")+field("Épreuve","metric")+field("Résultat","result_value","number","",null,null,.001)+field("Unité","unit","text","s")+field("Date","achieved_on","date",today())+field("Compétition","competition_name")+'<label><input type="checkbox" name="is_personal_best" checked> Record personnel</label>'+area("Notes","notes","",2)}
 if(k==="result"){title="Résultat de compétition";b=field("Compétition","competition_name")+(isCoach()?sel("Athlète","athlete_id",D.roster.map(function(x){return [x.id,x.full_name]}),selectedAthleteId||D.roster[0]&&D.roster[0].id):"")+field("Discipline","discipline")+field("Résultat","result_value","number","",null,null,.001)+field("Unité","unit","text","s")+field("Classement","placement","number","",1,null,1)+field("Catégorie","category")+field("Date","result_date","date",today())+'<label><input type="checkbox" name="personal_best"> Record personnel</label>'}
 if(k==="measure"){title="Mesure facultative";b=sel("Indicateur","metric_key",[["weight_kg","Poids"],["resting_hr","FC repos"],["max_hr","FC max"],["hrv_ms","HRV"],["vma_kmh","VMA"],["ftp_watts","FTP"],["vo2max","VO₂ max"],["sleep_hours","Sommeil"]],"weight_kg")+field("Valeur","value","number","",0,null,.01)+field("Unité","unit","text","kg")+field("Date","measured_at","datetime-local",localDT())+'<label><input type="checkbox" name="share_with_coach"> Partager au coach</label>'+area("Notes","notes","",2)}
 if(k==="exercise"){title="Exercice";b=field("Nom","title")+field("Catégorie","category","text","force")+field("Discipline","discipline")+field("Difficulté /5","difficulty","number",2,1,5,1)+field("Durée min","duration_minutes","number","",1,600,1)+field("Matériel","equipment")+field("Groupes musculaires","muscle_groups")+area("Consignes","instructions","",4)+field("Lien vidéo","video_url","url","")}
 if(k==="equipment"){title="Matériel";b=field("Nom","label")+field("Catégorie","category","text","Chaussures")+field("Marque","brand")+field("Modèle","model")+field("Usage actuel","usage_value","number",0,0,null,.1)+field("Unité","usage_unit","text","km")+field("Seuil","replacement_threshold","number","",0,null,.1)+field("Date d’achat","acquired_on","date","")+area("Notes","notes","",2)}
 if(k==="team"){var tm=by(D.teams,id)||{};title="Groupe";b=field("Nom","name","text",tm.name||"")+field("Discipline","discipline","text",tm.discipline||"")+field("Catégorie","category","text",tm.category||"")+area("Notes","notes",tm.notes,2)+D.roster.map(function(x){return '<label><input type="checkbox" name="members" value="'+x.id+'" '+(D.members.some(function(m){return m.team_id===id&&m.athlete_id===x.id})?"checked":"")+'>'+esc(x.full_name)+'</label>'}).join("")}
 if(k==="note"){title="Note coach";b=sel("Athlète","athlete_id",D.roster.map(function(x){return [x.id,x.full_name]}),selectedAthleteId||D.roster[0]&&D.roster[0].id)+sel("Catégorie","category",[["technique","Technique"],["performance","Performance"],["general","Général"]],"technique")+area("Note","body","",4)}
 if(k==="questionnaire"){title="Questionnaire";b=field("Titre","title")+area("Description","description","",2)+sel("Affectation","athlete_id",[["","Groupe"]].concat(D.roster.map(function(x){return [x.id,x.full_name]})),"")+area("Questions · une par ligne","questions","Comment te sens-tu ?\nQuel est ton objectif cette semaine ?",4)+field("Échéance","due_at","datetime-local","")}
 if(k==="answer"){var qq=by(D.questionnaires,id);title=qq&&qq.title||"Réponse";b='<input type="hidden" name="questionnaire_id" value="'+esc(id)+'">'+(qq&&qq.questions||[]).map(function(x,i){return area(x.label,"answer_"+i,"",2)}).join("")}
 if(k==="video"){title="Partager une vidéo";b=field("Titre","title")+field("Notes techniques","technical_notes")+'<label>Fichier vidéo<input name="video" type="file" accept="video/*" capture="environment" required></label>'}
 if(k==="program-info"){var pp=by(D.programs,id);title=pp&&pp.title||"Programme";b='<p>'+esc(pp&&pp.goal||pp&&pp.notes||"")+'</p>'+D.sessions.filter(function(x){return x.program_id===id}).map(function(x){return '<div class="list-row"><div><b>'+x.sequence_number+'. '+esc(x.title)+'</b><small>'+dateFR(x.planned_date)+' · '+esc(x.discipline)+' · '+(x.duration_minutes==null?"Durée à préciser":esc(x.duration_minutes)+" min")+'</small><p>'+esc(x.content&&x.content.instructions||"")+'</p></div></div>'}).join("")+(isCoach()?btn("Comparer les 3 scénarios RPE","program-rpe-scenarios","secondary",id)+btn("＋ Ajouter une séance","program-session-new","secondary",id)+'<div id="program-rpe-panel"></div>':"")}
 if(!b)return "";
 if(k==="program-info")return '<div class="modal-backdrop" data-action="modal-close"><section class="modal" data-modal><header><h2>'+title+'</h2><button class="close" data-action="modal-close">×</button></header><div class="modal-body">'+b+'</div></section></div>';
 return '<div class="modal-backdrop" data-action="modal-close"><section class="modal" data-modal><header><div><small>ATHLYS</small><h2>'+title+'</h2></div><button class="close" data-action="modal-close">×</button></header><form data-form="'+k+'"><div class="modal-body">'+b+'</div><footer><button type="button" class="btn" data-action="modal-close">Annuler</button><button class="btn primary">Enregistrer</button></footer></form></section></div>';
}
function open(k,id){modal={kind:k,id:id||null};if(k==="program")A.programDraft=null;render()}

function isMobileEntry(){return !!(document.documentElement&&document.documentElement.getAttribute("data-athlys-mobile")==="true")}
function authLoaderUpdate(progress,label){var el=document.getElementById("athlys-auth-loader");if(!el)return;var value=Math.max(0,Math.min(100,Number(progress)||0));var frame=el.querySelector(".athlys-auth-loader__frame"),ring=el.querySelector("[data-loader-ring]"),caption=el.querySelector("[data-loader-label]");if(frame)frame.setAttribute("aria-valuenow",String(Math.round(value)));if(ring)ring.style.strokeDashoffset=String(100-value);if(caption&&label)caption.textContent=label}
function authLoaderShow(label,progress){var el=document.getElementById("athlys-auth-loader");if(!el)return;el.classList.add("is-visible");el.setAttribute("aria-hidden","false");authLoaderUpdate(progress==null?8:progress,label||"Préparation de votre espace");try{var splash=window.athlysSplashScreen;if(splash&&typeof splash.hide==="function")splash.hide({fadeOutDuration:180})}catch(e){console.warn("Athlys native splash:",e)}}
function authLoaderHide(){var el=document.getElementById("athlys-auth-loader");if(el){el.classList.remove("is-visible");el.setAttribute("aria-hidden","true")}}
function authBrandMarkup(){return '<section class="auth-brand" aria-labelledby="auth-brand-title"><img class="auth-brand__lockup" src="/assets/athlys-lockup.svg" alt="Athlys" width="760" height="160" fetchpriority="high" decoding="async"><div class="auth-brand__eyebrow"><span></span> SPORT · COACHING · PERFORMANCE</div><h1 id="auth-brand-title">La progression se construit <em>ensemble.</em></h1><p class="auth-brand__copy">Un espace clair pour planifier, suivre la charge et accompagner chaque progression.</p><div class="auth-brand__pillars" aria-label="Les quatre piliers Athlys"><span><i class="is-orange"></i>Planifier</span><span><i class="is-cyan"></i>Suivre</span><span><i class="is-green"></i>Ressentir</span><span><i class="is-white"></i>Échanger</span></div><div class="auth-brand__principle"><span>LA PHILOSOPHIE ATHLYS</span><strong>L’entraîneur décide, l’IA explique.</strong></div></section>'}
function authPasswordField(id,name,autocomplete,label){return '<label for="'+id+'">'+label+'<span class="auth-password"><input id="'+id+'" name="'+name+'" type="password" autocomplete="'+autocomplete+'" minlength="8" required><button type="button" class="auth-password-toggle" data-action="password-toggle" aria-label="Afficher le mot de passe" aria-pressed="false">Afficher</button></span></label>'}
function authPageMobile(err){var signup=view==="signup",forgot=view==="forgot";var title=forgot?"Réinitialiser le mot de passe":signup?"Bienvenue dans Athlys":"Ravi de te revoir";var intro=forgot?"Un lien sécurisé sera envoyé par e-mail.":signup?"Crée ton espace athlète ou coach.":"Connecte-toi pour retrouver ton entraînement.";var formType=forgot?"forgot":signup?"signup":"login";var tabs='<div class="auth-tabs" role="group" aria-label="Type d’accès"><button type="button" data-action="login-tab" class="'+(!signup?"active":"")+'" aria-pressed="'+(!signup)+'">Connexion</button><button type="button" data-action="signup-tab" class="'+(signup?"active":"")+'" aria-pressed="'+(signup)+'">Créer un compte</button></div>';var profileFields=signup?'<div class="form-grid">'+field("Prénom","first_name")+field("Nom","last_name")+'</div>'+sel("Profil","role",[["athlete","Athlète"],["coach","Entraîneur"]],"athlete"):"";var password=forgot?"":authPasswordField("auth-password","password",signup?"new-password":"current-password","Mot de passe");var submit=forgot?"Envoyer le lien":signup?"Créer mon compte":"Se connecter";root.innerHTML='<main class="auth-layout" aria-label="Accès à Athlys">'+authBrandMarkup()+'<section class="auth-card" aria-labelledby="auth-form-title"><div class="auth-card__top"><span class="auth-card__eyebrow">VOTRE ESPACE ATHLYS</span>'+tabs+'</div><h2 id="auth-form-title">'+title+'</h2><p class="auth-card__intro">'+intro+'</p>'+(err?'<div class="error" role="alert">'+esc(err)+'</div>':"")+'<form data-form="'+formType+'" aria-label="'+(forgot?"Réinitialisation du mot de passe":signup?"Création de compte":"Connexion")+'">'+profileFields+'<label for="auth-email">Adresse e-mail<input id="auth-email" type="email" name="email" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" required></label>'+password+'<button type="submit" class="btn primary full">'+submit+'</button></form><button type="button" class="text-action centered" data-action="'+(forgot?"login-tab":"forgot-tab")+'">'+(forgot?"Retour à la connexion":"Mot de passe oublié ?")+'</button><div class="auth-card__foot"><span class="auth-card__security" aria-hidden="true">✓</span><small>Connexion sécurisée · Tes données restent protégées selon ton rôle et tes autorisations.</small></div></section></main>'}
function resetPageMobile(){root.innerHTML='<main class="auth-layout" aria-label="Réinitialisation du mot de passe">'+authBrandMarkup()+'<section class="auth-card" aria-labelledby="auth-reset-title"><div class="auth-card__top"><span class="auth-card__eyebrow">VOTRE ESPACE ATHLYS</span></div><h2 id="auth-reset-title">Nouveau mot de passe</h2><p class="auth-card__intro">Choisis un mot de passe sécurisé pour retrouver ton espace Athlys.</p><form data-form="reset" aria-label="Nouveau mot de passe">'+authPasswordField("auth-new-password","password","new-password","Nouveau mot de passe")+'<button type="submit" class="btn primary full">Enregistrer</button></form><div class="auth-card__foot"><span class="auth-card__security" aria-hidden="true">✓</span><small>Connexion sécurisée · Tes données restent protégées selon ton rôle et tes autorisations.</small></div></section></main>'}
function authPageLegacy(err){var signup=view==="signup",forgot=view==="forgot";root.innerHTML='<div class="auth-layout"><section class="auth-brand"><img src="assets/athlys-logo.svg"><small>SPORT · COACHING · PERFORMANCE</small><h1>La progression<br>se construit ensemble.</h1><p>Un espace clair pour entraîner, mesurer et progresser.</p></section><section class="auth-card"><div class="auth-tabs"><button data-action="login-tab" class="'+(!signup&&!forgot?"active":"")+'">Connexion</button><button data-action="signup-tab" class="'+(signup?"active":"")+'">Créer un compte</button></div><h2>'+(forgot?"Réinitialiser le mot de passe":signup?"Bienvenue dans Athlys":"Ravi de te revoir")+'</h2><p>'+(forgot?"Un lien sécurisé sera envoyé par e-mail.":signup?"Crée ton espace athlète ou coach.":"Connecte-toi pour retrouver ton entraînement.")+'</p>'+(err?'<div class="error">'+esc(err)+'</div>':"")+'<form data-form="'+(forgot?"forgot":signup?"signup":"login")+'">'+(signup?'<div class="form-grid">'+field("Prénom","first_name")+field("Nom","last_name")+'</div>'+sel("Profil","role",[["athlete","Athlète"],["coach","Entraîneur"]],"athlete"):"")+'<label>E-mail<input type="email" name="email" required></label>'+(forgot?"":'<label>Mot de passe<input type="password" name="password" minlength="8" required></label>')+'<button class="btn primary full">'+(forgot?"Envoyer le lien":signup?"Créer mon compte":"Se connecter")+'</button></form><button class="text-action centered" data-action="'+(forgot?"login-tab":"forgot-tab")+'">'+(forgot?"Retour à la connexion":"Mot de passe oublié ?")+'</button><small>Les données sont protégées selon ton rôle et tes autorisations.</small></section></div>'}
function resetPageLegacy(){root.innerHTML='<div class="auth-layout"><section class="auth-card"><h2>Nouveau mot de passe</h2><form data-form="reset"><label>Nouveau mot de passe<input name="password" type="password" minlength="8" required></label><button class="btn primary full">Enregistrer</button></form></section></div>'}
function authPage(err){if(isMobileEntry())return authPageMobile(err);return authPageLegacy(err)}
function resetPage(){if(isMobileEntry())return resetPageMobile();return resetPageLegacy()}

function theme(){var el=document.documentElement;el.dataset.theme=P.theme==="dark"?"dark":"light";el.dataset.sophistication=String(Math.max(1,Math.min(3,Number(P.sophistication)||2)));el.dataset.fontSize=String(Math.max(1,Math.min(3,Number(P.fontSize)||2)));el.dataset.density=String(Math.max(1,Math.min(3,Number(P.level)||2)));document.body.dataset.app=isCoach()?"coach":"athlete";}
function render(){
 if(!root)return;
 if(isMobileEntry()&&view==="quantum")view="home";
 if(!session||!profile){document.body.classList.remove("athlys-chat-open");authPage();return}
 var n=D.notifications.filter(function(x){return !x.read_at}).length;
 var tabs=isCoach()?[["home","Accueil","⌂"],["team","Équipe","◉"],["schedule","Agenda","▦"],["quantum","Quantum","✧"],["messages","Chat","✉"],["more","Plus","•••"]]:[["home","Accueil","⌂"],["schedule","Agenda","▦"],["training","Séances","◉"],["messages","Chat","✉"],["more","Plus","•••"]];
 if(isMobileEntry())tabs=tabs.filter(function(x){return x[0]!=="quantum"});
 theme();
 document.body.classList.toggle("athlys-chat-open",isMobileEntry()&&view==="messages");
 var roleSwitch='<div class="mobile-role-switch" role="group" aria-label="Changer d’espace"><button type="button" '+(isCoach()?'class="active" disabled':'data-action="switch-role" data-role="coach"')+'>Coach</button><button type="button" '+(!isCoach()?'class="active" disabled':'data-action="switch-role" data-role="athlete"')+'>Athlète</button></div>';
 root.innerHTML=(navigator.onLine&&!offlineFetchHadErrors?"":'<aside role="status" style="position:fixed;z-index:120;top:10px;left:12px;right:12px;padding:10px 14px;border-radius:12px;background:#7a431d;color:#fff;font:600 13px system-ui;box-shadow:0 8px 24px #0004">Mode hors ligne · consultation locale et saisies mises en attente sur cet appareil.</aside>')+'<header class="topbar"><div class="brand"><img src="assets/athlys-lockup.svg" alt="Athlys"></div><div class="desktop-search"><span>⌕</span><input id="desktop-search" type="search" list="desktop-search-options" placeholder="Rechercher un module ou un athlète" autocomplete="off" aria-label="Recherche Athlys"><datalist id="desktop-search-options">'+desktopNavItems().map(function(x){return '<option value="'+esc(x.label)+'"></option>'}).join("")+'</datalist><kbd>⌘ K</kbd></div><div class="head-actions"><button class="btn primary desktop-create" data-action="'+(isCoach()?'event-new':'log-new')+'">'+(isCoach()?'+ Planifier':'+ Séance')+'</button>'+roleSwitch+'<button class="mobile-quick-icon" data-action="assistant-toggle" aria-label="Assistant">✦</button><button class="icon-btn" data-nav="notifications" aria-label="Notifications">♧<i '+(n?"":"hidden")+'>'+n+'</i></button><button class="profile-btn" data-nav="profile">'+avatar(profile.full_name)+'<span>'+esc(profile.first_name||profile.full_name)+'</span></button></div></header><div class="layout">'+nav()+'<main class="main">'+(notice?'<div id="toast" class="toast">'+esc(notice)+'</div>':"")+page()+'</main></div><nav class="mobile-nav">'+tabs.map(function(x){return '<button data-nav="'+x[0]+'" class="'+(view===x[0]?"active":"")+'"><span>'+x[2]+'</span><small>'+x[1]+'</small></button>'}).join("")+'</nav>'+assistantView()+modalView();
 loadNotifs();
}
function enableReminders(){
 var nativePlatform=window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform();
 var plugin=window.athlysLocalNotifications||(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.LocalNotifications);
 if(nativePlatform&&plugin){
  plugin.requestPermissions().then(function(p){
   if(p.display!=="granted")return;
   var notifications=[],last=D.checkins[0]&&new Date(D.checkins[0].created_at).getTime()||Date.now();
   notifications.push({id:88712,title:"Athlys · Ton suivi",body:"Un point rapide avec ton coach suffit.",schedule:{at:new Date(Math.max(Date.now()+60000,last+72*3600000))}});
   D.events.filter(function(e){var t=new Date(e.starts_at).getTime()-30*60000;return t>Date.now()&&t<Date.now()+14*86400000}).slice(0,20).forEach(function(e,i){notifications.push({id:88800+i,title:"Athlys · Rappel agenda",body:String(e.title||"Séance prévue")+" · dans 30 minutes",schedule:{at:new Date(new Date(e.starts_at).getTime()-30*60000)}})});
   var ids=notifications.map(function(x){return {id:x.id}});
   plugin.cancel({notifications:ids}).then(function(){return plugin.schedule({notifications:notifications})}).catch(console.warn);
  }).catch(console.warn);
 }else if(!nativePlatform&&"Notification"in window&&Notification.permission==="default"){
  /* Permission is requested only after an explicit user action in the notification settings. */
 }
}
function exportCSV(){var rows=D.logs.filter(function(x){return !isCoach()||!selectedAthleteId||x.athlete_id===selectedAthleteId}),cols=["session_date","title","discipline","session_type","duration_minutes","rpe","volume","volume_unit","distance_km","sprint_time_seconds","jump_count","notes"],csv=[cols.join(";")].concat(rows.map(function(x){return cols.map(function(c){return '"'+String(x[c]==null?"":x[c]).replace(/"/g,'""')+'"'}).join(";")})).join("\n"),blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="athlys-"+today()+".csv";a.click();URL.revokeObjectURL(url)}

async function onSubmit(e){
 var form=e.target;
 if(!form||!form.dataset||!form.dataset.form)return;
 e.preventDefault();
 if(busy)return;
 busy=true;
 var fd=new FormData(form),kind=form.dataset.form,offlineQueued=false;
 var loaderActive=kind==="login"||kind==="signup";if(loaderActive)authLoaderShow("Connexion sécurisée",12);
 function v(k){var x=fd.get(k);return x==null?"":String(x).trim()}
 function n(k){return v(k)===""?null:Number(v(k))}
 function yes(k){return fd.has(k)}
 function arr(k,sep){return v(k).split(sep||",").map(function(x){return x.trim()}).filter(Boolean)}
 async function done(message){busy=false;modal=null;try{await fetchData()}catch(x){console.warn(x)}render();if(message)toast(message)}
 if(kind==="program"&&String(fd.get("source_text")||"").trim()&&(!A.programDraft||A.programDraft.sourceHash!==window.AthlysLocalIntelligence.hashText(String(fd.get("source_text")||""))||!/^[a-f0-9]{64}$/.test(A.programDraft.sourceDigestSha256||""))){busy=false;await parseProgramDraft(form.querySelector('[data-action="program-parse"]'));return;}
 try{
  if(kind==="login"){
   var lr=await db.auth.signInWithPassword({email:v("email"),password:v("password")});
   if(lr.error)throw lr.error;
   authLoaderUpdate(40,"Identifiants vérifiés");session=lr.data.session;await loadProfile();authLoaderUpdate(62,"Profil chargé");prefsLoad();await fetchData();authLoaderUpdate(92,"Données synchronisées");subscribeMessages();render();authLoaderUpdate(100,"Espace prêt");toast("Connexion réussie.");
  }else if(kind==="signup"){
   var sr=await db.auth.signUp({email:v("email"),password:v("password"),options:{data:{first_name:v("first_name"),last_name:v("last_name"),full_name:(v("first_name")+" "+v("last_name")).trim(),role:v("role")||"athlete"}}});
   if(sr.error)throw sr.error;
   if(sr.data.session){session=sr.data.session;authLoaderUpdate(40,"Compte sécurisé");await loadProfile();authLoaderUpdate(62,"Profil chargé");prefsLoad();await fetchData();authLoaderUpdate(92,"Données synchronisées");subscribeMessages();render();authLoaderUpdate(100,"Espace prêt");toast("Compte créé.");}
   else{view="login";authPage("Compte créé. Vérifie ta boîte mail pour confirmer ton adresse.");}
  }else if(kind==="forgot"){
   var browserRedirect=window.location.origin+window.location.pathname;var nativePlatform=window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform();var fr=await db.auth.resetPasswordForEmail(v("email"),{redirectTo:nativePlatform?"com.athlys.app://auth/callback":browserRedirect});
   if(fr.error)throw fr.error;
   view="login";authPage("Si cette adresse correspond à un compte, un lien de réinitialisation a été envoyé.");
  }else if(kind==="reset"){
   var rr=await db.auth.updateUser({password:v("password")});
   if(rr.error)throw rr.error;
   view="login";await db.auth.signOut();session=null;profile=null;authPage("Mot de passe mis à jour. Tu peux te connecter.");
  }else if(kind==="team-message"){var groupId=activeChatTeamId,group=by(D.teams,groupId),groupText=v("content");if(!group||!groupText)throw new Error("Sélectionne une équipe et écris un message.");await q(db.from("coach_team_messages").insert({coach_id:group.coach_id,team_id:groupId,sender_id:own(),content:groupText}));await loadTeamMessages(groupId);render();
  }else if(kind==="message"){
   var cid=coachId(),aid=isCoach()?selectedMessageAthlete:own(),messageText=v("content");
   if(!cid||!aid)throw new Error("Aucune conversation disponible.");
   var saved=await q(db.from("coach_messages").insert({coach_id:cid,athlete_id:aid,sender_id:own(),content:messageText}).select("*").single());
   if(chatRtcData&&chatRtcData.readyState==="open"&&saved){
    try{chatRtcData.send(JSON.stringify({type:"chat",message:saved}))}catch(sendError){console.warn("Athlys RTC send fallback:",sendError.message)}
   }
   await loadMessages();render();
  }else if(kind==="assistant"){
   var prompt=v("prompt");if(!prompt)throw new Error("Écris une demande.");
   assistantSay("user",prompt);A.open=true;await assistantHandle(prompt);
  }else if(kind==="join-coach"){
   var jr=await db.rpc("join_coach_by_code",{input_code:v("code")});if(jr.error)throw jr.error;
   await loadProfile();await fetchData();subscribeMessages();render();toast("Entraîneur relié à ton compte.");
  }else if(kind==="cycle-settings"){localStorage.setItem("athlys-cycle-sex-"+own(),v("cycle_sex")||"unspecified");await done("Préférence enregistrée sur cet appareil.");return;}else if(kind==="cycle-log"){var cycleKey="athlys-cycle-log-"+own(),cycleRows=[];try{cycleRows=JSON.parse(localStorage.getItem(cycleKey)||"[]")}catch(x){}cycleRows=Array.isArray(cycleRows)?cycleRows:[];if(!v("start"))throw new Error("Choisis une date.");cycleRows.push({start:v("start"),symptoms:v("symptoms"),notes:v("notes"),created_at:new Date().toISOString()});localStorage.setItem(cycleKey,JSON.stringify(cycleRows.slice(-36)));await done("Entrée enregistrée sur cet appareil.");return;}else if(kind==="prefs"){
   P.theme=v("theme")||"light";P.level=Number(v("level")||2);P.sophistication=Number(v("sophistication")||2);P.fontSize=Number(v("fontSize")||2);P.reminders=yes("reminders");var oldTransport=chatTransportMode;chatTransportMode=v("chatTransportMode")||"auto";try{localStorage.setItem("athlys-chat-transport-"+own(),chatTransportMode)}catch(prefError){}prefsSave();if(oldTransport!==chatTransportMode){if(chatTransportMode==="websocket")stopChatRtc("WebSocket natif · sélection manuelle");else if(view==="messages"&&activeChatMode==="direct")activateChatTransport()}render();
   if(P.reminders)enableReminders();
  }else if(kind==="profile"){
   var first=v("first_name"),last=v("last_name");
   await q(db.from("profiles").update({first_name:first,last_name:last,full_name:(first+" "+last).trim()}).eq("id",own()));
   if(isCoach()){
    await q(db.from("coach_details").upsert({coach_id:own(),disciplines:v("disciplines").split(/\r?\n/).map(function(x){return x.trim()}).filter(Boolean),updated_at:new Date().toISOString()},{onConflict:"coach_id"}));
   }else{
    await q(db.from("athlete_details").upsert({athlete_id:own(),sport:v("sport"),specialty:v("specialty"),disciplines:arr("disciplines"),height_cm:n("height_cm"),stride_length_cm:n("stride_length_cm"),records:v("records"),technique_notes:v("technique_notes"),share_with_coach:yes("share_with_coach"),share_with_club:yes("share_with_club"),share_with_league:yes("share_with_league"),share_with_federation:yes("share_with_federation"),updated_at:new Date().toISOString()},{onConflict:"athlete_id"}));
   }
   await loadProfile();await fetchData();render();toast("Profil enregistré.");
  }else if(kind==="checkin"){
   var painLevel=n("pain_level"),checkinPayload={id:offlineId(),athlete_id:own(),day_type:v("day_type")||"training",feeling:n("feeling")||3,stress:n("stress")||3,recovery:n("recovery"),mental_wellbeing:n("mental_wellbeing"),energy:n("energy"),pain:!!(painLevel&&painLevel>0),pain_level:painLevel,pain_area:v("pain_area"),sleep_hours:n("sleep_hours"),note:v("note"),created_at:new Date().toISOString()};
   if(!navigator.onLine){await window.AthlysOfflineStore.enqueue(own(),"athlete_checkins",checkinPayload);offlineQueued=true;await done("Ressenti enregistré localement. Synchronisation au retour du réseau.");return}
   await q(db.from("athlete_checkins").insert(checkinPayload));
   await done("Ressenti enregistré.");
  }else{
   var d={},table="",programDraftToSave=null,athlete=isCoach()?(v("athlete_id")||selectedAthleteId||D.roster[0]&&D.roster[0].id):own();
   if(kind==="event"){
    table="calendar_events";d={coach_id:coachId(),athlete_id:v("athlete_id")||null,created_by:own(),title:v("title"),starts_at:new Date(v("starts_at")).toISOString(),discipline:v("discipline"),session_type:v("session_type")||"Entraînement",planned_volume:n("planned_volume"),volume_unit:v("volume_unit")||"km",planned_intensity:n("planned_intensity"),notes:v("notes")};
   }else if(kind==="log"){
    table="training_logs";d={athlete_id:athlete,created_by:own(),session_date:v("session_date")||today(),title:v("title")||"Séance",discipline:v("discipline"),session_type:v("session_type")||"training",duration_minutes:n("duration_minutes"),rpe:n("rpe"),program_session_id:v("program_session_id")||null,volume:n("volume"),volume_unit:v("volume_unit")||"km",distance_km:n("distance_km"),average_heart_rate:n("average_heart_rate"),sprint_time_seconds:n("sprint_time_seconds"),jump_count:n("jump_count"),jump_intensity:n("jump_intensity"),metrics:{ground_contact_ms:n("ground_contact_ms"),pole_approach_steps:n("pole_approach_steps"),pole_used:v("pole_used"),pole_lever:n("pole_lever"),pole_intermediate_mark_cm:n("pole_intermediate_mark_cm")},notes:v("notes"),completed:true};if(d.program_session_id){var calibrationSession=D.sessions.find(function(x){return x.id===d.program_session_id;}),calibrationProgram=calibrationSession&&D.programs.find(function(p){return p.id===calibrationSession.program_id;});if(!calibrationSession||!calibrationProgram||(calibrationProgram.athlete_id&&calibrationProgram.athlete_id!==athlete))throw new Error("Cette séance planifiée n’appartient pas à l’athlète sélectionné.");if(calibrationProgram.athlete_id==null&&isCoach()&&!D.roster.some(function(x){return x.id===athlete;}))throw new Error("L’athlète n’est pas lié à ce coach.");if(calibrationSession.discipline&&d.discipline&&String(calibrationSession.discipline).trim().toLocaleLowerCase("fr")!==String(d.discipline).trim().toLocaleLowerCase("fr"))throw new Error("La discipline de la séance réalisée ne correspond pas à la séance planifiée.");}
   }else if(kind==="program"){
    table="training_programs";var sourceText=v("source_text");programDraftToSave=sourceText?A.programDraft:null;if(sourceText&&(!programDraftToSave||programDraftToSave.sourceHash!==window.AthlysLocalIntelligence.hashText(sourceText)||!/^[a-f0-9]{64}$/.test(programDraftToSave.sourceDigestSha256||"")))throw new Error("Analyse le texte et vérifie son aperçu avant l’enregistrement.");if(sourceText){var verifiedSourceDigest=await window.AthlysLocalIntelligence.sha256Text(sourceText);if(verifiedSourceDigest!==programDraftToSave.sourceDigestSha256)throw new Error("Le texte du programme a changé depuis l’aperçu SHA-256. Relance l’analyse avant l’enregistrement.");}d={coach_id:own(),athlete_id:v("athlete_id")||null,title:v("title"),discipline:v("discipline"),start_date:v("start_date")||null,end_date:v("end_date")||null,goal:v("goal"),notes:v("notes")};
   }else if(kind==="program-session"){
    table="program_sessions";d={program_id:v("program_id"),sequence_number:n("sequence_number")||1,title:v("title"),discipline:v("discipline"),planned_date:v("planned_date")||null,duration_minutes:n("duration_minutes"),intensity:n("intensity"),content:{instructions:v("content")}};
   }else if(kind==="goal"){
    table="athlete_goals";d={athlete_id:athlete,created_by:own(),title:v("title"),category:v("category")||"performance",metric_key:v("metric_key"),current_value:n("current_value"),target_value:n("target_value"),unit:v("unit"),target_date:v("target_date")||null,notes:v("notes")};
   }else if(kind==="record"){
    table="personal_records";d={athlete_id:athlete,created_by:own(),discipline:v("discipline"),metric:v("metric"),result_value:n("result_value"),unit:v("unit")||"s",achieved_on:v("achieved_on")||today(),competition_name:v("competition_name"),is_personal_best:yes("is_personal_best"),verified_by_coach:isCoach(),notes:v("notes")};
   }else if(kind==="result"){
    table="competition_results";d={athlete_id:athlete,created_by:own(),competition_name:v("competition_name"),discipline:v("discipline"),result_value:n("result_value"),unit:v("unit")||"s",placement:n("placement"),category:v("category"),result_date:v("result_date")||today(),personal_best:yes("personal_best"),season_best:false,notes:""};
   }else if(kind==="measure"){
    table="athlete_measurements";d={athlete_id:own(),measured_by:own(),metric_key:v("metric_key"),value:n("value"),unit:v("unit"),measured_at:new Date(v("measured_at")||new Date().toISOString()).toISOString(),source:"manual",share_with_coach:yes("share_with_coach"),notes:v("notes")};
   }else if(kind==="exercise"){
    table="exercise_library";d={owner_id:own(),title:v("title"),category:v("category"),discipline:v("discipline"),difficulty:n("difficulty")||2,duration_minutes:n("duration_minutes"),equipment:arr("equipment"),muscle_groups:arr("muscle_groups"),instructions:v("instructions"),video_url:v("video_url")};
   }else if(kind==="equipment"){
    table="athlete_equipment";d={athlete_id:own(),created_by:own(),label:v("label"),category:v("category"),brand:v("brand"),model:v("model"),usage_value:n("usage_value")||0,usage_unit:v("usage_unit")||"km",replacement_threshold:n("replacement_threshold"),acquired_on:v("acquired_on")||null,notes:v("notes"),is_active:true};
   }else if(kind==="note"){
    table="athlete_notes";d={athlete_id:v("athlete_id"),author_id:own(),category:v("category")||"general",body:v("body")};
   }else if(kind==="questionnaire"){
    table="coach_questionnaires";d={coach_id:own(),athlete_id:v("athlete_id")||null,title:v("title"),description:v("description"),questions:v("questions").split(/\r?\n/).map(function(x){return x.trim()}).filter(Boolean).map(function(x){return {label:x}}),due_at:v("due_at")?new Date(v("due_at")).toISOString():null,active:true};
   }else if(kind==="answer"){
    var qqid=v("questionnaire_id"),answers={};fd.forEach(function(value,key){if(key.indexOf("answer_")===0)answers[key]=String(value)});
    await q(db.from("questionnaire_responses").insert({questionnaire_id:qqid,athlete_id:own(),answers:answers}));
    await done("Réponse envoyée.");return;
   }else if(kind==="video"){
    var file=fd.get("video");if(!file||!file.size)throw new Error("Sélectionne une vidéo.");
    var videoAthlete=athlete||own(),path=videoAthlete+"/"+Date.now()+"-"+String(file.name||"video").replace(/[^a-zA-Z0-9._-]/g,"_");
    var upload=await db.storage.from("athlys-technique-videos").upload(path,file,{upsert:false,contentType:file.type||"video/mp4"});
    if(upload.error)throw upload.error;
    await q(db.from("athlete_technique_videos").insert({athlete_id:videoAthlete,uploaded_by:own(),title:v("title"),storage_path:path,technical_notes:v("technical_notes")}));
    await done("Vidéo ajoutée en espace privé.");return;
   }else if(kind==="team"){
    var teamPayload={coach_id:own(),name:v("name"),discipline:v("discipline"),category:v("category"),notes:v("notes")},teamId=modal&&modal.id,team;
    if(teamId)team=await q(db.from("coach_teams").update(teamPayload).eq("id",teamId).select().single());
    else team=await q(db.from("coach_teams").insert(teamPayload).select().single());
    var idTeam=team.id,memberIds=fd.getAll("members");
    await q(db.from("coach_team_members").delete().eq("team_id",idTeam));
    if(memberIds.length)await q(db.from("coach_team_members").insert(memberIds.map(function(mid){return {team_id:idTeam,athlete_id:mid}})));
    await done("Groupe enregistré.");return;
   }else throw new Error("Formulaire non reconnu : "+kind);
   if(kind==="program"&&programDraftToSave){
    if(!navigator.onLine)throw new Error("La structure est prête localement. Connecte-toi pour synchroniser le programme avec les athlètes.");
    var createdProgram=await q(db.from("training_programs").insert(d).select("id").single()),programId=createdProgram.id,parsedProgram=Object.assign({},programDraftToSave.parsed,{coach_edits:programDraftToSave.coachEdits||{}});
    try{
     var sessionRows=parsedProgram.sessions.map(function(x){return {program_id:programId,sequence_number:x.sequence_number,title:String(x.title||("Séance "+x.sequence_number)).slice(0,160),discipline:v("discipline"),planned_date:x.planned_date||null,duration_minutes:x.duration_minutes,intensity:x.planned_rpe,content:{instructions:String(x.source_text||"").slice(0,3000),blocks:x.blocks,work_intervals:x.work_intervals,recoveries:x.recoveries,planned_rpe:x.planned_rpe,session_type:x.session_type,strength_blocks:x.strength_blocks,target_pace:x.target_pace,intensity_zone:x.intensity_zone,source_span:x.source_span,parser_version:parsedProgram.parser_version,ambiguities:x.ambiguities}};});
     if(sessionRows.length)await q(db.from("program_sessions").insert(sessionRows));
     await q(db.from("training_program_imports").insert({program_id:programId,coach_id:own(),source_text:programDraftToSave.sourceText,source_digest_sha256:programDraftToSave.sourceDigestSha256,parsed_payload:Object.assign({},parsedProgram,{source_integrity:{algorithm:"SHA-256",digest:programDraftToSave.sourceDigestSha256}}),model_name:"athlys-deterministic-local-v1",parser_version:parsedProgram.parser_version,status:"accepted",reviewed_at:new Date().toISOString()}));
    }catch(saveError){try{await q(db.from("training_program_imports").delete().eq("program_id",programId));}catch(ignoreImport){}try{await q(db.from("program_sessions").delete().eq("program_id",programId));}catch(ignoreSessions){}try{await q(db.from("training_programs").delete().eq("id",programId).eq("coach_id",own()));}catch(ignoreProgram){}throw saveError;}
    A.programDraft=null;await done("Programme structuré localement, vérifié et enregistré avec ses séances.");return;
   }
   if(!navigator.onLine&&offlineTables[table]&&!(kind==="event"&&modal&&modal.id)){d.id=offlineId();await window.AthlysOfflineStore.enqueue(own(),table,d);offlineQueued=true;await done("Enregistrement local. Synchronisation au retour du réseau.");return}
   if(kind==="event"&&modal&&modal.id)await q(db.from(table).update(d).eq("id",modal.id));
   else await q(db.from(table).insert(d));
   if(kind==="program")A.programDraft=null;
   await done("Enregistrement effectué.");
  }
 }catch(err){if(!offlineQueued&&window.AthlysOfflineStore&&/fetch|network|timeout|connection/i.test(String(err&&err.message||err))){try{if(kind==="checkin"&&typeof checkinPayload!=="undefined"&&checkinPayload){await window.AthlysOfflineStore.enqueue(own(),"athlete_checkins",checkinPayload);await applyOfflineQueue();busy=false;modal=null;render();toast("Ressenti conservé localement. Synchronisation au retour du réseau.");return}if(typeof table!=="undefined"&&table&&offlineTables[table]&&d&&!(kind==="event"&&modal&&modal.id)){d.id=d.id||offlineId();await window.AthlysOfflineStore.enqueue(own(),table,d);await applyOfflineQueue();busy=false;modal=null;render();toast("Saisie conservée localement. Synchronisation au retour du réseau.");return}}catch(queueError){console.warn("Athlys offline queue:",queueError.message)}}busy=false;console.error("Athlys submit:",err);toast("Impossible d’enregistrer : "+(err&&err.message||"erreur inconnue"));}
 finally{busy=false;if(loaderActive)authLoaderHide();}
}
function onInput(e){if(e.target.name==="source_text"){A.programDraft=null;var preview=e.target.form&&e.target.form.querySelector("#program-parse-preview");if(preview)preview.innerHTML="";}else if(e.target.id==="exercise-search")filterExercises();else if(e.target.id==="team-search")filterRoster()}
function filterRoster(){var term=(($("#team-search")||{}).value||"").toLowerCase();root.querySelectorAll(".roster-row,.team-athlete").forEach(function(el){el.hidden=(el.dataset.name||"").indexOf(term)<0})}
function filterExercises(){var term=($("#exercise-search")||{}).value||"",cat=($("#exercise-category")||{}).value||"";root.querySelectorAll("[data-exercise]").forEach(function(el){el.hidden=el.dataset.exercise.indexOf(term.toLowerCase())<0||(cat&&el.dataset.category!==cat)})}
function refreshLogProgramSessionChoices(form){
 var athleteId=form&&form.elements.namedItem("athlete_id")?form.elements.namedItem("athlete_id").value:own();
 var programs=(D.programs||[]).filter(function(p){return !p.athlete_id||p.athlete_id===athleteId;});
 var ids=programs.map(function(p){return p.id;}),choices=(D.sessions||[]).filter(function(x){return ids.indexOf(x.program_id)>=0;});
 var select=form&&form.elements.namedItem("program_session_id");if(!select)return;
 select.options.length=0;
 var empty=document.createElement("option");empty.value="";empty.textContent="Aucune séance associée";select.appendChild(empty);
 choices.forEach(function(x){var parent=programs.find(function(p){return p.id===x.program_id;}),option=document.createElement("option");option.value=x.id;option.textContent=(parent?parent.title+" · ":"")+x.sequence_number+". "+x.title+" · "+(x.intensity==null?"RPE non fixé":"RPE "+x.intensity);select.appendChild(option);});
}
function onChange(e){
 var target=e.target,form=target.form;
 if(target.dataset&&target.dataset.programEdit&&A.programDraft&&form&&form.dataset.form==="program"){
  var index=Number(target.dataset.sessionIndex),field=target.dataset.programEdit,session=A.programDraft.parsed.sessions[index],raw=String(target.value||"").trim(),next=raw;
  if(!session||["title","planned_date","duration_minutes","planned_rpe"].indexOf(field)<0)return;
  if(field==="title"){if(!raw){target.value=session.title||"";toast("Chaque séance doit conserver un intitulé.");return;}next=raw.slice(0,160);}
  else if(field==="planned_date"){if(raw&&!/^\\d{4}-\\d{2}-\\d{2}$/.test(raw)){target.value=session.planned_date||"";toast("Date invalide.");return;}next=raw||null;}
  else if(raw==="")next=null;
  else{next=Number(raw);var min=field==="planned_rpe"?1:1,max=field==="planned_rpe"?10:900;if(!Number.isFinite(next)||next<min||next>max){target.value=session[field]==null?"":String(session[field]);toast(field==="planned_rpe"?"Le RPE doit être compris entre 1 et 10.":"La durée doit être comprise entre 1 et 900 minutes.");return;}}
  session[field]=next;
  A.programDraft.coachEdits=A.programDraft.coachEdits||{};
  A.programDraft.coachEdits[index]=A.programDraft.coachEdits[index]||{};
  A.programDraft.coachEdits[index][field]=next;
  var athleteSelect=form.elements.namedItem("athlete_id"),athleteId=athleteSelect&&athleteSelect.value||"";
  var athletes=athleteId?D.roster.filter(function(x){return x.id===athleteId;}):D.roster.slice();
  A.programDraft.analyses=athletes.map(function(athlete){return programAthleteAnalysis(A.programDraft.parsed.sessions,athlete,A.programDraft.discipline);});
  var scenarioPanel=form.querySelector("#program-preview-scenarios");
  if(scenarioPanel)scenarioPanel.innerHTML=A.programDraft.analyses.map(programScenarioMarkup).join("")||'<p class="muted">Aucun athlète associé.</p>';
 }
 if(form&&form.dataset.form==="log"&&target.name==="athlete_id"){refreshLogProgramSessionChoices(form)}
 if(form&&form.dataset.form==="program"&&(target.name==="discipline"||target.name==="athlete_id")&&!target.dataset.programEdit){A.programDraft=null;var pp=form.querySelector("#program-parse-preview");if(pp)pp.innerHTML="";}
 if(target.id==="message-peer"){selectedMessageAthlete=target.value;stopChatRtc("Changement de conversation");loadMessages().then(function(){render();activateChatTransport()})}
 else if(target.id==="chat-transport"){chatTransportMode=target.value;try{localStorage.setItem("athlys-chat-transport-"+own(),chatTransportMode)}catch(x){}if(chatTransportMode==="websocket")stopChatRtc("WebSocket natif · sélection manuelle");else activateChatTransport().then(updateChatTransportUI);render()}
 else if(target.id==="performance-athlete"){selectedAthleteId=target.value;render()}
 else if(target.id==="quantum-athlete"){selectedAthleteId=target.value;render()}
 else if(target.id==="team-filter"){teamFilterId=target.value;render()}
 else if(target.id==="exercise-category"||target.id==="exercise-search")filterExercises()
}
function onClick(e){var b=e.target.closest("[data-action],[data-nav],[data-assistant],[data-perf-tab],[data-perf-range],[data-quantum-tab],[data-scale-option]");if(!b)return;if(b.dataset.scaleOption){var f=b.closest("form"),n=b.dataset.scaleOption,input=f&&f.querySelector('[data-scale-input="'+n+'"]');if(input){input.value=b.dataset.value;f.querySelectorAll('[data-scale-option="'+n+'"]').forEach(function(x){x.setAttribute("aria-pressed",x===b?"true":"false")})}return}if(b.dataset.assistant){var p=b.dataset.assistant;assistantSay("user",p);A.open=true;assistantHandle(p);return}if(b.dataset.nav){if(isMobileEntry()&&b.dataset.nav==="quantum"){view="home";render();return}view=b.dataset.nav;if(view==="messages")chatMobileListOpen=isMobileEntry();A.open=false;modal=null;render();if(view==="messages"&&activeChatMode==="direct")activateChatTransport();else if(chatRtcChannel)stopChatRtc("Chat fermé · WebSocket natif");if(view==="integrations")healthRefreshStatus().then(render).catch(console.warn);return}var a=b.dataset.action,id=b.dataset.id;if(a==="chat-back"){chatMobileListOpen=true;stopChatRtc("Retour à la liste des conversations");render();return}else if(a==="chat-open-direct"){if(isMobileEntry())chatMobileListOpen=false;activeChatMode="direct";try{localStorage.setItem("athlys-chat-mode-"+own(),"direct")}catch(e){}if(isCoach())selectedMessageAthlete=id;stopChatRtc("Changement de conversation");loadMessages().then(function(){render();activateChatTransport()});return}else if(a==="chat-open-team"){if(isMobileEntry())chatMobileListOpen=false;activeChatMode="group";activeChatTeamId=id;try{localStorage.setItem("athlys-chat-mode-"+own(),"group");localStorage.setItem("athlys-chat-team-"+own(),id)}catch(e){}stopChatRtc("Messagerie de groupe · WebSocket");loadTeamMessages(id).then(render);return}else if(a==="program-parse"){parseProgramDraft(b);return}else if(a==="program-rpe-scenarios"){programShowScenarios(id);return}else if(b.dataset.quantumTab){quantumMode=b.dataset.quantumTab;render()}else if(b.dataset.perfTab){perfTab=b.dataset.perfTab;render()}else if(b.dataset.perfRange){perfRange=Number(b.dataset.perfRange)||30;render()}else if(a==="risk-assess"){calculateServerRisk(id)}else if(a==="digital-twin"){calculateDigitalTwin(id)}else if(a==="quantum-simulate"){quantumSimulate(id)}else if(a==="quantum-decision"){quantumDecision(id,b.dataset.option)}else if(a==="quantum-ledger-refresh"){delete quantumLedgerCache[id];quantumLoadLedger(id)}else if(a==="password-toggle"){var wrap=b.closest(".auth-password"),input=wrap&&wrap.querySelector("input");if(input){var reveal=input.type==="password";input.type=reveal?"text":"password";b.textContent=reveal?"Masquer":"Afficher";b.setAttribute("aria-pressed",String(reveal));b.setAttribute("aria-label",reveal?"Masquer le mot de passe":"Afficher le mot de passe")}}else if(a==="login-tab"){view="login";render()}else if(a==="signup-tab"){view="signup";render()}else if(a==="forgot-tab"){view="forgot";render()}else if(a==="logout"){cleanup();db.auth.signOut().then(function(){session=null;profile=null;render()})}else if(a==="modal-close"){if(e.target.closest("[data-modal]")&&e.target!==b)return;modal=null;render()}else if(a==="assistant-toggle"){A.open=!A.open;render();if(A.open)assistantLoadInsights(true)}else if(a==="health-connect"){healthConnect()}else if(a==="health-settings"||a==="health-background-settings"){healthManageSettings()}else if(a==="health-sync"){healthSync()}else if(a==="health-delete"){healthDeleteImported()}else if(a==="switch-role"){switchAccountRole(b.dataset.role)}else if(a==="assistant-reset"){if(confirm("Effacer l’historique de cette conversation ?")){A.history=[];A.pending=null;A.insights=[];A.insightLoaded=false;assistantHistorySave();render();assistantLoadInsights(true)}}else if(a==="assistant-confirm"){assistantConfirm()}else if(a==="assistant-cancel"){A.pending=null;assistantSay("assistant","Action annulée.");render()}else if(a==="open-athlete-chat"){selectedMessageAthlete=selectedAthleteId;view="messages";stopChatRtc("Changement de conversation");loadMessages().then(function(){render();activateChatTransport()})}else if(a==="checkin-new")open("checkin");else if(a==="event-new")open("event");else if(a==="event-edit")open("event",id);else if(a==="event-delete"){if(confirm("Supprimer cet événement ?"))q(db.from("calendar_events").delete().eq("id",id)).then(fetchData).then(render).catch(function(x){toast(x.message)})}else if(a==="log-new")open("log");else if(a==="program-new"){if(isCoach())open("program");else view="training",render()}else if(a==="program-session-new")open("program-session",id);else if(a==="template-apply"){if(!confirm("Créer ce cycle de 4 semaines et ses 12 séances ?"))return;applyAthleticsTemplate(id).catch(function(x){toast("Création impossible : "+x.message)})}else if(a==="program-detail")open("program-info",id);else if(a==="goal-new")open("goal");else if(a==="record-new")open("record");else if(a==="result-new")open("result");else if(a==="measure-new")open("measure");else if(a==="exercise-new")open("exercise");else if(a==="equipment-new")open("equipment");else if(a==="team-new")open("team",id);else if(a==="note-new")open("note");else if(a==="questionnaire-new")open("questionnaire");else if(a==="questionnaire-answer")open("answer",id);else if(a==="video-new")open("video");else if(a==="video-open"){var vv=by(D.videos,id);if(vv)db.storage.from("athlys-technique-videos").createSignedUrl(vv.storage_path,3600).then(function(r){if(r.error)throw r.error;location.href=r.data.signedUrl}).catch(function(x){toast(x.message)})}else if(a==="select-athlete"){selectedAthleteId=id;view="team";render()}else if(a==="select-analysis-athlete"){selectedAthleteId=id;perfTab="overview";view="performance";render()}else if(a==="make-code"){q(db.rpc("create_coach_code")).then(function(v){D.coachCode=typeof v==="string"?v:v&&v.code||"";toast(D.coachCode?"Code créé : "+D.coachCode:"Aucun code reçu.")}).catch(function(x){toast(x.message)})}else if(a==="notification-read"){q(db.from("athlys_notifications").update({read_at:new Date().toISOString()}).eq("id",id)).then(fetchData).then(render)}else if(a==="notifications-all"){q(db.from("athlys_notifications").update({read_at:new Date().toISOString()}).is("read_at",null)).then(fetchData).then(render)}else if(a==="cycle-delete"){if(confirm("Effacer les données menstruelles enregistrées sur cet appareil ?")){localStorage.removeItem("athlys-cycle-log-"+own());toast("Historique local effacé.");render()}}else if(a==="export-csv"){exportCSV()}else if(a==="print-report"){window.print()}else if(a==="delete-account"){if(confirm("Supprimer définitivement ton compte ?"))db.functions.invoke("delete-account",{body:{confirm:true}}).then(function(r){if(r.error)throw r.error;return db.auth.signOut()}).then(function(){session=null;profile=null;render()}).catch(function(x){toast(x.message)})}}
function cleanup(){stopChatRtc("Chat déconnecté");if(channel&&db){db.removeChannel(channel);channel=null}}
function loginRecovery(url){try{var u=new URL(url),h=new URLSearchParams((u.hash||"").replace(/^#/,""));if((h.get("type")||u.searchParams.get("type"))==="recovery"){var at=h.get("access_token")||u.searchParams.get("access_token"),rt=h.get("refresh_token")||u.searchParams.get("refresh_token");if(at&&rt){db.auth.setSession({access_token:at,refresh_token:rt});view="reset";resetPage();return true}}}catch(e){}return false}
function init(){authLoaderShow("Vérification de votre session",8);root=document.createElement("div");root.id="athlys";document.body.appendChild(root);root.addEventListener("click",onClick);root.addEventListener("submit",onSubmit);root.addEventListener("change",onChange);root.addEventListener("input",onInput);root.addEventListener("keydown",onKeyDown);document.addEventListener("keydown",desktopSearchShortcut);window.addEventListener("online",function(){syncOfflineQueue()});window.addEventListener("offline",function(){render()});if(!cfg.url||!cfg.anonKey||!window.supabase){root.innerHTML='<div class="auth-layout"><section class="auth-card"><h2>Configuration indisponible</h2><p>Vérifie la configuration Supabase.</p></section></div>';authLoaderHide();return}db=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storage:localStorage}});if(loginRecovery(location.href)){authLoaderHide();return;}db.auth.getSession().then(async function(r){authLoaderUpdate(24,"Session vérifiée");session=r.data.session;if(session){try{authLoaderUpdate(40,"Chargement du profil");await loadProfile();authLoaderUpdate(62,"Profil chargé");prefsLoad();authLoaderUpdate(70,"Synchronisation des données");await fetchData();authLoaderUpdate(92,"Préparation de votre espace");subscribeMessages()}catch(e){console.error(e);await db.auth.signOut();session=null;profile=null;authPage(e.message);authLoaderHide();return}}render();authLoaderUpdate(100,session?"Espace prêt":"Connexion disponible");requestAnimationFrame(authLoaderHide)}).catch(function(e){authPage(e.message);authLoaderHide()});db.auth.onAuthStateChange(function(event,next){if(event==="PASSWORD_RECOVERY"){session=next;view="reset";resetPage();authLoaderHide()}else if(event==="SIGNED_OUT"){cleanup();session=null;profile=null;render()}});var nativePlatform=window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform();var native=nativePlatform&&(window.athlysApp||(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App));if(native&&native.addListener)native.addListener("appUrlOpen",function(e){if(e&&e.url)loginRecovery(e.url)});document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible"&&session&&profile){fetchData().then(render).catch(console.warn);onChatNetworkChange()}});window.addEventListener("online",onChatNetworkChange);window.addEventListener("offline",onChatNetworkChange);var netInfo=navigator.connection||navigator.mozConnection||navigator.webkitConnection;if(netInfo&&netInfo.addEventListener)netInfo.addEventListener("change",onChatNetworkChange)}
document.addEventListener("DOMContentLoaded",init);
})();