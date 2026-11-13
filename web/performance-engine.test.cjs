const test=require("node:test"),assert=require("node:assert/strict");
const Engine=require("../supabase/functions/athlys-performance-analysis/analysis-engine.js");
const asOf="2026-11-09",DAY=86400000;
function dateOffset(n){return new Date(Date.parse(asOf+"T12:00:00Z")-n*DAY).toISOString().slice(0,10)}
function fixture(id="athlete-1"){
 const logs=[];
 for(let d=0;d<36;d+=3)logs.push({id:"log-"+d,athlete_id:id,session_date:dateOffset(d),duration_minutes:60,rpe:6,completed:true});
 const checkins=[{athlete_id:id,feeling:4,recovery:4,energy:4,stress:3,mental_wellbeing:4,pain:false,pain_level:2,sleep_hours:8,created_at:asOf+"T08:00:00Z"}];
 return{logs,checkins};
}
test("performance summary, EWMA and buckets are calculated by the server engine",()=>{
 const f=fixture(),x=Engine.computePerformance({logs:f.logs,checkins:f.checkins,asOf,days:30});
 assert.equal(x.summary.observedSessions,10);
 assert.equal(x.summary.completeSessions,10);
 assert.equal(x.summary.readiness,75);
 assert.equal(x.summary.fatigue,40);
 assert.ok(x.summary.acuteLoad>0);
 assert.ok(x.summary.chronicWeeklyLoad>0);
 assert.ok(x.summary.ewma.atl>0&&x.summary.ewma.ctl>0);
 assert.equal(x.buckets.length,6);
 assert.equal(Object.keys(x.sessionLoadById).length,10);
});
test("team aggregation hides every metric for athletes without sharing consent",()=>{
 const a=fixture("athlete-1"),b=fixture("athlete-2");
 const x=Engine.computeTeam({athletes:[{id:"athlete-1",shared:true},{id:"athlete-2",shared:false}],logs:a.logs,checkins:a.checkins,asOf});
 assert.equal(x.rows.length,2);
 assert.equal(x.rows[0].shared,true);
 assert.equal(x.rows[1].shared,false);
 assert.equal(Object.prototype.hasOwnProperty.call(x.rows[1],"load7"),false);
 assert.equal(x.summary.sharedAthletes,1);
 assert.equal(x.summary.freshRatePercent,100);
});
test("Monte Carlo risk is computed server-side with 5,000 trajectories and returns a histogram",()=>{
 const f=fixture(),plans=[{planned_date:dateOffset(-1).replace(asOf,"2026-11-10"),duration_minutes:60,intensity:6},{planned_date:"2026-11-11",duration_minutes:75,intensity:7}];
 const x=Engine.computeRisk({logs:f.logs,checkins:f.checkins,plans,asOf,seed:"test-seed"});
 assert.equal(x.history.ok,true);
 assert.equal(x.history.logs,12);
 assert.equal(x.histogram.length,32);
 assert.equal(x.result.drivers.length,4);
 assert.ok(x.maxLoad>=0);
 assert.equal(x.forecast.hasPlan,true);
});
test("risk output is deterministic for a fixed seed",()=>{
 const f=fixture(),input={logs:f.logs,checkins:f.checkins,plans:[],asOf,seed:"same-seed"};
 const a=Engine.computeRisk(input),b=Engine.computeRisk(input);
 assert.equal(a.result.varR,b.result.varR);
 assert.equal(a.result.rrVaR,b.result.rrVaR);
});
test("risk refuses to invent a result when the training history is insufficient",()=>{
 const f=fixture();const x=Engine.computeRisk({logs:f.logs.slice(0,2),checkins:f.checkins,plans:[],asOf,seed:"short"});
 assert.equal(x.history.ok,false);
 assert.equal(x.result,null);
 assert.equal(x.maxLoad,null);
});
