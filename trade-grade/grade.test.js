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
vm.runInContext(fs.readFileSync(path.join(__dirname, "grade.js"), "utf8"), context);
const TradeGrade = context.TradeGrade;

function assert(cond, message) {
  if (!cond) throw new Error(message || "assertion failed");
}

function eq(a, b, message) {
  if (a !== b) {
    throw new Error((message || "mismatch") + " expected " + JSON.stringify(b) + " got " + JSON.stringify(a));
  }
}

function read(name) {
  return fs.readFileSync(path.join(__dirname, name), "utf8");
}

function assertCleanSvg(name) {
  const bytes = fs.readFileSync(path.join(__dirname, name));
  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes[i];
    if (byte === 9 || byte === 10 || byte === 13) continue;
    if (byte < 32) throw new Error(name + " has a control byte at " + i);
  }
  const text = bytes.toString("utf8");
  assert(text.indexOf("<svg") === 0, name + " starts with svg");
  assert(text.indexOf("</svg>") !== -1, name + " closes");
}

const sample = TradeGrade.sampleInput();

async function main() {
  eq(TradeGrade.STORAGE_KEY, "trade-grade-v1", "storage key");
  eq(TradeGrade.HISTORY_CAP, 24, "history cap");
  assertCleanSvg("icon.svg");

  const html = read("index.html");
  const app = read("app.js");
  const sw = read("sw.js");
  const manifest = read("manifest.webmanifest");
  const css = read("app.css");
  assert(html.indexOf("<title>Trade Grade</title>") !== -1, "title");
  assert(html.indexOf('class="feature-map"') !== -1, "feature map");
  assert(html.indexOf('class="feature-map" open') === -1, "feature map collapsed");
  assert(html.indexOf('aria-live="polite"') !== -1, "live region");
  assert(html.indexOf('class="skip"') !== -1, "skip link");
  assert(html.indexOf('id="storageFail"') !== -1, "storage banner");
  assert(html.toLowerCase().indexOf("entertainment only") !== -1, "honest copy");
  assert(html.toLowerCase().indexOf("not fantasy advice") !== -1, "not advice");
  assert(html.toLowerCase().indexOf("not betting") !== -1, "not betting");
  assert(html.indexOf("Russo+One") !== -1, "russo one");
  assert(html.indexOf("DM+Mono") !== -1, "dm mono");
  assert(html.indexOf("Outfit") !== -1, "outfit");
  assert(html.indexOf('id="btnKeepShare"') !== -1, "keep");
  assert(html.indexOf(">Not now<") !== -1, "not now");
  assert(html.indexOf("Already on this phone") !== -1, "already copy in the page");
  assert(html.indexOf("oldest unstarred") !== -1, "evict copy");
  assert(html.indexOf(">trade-grade-v1<") !== -1, "feature map names the key");
  assert(app.indexOf("TradeGrade.STORAGE_KEY") !== -1, "app uses storage key");
  assert(app.indexOf('"#g="') !== -1, "hash prefix");
  assert(app.indexOf("Already on this phone.") !== -1, "duplicate toast");
  assert(app.indexOf("innerHTML") === -1, "no innerHTML");
  assert(sw.indexOf('"trade-grade-v1"') !== -1, "sw cache");
  assert(sw.indexOf("function networkFirst") !== -1, "html is network-first");
  assert(sw.indexOf("pathname") !== -1, "cache key is the pathname");
  assert(sw.indexOf("./grade.js") !== -1, "grade module cached");
  assert(manifest.indexOf('"Trade Grade"') !== -1, "manifest name");
  assert(css.indexOf("Russo One") !== -1, "display font");
  const boot = app.slice(app.lastIndexOf("function boot"));
  const listenAt = boot.indexOf('addEventListener("hashchange"');
  const scheduleAt = boot.lastIndexOf("scheduleShareImport()");
  assert(listenAt !== -1 && scheduleAt !== -1 && listenAt < scheduleAt, "hashchange listener before import");

  const once = TradeGrade.callBooth(sample.give, sample.get, 0);
  const twice = TradeGrade.callBooth(sample.give, sample.get, 0);
  eq(once.letter, twice.letter, "stable letter");
  eq(once.roast, twice.roast, "stable roast");
  eq(once.confidence, twice.confidence, "stable confidence");
  eq(once.tag, twice.tag, "stable tag");
  eq(once.letter, "F", "sample is a roast");
  eq(once.tag, "ROAST READY", "sample tag");
  assert(once.confidence >= 88 && once.confidence <= 92, "theater confidence band");
  assert(once.roast.indexOf("Ja'Marr Chase") !== -1, "roast names the give");
  assert(once.roast.indexOf("A flex dart and vibes") !== -1, "roast names the get");
  eq(TradeGrade.bandFor(once.letter), "f", "f band");

  const againSalt = TradeGrade.callBooth(sample.give, sample.get, 3);
  eq(againSalt.letter, once.letter, "re-grade keeps the letter");
  assert(againSalt.roast !== once.roast, "re-grade changes the roast");
  eq(againSalt.tag, "RE-GRADE", "re-grade tag");

  const flipped = TradeGrade.callBooth(sample.get, sample.give, 0);
  eq(flipped.letter, "A", "the other direction is a fleece");
  eq(flipped.tag, "FLEECE CARD", "fleece tag");
  assert(flipped.roast !== once.roast, "direction changes the roast");

  const noted = TradeGrade.callBooth("Ada", "Bea", 0);
  const withNote = TradeGrade.grade(TradeGrade.emptyState(), {
    give: "Ada",
    get: "Bea",
    note: "elite stud hammer dart vibes",
  }, 5);
  eq(withNote.card.letter, noted.letter, "note does not move the letter");
  eq(withNote.card.roast, noted.roast, "note does not move the roast");

  const messy = TradeGrade.grade(TradeGrade.emptyState(), {
    give: "  Ja'Marr   Chase ",
    get: "\nA flex dart and vibes\t",
    note: "  Work league · 12 team  ",
  }, 9);
  assert(messy.ok, "trimmed grade");
  eq(messy.card.give, sample.give);
  eq(messy.card.get, sample.get);
  eq(messy.card.note, sample.note);
  eq(messy.card.letter, once.letter);
  eq(messy.card.roast, once.roast);

  const sameAgain = TradeGrade.grade(messy.state, {
    give: "ja'marr chase",
    get: "a flex dart and vibes",
    note: "dynasty",
  }, 10);
  assert(sameAgain.ok && sameAgain.already, "same pair reopens");
  eq(sameAgain.state.cards.length, 1, "no duplicate card");
  eq(sameAgain.card.id, messy.card.id, "same card");
  eq(sameAgain.card.note, sample.note, "reopen keeps the note");
  eq(sameAgain.card.letter, "F");
  eq(sameAgain.card.roast, once.roast);

  eq(TradeGrade.grade(TradeGrade.emptyState(), { give: "  ", get: "   " }, 1).reason, "blank");
  eq(TradeGrade.grade(TradeGrade.emptyState(), { give: "", get: "Bea" }, 1).reason, "give");
  eq(TradeGrade.grade(TradeGrade.emptyState(), { give: "Ada", get: " \n" }, 1).reason, "get");
  eq(TradeGrade.grade(TradeGrade.emptyState(), { give: "Ada", get: " ada " }, 1).reason, "same");

  const spicy = "<script>alert(1)</script> 🔥";
  const safe = TradeGrade.grade(TradeGrade.emptyState(), { give: spicy, get: "A real package" }, 12);
  assert(safe.ok, "html and emoji grade");
  eq(safe.card.give, spicy, "markup stays text");
  assert(safe.card.give.indexOf("<script>") !== -1, "script text kept");
  assert(safe.card.give.indexOf("🔥") !== -1, "emoji kept");
  const long = TradeGrade.grade(TradeGrade.emptyState(), {
    give: "A".repeat(200) + "🔥",
    get: "B".repeat(200),
  }, 13);
  eq(Array.from(long.card.give).length, 80, "give capped by code point");
  eq(long.card.get.length, 80, "get capped");
  assert(long.card.roast.length <= 240, "roast capped");
  eq(TradeGrade.normalizeCard({ id: "ok-id", give: "Ada\u0000Bee", get: "Cee", salt: 0 }).give, "Ada Bee", "control bytes collapse");

  let shelf = TradeGrade.emptyState();
  for (let i = 0; i < 24; i += 1) {
    const added = TradeGrade.grade(shelf, { give: "G" + i, get: "T" + i }, 1000 + i);
    assert(added.ok && !added.already, "fill " + i);
    eq(added.dropped.length, 0, "room under the cap");
    shelf = added.state;
  }
  eq(shelf.cards.length, 24, "cap filled");
  const evicted = TradeGrade.grade(shelf, { give: "G24", get: "T24" }, 2000);
  assert(evicted.ok, "cap evicts");
  eq(evicted.state.cards.length, 24, "cap holds");
  eq(evicted.dropped.length, 1, "one eviction");
  eq(evicted.dropped[0].card.give, "G0", "oldest unstarred leaves");
  assert(!evicted.state.cards.some(function (card) { return card.give === "G0"; }), "oldest is gone");
  eq(evicted.state.cards[0].give, "G24", "new grade is open");
  eq(evicted.state.openId, evicted.card.id);

  const oldest = shelf.cards.find(function (card) { return card.give === "G0"; });
  const starredShelf = TradeGrade.setStarred(shelf, oldest.id, true, 1500).state;
  const spared = TradeGrade.grade(starredShelf, { give: "G24", get: "T24" }, 2001);
  eq(spared.dropped[0].card.give, "G1", "next oldest unstarred leaves");
  assert(spared.state.cards.some(function (card) { return card.give === "G0" && card.starred; }), "starred stays");

  let locked = shelf;
  shelf.cards.forEach(function (card) {
    locked = TradeGrade.setStarred(locked, card.id, true, 1600).state;
  });
  const blocked = TradeGrade.grade(locked, { give: "GX", get: "TX" }, 3000);
  eq(blocked.ok, false, "starred shelf is not evicted");
  eq(blocked.reason, "cap");
  eq(blocked.state.cards.length, 24);

  const rerolled = TradeGrade.regrade(messy.state, messy.card.id, 20);
  assert(rerolled.ok, "regrade");
  eq(rerolled.card.letter, "F", "letter holds");
  eq(rerolled.card.salt, 1, "salt bumps");
  assert(rerolled.card.roast !== messy.card.roast, "new roast");
  eq(rerolled.card.tag, "RE-GRADE");
  const undone = TradeGrade.putCard(rerolled.state, rerolled.previous);
  eq(undone.card.roast, messy.card.roast, "undo regrade");
  eq(undone.card.salt, 0);

  const starred = TradeGrade.setStarred(undone.state, undone.card.id, true, 21);
  assert(starred.card.starred, "starred");
  const unstar = TradeGrade.putCard(starred.state, starred.previous);
  eq(unstar.card.starred, false, "undo star");

  const removed = TradeGrade.removeCard(starred.state, starred.card.id);
  assert(removed.ok, "remove");
  eq(removed.state.cards.length, 0);
  eq(removed.state.openId, "");
  const restored = TradeGrade.restoreCard(removed.state, removed.removed, removed.index, removed.wasOpen);
  assert(restored.ok, "restore");
  eq(restored.state.openId, starred.card.id);
  eq(restored.state.cards[0].starred, true);

  const filtered = TradeGrade.setFilter(restored.state, "starred");
  eq(filtered.filter, "starred");
  eq(TradeGrade.visibleCards(filtered).length, 1, "starred filter");
  eq(TradeGrade.setFilter(filtered, "nope").filter, "all", "bad filter ignored");
  const cleared = TradeGrade.clearCards(filtered);
  eq(cleared.state.cards.length, 0);
  eq(cleared.state.filter, "starred", "clear keeps the filter");
  const brought = TradeGrade.restoreAll(cleared.state, cleared.previous, cleared.openId);
  eq(brought.state.cards.length, 1);
  eq(brought.state.filter, "starred");
  eq(brought.state.openId, starred.card.id);

  const loaded = TradeGrade.loadSample(TradeGrade.emptyState());
  assert(loaded.ok && !loaded.already, "sample loads");
  eq(loaded.card.id, TradeGrade.SAMPLE_ID);
  eq(loaded.card.letter, "F");
  eq(loaded.card.roast, once.roast);
  const second = TradeGrade.loadSample(loaded.state);
  assert(second.already, "sample reopens");
  eq(second.state.cards.length, 1, "sample does not duplicate");

  const payload = TradeGrade.shareCard(starred.card);
  eq(payload.k, "card");
  const parsed = TradeGrade.parseShare(JSON.parse(JSON.stringify(payload)));
  eq(parsed.cards[0].id, starred.card.id);
  eq(parsed.cards[0].letter, "F");
  eq(parsed.cards[0].roast, starred.card.roast);
  eq(parsed.cards[0].starred, true, "share can record a star");
  assert(TradeGrade.parseShare(null) === null, "bad share");
  assert(TradeGrade.parseShare({ v: 1, k: "nope", c: [] }) === null, "wrong kind");
  eq(TradeGrade.face(parsed.cards[0]).indexOf("F · ") === 0, true, "face line");

  const kept = TradeGrade.keepShare(TradeGrade.emptyState(), parsed);
  assert(kept.ok, "keep");
  eq(kept.state.openId, parsed.cards[0].id);
  eq(kept.cards[0].starred, false, "keep drops the sender star");
  eq(kept.state.cards[0].starred, false);
  eq(parsed.cards[0].starred, true, "the snapshot still records the star");
  const dup = TradeGrade.keepShare(kept.state, parsed);
  eq(dup.ok, false);
  eq(dup.reason, "exists");

  const pairDup = TradeGrade.keepShare(kept.state, TradeGrade.parseShare({
    v: 1,
    k: "card",
    c: [{
      id: "other-id",
      g: starred.card.give,
      t: starred.card.get,
      sa: 0,
      lt: "F",
      cf: 90,
      rs: starred.card.roast,
      tg: "ROAST READY",
    }],
  }));
  eq(pairDup.reason, "exists", "same pair is already on this phone");

  const vault = TradeGrade.shareVault(kept.state);
  eq(vault.k, "vault");
  eq(vault.c.length, 1);
  const vaultParsed = TradeGrade.parseShare(vault);
  eq(vaultParsed.k, "vault");

  let roomy = TradeGrade.emptyState();
  for (let i = 0; i < 23; i += 1) {
    roomy = TradeGrade.grade(roomy, { give: "V" + i, get: "W" + i }, 4000 + i).state;
  }
  const starredDone = roomy.cards.find(function (card) { return card.give === "V0"; });
  roomy = TradeGrade.setStarred(roomy, starredDone.id, true, 4100).state;
  roomy = TradeGrade.grade(roomy, { give: "V23", get: "W23" }, 4300).state;
  eq(roomy.cards.length, 24);
  const incoming = TradeGrade.parseShare({
    v: 1,
    k: "card",
    c: [{
      id: "fresh-card",
      g: "Fresh Give",
      t: "Fresh Get",
      sa: 0,
      lt: "C+",
      cf: 70,
      rs: "A shared roast.",
      tg: "COIN JERSEY",
      star: 1,
    }],
  });
  const made = TradeGrade.keepShare(roomy, incoming);
  assert(made.ok, "keep at the cap");
  eq(made.dropped.length, 1);
  eq(made.dropped[0].card.give, "V1", "oldest unstarred, not the open card, not the star");
  assert(made.state.cards.some(function (card) { return card.give === "V0" && card.starred; }), "star survives keep");
  eq(made.state.cards[0].id, "fresh-card");
  eq(made.state.cards[0].starred, false);

  const packed = await TradeGrade.compressPayload(JSON.stringify(payload));
  assert(packed.indexOf("j.") === 0 || packed.indexOf("z.") === 0, "packed prefix");
  const json = await TradeGrade.decompressPayload(packed);
  eq(TradeGrade.parseShare(JSON.parse(json)).cards[0].roast, starred.card.roast, "round trip");
  let threw = false;
  try {
    await TradeGrade.decompressPayload("nope");
  } catch (_) {
    threw = true;
  }
  assert(threw, "bad token throws");

  const dirty = TradeGrade.normalizeState({
    v: 1,
    openId: "missing",
    filter: "starred",
    cards: [{ id: "ok", give: "Ada", get: "Bea", salt: 0 }, { id: "bad" }, null],
  });
  eq(dirty.cards.length, 1, "drops junk");
  eq(dirty.openId, "ok", "falls back to a real card");
  eq(dirty.filter, "starred");
  eq(dirty.cards[0].give, "Ada");
  assert(TradeGrade.LETTERS.indexOf(dirty.cards[0].letter) !== -1, "recomputed letter");
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
