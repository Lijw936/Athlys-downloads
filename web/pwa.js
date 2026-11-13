(function () {
  "use strict";
  if (!("serviceWorker" in navigator)) return;
  var reloaded = false;

  function offerUpdate(registration) {
    if (!registration.waiting || document.getElementById("athlys-update-banner")) return;
    var banner = document.createElement("aside");
    banner.id = "athlys-update-banner";
    banner.setAttribute("role", "status");
    banner.style.cssText = "position:fixed;z-index:90;left:12px;right:12px;top:12px;display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid #40536f;border-radius:14px;background:#101e35;color:#f4f7fc;box-shadow:0 12px 36px #0007;font:13px system-ui";
    banner.innerHTML = '<span style="flex:1;line-height:1.4"><strong>Nouvelle version d’Athlys disponible</strong><br><small style="color:#b8c5d8">Actualise pour profiter des dernières améliorations.</small></span><button type="button" style="min-height:40px;padding:8px 13px;border:0;border-radius:10px;background:#ff8a45;color:#111827;font-weight:800">Actualiser</button>';
    document.body.appendChild(banner);
    banner.querySelector("button").addEventListener("click", function () {
      if (registration.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
    });
  }

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(function (registration) {
      if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration);
      registration.addEventListener("updatefound", function () {
        var worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", function () {
          if (worker.state === "installed" && navigator.serviceWorker.controller) offerUpdate(registration);
        });
      });
      window.addEventListener("focus", function () { registration.update().catch(function () {}); });
    }).catch(function (error) {
      console.warn("Athlys offline shell unavailable:", error);
    });
  });

  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
})();