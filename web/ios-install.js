(function () {
  "use strict";
  var ua = navigator.userAgent || "";
  var isAppleMobile = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome/i.test(ua);
  var isStandalone = window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  if (!isAppleMobile || isStandalone) return;

  function safeGet(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, value) {
    try { sessionStorage.setItem(key, value); } catch (e) {}
  }
  function showGuide() {
    if (document.getElementById("athlys-install-guide")) return;
    var overlay = document.createElement("div");
    overlay.id = "athlys-install-guide";
    overlay.className = "athlys-install-overlay";
    var steps = isSafari
      ? '<li>Appuie sur <strong>Partager</strong> <span aria-hidden="true">□↑</span> dans Safari.</li><li>Fais défiler le menu et choisis <strong>Sur l’écran d’accueil</strong>.</li><li>Active si proposé <strong>Ouvrir comme app web</strong>, puis valide avec <strong>Ajouter</strong>.</li>'
      : '<li>Ouvre le menu de ton navigateur et choisis <strong>Partager</strong> ou <strong>Ouvrir dans Safari</strong>.</li><li>Dans Safari, appuie sur <strong>Partager</strong> <span aria-hidden="true">□↑</span>.</li><li>Choisis <strong>Sur l’écran d’accueil</strong>, puis valide avec <strong>Ajouter</strong>.</li>';
    overlay.innerHTML = '<section class="athlys-install-card" role="dialog" aria-modal="true" aria-labelledby="athlys-install-title">' +
      '<button class="athlys-install-close" type="button" aria-label="Fermer">×</button>' +
      '<img src="/assets/athlys-logo.png" alt="" width="56" height="56">' +
      '<p class="athlys-install-eyebrow">ATHLYS SUR IPHONE</p>' +
      '<h2 id="athlys-install-title">Ajoute Athlys à ton écran d’accueil</h2>' +
      '<ol>' + steps + '</ol>' +
      '<button class="athlys-install-done" type="button">Compris</button></section>';
    document.body.appendChild(overlay);
    function close() { overlay.remove(); }
    overlay.querySelector(".athlys-install-close").addEventListener("click", close);
    overlay.querySelector(".athlys-install-done").addEventListener("click", close);
    overlay.addEventListener("click", function (event) { if (event.target === overlay) close(); });
  }

  function mountBanner() {
    if (safeGet("athlys-install-dismissed") === "1" || document.getElementById("athlys-install-banner")) return;
    var banner = document.createElement("aside");
    banner.id = "athlys-install-banner";
    banner.className = "athlys-install-banner";
    banner.innerHTML = '<span><strong>Emporte Athlys partout</strong><small>' +
      (isSafari ? "Installe Athlys sur ton écran d’accueil" : "Ouvre Athlys dans Safari pour l’installer") +
      '</small></span><button type="button">Installer</button><button class="athlys-install-dismiss" type="button" aria-label="Masquer">×</button>';
    document.body.appendChild(banner);
    banner.querySelector("button:not(.athlys-install-dismiss)").addEventListener("click", showGuide);
    banner.querySelector(".athlys-install-dismiss").addEventListener("click", function () {
      safeSet("athlys-install-dismissed", "1");
      banner.remove();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountBanner, { once: true });
  else mountBanner();
})();