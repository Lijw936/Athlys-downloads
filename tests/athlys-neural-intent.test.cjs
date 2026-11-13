"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const modelPath = path.join(__dirname, "../web/athlys-neural-intent-model.js");
require(modelPath);
const engine = require("../web/athlys-local-intelligence.js");

test("the Athlys neural model is compact, local and explicitly experimental", () => {
  const model = globalThis.AthlysNeuralIntentModel;
  assert.ok(model);
  assert.equal(model.metadata.version, "athlys-neural-intent-0.1.0");
  assert.equal(model.metadata.experimental_only, true);
  assert.ok(Buffer.byteLength(fs.readFileSync(modelPath)) < 100000);
});

test("the neural model classifies common French training questions", () => {
  const model = globalThis.AthlysNeuralIntentModel;
  const result = model.classify("Montre ma charge de la semaine");
  assert.equal(result.intent, "show_load");
  assert.ok(result.confidence > 0);
});

test("local assistant uses neural intent when confidence and margin gates pass", () => {
  const result = engine.localAssistantReply("Montre ma charge de la semaine", { logs: [] });
  assert.equal(result.engine.remote, false);
  assert.equal(result.engine.inference, "homemade_neural_mlp");
  assert.match(result.reply, /charge interne|séance|durée|RPE/i);
});

test("the deterministic parser remains available and requires coach review", () => {
  const parsed = engine.parseProgram("Mardi : 6 x 400 m à RPE 7/10, récupération 2 min", { discipline: "athlétisme" });
  assert.equal(parsed.sessions.length, 1);
  assert.equal(parsed.sessions[0].planned_rpe, 7);
  assert.equal(parsed.requires_coach_review, true);
});

test("desktop, mobile and PWA entry points load the model before local intelligence", () => {
  for (const file of ["../web/index.html", "../web/app.html", "../web/mobile.html"]) {
    const html = fs.readFileSync(path.join(__dirname, file), "utf8");
    const model = html.indexOf('src="/athlys-neural-intent-model.js"');
    const engineIndex = html.indexOf('src="/athlys-local-intelligence.js"');
    const appIndex = html.indexOf('src="/app.js"');
    assert.ok(model >= 0 && engineIndex > model && appIndex > engineIndex, file);
  }
});

test("the PWA precaches the neural asset", () => {
  const sw = fs.readFileSync(path.join(__dirname, "../web/sw.js"), "utf8");
  assert.ok(sw.includes('"/athlys-neural-intent-model.js"'));
});

test("the neural model does not perform network inference", () => {
  const source = fs.readFileSync(modelPath, "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket/);
});
