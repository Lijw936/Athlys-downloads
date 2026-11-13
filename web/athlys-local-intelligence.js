/* Athlys Local Intelligence — deterministic, offline-first language and training science kernel.
 * Model inference is an optional local adapter only. This file never performs network requests.
 */
(function (root, factory) {
  "use strict";
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AthlysLocalIntelligence = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";
  var VERSION = "athlys-local-intelligence-1.0.0";
  var RPE_METHOD = "athlys-individual-rpe-v1";
  var PARSER_VERSION = "athlys-local-program-parser-v1";
  var DAY_NAMES = "lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche";
  var DAY_RE = new RegExp("^(?:(?:séance|seance)\\s*(?:n[°o]?\\s*)?\\d+|jour\\s*\\d+|s\\s*\\d+|(?:" + DAY_NAMES + ")|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}[/.]\\d{1,2}[/.]\\d{4})(?:\\s*[:：–—-]\\s*(.*))?$", "i");

  function number(value) {
    if (value === null || value === undefined || value === "") return null;
    var n = Number(String(value).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
  function median(values) {
    if (!values.length) return null;
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
  function round(n, digits) {
    var p = Math.pow(10, digits === undefined ? 2 : digits);
    return Math.round((n + Number.EPSILON) * p) / p;
  }
  function normalizeText(value) {
    return String(value || "").toLocaleLowerCase("fr").normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, " ")
      .replace(/[^a-z0-9.,:+/×%\s-]/g, " ").replace(/\s+/g, " ").trim();
  }
  async function sha256Text(value) {
    var cryptoApi = typeof globalThis !== "undefined" ? globalThis.crypto : null;
    if (!cryptoApi || !cryptoApi.subtle || typeof TextEncoder === "undefined") {
      throw new Error("SHA-256 Web Crypto est indisponible sur cet appareil.");
    }
    var bytes = new TextEncoder().encode(String(value || ""));
    var digest = await cryptoApi.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map(function (byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
  }

  function hashText(value) {
    var text = String(value || ""), h = 2166136261;
    for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }

  function extractDuration(text) {
    var t = normalizeText(text), matches = [], re = /(\d+(?:[.,]\d+)?)\s*(h|heure(?:s)?|min(?:ute)?s?)(?![a-z])/g, m;
    while ((m = re.exec(t))) {
      var prefix = t.slice(Math.max(0, m.index - 36), m.index);
      /* A recovery duration is not a work duration and must not be double-counted. */
      if (/(?:recuperation|recup|repos)\s*(?:de|:)?\s*$/.test(prefix)) continue;
      matches.push({ value: number(m[1]) * (/^h|heure/.test(m[2]) ? 60 : 1), index: m.index, end: re.lastIndex });
    }
    return matches;
  }
  function extractRpe(text) {
    var s = String(text || ""), patterns = [
      /\b(?:rpe|effort perçu|intensité|intensite)\s*(?:prévu|prévu|cible|visé|vise)?\s*[:=]??\s*(\d+(?:[.,]\d+)?)\s*(?:\/\s*10)?/i,
      /\b(\d+(?:[.,]\d+)?)\s*\/\s*10\s*(?:rpe|d'effort|effort)?/i
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = s.match(patterns[i]);
      if (m) {
        var n = number(m[1]);
        if (n !== null && n >= 1 && n <= 10) return n;
      }
    }
    return null;
  }
  function extractPlannedDate(text) {
    var raw = String(text || ""), normalized = normalizeText(raw), match = raw.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    var year, month, day;
    if (match) { year = Number(match[1]); month = Number(match[2]); day = Number(match[3]); }
    else {
      match = raw.match(/\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/);
      if (match) { day = Number(match[1]); month = Number(match[2]); year = Number(match[3]); }
      else {
        match = normalized.match(/\b(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(\d{4})\b/);
        if (!match) return null;
        day = Number(match[1]); year = Number(match[3]);
        month = { janvier:1,fevrier:2,mars:3,avril:4,mai:5,juin:6,juillet:7,aout:8,septembre:9,octobre:10,novembre:11,decembre:12 }[match[2]];
      }
    }
    var check = new Date(Date.UTC(year, month - 1, day));
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
    return String(year).padStart(4, "0") + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
  }
  function extractStrength(text) {
    var t = normalizeText(text), sets = null, reps = null, load = null, unit = null, m;
    m = t.match(/(\d+)\s*(?:series?|sets?)\s*(?:de\s*)?(\d+)\s*(?:repetitions?|reps?)?/);
    if (m) { sets = Number(m[1]); reps = Number(m[2]); }
    else {
      m = t.match(/(\d+)\s*[x×]\s*(\d+)\s*(?=(?:a|@)\s*\d+(?:[.,]\d+)?\s*(?:kg|kgs?|lb|lbs)\b)/);
      if (m) { sets = Number(m[1]); reps = Number(m[2]); }
    }
    m = t.match(/(?:a|@|charge(?:\s+de)?)\s*(\d+(?:[.,]\d+)?)\s*(kg|kgs?|lb|lbs)\b/);
    if (m) { load = number(m[1]); unit = /^lb/.test(m[2]) ? "lb" : "kg"; }
    var tempoMatch = t.match(/\btempo\s*(\d(?:-\d){1,3})\b/);
    return { sets: sets, repetitions: reps, load_value: load, load_unit: unit, tempo: tempoMatch ? tempoMatch[1] : null };
  }
  function extractTargetPace(text) {
    var t = normalizeText(text), m = t.match(/\b(?:allure|pace)\s*(?:cible|de travail)?\s*(\d{1,2}:\d{2})\s*\/\s*(km|100m|400m)\b/) || t.match(/\b(\d{1,2}:\d{2})\s*\/\s*(km|100m|400m)\b/);
    return m ? { value: m[1], unit: m[2] } : null;
  }
  function extractIntensityZone(text) {
    var t = normalizeText(text), zone = t.match(/\b(?:zone|z)\s*([1-8])\b/);
    if (zone) return { type: "zone", value: Number(zone[1]) };
    var vma = t.match(/\b(?:vma|vo2max)\s*(\d{1,3}(?:[.,]\d+)?)\s*%/);
    return vma ? { type: "relative_percent", reference: /vo2max/.test(t) ? "VO2max" : "VMA", value: number(vma[1]) } : null;
  }
  function isRestDay(text) {
    return /^(?:jour de repos(?: complet)?|repos complet|repos actif|repos|off|recovery day)(?:[.!,:;]|$)/.test(normalizeText(text));
  }
  function extractIntervals(text) {
    var t = normalizeText(text), out = [], re = /(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(km|kilometres?|kilometers?|min(?:ute)?s?|metres?|meters?|m|s|sec(?:onde)?s?)(?![a-z])/g, m;
    while ((m = re.exec(t))) {
      var unit = m[3], value = number(m[2]);
      var kind = /^(km|kilometres?|kilometers?)$/.test(unit) ? "distance_km" :
        /^(m|metres?|meters?)$/.test(unit) ? "distance_m" :
        /^(s|sec(?:onde)?s?)$/.test(unit) ? "duration_seconds" : "duration_minutes";
      out.push({ repetitions: Number(m[1]), value: value, unit: kind, source_start: m.index, source_end: re.lastIndex });
    }
    return out;
  }
  function extractRecoveries(text) {
    var t = normalizeText(text), out = [], re = /(?:récupération|recuperation|repos|récup|recup)\s*(?:de|:)?\s*(\d+(?:[.,]\d+)?)\s*(min(?:ute)?s?|s|sec(?:onde)?s?)/g, m;
    while ((m = re.exec(t))) out.push({
      value: number(m[1]) * (/^(s|sec)/.test(m[2]) ? 1 / 60 : 1),
      unit: "minutes", source_start: m.index, source_end: re.lastIndex
    });
    return out;
  }
  function classifyBlock(text) {
    var t = normalizeText(text);
    if (/echauffement|warm up/.test(t)) return "warmup";
    if (/retour au calme|cool down/.test(t)) return "cooldown";
    if (/recuperation|repos entre|recup/.test(t)) return "recovery";
    if (/musculation|renforcement|gainage|squat|developpe|souleve|series?|sets?|\b\d+\s*[x×]\s*\d+\s*(?:a|@)\s*\d+(?:[.,]\d+)?\s*(?:kg|lb)/.test(t)) return "strength";
    if (/fractionne|interval|repetitions?|series?|\d+\s*[x×]/.test(t)) return "interval";
    if (/footing|course|natation|velo|cyclisme|endurance|marche/.test(t)) return "continuous";
    return "exercise";
  }
  function sessionSegments(source) {
    var rows = [], offset = 0, current = null, sawHeading = false, preamble = [];
    String(source).split(/\r?\n/).forEach(function (line) {
      var match = line.trim().match(DAY_RE);
      if (match) {
        if (current) {
          if (current.explicit_heading) rows.push(current);
          else if (current.text.trim()) preamble.push(current.text.trim());
        }
        sawHeading = true;
        current = {
          title: (function(){var heading=line.trim();return match[1]?heading.slice(0,heading.indexOf(match[1])).replace(/[:：–—-]\s*$/, "").trim():heading;})(),
          text: "", source_start: offset, text_start: offset, source_end: offset + line.length,
          explicit_heading: true
        };
        if (match[1]) { current.text = match[1]; current.text_start = offset + line.indexOf(match[1]); }
      } else if (current) {
        current.text += (current.text ? "\n" : "") + line;
        current.source_end = offset + line.length;
      } else {
        current = { title: "Séance 1", text: line, source_start: offset, text_start: offset, source_end: offset + line.length, explicit_heading: false };
      }
      offset += line.length + 1;
    });
    if (current) {
      if (sawHeading) {
        if (current.explicit_heading && current.text.trim()) rows.push(current);
        else if (current.text.trim()) preamble.push(current.text.trim());
      }
    }
    if (sawHeading) {
      rows = rows.filter(function (x) { return x.text.trim(); });
      rows.unassignedText = preamble.join("\n").slice(0, 1000);
      return rows;
    }
    var whole = String(source).trim();
    if (!whole) return [];
    var startAt = String(source).indexOf(whole);
    return [{ title: "Séance 1", text: whole, source_start: startAt, text_start: startAt, source_end: startAt + whole.length, explicit_heading: false }];
  }
  function parseSession(segment, index, discipline) {
    var text = segment.text || "", sourceText = String(text), clean = sourceText.trim();
    var intervals = extractIntervals(clean), recoveries = extractRecoveries(clean);
    var durations = extractDuration(clean), rpe = extractRpe(clean);
    var plannedDate = extractPlannedDate(String(segment.title || "") + " " + clean);
    var strength = extractStrength(clean), targetPace = extractTargetPace(clean), intensityZone = extractIntensityZone(clean);
    var restDay = isRestDay(clean);
    var explicitTotal = normalizeText(clean).match(/(?:duree totale|duree de la seance|seance de|session de)\s*(\d+(?:[.,]\d+)?)\s*(min(?:ute)?s?|h|heures?)/i);
    var duration = explicitTotal ? number(explicitTotal[1]) * (/^h|heure/i.test(explicitTotal[2]) ? 60 : 1) : null;
    if (duration === null && durations.length === 1 && !intervals.length) duration = durations[0].value;
    /* Do not sum fragments into a session duration: recovery and repeated blocks may be counted
       more than once, and work time may be unknown. Only explicit total or single-session duration is accepted. */
    var blocks = [];
    var parts = clean.split(/(?:[,;](?!\d)|[\n]+)|(?<=\.)\s+/).filter(function (x) { return x.trim(); });
    if (!parts.length) parts = [clean];
    var cursor = 0;
    parts.forEach(function (part) {
      var start = sourceText.indexOf(part, cursor);
      if (start < 0) start = cursor;
      cursor = start + part.length;
      var pIntervals = extractIntervals(part), pRecovery = extractRecoveries(part), pDuration = extractDuration(part);
      var block = {
        type: isRestDay(part) ? "rest" : classifyBlock(part),
        text: part.trim(),
        source_start: (segment.text_start == null ? segment.source_start : segment.text_start) + start,
        source_end: (segment.text_start == null ? segment.source_start : segment.text_start) + start + part.length,
        repetitions: pIntervals.length ? pIntervals[0].repetitions : null,
        distance_value: pIntervals.length && /^distance_/.test(pIntervals[0].unit) ? pIntervals[0].value : null,
        distance_unit: pIntervals.length && /^distance_/.test(pIntervals[0].unit) ? pIntervals[0].unit === "distance_km" ? "km" : "m" : null,
        duration_minutes: pIntervals.length === 1 && pIntervals[0].unit === "duration_minutes"
          ? round(pIntervals[0].value, 2)
          : pDuration.length === 1 ? round(pDuration[0].value, 2) : null,
        recovery_minutes: pRecovery.length ? round(pRecovery[0].value, 2) : null,
        target_rpe: extractRpe(part),
        strength: extractStrength(part),
        target_pace: extractTargetPace(part),
        intensity_zone: extractIntensityZone(part)
      };
      if (pIntervals.length) block.interval = pIntervals;
      blocks.push(block);
    });
    /* Tempo may be written as a trailing comma-separated note after the strength prescription. */
    if (strength.tempo) {
      var strengthBlock = blocks.find(function (block) { return block.type === "strength" && block.strength; });
      if (strengthBlock && !strengthBlock.strength.tempo) strengthBlock.strength.tempo = strength.tempo;
    }
    var ambiguities = [];
    if (duration === null && !restDay) ambiguities.push("Durée totale non explicitement déterminée.");
    if (intervals.length && !recoveries.length && !restDay) ambiguities.push("Récupération des intervalles non précisée.");
    if (/allure|soutenu|facile|rapide|lent|intense|modere|modéré/i.test(clean) && rpe === null && !targetPace && !intensityZone && !restDay) {
      ambiguities.push("Une intensité est décrite en langage naturel sans cible RPE numérique.");
    }
    return {
      sequence_number: index + 1,
      title: segment.title || "Séance " + (index + 1),
      discipline: discipline || "",
      planned_date: plannedDate,
      session_type: restDay ? "rest" : "training",
      duration_minutes: duration === null ? null : round(duration, 2),
      intensity: rpe,
      planned_rpe: rpe,
      blocks: blocks,
      work_intervals: intervals,
      recoveries: recoveries,
      strength_blocks: blocks.filter(function (x) { return x.type === "strength"; }),
      target_pace: targetPace,
      intensity_zone: intensityZone,
      source_span: { start: segment.source_start, end: segment.source_end },
      source_text: sourceText,
      ambiguities: ambiguities
    };
  }
  function parseProgram(source, options) {
    options = options || {};
    var raw = String(source || "");
    if (raw.trim().length < 10) throw new Error("Le programme doit contenir au moins 10 caractères.");
    if (raw.length > 20000) throw new Error("Le texte du programme dépasse 20 000 caractères.");
    var segments = sessionSegments(raw);
    var sessions = segments.slice(0, 50).map(function (s, i) { return parseSession(s, i, options.discipline || ""); });
    var ambiguities = [];
    sessions.forEach(function (s) {
      s.ambiguities.forEach(function (message) { ambiguities.push({ session: s.sequence_number, message: message }); });
    });
    if (segments.unassignedText) ambiguities.push({ session: null, message: "Texte introductif non rattaché à une séance : " + segments.unassignedText.slice(0, 240) });
    if (segments.length > 50) ambiguities.push({ session: null, message: "Plus de 50 séances : seules les 50 premières sont interprétées." });
    return {
      schema_version: "athlys.program.v1",
      parser_version: PARSER_VERSION,
      source_hash: hashText(raw),
      source_length: raw.length,
      sessions: sessions,
      global_ambiguities: ambiguities,
      requires_coach_review: true,
      model: "deterministic-local-parser",
      model_used: false
    };
  }

  /* The optional bridge is deliberately injected by a platform adapter. It accepts no URL and does no fetch. */
  async function parseProgramLocally(source, options) {
    options = options || {};
    var result = parseProgram(source, options);
    var adapter = options.localModel || (typeof globalThis !== "undefined" && globalThis.AthlysLocalModel);
    result.local_model_available = !!(adapter && typeof adapter.generateJSON === "function");
    /* Until a platform runtime passes its device, licence and accuracy gates, the deterministic
       extractor remains authoritative. We never label an unused model as having parsed the text. */
    result.model_used = false;
    return result;
  }

  function weightedMedian(rows) {
    if (!rows.length) return null;
    var sorted = rows.slice().sort(function (a, b) { return a.value - b.value; });
    var total = sorted.reduce(function (sum, x) { return sum + x.weight; }, 0), acc = 0;
    for (var i = 0; i < sorted.length; i++) { acc += sorted[i].weight; if (acc >= total / 2) return sorted[i].value; }
    return sorted[sorted.length - 1].value;
  }
  function sessionLoad(durationMinutes, rpe) {
    var d = number(durationMinutes), r = number(rpe);
    if (d === null || r === null || d < 1 || d > 900 || r < 1 || r > 10) return null;
    return round(d * r, 2);
  }
  function projectRPE(input) {
    input = input || {};
    var target = number(input.plannedRpe), duration = number(input.durationMinutes);
    if (target === null || target < 1 || target > 10 || duration === null || duration < 1 || duration > 900) {
      return { status: "insufficient_input", plannedRpe: target, projectedRpe: null, plannedLoadAU: null, projectedLoadAU: null, confidence: "none", sampleCount: 0, method: RPE_METHOD, reason: "Une cible RPE et une durée valides sont nécessaires." };
    }
    var sport = normalizeText(input.sport), sessionType = normalizeText(input.sessionType);
    var sessions = Array.isArray(input.programSessions) ? input.programSessions : [];
    var byId = Object.create(null);
    sessions.forEach(function (s) { if (s && s.id) byId[String(s.id)] = s; });
    var now = input.now ? new Date(input.now).getTime() : Date.now();
    var observations = (Array.isArray(input.history) ? input.history : []).filter(function (log) {
      if (!log || log.completed === false) return false;
      var actual = number(log.rpe), minutes = number(log.duration_minutes);
      if (actual === null || minutes === null || actual < 1 || actual > 10 || minutes < 1) return false;
      var linked = log.program_session_id ? byId[String(log.program_session_id)] : null;
      var planned = linked ? number(linked.intensity) : number(log.metrics && log.metrics.planned_rpe);
      if (planned === null || planned < 1 || planned > 10) return false;
      /* Planned intensity is a matching feature: do not transfer a response to a very different target. */
      if (Math.abs(planned - target) > 1.5) return false;
      var logSport = normalizeText(log.discipline || (linked && linked.discipline) || "");
      if (sport && logSport !== sport) return false;
      var logType = normalizeText(log.session_type || "training");
      if (sessionType && logType && sessionType !== logType) return false;
      var ratio = minutes / duration;
      if (ratio < 0.75 || ratio > 1.33) return false;
      var date = new Date(log.session_date || log.created_at || 0).getTime();
      var ageDays = Number.isFinite(date) && date > 0 ? Math.max(0, (now - date) / 86400000) : 180;
      if (ageDays > 365) return false;
      return true;
    }).map(function (log) {
      var linked = log.program_session_id ? byId[String(log.program_session_id)] : null;
      var planned = linked ? number(linked.intensity) : number(log.metrics && log.metrics.planned_rpe);
      var date = new Date(log.session_date || log.created_at || 0).getTime();
      var ageDays = Number.isFinite(date) && date > 0 ? Math.max(0, (now - date) / 86400000) : 180;
      return { value: number(log.rpe) - planned, weight: Math.exp(-ageDays / 120) };
    });
    var n = observations.length, residual = weightedMedian(observations), rawResiduals = observations.map(function (x) { return x.value; });
    var mad = rawResiduals.length ? median(rawResiduals.map(function (x) { return Math.abs(x - median(rawResiduals)); })) : null;
    var shrinkage = n / (n + 8);
    var correction = residual === null ? 0 : residual * shrinkage;
    var projected = clamp(target + correction, 1, 10);
    var spread = n >= 4 && mad !== null ? Math.max(0.6, 1.4826 * mad) : 1.8;
    if (n < 8) spread = Math.max(spread, 1.5);
    var lower = clamp(projected - spread, 1, 10), upper = clamp(projected + spread, 1, 10);
    var confidence = n >= 8 ? "limited" : n >= 4 ? "exploratory" : "insufficient";
    var personalized = n >= 4;
    if (!personalized) { projected = target; lower = clamp(target - 2, 1, 10); upper = clamp(target + 2, 1, 10); }
    var plannedLoad = sessionLoad(duration, target), projectedLoad = sessionLoad(duration, projected);
    return {
      status: "ok",
      method: RPE_METHOD,
      plannedRpe: round(target, 2),
      projectedRpe: round(projected, 2),
      projectedRpeInterval: [round(lower, 2), round(upper, 2)],
      uncertaintyLabel: "Plage exploratoire dérivée de la dispersion observée ; couverture statistique non calibrée.",
      plannedLoadAU: plannedLoad,
      projectedLoadAU: projectedLoad,
      projectedLoadIntervalAU: [sessionLoad(duration, lower), sessionLoad(duration, upper)],
      residualMedian: residual === null ? null : round(residual, 3),
      shrinkage: round(shrinkage, 3),
      sampleCount: n,
      confidence: confidence,
      personalized: personalized,
      interpretation: personalized
        ? "Estimation subjective individualisée, fondée sur des séances comparables appariées. Ce n'est pas une mesure physiologique."
        : "Historique apparié insuffisant : la cible du coach est conservée sans correction individuelle."
    };
  }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function changeOneWorkDimension(session, scenario, calibration) {
    var copy = clone(session), changes = [];
    var blocks = Array.isArray(copy.blocks) ? copy.blocks : [];
    var candidates = blocks.filter(function (block) {
      return number(block.repetitions) !== null && number(block.repetitions) > 1;
    });
    if (scenario === "decrease") {
      if (candidates.length) {
        var selected = candidates[0], previous = Number(selected.repetitions);
        selected.repetitions = previous - 1;
        changes.push({
          field: "blocks.repetitions", before: previous, after: selected.repetitions,
          reason: "Une répétition est retirée d'un bloc explicitement quantifié."
        });
      } else if (number(copy.duration_minutes) !== null && number(copy.duration_minutes) > 10) {
        var durationBefore = number(copy.duration_minutes);
        copy.duration_minutes = Math.max(1, round(durationBefore * 0.95, 1));
        changes.push({
          field: "duration_minutes", before: durationBefore, after: copy.duration_minutes,
          reason: "Durée totale explicitement renseignée réduite de 5 % (proposition provisoire)."
        });
      }
    } else if (scenario === "adjust") {
      var target = number(copy.planned_rpe !== undefined ? copy.planned_rpe : copy.intensity);
      var residual = calibration && number(calibration.residualMedian);
      if (target !== null && residual !== null && calibration.sampleCount >= 4 && Math.abs(residual) >= 0.25) {
        var correction = clamp(residual * 0.5, -0.5, 0.5);
        var adjusted = round(clamp(target - correction, 1, 10), 1);
        if (adjusted !== target) {
          copy.planned_rpe = adjusted;
          copy.intensity = adjusted;
          changes.push({
            field: "planned_rpe", before: target, after: adjusted,
            reason: residual > 0
              ? "La réponse RPE observée est régulièrement supérieure à la cible sur les séances appariées ; cible proposée à la baisse."
              : "La réponse RPE observée est régulièrement inférieure à la cible sur les séances appariées ; cible proposée à la hausse."
          });
        }
      }
    } else if (scenario === "increase") {
      if (candidates.length && calibration && calibration.sampleCount >= 8 &&
          number(calibration.residualMedian) !== null && calibration.residualMedian <= -0.5 &&
          calibration.projectedRpe < calibration.plannedRpe - 0.25) {
        var increase = candidates[0], before = Number(increase.repetitions);
        increase.repetitions = before + 1;
        changes.push({
          field: "blocks.repetitions", before: before, after: increase.repetitions,
          reason: "Une répétition supplémentaire est proposée uniquement après huit observations appariées au minimum et une réponse RPE historiquement inférieure à la cible."
        });
      }
    }
    return { session: copy, changes: changes };
  }
  function generateScenarios(input) {
    input = input || {};
    var original = clone(Array.isArray(input.sessions) ? input.sessions : []);
    var athlete = input.athlete || {};
    var history = Array.isArray(athlete.history) ? athlete.history : [];
    var options = {
      programSessions: Array.isArray(input.programSessions) ? input.programSessions : [],
      history: history, sport: athlete.sport || input.sport || "", now: input.now
    };
    function projectionFor(session) {
      return projectRPE({
        plannedRpe: session.planned_rpe !== undefined ? session.planned_rpe : session.intensity,
        durationMinutes: session.duration_minutes,
        sport: options.sport || session.discipline || "",
        sessionType: session.session_type || "training",
        history: history, programSessions: options.programSessions, now: options.now
      });
    }
    function projectedTotal(rows) {
      var projections = rows.map(projectionFor);
      if (projections.some(function (p) { return p.projectedLoadAU === null; })) return null;
      return round(projections.reduce(function (sum, p) { return sum + p.projectedLoadAU; }, 0), 2);
    }
    var beforeLoad = projectedTotal(original);
    var calibrations = original.map(projectionFor);
    var sampleTotal = calibrations.reduce(function (n, p) { return n + (p.sampleCount || 0); }, 0);
    var confidenceRank = { none: 0, insufficient: 1, exploratory: 2, limited: 3 };
    var weakest = calibrations.reduce(function (acc, p) {
      return (confidenceRank[p.confidence] || 0) < (confidenceRank[acc] || 0) ? p.confidence : acc;
    }, calibrations.length ? "limited" : "insufficient");

    return ["decrease", "adjust", "increase"].map(function (kind) {
      var next = clone(original), diffs = [], blockers = [], warnings = [];
      if (kind === "increase") {
        calibrations.forEach(function (p, index) {
          if (p.sampleCount < 8 || p.status !== "ok") {
            blockers.push("Séance " + (index + 1) + " : huit observations personnelles appariées et comparables sont requises par la politique provisoire.");
          } else if (p.residualMedian === null || p.residualMedian > -0.5 || p.projectedRpe >= p.plannedRpe - 0.25) {
            blockers.push("Séance " + (index + 1) + " : les observations ne montrent pas une perception suffisamment inférieure à la cible pour étayer une augmentation.");
          }
        });
      }
      if (kind === "adjust") {
        calibrations.forEach(function (p, index) {
          if (p.sampleCount < 4 || p.status !== "ok") {
            blockers.push("Séance " + (index + 1) + " : historique apparié insuffisant pour individualiser l'ajustement.");
          }
        });
      }
      next = next.map(function (session, index) {
        if (blockers.length && (kind === "increase" || kind === "adjust")) return session;
        var changed = changeOneWorkDimension(session, kind, calibrations[index]);
        if (changed.changes.length) diffs.push({
          sequence_number: session.sequence_number || index + 1,
          title: session.title || "Séance " + (index + 1),
          changes: changed.changes
        });
        return changed.session;
      });
      if (!diffs.length && !blockers.length) {
        blockers.push(kind === "adjust"
          ? "Aucun écart individuel suffisant ne justifie une modification de la cible RPE."
          : "Aucune donnée structurée suffisamment explicite pour proposer une modification chiffrée sans inventer de contenu.");
      }
      var hasUnquantifiedWorkChange = diffs.some(function (row) {
        return row.changes.some(function (change) { return change.field === "blocks.repetitions"; });
      });
      var afterLoad = blockers.length || hasUnquantifiedWorkChange ? null : projectedTotal(next);
      if (hasUnquantifiedWorkChange && !blockers.length) {
        warnings.push("La durée totale après modification des répétitions n'est pas recalculable : la durée de travail et les récupérations ne sont pas assez explicites. Aucun écart d'UA n'est affiché.");
      }
      return {
        id: kind,
        label: kind === "decrease" ? "Diminuer" : kind === "adjust" ? "Ajuster" : "Augmenter",
        status: blockers.length ? "blocked" : "draft",
        policy_version: "athlys-scenario-provisional-v3",
        policy_status: "provisional_coach_review_required",
        sessions: next,
        changes: diffs,
        projectedLoadBeforeAU: beforeLoad,
        projectedLoadAfterAU: afterLoad,
        projectedLoadDeltaAU: afterLoad === null || beforeLoad === null ? null : round(afterLoad - beforeLoad, 2),
        confidence: weakest,
        sampleCountTotal: sampleTotal,
        sessionCalibration: calibrations.map(function (p, index) {
          return {
            sequence_number: index + 1,
            sample_count: p.sampleCount,
            confidence: p.confidence,
            residual_median: p.residualMedian,
            projected_rpe: p.projectedRpe,
            interval: p.projectedRpeInterval
          };
        }),
        blockers: blockers,
        warnings: warnings,
        requires_coach_approval: true,
        notice: "Scénario exploratoire fondé sur les données disponibles ; il ne constitue pas une prescription universelle. Validation du coach obligatoire."
      };
    });
  }  function localInsights(context) {
    context = context || {};
    var logs = Array.isArray(context.logs) ? context.logs.filter(function (x) {
      return x && x.completed !== false && number(x.rpe) !== null && number(x.duration_minutes) !== null;
    }) : [];
    var now = context.now ? new Date(context.now).getTime() : Date.now();
    var last7 = logs.filter(function (x) { var d = new Date(x.session_date || x.created_at || 0).getTime(); return Number.isFinite(d) && d > 0 && now - d <= 7 * 86400000; });
    var prev7 = logs.filter(function (x) { var d = new Date(x.session_date || x.created_at || 0).getTime(); return Number.isFinite(d) && d > 0 && now - d > 7 * 86400000 && now - d <= 14 * 86400000; });
    var total = last7.reduce(function (sum, x) { return sum + (sessionLoad(x.duration_minutes, x.rpe) || 0); }, 0);
    var previous = prev7.reduce(function (sum, x) { return sum + (sessionLoad(x.duration_minutes, x.rpe) || 0); }, 0);
    var out = [];
    if (!last7.length) out.push({ category: "DONNÉES", title: "Historique récent incomplet", detail: "Aucune séance des 7 derniers jours ne contient à la fois une durée et un RPE valides. Les champs manquants ne sont pas assimilés à zéro." });
    else {
      out.push({ category: "CHARGE INTERNE", title: round(total, 1) + " UA sur 7 jours", detail: last7.length + " séance(s) avec RPE et durée. Calcul : RPE déclaré × durée en minutes. Cette mesure subjective n'est pas un marqueur physiologique direct." });
      if (prev7.length >= 2) {
        var delta = previous > 0 ? ((total - previous) / previous) * 100 : null;
        if (delta !== null) out.push({ category: "ÉVOLUTION", title: (delta > 0 ? "+" : "") + round(delta, 1) + " % par rapport aux 7 jours précédents", detail: "Comparaison descriptive de la charge interne déclarée (" + round(previous, 1) + " UA auparavant). Ce changement ne prédit pas une blessure et doit être interprété avec le contexte." });
      }
    }
    if (logs.length < 8) out.push({ category: "PERSONNALISATION", title: "Référence individuelle en construction", detail: logs.length + " séance(s) avec durée et RPE disponibles. La calibration nécessite des séances prévues et réalisées comparables, appariées à leur programme." });
    return out.slice(0, 3);
  }

  function classifyIntent(prompt) {
    var model = root && root.AthlysNeuralIntentModel;
    if (model && typeof model.classify === "function") {
      try {
        var predicted = model.classify(prompt);
        if (predicted && predicted.confidence >= 0.48 && predicted.margin >= 0.08) {
          var mapping = {
            show_load: "load_analysis", show_fatigue: "fatigue_analysis",
            record_feeling: "record_feeling", record_sleep: "record_sleep",
            record_pain: "record_pain", explain_metrics: "explain_metrics",
            import_program: "training_program", adjust_program: "adjust_program",
            show_calendar: "schedule", help_navigation: "general"
          };
          return {
            intent: mapping[predicted.intent] || "general",
            confidence: predicted.confidence,
            alternatives: (predicted.alternatives || []).map(function (item) {
              return { intent: mapping[item.intent] || "general", confidence: item.confidence };
            }),
            source: "homemade_neural_mlp",
            model: predicted.model,
            experimental: true
          };
        }
      } catch (error) {
        /* A malformed or unavailable local model must never block the deterministic fallback. */
      }
    }
    var q = normalizeText(prompt), intents = [
      ["training_program", /programme|seance|entrainement|cycle|microcycle|planification|repetitions|recuperation/],
      ["load_analysis", /charge|rpe|atl|ctl|tsb|acwr|fatigue|forme|ressenti|sommeil/],
      ["progress", /progress|evolution|record|chrono|resultat|objectif/],
      ["schedule", /agenda|calendrier|rendez vous|planifie|planifier/],
      ["messaging", /message|contacter|ecrire au coach|envoyer/]
    ];
    var scores = intents.map(function (entry) {
      var hits = (q.match(new RegExp(entry[1].source, "g")) || []).length;
      return { intent: entry[0], score: hits };
    }).sort(function (a, b) { return b.score - a.score; });
    return { intent: scores[0] && scores[0].score > 0 ? scores[0].intent : "general",
      confidence: scores[0] && scores[0].score > 0 ? Math.min(0.92, 0.55 + scores[0].score * 0.12) : 0.35,
      alternatives: scores.slice(1, 3), source: "deterministic_local" };
  }
  function localAssistantReply(prompt, context) {
    context = context || {};
    var classification = classifyIntent(prompt), logs = Array.isArray(context.logs) ? context.logs : [];
    var q = normalizeText(prompt), reply;
    if (classification.intent === "fatigue_analysis") {
      var checkins = Array.isArray(context.checkins) ? context.checkins : [];
      var lastCheckin = checkins.slice().sort(function(a,b){return new Date(b.created_at||0)-new Date(a.created_at||0);})[0];
      reply = lastCheckin
        ? "Ton dernier bilan indique une forme de " + (lastCheckin.feeling==null?"non renseignée":lastCheckin.feeling+"/5") +
          ", une récupération de " + (lastCheckin.recovery==null?"non renseignée":lastCheckin.recovery+"/5") +
          " et une énergie de " + (lastCheckin.energy==null?"non renseignée":lastCheckin.energy+"/5") +
          ". Ces éléments décrivent ton ressenti, pas un diagnostic. Compare-les à plusieurs jours et échange avec ton coach avant de modifier la charge."
        : "Je n'ai pas encore de bilan de ressenti exploitable dans cet espace. Renseigne quelques check-ins pour suivre l'évolution de ta fatigue et de ta récupération.";
    } else if (classification.intent === "record_feeling") {
      reply = "Tu peux enregistrer ton ressenti dans l'onglet « Ressenti ». Je ne crée ni ne modifie un bilan sans ton action explicite.";
    } else if (classification.intent === "record_sleep") {
      reply = "Renseigne tes heures de sommeil dans « Ressenti » pour les associer à la bonne journée. Je ne les enregistre pas automatiquement depuis cette conversation.";
    } else if (classification.intent === "record_pain") {
      reply = "Tu peux signaler la zone et l'intensité de la douleur dans « Ressenti ». Athlys ne pose pas de diagnostic ; si la douleur est importante, persistante ou s'aggrave, demande un avis médical ou kiné.";
    } else if (classification.intent === "explain_metrics") {
      reply = "Repères rapides : ATL décrit la charge récente à court terme ; CTL décrit une tendance de charge plus longue ; TSB met en regard ces deux tendances ; ACWR compare une fenêtre aiguë à une référence chronique ; le RPE est l'effort perçu déclaré après une séance. Ces indicateurs décrivent l'entraînement et ne prédisent pas une blessure.";
    } else if (classification.intent === "adjust_program") {
      reply = "Je peux préparer des scénarios de diminution, d'ajustement ou de maintien à partir du programme et de l'historique disponibles. Le parseur conserve les champs absents comme inconnus et toute modification reste soumise à la validation du coach.";
    } else if (classification.intent === "load_analysis") {
      var valid = logs.filter(function (x) { return x && x.completed !== false && number(x.rpe) !== null && number(x.duration_minutes) !== null; });
      var recent = valid.filter(function (x) { return !x.session_date || (Date.now() - new Date(x.session_date).getTime()) <= 7 * 86400000; });
      var total = recent.reduce(function (sum, x) { return sum + (sessionLoad(x.duration_minutes, x.rpe) || 0); }, 0);
      reply = recent.length
        ? "Sur les 7 derniers jours, j'ai retrouvé " + recent.length + " séance(s) renseignée(s), pour une charge interne session-RPE cumulée de " + round(total, 1) + " UA (RPE × durée). Cette valeur décrit une charge subjective déclarée, pas une mesure physiologique. " + (valid.length < 4 ? "L'historique est trop court pour personnaliser solidement l'interprétation." : "Je peux comparer ces séances à tes propres références, en gardant les limites et l'incertitude visibles.")
        : "Je ne trouve pas de séance récente avec durée et RPE renseignés. Je ne transforme pas les champs manquants en zéro : complète ton journal pour obtenir une analyse.";
    } else if (classification.intent === "training_program") {
      reply = "Je peux structurer le texte du programme localement. Colle-le dans « Nouveau programme » : les champs non précisés resteront inconnus et le coach vérifiera l'aperçu avant enregistrement.";
    } else if (classification.intent === "progress") {
      reply = "Je peux examiner tes séances et tes résultats disponibles. L'interprétation doit comparer des données de même discipline et de même type de test ; une absence de résultat n'est pas une stagnation.";
    } else if (classification.intent === "schedule") {
      reply = "Je peux t'aider à préparer une proposition d'agenda. Les événements ne seront enregistrés qu'après ta confirmation.";
    } else if (classification.intent === "messaging") {
      reply = "Ouvre le Chat Athlys pour écrire à ton coach ou à ton athlète. Je ne déclenche pas d'envoi sans validation.";
    } else {
      reply = "J'ai interprété ta demande localement. Je peux exploiter les données déjà disponibles dans cet espace ; précise la séance, la période ou l'indicateur à examiner si nécessaire.";
    }
    return { reply: reply, action: { type: "none" }, insights: [], engine: {
      name: "Athlys Local Intelligence", version: VERSION, intent: classification.intent,
      confidence: classification.confidence, alternatives: classification.alternatives,
      inference: classification.source || "deterministic_local", model: classification.model || null,
      experimental: !!classification.experimental, remote: false
    } };
  }

  return {
    version: VERSION,
    parserVersion: PARSER_VERSION,
    rpeMethod: RPE_METHOD,
    normalizeText: normalizeText,
    hashText: hashText,
    sha256Text: sha256Text,
    sessionLoad: sessionLoad,
    parseProgram: parseProgram,
    parseProgramLocally: parseProgramLocally,
    projectRPE: projectRPE,
    generateScenarios: generateScenarios,
    localInsights: localInsights,
    classifyIntent: classifyIntent,
    localAssistantReply: localAssistantReply
  };
});
