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
  assert(sw.indexOf('"trade-grade-v2"') !== -1, "sw cache");
  assert(sw.indexOf("trade-grade-v1") === -1, "old sw cache is gone");
  assert(sw.indexOf("function networkFirst") !== -1, "html is network-first");
  assert(sw.indexOf("function staleWhileRevalidate") !== -1, "js and css revalidate");
  assert(sw.indexOf("url.origin + url.pathname") !== -1, "cache key is the pathname");
  assert(sw.indexOf("url.search") === -1, "query string is not part of the cache key");
  assert(html.indexOf('id="storageCorrupt"') !== -1, "corrupt notice");
  assert(html.indexOf("mirror letter") !== -1, "feature map names the mirror");
  assert(html.indexOf("trade-grade-v2") !== -1, "feature map names the cache");
  assert(html.indexOf("one tap") !== -1, "copy link is one tap");
  assert(app.indexOf("STORAGE_BACKUP_KEY") !== -1, "corrupt value is backed up");
  assert(app.indexOf("toastBag && !options.undo && !options.important") !== -1, "automatic toast keeps an undo");
  assert(app.indexOf("function copyCardLink") !== -1, "card copy is direct");
  assert(app.indexOf("Starred grades fill this phone. Remove one to keep this.") !== -1, "keep cap copy");
  assert(app.indexOf("Remove one to keep this.") !== -1 && app.indexOf("This phone holds 24 grades. Starred grades stay. Remove one to keep this.") === -1, "old keep cap copy is gone");
  const openFn = app.slice(app.indexOf("function openFromShelf"), app.indexOf("function loadSample"));
  assert(openFn.indexOf("writeForm") === -1, "opening a shelf row keeps the draft");
  const keepFn = app.slice(app.indexOf("function keepIncoming"), app.indexOf("function dismissShare"));
  const capToast = keepFn.indexOf("Starred grades fill this phone");
  assert(capToast !== -1, "keep can refuse");
  assert(keepFn.slice(capToast, capToast + 160).indexOf("incoming = null") === -1, "cap refusal keeps the offer");
  const copyFn = app.slice(app.indexOf("function copyCardLink"), app.indexOf("function wire"));
  assert(copyFn.indexOf("writeClipboard") !== -1 && copyFn.indexOf("writeClipboard") < copyFn.indexOf("presentShare"), "clipboard before the dialog");
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
  assert(once.tag === "ROAST READY" || once.tag === "CATASTROPHE", "sample tag follows F");
  assert(once.confidence >= 86 && once.confidence <= 96, "theater confidence band");
  assert(once.roast.indexOf("Ja'Marr Chase") !== -1, "roast names the give");
  assert(once.roast.indexOf("A flex dart and vibes") !== -1, "roast names the get");
  assert(once.roast.toLowerCase().indexOf("a flex dart and vibes for ja'marr") === -1, "sample roast subject is the give");
  eq(TradeGrade.bandFor(once.letter), "f", "f band");
  eq(TradeGrade.LETTERS[3], "C", "C is the mirror point");

  const againSalt = TradeGrade.callBooth(sample.give, sample.get, 3);
  eq(againSalt.letter, once.letter, "re-grade keeps the letter");
  assert(againSalt.roast !== once.roast, "re-grade changes the roast");
  assert(againSalt.tag !== "RE-GRADE", "re-grade stamp follows the letter");
  assert(againSalt.tag === "ROAST READY" || againSalt.tag === "CATASTROPHE", "re-grade stamp is an F stamp");

  const flipped = TradeGrade.callBooth(sample.get, sample.give, 0);
  eq(flipped.letter, "A+", "the other direction is the mirror");
  assert(flipped.tag === "FLEECE CARD" || flipped.tag === "GRAND LARCENY", "fleece tag");
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
  assert(rerolled.card.tag !== "RE-GRADE", "regrade stamp follows the letter");
  assert(rerolled.card.tag === "ROAST READY" || rerolled.card.tag === "CATASTROPHE", "regrade stamp is an F stamp");
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
  eq(parsed.cards[0].starred, false, "share does not carry a star");
  assert(!Object.prototype.hasOwnProperty.call(payload.c[0], "star"), "link omits the star");
  assert(TradeGrade.parseShare(null) === null, "bad share");
  assert(TradeGrade.parseShare({ v: 1, k: "nope", c: [] }) === null, "wrong kind");
  eq(TradeGrade.face(parsed.cards[0]).indexOf("F · ") === 0, true, "face line");

  const kept = TradeGrade.keepShare(TradeGrade.emptyState(), parsed);
  assert(kept.ok, "keep");
  eq(kept.state.openId, parsed.cards[0].id);
  eq(kept.cards[0].starred, false, "keep drops the sender star");
  eq(kept.state.cards[0].starred, false);
  eq(parsed.cards[0].starred, false, "the unpacked snapshot is not starred");
  eq(starred.card.starred, true, "the phone card still has its star");
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

  function mirrorOf(letter) {
    const index = TradeGrade.LETTERS.indexOf(letter);
    return TradeGrade.LETTERS[TradeGrade.LETTERS.length - 1 - index];
  }

  function assertMirror(give, get) {
    const forward = TradeGrade.callBooth(give, get, 0);
    const back = TradeGrade.callBooth(get, give, 0);
    eq(back.letter, mirrorOf(forward.letter), "mirror " + give + " / " + get);
    eq(forward.confidence, back.confidence, "meter matches the mirror");
  }

  const low = TradeGrade.callBooth("Christian McCaffrey", "a kicker", 0);
  eq(low.letter, "F", "a kicker grades low for the giver");
  const high = TradeGrade.callBooth("a kicker", "Christian McCaffrey", 0);
  eq(high.letter, "A+", "the flip is the mirror");
  assert(high.roast.toLowerCase().indexOf("christian mccaffrey for a kicker") === -1, "kicker roast subject is the give");
  assert(
    high.roast.toLowerCase().indexOf("a kicker for christian mccaffrey") !== -1
      || high.roast.toLowerCase().indexOf("you gave a kicker") !== -1,
    "kicker roast leads with the give"
  );
  const kicked = TradeGrade.callBooth("two streamers", "Christian McCaffrey", 0);
  assert(kicked.roast.charAt(0) === kicked.roast.charAt(0).toUpperCase(), "roast starts with a capital");
  eq(TradeGrade.callBooth("Christian McCaffrey", "kickers", 0).letter, "F", "plural kickers count");
  const streamed = TradeGrade.callBooth("Justin Jefferson", "two streamers and a kicker", 0);
  eq(streamed.letter, "F", "streamers and a kicker grade low");
  const pile = TradeGrade.callBooth("Christian McCaffrey", "Pollard, Boyd, Elliott, Wilson, and a dart", 0);
  eq(pile.letter, "F", "five for one grades low");
  eq(TradeGrade.callBooth("Pollard, Boyd, Elliott, Wilson, and a dart", "Christian McCaffrey", 0).letter, "A+", "consolidation mirrors");
  const joke = TradeGrade.callBooth("asdf", "qwer", 0);
  const jokeBack = TradeGrade.callBooth("qwer", "asdf", 0);
  eq(joke.letter, "C", "nonsense gets the joke grade");
  eq(jokeBack.letter, "C", "nonsense stays C both ways");
  assert(joke.tag === "KEY SMASH" || joke.tag === "NOT A ROSTER" || joke.tag === "GARBAGE TIME", "joke stamp");
  assert(joke.roast.toLowerCase().indexOf("keyboard") !== -1, "joke roast");
  assert(TradeGrade.callBooth("Justin Jefferson", "CeeDee Lamb", 0).tag !== "KEY SMASH", "real names are not a keyboard");

  const ordered = TradeGrade.grade(TradeGrade.emptyState(), { give: "Chase, Pollard", get: "Lamb" }, 50);
  const reordered = TradeGrade.grade(ordered.state, { give: "Pollard + Chase", get: "Lamb" }, 51);
  assert(reordered.already, "reordered package reopens the card");
  eq(reordered.state.cards.length, 1, "one shelf row");
  eq(reordered.card.id, ordered.card.id);
  const slashed = TradeGrade.callBooth("Chase / Pollard", "Lamb", 0);
  const amped = TradeGrade.callBooth("Pollard & Chase", "Lamb", 0);
  const worded = TradeGrade.callBooth("Chase and Pollard", "Lamb", 0);
  eq(slashed.letter, ordered.card.letter, "slash order matches");
  eq(amped.letter, ordered.card.letter, "ampersand order matches");
  eq(worded.letter, ordered.card.letter, "and order matches");
  eq(slashed.confidence, ordered.card.confidence, "reorder keeps the meter");
  eq(slashed.tag, ordered.card.tag, "reorder keeps the stamp");
  eq(TradeGrade.grade(TradeGrade.emptyState(), { give: "Chase, Pollard", get: "Pollard and Chase" }, 52).reason, "same", "same names either way");

  assertMirror("Christian McCaffrey", "a kicker");
  assertMirror("Ja'Marr Chase", "A flex dart and vibes");
  assertMirror("Chase, Pollard", "Lamb");
  assertMirror("Patrick Mahomes", "a 1st round pick");
  assertMirror("asdf", "qwer");

  const names = [
    "Christian McCaffrey", "Ja'Marr Chase", "Justin Jefferson", "Tyreek Hill", "CeeDee Lamb",
    "Amon-Ra St. Brown", "Bijan Robinson", "Breece Hall", "Travis Kelce", "Patrick Mahomes",
    "Josh Allen", "Jalen Hurts", "A.J. Brown", "Garrett Wilson", "Drake London", "Tony Pollard",
  ];
  const batch = [];
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length && batch.length < 40; j += 1) batch.push([names[i], names[j]]);
  }
  batch.push(
    ["Christian McCaffrey", "Pollard, Boyd, Elliott, Wilson, and a dart"],
    ["Chase, Pollard", "Lamb"],
    ["Ja'Marr Chase", "a kicker"],
    ["Justin Jefferson", "two streamers and a kicker"],
    ["Patrick Mahomes", "a 1st round pick"],
    ["CeeDee Lamb", "my bench WR2"],
    ["Tyreek Hill", "a backup QB and a dart"],
    ["Travis Kelce", "a 2nd and a handcuff"],
    ["Josh Allen", "kickers and a dst"],
    ["Bijan Robinson", "a flex dart and vibes"]
  );
  const dist = Object.create(null);
  const meters = Object.create(null);
  const stamps = Object.create(null);
  batch.forEach(function (pair) {
    const call = TradeGrade.callBooth(pair[0], pair[1], 0);
    dist[call.letter] = (dist[call.letter] || 0) + 1;
    meters[call.confidence] = true;
    stamps[call.tag] = true;
    assertMirror(pair[0], pair[1]);
  });
  const lettersHit = Object.keys(dist);
  console.log("LETTER_DIST " + JSON.stringify(dist));
  console.log("METERS " + Object.keys(meters).join(","));
  console.log("STAMPS " + Object.keys(stamps).join(","));
  assert(lettersHit.length >= 6, "batch spreads across letters, got " + lettersHit.join(" "));
  assert(Object.keys(meters).length >= 5, "meters vary");
  assert(Object.keys(stamps).length >= 4, "stamps vary");
  assert(stamps["COIN JERSEY"] !== true || Object.keys(stamps).length > 1, "coin jersey is not the only stamp");

  const forged = TradeGrade.parseShare({
    v: 1,
    k: "card",
    c: [{
      id: "forged-card",
      g: "Tyler Boyd",
      t: "Ja'Marr Chase",
      sa: 0,
      lt: "A+",
      cf: 99,
      rs: "Forged roast that is not ours.",
      tg: "FAKE TAG",
      star: 1,
    }],
  });
  const honest = TradeGrade.callBooth("Tyler Boyd", "Ja'Marr Chase", 0);
  eq(forged.cards[0].letter, honest.letter, "forged letter is recomputed");
  eq(forged.cards[0].confidence, honest.confidence, "forged meter is recomputed");
  eq(forged.cards[0].tag, honest.tag, "forged stamp is recomputed");
  eq(forged.cards[0].roast, honest.roast, "forged roast is recomputed");
  eq(forged.cards[0].starred, false, "forged star is dropped");
  assert(forged.cards[0].confidence <= 96, "meter stays in range");
  assert(forged.cards[0].roast.indexOf("Forged") === -1, "forged sentence is dropped");

  let owned = TradeGrade.emptyState();
  for (let i = 0; i < 22; i += 1) {
    owned = TradeGrade.grade(owned, { give: "Own " + i, get: "Theirs " + i }, 5000 + i).state;
  }
  const vaultCards = [];
  for (let i = 0; i < 5; i += 1) {
    vaultCards.push({
      id: "shelf-" + i,
      g: "Shelf " + i,
      t: "Other " + i,
      sa: 0,
      lt: "A+",
      cf: 99,
      rs: "Forged shelf roast.",
      tg: "FAKE TAG",
    });
  }
  const vaultShare = TradeGrade.parseShare({ v: 1, k: "vault", c: vaultCards });
  const preview = TradeGrade.previewKeep(owned, vaultShare);
  eq(preview.adds, 5, "offer adds five");
  eq(preview.drops, 3, "offer drops the three oldest");
  const keptVault = TradeGrade.keepShare(owned, vaultShare);
  assert(keptVault.ok, "partial shelf fits");
  eq(keptVault.dropped.length, 3, "three oldest leave");
  eq(keptVault.dropped[0].card.give, "Own 0");
  eq(keptVault.dropped[2].card.give, "Own 2");
  eq(keptVault.state.cards.length, 24);
  assert(keptVault.cards[0].roast.indexOf("Forged") === -1, "shelf import recomputes");

  let phone = TradeGrade.emptyState();
  for (let i = 0; i < 20; i += 1) {
    phone = TradeGrade.grade(phone, { give: "Mine " + i, get: "Yours " + i }, 6000 + i).state;
  }
  const bigCards = [];
  for (let i = 0; i < 24; i += 1) {
    bigCards.push({ id: "big-" + i, g: "Big " + i, t: "Side " + i, sa: 0, lt: "C", cf: 60, rs: "x", tg: "COIN JERSEY" });
  }
  const bigShare = TradeGrade.parseShare({ v: 1, k: "vault", c: bigCards });
  const bigPreview = TradeGrade.previewKeep(phone, bigShare);
  eq(bigPreview.adds, 24, "a full shelf still fits by making room");
  eq(bigPreview.drops, 20, "it tells you the cost");
  const bigKept = TradeGrade.keepShare(phone, bigShare);
  assert(bigKept.ok, "twenty grades do not refuse a shelf");
  eq(bigKept.state.cards.length, 24);

  let lockedShelf = TradeGrade.emptyState();
  for (let i = 0; i < 24; i += 1) {
    lockedShelf = TradeGrade.grade(lockedShelf, { give: "Star " + i, get: "Lock " + i }, 8000 + i).state;
  }
  lockedShelf.cards.forEach(function (card) {
    lockedShelf = TradeGrade.setStarred(lockedShelf, card.id, true, 9000).state;
  });
  const blockedKeep = TradeGrade.keepShare(lockedShelf, vaultShare);
  eq(blockedKeep.ok, false, "starred shelf refuses");
  eq(blockedKeep.reason, "cap");
  eq(blockedKeep.state.cards.length, 24, "refusal does not drop cards");

  eq(TradeGrade.readStored("{oops").corrupt, true, "bad json is corrupt");
  eq(TradeGrade.readStored("{oops").backup, "{oops");
  eq(TradeGrade.readStored("null").corrupt, true, "null is corrupt");
  eq(TradeGrade.readStored("[]").corrupt, true, "array is corrupt");
  eq(TradeGrade.readStored('"str"').corrupt, true, "string is corrupt");
  eq(TradeGrade.readStored('{"cards":"x"}').corrupt, true, "bad cards field is corrupt");
  eq(TradeGrade.readStored("").corrupt, false, "empty storage is fresh");
  eq(TradeGrade.readStored(null).corrupt, false, "missing storage is fresh");
  const mixedSave = TradeGrade.readStored(JSON.stringify({
    v: 1,
    cards: [{ id: "ok-card", give: "Ada", get: "Bea", salt: 0 }, { id: "nope" }],
  }));
  eq(mixedSave.corrupt, false, "a mixed list is readable");
  eq(mixedSave.state.cards.length, 1, "mixed list keeps the valid card");
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
