const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..","web"),out=path.resolve(__dirname,"web");
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(path.join(out,"assets"),{recursive:true});
for(const name of ["club-app.html","athlys-ui-runtime.js","app.css","club.css","club.js","app-config.js","mobile-loader.css","athlys-ui.css","supabase-client.bundle.js","trial.html","trial.js","trial-status.json","athlys-local-intelligence.js"]){const src=path.join(root,name);if(!fs.existsSync(src))throw new Error("Missing "+src);fs.copyFileSync(src,path.join(out,name==="club-app.html"?"index.html":name))}
for(const name of ["athlys-logo.svg","athlys-logo.png","athlys-lockup.svg"]){const src=path.join(root,"assets",name);if(fs.existsSync(src))fs.copyFileSync(src,path.join(out,"assets",name))}

// Keep the named Club entry for local links, and limit diagnostics to this package.
fs.copyFileSync(path.join(out,"index.html"),path.join(out,"club-app.html"));
const trial=path.join(out,"trial.html");fs.writeFileSync(trial,fs.readFileSync(trial,"utf8").replace(/<nav aria-label="Applications">[\s\S]*?<\/nav>/,'<nav aria-label="Applications"><a class="btn" href="/index.html">Retour à Athlys Club</a></nav>'));
