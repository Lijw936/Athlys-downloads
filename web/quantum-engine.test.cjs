const test=require("node:test"),assert=require("node:assert/strict"),Q=require("../supabase/functions/athlys-quantum-analysis/quantum-engine.js");
function logs(){const rows=[],types=["Endurance fondamentale","Intervalles / seuil","Sprint vitesse","Force musculaire"];for(let i=0;i<42;i++){const d=new Date("2026-09-01T12:00:00");d.setDate(d.getDate()+i);if(i%2===0)rows.push({session_date:d.toISOString().slice(0,10),session_type:types[(i/2)%types.length],duration_minutes:45+(i%4)*5,rpe:5+(i%5)*.5,completed:true})}return rows}
test("classification explicite",()=>{assert.equal(Q.classifySession({session_type:"Endurance fondamentale"}),"endurance");assert.equal(Q.classifySession({session_type:"Sprint vitesse"}),"speed");assert.equal(Q.classifySession({session_type:"sans détail"}),null)});
test("reproductibilité par seed",()=>{const x={logs:logs(),asOf:"2026-10-15",durationMinutes:60,rpe:7,profile:"intervals",seed:"athlete-1",simulations:1500};assert.deepEqual(Q.simulate(x),Q.simulate(x))});
test("dose monotone et CVaR ≥ VaR",()=>{const r=Q.simulate({logs:logs(),asOf:"2026-10-15",durationMinutes:60,rpe:7,profile:"mixed",seed:"dose",simulations:1200});assert.ok(r.scenarios[0].expectedDoseAU>r.scenarios[1].expectedDoseAU);assert.ok(r.scenarios[1].expectedDoseAU>r.scenarios[2].expectedDoseAU);assert.ok(r.scenarios.every(x=>x.cvar95>=x.var95))});
test("données non classées signalées",()=>{const r=Q.simulate({logs:[{session_date:"2026-10-01",session_type:"inconnu",duration_minutes:60,rpe:7}],asOf:"2026-10-10",durationMinutes:45,rpe:6,seed:"missing"});assert.equal(r.history.completeSessions,0);assert.equal(r.history.unclassifiedSessions,1)});

test("fourchette de charge simulée cohérente et niveau de données explicite",()=>{
 const r=Q.simulate({logs:logs(),asOf:"2026-10-15",durationMinutes:60,rpe:7,profile:"mixed",seed:"ranges",simulations:1200});
 assert.equal(r.dataQuality.level,"good");
 assert.ok(r.scenarios.every(x=>x.loadRange90.low<=x.loadRange90.high));
 assert.ok(r.scenarios.every(x=>x.expectedProjectedLoadAU>=0));
});
test("un historique trop court ne devient pas artificiellement fiable",()=>{
 const r=Q.simulate({logs:[{session_date:"2026-10-01",session_type:"Endurance fondamentale",duration_minutes:40,rpe:5}],asOf:"2026-10-10",durationMinutes:45,rpe:6,seed:"thin",simulations:1000});
 assert.equal(r.dataQuality.level,"insufficient");
 assert.equal(r.dataQuality.completeSessions,1);
});
