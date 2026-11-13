"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("Coach desktop, Coach mobile and Club app share the approved visual layer", () => {
  const entrypoints = ["web/index.html", "web/app.html", "web/mobile.html", "web/club-app.html"];
  for (const file of entrypoints) {
    const html = read(file);
    assert.match(html, /href=["']\/app-visual-polish\.css(?:\?[^"']*)?["']/i, file);
  }
  assert.match(read("web/club-app.html"), /\/club\.css/);
  assert.match(read("web/mobile.html"), /\/mobile-app\.css/);
});

test("visual system exposes the Athlys navy, ivory, cyan, green and orange tokens", () => {
  const css = read("web/app-visual-polish.css");
  for (const token of [
    "--athlys-ratio-navy: 50%",
    "--athlys-ratio-ivory: 30%",
    "--athlys-ratio-cyan: 10%",
    "--athlys-ratio-green: 5%",
    "--athlys-ratio-orange: 5%",
    "--athlys-bg: #13213c",
    "--athlys-surface: #F3F0EC"
  ]) assert.ok(css.includes(token), "missing visual token: " + token);
  assert.match(css, /prefers-reduced-motion/);
});

test("PWA refreshes its shell cache and precaches the local AI/ML and visual assets", () => {
  const sw = read("web/sw.js");
  assert.match(sw, /athlys-shell-v47-local-ai-ui-validation/);
  for (const asset of [
    '"/app-visual-polish.css"',
    '"/athlys-neural-intent-model.js"',
    '"/athlys-local-intelligence.js"',
    '"/app.js"'
  ]) assert.ok(sw.includes(asset), "missing PWA precache asset: " + asset);
});

test("assistant, programme parser and athlete-specific ML all route through the local kernel", () => {
  const app = read("web/app.js");
  assert.match(app, /engine\.localAssistantReply\(prompt,context\)/);
  assert.match(app, /engine\.parseProgramLocally\(source/);
  assert.match(app, /engine\.projectRPE\(/);
  assert.match(app, /engine\.generateScenarios\(/);
  assert.match(app, /filter\(function\(x\)\{return x\.athlete_id===athleteId;\}\)/);
});

test("the deterministic local kernel does not make remote inference requests", () => {
  const kernel = read("web/athlys-local-intelligence.js");
  const model = read("web/athlys-neural-intent-model.js");
  for (const [name, source] of [["kernel", kernel], ["model", model]]) {
    assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|new\s+WebSocket\s*\(/, name);
  }
});

test("the Club administrative app remains separate from athlete-level AI/ML", () => {
  const club = read("web/club-app.html");
  assert.match(club, /\/club\.js/);
  assert.doesNotMatch(club, /athlys-neural-intent-model|athlys-local-intelligence/);
});
