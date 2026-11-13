const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..","web"),out=path.resolve(__dirname,"web");
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(path.join(out,"assets"),{recursive:true});
for(const name of ["club-app.html","club.css","club.js","app-config.js","mobile-loader.css","app-visual-polish.css"]){const src=path.join(root,name);if(!fs.existsSync(src))throw new Error("Missing "+src);fs.copyFileSync(src,path.join(out,name==="club-app.html"?"index.html":name))}
for(const name of ["athlys-logo.svg","athlys-logo.png","athlys-lockup.svg"]){const src=path.join(root,"assets",name);if(fs.existsSync(src))fs.copyFileSync(src,path.join(out,"assets",name))}
