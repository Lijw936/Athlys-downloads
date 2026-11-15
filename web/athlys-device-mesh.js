(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AthlysDeviceMesh = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var TOPICS = Object.freeze({rpe:'RPE',ctl:'CTL',atl:'ATL',acwr:'ACWR',ewma:'EWMA'});
  var DEFINITIONS = Object.freeze({
    rpe:"RPE veut dire perception subjective de l'effort. L'athlète déclare son ressenti. Une estimation ne remplace pas ce ressenti déclaré.",
    ctl:"CTL décrit la charge chronique calculée à partir de l'historique. Ce n'est pas une mesure physiologique directe ni une probabilité de blessure.",
    atl:"ATL décrit la charge aiguë, calculée sur un horizon plus court que la charge chronique. Ce n'est pas une mesure physiologique directe.",
    acwr:"ACWR est un ratio entre charges aiguë et chronique. Sa valeur dépend des fenêtres et méthodes choisies. Ce ratio ne prouve pas un risque de blessure et ne définit pas un seuil de sécurité.",
    ewma:"EWMA est une moyenne mobile à pondération exponentielle. Les observations récentes reçoivent davantage de poids. Ce calcul ne mesure pas directement la physiologie."
  });
  function topicFor(value) {
    if (typeof value !== 'string' || value.length > 160) return null;
    var text = value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    var match = /^(?:explique|definis|definition de|qu['’]est-ce que|c['’]est quoi)\s+(?:(?:le|la|l['’])\s*)?(rpe|ctl|atl|acwr|ewma)(?:\s+(?:en francais|dans le sport))?[\s?!.]*$/.exec(text);
    return match ? match[1] : null;
  }
  // Extractive, bundled knowledge: no account counter, API, PC or generated facts.
  // Deliberately abstains on personal, compound and out-of-domain requests.
  var LEARNING = Object.freeze({
    supervised:"L'apprentissage supervisé ajuste un modèle avec des exemples associés à des réponses connues. Dans Athlys, une estimation de RPE doit être évaluée sur des athlètes et des périodes distincts de l'entraînement. Elle ne remplace pas le RPE déclaré.",
    unsupervised:"L'apprentissage non supervisé recherche une structure sans réponse cible, par exemple des groupes de profils de charge. Un groupe statistique n'est ni un diagnostic ni une probabilité de blessure.",
    semi:"L'apprentissage semi-supervisé combine des exemples étiquetés et non étiquetés. Les pseudo-étiquettes sont des estimations à contrôler, pas de nouvelles observations fiables. Elles ne doivent pas contaminer les données d'évaluation.",
    reinforcement:"L'apprentissage par renforcement apprend une politique à partir de récompenses. Dans Athlys, son étude reste hors ligne : aucune exploration automatique sur un athlète et aucune modification de programme sans décision du coach.",
    offline:"Les calculs et les explications embarquées d'Athlys n'ont pas de quota d'API ni de compteur d'utilisations. Le modèle Windows facultatif utilise les ressources du PC. Le stockage, la synchronisation et la recherche Web conservent les limites de leurs fournisseurs. Le matériel impose des limites de mémoire, de débit et d'énergie."
  });
  var ALIASES = Object.freeze({
    rpe:['rpe',"perception de l'effort",'effort percu'],
    ctl:['ctl','charge chronique'], atl:['atl','charge aigue'],
    acwr:['acwr','ratio de charge aigue chronique'],
    ewma:['ewma','moyenne mobile exponentielle'],
    supervised:['apprentissage supervise','ml supervise'],
    unsupervised:['apprentissage non supervise','ml non supervise'],
    semi:['apprentissage semi supervise','ml semi supervise'],
    reinforcement:['apprentissage par renforcement','renforcement'],
    types:['machine learning','apprentissage automatique','quatre types de machine learning','types de machine learning'],
    offline:['mode hors ligne','athlys sans quota','utilisation sans quota']
  });
  function offlineAnswerFor(value) {
    if(typeof value!=='string'||value.length>200||/[\r\n<>@0-9]/.test(value))return null;
    var q=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
      .replace(/’/g,"'").replace(/-/g,' ').trim().replace(/[?!.]+$/,'').trim();
    q=q.replace(/^(?:explique(?: moi)?|definis|definition de|que signifie|a quoi sert|comment fonctionne|qu'est ce que|c'est quoi)\s+/,'')
      .replace(/^(?:le |la |les |l')/,'').replace(/\s+(?:en francais|dans le sport|simplement)$/,'').trim();
    var matches=Object.keys(ALIASES).filter(function(k){return ALIASES[k].indexOf(q)>=0;});
    if(matches.length!==1)return null;
    var id=matches[0], reply=DEFINITIONS[id]||LEARNING[id];
    if(id==='types')reply=['supervised','unsupervised','semi','reinforcement'].map(function(k){return LEARNING[k];}).join('\n\n');
    return {id:id,reply:reply,route:'bundled-knowledge',usageQuota:null,
      sources:LEARNING[id]&&id!=='offline'||id==='types'?[{title:'Apprentissage automatique — taxonomie générale',url:'https://fr.wikipedia.org/wiki/Apprentissage_automatique'}]:[]};
  }
  function create(options) {
    options = options || {};
    var now = options.now || Date.now, cache = new Map(), enabled = false, scope = '', epoch = 0, busy = false;
    var ttl = 90000, maxEntries = 3, maxBytes = 16384;
    function bytes() { var n = 0; cache.forEach(function(v,k){ n += new TextEncoder().encode(k+v.text).byteLength; }); return n; }
    function disable() { enabled=false; scope=''; epoch++; cache.clear(); }
    function enable(identity) {
      if (typeof identity !== 'string' || !identity || identity.length>200) throw new Error('MESH_SESSION_REQUIRED');
      disable(); scope=identity; enabled=true;
    }
    async function supplement(prompt, identity) {
      if (!enabled) return {text:'',route:'local'};
      if (identity !== scope) { disable(); return {text:'',route:'local'}; }
      var topic = topicFor(prompt);
      if (!['ctl','acwr','ewma'].includes(topic)) return {text:'',route:'local'};
      var hit=cache.get(topic), time=now();
      if(hit && hit.until>time) { cache.delete(topic); cache.set(topic,hit); return hit.rejected?{text:'',route:'local',discarded:!hit.unavailable,unavailable:!!hit.unavailable}:{text:hit.text,route:'session-cache'}; }
      cache.delete(topic);
      if(busy || typeof options.inferGeneral!=='function') return {text:'',route:'local'};
      busy=true;
      var ticket=epoch;
      try {
        // Closed vocabulary only: never forward the prompt, identity, context or records.
        var result=await options.inferGeneral({topic:topic});
        if(!enabled || epoch!==ticket || scope!==identity) return {text:'',route:'cancelled'};
        if(!result || !acceptCompletion(topic,result.text)) {
          // Negative cache stores status only, never the rejected response.
          cache.set(topic,{text:'',until:now()+ttl,rejected:true});
          return {text:'',route:'local',discarded:true};
        }
        var text=result.text.trim();
        cache.set(topic,{text:text,until:now()+ttl});
        while(cache.size>maxEntries || bytes()>maxBytes) cache.delete(cache.keys().next().value);
        return {text:text,route:'pc-usb',experimental:true};
      } catch (_) {
        if(!enabled||epoch!==ticket||scope!==identity)return {text:'',route:'cancelled'};
        cache.set(topic,{text:'',until:now()+15000,rejected:true,unavailable:true});
        return {text:'',route:'local',unavailable:true};
      }
      finally { busy=false; }
    }
    return Object.freeze({enable:enable,disable:disable,supplement:supplement,
      state:function(){return {enabled:enabled,busy:busy,entries:cache.size,cacheBytes:bytes(),maxCacheBytes:maxBytes,bundledModelWeightBytes:0};}});
  }
  function acceptCompletion(topic,value) {
    if(typeof value!=='string'||!value.trim()||value.length>1200) return false;
    var t=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/’/g,"'").toLowerCase();
    // Conservative development guard, not a proof of factuality. The source
    // definition and deterministic calculation remain authoritative in the UI.
    if(/[0-9<>@]|https?:|\b(?:vous|votre|vos|tu|ton|ta|tes|diagnostic|recommande|prescris|augmentez|diminuez|efficiency|efficience|emotionnelles|reflexion subjective|quantite d'eau|ressentiment|taux d'activite eleve|depenses immediates|pente exponentielle)\b/.test(t)) return false;
    if(t.includes('blessure')&&!/(?:ne |n['’]).{0,100}(?:pas|aucun|ni)/.test(t)&&!/(?:sans|aucun).{0,60}blessure/.test(t))return false;
    if(topic==='rpe')return /(?:perception|percu|ressenti)/.test(t)&&/effort/.test(t);
    if(topic==='ctl')return /charge/.test(t)&&/chronique/.test(t);
    if(topic==='atl')return /charge/.test(t)&&/aigu/.test(t);
    if(topic==='acwr')return /ratio/.test(t)&&/aigu/.test(t)&&/chronique/.test(t)&&/(?:ne |n['’]|sans|aucun)/.test(t);
    if(topic==='ewma')return /moyenne/.test(t)&&/exponent/.test(t)&&/(?:recent|observation)/.test(t);
    return false;
  }
  return Object.freeze({create:create,topicFor:topicFor,offlineAnswerFor:offlineAnswerFor,acceptCompletion:acceptCompletion,topics:TOPICS,
    definitionFor:function(prompt){var topic=topicFor(prompt);return topic?DEFINITIONS[topic]:null;}});
});
