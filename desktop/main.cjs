const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");

let APP_ORIGIN = "";
let APP_URL = "";
let localServer = null;

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".mp4": "video/mp4"
};

function isTrustedAppUrl(rawUrl) {
  try { return new URL(rawUrl).origin === APP_ORIGIN; }
  catch { return false; }
}

function startLocalServer() {
  return new Promise((resolve, reject) => {
    const root = path.resolve(__dirname, "web");
    if (!fs.existsSync(path.join(root, "index.html"))) {
      reject(new Error("Athlys Desktop bundle missing. Rebuild with npm run dist."));
      return;
    }
    localServer = http.createServer((req, res) => {
      let pathname;
      try { pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname); }
      catch { res.writeHead(400).end("Bad request"); return; }
      if (pathname === "/") pathname = "/index.html";
      const target = path.resolve(root, "." + pathname);
      if (target !== root && !target.startsWith(root + path.sep)) {
        res.writeHead(403).end("Forbidden"); return;
      }
      fs.readFile(target, (error, data) => {
        if (error) {
          res.writeHead(error.code === "ENOENT" ? 404 : 500, {
            "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store"
          }).end(error.code === "ENOENT" ? "Not found" : "Local application error");
          return;
        }
        res.writeHead(200, {
          "Content-Type": MIME[path.extname(target).toLowerCase()] || "application/octet-stream",
          "Cache-Control": path.basename(target) === "sw.js" ? "no-cache" : "no-store",
          "X-Content-Type-Options": "nosniff"
        });
        res.end(data);
      });
    });
    localServer.once("error", reject);
    localServer.listen(41731, "127.0.0.1", () => {
      APP_ORIGIN = "http://127.0.0.1:41731";
      APP_URL = APP_ORIGIN + "/?athlysClient=desktop";
      resolve();
    });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1500, height: 960, minWidth: 1100, minHeight: 700,
    show: false, autoHideMenuBar: true, backgroundColor: "#13213c",
    icon: path.join(__dirname, process.platform === "darwin" ? "athlys.icns" : "athlys.ico"),
    title: "Athlys Desktop",
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: true }
  });
  win.once("ready-to-show", () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("mailto:") || url.startsWith("https://")) {
      if (!isTrustedAppUrl(url)) shell.openExternal(url);
    }
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedAppUrl(url)) {
      event.preventDefault();
      if (url.startsWith("https://") || url.startsWith("mailto:")) shell.openExternal(url);
    }
  });
  win.webContents.on("did-fail-load", (_event, errorCode, _description, _validatedURL, isMainFrame) => {
    if (isMainFrame && errorCode !== -3 && !win.isDestroyed()) win.loadFile(path.join(__dirname, "offline.html"));
  });
  win.loadURL(APP_URL);
}

const hasSingleInstance = app.requestSingleInstanceLock();
if (hasSingleInstance) app.whenReady().then(async () => {
  app.setAppUserModelId("com.athlys.desktop");
  await startLocalServer();
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}).catch(error => {
  console.error("Athlys Desktop startup failed:", error);
  app.quit();
});
else app.quit();
app.on("before-quit", () => { if (localServer) localServer.close(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
