const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "web/app.js"), "utf8");
const assistant = fs.readFileSync(path.join(root, "supabase/functions/athlys-assistant/index.ts"), "utf8");
const engine = fs.readFileSync(path.join(root, "web/athlys-local-intelligence.js"), "utf8");
const desktop = fs.readFileSync(path.join(root, "web/index.html"), "utf8");
const mobile = fs.readFileSync(path.join(root, "web/mobile.html"), "utf8");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

function block(startMarker, endMarker) {
  const start = app.indexOf(startMarker);
  const end = app.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, "Expected source block was not found");
  return app.slice(start, end);
}

test("assistant chat uses local understanding and locally available authorized context", () => {
  const request = block("async function assistantRequest(prompt,mode){", "async function assistantHandle(text)");
  assert.match(request, /assistantLocalContext()/);
  assert.ok(app.includes("engine.localAssistantReply(prompt,context)"));
  assert.doesNotMatch(request, /functions.invoke|fetch\s*\(/);
});

test("assistant context is scoped to one active athlete and their programmes", () => {
  assert.ok(app.includes("selectedAthleteId"));
  assert.ok(app.includes("x.athlete_id===athleteId"));
  assert.ok(app.includes("programIds.indexOf(x.program_id)>=0"));
});

test("assistant insights execute locally without a remote inference request", () => {
  const loader = block("function assistantLoadInsights(force){", "async function assistantConfirm()");
  assert.match(loader, /AthlysLocalIntelligence.localInsights/);
  assert.doesNotMatch(loader, /functions.invoke|fetch\s*\(/);
});

test("only an explicit public web-search request may call the assistant Edge Function", () => {
  const search = block("function assistantSearchWeb(query)", "function assistantLocalContext()");
  assert.match(search, /mode:"search"/);
  assert.ok(app.includes("return /(sur le web|sur internet|recherche web"), "Search must require an explicit public-search phrase");
  const invocations = app.match(/functions\.invoke\("athlys-assistant"/g) || [];
  assert.equal(invocations.length, 1);
  assert.doesNotMatch(app, /functions\.invoke\("athlys-assistant",\{body:\{mode:\s*["'](?:chat|insights|parse)["']/);
});

test("coach programme parse is local and persists only after preview hash validation", () => {
  assert.ok(app.includes("engine.parseProgramLocally(source"), "Programme parser must be local");
  assert.ok(app.includes("sourceHash:engine.hashText(source)"));
  assert.ok(app.includes("sourceDigestSha256:sourceDigestSha256"));
  assert.ok(app.includes("await window.AthlysLocalIntelligence.sha256Text(sourceText)"));
  assert.ok(app.includes("source_digest_sha256:programDraftToSave.sourceDigestSha256"));
  assert.match(app, /training_program_imports/);
  assert.match(app, /status:"accepted"/);
  assert.match(app, /programDraftToSave/);
});

test("completed training logs can be linked to the planned session for RPE calibration", () => {
  assert.match(app, /program_session_id:v\("program_session_id"\)\|\|null/);
  assert.match(app, /Séance planifiée associée/);
});

test("deterministic local parser and RPE kernel contain no networking", () => {
  assert.match(engine, /function parseProgram\(/);
  assert.match(engine, /function projectRPE\(/);
  assert.match(engine, /function generateScenarios\(/);
  assert.match(engine, /uncertaintyLabel/);
  assert.doesNotMatch(engine, /fetch\s*\(|XMLHttpRequest|WebSocket/);
});

test("both app shells load the local kernel before app.js", () => {
  for (const html of [desktop, mobile]) {
    assert.ok(html.indexOf('src="/athlys-local-intelligence.js"') >= 0);
    assert.ok(html.indexOf('src="/athlys-local-intelligence.js"') < html.indexOf('src="/app.js"'));
  }
});

test("the installed base app excludes model weights and heavyweight inference dependencies", () => {
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  assert.deepEqual(Object.keys(dependencies).filter(name => /llm|webllm|llama|transformers|onnxruntime|wllama/i.test(name)), []);
  const forbidden = /\.(?:gguf|ggml|onnx|safetensors|tflite|mlmodel|pt|pth|litertlm)$/i;
  const roots = ["web", "android", "ios", "native"].map(name => path.join(root, name)).filter(fs.existsSync);
  const found = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (forbidden.test(entry.name)) found.push(path.relative(root, file));
    }
  }
  roots.forEach(walk);
  assert.deepEqual(found, []);
});

test("legacy server model path remains isolated from client-side chat", () => {
  assert.match(assistant, /hasPersonalSensitiveContext/);
  assert.match(assistant, /reserveRemoteInferenceQuota/);
  const request = block("async function assistantRequest(prompt,mode){", "async function assistantHandle(text)");
  assert.doesNotMatch(request, /athlys-assistant/);
});


test("coach can edit normalized programme fields and refresh scenarios before saving", () => {
  assert.match(app, /data-program-edit="title"/);
  assert.match(app, /data-program-edit="planned_date"/);
  assert.match(app, /data-program-edit="duration_minutes"/);
  assert.match(app, /data-program-edit="planned_rpe"/);
  assert.match(app, /coachEdits\[index\]\[field\]/);
  assert.match(app, /id="program-preview-scenarios"/);
  assert.match(app, /coach_edits:programDraftToSave\.coachEdits/);
});
