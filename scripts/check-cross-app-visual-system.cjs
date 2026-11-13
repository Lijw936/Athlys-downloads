#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const entries = ["web/index.html", "web/app.html", "web/mobile.html", "web/club-app.html"];
for (const file of entries) {
  const html = read(file);
  if (!html.includes("/app-visual-polish.css")) {
    throw new Error(file + " does not load the shared application visual stylesheet.");
  }
}
const css = read("web/app-visual-polish.css");
for (const token of ["#13213c", "#24D3EE", "#B5F348", "#FA923B", "#F3F0EC"]) {
  if (!css.includes(token)) throw new Error("Missing approved Athlys visual token: " + token);
}
if (!css.includes("body.athlys-club-app")) throw new Error("Club visual scope is missing.");
if (!css.includes("prefers-reduced-motion")) throw new Error("Reduced-motion support is missing.");
if (/#(?:18142B|211D38|3b3566|79505c)/i.test(css)) {
  throw new Error("Legacy purple treatment found in the shared application visual layer.");
}
if (!read("web/sw.js").includes('"/app-visual-polish.css"')) {
  throw new Error("PWA shell does not precache app-visual-polish.css.");
}
if (!read("desktop-club/copy-web.cjs").includes("app-visual-polish.css")) {
  throw new Error("Club Electron packaging does not copy app-visual-polish.css.");
}
function luminance(hex) {
  const values = hex.replace("#", "").match(/.{2}/g).map(value => parseInt(value, 16) / 255);
  const [r, g, b] = values.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * r + .7152 * g + .0722 * b;
}
function contrast(foreground, background) {
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
for (const foreground of ["#12677E", "#536477", "#5D6B7C", "#476B1D", "#A0521C", "#A23E3A"]) {
  if (contrast(foreground, "#F3F0EC") < 4.5) {
    throw new Error("Light-theme text contrast below WCAG AA: " + foreground);
  }
}
if (contrast("#24D3EE", "#13213c") < 4.5) {
  throw new Error("Primary blue action contrast below WCAG AA.");
}
const officialTokens = ["--athlys-space-1", "--athlys-radius-card", "--athlys-content-width", "#FBF9F4", "#EAE4D9"];
for (const token of officialTokens) {
  if (!css.includes(token)) throw new Error("Missing official design-system token: " + token);
}
const designGuide = read("docs/ATHLYS-VISUAL-SYSTEM.md");
for (const section of ["## 1. Intention de design", "## 2. Palette officielle", "## 9. Règles non négociables"]) {
  if (!designGuide.includes(section)) throw new Error("Official visual guide is incomplete: " + section);
}
for (const file of entries) {
  if (!read(file).includes("app-visual-polish.css?v=20261114")) {
    throw new Error(file + " does not load the current official visual-system revision.");
  }
}
console.log("Athlys official visual system v2: PASS (" + entries.length + " app entry points, brand tokens, responsive and accessibility rules).");
