const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const app=fs.readFileSync(path.join(root,"web/app.js"),"utf8");
const html=fs.readFileSync(path.join(root,"web/index.html"),"utf8");
const api=fs.readFileSync(path.join(root,"supabase/functions/athlys-performance-analysis/index.ts"),"utf8");
const engine=fs.readFileSync(path.join(root,"supabase/functions/athlys-performance-analysis/analysis-engine.js"),"utf8");
function block(start,end){const a=app.indexOf(start),b=app.indexOf(end,a);assert.ok(a>=0&&b>a);return app.slice(a,b)}
test("the browser calls the authenticated Supabase analytics endpoint",()=>{
 assert.match(app,/athlys-performance-analysis/);
 assert.match(app,/action:"performance"/);
 assert.match(app,/action:"team"/);
 assert.match(app,/action:"risk"/);
});
test("the browser no longer contains load, EWMA or Monte Carlo analysis engines",()=>{
 for(const pattern of [/function irCore\(/,/function irSimulate\(/,/function irMaxLoad\(/,/function irHistory\(/,/function workloadBetween\(/,/function ewmaLoads\(/,/function dataConfidence\(/,/function perfBuckets\(/,/function perfInsight\(/,/var irP=/])assert.doesNotMatch(app,pattern);
});
test("performance view renders server summaries rather than computing local load metrics",()=>{
 const view=block("function viewPerformance(){","function renderGoals(){");
 assert.match(view,/summary\.acuteLoad/);
 assert.match(view,/summary\.ewma/);
 assert.match(view,/data\.buckets/);
 assert.match(view,/data\.sessionLoadById/);
 assert.doesNotMatch(view,/workloadBetween|ewmaLoads|perfBuckets|perfInsight|irCore/);
});
test("team dashboards use server summaries and server alerts",()=>{
 const home=block("function coachWeekPanel(){","function viewHome(){");
 const team=block("function viewTeam(){","function viewPerformance(){");
 assert.match(home,/teamAnalyticsCache/);
 assert.match(team,/teamRow\(/);
 assert.match(team,/teamSummary\.freshCheckins/);
 assert.doesNotMatch(team,/D\.logs\.filter\(function\(x\)\{return x\.athlete_id===a\.id\}\)/);
});
test("the client filters coach-visible data by explicit athlete sharing consent",()=>{
 assert.match(app,/share_with_coach===true/);
});
test("the risk engine exists only in the server function package",()=>{
 assert.match(engine,/computeRisk/);
 assert.match(engine,/N:5000/);
 assert.doesNotMatch(html,/analysis-engine\.js/);
});
test("the server enforces athlete self-access, coach relationship and explicit sharing",()=>{
 assert.match(api,/profiles\?id=eq/);
 assert.match(api,/coach_athletes\?coach_id=eq/);
 assert.match(api,/share_with_coach/);
 assert.match(api,/user\.role==="athlete"/);
 assert.match(api,/Engine\.computePerformance/);
 assert.match(api,/Engine\.computeTeam/);
 assert.match(api,/Engine\.computeRisk/);
});
