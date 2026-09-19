const CleanLink = (() => {
  const STORAGE_KEY = "clean-link-v1";
  const HISTORY_LIMIT = 15;

  const TRACKING_REF_VALUES = new Set([
    "twitter",
    "x",
    "facebook",
    "fb",
    "instagram",
    "ig",
    "linkedin",
    "reddit",
    "tiktok",
    "youtube",
    "yt",
    "email",
    "e-mail",
    "newsletter",
    "share",
    "social",
    "ad",
    "ads",
    "ppc",
    "cpc",
    "google",
    "bing",
    "yahoo",
    "organic",
    "paid",
    "affiliate",
    "aff",
    "partner",
    "campaign",
    "sms",
    "whatsapp",
    "telegram",
    "hn",
    "producthunt",
    "ph",
    "friend",
    "linktree",
    "bio",
    "story",
    "reel",
    "shorts",
    "nav",
    "header",
    "footer",
    "sidebar",
    "homepage",
    "home",
  ]);

  const FAMILIES = [
    { id: "utm", label: "UTM campaigns", hint: "utm_*", defaultOn: true },
    { id: "meta", label: "Meta / Instagram", hint: "fbclid, igshid", defaultOn: true },
    { id: "google-ads", label: "Google ads", hint: "gclid, gbraid, wbraid", defaultOn: true },
    { id: "analytics", label: "Analytics crumbs", hint: "_ga, _gl", defaultOn: true },
    { id: "email", label: "Email / ESP", hint: "mc_*, HubSpot, Klaviyo", defaultOn: true },
    { id: "click-ids", label: "Other click IDs", hint: "msclkid, twclid, li_fat_id", defaultOn: true },
    { id: "share", label: "Share leftovers", hint: "si, scm, spo_*", defaultOn: true },
    { id: "ref", label: "Referral tags", hint: "ref / source when tracking", defaultOn: true },
  ];

  const URL_IN_TEXT = /https?:\/\/[^\s<>"'`]+/i;

  function defaultFamilies() {
    const out = {};
    for (const family of FAMILIES) out[family.id] = family.defaultOn;
    return out;
  }

  function isYoutubeHost(host) {
    const h = String(host || "").toLowerCase();
    return h === "youtu.be" || h === "youtube.com" || h.endsWith(".youtube.com");
  }

  function isTrackingRef(name, value) {
    const n = String(name).toLowerCase();
    const v = String(value ?? "").toLowerCase();
    if (n === "ref_src" || n === "ref_url" || n === "referrer") return true;
    if (n !== "ref" && n !== "source") return false;
    if (TRACKING_REF_VALUES.has(v)) return true;
    if (/^(utm|fb|ig|tw|li)_/.test(v)) return true;
    if (/^[a-f0-9]{10,}$/i.test(v)) return true;
    if (v.length >= 28) return true;
    return false;
  }

  function familyOf(name, value, host) {
    const n = String(name).toLowerCase();

    if (n.startsWith("utm_")) return "utm";

    if (
      n === "fbclid" ||
      n === "fb_action_ids" ||
      n === "fb_action_types" ||
      n === "fb_source" ||
      n === "fb_ref" ||
      n === "mibextid" ||
      n === "igshid" ||
      n === "igsh" ||
      n === "oh" ||
      n === "__tn__" ||
      n.startsWith("__cft__")
    ) {
      return "meta";
    }

    if (
      n === "gclid" ||
      n === "gclsrc" ||
      n === "dclid" ||
      n === "gbraid" ||
      n === "wbraid" ||
      n === "gad_source" ||
      n === "gad_campaignid" ||
      n === "srsltid" ||
      n === "gadid"
    ) {
      return "google-ads";
    }

    if (n === "_ga" || n === "_gl" || n === "_gid" || n === "_gac") return "analytics";

    if (
      n.startsWith("mc_") ||
      n.startsWith("hsa_") ||
      n.startsWith("pk_") ||
      n.startsWith("kl_") ||
      n === "_hsenc" ||
      n === "_hsmi" ||
      n === "hsctatracking" ||
      n === "mkt_tok" ||
      n === "vero_id" ||
      n === "ncid" ||
      n === "ehid" ||
      n === "ck_subscriber_id" ||
      n === "spuserid" ||
      n === "spjobid" ||
      n === "spreportid" ||
      n.startsWith("spmailing")
    ) {
      return "email";
    }

    if (
      n === "msclkid" ||
      n === "twclid" ||
      n === "li_fat_id" ||
      n === "ttclid" ||
      n === "yclid" ||
      n === "rdt_cid" ||
      n === "irclickid" ||
      n === "epik" ||
      n === "scid" ||
      n === "sclid" ||
      n === "ndclid" ||
      n === "wickedid"
    ) {
      return "click-ids";
    }

    if (
      n === "scm" ||
      n === "scm-url" ||
      n.startsWith("spo_") ||
      n === "share_id" ||
      n === "shareid" ||
      (n === "si" && isYoutubeHost(host))
    ) {
      return "share";
    }

    if (isTrackingRef(n, value)) return "ref";

    return null;
  }

  function extractUrl(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed) return { ok: false, reason: "empty" };

    const match = trimmed.match(URL_IN_TEXT);
    if (match) {
      let raw = match[0];
      raw = raw.replace(/[),.;!?]+$/g, "");
      raw = raw.replace(/[\]}>]+$/g, "");
      return { ok: true, raw, fromBlob: trimmed !== raw };
    }

    if (/^(www\.)?[a-z0-9][a-z0-9.-]*\.[a-z]{2,}([/:?#].*)?$/i.test(trimmed) && !/\s/.test(trimmed)) {
      return {
        ok: true,
        raw: "https://" + trimmed.replace(/^\/\//, ""),
        inferred: true,
        fromBlob: false,
      };
    }

    return { ok: false, reason: "invalid", raw: trimmed };
  }

  function parseHttpUrl(raw) {
    try {
      const url = new URL(raw);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      return url;
    } catch (_) {
      return null;
    }
  }

  function emptyState() {
    return {
      v: 1,
      families: defaultFamilies(),
      history: [],
    };
  }

  function normalizeState(input) {
    const base = emptyState();
    if (!input || typeof input !== "object") return base;
    const families = defaultFamilies();
    if (input.families && typeof input.families === "object") {
      for (const family of FAMILIES) {
        if (typeof input.families[family.id] === "boolean") {
          families[family.id] = input.families[family.id];
        }
      }
    }
    const history = Array.isArray(input.history)
      ? input.history
          .filter((row) => row && typeof row.clean === "string" && row.clean)
          .slice(0, HISTORY_LIMIT)
          .map((row) => ({
            original: String(row.original || row.clean),
            clean: String(row.clean),
            strippedCount: Number(row.strippedCount) || 0,
            at: String(row.at || ""),
          }))
      : [];
    return { v: 1, families, history };
  }

  function cleanUrl(raw, families) {
    const enabled = families || defaultFamilies();
    const url = parseHttpUrl(raw);
    if (!url) return { ok: false, reason: "invalid" };

    const originalHref = url.href;
    const host = url.hostname;
    const kept = [];
    const stripped = [];

    for (const [name, value] of url.searchParams) {
      const family = familyOf(name, value, host);
      if (family && enabled[family] !== false) {
        stripped.push({ name, value, family });
      } else {
        kept.push({ name, value });
      }
    }

    const clean = new URL(url.href);
    const next = new URLSearchParams();
    for (const param of kept) next.append(param.name, param.value);
    clean.search = next.toString() ? "?" + next.toString() : "";

    if (clean.hash === "#_=_") {
      if (enabled.meta !== false) {
        clean.hash = "";
        stripped.push({ name: "#", value: "_=_", family: "meta" });
      }
    }

    return {
      ok: true,
      original: originalHref,
      clean: clean.href,
      kept,
      stripped,
      changed: clean.href !== originalHref,
      host: clean.hostname,
      path: clean.pathname,
    };
  }

  function highlightParts(raw, families) {
    const extracted = extractUrl(raw);
    if (!extracted.ok) return null;
    const url = parseHttpUrl(extracted.raw);
    if (!url) return null;
    const enabled = families || defaultFamilies();
    const params = [];
    let index = 0;
    for (const [name, value] of url.searchParams) {
      const family = familyOf(name, value, url.hostname);
      params.push({
        name,
        value,
        family,
        junk: !!(family && enabled[family] !== false),
        first: index === 0,
      });
      index += 1;
    }
    return {
      originAndPath: url.origin + url.pathname,
      hash: url.hash,
      hashJunk: url.hash === "#_=_" ? enabled.meta !== false : false,
      params,
    };
  }

  function markdownLink(cleanHref) {
    try {
      const url = new URL(cleanHref);
      let label = url.hostname.replace(/^www\./, "") + url.pathname;
      if (label.endsWith("/") && url.pathname !== "/") label = label.slice(0, -1);
      if (url.search) label += url.search;
      return "[" + label + "](" + cleanHref + ")";
    } catch (_) {
      return "[" + cleanHref + "](" + cleanHref + ")";
    }
  }

  function pushHistory(state, result, at) {
    if (!result || !result.ok) return state;
    const next = {
      original: result.original,
      clean: result.clean,
      strippedCount: result.stripped.length,
      at: at || new Date().toISOString(),
    };
    const history = state.history.filter(
      (row) => row.clean !== next.clean || row.original !== next.original
    );
    history.unshift(next);
    state.history = history.slice(0, HISTORY_LIMIT);
    return state;
  }

  return {
    STORAGE_KEY,
    HISTORY_LIMIT,
    FAMILIES,
    defaultFamilies,
    emptyState,
    normalizeState,
    extractUrl,
    parseHttpUrl,
    familyOf,
    cleanUrl,
    highlightParts,
    markdownLink,
    pushHistory,
  };
})();
