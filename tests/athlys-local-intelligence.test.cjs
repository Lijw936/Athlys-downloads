"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const engine = require("../web/athlys-local-intelligence.js");

test("session RPE load preserves decimals and reports arbitrary units", () => {
  assert.equal(engine.sessionLoad(75, 6.5), 487.5);
  assert.equal(engine.sessionLoad(0, 6), null);
  assert.equal(engine.sessionLoad(30, 11), null);
});

test("French programme extraction preserves values and missing fields", () => {
  const parsed = engine.parseProgram(
    "Lundi : Échauffement 15 min\n5 x 400 m à RPE 7/10, récupération 2 min\nRetour au calme 10 min",
    { discipline: "athlétisme" }
  );
  assert.equal(parsed.sessions.length, 1);
  assert.equal(parsed.sessions[0].planned_rpe, 7);
  assert.equal(parsed.sessions[0].work_intervals[0].repetitions, 5);
  assert.equal(parsed.sessions[0].work_intervals[0].value, 400);
  assert.equal(parsed.sessions[0].recoveries[0].value, 2);
  assert.equal(parsed.sessions[0].duration_minutes, null);
  assert.ok(parsed.sessions[0].ambiguities.some(x => /Durée totale/.test(x)));
  assert.equal(parsed.requires_coach_review, true);
});

test("parser never invents target RPE, date or missing recovery", () => {
  const parsed = engine.parseProgram("Séance 1 : 6 x 200 m à allure soutenue");
  const session = parsed.sessions[0];
  assert.equal(session.planned_date, null);
  assert.equal(session.planned_rpe, null);
  assert.equal(session.recoveries.length, 0);
  assert.ok(session.ambiguities.some(x => /RPE numérique/.test(x)));
  assert.ok(session.ambiguities.some(x => /Récupération/.test(x)));
});

test("program split keeps multiple coach sessions separate", () => {
  const parsed = engine.parseProgram("Lundi : footing 30 min\nMercredi : 4 x 500 m\nVendredi : natation 40 min");
  assert.equal(parsed.sessions.length, 3);
  assert.equal(parsed.sessions[0].duration_minutes, 30);
  assert.equal(parsed.sessions[2].duration_minutes, 40);
});

test("personal RPE calibration uses paired history for this athlete only", () => {
  const now = "2026-11-11T12:00:00.000Z";
  const sessions = Array.from({length:8}, (_,i)=>({id:"p"+i,intensity:6,discipline:"athlétisme"}));
  const history = Array.from({length:8}, (_,i)=>({
    id:"l"+i, program_session_id:"p"+i, discipline:"athlétisme", session_type:"training",
    duration_minutes:60, rpe:7, completed:true, session_date:"2026-11-"+String(10-i).padStart(2,"0")
  }));
  const projection = engine.projectRPE({plannedRpe:6,durationMinutes:60,sport:"athlétisme",
    history,programSessions:sessions,now});
  assert.equal(projection.sampleCount,8);
  assert.equal(projection.personalized,true);
  assert.ok(projection.projectedRpe > 6);
  assert.equal(projection.plannedLoadAU,360);
  assert.ok(projection.projectedLoadAU > 360);
  const unrelated = engine.projectRPE({plannedRpe:6,durationMinutes:60,sport:"natation",
    history,programSessions:sessions,now});
  assert.equal(unrelated.sampleCount,0);
  assert.equal(unrelated.projectedRpe,6);
  assert.equal(unrelated.confidence,"insufficient");
});

test("unlinked RPE values do not fabricate planned-versus-observed calibration", () => {
  const history = Array.from({length:10}, (_,i)=>({
    rpe:8,duration_minutes:60,discipline:"athlétisme",session_type:"training",
    session_date:"2026-11-0"+(i+1)
  }));
  const projection = engine.projectRPE({plannedRpe:6,durationMinutes:60,sport:"athlétisme",
    history,programSessions:[],now:"2026-11-12T00:00:00.000Z"});
  assert.equal(projection.sampleCount,0);
  assert.equal(projection.projectedRpe,6);
  assert.equal(projection.personalized,false);
});

test("all scenarios are created; increase is blocked without personal evidence", () => {
  const sessions=[{sequence_number:1,title:"Fractionné",duration_minutes:60,intensity:7,planned_rpe:7,
    blocks:[{type:"interval",repetitions:5,duration_minutes:1,recovery_minutes:2}]}];
  const scenarios=engine.generateScenarios({sessions,athlete:{sport:"athlétisme",history:[]}});
  assert.deepEqual(scenarios.map(x=>x.id),["decrease","adjust","increase"]);
  assert.ok(scenarios[0].changes.length);
  assert.equal(scenarios[1].status,"blocked");
  assert.equal(scenarios[2].status,"blocked");
  assert.equal(scenarios[0].projectedLoadAfterAU,null);
  assert.ok(scenarios[0].warnings.some(x=>/durée totale/.test(x)));
  assert.equal(scenarios[2].sessions[0].blocks[0].repetitions,5);
});

test("assistant intent interpretation runs locally", () => {
  const result=engine.localAssistantReply("Pourquoi mon RPE et ma charge augmentent ?",{logs:[]});
  assert.equal(result.engine.remote,false);
  assert.equal(result.engine.inference,"deterministic_local");
  assert.equal(result.engine.intent,"load_analysis");
});

test("model adapter is absent-safe and performs no external fallback", async () => {
  const result=await engine.parseProgramLocally("Footing 35 minutes", {discipline:"course"});
  assert.equal(result.model_used,false);
  assert.equal(result.sessions[0].duration_minutes,35);
});


test("explicit total duration is parsed while introductory text is not misclassified as a session", () => {
  const parsed = engine.parseProgram("Programme de préparation\nLundi : Séance de 45 min, RPE 5/10\nMercredi : Durée totale 60 min, RPE 6/10");
  assert.equal(parsed.sessions.length, 2);
  assert.equal(parsed.sessions[0].duration_minutes, 45);
  assert.equal(parsed.sessions[1].duration_minutes, 60);
  assert.ok(parsed.global_ambiguities.some(x => /Texte introductif non rattaché/.test(x.message)));
});

test("increase scenario is blocked if one planned session lacks comparable personal evidence", () => {
  const programSessions = Array.from({length:8}, (_,i)=>({id:"paired-"+i,intensity:6,discipline:"athlétisme"}));
  const history = Array.from({length:8}, (_,i)=>({
    program_session_id:"paired-"+i,discipline:"athlétisme",session_type:"training",
    duration_minutes:60,rpe:6.5,completed:true,session_date:"2026-11-"+String(10-i).padStart(2,"0")
  }));
  const sessions = [
    {sequence_number:1,title:"Endurance",duration_minutes:60,intensity:6,planned_rpe:6,blocks:[{repetitions:4}]},
    {sequence_number:2,title:"Intensité",duration_minutes:60,intensity:8,planned_rpe:8,blocks:[{repetitions:4}]}
  ];
  const scenarios=engine.generateScenarios({sessions,athlete:{sport:"athlétisme",history},programSessions,now:"2026-11-11T12:00:00.000Z"});
  assert.equal(scenarios[2].status,"blocked");
  assert.ok(scenarios[2].blockers.some(x=>/Séance 2/.test(x)));
});

test("strict source segmentation never turns programme introduction into an invented session", () => {
  const parsed=engine.parseProgram("Cycle de 4 semaines\nObjectif : développer l'endurance\nLundi : footing 40 min\nJeudi : séance de 50 min");
  assert.equal(parsed.sessions.length,2);
  assert.equal(parsed.sessions[0].title,"Lundi");
  assert.equal(parsed.sessions[1].duration_minutes,50);
});


test("adjust scenario is based on athlete-specific paired RPE residuals", () => {
  const programSessions = Array.from({length:4}, (_,i)=>({id:"adjust-"+i,intensity:6,discipline:"athlétisme"}));
  const history = Array.from({length:4}, (_,i)=>({
    program_session_id:"adjust-"+i,discipline:"athlétisme",session_type:"training",
    duration_minutes:60,rpe:7,completed:true,session_date:"2026-11-"+String(10-i).padStart(2,"0")
  }));
  const sessions=[{sequence_number:1,title:"Endurance",duration_minutes:60,intensity:6,planned_rpe:6,blocks:[]}];
  const scenarios=engine.generateScenarios({sessions,athlete:{sport:"athlétisme",history},programSessions,now:"2026-11-11T12:00:00.000Z"});
  assert.equal(scenarios[1].status,"draft");
  assert.equal(scenarios[1].sessions[0].planned_rpe,5.5);
  assert.equal(scenarios[1].projectedLoadBeforeAU,380);
  assert.equal(scenarios[1].projectedLoadAfterAU,350);
});

test("increase requires low perceived effort relative to target and never invents AU after extra repetitions", () => {
  const programSessions=Array.from({length:8},(_,i)=>({id:"increase-"+i,intensity:6,discipline:"athlétisme"}));
  const history=Array.from({length:8},(_,i)=>({
    program_session_id:"increase-"+i,discipline:"athlétisme",session_type:"training",
    duration_minutes:60,rpe:5,completed:true,session_date:"2026-11-"+String(10-i).padStart(2,"0")
  }));
  const sessions=[{sequence_number:1,title:"Fractionné",duration_minutes:60,intensity:6,planned_rpe:6,
    blocks:[{type:"interval",repetitions:4,duration_minutes:1,recovery_minutes:2}]}];
  const scenarios=engine.generateScenarios({sessions,athlete:{sport:"athlétisme",history},programSessions,now:"2026-11-11T12:00:00.000Z"});
  assert.equal(scenarios[2].status,"draft");
  assert.equal(scenarios[2].sessions[0].blocks[0].repetitions,5);
  assert.equal(scenarios[2].projectedLoadAfterAU,null);
  assert.ok(scenarios[2].warnings.length>0);
});

test("recovery minutes are not misread as work duration", () => {
  const parsed=engine.parseProgram("Séance 1 : durée totale 60 min, 5 x 3 min à RPE 7/10, récupération 2 min");
  assert.equal(parsed.sessions[0].duration_minutes,60);
  const intervalBlock=parsed.sessions[0].blocks.find(x=>x.type==="interval");
  const recoveryBlock=parsed.sessions[0].blocks.find(x=>x.type==="recovery");
  assert.equal(intervalBlock.duration_minutes,3);
  assert.equal(intervalBlock.repetitions,5);
  assert.equal(recoveryBlock.duration_minutes,null);
  assert.equal(recoveryBlock.recovery_minutes,2);
});


test("SHA-256 source digest is cryptographic, stable and lowercase hexadecimal", async () => {
  assert.equal(await engine.sha256Text("Athlys"), "8022c746c4c9585537e820ceb146a4dbbcea52bc0aedeed56f9c909f8b2427f2");
  const original = await engine.sha256Text("Programme lundi 45 min");
  const changed = await engine.sha256Text("Programme lundi 46 min");
  assert.match(original, /^[a-f0-9]{64}$/);
  assert.notEqual(original, changed);
});

test("programme import requires a source digest and server-side SHA-256 verification", () => {
  const root = path.resolve(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "web/app.js"), "utf8");
  const migration = fs.readFileSync(path.join(root, "supabase/migrations/20261112010000_training_program_import_sha256.sql"), "utf8");
  assert.match(app, /sourceDigestSha256:sourceDigestSha256/);
  assert.match(app, /await window\.AthlysLocalIntelligence\.sha256Text\(sourceText\)/);
  assert.match(app, /source_digest_sha256:programDraftToSave\.sourceDigestSha256/);
  assert.match(migration, /extensions\.digest\(convert_to\(NEW\.source_text, 'UTF8'\), 'sha256'\)/);
  assert.match(migration, /training_program_imports_sha256_guard/);
  assert.match(migration, /NEW\.status = 'accepted'/);
  assert.match(migration, /OLD\.source_digest_sha256 IS NOT NULL AND NEW\.source_digest_sha256 IS NULL/);
  const sessionGuard = fs.readFileSync(path.join(root, "supabase/migrations/20261111235000_athlys_training_log_program_session_guard.sql"), "utf8");
  assert.match(sessionGuard, /SECURITY DEFINER\s+SET search_path = ''/);
});


test("French parser extracts full dates, strength sets, reps, load and tempo", () => {
  const parsed = engine.parseProgram("12/11/2026 : Musculation 4 séries de 8 répétitions à 60 kg, tempo 3-1-2-0");
  assert.equal(parsed.sessions.length, 1);
  const session = parsed.sessions[0];
  assert.equal(session.planned_date, "2026-11-12");
  assert.equal(session.strength_blocks.length, 1);
  assert.equal(session.strength_blocks[0].strength.sets, 4);
  assert.equal(session.strength_blocks[0].strength.repetitions, 8);
  assert.equal(session.strength_blocks[0].strength.load_value, 60);
  assert.equal(session.strength_blocks[0].strength.load_unit, "kg");
  assert.equal(session.strength_blocks[0].strength.tempo, "3-1-2-0");
});

test("French parser extracts pace and intensity zones without inventing numeric RPE", () => {
  const parsed = engine.parseProgram("Mercredi : Endurance, allure 4:30/km, zone 2");
  const session = parsed.sessions[0];
  assert.deepEqual(session.target_pace, { value: "4:30", unit: "km" });
  assert.deepEqual(session.intensity_zone, { type: "zone", value: 2 });
  assert.equal(session.planned_rpe, null);
});

test("rest days are recognized without false missing-duration warnings", () => {
  const parsed = engine.parseProgram("Jeudi : repos complet");
  const session = parsed.sessions[0];
  assert.equal(session.session_type, "rest");
  assert.equal(session.planned_date, null);
  assert.equal(session.duration_minutes, null);
  assert.equal(session.ambiguities.some(x => /Durée totale/.test(x)), false);
});


test("French month dates are parsed and interval recoveries are not mistaken for rest days", () => {
  const parsed = engine.parseProgram("Lundi : 5 x 400 m, récupération 2 min\nMardi : 12 novembre 2026, footing 30 min");
  assert.equal(parsed.sessions.length, 2);
  assert.equal(parsed.sessions[0].session_type, "training");
  assert.equal(parsed.sessions[0].recoveries[0].value, 2);
  assert.equal(parsed.sessions[1].planned_date, "2026-11-12");
  assert.equal(parsed.sessions[1].duration_minutes, 30);
});
