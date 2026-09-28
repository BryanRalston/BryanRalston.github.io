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
vm.runInContext(fs.readFileSync(path.join(__dirname, "vault.js"), "utf8"), context);
const SpoilerSeal = context.SpoilerSeal;

function assert(cond, message) {
  if (!cond) throw new Error(message || "assertion failed");
}

function eq(a, b, message) {
  if (a !== b) {
    throw new Error((message || "mismatch") + " expected " + JSON.stringify(b) + " got " + JSON.stringify(a));
  }
}

const NOW = Date.UTC(2026, 8, 28, 18, 0, 0);

eq(SpoilerSeal.STORAGE_KEY, "spoiler-seal-v1", "storage key");
eq(SpoilerSeal.SEAL_CAP, 24, "cap");
eq(SpoilerSeal.formatCountdown(0), "00:00", "zero");
eq(SpoilerSeal.formatCountdown(1000), "00:01", "one second");
eq(SpoilerSeal.formatCountdown(3 * 60 * 60 * 1000), "03:00:00", "three hours");
eq(SpoilerSeal.presetUnlock("1h", NOW), NOW + 60 * 60 * 1000, "+1h");
eq(SpoilerSeal.presetUnlock("3h", NOW), NOW + 3 * 60 * 60 * 1000, "+3h");

const evening = new Date(2026, 8, 28, 18, 0, 0, 0).getTime();
const night = new Date(SpoilerSeal.presetUnlock("night", evening));
eq(night.getHours(), 23, "night hour");
eq(night.getMinutes(), 59, "night minute");
eq(night.getDate(), 28, "night same day");
const late = new Date(2026, 8, 28, 23, 59, 0, 0).getTime();
const nextNight = new Date(SpoilerSeal.presetUnlock("night", late));
eq(nextNight.getDate(), 29, "night rolls");
eq(nextNight.getHours(), 23, "rolled hour");

let threw = false;
try { SpoilerSeal.presetUnlock("15", NOW); } catch (_) { threw = true; }
assert(threw, "bad preset throws");

const empty = SpoilerSeal.normalizeState(null);
eq(empty.seals.length, 0, "null state");
eq(empty.filter, "all", "default filter");

let state = SpoilerSeal.emptyState();
let added = SpoilerSeal.addSeal(state, { title: "  ", result: "27-24", unlockAt: NOW + 1000 }, NOW);
eq(added.ok, false, "blank title");
eq(added.reason, "title", "title reason");
added = SpoilerSeal.addSeal(state, { title: "Chiefs @ Bills", unlockAt: "nope" }, NOW);
eq(added.reason, "unlock", "bad unlock");
added = SpoilerSeal.addSeal(state, {
  title: "Chiefs @ Bills",
  result: "Bills 31, Chiefs 24",
  unlockAt: NOW + SpoilerSeal.MAX_AHEAD_MS + 86400000,
}, NOW);
eq(added.reason, "far", "too far");

added = SpoilerSeal.addSeal(state, {
  title: "  Chiefs \n @ Bills  ",
  tag: " NFL ",
  note: " Sealed until after the 4th. ",
  result: " Bills 31, Chiefs 24 ",
  unlockAt: NOW + 3 * 60 * 60 * 1000,
}, NOW);
assert(added.ok, "result optional fields still seal");
state = added.state;
eq(state.seals[0].title, "Chiefs @ Bills", "title clamped");
eq(state.seals[0].tag, "NFL", "tag");
eq(state.seals[0].note, "Sealed until after the 4th.", "note");
eq(state.seals[0].result, "Bills 31, Chiefs 24", "result stored");
eq(state.seals[0].cracked, false, "future stays shut");
eq(SpoilerSeal.phase(state.seals[0], NOW), "sealed", "phase sealed");
eq(SpoilerSeal.publicFace(state.seals[0], NOW).result, "", "sealed face hides result");
const gameId = state.seals[0].id;

const blank = SpoilerSeal.addSeal(state, {
  title: "The finale",
  tag: "TV",
  unlockAt: NOW + 60 * 60 * 1000,
}, NOW + 5);
assert(blank.ok, "result can be empty");
state = blank.state;
eq(state.seals[0].result, "", "blank result");
const showId = state.seals[0].id;

const early = SpoilerSeal.breakSeal(state, gameId, NOW + 10);
assert(early.ok, "break early");
assert(!early.already, "first break");
state = early.state;
eq(SpoilerSeal.phase(state.seals.find((seal) => seal.id === gameId), NOW + 10), "cracked", "early is cracked");
eq(SpoilerSeal.publicFace(state.seals.find((seal) => seal.id === gameId), NOW + 10).result, "Bills 31, Chiefs 24", "early reveals result");
eq(SpoilerSeal.breakSeal(state, gameId, NOW + 11).already, true, "second break is quiet");

const resealed = SpoilerSeal.updateSeal(state, gameId, {
  title: "Chiefs @ Bills",
  tag: "NFL",
  note: "Sealed until after the 4th.",
  result: "Bills 31, Chiefs 24",
  unlockAt: NOW + 3 * 60 * 60 * 1000,
}, NOW + 20);
assert(resealed.ok, "edit");
state = resealed.state;
eq(resealed.seal.cracked, false, "future edit reseals");
eq(SpoilerSeal.phase(resealed.seal, NOW + 20), "sealed", "resealed phase");
eq(SpoilerSeal.publicFace(resealed.seal, NOW + 20).result, "", "reseal hides result");

const starred = SpoilerSeal.setStar(state, showId, true, NOW + 30);
assert(starred.ok, "star");
state = starred.state;
eq(starred.seal.starred, true, "starred flag");
const ordered = SpoilerSeal.visibleSeals(state, NOW + 30);
eq(ordered[0].id, showId, "star sorts first");

const due = SpoilerSeal.crackDue(state, NOW + 2 * 60 * 60 * 1000);
eq(due.opened.indexOf(showId) !== -1, true, "show unlocks at one hour");
eq(due.opened.indexOf(gameId), -1, "game still sealed at two hours");
eq(SpoilerSeal.publicFace(due.state.seals.find((seal) => seal.id === showId), NOW + 2 * 60 * 60 * 1000).awaiting, true, "blank result is ready for notes");
const later = SpoilerSeal.crackDue(due.state, NOW + 3 * 60 * 60 * 1000);
eq(later.opened.indexOf(gameId) !== -1, true, "game auto-cracks");
eq(SpoilerSeal.publicFace(later.state.seals.find((seal) => seal.id === gameId), NOW + 3 * 60 * 60 * 1000).result, "Bills 31, Chiefs 24", "auto-crack reveals");

const removed = SpoilerSeal.removeSeal(state, gameId);
assert(removed.ok, "remove");
state = removed.state;
const restored = SpoilerSeal.restoreSeal(state, removed.seal, removed.index);
assert(restored.ok, "undo remove");
state = restored.state;
eq(SpoilerSeal.restoreSeal(state, removed.seal, 0).reason, "exists", "no double restore");

state = SpoilerSeal.setFilter(state, "cracked");
eq(SpoilerSeal.visibleSeals(state, NOW + 30).length, 0, "none cracked while future");
state = SpoilerSeal.setFilter(state, "sealed");
assert(SpoilerSeal.visibleSeals(state, NOW + 30).every((seal) => SpoilerSeal.phase(seal, NOW + 30) === "sealed"), "sealed filter");
state = SpoilerSeal.setFilter(state, "nope");
eq(state.filter, "sealed", "bad filter ignored");
state = SpoilerSeal.setFilter(state, "all");

let capped = SpoilerSeal.emptyState();
for (let i = 0; i < SpoilerSeal.SEAL_CAP; i += 1) {
  const next = SpoilerSeal.addSeal(capped, {
    title: "Episode " + i,
    unlockAt: NOW + i * 1000 + 1000,
  }, NOW + i);
  assert(next.ok, "fill " + i);
  capped = next.state;
}
eq(SpoilerSeal.addSeal(capped, { title: "One more", unlockAt: NOW + 5000 }, NOW).reason, "cap", "cap blocks");

const sample = SpoilerSeal.loadSample(SpoilerSeal.emptyState(), NOW);
assert(sample.ok, "sample");
eq(sample.seal.id, SpoilerSeal.SAMPLE_ID, "sample id");
eq(sample.seal.title, "Chiefs @ Bills", "sample title");
eq(sample.seal.note, "Sealed until after the 4th.", "sample note");
eq(SpoilerSeal.publicFace(sample.seal, NOW).result, "", "sample result hidden");
eq(SpoilerSeal.loadSample(sample.state, NOW).reason, "exists", "sample once");

const card = SpoilerSeal.shareCard(state.seals.find((seal) => seal.id === gameId));
eq(card.k, "card", "card kind");
eq(card.e[0].result, "Bills 31, Chiefs 24", "link carries the result");
eq(SpoilerSeal.parseShare(card).seals[0].title, "Chiefs @ Bills", "card title");
eq(SpoilerSeal.parseShare({ k: "nope", e: [{ title: "A", unlockAt: NOW }] }), null, "bad kind");
const vault = SpoilerSeal.shareVault(state);
eq(vault.k, "vault", "vault kind");
const mine = SpoilerSeal.addSeal(SpoilerSeal.emptyState(), {
  title: "Mine",
  unlockAt: NOW + 1000,
}, NOW).state;
const kept = SpoilerSeal.keepShare(mine, SpoilerSeal.parseShare(vault));
assert(kept.ok, "keep adds");
eq(kept.state.seals.length, 3, "keep size");
eq(SpoilerSeal.keepShare(kept.state, SpoilerSeal.parseShare(card)).reason, "exists", "duplicate card");
eq(SpoilerSeal.keepShare(capped, SpoilerSeal.parseShare(card)).reason, "cap", "full vault refuses a new card");

const cleared = SpoilerSeal.clearSeals(state);
eq(cleared.seals.length, 0, "clear");
eq(cleared.filter, state.filter, "clear keeps filter");

async function roundTrip() {
  const payload = SpoilerSeal.shareVault(state);
  const token = await SpoilerSeal.compressPayload(JSON.stringify(payload));
  assert(token.startsWith("z.") || token.startsWith("j."), "token prefix");
  assert(token.length < 8000, "token stays link-sized");
  const back = SpoilerSeal.parseShare(JSON.parse(await SpoilerSeal.decompressPayload(token)));
  eq(back.k, "vault", "decoded kind");
  eq(back.seals.find((seal) => seal.id === gameId).result, "Bills 31, Chiefs 24", "decoded result");

  let bad = false;
  try { await SpoilerSeal.decompressPayload("!!!"); } catch (_) { bad = true; }
  assert(bad, "bad token throws");

  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
  const sw = fs.readFileSync(path.join(__dirname, "sw.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "app.css"), "utf8");
  const icon = fs.readFileSync(path.join(__dirname, "icon.svg"), "utf8");
  assert(html.indexOf("<title>Spoiler Seal</title>") !== -1, "title");
  assert(html.indexOf("#v=") !== -1 && html.indexOf("?v=") !== -1, "hash and query documented");
  assert(html.indexOf("spoiler-seal-v1") !== -1, "storage name in page");
  assert(html.indexOf("Feature Map") !== -1, "feature map");
  assert(html.indexOf("<details") !== -1, "feature map is details");
  assert(html.indexOf("Break the seal") !== -1, "break copy");
  assert(html.indexOf("Not affiliated") !== -1, "honest footer");
  assert(html.indexOf("aria-live=\"assertive\"") !== -1, "seal announce");
  assert(html.indexOf("Load a sample") !== -1, "sample button");
  assert(html.indexOf("novalidate") !== -1, "form does not use native constraint traps");
  assert(app.indexOf('"#v="') !== -1 && app.indexOf('"v"') !== -1, "app reads hash and query");
  assert(app.indexOf("Already on this phone.") !== -1, "duplicate copy");
  assert(app.indexOf("Ready for your notes.") !== -1, "blank result copy");
  assert(app.indexOf('"hashchange"') !== -1 && app.indexOf('"popstate"') !== -1, "later share navigation");
  const boot = app.slice(app.indexOf("async function boot"));
  assert(boot.indexOf("await pullShare()") !== -1 && boot.indexOf("await pullShare()") < boot.indexOf('addEventListener("hashchange"'), "listeners after first import");
  assert(sw.indexOf('const CACHE = "spoiler-seal-v1"') !== -1, "cache name");
  assert(css.indexOf(".vault-card") !== -1, "vault card");
  assert(css.indexOf(".wax") !== -1, "sealed stamp");
  assert(icon.startsWith("<svg"), "icon is svg");
  assert(!/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(icon), "icon has no control bytes");
  assert(icon.indexOf("<script") === -1, "icon has no script");
  console.log("spoiler-seal tests ok");
}

roundTrip().catch((err) => {
  console.error(err);
  process.exit(1);
});
