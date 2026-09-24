const fs = require("fs");
const path = require("path");
const vm = require("vm");

const context = {
  console,
  crypto,
  TextEncoder,
  TextDecoder,
  Uint8Array,
  Blob,
  Response,
  btoa,
  atob,
  CompressionStream: globalThis.CompressionStream,
  DecompressionStream: globalThis.DecompressionStream,
  escape,
  decodeURIComponent,
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "log.js"), "utf8"), context);
const BeatLog = context.BeatLog;

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function eq(a, b, message) {
  if (a !== b) {
    throw new Error((message || "mismatch") + " expected " + JSON.stringify(b) + " got " + JSON.stringify(a));
  }
}

eq(BeatLog.STORAGE_KEY, "beat-log-v1", "storage key");
eq(BeatLog.ENTRY_CAP, 48, "cap");
eq(BeatLog.ratingPhrase(null), "Unrated", "unrated phrase");
eq(BeatLog.ratingPhrase(1), "1 star", "one star");
eq(BeatLog.ratingPhrase(4.5), "4.5 stars", "half phrase");
eq(BeatLog.starPercent(4.5), 90, "half width");
eq(BeatLog.normalizeRating(4.25), 4.5, "snap up");
eq(BeatLog.normalizeRating(4.24), 4, "snap down");
eq(BeatLog.normalizeRating(0.24), null, "too small");
eq(BeatLog.normalizeRating(0.25), 0.5, "minimum half");
eq(BeatLog.normalizeRating(5.5), null, "too big");
eq(BeatLog.normalizeRating("nope"), null, "junk rating");

const empty = BeatLog.normalizeState(null);
eq(empty.entries.length, 0, "null state");
eq(empty.filter, "all", "default filter");
eq(BeatLog.normalizeState({ entries: "nope" }).entries.length, 0, "bad entries");

let state = BeatLog.emptyState();
let added = BeatLog.addEntry(state, { title: "   ", status: "playing" }, 1000);
eq(added.ok, false, "blank title");
eq(added.reason, "title", "title reason");

added = BeatLog.addEntry(state, { title: "Hades", status: "nope" }, 1000);
eq(added.ok, false, "bad status");

added = BeatLog.addEntry(state, { title: "Hades", status: "playing", rating: 9 }, 1000);
eq(added.reason, "rating", "bad rating rejected");

added = BeatLog.addEntry(state, {
  title: "  Hades \n II  ",
  status: "Playing",
  platform: " Switch ",
  rating: 4.5,
  take: "The run\nthat stuck.",
}, 2000);
assert(added.ok, "add hades");
state = added.state;
eq(state.entries[0].title, "Hades II", "title clamped");
eq(state.entries[0].status, "playing", "status lower");
eq(state.entries[0].platform, "Switch", "platform trim");
eq(state.entries[0].take, "The run that stuck.", "take one line");
eq(state.entries[0].rating, 4.5, "rating kept");
eq(state.entries[0].updated, 2000, "stamp");
const hadesId = state.entries[0].id;

const celeste = BeatLog.addEntry(state, { title: "Celeste", status: "beaten", rating: 5, platform: "PC" }, 1000);
assert(celeste.ok, "add celeste");
state = celeste.state;
const visibleRecent = BeatLog.visibleEntries(state);
eq(visibleRecent[0].title, "Hades II", "recent first");
state = BeatLog.setSort(state, "title");
eq(BeatLog.visibleEntries(state)[0].title, "Celeste", "alpha first");
state = BeatLog.setFilter(state, "beaten");
eq(BeatLog.visibleEntries(state).length, 1, "beaten filter");
eq(BeatLog.visibleEntries(state)[0].title, "Celeste", "beaten is celeste");
eq(BeatLog.counts(state).playing, 1, "playing count");
eq(BeatLog.counts(state).all, 2, "all count");
state = BeatLog.setFilter(state, "nope");
eq(state.filter, "beaten", "bad filter ignored");
state = BeatLog.setFilter(state, "all");
state = BeatLog.setSort(state, "recent");

const edited = BeatLog.updateEntry(state, hadesId, {
  title: "Hades",
  status: "beaten",
  platform: "Switch",
  rating: 5,
  take: "Credits.",
}, 3000);
assert(edited.ok, "edit");
state = edited.state;
eq(edited.entry.id, hadesId, "id stable");
eq(edited.entry.status, "beaten", "edited status");

const removed = BeatLog.removeEntry(state, hadesId);
assert(removed.ok, "remove");
eq(removed.index, 1, "hades was second after celeste was prepended");
state = removed.state;
eq(state.entries.length, 1, "one left");
const restored = BeatLog.restoreEntry(state, removed.entry, removed.index);
assert(restored.ok, "undo");
state = restored.state;
eq(state.entries.length, 2, "restored count");
eq(BeatLog.restoreEntry(state, removed.entry, 0).reason, "exists", "no double undo");

let capped = BeatLog.emptyState();
for (let i = 0; i < BeatLog.ENTRY_CAP; i += 1) {
  const next = BeatLog.addEntry(capped, { title: "Game " + i, status: "wishlist" }, i + 1);
  assert(next.ok, "fill " + i);
  capped = next.state;
}
eq(capped.entries.length, 48, "full");
eq(BeatLog.addEntry(capped, { title: "One more", status: "playing" }, 99).reason, "cap", "cap blocks");

const card = BeatLog.shareCard(state.entries.find((entry) => entry.id === hadesId));
eq(card.k, "card", "card kind");
eq(card.e.length, 1, "one card");
eq(card.e[0].title, "Hades", "card title");
const parsedCard = BeatLog.parseShare(card);
eq(parsedCard.entries[0].rating, 5, "card rating roundtrip");
eq(BeatLog.parseShare({ k: "card", e: [{ title: "" }] }), null, "empty card dropped");
eq(BeatLog.parseShare({ k: "nope", e: [{ title: "A", status: "playing" }] }), null, "bad kind");
const two = BeatLog.parseShare({
  k: "card",
  e: [
    { id: "a", title: "First", status: "playing", updated: 1 },
    { id: "b", title: "Second", status: "playing", updated: 2 },
  ],
});
eq(two.entries.length, 1, "card keeps one");
eq(two.entries[0].title, "First", "card keeps first");

const shelf = BeatLog.shareShelf(state);
eq(shelf.k, "shelf", "shelf kind");
eq(shelf.e.length, 2, "shelf size");
eq(shelf.e.find((row) => row.title === "Celeste").platform, "PC", "platform kept");
const bare = BeatLog.shareCard({ id: "x", title: "Bare", status: "dropped", platform: "", take: "", rating: null, updated: 5 });
assert(!("platform" in bare.e[0]), "empty platform omitted");
assert(!("take" in bare.e[0]), "empty take omitted");
assert(!("rating" in bare.e[0]), "null rating omitted");

const mine = BeatLog.addEntry(BeatLog.emptyState(), { title: "Mine", status: "playing" }, 9).state;
const merged = BeatLog.mergeShare(mine, BeatLog.parseShare(shelf));
eq(merged.added, 2, "merge adds");
eq(merged.state.entries.length, 3, "merge size");
const again = BeatLog.mergeShare(merged.state, BeatLog.parseShare(shelf));
eq(again.added, 0, "merge skips ids");
eq(again.skipped, 2, "skipped both");
const replaced = BeatLog.replaceWithShare(mine, BeatLog.parseShare(shelf));
eq(replaced.entries.length, 2, "replace drops mine");
eq(replaced.entries.some((entry) => entry.title === "Mine"), false, "mine gone");

const reloaded = BeatLog.normalizeState(JSON.parse(JSON.stringify(state)));
eq(reloaded.entries.length, state.entries.length, "reload count");
eq(reloaded.sort, "recent", "reload sort");
eq(reloaded.entries.find((entry) => entry.id === hadesId).title, "Hades", "reload title");

async function roundTrip() {
  const payload = BeatLog.shareShelf(state);
  const token = await BeatLog.compressPayload(JSON.stringify(payload));
  assert(token.startsWith("z.") || token.startsWith("j."), "token prefix");
  assert(token.length < 8000, "token stays link-sized");
  const back = BeatLog.parseShare(JSON.parse(await BeatLog.decompressPayload(token)));
  eq(back.k, "shelf", "decoded kind");
  eq(back.entries.map((entry) => entry.title).sort().join("|"), "Celeste|Hades", "decoded titles");

  const manual = "j." + Buffer.from(JSON.stringify(card), "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  const fromJ = BeatLog.parseShare(JSON.parse(await BeatLog.decompressPayload(manual)));
  eq(fromJ.entries[0].title, "Hades", "j. token");

  if (typeof CompressionStream !== "undefined") {
    const json = JSON.stringify(payload);
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("deflate"));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    const zipped = "z." + btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    eq(await BeatLog.decompressPayload(zipped), json, "z. token");
  }

  let threw = false;
  try {
    await BeatLog.decompressPayload("!!!");
  } catch (_) {
    threw = true;
  }
  assert(threw, "bad token throws");

  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
  const sw = fs.readFileSync(path.join(__dirname, "sw.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "app.css"), "utf8");
  assert(html.indexOf("#b=") !== -1, "hash documented");
  assert(html.indexOf("beat-log-v1") !== -1, "storage name in page");
  assert(html.indexOf("Feature Map") !== -1, "feature map");
  assert(app.indexOf('"#b="') !== -1 && app.indexOf('"b"') !== -1, "app reads hash and query");
  assert(app.indexOf("beat-log-v1") === -1, "app uses the key from log.js");
  assert(sw.indexOf('const CACHE = "beat-log-v1"') !== -1, "cache name");
  assert(css.indexOf(".poster") !== -1, "share card styles");
  console.log("beat-log tests ok");
}

roundTrip().catch((err) => {
  console.error(err);
  process.exit(1);
});
