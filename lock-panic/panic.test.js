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
vm.runInContext(fs.readFileSync(path.join(__dirname, "panic.js"), "utf8"), context);
const LockPanic = context.LockPanic;

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

function sit(starter, backup, minutes, note) {
  return { starter: starter, backup: backup || "", minutes: minutes || "", note: note || "" };
}

const sample = LockPanic.sampleInput();
const SOLO_OK = { HOLD: true, "LEAN HOLD": true, "COIN FLIP": true };

async function main() {
  eq(LockPanic.STORAGE_KEY, "lock-panic-v1", "storage key");
  eq(LockPanic.HISTORY_CAP, 24, "history cap");
  eq(LockPanic.STAMPS.length, 5, "five stamps");
  assertCleanSvg("icon.svg");

  const html = read("index.html");
  const app = read("app.js");
  const sw = read("sw.js");
  const manifest = read("manifest.webmanifest");
  const css = read("app.css");
  assert(html.indexOf("<title>Lock Panic</title>") !== -1, "title");
  assert(html.indexOf('class="feature-map"') !== -1, "feature map");
  assert(html.indexOf('class="feature-map" open') === -1, "feature map collapsed");
  assert(html.indexOf('aria-live="polite"') !== -1, "live region");
  assert(html.indexOf('class="skip"') !== -1, "skip link");
  assert(html.indexOf('id="storageFail"') !== -1, "storage banner");
  assert(html.toLowerCase().indexOf("entertainment only") !== -1, "honest copy");
  assert(html.toLowerCase().indexOf("not fantasy advice") !== -1, "not advice");
  assert(html.toLowerCase().indexOf("no money") !== -1, "no money");
  assert(html.indexOf("Russo+One") !== -1, "russo one");
  assert(html.indexOf("DM+Mono") !== -1, "dm mono");
  assert(html.indexOf("Outfit") !== -1, "outfit");
  assert(html.indexOf('id="btnKeepShare"') !== -1, "keep");
  assert(html.indexOf(">Not now<") !== -1, "not now");
  assert(html.indexOf("Already on this phone") !== -1, "already copy in the page");
  assert(html.indexOf("oldest unstarred") !== -1, "evict copy");
  assert(html.indexOf(">lock-panic-v1<") !== -1, "feature map names the key");
  assert(html.indexOf("#k=") !== -1, "hash documented");
  assert(html.indexOf("?k=") !== -1, "query documented");
  assert(html.indexOf('id="storageCorrupt"') !== -1, "corrupt notice");
  assert(html.indexOf(">lock-panic-v3<") !== -1, "feature map names the cache");
  assert(html.indexOf('href="app.css?v=2"') !== -1, "style version");
  assert(html.indexOf('src="panic.js?v=2"') !== -1, "engine version");
  assert(html.indexOf('src="app.js?v=2"') !== -1, "app version");
  assert(html.indexOf("Starter required. Backup, minutes and note are optional.") !== -1, "plain hint");
  assert(html.indexOf("Anxiety meter. Entertainment only. Not a projection. Not fantasy advice.") === -1, "meter line is off the card");
  assert(html.indexOf("Entertainment only. Not a projection. Not fantasy advice.") !== -1, "meter disclaimer stays for assistive tech");
  assert(html.indexOf('class="honest"') === -1, "stacked top disclaimer is gone");
  assert(html.indexOf("HOLD") !== -1, "hold named");
  assert(html.indexOf("LEAN HOLD") !== -1, "lean hold named");
  assert(html.indexOf("COIN FLIP") !== -1, "coin flip named");
  assert(html.indexOf("LEAN SWAP") !== -1, "lean swap named");
  assert(html.indexOf("PANIC") !== -1, "panic named");
  assert(html.indexOf("one tap") !== -1, "copy link is one tap");
  assert(app.indexOf("LockPanic.STORAGE_KEY") !== -1, "app uses storage key");
  assert(app.indexOf('"#k="') !== -1, "hash prefix");
  assert(app.indexOf('const QUERY_KEY = "k"') !== -1, "query key");
  assert(app.indexOf("Already on this phone.") !== -1, "duplicate toast");
  assert(app.indexOf("innerHTML") === -1, "no innerHTML");
  assert(read("panic.js").indexOf("innerHTML") === -1, "engine has no innerHTML");
  assert(sw.indexOf('"lock-panic-v3"') !== -1, "sw cache");
  assert(sw.indexOf("lock-panic-v1") === -1, "storage key is not the cache");
  assert(sw.indexOf("function networkFirst") !== -1, "html is network-first");
  assert(sw.indexOf("function staleWhileRevalidate") !== -1, "js and css revalidate");
  assert(sw.indexOf("url.origin + url.pathname + url.search") !== -1, "versioned assets keep the query");
  assert(sw.indexOf("url.origin + url.pathname);") !== -1, "html cache key stays the pathname");
  assert(sw.indexOf("ignoreSearch") === -1, "cache match does not ignore search");
  assert(sw.indexOf("./app.js?v=2") !== -1, "precache uses the versioned script");
  assert(sw.indexOf("./panic.js?v=2") !== -1, "precache uses the versioned engine");
  assert(app.indexOf("STORAGE_BACKUP_KEY") !== -1, "corrupt value is backed up");
  assert(app.indexOf("function retireStaleUndo") !== -1, "undo leaves when it cannot run");
  assert(app.indexOf("toastExtra") !== -1, "confirmation shows beside a live undo");
  assert(app.indexOf("if (!toastBag) toast(msg, { important: true });") !== -1, "form error does not cover undo");
  assert(app.indexOf("function copyCardLink") !== -1, "card copy is direct");
  assert(app.indexOf("if (!card || card.starred || card.salt > 0) return false;") !== -1, "room undo retires after star or re-panic");
  assert(app.indexOf("if (!result.already) writeForm(result.card);") !== -1, "duplicate keeps the typed slip");
  assert(app.indexOf("clearEmptyPanicHash") !== -1, "empty hash is cleared");
  assert(app.indexOf("Pick a different backup, or leave it blank.") !== -1, "same player error");
  assert(app.indexOf("Minutes need a whole number from 0 to 240.") !== -1, "minutes error");
  assert(app.indexOf("1 saved panic could not be read and was set aside.") !== -1, "partial corrupt notice");
  assert(app.indexOf("clearHold") !== -1, "clear undo can outlive a panic");
  assert(app.indexOf("function showClearUndo") !== -1, "clear undo can return");
  const panicUndo = app.slice(app.indexOf("function applyUndo"), app.indexOf("function undoLast"));
  assert(panicUndo.indexOf("showClearUndo") !== -1, "undoing a panic can restore clear");
  assert(css.indexOf("min-height: 44px") !== -1, "tap targets");
  assert(app.indexOf("Starred panics fill this phone. Remove one to keep this now.") !== -1, "keep cap copy");
  assert(app.indexOf("This phone holds 24 panics. Starred panics stay. Remove one to panic another.") !== -1, "panic cap copy");
  assert(app.indexOf('els.btnKeepShare.textContent = preview.fresh ? "Keep on this phone" : "Already on this phone"') !== -1, "already button");
  const openFn = app.slice(app.indexOf("function openFromShelf"), app.indexOf("function loadSample"));
  assert(openFn.indexOf("writeForm") === -1, "opening a shelf row keeps the draft");
  const keepFn = app.slice(app.indexOf("function keepIncoming"), app.indexOf("function dismissShare"));
  const capToast = keepFn.indexOf("Starred panics fill this phone");
  assert(capToast !== -1, "keep can refuse");
  assert(keepFn.slice(capToast, capToast + 220).indexOf("incoming = null") === -1, "cap refusal keeps the offer");
  const copyFn = app.slice(app.indexOf("function copyCardLink"), app.indexOf("function wire"));
  assert(copyFn.indexOf("writeClipboard") !== -1 && copyFn.indexOf("writeClipboard") < copyFn.indexOf("presentShare"), "clipboard before the dialog");
  assert(sw.indexOf("./panic.js") !== -1, "engine cached");
  assert(manifest.indexOf('"Lock Panic"') !== -1, "manifest name");
  assert(manifest.indexOf('"standalone"') !== -1, "installable display");
  assert(css.indexOf("Russo One") !== -1, "display font");
  assert(css.indexOf("overflow-x: hidden") !== -1, "no sideways scroll");
  const boot = app.slice(app.lastIndexOf("function boot"));
  const listenAt = boot.indexOf('addEventListener("hashchange"');
  const scheduleAt = boot.lastIndexOf("scheduleShareImport()");
  assert(listenAt !== -1 && scheduleAt !== -1 && listenAt < scheduleAt, "hashchange listener before import");

  const once = LockPanic.callPanic(sample.starter, sample.backup, 0);
  const twice = LockPanic.callPanic(sample.starter, sample.backup, 0);
  eq(once.stamp, twice.stamp, "stable stamp");
  eq(once.roast, twice.roast, "stable roast");
  eq(once.meter, twice.meter, "stable meter");
  eq(once.tag, twice.tag, "stable tag");
  assert(LockPanic.STAMPS.indexOf(once.stamp) !== -1, "sample stamp is real");
  assert(once.roast.indexOf("Ja'Marr Chase") !== -1, "sample names the starter");
  assert(once.roast.indexOf("A committee receiver") !== -1, "sample names the backup");
  assert(once.roast.indexOf("{") === -1, "sample roast has no token");
  assert(once.meter >= 8 && once.meter <= 96, "meter stays in range");
  assert(once.roast.indexOf("The booth goes again.") !== 0, "first panic is not a re-panic lead");
  eq(LockPanic.bandFor(once.stamp) !== "", true, "band exists");

  const reordered = LockPanic.callPanic("Chase Ja'Marr", "receiver committee A", 0);
  eq(reordered.stamp, once.stamp, "word order does not move the stamp");
  eq(reordered.tag, once.tag, "word order does not move the tag");
  eq(reordered.meter, once.meter, "word order does not move the meter");
  assert(reordered.roast.indexOf("Chase Ja'Marr") !== -1, "reorder keeps the typed starter");
  assert(reordered.roast.indexOf("receiver committee A") !== -1, "reorder keeps the typed backup");
  eq(LockPanic.nameKey("Ja'Marr Chase"), LockPanic.nameKey("Jamarr Chase"), "apostrophe folds");
  eq(LockPanic.nameKey("Ja'Marr Chase"), LockPanic.nameKey("chase jamarr"), "order folds");
  eq(LockPanic.nameKey("José Ramírez"), LockPanic.nameKey("Jose Ramirez"), "accents fold");
  eq(LockPanic.nameKey("A.J. Brown"), LockPanic.nameKey("AJ Brown"), "periods fold");
  eq(LockPanic.nameKey("D.K. Metcalf"), LockPanic.nameKey("DK Metcalf"), "initials fold");
  eq(LockPanic.nameKey("A. J. Brown"), LockPanic.nameKey("AJ Brown"), "spaced initials fold");
  const typedNames = LockPanic.panic(LockPanic.emptyState(), sit("A.J. Brown", "José Ramírez"), 7);
  eq(typedNames.card.starter, "A.J. Brown", "display keeps the typed starter");
  eq(typedNames.card.backup, "José Ramírez", "display keeps the typed backup");
  eq(typedNames.card.stamp, LockPanic.callPanic("AJ Brown", "Jose Ramirez", 0).stamp, "folded names share a stamp");

  const again = LockPanic.callPanic(sample.starter, sample.backup, 3);
  eq(again.stamp, once.stamp, "re-panic keeps the stamp");
  eq(again.tag, once.tag, "re-panic keeps the tag");
  eq(again.meter, once.meter, "re-panic keeps the meter");
  assert(again.roast !== once.roast, "re-panic changes the roast");
  const leadRoasts = [1, 2, 3, 4].map(function (salt) {
    return LockPanic.callPanic(sample.starter, sample.backup, salt).roast;
  });
  const prefixes = leadRoasts.map(function (roast) { return roast.slice(0, 12); });
  assert(prefixes.filter(function (prefix, index) {
    return prefixes.indexOf(prefix) === index;
  }).length >= 3, "re-panic lead rotates");

  const found = Object.create(null);
  for (let i = 0; i < 80; i += 1) {
    const call = LockPanic.callPanic("Starter " + i, "Backup " + i, 0);
    found[call.stamp] = true;
    assert(call.roast.indexOf("Starter " + i) !== -1, "named roast keeps the starter");
    assert(call.roast.indexOf("Backup " + i) !== -1, "named roast keeps the backup");
    assert(call.roast.indexOf("{") === -1, "no token leak");
    assert(call.meter >= 8 && call.meter <= 96, "meter band");
  }
  LockPanic.STAMPS.forEach(function (stamp) {
    assert(found[stamp], "named pairs can land on " + stamp);
  });

  for (let i = 0; i < 40; i += 1) {
    const call = LockPanic.callPanic("Only " + i, "", 0);
    assert(SOLO_OK[call.stamp], "solo stamp stays hold-side: " + call.stamp);
    assert(call.stamp !== "LEAN SWAP" && call.stamp !== "PANIC", "solo does not swap");
  }
  const soloStarter = Object.create(null);
  for (let i = 0; i < 80; i += 1) {
    const call = LockPanic.callPanic("Only " + i, "", 0);
    if (!soloStarter[call.stamp]) soloStarter[call.stamp] = "Only " + i;
  }
  const soloLeads = ["The booth goes again. ", "Same stamp, new mouth. ", "Take two. ", "Run it back. "];
  LockPanic.STAMPS.forEach(function (stamp) {
    if (!SOLO_OK[stamp]) return;
    const starter = soloStarter[stamp];
    assert(starter, "solo starter for " + stamp);
    const seen = Object.create(null);
    let nags = 0;
    for (let salt = 0; salt < 8; salt += 1) {
      const call = LockPanic.callPanic(starter, "", salt);
      eq(call.stamp, stamp, "re-panic keeps a solo stamp");
      let body = call.roast;
      soloLeads.forEach(function (lead) {
        if (body.indexOf(lead) === 0) body = body.slice(lead.length);
      });
      seen[body] = true;
      if (/no backup|did not name a backup/i.test(body)) nags += 1;
    }
    eq(Object.keys(seen).length, 8, stamp + " has eight solo lines");
    assert(nags <= 2, stamp + " mentions the missing backup " + nags + " times");
  });
  assert(read("panic.js").indexOf("Another freakout") === -1, "stacked freakout lead is gone");
  for (let salt = 0; salt < 12; salt += 1) {
    const roast = LockPanic.callPanic(sample.starter, sample.backup, salt).roast;
    assert(!/^Another freakout\. /i.test(roast), roast);
    assert(!/\bfreakout\. (?:lock |full )?freakout\b/i.test(roast), roast);
  }

  const longName = "Verylongname ".repeat(8).trim();
  const longCall = LockPanic.callPanic(longName, "Backup name that is also quite long indeed", 0);
  assert(longCall, "long names still panic");
  assert(Array.from(longCall.roast).length <= 240, "roast caps");

  eq(LockPanic.clockLabel(""), "");
  eq(LockPanic.clockLabel("12"), "12 min to lock");
  eq(LockPanic.clockLabel("1"), "1 min to lock");
  eq(LockPanic.clockLabel("0"), "Locked");
  eq(LockPanic.clockLabel("soon"), "soon");
  eq(LockPanic.callPanic("", "Backup", 0), null, "starter required");
  eq(LockPanic.callPanic("Josh Allen", "Josh Allen", 0), null, "same player is not a panic");
  const samePlayer = LockPanic.panic(LockPanic.emptyState(), sit("Josh Allen", "josh  ALLEN"), 3);
  eq(samePlayer.ok, false, "same player is rejected");
  eq(samePlayer.reason, "same");
  const soloAllen = LockPanic.panic(LockPanic.emptyState(), sit("Josh Allen", ""), 4);
  assert(soloAllen.ok, "a blank backup is still allowed");
  ["-5", "99999", "12.5", "1e3", "241", "soon", "9999"].forEach(function (bad) {
    eq(LockPanic.panic(LockPanic.emptyState(), sit("Ada", "Bee", bad), 5).reason, "minutes", bad);
  });
  assert(LockPanic.panic(LockPanic.emptyState(), sit("Ada", "Bee", "0"), 6).ok, "zero minutes");
  assert(LockPanic.panic(LockPanic.emptyState(), sit("Ada", "Bee", "240"), 6).ok, "240 minutes");
  assert(LockPanic.panic(LockPanic.emptyState(), sit("Ada", "Bee", ""), 6).ok, "blank minutes");
  const legacyMinutes = LockPanic.normalizeCard({ id: "legacy-min", s: "Ada", b: "Bee", sa: 0, m: "soon" });
  assert(legacyMinutes, "old freeform minutes still load");
  eq(LockPanic.clockLabel(legacyMinutes.minutes), "soon");

  function mirrorOf(stamp) {
    switch (stamp) {
      case "HOLD":
        return "PANIC";
      case "LEAN HOLD":
        return "LEAN SWAP";
      case "COIN FLIP":
        return "COIN FLIP";
      case "LEAN SWAP":
        return "LEAN HOLD";
      case "PANIC":
        return "HOLD";
      default:
        throw new Error(stamp);
    }
  }
  const olave = LockPanic.callPanic("Chris Olave", "Tank Dell", 0);
  const dell = LockPanic.callPanic("Tank Dell", "Chris Olave", 0);
  eq(dell.stamp, mirrorOf(olave.stamp), "swapped names mirror the stamp");
  assert(!(olave.stamp === "PANIC" && dell.stamp === "PANIC"), "panic is not both directions");
  for (let i = 0; i < 30; i += 1) {
    const forward = LockPanic.callPanic("Alpha " + i, "Beta " + i, 0);
    const backward = LockPanic.callPanic("Beta " + i, "Alpha " + i, 0);
    eq(backward.stamp, mirrorOf(forward.stamp), "mirror " + i);
  }

  const first = LockPanic.panic(LockPanic.emptyState(), sit("Ja'Marr Chase", "A committee receiver", "12", "Sunday"), 10);
  assert(first.ok && !first.already, "first panic");
  eq(first.card.stamp, once.stamp);
  eq(first.card.roast, once.roast);
  const second = LockPanic.panic(first.state, sit("Chase Ja'Marr", "receiver A committee", "4", "later"), 11);
  assert(second.already, "same pair reopens");
  eq(second.state.cards.length, 1, "no duplicate card");
  eq(second.card.starter, "Ja'Marr Chase", "first spelling stays");
  eq(second.card.minutes, "4", "minutes update");
  eq(second.card.note, "later", "note updates");
  eq(second.card.roast, first.card.roast, "minutes do not move the roast");
  eq(second.card.salt, 0, "reopen does not re-panic");

  const other = LockPanic.panic(second.state, sit("Ja'Marr Chase", "A different backup"), 12);
  assert(other.ok && !other.already, "different backup is a new card");
  eq(other.state.cards.length, 2);

  const blank = LockPanic.panic(LockPanic.emptyState(), sit("", "", "", ""), 1);
  eq(blank.ok, false);
  eq(blank.reason, "blank");
  const missingStarter = LockPanic.panic(LockPanic.emptyState(), sit("", "Only backup", "3", ""), 1);
  eq(missingStarter.reason, "starter");

  let shelf = LockPanic.emptyState();
  for (let i = 0; i < 24; i += 1) {
    const added = LockPanic.panic(shelf, sit("Starter " + i, "Backup " + i), 1000 + i);
    assert(added.ok, "fill " + i);
    shelf = added.state;
  }
  eq(shelf.cards.length, 24);
  const overflow = LockPanic.panic(shelf, sit("Newbie", "Fresh backup"), 2000);
  assert(overflow.ok, "cap makes room");
  eq(overflow.dropped.length, 1, "one drop");
  eq(overflow.dropped[0].card.starter, "Starter 0", "oldest unstarred leaves");
  eq(overflow.state.cards.length, 24);
  assert(!overflow.state.cards.some(function (card) { return card.starter === "Starter 0"; }), "oldest is gone");

  const oldest = shelf.cards[shelf.cards.length - 1];
  const starredFirst = LockPanic.setStarred(shelf, oldest.id, true, 2100);
  const spared = LockPanic.panic(starredFirst.state, sit("Hold newer", "Backup newer"), 2200);
  assert(spared.ok, "star makes room elsewhere");
  eq(spared.dropped[0].card.starter, "Starter 1", "next oldest unstarred leaves");
  assert(spared.state.cards.some(function (card) {
    return card.starter === "Starter 0" && card.starred;
  }), "starred stays");

  const lifted = LockPanic.panic(shelf, sit("Starter 0", "Backup 0", "9", "touched"), 8000);
  assert(lifted.already, "re-enter lifts the oldest pair");
  eq(lifted.state.cards[0].starter, "Starter 0", "touched card is on top");
  eq(lifted.card.minutes, "9", "touch can update minutes");
  const afterLift = LockPanic.panic(lifted.state, sit("Brand New", "Backup New"), 8100);
  assert(afterLift.ok, "cap after a touch");
  eq(afterLift.dropped[0].card.starter, "Starter 1", "bottom unstarred leaves");
  assert(afterLift.state.cards.some(function (card) { return card.starter === "Starter 0"; }), "touched card stays");

  let almost = LockPanic.emptyState();
  for (let i = 0; i < 23; i += 1) {
    almost = LockPanic.panic(almost, sit("Own " + i, "Bench " + i), 6000 + i).state;
  }
  const ancient = LockPanic.parseShare({
    v: 1,
    k: "card",
    c: [{ id: "ancient-card", sa: 0, cr: 1, up: 1, s: "Ancient Kept", b: "Old Backup", m: "", n: "" }],
  });
  const keptAncient = LockPanic.keepShare(almost, ancient);
  assert(keptAncient.ok, "ancient snapshot is kept");
  eq(keptAncient.state.cards[0].id, "ancient-card", "a keep counts as a touch");
  eq(keptAncient.dropped.length, 0, "23 plus one fits");
  const afterKeep = LockPanic.panic(keptAncient.state, sit("After Keep", "Someone"), 9000);
  eq(afterKeep.dropped[0].card.starter, "Own 0", "the bottom shelf card leaves");
  assert(afterKeep.state.cards.some(function (card) { return card.id === "ancient-card"; }), "a just-kept card is not the oldest touch");

  let locked = LockPanic.emptyState();
  for (let i = 0; i < 24; i += 1) {
    locked = LockPanic.panic(locked, sit("Star " + i, "Bench " + i), 3000 + i).state;
    locked = LockPanic.setStarred(locked, locked.cards[0].id, true, 4000 + i).state;
  }
  const refused = LockPanic.panic(locked, sit("One more", "Nobody"), 5000);
  eq(refused.ok, false, "all starred refuses");
  eq(refused.reason, "cap");
  eq(refused.state.cards.length, 24, "refusal does not drop");

  const rerolled = LockPanic.repanic(first.state, first.card.id, 15);
  assert(rerolled.ok, "repanic");
  eq(rerolled.card.stamp, once.stamp);
  eq(rerolled.card.tag, once.tag);
  eq(rerolled.card.meter, once.meter);
  assert(rerolled.card.roast !== first.card.roast, "new roast");
  const putBack = LockPanic.putCard(rerolled.state, rerolled.previous);
  eq(putBack.card.roast, once.roast, "undo restores the roast");
  eq(putBack.card.salt, 0);

  const starred = LockPanic.setStarred(first.state, first.card.id, true, 16);
  assert(starred.card.starred, "starred");
  const removed = LockPanic.removeCard(starred.state, starred.card.id);
  assert(removed.ok, "remove");
  eq(removed.state.cards.length, 0);
  const restored = LockPanic.restoreCard(removed.state, removed.removed, removed.index, removed.wasOpen);
  assert(restored.ok, "restore");
  eq(restored.state.openId, starred.card.id);
  eq(restored.card.starred, true);

  const filtered = LockPanic.setFilter(restored.state, "starred");
  eq(filtered.filter, "starred");
  eq(LockPanic.visibleCards(filtered).length, 1, "starred filter");
  eq(LockPanic.setFilter(filtered, "nope").filter, "all", "bad filter ignored");
  const cleared = LockPanic.clearCards(filtered);
  eq(cleared.state.cards.length, 0);
  eq(cleared.state.filter, "starred", "clear keeps the filter");
  const brought = LockPanic.restoreAll(cleared.state, cleared.previous, cleared.openId);
  eq(brought.state.cards.length, 1);
  eq(brought.state.filter, "starred");
  eq(brought.state.openId, starred.card.id);

  const loaded = LockPanic.loadSample(LockPanic.emptyState());
  assert(loaded.ok && !loaded.already, "sample loads");
  eq(loaded.card.id, LockPanic.SAMPLE_ID);
  eq(loaded.card.stamp, once.stamp);
  eq(loaded.card.roast, once.roast);
  eq(LockPanic.clockLabel(loaded.card.minutes), "12 min to lock");
  const secondSample = LockPanic.loadSample(loaded.state);
  assert(secondSample.already, "sample reopens");
  eq(secondSample.state.cards.length, 1, "sample does not duplicate");

  const payload = LockPanic.shareCard(starred.card);
  eq(payload.k, "card");
  assert(!Object.prototype.hasOwnProperty.call(payload.c[0], "stamp"), "link omits the stamp");
  assert(!Object.prototype.hasOwnProperty.call(payload.c[0], "roast"), "link omits the roast");
  assert(!Object.prototype.hasOwnProperty.call(payload.c[0], "star"), "link omits the star");
  const parsed = LockPanic.parseShare(JSON.parse(JSON.stringify(payload)));
  eq(parsed.cards[0].id, starred.card.id);
  eq(parsed.cards[0].stamp, once.stamp);
  eq(parsed.cards[0].roast, starred.card.roast);
  eq(parsed.cards[0].starred, false, "share does not carry a star");
  assert(LockPanic.parseShare(null) === null, "bad share");
  assert(LockPanic.parseShare({ v: 1, k: "nope", c: [] }) === null, "wrong kind");
  assert(LockPanic.face(parsed.cards[0]).indexOf(once.stamp + " · ") === 0, "face line");

  const kept = LockPanic.keepShare(LockPanic.emptyState(), parsed);
  assert(kept.ok, "keep");
  eq(kept.state.openId, parsed.cards[0].id);
  eq(kept.cards[0].starred, false, "keep drops the sender star");
  const dup = LockPanic.keepShare(kept.state, parsed);
  eq(dup.ok, false);
  eq(dup.reason, "exists");

  const pairDup = LockPanic.keepShare(kept.state, LockPanic.parseShare({
    v: 1,
    k: "card",
    c: [{
      id: "other-id",
      sa: 0,
      s: "Chase Ja'Marr",
      b: "receiver committee A",
      m: "3",
      n: "",
      stamp: "PANIC",
      roast: "Forged roast that is not ours.",
      meter: 4,
      tag: "FAKE TAG",
      star: 1,
    }],
  }));
  eq(pairDup.reason, "exists", "same pair is already on this phone");

  const forged = LockPanic.parseShare({
    v: 1,
    k: "card",
    c: [{
      id: "forged-card",
      sa: 0,
      s: "Tyler Boyd",
      b: "A flex",
      m: "8",
      n: "note",
      stamp: "HOLD",
      meter: 4,
      roast: "Forged roast that is not ours.",
      tag: "FAKE TAG",
      star: 1,
      starred: true,
    }],
  });
  const honest = LockPanic.callPanic("Tyler Boyd", "A flex", 0);
  eq(forged.cards[0].stamp, honest.stamp, "forged stamp is recomputed");
  eq(forged.cards[0].meter, honest.meter, "forged meter is recomputed");
  eq(forged.cards[0].tag, honest.tag, "forged tag is recomputed");
  eq(forged.cards[0].roast, honest.roast, "forged roast is recomputed");
  eq(forged.cards[0].starred, false, "forged star is dropped");
  assert(forged.cards[0].roast.indexOf("Forged") === -1, "forged sentence is dropped");
  eq(forged.cards[0].minutes, "8", "minutes still travel");

  const salty = LockPanic.parseShare({
    v: 1,
    k: "card",
    c: [{
      id: "salted-card",
      sa: 2,
      s: sample.starter,
      b: sample.backup,
      m: sample.minutes,
      n: sample.note,
      roast: "Forged",
      stamp: "HOLD",
      meter: 1,
      tag: "NOPE",
    }],
  });
  const saltedCall = LockPanic.callPanic(sample.starter, sample.backup, 2);
  eq(salty.cards[0].roast, saltedCall.roast, "import keeps the salt and recomputes the roast");
  eq(salty.cards[0].stamp, once.stamp);

  const packed = await LockPanic.compressPayload(JSON.stringify(payload));
  assert(packed.indexOf("z.") === 0 || packed.indexOf("j.") === 0, "packed prefix");
  const json = await LockPanic.decompressPayload(packed);
  eq(LockPanic.parseShare(JSON.parse(json)).cards[0].roast, starred.card.roast, "round trip");
  assert(packed.indexOf("z.") === 0, "deflate token");
  let threw = false;
  try {
    await LockPanic.decompressPayload("nope");
  } catch (_) {
    threw = true;
  }
  assert(threw, "bad token throws");

  let owned = LockPanic.emptyState();
  for (let i = 0; i < 22; i += 1) {
    owned = LockPanic.panic(owned, sit("Own " + i, "Bench " + i), 5000 + i).state;
  }
  const shelfCards = [];
  for (let i = 0; i < 5; i += 1) {
    shelfCards.push({
      id: "shelf-" + i,
      sa: 0,
      s: "Shelf " + i,
      b: "Other " + i,
      m: "",
      n: "",
      stamp: "HOLD",
      meter: 99,
      roast: "Forged shelf roast.",
      tag: "FAKE TAG",
    });
  }
  const multi = LockPanic.parseShare({ v: 1, k: "shelf", c: shelfCards });
  const preview = LockPanic.previewKeep(owned, multi);
  eq(preview.adds, 5, "offer adds five");
  eq(preview.drops, 3, "offer drops the three oldest");
  const keptShelf = LockPanic.keepShare(owned, multi);
  assert(keptShelf.ok, "partial shelf fits");
  eq(keptShelf.dropped.length, 3, "three oldest leave");
  eq(keptShelf.dropped[0].card.starter, "Own 0");
  eq(keptShelf.state.cards.length, 24);
  assert(keptShelf.cards[0].roast.indexOf("Forged") === -1, "shelf import recomputes");

  const blockedKeep = LockPanic.keepShare(locked, multi);
  eq(blockedKeep.ok, false, "starred shelf refuses");
  eq(blockedKeep.reason, "cap");
  eq(blockedKeep.state.cards.length, 24, "refusal does not drop cards");

  eq(LockPanic.keptLine(23, 24, 23, 0), "Kept 23 new, 1 already here.");
  eq(LockPanic.keptLine(23, 24, 24, 0), "Kept 23 of 24.");
  eq(LockPanic.keptLine(4, 4, 4, 1), "Kept. The oldest panic made room.");
  eq(LockPanic.keptLine(1, 1, 1, 0), "Kept on this phone.");

  eq(LockPanic.readStored("{oops").corrupt, true, "bad json is corrupt");
  eq(LockPanic.readStored("{oops").backup, "{oops");
  eq(LockPanic.readStored("null").corrupt, true, "null is corrupt");
  eq(LockPanic.readStored("[]").corrupt, true, "array is corrupt");
  eq(LockPanic.readStored('"str"').corrupt, true, "string is corrupt");
  eq(LockPanic.readStored('{"cards":"x"}').corrupt, true, "bad cards field is corrupt");
  eq(LockPanic.readStored("").corrupt, false, "empty storage is fresh");
  eq(LockPanic.readStored(null).corrupt, false, "missing storage is fresh");
  const mixedSave = LockPanic.readStored(JSON.stringify({
    v: 1,
    cards: [
      { id: "ok-card", s: "Ada", b: "Bee", sa: 0 },
      { id: "nope" },
    ],
  }));
  eq(mixedSave.corrupt, true, "a card that fails validation is set aside");
  eq(mixedSave.dropped, 1, "one bad card");
  eq(mixedSave.state.cards.length, 1, "valid cards stay");
  eq(mixedSave.state.cards[0].id, "ok-card", "the good card remains");
  assert(mixedSave.backup.indexOf("ok-card") === -1, "backup skips the good card");
  assert(mixedSave.backup.indexOf("nope") !== -1, "the bad card is backed up");
  const dupIds = LockPanic.readStored(JSON.stringify({
    v: 1,
    cards: [
      { id: "ok-card", s: "Ada", b: "Bee", sa: 0 },
      { id: "ok-card", s: "Cee", b: "Dee", sa: 0 },
    ],
  }));
  eq(dupIds.corrupt, false, "a repeated id is not a corrupt card");
  eq(dupIds.state.cards.length, 1, "a repeated id keeps the first card");

  const fullSample = LockPanic.sampleCard();
  eq(fullSample.note, "Sunday lock · work league");
  eq(fullSample.starter, "Ja'Marr Chase");

  console.log("lock-panic tests passed");
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
