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
vm.runInContext(fs.readFileSync(path.join(__dirname, "bomb.js"), "utf8"), context);
const BenchBomb = context.BenchBomb;

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

const sample = BenchBomb.sampleInput();

async function main() {
  eq(BenchBomb.STORAGE_KEY, "bench-bomb-v1", "storage key");
  eq(BenchBomb.HISTORY_CAP, 24, "history cap");
  assertCleanSvg("icon.svg");

  const html = read("index.html");
  const app = read("app.js");
  const sw = read("sw.js");
  const manifest = read("manifest.webmanifest");
  const css = read("app.css");
  assert(html.indexOf("<title>Bench Bomb</title>") !== -1, "title");
  assert(html.indexOf('class="feature-map"') !== -1, "feature map");
  assert(html.indexOf('class="feature-map" open') === -1, "feature map collapsed");
  assert(html.indexOf('aria-live="polite"') !== -1, "live region");
  assert(html.indexOf('class="skip"') !== -1, "skip link");
  assert(html.indexOf('id="storageFail"') !== -1, "storage banner");
  assert(html.toLowerCase().indexOf("entertainment only") !== -1, "honest copy");
  assert(html.toLowerCase().indexOf("not fantasy advice") !== -1, "not advice");
  assert(html.toLowerCase().indexOf("not betting") !== -1, "not betting");
  assert(html.toLowerCase().indexOf("no money") !== -1, "no money");
  assert(html.indexOf("Russo+One") !== -1, "russo one");
  assert(html.indexOf("DM+Mono") !== -1, "dm mono");
  assert(html.indexOf("Outfit") !== -1, "outfit");
  assert(html.indexOf('id="btnKeepShare"') !== -1, "keep");
  assert(html.indexOf(">Not now<") !== -1, "not now");
  assert(html.indexOf("Already on this phone") !== -1, "already copy in the page");
  assert(html.indexOf("oldest unstarred") !== -1, "evict copy");
  assert(html.indexOf(">bench-bomb-v1<") !== -1, "feature map names the key");
  assert(html.indexOf("#n=") !== -1, "hash documented");
  assert(html.indexOf("?n=") !== -1, "query documented");
  assert(app.indexOf("BenchBomb.STORAGE_KEY") !== -1, "app uses storage key");
  assert(app.indexOf('"#n="') !== -1, "hash prefix");
  assert(app.indexOf('"#b="') === -1, "beat log keeps hash b");
  assert(app.indexOf('const QUERY_KEY = "n"') !== -1, "query key");
  assert(app.indexOf("Already on this phone.") !== -1, "duplicate toast");
  assert(app.indexOf("innerHTML") === -1, "no innerHTML");
  assert(sw.indexOf('"bench-bomb-v3"') !== -1, "sw cache");
  assert(sw.indexOf('"bench-bomb-v1"') === -1, "old sw cache is gone");
  assert(sw.indexOf("function networkFirst") !== -1, "html is network-first");
  assert(sw.indexOf("function staleWhileRevalidate") !== -1, "js and css revalidate");
  assert(sw.indexOf("url.origin + url.pathname + url.search") !== -1, "versioned assets keep the query");
  assert(sw.indexOf("url.origin + url.pathname);") !== -1, "html cache key stays the pathname");
  assert(html.indexOf('id="storageCorrupt"') !== -1, "corrupt notice");
  assert(html.indexOf("bench-bomb-v3") !== -1, "feature map names the cache");
  assert(html.indexOf("Enter a number") !== -1, "points hint asks for a number");
  assert(html.indexOf("one tap") !== -1, "copy link is one tap");
  assert(app.indexOf("STORAGE_BACKUP_KEY") !== -1, "corrupt value is backed up");
  assert(app.indexOf("function retireStaleUndo") !== -1, "undo leaves when it cannot run");
  assert(app.indexOf("toastExtra") !== -1, "confirmation shows beside a live undo");
  assert(app.indexOf("if (!toastBag) toast(msg, { important: true });") !== -1, "form error does not cover undo");
  assert(app.indexOf("No starter got named.") === -1, "app does not use the system starter line");
  assert(read("bomb.js").indexOf("No starter got named.") === -1, "engine dropped the system starter line");
  assert(read("bomb.js").indexOf("No alibi on file.") !== -1, "missing starter stays in voice");
  assert(read("bomb.js").indexOf("% 41") === -1, "unknown points are not hashed into an energy");
  assert(app.indexOf("function copyCardLink") !== -1, "card copy is direct");
  assert(app.indexOf("Starred bombs fill this phone. Remove one to keep this.") !== -1, "keep cap copy");
  assert(app.indexOf("This phone holds 24 bombs. Starred bombs stay. Remove one to bomb another.") !== -1, "bomb cap copy");
  const openFn = app.slice(app.indexOf("function openFromShelf"), app.indexOf("function loadSample"));
  assert(openFn.indexOf("writeForm") === -1, "opening a shelf row keeps the draft");
  const keepFn = app.slice(app.indexOf("function keepIncoming"), app.indexOf("function dismissShare"));
  const capToast = keepFn.indexOf("Starred bombs fill this phone");
  assert(capToast !== -1, "keep can refuse");
  assert(keepFn.slice(capToast, capToast + 180).indexOf("incoming = null") === -1, "cap refusal keeps the offer");
  const copyFn = app.slice(app.indexOf("function copyCardLink"), app.indexOf("function wire"));
  assert(copyFn.indexOf("writeClipboard") !== -1 && copyFn.indexOf("writeClipboard") < copyFn.indexOf("presentShare"), "clipboard before the dialog");
  assert(sw.indexOf("./bomb.js") !== -1, "bomb module cached");
  assert(manifest.indexOf('"Bench Bomb"') !== -1, "manifest name");
  assert(css.indexOf("Russo One") !== -1, "display font");
  assert(css.indexOf("overflow-x: hidden") !== -1, "no sideways scroll");
  const boot = app.slice(app.lastIndexOf("function boot"));
  const listenAt = boot.indexOf('addEventListener("hashchange"');
  const scheduleAt = boot.lastIndexOf("scheduleShareImport()");
  assert(listenAt !== -1 && scheduleAt !== -1 && listenAt < scheduleAt, "hashchange listener before import");

  const once = BenchBomb.callBomb(sample.sat, sample.start, sample.points, 0);
  const twice = BenchBomb.callBomb(sample.sat, sample.start, sample.points, 0);
  eq(once.energy, twice.energy, "stable energy");
  eq(once.roast, twice.roast, "stable roast");
  eq(once.fallout, twice.fallout, "stable fallout");
  eq(once.tag, twice.tag, "stable stamp");
  eq(once.energy, "NUCLEAR", "sample is nuclear");
  assert(once.tag === "NUCLEAR SIT" || once.tag === "BENCH BOMB", "sample stamp follows nuclear");
  assert(once.fallout >= 88 && once.fallout <= 96, "fallout band");
  assert(once.roast.indexOf("Justin Jefferson") !== -1, "sample names the bench");
  assert(once.roast.indexOf("38.4") !== -1, "sample names the points");
  assert(once.roast.indexOf("You started A committee back instead.") !== -1, "sample names the starter");
  assert(once.roast.indexOf("Another detonation.") !== 0, "first bomb is not a re-bomb lead");
  eq(BenchBomb.bandFor(once.energy), "nuclear", "nuclear band");

  const againSalt = BenchBomb.callBomb(sample.sat, sample.start, sample.points, 3);
  eq(againSalt.energy, once.energy, "re-bomb keeps the energy");
  eq(againSalt.tag, once.tag, "re-bomb keeps the stamp");
  eq(againSalt.fallout, once.fallout, "re-bomb keeps the fallout");
  assert(againSalt.roast !== once.roast, "re-bomb changes the roast");
  const leadRoasts = [0, 1, 2, 3, 4].map(function (salt) {
    return BenchBomb.callBomb(sample.sat, sample.start, sample.points, salt).roast;
  });
  const anotherCount = leadRoasts.filter(function (roast) {
    return roast.indexOf("Another detonation.") === 0;
  }).length;
  assert(anotherCount >= 1 && anotherCount < leadRoasts.length, "re-bomb lead rotates");

  const noted = BenchBomb.callBomb("Ada", "", "12", 0);
  const withNote = BenchBomb.bomb(BenchBomb.emptyState(), {
    sat: "Ada",
    start: "",
    points: "12",
    note: "nuclear stud hammer",
  }, 5);
  eq(withNote.card.energy, noted.energy, "note does not move the energy");
  eq(withNote.card.roast, noted.roast, "note does not move the roast");
  eq(withNote.card.note, "nuclear stud hammer");

  const messy = BenchBomb.bomb(BenchBomb.emptyState(), {
    sat: "  Justin   Jefferson ",
    start: "\nA committee back\t",
    points: "  38.4  ",
    note: "  Week 4 · work league  ",
  }, 9);
  assert(messy.ok, "trimmed bomb");
  eq(messy.card.sat, sample.sat);
  eq(messy.card.start, sample.start);
  eq(messy.card.points, sample.points);
  eq(messy.card.note, sample.note);
  eq(messy.card.energy, once.energy);
  eq(messy.card.roast, once.roast);

  const sameAgain = BenchBomb.bomb(messy.state, {
    sat: "jefferson justin",
    start: "back committee a",
    points: "about 38.4",
    note: "dynasty",
  }, 10);
  assert(sameAgain.ok && sameAgain.already, "order-normalized sit reopens");
  eq(sameAgain.state.cards.length, 1, "no duplicate card");
  eq(sameAgain.card.id, messy.card.id, "same card");
  eq(sameAgain.card.note, "dynasty", "same sit saves the new week note");
  eq(sameAgain.card.roast, once.roast);

  const ranged = BenchBomb.bomb(BenchBomb.emptyState(), { sat: "Ada", points: "30-40" }, 11);
  const flippedRange = BenchBomb.bomb(ranged.state, { sat: "Ada", points: "40 to 30" }, 12);
  assert(flippedRange.already, "range order does not matter");
  eq(flippedRange.card.energy, "NUCLEAR", "midpoint of 30-40 is nuclear");

  eq(BenchBomb.bomb(BenchBomb.emptyState(), { sat: "  ", points: "   " }, 1).reason, "blank");
  eq(BenchBomb.bomb(BenchBomb.emptyState(), { sat: "", points: "12" }, 1).reason, "sat");
  eq(BenchBomb.bomb(BenchBomb.emptyState(), { sat: "Ada", points: " \n" }, 1).reason, "points");

  const spicy = "<script>alert(1)</script> 🔥";
  const safe = BenchBomb.bomb(BenchBomb.emptyState(), { sat: spicy, points: "21" }, 12);
  assert(safe.ok, "html and emoji bomb");
  eq(safe.card.sat, spicy, "markup stays text");
  assert(safe.card.sat.indexOf("<script>") !== -1, "script text kept");
  assert(safe.card.sat.indexOf("🔥") !== -1, "emoji kept");
  const long = BenchBomb.bomb(BenchBomb.emptyState(), {
    sat: "A".repeat(200) + "🔥",
    points: "21",
  }, 13);
  eq(Array.from(long.card.sat).length, 80, "name capped by code point");
  eq(BenchBomb.bomb(BenchBomb.emptyState(), { sat: "Ada", points: "B".repeat(80) }, 14).reason, "number", "junk points do not bomb");
  eq(BenchBomb.pointsReading("8".repeat(80)).display, "999", "a huge number stays a number");
  const huge = BenchBomb.bomb(BenchBomb.emptyState(), { sat: "Ada", points: "8".repeat(80) }, 15);
  assert(huge.ok, "huge number still bombs");
  eq(huge.card.points, "999");
  assert(huge.card.roast.length <= 240, "roast capped");
  eq(BenchBomb.normalizeCard({ id: "ok-id", sat: "Ada\u0000Bee", points: "9", salt: 0 }).sat, "Ada Bee", "control bytes collapse");

  eq(BenchBomb.callBomb("Zed", "", "0", 0).energy, "DUD", "zero is a dud");
  assert(BenchBomb.callBomb("Zed", "", "0", 0).roast.toLowerCase().indexOf("dodged") !== -1, "zero dodged it");
  eq(BenchBomb.callBomb("Zed", "", "8", 0).energy, "SPARK", "eight is a spark");
  eq(BenchBomb.callBomb("Zed", "", "16", 0).energy, "BLAST", "sixteen is a blast");
  eq(BenchBomb.callBomb("Zed", "", "26", 0).energy, "CRATER", "twenty-six is a crater");
  eq(BenchBomb.bomb(BenchBomb.emptyState(), { sat: "Zed", points: "a ton" }, 1).reason, "number", "a ton is not a score");
  eq(BenchBomb.bomb(BenchBomb.emptyState(), { sat: "Zed", points: "nuclear" }, 1).reason, "number", "the word nuclear is not a score");
  eq(BenchBomb.callBomb("Zed", "", "nuclear", 0), null, "unparsed points do not invent an energy");
  eq(BenchBomb.pointsReading("40+").key, "40+", "plus keeps its own key");
  eq(BenchBomb.pointsReading("40").key, "40");
  assert(BenchBomb.callBomb("Zed", "", "40+", 0).energy === "NUCLEAR", "plus runs hot");

  ["none", "zilch", "zero", "DNP", "bye", "out", "injured", "IR", "nada", "zip"].forEach(function (word) {
    const reading = BenchBomb.pointsReading(word);
    eq(reading.ok, true, word + " parses");
    eq(reading.display, "0", word + " displays as zero");
    eq(reading.value, 0, word + " is zero");
    const call = BenchBomb.callBomb("Aaron Rodgers", "", word, 0);
    eq(call.energy, "DUD", word + " is a dud");
    assert(call.roast.toLowerCase().indexOf("dodged") !== -1, word + " dodged it");
    assert(call.roast.indexOf(word) === -1, word + " is not pasted into the roast");
  });
  eq(BenchBomb.pointsReading("thirty-two").display, "32", "thirty-two");
  eq(BenchBomb.pointsReading("thirty two").key, "32", "thirty two");
  eq(BenchBomb.callBomb("Zed", "", "thirty-two", 0).energy, "NUCLEAR", "thirty-two is nuclear");
  eq(BenchBomb.pointsReading("twelve").display, "12");
  eq(BenchBomb.pointsReading("12,5").display, "12.5", "comma decimal");
  eq(BenchBomb.pointsReading("12,5").key, "12.5");
  eq(BenchBomb.callBomb("Zed", "", "12,5", 0).energy, "SPARK", "12,5 is a spark");
  eq(BenchBomb.pointsReading("12,50").display, "12.5");
  eq(BenchBomb.pointsReading("1,234").display, "1234", "thousands comma");
  eq(BenchBomb.pointsReading("38 points").display, "38");
  eq(BenchBomb.pointsReading("38 points").key, "38");
  eq(BenchBomb.pointsReading("38.4 pts").display, "38.4");
  eq(BenchBomb.pointsReading("40 pt").display, "40");
  const unitCard = BenchBomb.bomb(BenchBomb.emptyState(), { sat: "Jaxon Smith-Njigba", points: "38 points" }, 8);
  eq(unitCard.card.points, "38", "unit words leave the card");
  assert(unitCard.card.roast.indexOf("points points") === -1, "roast does not double the unit");
  eq(BenchBomb.pointsReading("minus 8").display, "-8");
  eq(BenchBomb.pointsReading("negative 12").key, "-12");
  eq(BenchBomb.pointsReading("−40").key, "-40", "unicode minus");
  const dodged = BenchBomb.callBomb("Puka Nacua", "Romeo Doubs", "-40", 0);
  eq(dodged.energy, "DUD", "negative forty is a dud");
  assert(dodged.roast.toLowerCase().indexOf("dodged") !== -1, "negative forty dodged it");
  assert(dodged.roast.indexOf("-40") !== -1, "the sign stays on the card");
  const hot = BenchBomb.callBomb("Puka Nacua", "Romeo Doubs", "40", 0);
  eq(hot.energy, "NUCLEAR");
  const forty = BenchBomb.bomb(BenchBomb.emptyState(), { sat: "Puka Nacua", start: "Romeo Doubs", points: "40" }, 3);
  const minusForty = BenchBomb.bomb(forty.state, { sat: "Puka Nacua", start: "Romeo Doubs", points: "-40" }, 4);
  assert(minusForty.ok && !minusForty.already, "the sign is part of the card");
  eq(minusForty.state.cards.length, 2);
  const dozen = BenchBomb.bomb(BenchBomb.emptyState(), { sat: "Puka Nacua", points: "12" }, 5);
  const minusDozen = BenchBomb.bomb(dozen.state, { sat: "Puka Nacua", points: "-12" }, 6);
  assert(!minusDozen.already, "-12 is not 12");
  eq(minusDozen.card.energy, "DUD");
  eq(dozen.card.energy, "SPARK");
  ["nonsense", "idk lol", "two TDs", "!!!", "🔥"].forEach(function (word) {
    eq(BenchBomb.pointsReading(word).ok, false, word + " does not parse");
    const refused = BenchBomb.bomb(BenchBomb.emptyState(), { sat: "Zed", points: word }, 1);
    eq(refused.reason, "number", word + " does not bomb");
    eq(refused.state.cards.length, 0, word + " adds nothing");
  });
  const quiet = BenchBomb.callBomb("Zed", "", "4", 0);
  assert(quiet.roast.indexOf("No starter got named.") === -1, "system starter line is gone");
  assert(quiet.roast.indexOf("No alibi on file.") !== -1, "missing starter is in voice");
  let cutRoast = "";
  for (let salt = 0; salt < 12; salt += 1) {
    const roast = BenchBomb.callBomb(("River ").repeat(20), ("Stone ").repeat(20), "35", salt).roast;
    assert(Array.from(roast).length <= 240, "long roast stays capped");
    if (roast.endsWith("…")) cutRoast = roast;
  }
  assert(cutRoast, "a long roast is cut");
  assert(cutRoast.indexOf(" …") === -1, "ellipsis is not its own word");
  const stem = cutRoast.slice(0, -1);
  assert(/\S$/.test(stem), "ellipsis follows a word");
  assert(stem.indexOf(" ") !== -1, "the cut keeps more than one word");
  function roastBody(roast) {
    return roast.replace(/^(?:Another detonation\. |The booth goes again\. |Same energy, new mouth\. |Take two\. )/, "");
  }
  ["3", "8", "16", "26", "35", "-4"].forEach(function (points) {
    const bodies = Object.create(null);
    for (let salt = 0; salt < 48; salt += 1) {
      const call = BenchBomb.callBomb("Same Sit", "Starter", points, salt);
      eq(call.energy, BenchBomb.callBomb("Same Sit", "Starter", points, 0).energy, "salt keeps energy");
      bodies[roastBody(call.roast)] = true;
    }
    assert(Object.keys(bodies).length >= 8, "pool for " + points + " has " + Object.keys(bodies).length);
  });
  const spreadNames = [
    "Ja'Marr Chase",
    "Justin Jefferson",
    "CeeDee Lamb",
    "Tyreek Hill",
    "Amon-Ra St. Brown",
    "Bijan Robinson",
    "Breece Hall",
    "Saquon Barkley",
    "Puka Nacua",
    "A.J. Brown",
  ];
  const firstLines = Object.create(null);
  spreadNames.forEach(function (name, index) {
    const a = BenchBomb.callBomb(name, "A flex", "35", 0);
    const b = BenchBomb.callBomb(name, "A flex", "35", 0);
    eq(a.roast, b.roast, name + " stays put");
    eq(a.energy, "NUCLEAR", name);
    const rolled = BenchBomb.callBomb(name, "A flex", "35", 1);
    eq(rolled.energy, "NUCLEAR", name + " re-bomb");
    assert(rolled.roast !== a.roast, name + " re-bomb changes the line");
    const stored = BenchBomb.normalizeCard({
      id: "spread-" + index,
      sat: name,
      start: "A flex",
      points: "35",
      salt: 0,
    });
    eq(stored.roast, a.roast, name + " reloads the same line");
    firstLines[a.roast.split(name).join("{S}")] = true;
  });
  assert(Object.keys(firstLines).length >= 6, "ten sits spread the first roast, got " + Object.keys(firstLines).length);
  eq(BenchBomb.nameKey("José Ramírez"), BenchBomb.nameKey("Jose\u0301 Rami\u0301rez"), "nfc folds combining marks");
  assert(BenchBomb.nameKey("José Ramírez") !== BenchBomb.nameKey("Jos Ram Rez"), "accents stay in the key");
  assert(BenchBomb.nameKey("🔥") !== BenchBomb.nameKey("💀"), "emoji stay in the key");
  assert(BenchBomb.nameKey("Алексей") !== "" && BenchBomb.nameKey("Алексей") !== BenchBomb.nameKey("Борис"), "cyrillic stays");
  eq(BenchBomb.nameKey("Алексей"), BenchBomb.nameKey("алексей"));
  const fire = BenchBomb.bomb(BenchBomb.emptyState(), { sat: "🔥", points: "30" }, 1);
  const skull = BenchBomb.bomb(fire.state, { sat: "💀", points: "30" }, 2);
  assert(skull.ok && !skull.already, "emoji names do not share a card");
  eq(skull.state.cards.length, 2);
  const jose = BenchBomb.bomb(BenchBomb.emptyState(), { sat: "José Ramírez", points: "20" }, 1);
  const asciiJose = BenchBomb.bomb(jose.state, { sat: "Jos Ram Rez", points: "20" }, 2);
  assert(asciiJose.ok && !asciiJose.already, "ascii guess is a different card");
  const joseAgain = BenchBomb.bomb(asciiJose.state, { sat: "Ramírez José", points: "20" }, 3);
  assert(joseAgain.already, "accented word order still matches");
  const legacyNone = BenchBomb.normalizeCard({ id: "legacy-none", s: "Aaron Rodgers", p: "none", sa: 0 });
  eq(legacyNone.points, "0", "old none link is recomputed");
  eq(legacyNone.energy, "DUD");
  const legacyComma = BenchBomb.normalizeCard({ id: "legacy-comma", s: "Tank Bigsby", p: "12,5", sa: 0 });
  eq(legacyComma.points, "12.5", "old comma link is recomputed");
  eq(legacyComma.energy, "SPARK");

  let shelf = BenchBomb.emptyState();
  for (let i = 0; i < 24; i += 1) {
    const added = BenchBomb.bomb(shelf, { sat: "Player " + i, points: String(i + 1) }, 1000 + i);
    assert(added.ok && !added.already, "fill " + i);
    eq(added.dropped.length, 0, "room under the cap");
    shelf = added.state;
  }
  eq(shelf.cards.length, 24, "cap filled");
  const evicted = BenchBomb.bomb(shelf, { sat: "New Guy", points: "33" }, 2000);
  assert(evicted.ok, "cap evicts");
  eq(evicted.dropped.length, 1, "one leaves");
  eq(evicted.dropped[0].card.sat, "Player 0", "oldest unstarred leaves");
  assert(!evicted.state.cards.some(function (card) { return card.sat === "Player 0"; }), "oldest is gone");
  eq(evicted.state.cards.length, 24);

  const starredFirst = BenchBomb.setStarred(shelf, shelf.cards.find(function (card) { return card.sat === "Player 0"; }).id, true, 2100);
  const spared = BenchBomb.bomb(starredFirst.state, { sat: "Newer Guy", points: "34" }, 2200);
  assert(spared.ok, "star makes room elsewhere");
  eq(spared.dropped[0].card.sat, "Player 1", "next oldest unstarred leaves");
  assert(spared.state.cards.some(function (card) { return card.sat === "Player 0" && card.starred; }), "starred stays");

  let locked = BenchBomb.emptyState();
  for (let i = 0; i < 24; i += 1) {
    locked = BenchBomb.bomb(locked, { sat: "Star " + i, points: String(10 + i) }, 3000 + i).state;
    locked = BenchBomb.setStarred(locked, locked.cards[0].id, true, 4000 + i).state;
  }
  const refused = BenchBomb.bomb(locked, { sat: "One more", points: "40" }, 5000);
  eq(refused.ok, false, "all starred refuses");
  eq(refused.reason, "cap");
  eq(refused.state.cards.length, 24, "refusal does not drop");

  const rerolled = BenchBomb.rebomb(messy.state, messy.card.id, 15);
  assert(rerolled.ok, "rebomb");
  eq(rerolled.card.energy, "NUCLEAR");
  eq(rerolled.card.tag, once.tag);
  eq(rerolled.card.fallout, once.fallout);
  assert(rerolled.card.roast !== messy.card.roast, "new roast");
  eq(rerolled.card.starred, false);
  const putBack = BenchBomb.putCard(rerolled.state, rerolled.previous);
  eq(putBack.card.roast, once.roast, "undo restores the roast");
  eq(putBack.card.salt, 0);

  const starred = BenchBomb.setStarred(messy.state, messy.card.id, true, 16);
  assert(starred.card.starred, "starred");
  const removed = BenchBomb.removeCard(starred.state, starred.card.id);
  assert(removed.ok, "remove");
  eq(removed.state.cards.length, 0);
  const restored = BenchBomb.restoreCard(removed.state, removed.removed, removed.index, removed.wasOpen);
  assert(restored.ok, "restore");
  eq(restored.state.openId, starred.card.id);
  eq(restored.card.starred, true);

  const filtered = BenchBomb.setFilter(restored.state, "starred");
  eq(filtered.filter, "starred");
  eq(BenchBomb.visibleCards(filtered).length, 1, "starred filter");
  eq(BenchBomb.setFilter(filtered, "nope").filter, "all", "bad filter ignored");
  const cleared = BenchBomb.clearCards(filtered);
  eq(cleared.state.cards.length, 0);
  eq(cleared.state.filter, "starred", "clear keeps the filter");
  const brought = BenchBomb.restoreAll(cleared.state, cleared.previous, cleared.openId);
  eq(brought.state.cards.length, 1);
  eq(brought.state.filter, "starred");
  eq(brought.state.openId, starred.card.id);

  const loaded = BenchBomb.loadSample(BenchBomb.emptyState());
  assert(loaded.ok && !loaded.already, "sample loads");
  eq(loaded.card.id, BenchBomb.SAMPLE_ID);
  eq(loaded.card.energy, "NUCLEAR");
  eq(loaded.card.roast, once.roast);
  const second = BenchBomb.loadSample(loaded.state);
  assert(second.already, "sample reopens");
  eq(second.state.cards.length, 1, "sample does not duplicate");

  const payload = BenchBomb.shareCard(starred.card);
  eq(payload.k, "card");
  const parsed = BenchBomb.parseShare(JSON.parse(JSON.stringify(payload)));
  eq(parsed.cards[0].id, starred.card.id);
  eq(parsed.cards[0].energy, "NUCLEAR");
  eq(parsed.cards[0].roast, starred.card.roast);
  eq(parsed.cards[0].starred, false, "share does not carry a star");
  assert(!Object.prototype.hasOwnProperty.call(payload.c[0], "star"), "link omits the star");
  assert(BenchBomb.parseShare(null) === null, "bad share");
  assert(BenchBomb.parseShare({ v: 1, k: "nope", c: [] }) === null, "wrong kind");
  eq(BenchBomb.face(parsed.cards[0]).indexOf("NUCLEAR · ") === 0, true, "face line");

  const kept = BenchBomb.keepShare(BenchBomb.emptyState(), parsed);
  assert(kept.ok, "keep");
  eq(kept.state.openId, parsed.cards[0].id);
  eq(kept.cards[0].starred, false, "keep drops the sender star");
  const dup = BenchBomb.keepShare(kept.state, parsed);
  eq(dup.ok, false);
  eq(dup.reason, "exists");

  const pairDup = BenchBomb.keepShare(kept.state, BenchBomb.parseShare({
    v: 1,
    k: "card",
    c: [{
      id: "other-id",
      s: "Jefferson Justin",
      w: "committee a back",
      p: "38.4 points",
      sa: 0,
      en: "DUD",
      fo: 4,
      rs: "Forged roast that is not ours.",
      tg: "FAKE TAG",
    }],
  }));
  eq(pairDup.reason, "exists", "same sit is already on this phone");

  const shelfShare = BenchBomb.shareShelf(kept.state);
  eq(shelfShare.k, "shelf");
  eq(shelfShare.c.length, 1);
  eq(BenchBomb.parseShare(shelfShare).k, "shelf");

  const packed = await BenchBomb.compressPayload(JSON.stringify(payload));
  assert(packed.indexOf("z.") === 0 || packed.indexOf("j.") === 0, "packed prefix");
  const json = await BenchBomb.decompressPayload(packed);
  eq(BenchBomb.parseShare(JSON.parse(json)).cards[0].roast, starred.card.roast, "round trip");
  let threw = false;
  try {
    await BenchBomb.decompressPayload("nope");
  } catch (_) {
    threw = true;
  }
  assert(threw, "bad token throws");

  const forged = BenchBomb.parseShare({
    v: 1,
    k: "card",
    c: [{
      id: "forged-card",
      s: "Tyler Boyd",
      w: "",
      p: "4",
      sa: 0,
      en: "NUCLEAR",
      fo: 99,
      rs: "Forged roast that is not ours.",
      tg: "FAKE TAG",
      star: 1,
    }],
  });
  const honest = BenchBomb.callBomb("Tyler Boyd", "", "4", 0);
  eq(forged.cards[0].energy, honest.energy, "forged energy is recomputed");
  eq(forged.cards[0].energy, "DUD", "four points is a dud");
  eq(forged.cards[0].fallout, honest.fallout, "forged meter is recomputed");
  eq(forged.cards[0].tag, honest.tag, "forged stamp is recomputed");
  eq(forged.cards[0].roast, honest.roast, "forged roast is recomputed");
  eq(forged.cards[0].starred, false, "forged star is dropped");
  assert(forged.cards[0].fallout <= 96, "meter stays in range");
  assert(forged.cards[0].roast.indexOf("Forged") === -1, "forged sentence is dropped");

  const salty = BenchBomb.parseShare({
    v: 1,
    k: "card",
    c: [{ id: "salted-card", s: sample.sat, w: sample.start, p: sample.points, sa: 2, rs: "Forged", en: "DUD", fo: 1, tg: "NOPE" }],
  });
  const saltedCall = BenchBomb.callBomb(sample.sat, sample.start, sample.points, 2);
  eq(salty.cards[0].roast, saltedCall.roast, "import keeps the salt and recomputes the roast");
  eq(salty.cards[0].energy, "NUCLEAR");

  let owned = BenchBomb.emptyState();
  for (let i = 0; i < 22; i += 1) {
    owned = BenchBomb.bomb(owned, { sat: "Own " + i, points: String(i + 3) }, 5000 + i).state;
  }
  const shelfCards = [];
  for (let i = 0; i < 5; i += 1) {
    shelfCards.push({
      id: "shelf-" + i,
      s: "Shelf " + i,
      w: "",
      p: String(20 + i),
      sa: 0,
      en: "NUCLEAR",
      fo: 99,
      rs: "Forged shelf roast.",
      tg: "FAKE TAG",
    });
  }
  const multi = BenchBomb.parseShare({ v: 1, k: "shelf", c: shelfCards });
  const preview = BenchBomb.previewKeep(owned, multi);
  eq(preview.adds, 5, "offer adds five");
  eq(preview.drops, 3, "offer drops the three oldest");
  const keptShelf = BenchBomb.keepShare(owned, multi);
  assert(keptShelf.ok, "partial shelf fits");
  eq(keptShelf.dropped.length, 3, "three oldest leave");
  eq(keptShelf.dropped[0].card.sat, "Own 0");
  eq(keptShelf.state.cards.length, 24);
  assert(keptShelf.cards[0].roast.indexOf("Forged") === -1, "shelf import recomputes");

  let phone = BenchBomb.emptyState();
  for (let i = 0; i < 20; i += 1) {
    phone = BenchBomb.bomb(phone, { sat: "Mine " + i, points: String(i + 2) }, 6000 + i).state;
  }
  const bigCards = [];
  for (let i = 0; i < 24; i += 1) {
    bigCards.push({ id: "big-" + i, s: "Big " + i, w: "", p: "15", sa: 0, en: "DUD", fo: 10, rs: "x", tg: "NOPE" });
  }
  const bigShare = BenchBomb.parseShare({ v: 1, k: "shelf", c: bigCards });
  const bigPreview = BenchBomb.previewKeep(phone, bigShare);
  eq(bigPreview.adds, 24, "a full shelf still fits by making room");
  eq(bigPreview.drops, 20, "it tells you the cost");
  const bigKept = BenchBomb.keepShare(phone, bigShare);
  assert(bigKept.ok, "twenty bombs do not refuse a shelf");
  eq(bigKept.state.cards.length, 24);

  const blockedKeep = BenchBomb.keepShare(locked, multi);
  eq(blockedKeep.ok, false, "starred shelf refuses");
  eq(blockedKeep.reason, "cap");
  eq(blockedKeep.state.cards.length, 24, "refusal does not drop cards");

  eq(BenchBomb.readStored("{oops").corrupt, true, "bad json is corrupt");
  eq(BenchBomb.readStored("{oops").backup, "{oops");
  eq(BenchBomb.readStored("null").corrupt, true, "null is corrupt");
  eq(BenchBomb.readStored("[]").corrupt, true, "array is corrupt");
  eq(BenchBomb.readStored('"str"').corrupt, true, "string is corrupt");
  eq(BenchBomb.readStored('{"cards":"x"}').corrupt, true, "bad cards field is corrupt");
  eq(BenchBomb.readStored("").corrupt, false, "empty storage is fresh");
  eq(BenchBomb.readStored(null).corrupt, false, "missing storage is fresh");
  const mixedSave = BenchBomb.readStored(JSON.stringify({
    v: 1,
    cards: [{ id: "ok-card", sat: "Ada", points: "9", salt: 0 }, { id: "nope" }],
  }));
  eq(mixedSave.corrupt, false, "a mixed list is readable");
  eq(mixedSave.state.cards.length, 1, "mixed list keeps the valid card");

  const maxed = BenchBomb.rebomb(
    BenchBomb.normalizeState({
      v: 1,
      cards: [{ id: "maxed-card", sat: "Ada", points: "9", salt: 9999 }],
      openId: "maxed-card",
    }),
    "maxed-card",
    1
  );
  eq(maxed.reason, "salt", "re-bomb stops at the salt cap");

  const names = ["Justin Jefferson", "CeeDee Lamb", "Amon-Ra St. Brown", "Bijan Robinson"];
  const dist = Object.create(null);
  names.forEach(function (name, index) {
    const call = BenchBomb.callBomb(name, index % 2 ? "A flex" : "", String(index * 11), 0);
    dist[call.energy] = true;
    eq(BenchBomb.callBomb(name, index % 2 ? "A flex" : "", String(index * 11), 0).roast, call.roast, "seeded");
  });
  assert(Object.keys(dist).length >= 3, "names and points spread the energy");
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
