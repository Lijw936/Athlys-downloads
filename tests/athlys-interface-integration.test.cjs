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
    assert.match(html, /href=["']\/athlys-ui\.css(?:\?[^"']*)?["']/i, file);
  }
  assert.match(read("web/club-app.html"), /\/club\.css/);
  assert.match(read("web/mobile.html"), /\/mobile-app\.css/);
});

test("visual system exposes the Athlys navy, ivory, cyan, green and orange tokens", () => {
  const css = read("web/athlys-ui.css");
  for (const token of [
    "--athlys-navy:#10203a",
    "--athlys-lime:#B5F348",
    "--athlys-cyan:#24D3EE",
    "--athlys-orange:#FA923B",
    "--bg:#0d1a2f",
    "--surface:#15263f"
  ]) assert.ok(css.includes(token), "missing visual token: " + token);
  assert.match(css, /prefers-reduced-motion/);
});

test("PWA refreshes its shell cache and precaches the local AI/ML and visual assets", () => {
  const sw = read("web/sw.js");
  assert.match(sw, /athlys-shell-v62-ui-navigation/);
  for (const asset of [
    '"/athlys-ui.css"',
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
