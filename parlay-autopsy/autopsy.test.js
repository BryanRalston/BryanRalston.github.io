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
vm.runInContext(fs.readFileSync(path.join(__dirname, "autopsy.js"), "utf8"), context);
const ParlayAutopsy = context.ParlayAutopsy;

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

function leg(name, odds, killer) {
  return { name: name, odds: odds || "", killer: !!killer };
}

function slip(legs, note) {
  return { legs: legs, note: note || "" };
}

const sample = ParlayAutopsy.sampleInput();

async function main() {
  eq(ParlayAutopsy.STORAGE_KEY, "parlay-autopsy-v1", "storage key");
  eq(ParlayAutopsy.HISTORY_CAP, 24, "history cap");
  eq(ParlayAutopsy.LEG_MIN, 2);
  eq(ParlayAutopsy.LEG_MAX, 6);
  assertCleanSvg("icon.svg");

  const html = read("index.html");
  const app = read("app.js");
  const sw = read("sw.js");
  const manifest = read("manifest.webmanifest");
  const css = read("app.css");
  assert(html.indexOf("<title>Parlay Autopsy</title>") !== -1, "title");
  assert(html.indexOf('class="feature-map"') !== -1, "feature map");
  assert(html.indexOf('class="feature-map" open') === -1, "feature map collapsed");
  assert(html.indexOf('aria-live="polite"') !== -1, "live region");
  assert(html.indexOf('class="skip"') !== -1, "skip link");
  assert(html.indexOf('id="storageFail"') !== -1, "storage banner");
  assert(html.toLowerCase().indexOf("entertainment only") !== -1, "honest copy");
  assert(html.toLowerCase().indexOf("not betting advice") !== -1, "not advice");
  assert(html.toLowerCase().indexOf("no real money") !== -1, "no money");
  assert(html.indexOf("Russo+One") !== -1, "russo one");
  assert(html.indexOf("DM+Mono") !== -1, "dm mono");
  assert(html.indexOf("Outfit") !== -1, "outfit");
  assert(html.indexOf('id="btnKeepShare"') !== -1, "keep");
  assert(html.indexOf(">Not now<") !== -1, "not now");
  assert(html.indexOf("Already on this phone") !== -1, "already copy in the page");
  assert(html.indexOf("oldest unstarred") !== -1, "evict copy");
  assert(html.indexOf(">parlay-autopsy-v1<") !== -1, "feature map names the key");
  assert(html.indexOf("#a=") !== -1, "hash documented");
  assert(html.indexOf("?a=") !== -1, "query documented");
  assert(html.indexOf('id="storageCorrupt"') !== -1, "corrupt notice");
  assert(html.indexOf("parlay-autopsy-v1") !== -1, "feature map names the store");
  assert(html.indexOf(">parlay-autopsy-v3<") !== -1, "feature map names the cache");
  assert(html.indexOf('href="app.css?v=2"') !== -1, "style version");
  assert(html.indexOf('src="autopsy.js?v=2"') !== -1, "engine version");
  assert(html.indexOf('src="app.js?v=2"') !== -1, "app version");
  assert(html.indexOf("All but one dead is NEAR MISS") === -1, "near miss is not all but one");
  assert(html.indexOf("NEAR MISS is exactly one killer") !== -1, "near miss rule");
  assert(html.toLowerCase().indexOf("read as +180") !== -1, "unsigned odds hint is documented");
  assert(html.indexOf("one tap") !== -1, "copy link is one tap");
  assert(html.indexOf("LAST LEG") !== -1, "stamp names");
  assert(html.indexOf("ONE-TICK") !== -1, "one tick named");
  assert(app.indexOf("ParlayAutopsy.STORAGE_KEY") !== -1, "app uses storage key");
  assert(app.indexOf('"#a="') !== -1, "hash prefix");
  assert(app.indexOf('"#p="') === -1, "doom parlay keeps hash p");
  assert(app.indexOf('const QUERY_KEY = "a"') !== -1, "query key");
  assert(app.indexOf("Already on this phone.") !== -1, "duplicate toast");
  assert(app.indexOf("innerHTML") === -1, "no innerHTML");
  assert(read("autopsy.js").indexOf("innerHTML") === -1, "engine has no innerHTML");
  assert(sw.indexOf('"parlay-autopsy-v3"') !== -1, "sw cache");
  assert(sw.indexOf("parlay-autopsy-v1") === -1, "storage key is not the cache");
  assert(sw.indexOf("function networkFirst") !== -1, "html is network-first");
  assert(sw.indexOf("function staleWhileRevalidate") !== -1, "js and css revalidate");
  assert(sw.indexOf("url.origin + url.pathname + url.search") !== -1, "versioned assets keep the query");
  assert(sw.indexOf("url.origin + url.pathname);") !== -1, "html cache key stays the pathname");
  assert(app.indexOf("STORAGE_BACKUP_KEY") !== -1, "corrupt value is backed up");
  assert(app.indexOf("function retireStaleUndo") !== -1, "undo leaves when it cannot run");
  assert(app.indexOf("toastExtra") !== -1, "confirmation shows beside a live undo");
  assert(app.indexOf("if (!toastBag) toast(msg, { important: true });") !== -1, "form error does not cover undo");
  assert(app.indexOf("function copyCardLink") !== -1, "card copy is direct");
  assert(app.indexOf("if (!card || card.starred || card.salt > 0) return false;") !== -1, "room undo retires after star or re-autopsy");
  assert(app.indexOf("if (!result.already) writeForm(result.card);") !== -1, "duplicate keeps the typed slip");
  assert(app.indexOf("clearEmptyAutopsyHash") !== -1, "empty hash is cleared");
  assert(app.indexOf('hint.textContent = "read as " + parsed.display;') !== -1, "unsigned odds hint");
  assert(app.indexOf("Starred autopsies fill this phone. Remove one to keep this.") !== -1, "keep cap copy");
  assert(app.indexOf("This phone holds 24 autopsies. Starred slips stay. Remove one to cut another.") !== -1, "autopsy cap copy");
  assert(app.indexOf('els.btnKeepShare.textContent = preview.fresh ? "Keep on this phone" : "Already on this phone"') !== -1, "already button");
  const openFn = app.slice(app.indexOf("function openFromShelf"), app.indexOf("function loadSample"));
  assert(openFn.indexOf("writeForm") === -1, "opening a shelf row keeps the draft");
  const keepFn = app.slice(app.indexOf("function keepIncoming"), app.indexOf("function dismissShare"));
  const capToast = keepFn.indexOf("Starred autopsies fill this phone");
  assert(capToast !== -1, "keep can refuse");
  assert(keepFn.slice(capToast, capToast + 220).indexOf("incoming = null") === -1, "cap refusal keeps the offer");
  const copyFn = app.slice(app.indexOf("function copyCardLink"), app.indexOf("function wire"));
  assert(copyFn.indexOf("writeClipboard") !== -1 && copyFn.indexOf("writeClipboard") < copyFn.indexOf("presentShare"), "clipboard before the dialog");
  assert(sw.indexOf("./autopsy.js") !== -1, "engine cached");
  assert(manifest.indexOf('"Parlay Autopsy"') !== -1, "manifest name");
  assert(css.indexOf("Russo One") !== -1, "display font");
  assert(css.indexOf("overflow-x: hidden") !== -1, "no sideways scroll");
  const boot = app.slice(app.lastIndexOf("function boot"));
  const listenAt = boot.indexOf('addEventListener("hashchange"');
  const scheduleAt = boot.lastIndexOf("scheduleShareImport()");
  assert(listenAt !== -1 && scheduleAt !== -1 && listenAt < scheduleAt, "hashchange listener before import");

  const once = ParlayAutopsy.callAutopsy(sample.legs, 0);
  const twice = ParlayAutopsy.callAutopsy(sample.legs, 0);
  eq(once.cause, twice.cause, "stable stamp");
  eq(once.roast, twice.roast, "stable roast");
  eq(once.meter, twice.meter, "stable meter");
  eq(once.tag, twice.tag, "stable tag");
  eq(once.cause, "LAST LEG", "sample is last leg");
  assert(once.tag === "BUZZER DEATH" || once.tag === "FINAL CUT", "sample tag follows last leg");
  assert(once.meter >= 33 && once.meter <= 39, "one of three sits on the dead share");
  assert(once.roast.indexOf("Mahomes anytime TD") !== -1, "sample names the killer");
  assert(once.roast.indexOf("cashed") !== -1, "sample names the cashed legs");
  assert(once.roast.indexOf("The slab goes again.") !== 0, "first autopsy is not a re-autopsy lead");
  eq(ParlayAutopsy.bandFor(once.cause), "last", "last band");

  const againSalt = ParlayAutopsy.callAutopsy(sample.legs, 3);
  eq(againSalt.cause, once.cause, "re-autopsy keeps the stamp");
  eq(againSalt.tag, once.tag, "re-autopsy keeps the tag");
  eq(againSalt.meter, once.meter, "re-autopsy keeps the meter");
  assert(againSalt.roast !== once.roast, "re-autopsy changes the roast");
  const leadRoasts = [1, 2, 3, 4].map(function (salt) {
    return ParlayAutopsy.callAutopsy(sample.legs, salt).roast;
  });
  const prefixes = leadRoasts.map(function (roast) { return roast.slice(0, 12); });
  assert(prefixes.filter(function (prefix, index) {
    return prefixes.indexOf(prefix) === index;
  }).length >= 3, "re-autopsy lead rotates");

  eq(ParlayAutopsy.callAutopsy([
    leg("A", "", false),
    leg("B", "-110", true),
  ], 0).cause, "ONE-TICK", "juice killer is one tick");
  eq(ParlayAutopsy.callAutopsy([
    leg("A", "", false),
    leg("B", "+130", true),
  ], 0).cause, "ONE-TICK", "plus 130 is one tick");
  eq(ParlayAutopsy.callAutopsy([
    leg("A", "", false),
    leg("B", "+131", true),
  ], 0).cause, "LAST LEG", "plus 131 is last leg");
  eq(ParlayAutopsy.callAutopsy([
    leg("A", "-131", true),
    leg("B", "", false),
  ], 0).cause, "NEAR MISS", "first killer is a near miss");
  eq(ParlayAutopsy.callAutopsy([
    leg("A", "", false),
    leg("B", "", true),
    leg("C", "", false),
  ], 0).cause, "MIDDLE BLEED", "middle killer bleeds");
  eq(ParlayAutopsy.callAutopsy([
    leg("A", "", true),
    leg("B", "", true),
    leg("C", "", true),
  ], 0).cause, "TOTAL COLLAPSE", "every leg dead collapses");
  eq(ParlayAutopsy.callAutopsy([
    leg("A", "", true),
    leg("B", "", true),
    leg("C", "", false),
  ], 0).cause, "MIDDLE BLEED", "all but one, last cashed, is a middle bleed");
  eq(ParlayAutopsy.callAutopsy([
    leg("A", "", true),
    leg("B", "", true),
    leg("C", "", false),
    leg("D", "", false),
  ], 0).cause, "MIDDLE BLEED", "last leg cashed is a middle bleed");
  eq(ParlayAutopsy.callAutopsy([
    leg("A", "", false),
    leg("B", "", true),
    leg("C", "", false),
    leg("D", "", true),
  ], 0).cause, "LAST LEG", "last leg among several killers");
  eq(ParlayAutopsy.callAutopsy([
    leg("A", "-110", false),
    leg("B", "+180", true),
  ], 0).cause, "LAST LEG", "a cashed juice price does not steal the stamp");

  eq(ParlayAutopsy.parseOdds("-110").display, "-110");
  eq(ParlayAutopsy.parseOdds("180").display, "+180");
  eq(ParlayAutopsy.parseOdds("+130").value, 130);
  eq(ParlayAutopsy.parseOdds("\u2212110").display, "-110", "unicode minus");
  eq(ParlayAutopsy.parseOdds("").ok, true);
  eq(ParlayAutopsy.parseOdds("50").ok, false, "short price refused");
  eq(ParlayAutopsy.parseOdds("50%").ok, false, "percent refused");
  eq(ParlayAutopsy.parseOdds("1/2").ok, false, "fraction refused");
  eq(ParlayAutopsy.parseOdds("even").ok, true);
  eq(ParlayAutopsy.parseOdds("EVEN").display, "+100", "EVEN is +100");
  eq(ParlayAutopsy.parseOdds("ev").value, 100, "EV is +100");
  eq(ParlayAutopsy.parseOdds("EVEN").implied, false, "EVEN is not an unsigned guess");
  eq(ParlayAutopsy.parseOdds("180").display, "+180");
  eq(ParlayAutopsy.parseOdds("180").implied, true, "unsigned odds are marked");
  eq(ParlayAutopsy.parseOdds("+180").implied, false, "a typed sign is not a guess");
  eq(ParlayAutopsy.parseOdds("1 80").ok, false, "spaced digits are not joined");
  eq(ParlayAutopsy.parseOdds("- 110").ok, false, "a space after the sign is not joined");

  const noted = ParlayAutopsy.autopsy(ParlayAutopsy.emptyState(), slip(sample.legs, "sunday note"), 5);
  assert(noted.ok, "sample cuts");
  eq(noted.card.cause, once.cause, "note does not move the stamp");
  eq(noted.card.roast, once.roast, "note does not move the roast");
  eq(noted.card.note, "sunday note");

  const messy = ParlayAutopsy.autopsy(ParlayAutopsy.emptyState(), {
    legs: [
      { name: "  Bills   moneyline ", odds: " -150 ", killer: false },
      { name: "\nOver 48.5\t", odds: "-110", killer: false },
      { name: " Mahomes anytime TD ", odds: " 180 ", killer: true },
    ],
    note: "  Sunday slate · group chat  ",
  }, 9);
  assert(messy.ok, "trimmed autopsy");
  eq(messy.card.legs[0].name, "Bills moneyline");
  eq(messy.card.legs[2].odds, "+180");
  eq(messy.card.note, sample.note);
  eq(messy.card.cause, once.cause);
  eq(messy.card.roast, once.roast);

  const sameAgain = ParlayAutopsy.autopsy(messy.state, {
    legs: [
      { name: "anytime TD Mahomes", odds: "+180", killer: true },
      { name: "48.5 Over", odds: "-110", killer: false },
      { name: "moneyline Bills", odds: "-150", killer: false },
    ],
    note: "dynasty",
  }, 10);
  assert(sameAgain.ok && sameAgain.already, "order-normalized slip reopens");
  eq(sameAgain.state.cards.length, 1, "no duplicate card");
  eq(sameAgain.card.id, messy.card.id, "same card");
  eq(sameAgain.card.note, "dynasty", "same slip saves the new note");
  eq(sameAgain.card.cause, "LAST LEG", "first order keeps the stamp");
  eq(sameAgain.card.legs[0].name, "Bills moneyline", "first typed order stays on the card");
  eq(sameAgain.card.roast, once.roast);

  const otherKiller = ParlayAutopsy.autopsy(sameAgain.state, slip([
    leg("Bills moneyline", "-150", true),
    leg("Over 48.5", "-110", false),
    leg("Mahomes anytime TD", "+180", false),
  ]), 11);
  assert(otherKiller.ok && !otherKiller.already, "a different killer is a different corpse");
  eq(otherKiller.card.cause, "NEAR MISS");

  eq(ParlayAutopsy.autopsy(ParlayAutopsy.emptyState(), slip([]), 1).reason, "blank");
  eq(ParlayAutopsy.autopsy(ParlayAutopsy.emptyState(), slip([
    leg("   ", "", false),
    leg("", "", false),
  ]), 1).reason, "blank");
  eq(ParlayAutopsy.autopsy(ParlayAutopsy.emptyState(), slip([leg("Only one", "", true)]), 1).reason, "few");
  eq(ParlayAutopsy.autopsy(ParlayAutopsy.emptyState(), slip([
    leg("A", "", false),
    leg("B", "", false),
  ]), 1).reason, "killer");
  eq(ParlayAutopsy.autopsy(ParlayAutopsy.emptyState(), slip([
    leg("", "-110", true),
    leg("B", "", false),
  ]), 1).reason, "name");
  eq(ParlayAutopsy.autopsy(ParlayAutopsy.emptyState(), slip([
    leg("A", "nope", false),
    leg("B", "", true),
  ]), 1).reason, "odds");
  const tooMany = [];
  for (let i = 0; i < 7; i += 1) tooMany.push(leg("Leg " + i, "", i === 0));
  eq(ParlayAutopsy.autopsy(ParlayAutopsy.emptyState(), slip(tooMany), 1).reason, "many");

  const spicy = "<script>alert(1)</script> 🔥";
  const safe = ParlayAutopsy.autopsy(ParlayAutopsy.emptyState(), slip([
    leg(spicy, "", false),
    leg("Other", "", true),
  ]), 12);
  assert(safe.ok, "html and emoji autopsy");
  eq(safe.card.legs[0].name, spicy, "markup stays text");
  assert(safe.card.legs[0].name.indexOf("<script>") !== -1, "script text kept");
  assert(safe.card.roast.indexOf("🔥") !== -1, "emoji kept in the roast");
  const long = ParlayAutopsy.autopsy(ParlayAutopsy.emptyState(), slip([
    leg("A".repeat(200) + "🔥", "", false),
    leg("Closer", "", true),
  ]), 13);
  eq(Array.from(long.card.legs[0].name).length, 80, "name capped by code point");
  eq(ParlayAutopsy.normalizeCard({
    id: "ok-id",
    legs: [leg("Ada\u0000Bee", "", false), leg("Cee", "", true)],
    salt: 0,
  }).legs[0].name, "Ada Bee", "control bytes collapse");

  eq(ParlayAutopsy.nameKey("José Ramírez"), ParlayAutopsy.nameKey("Jose\u0301 Rami\u0301rez"), "nfc folds combining marks");
  assert(ParlayAutopsy.nameKey("José Ramírez") !== ParlayAutopsy.nameKey("Jos Ram Rez"), "accents stay in the key");
  assert(ParlayAutopsy.nameKey("Chiefs -3.5") !== ParlayAutopsy.nameKey("Chiefs +3.5"), "spread signs stay");
  assert(ParlayAutopsy.nameKey("Over 48.5") !== ParlayAutopsy.nameKey("Over 5.48"), "decimals stay whole");
  assert(ParlayAutopsy.nameKey("Kelce 50+") !== ParlayAutopsy.nameKey("Kelce 50"), "a trailing plus stays");
  eq(ParlayAutopsy.nameKey("Over 48.5"), ParlayAutopsy.nameKey("48.5 Over"), "word order still folds");
  eq(ParlayAutopsy.nameKey("Chiefs \u22123.5"), ParlayAutopsy.nameKey("Chiefs -3.5"), "unicode minus in a name");
  const fire = ParlayAutopsy.autopsy(ParlayAutopsy.emptyState(), slip([
    leg("🔥", "", false),
    leg("Closer", "", true),
  ]), 1);
  const skull = ParlayAutopsy.autopsy(fire.state, slip([
    leg("💀", "", false),
    leg("Closer", "", true),
  ]), 2);
  assert(skull.ok && !skull.already, "emoji names do not share a card");

  let cutRoast = "";
  const giant = "Riverbank ";
  for (let salt = 0; salt < 8; salt += 1) {
    const roast = ParlayAutopsy.callAutopsy([
      leg(giant.repeat(12), "", false),
      leg(giant.repeat(12), "", false),
      leg(giant.repeat(12), "", true),
    ], salt).roast;
    assert(Array.from(roast).length <= 240, "long roast stays capped");
    if (roast.endsWith("…")) cutRoast = roast;
  }
  assert(cutRoast, "a long roast is cut");
  assert(cutRoast.indexOf(" …") === -1, "ellipsis is not its own word");

  function roastBody(roast) {
    return roast.replace(/^(?:The slab goes again\. |Same stamp, new mouth\. |Take two\. |Another cut\. )/, "");
  }
  ["LAST LEG", "MIDDLE BLEED", "TOTAL COLLAPSE", "NEAR MISS", "ONE-TICK"].forEach(function (cause) {
    const bodies = Object.create(null);
    const fixture = {
      "LAST LEG": [leg("Hold", "", false), leg("Kill " + cause, "+180", true)],
      "MIDDLE BLEED": [leg("Hold", "", false), leg("Kill " + cause, "", true), leg("Tail", "", false)],
      "TOTAL COLLAPSE": [leg("Kill " + cause, "", true), leg("Also", "", true)],
      "NEAR MISS": [leg("Kill " + cause, "", true), leg("Hold", "", false)],
      "ONE-TICK": [leg("Hold", "", false), leg("Kill " + cause, "-110", true)],
    }[cause];
    eq(ParlayAutopsy.callAutopsy(fixture, 0).cause, cause, cause + " fixture");
    for (let salt = 0; salt < 40; salt += 1) {
      const call = ParlayAutopsy.callAutopsy(fixture, salt);
      eq(call.cause, cause, "salt keeps " + cause);
      eq(call.meter, ParlayAutopsy.callAutopsy(fixture, 0).meter, "salt keeps meter");
      bodies[roastBody(call.roast)] = true;
    }
    assert(Object.keys(bodies).length >= 8, "pool for " + cause + " has " + Object.keys(bodies).length);
  });

  let shelf = ParlayAutopsy.emptyState();
  for (let i = 0; i < 24; i += 1) {
    const added = ParlayAutopsy.autopsy(shelf, slip([
      leg("Hold " + i, "", false),
      leg("Kill " + i, "", true),
    ]), 1000 + i);
    assert(added.ok && !added.already, "fill " + i);
    eq(added.dropped.length, 0, "room under the cap");
    shelf = added.state;
  }
  eq(shelf.cards.length, 24, "cap filled");
  const evicted = ParlayAutopsy.autopsy(shelf, slip([
    leg("Hold new", "", false),
    leg("Kill new", "", true),
  ]), 2000);
  assert(evicted.ok, "cap evicts");
  eq(evicted.dropped.length, 1, "one leaves");
  eq(evicted.dropped[0].card.legs[1].name, "Kill 0", "oldest unstarred leaves");
  assert(!evicted.state.cards.some(function (card) { return card.legs[1].name === "Kill 0"; }), "oldest is gone");
  eq(evicted.state.cards.length, 24);

  const oldest = shelf.cards.find(function (card) { return card.legs[1].name === "Kill 0"; });
  const starredFirst = ParlayAutopsy.setStarred(shelf, oldest.id, true, 2100);
  const spared = ParlayAutopsy.autopsy(starredFirst.state, slip([
    leg("Hold newer", "", false),
    leg("Kill newer", "", true),
  ]), 2200);
  assert(spared.ok, "star makes room elsewhere");
  eq(spared.dropped[0].card.legs[1].name, "Kill 1", "next oldest unstarred leaves");
  assert(spared.state.cards.some(function (card) {
    return card.legs[1].name === "Kill 0" && card.starred;
  }), "starred stays");

  let locked = ParlayAutopsy.emptyState();
  for (let i = 0; i < 24; i += 1) {
    locked = ParlayAutopsy.autopsy(locked, slip([
      leg("Star hold " + i, "", false),
      leg("Star kill " + i, "", true),
    ]), 3000 + i).state;
    locked = ParlayAutopsy.setStarred(locked, locked.cards[0].id, true, 4000 + i).state;
  }
  const refused = ParlayAutopsy.autopsy(locked, slip([
    leg("One more hold", "", false),
    leg("One more", "", true),
  ]), 5000);
  eq(refused.ok, false, "all starred refuses");
  eq(refused.reason, "cap");
  eq(refused.state.cards.length, 24, "refusal does not drop");

  const rerolled = ParlayAutopsy.reautopsy(messy.state, messy.card.id, 15);
  assert(rerolled.ok, "reautopsy");
  eq(rerolled.card.cause, "LAST LEG");
  eq(rerolled.card.tag, once.tag);
  eq(rerolled.card.meter, once.meter);
  assert(rerolled.card.roast !== messy.card.roast, "new roast");
  eq(rerolled.card.starred, false);
  const putBack = ParlayAutopsy.putCard(rerolled.state, rerolled.previous);
  eq(putBack.card.roast, once.roast, "undo restores the roast");
  eq(putBack.card.salt, 0);

  const starred = ParlayAutopsy.setStarred(messy.state, messy.card.id, true, 16);
  assert(starred.card.starred, "starred");
  const removed = ParlayAutopsy.removeCard(starred.state, starred.card.id);
  assert(removed.ok, "remove");
  eq(removed.state.cards.length, 0);
  const restored = ParlayAutopsy.restoreCard(removed.state, removed.removed, removed.index, removed.wasOpen);
  assert(restored.ok, "restore");
  eq(restored.state.openId, starred.card.id);
  eq(restored.card.starred, true);

  const filtered = ParlayAutopsy.setFilter(restored.state, "starred");
  eq(filtered.filter, "starred");
  eq(ParlayAutopsy.visibleCards(filtered).length, 1, "starred filter");
  eq(ParlayAutopsy.setFilter(filtered, "nope").filter, "all", "bad filter ignored");
  const cleared = ParlayAutopsy.clearCards(filtered);
  eq(cleared.state.cards.length, 0);
  eq(cleared.state.filter, "starred", "clear keeps the filter");
  const brought = ParlayAutopsy.restoreAll(cleared.state, cleared.previous, cleared.openId);
  eq(brought.state.cards.length, 1);
  eq(brought.state.filter, "starred");
  eq(brought.state.openId, starred.card.id);

  const loaded = ParlayAutopsy.loadSample(ParlayAutopsy.emptyState());
  assert(loaded.ok && !loaded.already, "sample loads");
  eq(loaded.card.id, ParlayAutopsy.SAMPLE_ID);
  eq(loaded.card.cause, "LAST LEG");
  eq(loaded.card.roast, once.roast);
  const second = ParlayAutopsy.loadSample(loaded.state);
  assert(second.already, "sample reopens");
  eq(second.state.cards.length, 1, "sample does not duplicate");

  const payload = ParlayAutopsy.shareCard(starred.card);
  eq(payload.k, "card");
  const parsed = ParlayAutopsy.parseShare(JSON.parse(JSON.stringify(payload)));
  eq(parsed.cards[0].id, starred.card.id);
  eq(parsed.cards[0].cause, "LAST LEG");
  eq(parsed.cards[0].roast, starred.card.roast);
  eq(parsed.cards[0].starred, false, "share does not carry a star");
  assert(!Object.prototype.hasOwnProperty.call(payload.c[0], "star"), "link omits the star");
  assert(!Object.prototype.hasOwnProperty.call(payload.c[0], "starred"), "link omits starred");
  assert(ParlayAutopsy.parseShare(null) === null, "bad share");
  assert(ParlayAutopsy.parseShare({ v: 1, k: "nope", c: [] }) === null, "wrong kind");
  eq(ParlayAutopsy.face(parsed.cards[0]).indexOf("LAST LEG · ") === 0, true, "face line");

  const kept = ParlayAutopsy.keepShare(ParlayAutopsy.emptyState(), parsed);
  assert(kept.ok, "keep");
  eq(kept.state.openId, parsed.cards[0].id);
  eq(kept.cards[0].starred, false, "keep drops the sender star");
  const dup = ParlayAutopsy.keepShare(kept.state, parsed);
  eq(dup.ok, false);
  eq(dup.reason, "exists");

  const pairDup = ParlayAutopsy.keepShare(kept.state, ParlayAutopsy.parseShare({
    v: 1,
    k: "card",
    c: [{
      id: "other-id",
      sa: 0,
      d: "",
      l: [
        { n: "anytime TD Mahomes", o: "180", k: 1 },
        { n: "48.5 Over", o: "-110", k: 0 },
        { n: "moneyline Bills", o: "-150", k: 0 },
      ],
      cause: "TOTAL COLLAPSE",
      roast: "Forged roast that is not ours.",
      meter: 4,
      tag: "FAKE TAG",
      star: 1,
    }],
  }));
  eq(pairDup.reason, "exists", "same slip is already on this phone");

  const shelfShare = ParlayAutopsy.shareShelf(kept.state);
  eq(shelfShare.k, "shelf");
  eq(shelfShare.c.length, 1);
  eq(ParlayAutopsy.parseShare(shelfShare).k, "shelf");

  const packed = await ParlayAutopsy.compressPayload(JSON.stringify(payload));
  assert(packed.indexOf("z.") === 0 || packed.indexOf("j.") === 0, "packed prefix");
  const json = await ParlayAutopsy.decompressPayload(packed);
  eq(ParlayAutopsy.parseShare(JSON.parse(json)).cards[0].roast, starred.card.roast, "round trip");
  assert(packed.indexOf("z.") === 0, "deflate token");
  let threw = false;
  try {
    await ParlayAutopsy.decompressPayload("nope");
  } catch (_) {
    threw = true;
  }
  assert(threw, "bad token throws");

  const forged = ParlayAutopsy.parseShare({
    v: 1,
    k: "card",
    c: [{
      id: "forged-card",
      sa: 0,
      d: "note",
      l: [
        { n: "Tyler Boyd", o: "", k: 0 },
        { n: "A flex", o: "", k: 1 },
      ],
      cause: "TOTAL COLLAPSE",
      meter: 99,
      roast: "Forged roast that is not ours.",
      tag: "FAKE TAG",
      star: 1,
      starred: true,
    }],
  });
  const honest = ParlayAutopsy.callAutopsy([
    leg("Tyler Boyd", "", false),
    leg("A flex", "", true),
  ], 0);
  eq(forged.cards[0].cause, honest.cause, "forged stamp is recomputed");
  eq(forged.cards[0].cause, "LAST LEG", "two-leg closer is last leg");
  eq(forged.cards[0].meter, honest.meter, "forged meter is recomputed");
  eq(forged.cards[0].tag, honest.tag, "forged tag is recomputed");
  eq(forged.cards[0].roast, honest.roast, "forged roast is recomputed");
  eq(forged.cards[0].starred, false, "forged star is dropped");
  assert(forged.cards[0].meter <= 96, "meter stays in range");
  assert(forged.cards[0].roast.indexOf("Forged") === -1, "forged sentence is dropped");

  const salty = ParlayAutopsy.parseShare({
    v: 1,
    k: "card",
    c: [{
      id: "salted-card",
      sa: 2,
      d: sample.note,
      l: sample.legs.map(function (row) {
        return { n: row.name, o: row.odds, k: row.killer ? 1 : 0 };
      }),
      roast: "Forged",
      cause: "TOTAL COLLAPSE",
      meter: 1,
      tag: "NOPE",
    }],
  });
  const saltedCall = ParlayAutopsy.callAutopsy(sample.legs, 2);
  eq(salty.cards[0].roast, saltedCall.roast, "import keeps the salt and recomputes the roast");
  eq(salty.cards[0].cause, "LAST LEG");

  let owned = ParlayAutopsy.emptyState();
  for (let i = 0; i < 22; i += 1) {
    owned = ParlayAutopsy.autopsy(owned, slip([
      leg("Own hold " + i, "", false),
      leg("Own " + i, "", true),
    ]), 5000 + i).state;
  }
  const shelfCards = [];
  for (let i = 0; i < 5; i += 1) {
    shelfCards.push({
      id: "shelf-" + i,
      sa: 0,
      d: "",
      l: [
        { n: "Shelf hold " + i, o: "", k: 0 },
        { n: "Shelf " + i, o: "", k: 1 },
      ],
      cause: "TOTAL COLLAPSE",
      meter: 99,
      roast: "Forged shelf roast.",
      tag: "FAKE TAG",
    });
  }
  const multi = ParlayAutopsy.parseShare({ v: 1, k: "shelf", c: shelfCards });
  const preview = ParlayAutopsy.previewKeep(owned, multi);
  eq(preview.adds, 5, "offer adds five");
  eq(preview.drops, 3, "offer drops the three oldest");
  const keptShelf = ParlayAutopsy.keepShare(owned, multi);
  assert(keptShelf.ok, "partial shelf fits");
  eq(keptShelf.dropped.length, 3, "three oldest leave");
  eq(keptShelf.dropped[0].card.legs[1].name, "Own 0");
  eq(keptShelf.state.cards.length, 24);
  assert(keptShelf.cards[0].roast.indexOf("Forged") === -1, "shelf import recomputes");

  const blockedKeep = ParlayAutopsy.keepShare(locked, multi);
  eq(blockedKeep.ok, false, "starred shelf refuses");
  eq(blockedKeep.reason, "cap");
  eq(blockedKeep.state.cards.length, 24, "refusal does not drop cards");

  eq(ParlayAutopsy.readStored("{oops").corrupt, true, "bad json is corrupt");
  eq(ParlayAutopsy.readStored("{oops").backup, "{oops");
  eq(ParlayAutopsy.readStored("null").corrupt, true, "null is corrupt");
  eq(ParlayAutopsy.readStored("[]").corrupt, true, "array is corrupt");
  eq(ParlayAutopsy.readStored('"str"').corrupt, true, "string is corrupt");
  eq(ParlayAutopsy.readStored('{"cards":"x"}').corrupt, true, "bad cards field is corrupt");
  eq(ParlayAutopsy.readStored("").corrupt, false, "empty storage is fresh");
  eq(ParlayAutopsy.readStored(null).corrupt, false, "missing storage is fresh");
  const mixedSave = ParlayAutopsy.readStored(JSON.stringify({
    v: 1,
    cards: [
      { id: "ok-card", legs: [leg("Ada", "", false), leg("Bee", "", true)], salt: 0 },
      { id: "nope" },
    ],
  }));
  eq(mixedSave.corrupt, true, "a card that fails validation makes the save corrupt");
  eq(mixedSave.backup.indexOf("ok-card") !== -1, true, "the raw save is kept for backup");
  eq(mixedSave.state.cards.length, 0, "a failed card is not dropped quietly");
  const rawOdds = JSON.stringify({
    v: 1,
    cards: [
      { id: "ok-card", legs: [leg("Ada", "", false), leg("Bee", "", true)], salt: 0 },
      { id: "bad-odds", legs: [leg("Ada", "1.91", true), leg("Bee", "-110", false)], salt: 0 },
    ],
  });
  const badOdds = ParlayAutopsy.readStored(rawOdds);
  eq(badOdds.corrupt, true, "decimal odds in storage are corrupt");
  eq(badOdds.backup, rawOdds, "backup is the raw saved value");
  const dupIds = ParlayAutopsy.readStored(JSON.stringify({
    v: 1,
    cards: [
      { id: "ok-card", legs: [leg("Ada", "", false), leg("Bee", "", true)], salt: 0 },
      { id: "ok-card", legs: [leg("Cee", "", false), leg("Dee", "", true)], salt: 0 },
    ],
  }));
  eq(dupIds.corrupt, false, "a repeated id is not a corrupt card");
  eq(dupIds.state.cards.length, 1, "a repeated id keeps the first card");

  const minusSpread = ParlayAutopsy.autopsy(ParlayAutopsy.emptyState(), slip([
    leg("Chiefs -3.5", "-110", true),
    leg("Over 47.5", "-110", false),
  ]), 30);
  const plusSpread = ParlayAutopsy.autopsy(minusSpread.state, slip([
    leg("Chiefs +3.5", "-110", true),
    leg("Over 47.5", "-110", false),
  ]), 31);
  assert(plusSpread.ok && !plusSpread.already, "the other side of a spread is a new corpse");
  eq(plusSpread.state.cards.length, 2, "both sides stay on the shelf");
  eq(plusSpread.card.legs[0].name, "Chiefs +3.5", "the typed plus side is what gets saved");
  const decimalTwin = ParlayAutopsy.autopsy(plusSpread.state, slip([
    leg("Chiefs -3.5", "-110", true),
    leg("Over 5.48", "-110", false),
  ]), 32);
  assert(decimalTwin.ok && !decimalTwin.already, "48.5 and 5.48 do not collide");

  eq(ParlayAutopsy.keptLine(23, 24, 23, 0), "Kept 23 new, 1 already here.");
  eq(ParlayAutopsy.keptLine(23, 24, 24, 0), "Kept 23 of 24.");
  eq(ParlayAutopsy.keptLine(4, 4, 4, 1), "Kept. The oldest autopsy made room.");
  eq(ParlayAutopsy.keptLine(1, 1, 1, 0), "Kept on this phone.");

  ["LAST LEG", "MIDDLE BLEED", "TOTAL COLLAPSE"].forEach(function (cause) {
    const multi = ParlayAutopsy.roastFits(cause).filter(function (fit) { return fit === "multi"; }).length;
    assert(multi >= 8, cause + " has " + multi + " multi-killer lines");
  });
  ParlayAutopsy.CAUSES.forEach(function (cause) {
    ParlayAutopsy.roastFits(cause).forEach(function (fit) {
      assert(fit === "single" || fit === "position" || fit === "multi", cause + " fit " + fit);
    });
  });

  const slotNames = ["LegOpener", "LegSecond", "LegThird", "LegFourth", "LegFifth", "LegCloser"];
  function slotLegs(n, mask, odds) {
    const legs = [];
    for (let i = 0; i < n; i += 1) {
      const killer = (mask & (1 << i)) !== 0;
      legs.push(leg(slotNames[i], killer ? (odds || "") : "", killer));
    }
    return legs;
  }
  function assertRoastHonest(legs, roast) {
    assert(roast.indexOf("{") === -1, "template leak: " + roast);
    assert(roast.indexOf("Frame ") === -1, "frame line: " + roast);
    assert(roast.toLowerCase().indexOf("in the middle of the story") === -1, roast);
    const killers = legs.filter(function (row) { return row.killer; });
    if (killers.length >= 2) {
      assert(!/almost|one breath short|close enough|the rest lived/i.test(roast), roast);
    }
    const last = legs[legs.length - 1];
    roast.split(/(?<=[.!])/).forEach(function (sentence) {
      const namedKillers = legs.filter(function (row) {
        return row.killer && sentence.indexOf(row.name) !== -1;
      });
      if (/last name on the slip|closed the slip|wrote the ending|final cut|buzzer|the ending was|finished it|at the end of/i.test(sentence)) {
        namedKillers.forEach(function (row) {
          assert(row === last, "last-slot line named " + row.name + " in: " + sentence + " / " + roast);
        });
      }
      if (/not the opener/i.test(sentence)) assert(!legs[0].killer, "claims the opener lived: " + roast);
      if (/not the closer/i.test(sentence)) assert(!last.killer, "claims the closer lived: " + roast);
      if (/the closer cashed|the last leg cashed|the last leg lived/i.test(sentence)) {
        assert(!last.killer, "says the closer cashed: " + roast);
      }
      if (/middle of the pile|bled out in the middle|in the middle|between the cashed|middle of the slip|parked in the middle|middle bleed on/i.test(sentence)) {
        namedKillers.forEach(function (row) {
          const idx = legs.indexOf(row);
          assert(idx > 0 && idx < legs.length - 1, "middle line named " + row.name + " in: " + sentence);
        });
      }
    });
  }
  for (let n = 2; n <= 6; n += 1) {
    const byDead = [];
    const total = 1 << n;
    for (let mask = 1; mask < total; mask += 1) {
      const plain = slotLegs(n, mask, "");
      const juicy = slotLegs(n, mask, "+300");
      const plainCall = ParlayAutopsy.callAutopsy(plain, 0);
      const juicyCall = ParlayAutopsy.callAutopsy(juicy, 0);
      let dead = 0;
      for (let i = 0; i < n; i += 1) if (mask & (1 << i)) dead += 1;
      if (!byDead[dead]) byDead[dead] = { min: plainCall.meter, max: plainCall.meter };
      byDead[dead].min = Math.min(byDead[dead].min, plainCall.meter, juicyCall.meter);
      byDead[dead].max = Math.max(byDead[dead].max, plainCall.meter, juicyCall.meter);
      if (dead === n) eq(plainCall.cause, "TOTAL COLLAPSE", n + " all dead");
      else if (dead === 1 && (mask & 1) && !(mask & (1 << (n - 1)))) eq(plainCall.cause, "NEAR MISS", "single opener");
      else if (dead >= 2 && (mask & (1 << (n - 1)))) eq(plainCall.cause, "LAST LEG", "multi last");
      else if (dead >= 2) eq(plainCall.cause, "MIDDLE BLEED", "multi with the last alive");
      for (let salt = 0; salt < 24; salt += 1) {
        const roast = ParlayAutopsy.callAutopsy(plain, salt).roast;
        assertRoastHonest(plain, roast);
        if (dead >= 2) {
          const again = ParlayAutopsy.callAutopsy(juicy, salt).roast;
          assertRoastHonest(juicy, again);
        }
      }
    }
    let prevMax = -1;
    for (let dead = 1; dead <= n; dead += 1) {
      assert(byDead[dead].min >= prevMax, "meter dropped at " + dead + "/" + n + " min " + byDead[dead].min + " after " + prevMax);
      prevMax = byDead[dead].max;
    }
  }
  eq(ParlayAutopsy.callAutopsy([
    leg("A", "", true),
    leg("B", "", true),
    leg("C", "", true),
    leg("D", "", true),
    leg("E", "", true),
    leg("F", "", false),
  ], 0).cause, "MIDDLE BLEED", "five of six, last alive");
  eq(ParlayAutopsy.callAutopsy([
    leg("A", "", false),
    leg("B", "", true),
    leg("C", "", true),
    leg("D", "", true),
    leg("E", "", true),
    leg("F", "", true),
  ], 0).cause, "LAST LEG", "five of six, last dead");
  const heavy = ParlayAutopsy.callAutopsy([
    leg("A", "", true),
    leg("B", "", true),
    leg("C", "", true),
    leg("D", "", true),
    leg("E", "", true),
    leg("F", "", false),
  ], 0);
  const light = ParlayAutopsy.callAutopsy([
    leg("A", "", false),
    leg("B", "+300", true),
  ], 0);
  assert(heavy.meter > light.meter, "five dead of six outranks one dead of two");

  const maxed = ParlayAutopsy.reautopsy(
    ParlayAutopsy.normalizeState({
      v: 1,
      cards: [{
        id: "maxed-card",
        legs: [leg("Ada", "", false), leg("Bee", "", true)],
        salt: 9999,
      }],
      openId: "maxed-card",
    }),
    "maxed-card",
    1
  );
  eq(maxed.reason, "salt", "re-autopsy stops at the salt cap");
  eq(ParlayAutopsy.callAutopsy([leg("Only", "", true)], 0), null, "one leg does not invent a stamp");
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
