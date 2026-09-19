const CleanLink = (() => {
  const STORAGE_KEY = "clean-link-v1";
  const HISTORY_MAX = 10;

  const EXACT_KEYS = new Set([
    "fbclid",
    "gclid",
    "gclsrc",
    "dclid",
    "gbraid",
    "wbraid",
    "msclkid",
    "mc_eid",
    "mc_cid",
    "igshid",
    "igsh",
    "si",
    "ref",
    "ref_src",
    "ref_url",
    "_hsenc",
    "_hsmi",
    "mkt_tok",
    "_ga",
    "_gl",
    "_ke",
    "gad_source",
    "gad_campaignid",
    "yclid",
    "twclid",
    "ttclid",
    "li_fat_id",
    "s_kwcid",
    "scid",
    "wickedid",
    "irclickid",
    "epik",
    "_kx",
    "ck_subscriber_id",
    "ml_subscriber",
    "ndclid",
    "srsltid",
    "ncid",
    "icid",
    "spm",
    "share_id",
    "smlid",
    "cmpid",
    "campaignid",
    "campaign_id",
    "ad_id",
    "adid",
    "clickid",
    "click_id",
    "affiliate",
    "aff_id",
    "affid",
    "oly_anon_id",
    "oly_enc_id",
    "vero_id",
    "nr_email_referer",
    "mbid",
    "soc_src",
    "soc_trk",
    "mibextid",
    "rdt_cid",
    "nx_source",
    "isappinstalled",
    "sfnsn",
    "trk",
    "trkcampaign",
    "original_referer",
    "tw_source",
    "tw_campaign",
    "sms_ss",
    "at_medium",
    "at_campaign",
    "guce_referrer",
    "guce_referrer_sig",
    "guccounter",
    "fb_action_ids",
    "fb_action_types",
    "fb_source",
    "action_object_map",
    "action_type_map",
    "action_ref_map",
    "mc_tc",
    "oto",
    "otoid",
    "ss_email_id",
    "_openstat",
    "sc_campaign",
    "sc_channel",
    "sc_content",
    "sc_medium",
    "sc_outcome",
    "sc_geo",
    "sc_country",
    "vero_conv",
  ]);

  const PREFIXES = [
    "utm_",
    "hsa_",
    "mtm_",
    "pk_",
    "piwik_",
    "matomo_",
    "pd_rd_",
    "pf_rd_",
    "ref_",
    "amp;utm_",
  ];

  const HOST_EXTRAS = [
    { host: /(^|\.)amazon\./i, keys: ["tag", "linkcode", "creative", "creativeasin", "camp", "linkid", "qid", "sr", "ascsubtag"] },
    { host: /(^|\.)youtube\.com$/i, keys: ["feature", "ab_channel", "pp", "bpctr", "redir_token"] },
    { host: /^youtu\.be$/i, keys: ["feature", "ab_channel"] },
    { host: /(^|\.)instagram\.com$/i, keys: ["igsh", "igshid"] },
    { host: /(^|\.)(x|twitter)\.com$/i, keys: ["s", "t"] },
  ];

  const WRAPPERS = [
    { host: /(^|\.)facebook\.com$/i, path: /^\/l\.php$/i, keys: ["u"] },
    { host: /^l\.facebook\.com$/i, keys: ["u"] },
    { host: /^lm\.facebook\.com$/i, keys: ["u"] },
    { host: /^l\.instagram\.com$/i, keys: ["u"] },
    { host: /(^|\.)google\./i, path: /^\/url$/i, keys: ["q", "url"] },
    { host: /(^|\.)youtube\.com$/i, path: /^\/redirect$/i, keys: ["q"] },
    { host: /(^|\.)linkedin\.com$/i, path: /^\/safety\/go$/i, keys: ["url"] },
    { host: /(^|\.)duckduckgo\.com$/i, path: /^\/l\/?$/i, keys: ["uddg"] },
  ];

  const SAMPLE_DIRTY =
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=43s&si=AbCdEfGhIjKlMnOp&utm_source=twitter&utm_medium=social&utm_campaign=share&fbclid=IwAR0junk&feature=share";

  function clampText(value, max) {
    return String(value || "").slice(0, max);
  }

  function isTracker(key, hostname) {
    const k = String(key || "").toLowerCase();
    if (!k) return false;
    if (EXACT_KEYS.has(k)) return true;
    if (PREFIXES.some((prefix) => k.startsWith(prefix))) return true;
    const host = String(hostname || "");
    for (const rule of HOST_EXTRAS) {
      if (rule.host.test(host) && rule.keys.includes(k)) return true;
    }
    return false;
  }

  function decodeLoose(text) {
    const raw = String(text || "").trim();
    if (!raw) return "";
    try {
      if (/%[0-9A-Fa-f]{2}/.test(raw) && !/^https?:\/\//i.test(raw) && /%3A/i.test(raw)) {
        return decodeURIComponent(raw);
      }
    } catch (_) {
      /* keep original */
    }
    return raw;
  }

  function peelWrappers(text) {
    let current = String(text || "").trim();
    current = current.replace(/^['"<]+/, "").replace(/['">]+$/, "").trim();
    current = decodeLoose(current);
    const unwrapped = [];
    for (let hop = 0; hop < 5; hop++) {
      if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(current)) {
        current = "https://" + current;
      }
      let url;
      try {
        url = new URL(current);
      } catch (_) {
        return { text: current, unwrapped, url: null };
      }
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return { text: current, unwrapped, url: null };
      }

      if (url.hostname.replace(/^www\./, "") === "href.li" && url.search.length > 1) {
        const inner = url.search.slice(1);
        if (/^https?:\/\//i.test(inner)) {
          unwrapped.push(url.href);
          current = inner;
          continue;
        }
      }

      const match = WRAPPERS.find((rule) => {
        if (!rule.host.test(url.hostname)) return false;
        if (rule.path && !rule.path.test(url.pathname)) return false;
        return true;
      });
      if (!match) return { text: url.href, unwrapped, url };

      let inner = "";
      for (const key of match.keys) {
        const value = url.searchParams.get(key);
        if (value) {
          inner = value;
          break;
        }
      }
      if (!inner || inner === current) return { text: url.href, unwrapped, url };
      unwrapped.push(url.href);
      current = inner;
    }
    return { text: current, unwrapped, url: null };
  }

  function stripAmazonPath(url) {
    if (!/(^|\.)amazon\./i.test(url.hostname)) return false;
    const next = url.pathname.replace(/\/ref=[^/]*/gi, "");
    if (next === url.pathname) return false;
    url.pathname = next || "/";
    return true;
  }

  function stripTrackingHash(url) {
    const hash = url.hash.replace(/^#/, "");
    if (!hash) return false;
    if (/^(xtor=|echobox|utm_)/i.test(hash)) {
      url.hash = "";
      return true;
    }
    return false;
  }

  function clean(input) {
    const original = clampText(String(input || "").trim(), 4000);
    if (!original) {
      return { ok: false, error: "empty", input: "", dirty: "", clean: "", stripped: [], unwrapped: [] };
    }

    const peeled = peelWrappers(original);
    if (!peeled.url) {
      try {
        peeled.url = new URL(peeled.text);
      } catch (_) {
        return {
          ok: false,
          error: "invalid",
          input: original,
          dirty: original,
          clean: "",
          stripped: [],
          unwrapped: peeled.unwrapped,
        };
      }
    }

    const url = peeled.url;
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return {
        ok: false,
        error: "unsupported",
        input: original,
        dirty: original,
        clean: "",
        stripped: [],
        unwrapped: peeled.unwrapped,
      };
    }

    const stripped = [];
    const kept = new URLSearchParams();
    url.searchParams.forEach((value, key) => {
      if (isTracker(key, url.hostname)) {
        stripped.push({ key, value });
      } else {
        kept.append(key, value);
      }
    });
    const query = kept.toString();
    url.search = query ? "?" + query : "";

    if (stripAmazonPath(url)) {
      stripped.push({ key: "path/ref", value: "amazon" });
    }
    if (stripTrackingHash(url)) {
      stripped.push({ key: "hash", value: "tracker" });
    }

    return {
      ok: true,
      error: "",
      input: original,
      dirty: original,
      clean: url.href,
      stripped,
      unwrapped: peeled.unwrapped,
    };
  }

  function normalizeHistory(raw) {
    const rows = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object" && Array.isArray(raw.history)
        ? raw.history
        : [];
    return rows
      .map((row) => ({
        dirty: clampText(row && row.dirty, 4000),
        clean: clampText(row && row.clean, 2000),
        stripped: Array.isArray(row && row.stripped)
          ? row.stripped
              .slice(0, 40)
              .map((item) => ({
                key: clampText(item && item.key, 80),
                value: clampText(item && item.value, 240),
              }))
              .filter((item) => item.key)
          : [],
        at: Number(row && row.at) || 0,
      }))
      .filter((row) => row.dirty && row.clean)
      .slice(0, HISTORY_MAX);
  }

  function pushHistory(list, entry) {
    const next = {
      dirty: clampText(entry && entry.dirty, 4000),
      clean: clampText(entry && entry.clean, 2000),
      stripped: Array.isArray(entry && entry.stripped)
        ? entry.stripped.slice(0, 40).map((item) => ({
            key: clampText(item && item.key, 80),
            value: clampText(item && item.value, 240),
          }))
        : [],
      at: Number(entry && entry.at) || Date.now(),
    };
    if (!next.dirty || !next.clean) return normalizeHistory(list);
    const rest = normalizeHistory(list).filter(
      (row) => !(row.dirty === next.dirty && row.clean === next.clean)
    );
    return [next, ...rest].slice(0, HISTORY_MAX);
  }

  function sampleDirty() {
    return SAMPLE_DIRTY;
  }

  return {
    STORAGE_KEY,
    HISTORY_MAX,
    SAMPLE_DIRTY,
    isTracker,
    clean,
    normalizeHistory,
    pushHistory,
    sampleDirty,
  };
})();

if (typeof globalThis !== "undefined") {
  globalThis.CleanLink = CleanLink;
}
