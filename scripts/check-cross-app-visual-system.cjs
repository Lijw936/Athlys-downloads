#!/usr/bin/env node
"use strict";
const fs=require("node:fs");
const path=require("node:path");
const assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const entries=["web/index.html","web/app.html","web/mobile.html","web/club-app.html"];
for(const file of entries){
 const html=read(file);
 assert.match(html,/\/athlys-ui\.css\?v=20261113d/,file+" missing unified visual theme");
 assert.doesNotMatch(html,/\/(?:refonte|athlys-design-system|app-visual-polish|athlys-warm-ux)\.css/,file+" still loads conflicting palette");
}
const css=read("web/athlys-ui.css");
for(const token of ["--athlys-navy:#10203a","--athlys-lime:#B5F348","--athlys-cyan:#24D3EE","--athlys-orange:#FA923B","--bg:#0d1a2f","--surface:#15263f","--text:#f3f6fa","prefers-reduced-motion","-webkit-text-fill-color"]){
 assert.ok(css.includes(token),"Missing new Athlys design or accessibility token: "+token);
}
assert.doesNotMatch(css,/#(?:18142B|211D38|3b3566|79505c)/i);
const sw=read("web/sw.js");
assert.ok(/athlys-shell-v62-ui-navigation/.test(sw),"PWA cache version must match the device-mesh shell");
for(const asset of ['"/athlys-ui.css"','"/athlys-neural-intent-model.js"','"/athlys-local-intelligence.js"','"/athlys-knowledge.js"'])assert.ok(sw.includes(asset),"Missing precache "+asset);
const club=read("desktop-club/copy-web.cjs");
assert.ok(club.includes("athlys-ui.css"),"Club packaging does not include the new stylesheet");
function luminance(hex){
 const values=hex.replace("#","").match(/.{2}/g).map(v=>parseInt(v,16)/255);
 const [r,g,b]=values.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return .2126*r+.7152*g+.0722*b;
}
function contrast(a,b){
 const x=luminance(a),y=luminance(b);
 return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
assert.ok(contrast("#f3f6fa","#0d1a2f")>=4.5,"Main dark theme has insufficient text contrast");
assert.ok(contrast("#b2bfd1","#15263f")>=4.5,"Muted text insufficient contrast");
assert.ok(contrast("#0d1a2f","#B5F348")>=4.5,"Primary button insufficient contrast");
for(const accent of ["#24D3EE","#B5F348","#FA923B"]){
 assert.ok(contrast(accent,"#15263f")>=4.5,"Accent on dark surface insufficient contrast: "+accent);
 assert.ok(contrast("#0d1a2f",accent)>=4.5,"Action text insufficient contrast: "+accent);
}
for(const accent of ["#08748A","#496B1B","#9A4F16"]){
 assert.ok(contrast(accent,"#F3F0EC")>=4.5,"Accent on light surface insufficient contrast: "+accent);
}
console.log("Athlys unified UI: PASS ("+entries.length+" entrypoints, tokens, contrast, cache and Club packaging).");

