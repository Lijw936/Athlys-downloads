const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const app=fs.readFileSync(path.join(root,"web/app.js"),"utf8");
const health=fs.readFileSync(path.join(root,"supabase/functions/athlys-performance-analysis/index.ts"),"utf8");
const engine=fs.readFileSync(path.join(root,"supabase/functions/athlys-performance-analysis/health-summary-engine.mjs"),"utf8");
const html=fs.readFileSync(path.join(root,"web/index.html"),"utf8");
test("Health Connect summary is requested from the authenticated analytics function",()=>{
 assert.match(app,/db\.functions\.invoke\("athlys-performance-analysis"/);
 assert.match(app,/action:"health_summary"/);
 assert.match(health,/action==="health_summary"/);
 assert.match(health,/health_connect_records/);
 assert.match(health,/user\.role!=="athlete"/);
 assert.match(health,/user\.id/);
});
test("wearable metrics and weekly comparisons are no longer aggregated on the device",()=>{
 assert.doesNotMatch(app,/function healthSummarize\(/);
 assert.doesNotMatch(app,/function healthActivityTrend\(/);
 assert.doesNotMatch(app,/queryAggregated\(/);
 const start=app.indexOf("function healthPerformanceCard(summary){");
 const end=app.indexOf("async function healthRefreshStatus()",start);
 assert.ok(start>=0&&end>start);
 const card=app.slice(start,end);
 assert.match(card,/summary\.trend/);
 assert.match(card,/summary\.daily/);
 assert.doesNotMatch(card,/reduce\(|\.filter\(|healthSummarize/);
});
test("server aggregation respects explicit category consent and returns only a bounded summary",()=>{
 assert.match(health,/health_connect_consent_events/);
 assert.match(health,/latest\.get\("activity"\)/);
 assert.match(health,/latest\.get\("recovery"\)/);
 assert.match(health,/latest\.get\("body"\)/);
 assert.match(health,/recordCount:records\.length,truncated/);
 assert.match(engine,/export function computeHealthSummary/);
 assert.match(engine,/timeZone/);
});
test("raw Health Connect samples are uploaded for server-side aggregation, not aggregated on-device",()=>{
 const start=app.indexOf("async function healthImportSamples(p)");
 const end=app.indexOf("async function healthConnect()",start);
 assert.ok(start>=0&&end>start);
 const importer=app.slice(start,end);
 assert.match(importer,/p\.readSamples/);
 assert.doesNotMatch(importer,/queryAggregated|aggregated:true/);
});
test("the client bundle does not preload the server health aggregation engine",()=>{
 assert.doesNotMatch(html,/health-summary-engine/);
 assert.doesNotMatch(app,/health-summary-engine/);
});
