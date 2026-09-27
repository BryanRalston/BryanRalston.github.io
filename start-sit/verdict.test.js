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
  assert(sw.indexOf('"start-sit-v1"') !== -1, "sw cache");
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
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
