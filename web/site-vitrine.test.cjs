"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

const pages = [
  ["web/landing.html", "https://athlys-vitrine.vercel.app/"],
  ["web/histoire.html", "https://athlys-vitrine.vercel.app/histoire.html"],
  ["web/club.html", "https://athlys-vitrine.vercel.app/club.html"],
  ["web/telecharger.html", "https://athlys-vitrine.vercel.app/telecharger.html"],
  ["web/contact.html", "https://athlys-vitrine.vercel.app/contact.html"]
];

test("all public tabs share the same five-link navigation and active-page shell", () => {
  for (const [file, canonical] of pages) {
    const html = read(file);
    const navStart = html.indexOf('<nav class="site-nav"');
    const navEnd = html.indexOf("</nav>", navStart);
    assert.ok(navStart >= 0 && navEnd > navStart, file + ": desktop navigation missing");
    const nav = html.slice(navStart, navEnd);
    assert.equal(nav.split("<a ").length - 1, 5, file + ": expected exactly five main links");
    assert.doesNotMatch(nav, /discipline/i, file + ": discipline must not be a navigation item");
    assert.ok(html.includes('aria-controls="site-mobile-drawer"'), file + ": menu control missing");
    assert.ok(html.includes('id="site-mobile-drawer"') && html.includes('aria-hidden="true" inert'), file + ": closed drawer must be inert");
    assert.match(html, /<h1[^>]*data-typing/, file + ": typing heading missing");
    assert.ok(html.includes('<meta name="theme-color" content="#13213c">'), file + ": brand theme color mismatch");
    assert.ok(html.includes('<link rel="canonical" href="' + canonical + '">'), file + ": canonical URL mismatch");
    assert.ok(html.includes('property="og:title"') && html.includes('property="og:description"'), file + ": Open Graph metadata missing");
    assert.ok(html.includes("site.css?v=20261109-quality-v2"), file + ": CSS cache version missing");
    assert.ok(html.includes("site.js?v=20261109-quality-v2"), file + ": JS cache version missing");
  }
});

test("mobile navigation is keyboard-safe and inaccessible while closed", () => {
  const js = read("web/site.js");
  assert.ok(js.includes("drawer.inert=!open"));
  assert.ok(js.includes("drawer.setAttribute('aria-hidden',String(!open))"));
  assert.ok(js.includes("if(e.key==='Escape')"));
  assert.ok(js.includes("if(e.key!=='Tab')return"));
  assert.ok(js.includes("e.shiftKey&&document.activeElement===first"));
  assert.ok(js.includes("!e.shiftKey&&document.activeElement===last"));
  assert.ok(js.includes("aria-expanded"));
});

test("typing titles keep a complete accessible label and respect reduced motion", () => {
  const js = read("web/site.js");
  const css = read("web/site.css");
  assert.ok(js.includes("prefers-reduced-motion: reduce"));
  assert.ok(js.includes("heading.setAttribute('aria-label',fullText)"));
  assert.ok(js.includes("visual.setAttribute('aria-hidden','true')"));
  assert.ok(css.includes("@media(prefers-reduced-motion:reduce)"));
  assert.ok(css.includes(".reveal,.reveal.is-visible{opacity:1!important;transform:none!important;transition:none!important}"));
});

test("small-screen header has a fitting layout and desktop menu button stays hidden", () => {
  const css = read("web/site.css");
  assert.ok(css.includes(".menu-button{display:none}"));
  assert.ok(css.includes("@media(max-width:1020px){.menu-button{display:grid}}"));
  assert.ok(css.includes("@media(max-width:390px)"));
  assert.ok(css.includes("width:118px"));
});

test("public site exposes a crawlable robots policy and a sitemap for real pages", () => {
  const robots = read("web/robots.txt");
  const sitemap = read("web/sitemap.xml");
  assert.ok(robots.includes("User-agent: *"));
  assert.ok(robots.includes("Allow: /"));
  assert.ok(robots.includes("https://athlys-vitrine.vercel.app/sitemap.xml"));
  for (const [, url] of pages) assert.ok(sitemap.includes("<loc>" + url + "</loc>"), url);
  assert.ok(sitemap.includes("https://athlys-vitrine.vercel.app/club-demo.html"));
  const demo = read("web/club-demo.html");
  assert.ok(demo.includes('<link rel="canonical" href="https://athlys-vitrine.vercel.app/club-demo.html">'));
  assert.ok(demo.includes('<meta name="theme-color" content="#13213c">'));
});
