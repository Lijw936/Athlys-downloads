import test from "node:test";
import assert from "node:assert/strict";
import {computeHealthSummary} from "../supabase/functions/athlys-performance-analysis/health-summary-engine.mjs";
const asOf="2026-11-09";
function row(type,day,value,origin="phone",unit="count",extra={}){return{recordType:type,startTime:day+"T12:00:00Z",endTime:day+"T12:01:00Z",value,unit,dataOrigin:origin,data:{provider:origin,...extra}}}
test("health records are aggregated server-side by day and source without double-counting mirrored devices",()=>{
 const rows=[
  row("steps","2026-11-09",5000,"phone"),
  row("steps","2026-11-09",5000,"phone"),
  row("steps","2026-11-09",4800,"watch"),
  row("distance","2026-11-09",3000,"phone","m"),
  row("active_calories","2026-11-09",400,"phone","kcal"),
  row("heart_rate","2026-11-09",60,"watch","bpm"),
  row("heart_rate","2026-11-09",80,"watch","bpm"),
  row("weight","2026-11-09",72,"scale","kg")
 ];
 const x=computeHealthSummary(rows,{days:30,asOf,timeZone:"UTC"});
 assert.equal(x.daily.length,1);
 assert.equal(x.daily[0].steps,5000);
 assert.equal(x.daily[0].distanceKm,3);
 assert.equal(x.daily[0].activeCalories,400);
 assert.equal(x.daily[0].heartRateMean,70);
 assert.equal(x.averageSteps,5000);
 assert.equal(x.latestWeight.value,72);
 assert.equal(x.counts.steps,2);
});
test("daily system aggregates take precedence over raw records",()=>{
 const x=computeHealthSummary([
  row("steps","2026-11-09",5000,"phone"),
  row("steps","2026-11-09",5200,"aggregate","count",{aggregated:true})
 ],{days:30,asOf,timeZone:"UTC"});
 assert.equal(x.daily[0].steps,5200);
});
test("missing measures remain null and never become zero",()=>{
 const x=computeHealthSummary([row("heart_rate","2026-11-09",300,"watch","bpm")],{days:30,asOf,timeZone:"UTC"});
 assert.equal(x.averageSteps,null);
 assert.equal(x.averageHeartRate,null);
 assert.equal(x.daily[0].steps,null);
 assert.equal(x.daily[0].heartRateMean,null);
});
test("timezone is applied server-side when assigning daily buckets",()=>{
 const x=computeHealthSummary([row("steps","2026-11-08",900,"watch","count")],{days:30,asOf:"2026-11-09T00:30:00Z",timeZone:"Europe/Paris"});
 assert.equal(x.daily[0].date,"2026-11-08");
 assert.equal(x.period.to,"2026-11-09");
});
test("trend comparisons require at least four measured days in both weeks",()=>{
 const rows=[];
 for(let d=0;d<4;d++){const day="2026-11-"+String(d+1).padStart(2,"0");rows.push(row("steps",day,1000))}
 for(let d=3;d<7;d++){const day="2026-11-"+String(d+3).padStart(2,"0");rows.push(row("steps",day,2000))}
 const x=computeHealthSummary(rows,{days:30,asOf,timeZone:"UTC"});
 assert.equal(x.trend.steps.changePercent,null);
});
test("records outside the requested period are excluded and invalid timezones safely fall back",()=>{
 const x=computeHealthSummary([row("steps","2026-09-01",800)],{days:30,asOf,timeZone:"invalid/timezone"});
 assert.equal(x.daily.length,0);
 assert.equal(x.period.timeZone,"UTC");
});
