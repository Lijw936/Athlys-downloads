const fs=require("node:fs"),path=require("node:path");
const source=path.resolve(__dirname,"../web"),destination=path.resolve(__dirname,"web");
const assets=require("../scripts/client-assets.json");
fs.rmSync(destination,{recursive:true,force:true});fs.mkdirSync(destination,{recursive:true});
for(const name of assets){const file=path.join(source,name);if(!fs.existsSync(file))throw Error("Missing client asset: "+name);fs.copyFileSync(file,path.join(destination,name));}
fs.cpSync(path.join(source,"assets"),path.join(destination,"assets"),{recursive:true});
console.log("Reviewed Athlys application assets copied; development/tests/showcase excluded.");
