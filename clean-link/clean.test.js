const fs = require("fs");
const path = require("path");
const vm = require("vm");

const context = { console, URL, URLSearchParams };
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, "clean.js"), "utf8") + "\nthis.Exported = CleanLink;",
  context
);
const CleanLink = context.Exported;

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function eq(a, b, message) {
  if (a !== b) throw new Error((message || "mismatch") + " expected " + JSON.stringify(b) + " got " + JSON.stringify(a));
}

const sample = "https://example.com/item?id=42&utm_source=x&fbclid=abc";
const cleaned = CleanLink.cleanUrl(sample);
assert(cleaned.ok, "sample should parse");
eq(cleaned.clean, "https://example.com/item?id=42", "keep product id, drop trackers");
eq(cleaned.kept.length, 1, "one kept param");
eq(cleaned.kept[0].name, "id", "kept id");
eq(cleaned.stripped.length, 2, "two trackers");
assert(
  cleaned.stripped.some((row) => row.name === "utm_source") &&
    cleaned.stripped.some((row) => row.name === "fbclid"),
  "utm + fbclid stripped"
);

const blob = CleanLink.extractUrl("hey check this " + sample + " thanks!");
assert(blob.ok && blob.fromBlob, "extract from blob");
eq(blob.raw, sample, "first https URL");

const invalid = CleanLink.cleanUrl("not a url");
eq(invalid.ok, false, "invalid url");
eq(CleanLink.extractUrl("").reason, "empty", "empty paste");
eq(CleanLink.extractUrl("just words").reason, "invalid", "no url in text");

const already = CleanLink.cleanUrl("https://example.com/search?q=shoes&id=9");
assert(already.ok && !already.changed, "keep search q");
eq(already.clean, "https://example.com/search?q=shoes&id=9", "meaningful query stays");

const yt = CleanLink.cleanUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=TRACKME&utm_medium=share");
eq(yt.clean, "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube v stays, si and utm drop");

const ads = CleanLink.cleanUrl(
  "https://shop.example/p?sku=77&gclid=1&gbraid=2&wbraid=3&msclkid=4&twclid=5&li_fat_id=6"
);
eq(ads.clean, "https://shop.example/p?sku=77", "click ids drop, sku stays");

const mail = CleanLink.cleanUrl("https://news.example/issue?id=3&mc_cid=aa&mc_eid=bb&_ga=1&_gl=2");
eq(mail.clean, "https://news.example/issue?id=3", "mc and analytics drop");

const share = CleanLink.cleanUrl("https://open.spotify.com/track/1?spo_source=ig&scm=x&scm-url=y");
assert(share.clean.indexOf("spo_") < 0 && share.clean.indexOf("scm") < 0, "share leftovers drop");

const trackingRef = CleanLink.cleanUrl("https://example.com/a?ref=twitter&source=newsletter&q=keep");
eq(trackingRef.clean, "https://example.com/a?q=keep", "tracking ref/source drop");

const usefulRef = CleanLink.cleanUrl("https://github.com/org/repo/blob/file?ref=main");
eq(usefulRef.changed, false, "github-style ref=main stays");

const off = CleanLink.defaultFamilies();
off.utm = false;
off.meta = false;
const toggled = CleanLink.cleanUrl(sample, off);
eq(toggled.clean, sample, "disabled families keep params");

const md = CleanLink.markdownLink("https://example.com/item?id=42");
eq(md, "[example.com/item?id=42](https://example.com/item?id=42)", "markdown link");

const state = CleanLink.emptyState();
eq(state.families.utm, true, "utm on by default");
CleanLink.pushHistory(state, cleaned, "2026-09-19T12:00:00.000Z");
eq(state.history.length, 1, "history records");
CleanLink.pushHistory(state, cleaned, "2026-09-19T12:01:00.000Z");
eq(state.history.length, 1, "duplicate clean+original collapsed");

for (let i = 0; i < 20; i++) {
  CleanLink.pushHistory(
    state,
    { ok: true, original: "https://ex.com/" + i, clean: "https://ex.com/" + i, stripped: [] },
    "2026-09-19T13:00:00.000Z"
  );
}
eq(state.history.length, CleanLink.HISTORY_LIMIT, "history capped at 15");

const restored = CleanLink.normalizeState({
  families: { utm: false, nope: true },
  history: [{ clean: "https://ok.example/", strippedCount: 2, at: "x" }],
});
eq(restored.families.utm, false, "persisted toggle");
eq(restored.families.meta, true, "missing toggle defaults on");
eq(restored.history[0].clean, "https://ok.example/", "history reloads");

console.log("clean-link tests ok");
