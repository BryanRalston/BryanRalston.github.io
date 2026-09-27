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
vm.runInContext(fs.readFileSync(path.join(__dirname, "verdict.js"), "utf8"), context);
const StartSit = context.StartSit;

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

const players = {
  a: { name: "Avery Knox", team: "PHI RB", note: "goal line hammer" },
  b: { name: "Nico Vale", team: "DAL RB", note: "committee whispers" },
};

async function main() {
  eq(StartSit.STORAGE_KEY, "start-sit-v1", "storage key");
  eq(StartSit.HISTORY_CAP, 24, "history cap");
  assertCleanSvg("icon.svg");

  const html = read("index.html");
  const app = read("app.js");
  const sw = read("sw.js");
  const manifest = read("manifest.webmanifest");
  assert(html.indexOf("<title>Start Sit</title>") !== -1, "title");
  assert(html.indexOf('class="feature-map"') !== -1, "feature map");
  assert(html.indexOf('class="feature-map" open') === -1, "feature map collapsed");
  assert(html.indexOf('aria-live="polite"') !== -1, "live region");
  assert(html.indexOf('class="skip"') !== -1, "skip link");
  assert(html.indexOf('id="storageFail"') !== -1, "storage banner");
  assert(html.indexOf("entertainment only") !== -1 || html.toLowerCase().indexOf("entertainment only") !== -1, "honest copy");
  assert(html.toLowerCase().indexOf("not fantasy advice") !== -1, "not advice");
  assert(html.toLowerCase().indexOf("not betting") !== -1, "not betting");
  assert(app.indexOf("StartSit.STORAGE_KEY") !== -1, "app uses storage key");
  assert(app.indexOf('"#s="') !== -1, "hash prefix");
  assert(sw.indexOf('"start-sit-v2"') !== -1, "sw cache");
  assert(sw.indexOf("start-sit-v1") === -1, "storage key stays out of the cache name");
  assert(sw.indexOf("pathname") !== -1, "cache key is the pathname");
  assert(sw.indexOf("function networkFirst") !== -1, "html is network-first");
  assert(html.indexOf("either slot order") !== -1, "order-independent copy");
  assert(html.indexOf("already shelved") !== -1, "shelf reuse copy");
  assert(html.indexOf("does not copy the sender's star") !== -1, "keep star copy");
  assert(html.indexOf("start-sit-v2") !== -1, "feature map cache name");
  assert(html.indexOf(">start-sit-v1<") !== -1, "feature map storage key");
  assert(manifest.indexOf('"Start Sit"') !== -1, "manifest name");
  const boot = app.slice(app.lastIndexOf("function boot"));
  const listenAt = boot.indexOf('addEventListener("hashchange"');
  const scheduleAt = boot.lastIndexOf("scheduleShareImport()");
  assert(listenAt !== -1 && scheduleAt !== -1 && listenAt < scheduleAt, "hashchange listener before import");

  const once = StartSit.callBooth(players.a, players.b, 0);
  const twice = StartSit.callBooth(players.a, players.b, 0);
  eq(once.starter, twice.starter, "stable starter");
  eq(once.reason, twice.reason, "stable reason");
  eq(once.confidence, twice.confidence, "stable confidence");
  eq(once.tag, twice.tag, "stable tag");
  eq(once.starter, "a", "sample heat starts Avery");
  eq(once.tag, "NOTE HEAT", "note heat tag");
  assert(once.confidence >= 80 && once.confidence <= 96, "theater confidence band");
  assert(once.reason.indexOf("Avery Knox") !== -1 && once.reason.indexOf("Nico Vale") !== -1, "reason names both");

  const rematch = StartSit.callBooth(players.a, players.b, 1);
  eq(rematch.tag, "REMATCH", "rematch tag");
  assert(rematch.reason !== once.reason, "rematch changes the line");

  const hot = StartSit.callBooth(
    { name: "Hot Hand", note: "must start hammer smash" },
    { name: "Cold Bench", note: "sit ankle questionable cold" },
    0
  );
  eq(hot.starter, "a", "hot note starts");
  const cold = StartSit.callBooth(
    { name: "Hot Hand", note: "sit ankle questionable cold" },
    { name: "Cold Bench", note: "must start hammer smash" },
    0
  );
  eq(cold.starter, "b", "cold note sits");

  const blank = StartSit.callBooth({ name: "Ada", note: "   " }, { name: "Bea", note: "" }, 0);
  eq(blank.tag, "COIN JERSEY", "empty notes are a coin");

  const bijan = { name: "Bijan Robinson", team: "ATL RB", note: "" };
  const gibbs = { name: "Jahmyr Gibbs", team: "DET RB", note: "" };
  const forward = StartSit.callBooth(bijan, gibbs, 0);
  const reverse = StartSit.callBooth(gibbs, bijan, 0);
  function started(call, a, b) {
    return call.starter === "a" ? a.name : b.name;
  }
  eq(started(forward, bijan, gibbs), "Bijan Robinson", "canonical pair starts Bijan");
  eq(started(reverse, gibbs, bijan), "Bijan Robinson", "slot order does not flip the starter");
  eq(forward.confidence, 60, "bijan confidence");
  eq(reverse.confidence, forward.confidence, "same confidence");
  eq(reverse.reason, forward.reason, "same reason");
  eq(reverse.tag, forward.tag, "same tag");
  eq(forward.starter, "a", "Bijan in slot A");
  eq(reverse.starter, "b", "Bijan in slot B");

  eq(StartSit.decide(StartSit.emptyState(), { a: { name: "  " }, b: { name: "Bea" } }, 1).reason, "nameA");
  eq(StartSit.decide(StartSit.emptyState(), { a: { name: "Ada" }, b: { name: "   " } }, 1).reason, "nameB");
  eq(StartSit.decide(StartSit.emptyState(), { a: { name: " " }, b: { name: " \n" } }, 1).reason, "names");
  eq(StartSit.decide(StartSit.emptyState(), { a: { name: "Ada" }, b: { name: " ada " } }, 1).reason, "same");

  const trimmed = StartSit.decide(StartSit.emptyState(), {
    a: { name: "  Ada  ", team: "  KC WR ", note: "  hot  " },
    b: { name: "\nBea\t", team: "", note: "" },
  }, 1000);
  assert(trimmed.ok, "trimmed decide");
  eq(trimmed.card.a.name, "Ada");
  eq(trimmed.card.a.team, "KC WR");
  eq(trimmed.card.a.note, "hot");
  eq(trimmed.card.b.name, "Bea");

  const again = StartSit.decide(StartSit.emptyState(), players, 99);
  eq(again.card.reason, once.reason, "decide matches the booth");
  eq(again.card.starter, once.starter);
  assert(again.card.id !== trimmed.card.id, "distinct ids");

  let shelf = StartSit.emptyState();
  for (let i = 0; i < 24; i += 1) {
    const added = StartSit.decide(shelf, { a: { name: "A" + i }, b: { name: "B" + i } }, 5000 + i);
    assert(added.ok, "fill " + i);
    shelf = added.state;
  }
  eq(shelf.cards.length, 24, "cap filled");
  const blocked = StartSit.decide(shelf, { a: { name: "A24" }, b: { name: "B24" } }, 9000);
  eq(blocked.ok, false, "cap blocks");
  eq(blocked.reason, "cap");
  const buried = shelf.cards.find(function (card) { return card.a.name === "A0"; });
  const resurfaced = StartSit.decide(shelf, { a: { name: "b0" }, b: { name: "a0" } }, 9001);
  assert(resurfaced.ok && resurfaced.already, "cap still reopens a pair");
  eq(resurfaced.state.cards.length, 24, "reopen does not grow the shelf");
  eq(resurfaced.state.cards[0].id, buried.id, "existing card moves to the top");
  eq(resurfaced.state.openId, buried.id, "existing card is shown");

  const firstFight = StartSit.decide(StartSit.emptyState(), { a: bijan, b: gibbs }, 30);
  assert(firstFight.ok && !firstFight.already, "new fight");
  const swappedFight = StartSit.decide(firstFight.state, {
    a: { name: " jahmyr gibbs ", team: "det rb", note: "" },
    b: { name: "BIJAN ROBINSON", team: "atl rb", note: " " },
  }, 31);
  assert(swappedFight.ok && swappedFight.already, "opposite slots reuse the card");
  eq(swappedFight.state.cards.length, 1, "no duplicate card");
  eq(swappedFight.card.id, firstFight.card.id, "same card id");
  eq(StartSit.starterPlayer(swappedFight.card).name, "Bijan Robinson", "shown starter stays");
  const otherFight = StartSit.decide(swappedFight.state, { a: { name: "Ada" }, b: { name: "Bea" } }, 32);
  const lifted = StartSit.decide(otherFight.state, { a: gibbs, b: bijan }, 33);
  assert(lifted.already, "lift");
  eq(lifted.state.cards.length, 2, "lift does not add");
  eq(lifted.state.cards[0].id, firstFight.card.id, "lifted to the top");
  eq(lifted.state.openId, firstFight.card.id, "lifted card is open");
  const noted = StartSit.decide(lifted.state, {
    a: bijan,
    b: { name: "Jahmyr Gibbs", team: "DET RB", note: "hot" },
  }, 34);
  assert(noted.ok && !noted.already, "a new note is a new fight");
  eq(noted.state.cards.length, 3);
  const flippedSlots = StartSit.swapSides(firstFight.state, firstFight.card.id, 35);
  eq(StartSit.starterPlayer(flippedSlots.card).name, "Bijan Robinson", "swap keeps Bijan");
  eq(flippedSlots.card.reason, firstFight.card.reason, "swap keeps the reason");
  eq(flippedSlots.card.confidence, firstFight.card.confidence, "swap keeps the percent");

  const swapped = StartSit.swapSides(again.state, again.card.id, 5);
  assert(swapped.ok, "swap");
  eq(StartSit.starterPlayer(swapped.card).name, StartSit.starterPlayer(again.card).name, "same human starts");
  eq(swapped.card.a.name, again.card.b.name, "columns traded");
  eq(swapped.card.reason, again.card.reason, "reason stays with the names");
  const round = StartSit.normalizeState(JSON.parse(JSON.stringify(swapped.state)));
  eq(StartSit.starterPlayer(round.cards[0]).name, "Avery Knox", "swap survives reload");

  const starred = StartSit.setStarred(swapped.state, swapped.card.id, true, 6);
  assert(starred.card.starred, "starred");
  const rolled = StartSit.reroll(starred.state, starred.card.id, 7);
  assert(rolled.ok, "reroll");
  eq(rolled.card.id, starred.card.id, "same card");
  eq(rolled.card.salt, starred.card.salt + 1, "salt bumps");
  eq(rolled.card.starred, true, "star sticks");
  eq(rolled.card.tag, "REMATCH");
  assert(rolled.card.reason !== starred.card.reason, "new flavor");
  const undone = StartSit.putCard(rolled.state, rolled.previous);
  eq(undone.card.salt, starred.card.salt, "undo rematch");
  eq(undone.card.reason, starred.card.reason, "previous line");

  const removed = StartSit.removeCard(undone.state, undone.card.id);
  assert(removed.ok, "remove");
  eq(removed.state.cards.length, 0);
  eq(removed.state.openId, "");
  const restored = StartSit.restoreCard(removed.state, removed.removed, removed.index, removed.wasOpen);
  assert(restored.ok, "restore");
  eq(restored.state.openId, undone.card.id);

  const cleared = StartSit.clearCards(restored.state);
  eq(cleared.state.cards.length, 0);
  const brought = StartSit.restoreAll(cleared.state, cleared.previous, cleared.openId);
  eq(brought.state.cards.length, 1);
  eq(brought.state.openId, undone.card.id);

  const sample = StartSit.loadSample(StartSit.emptyState());
  assert(sample.ok && !sample.already, "sample loads");
  eq(sample.card.id, StartSit.SAMPLE_ID);
  eq(StartSit.starterPlayer(sample.card).name, "Avery Knox");
  const second = StartSit.loadSample(sample.state);
  assert(second.already, "sample reopens");
  eq(second.state.cards.length, 1, "sample does not duplicate");

  const payload = StartSit.shareCard(rolled.card);
  const parsed = StartSit.parseShare(JSON.parse(JSON.stringify(payload)));
  eq(parsed.card.id, rolled.card.id);
  eq(parsed.card.reason, rolled.card.reason);
  eq(parsed.card.starter, rolled.card.starter);
  eq(parsed.card.a.name, rolled.card.a.name);
  eq(parsed.card.starred, true);
  assert(StartSit.parseShare(null) === null, "bad share");
  assert(StartSit.parseShare({ v: 1, k: "nope" }) === null, "wrong kind");
  eq(StartSit.face(parsed.card).indexOf("START ") === 0, true, "face line");

  const kept = StartSit.keepShare(StartSit.emptyState(), parsed);
  assert(kept.ok, "keep");
  eq(kept.state.openId, parsed.card.id);
  eq(kept.card.starred, false, "keep drops the sender star");
  eq(kept.state.cards[0].starred, false, "shelf copy is not starred");
  eq(parsed.card.starred, true, "the snapshot still records the star");
  const dup = StartSit.keepShare(kept.state, parsed);
  eq(dup.ok, false);
  eq(dup.reason, "exists");

  const packed = await StartSit.compressPayload(JSON.stringify(payload));
  assert(packed.indexOf("j.") === 0 || packed.indexOf("z.") === 0, "packed prefix");
  const json = await StartSit.decompressPayload(packed);
  eq(StartSit.parseShare(JSON.parse(json)).card.reason, rolled.card.reason, "round trip");
  let threw = false;
  try {
    await StartSit.decompressPayload("nope");
  } catch (_) {
    threw = true;
  }
  assert(threw, "bad token throws");

  const dirty = StartSit.normalizeState({
    v: 1,
    openId: "missing",
    cards: [{ id: "ok", a: { name: "Ada" }, b: { name: "Bea" }, salt: 0 }, { id: "bad" }, null],
  });
  eq(dirty.cards.length, 1, "drops junk");
  eq(dirty.openId, "ok", "falls back to a real card");
  eq(dirty.cards[0].a.name, "Ada");

  const salt4 = StartSit.callBooth(players.a, players.b, 4);
  const salt5 = StartSit.callBooth(players.a, players.b, 5);
  eq(salt4.starter, salt5.starter, "this rematch keeps the starter");
  assert(salt5.reason.indexOf("changed its mind on purpose") !== -1, "raw rematch line still exists");
  const mindState = StartSit.normalizeState({
    v: 1,
    openId: "mind-case",
    cards: [{
      id: "mind-case",
      a: players.a,
      b: players.b,
      salt: 4,
      starter: salt4.starter,
      confidence: salt4.confidence,
      reason: salt4.reason,
      tag: salt4.tag,
      created: 1,
      updated: 1,
    }],
  });
  const keptStarter = StartSit.reroll(mindState, "mind-case", 2);
  eq(keptStarter.card.starter, salt5.starter, "reroll starter");
  eq(keptStarter.card.confidence, salt5.confidence, "reroll confidence");
  assert(keptStarter.card.reason.indexOf("changed its mind on purpose") === -1, "same starter skips that line");

  const ada = { name: "Ada", note: "" };
  const bea = { name: "Bea", note: "" };
  const beforeFlip = StartSit.callBooth(ada, bea, 23);
  const flipState = StartSit.normalizeState({
    v: 1,
    openId: "flip-case",
    cards: [{
      id: "flip-case",
      a: ada,
      b: bea,
      salt: 23,
      starter: beforeFlip.starter,
      confidence: beforeFlip.confidence,
      reason: beforeFlip.reason,
      tag: beforeFlip.tag,
      created: 1,
      updated: 1,
    }],
  });
  const flipped = StartSit.reroll(flipState, "flip-case", 9);
  assert(flipped.card.starter !== beforeFlip.starter, "rematch can change the starter");
  assert(flipped.card.reason.indexOf("changed its mind on purpose") !== -1, "a real change can say so");
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
