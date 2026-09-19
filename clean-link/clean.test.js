const fs = require("fs");
const path = require("path");
const vm = require("vm");

const context = { console, URL, URLSearchParams };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "clean.js"), "utf8"), context);
const CleanLink = context.CleanLink;

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function eq(a, b, message) {
  if (a !== b) throw new Error((message || "mismatch") + " expected " + JSON.stringify(b) + " got " + JSON.stringify(a));
}

function cleanHref(input) {
  const result = CleanLink.clean(input);
  assert(result.ok, "expected clean ok for " + input + " got " + result.error);
  return result.clean;
}

function hasKey(result, key) {
  return result.stripped.some((item) => item.key === key);
}

eq(CleanLink.STORAGE_KEY, "clean-link-v1", "storage key");
assert(CleanLink.isTracker("utm_source"), "utm_source is a tracker");
assert(CleanLink.isTracker("fbclid"), "fbclid is a tracker");
assert(CleanLink.isTracker("gclid"), "gclid is a tracker");
assert(CleanLink.isTracker("mc_eid"), "mc_eid is a tracker");
assert(CleanLink.isTracker("igshid"), "igshid is a tracker");
assert(CleanLink.isTracker("si"), "si is a tracker");
assert(CleanLink.isTracker("ref"), "ref is a tracker");
assert(!CleanLink.isTracker("v"), "youtube v stays");
assert(!CleanLink.isTracker("q"), "search q stays");
assert(!CleanLink.isTracker("t"), "timestamp t stays");

eq(
  cleanHref(
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=43s&si=AbCdEfGhIjKlMnOp&utm_source=twitter&utm_medium=social&utm_campaign=share&fbclid=IwAR0junk&feature=share"
  ),
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=43s",
  "youtube keeps watch id and timestamp"
);

eq(
  cleanHref("https://open.spotify.com/track/11dFghVXANMlKmJXsNCbNl?si=abcd1234&utm_source=copy-link"),
  "https://open.spotify.com/track/11dFghVXANMlKmJXsNCbNl",
  "spotify si and utm"
);

eq(
  cleanHref("https://example.com/article?id=42&utm_source=x&utm_medium=social&fbclid=abc&gclid=1&mc_eid=9&igshid=zz&si=yy&ref=twitter"),
  "https://example.com/article?id=42",
  "keeps real id, strips listed trackers"
);

eq(
  cleanHref("https://news.example.com/story/hello-world?page=2&share_id=99#_comments"),
  "https://news.example.com/story/hello-world?page=2#_comments",
  "keeps path, real query, and real hash"
);

eq(
  cleanHref("www.example.com/path?utm_source=ig&igshid=face"),
  "https://www.example.com/path",
  "adds https when protocol is missing"
);

eq(
  cleanHref("https://x.com/bryan/status/123?s=20&t=abcdTRACK"),
  "https://x.com/bryan/status/123",
  "x.com share tokens"
);

eq(
  cleanHref("https://www.youtube.com/watch?v=abc123&t=43s"),
  "https://www.youtube.com/watch?v=abc123&t=43s",
  "youtube t= timestamp is not an x.com token"
);

const wrapped = CleanLink.clean(
  "https://l.facebook.com/l.php?u=https%3A%2F%2Fexample.com%2Fpost%3Futm_source%3Dfb%26id%3D7&fbclid=IwAR0outer"
);
assert(wrapped.ok, "unwrap facebook");
eq(wrapped.clean, "https://example.com/post?id=7", "unwrap then strip inner utm");
assert(wrapped.unwrapped.length >= 1, "records unwrap hop");

eq(
  cleanHref("https://www.google.com/url?q=https%3A%2F%2Fexample.com%2Fa%3Futm_campaign%3Dx&sa=D"),
  "https://example.com/a",
  "unwrap google redirect"
);

eq(
  cleanHref("https://www.amazon.com/dp/B08N5WRWNW/ref=sr_1_1?keywords=kettle&qid=169000&sr=8-1&tag=affil-20&th=1"),
  "https://www.amazon.com/dp/B08N5WRWNW?keywords=kettle&th=1",
  "amazon path ref and affiliate, keep keywords and th"
);

const already = CleanLink.clean("https://example.com/clean-path?ok=1");
assert(already.ok, "already clean is ok");
eq(already.clean, "https://example.com/clean-path?ok=1", "already clean stays");
eq(already.stripped.length, 0, "nothing stripped on a clean link");

const bad = CleanLink.clean("not a url at all %%");
assert(!bad.ok, "invalid url fails");
eq(bad.error, "invalid", "invalid error");

const empty = CleanLink.clean("   ");
assert(!empty.ok, "empty fails");
eq(empty.error, "empty", "empty error");

const sample = CleanLink.clean(CleanLink.sampleDirty());
assert(sample.ok, "sample cleans");
assert(sample.clean.indexOf("si=") === -1, "sample lost si");
assert(sample.clean.indexOf("v=dQw4w9WgXcQ") >= 0, "sample kept video");
assert(hasKey(sample, "utm_source"), "sample reports utm");
assert(hasKey(sample, "fbclid"), "sample reports fbclid");

let history = [];
history = CleanLink.pushHistory(history, {
  dirty: sample.dirty,
  clean: sample.clean,
  stripped: sample.stripped,
  at: 100,
});
history = CleanLink.pushHistory(history, {
  dirty: "https://x.com/a?s=20&t=abc",
  clean: "https://x.com/a",
  stripped: [{ key: "s", value: "20" }],
  at: 200,
});
history = CleanLink.pushHistory(history, {
  dirty: sample.dirty,
  clean: sample.clean,
  stripped: sample.stripped,
  at: 300,
});
eq(history.length, 2, "dedupes matching dirty/clean");
eq(history[0].clean, sample.clean, "latest sample is first");

for (let i = 0; i < 12; i++) {
  history = CleanLink.pushHistory(history, {
    dirty: "https://example.com/" + i + "?utm_source=x",
    clean: "https://example.com/" + i,
    stripped: [{ key: "utm_source", value: "x" }],
    at: 400 + i,
  });
}
eq(history.length, 10, "caps history at 10");

const reloaded = CleanLink.normalizeHistory({ v: 1, history });
eq(reloaded.length, 10, "reload keeps last 10");
eq(reloaded[0].clean, history[0].clean, "reload preserves order");

assert(CleanLink.isTracker("tag", "www.amazon.com"), "amazon tag is extra tracker");
assert(!CleanLink.isTracker("tag", "example.com"), "tag is not global");

console.log("clean-link tests ok");
