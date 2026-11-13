const fs = require("node:fs");
const path = require("node:path");

const source = path.resolve(__dirname, "..", "web");
const destination = path.resolve(__dirname, "web");

if (!fs.existsSync(path.join(source, "index.html"))) {
  throw new Error("The root web application is missing (web/index.html).");
}

fs.rmSync(destination, { recursive: true, force: true });
fs.cpSync(source, destination, {
  recursive: true,
  filter: (entry) => !entry.endsWith(".DS_Store")
});

for (const required of ["index.html", "app.js", "app-config.js", "offline-store.js", "sw.js"]) {
  if (!fs.existsSync(path.join(destination, required))) {
    throw new Error("Desktop bundle incomplete: " + required);
  }
}
console.log("Athlys web client copied into the desktop package.");
