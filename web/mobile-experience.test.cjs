"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

test("mobile entry uses official loader and does not load Quantum",()=>{
 const html=read("web/mobile.html");
 assert.match(html,/data-athlys-mobile="true"/);
 assert.match(html,/id="athlys-auth-loader"/);
 assert.match(html,/role="progressbar"/);
 assert.match(html,/\/assets\/athlys-lockup\.svg/);
 assert.match(html,/#FA923B[\s\S]*?#24D3EE[\s\S]*?#B5F348/);
 assert.doesNotMatch(html,/quantum-engine\.js/);
 assert.match(html,/auth-branding\.css/);
 assert.match(html,/athlys-ui\.css/);
 assert.match(html,/mobile-loader\.css/);
});

test("Quantum remains a coach-only desktop view, uses server inference and is removed from mobile navigation",()=>{
 const app=read("web/app.js"),desktop=read("web/index.html"),css=read("web/mobile-app.css");
 assert.match(app,/function isMobileEntry\(\)/);
 assert.match(app,/if\(isMobileEntry\(\)\)tabs=tabs\.filter/);
 assert.match(app,/isMobileEntry\(\)&&b\.dataset\.nav==="quantum"/);
 assert.match(app,/function quantumDateOffset\(/);
 assert.match(app,/\["quantum","Quantum","✧"\]/);
 assert.match(app,/db\.functions\.invoke\("athlys-quantum-analysis"/);
 assert.doesNotMatch(desktop,/quantum-engine\.js/);
 assert.doesNotMatch(css,/mobile-nav:has\(button:nth-child\(6\)\)/);
});

test("authentication has real loader stages, official lockup and accessible password toggle",()=>{
 const app=read("web/app.js"),css=read("web/auth-branding.css"),loader=read("web/mobile-loader.css");
 assert.match(app,/function authLoaderUpdate\(progress,label\)/);
 assert.match(app,/function authLoaderShow\(label,progress\)/);
 assert.match(app,/function authLoaderHide\(\)/);
 assert.match(app,/authLoaderUpdate\(100,session\?"Espace prêt":"Connexion disponible"\)/);
 assert.match(app,/function authBrandMarkup\(\)/);
 assert.match(app,/function authPage\(err\)\{return authPageMobile\(err\)\}/);
 assert.match(app,/function resetPage\(\)\{return resetPageMobile\(\)\}/);
 assert.match(app,/data-action="password-toggle"/);
 assert.match(app,/authLoaderHide\(\);return/);
 assert.match(css,/#13213c/);
 assert.match(loader,/\.athlys-auth-loader__progress/);
 assert.match(loader,/prefers-reduced-motion:reduce/);
});

test("mobile theme and service worker cache all new assets",()=>{
 const manifest=JSON.parse(read("web/mobile.webmanifest"));
 assert.equal(manifest.theme_color,"#13213c");
 assert.equal(manifest.background_color,"#13213c");
 const sw=read("web/sw.js");
 assert.match(sw,/const CACHE_NAME = "athlys-shell-v[0-9]+-[a-z0-9-]+";/);
 assert.doesNotMatch(sw,/athlys-shell-v40-server-side-quantum/);
 assert.doesNotMatch(sw,/const IS_MOBILE =/);
 assert.ok(sw.includes("cache.addAll(SHELL)"));
 assert.doesNotMatch(sw,/quantum-engine\.js/);
 const shellStart=sw.indexOf("const SHELL = ["),shellEnd=sw.indexOf("];",shellStart);
 assert.ok(shellStart>=0&&shellEnd>shellStart&&!sw.slice(shellStart,shellEnd).includes("quantum-engine.js"));
 for(const asset of ["auth-branding.css","athlys-ui.css","mobile-loader.css","assets/athlys-lockup.svg"])assert.ok(sw.includes(asset),asset);
});

test("IRL package version is defined by the current build preparation",()=>{
 const workflow=read(".github/workflows/irl-public.yml"),prepare=read("scripts/prepare-irl-build.py");
 assert.match(workflow,/Athlys-1\.3\.14-LM-IRL\.apk/);
 assert.match(prepare,/1\.3\.14-irl/);
 assert.match(prepare,/applicationIdSuffix/);
});


test("desktop Athlys and Club download packages include official branded startup loaders",()=>{ const desktop=read("web/index.html"),club=read("web/club-app.html"),clubCopy=read("desktop-club/copy-web.cjs"),clubCss=read("web/club.css"),clubJs=read("web/club.js"); for(const html of [desktop,club]){assert.match(html,/id="athlys-auth-loader"/);assert.match(html,/data-loader-ring/);assert.match(html,/\/assets\/athlys-lockup\.svg/);assert.match(html,/mobile-loader\.css/);} assert.match(desktop,/athlys-ui\.css/);assert.match(club,/\/club\.js/);assert.match(clubCopy,/club-app\.html/);assert.match(clubCopy,/mobile-loader\.css/);assert.match(clubCopy,/athlys-lockup\.svg/);assert.match(clubCss,/#13213c/);assert.match(clubCss,/#24D3EE/);assert.match(clubCss,/#B5F348/);assert.match(clubCss,/#FA923B/);});


test("all Athlys application shells load the shared visual refinement",()=>{
 const entries=["web/index.html","web/app.html","web/mobile.html","web/club-app.html"];
 for(const file of entries)assert.ok(read(file).includes("/athlys-ui.css"),file);
 const css=read("web/athlys-ui.css");
 for(const token of ["#10203a","#24D3EE","#B5F348","#FA923B","#0d1a2f"])assert.ok(css.includes(token),token);
 assert.ok(css.includes("body.athlys-club-app"));
 assert.ok(css.includes("prefers-reduced-motion"));
 assert.ok(read("web/sw.js").includes('"/athlys-ui.css"'));
 assert.ok(read("desktop-club/copy-web.cjs").includes("athlys-ui.css"));
 assert.ok(read("web/club-app.html").includes('<body class="athlys-club-app">'));
});


test("mobile messaging uses a contact list, a focused conversation and a return action",()=>{
 const app=read("web/app.js"),css=read("web/athlys-ui.css");
 assert.match(app,/chatMobileListOpen=true/);
 assert.match(app,/data-action="chat-back"/);
 assert.match(app,/a==="chat-back"/);
 assert.match(app,/mobile-list-open/);
 assert.match(app,/mobile-conversation-open/);
 assert.match(app,/athlys-chat-open/);
 assert.match(css,/\.chat-page\.mobile-list-open/);
 assert.match(css,/\.chat-page\.mobile-conversation-open/);
 assert.match(css,/\.chat-back/);
});


test("chat keeps Athlys navigation visible and uses a full-width messaging layout",()=>{
 const css=read("web/mobile-app.css"),ui=read("web/athlys-ui.css"),app=read("web/app.js");
 assert.match(css,/body\.athlys-chat-open #athlys \.mobile-nav\{display:grid!important/);
 assert.doesNotMatch(css,/body\.athlys-chat-open #athlys \.mobile-nav\{display:none!important/);
 assert.match(css,/body\.athlys-chat-open #athlys \.chat-page\.mobile-list-open \.chat-contacts/);
 assert.match(css,/body\.athlys-chat-open #athlys \.chat-page\.mobile-conversation-open \.chat-conversation/);
 assert.match(ui,/\.chat-thread \.message-bubble\.mine/);
 assert.match(ui,/\.chat-composer \.btn\.primary/);
 assert.match(app,/data-action="chat-back"/);
 assert.match(app,/data-form="message"/);
});
