const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const app=fs.readFileSync(path.join(root,"web/app.js"),"utf8");
const html=fs.readFileSync(path.join(root,"web/index.html"),"utf8");
const api=fs.readFileSync(path.join(root,"supabase/functions/athlys-quantum-analysis/index.ts"),"utf8");

function block(startMarker,endMarker){const a=app.indexOf(startMarker),b=app.indexOf(endMarker,a);assert.ok(a>=0&&b>a);return app.slice(a,b)}
test("Quantum overview is fetched from the authenticated server function",()=>{
 const fn=block("async function quantumLoadLedger(id){","function quantumModeTabs()");
 assert.match(fn,/athlys-quantum-analysis/);assert.match(fn,/action:"overview"/);
 assert.doesNotMatch(fn,/db\.from\("athlete_quantum_events"\)/);
});
test("Quantum simulation does not read athlete logs or run Monte Carlo in the browser",()=>{
 const fn=block("async function quantumSimulate(id){","function quantumModeTabs()");
 assert.match(fn,/action:"simulate"/);assert.doesNotMatch(fn,/D\.logs|AthlysQuantumEngine|simulate\(/);
});
test("Quantum decisions are recorded server-side",()=>{
 const fn=block("async function quantumDecision(id,option){","function quantumModeTabs()");
 assert.match(fn,/action:"decision"/);assert.doesNotMatch(fn,/db\.from\("athlete_quantum_events"\)/);
});
test("Quantum view renders server summaries and no longer aggregates local training logs",()=>{
 const fn=block("function viewQuantum(){","\nfunction ");
 assert.doesNotMatch(fn,/D\.logs|latestCheck\(|quantumDailySeries|quantumOutcomePairs/);
 assert.match(fn,/quantumOverviewCache/);
});
test("the browser no longer loads the Monte Carlo engine",()=>{
 assert.doesNotMatch(html,/quantum-engine\.js/);
 assert.equal(fs.existsSync(path.join(root,"web/quantum-engine.js")),false);
});
test("the server enforces coach relationship and explicit athlete sharing",()=>{
 assert.match(api,/profiles\?id=eq/);assert.match(api,/coach_athletes\?coach_id=eq/);
 assert.match(api,/share_with_coach/);assert.match(api,/Quantum\.simulate\(/);
});
