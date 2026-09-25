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
const TakeLock = context.TakeLock;

function assert(cond, message) {
  if (!cond) throw new Error(message || "assertion failed");
}

function eq(a, b, message) {
  if (a !== b) {
    throw new Error((message || "mismatch") + " expected " + JSON.stringify(b) + " got " + JSON.stringify(a));
  }
}

const NOW = Date.UTC(2026, 8, 25, 15, 0, 0);

eq(TakeLock.STORAGE_KEY, "take-lock-v1", "storage key");
eq(TakeLock.TAKE_CAP, 24, "cap");
eq(TakeLock.formatCountdown(0), "00:00", "zero");
eq(TakeLock.formatCountdown(-50), "00:00", "negative");
eq(TakeLock.formatCountdown(1), "00:01", "ceil a millisecond");
eq(TakeLock.formatCountdown(1000), "00:01", "one second");
eq(TakeLock.formatCountdown(59000), "00:59", "59 seconds");
eq(TakeLock.formatCountdown(60000), "01:00", "one minute");
eq(TakeLock.formatCountdown(3600000), "01:00:00", "one hour");
eq(TakeLock.formatCountdown(90061000), "1d 01:01:01", "day plus");

eq(TakeLock.presetUnlock("15", NOW), NOW + 15 * 60 * 1000, "15 min");
eq(TakeLock.presetUnlock("60", NOW), NOW + 60 * 60 * 1000, "1 hour");
eq(TakeLock.presetUnlock("now", NOW), NOW - 1000, "ready now");

const morning = new Date(2026, 8, 25, 9, 0, 0, 0).getTime();
const tonight = new Date(TakeLock.presetUnlock("tonight", morning));
eq(tonight.getHours(), 19, "tonight hour");
eq(tonight.getMinutes(), 0, "tonight minute");
eq(tonight.getDate(), 25, "tonight same day");
const late = new Date(2026, 8, 25, 19, 30, 0, 0).getTime();
const nextNight = new Date(TakeLock.presetUnlock("tonight", late));
eq(nextNight.getDate(), 26, "tonight rolls");
eq(nextNight.getHours(), 19, "rolled hour");
const tomorrow = new Date(TakeLock.presetUnlock("tomorrow", morning));
eq(tomorrow.getDate(), 26, "tomorrow date");
eq(tomorrow.getHours(), 13, "tomorrow hour");

let threw = false;
try { TakeLock.presetUnlock("nope", NOW); } catch (_) { threw = true; }
assert(threw, "bad preset throws");

const empty = TakeLock.normalizeState(null);
eq(empty.takes.length, 0, "null state");
eq(empty.filter, "all", "default filter");
eq(TakeLock.normalizeState({ takes: "nope" }).takes.length, 0, "bad takes");

let state = TakeLock.emptyState();
let added = TakeLock.addTake(state, { title: "   ", body: "A real take", unlockAt: NOW + 1000 }, NOW);
eq(added.ok, false, "blank title");
eq(added.reason, "title", "title reason");
added = TakeLock.addTake(state, { title: "City", body: "  ", unlockAt: NOW + 1000 }, NOW);
eq(added.reason, "body", "blank body");
added = TakeLock.addTake(state, { title: "City", body: "Take", unlockAt: "nope" }, NOW);
eq(added.reason, "unlock", "bad unlock");
added = TakeLock.addTake(state, { title: "City", body: "Take", unlockAt: NOW + TakeLock.MAX_AHEAD_MS + 86400000 }, NOW);
eq(added.reason, "far", "too far");

added = TakeLock.addTake(state, {
  title: "  City \n vs Coast  ",
  body: "The crowd\ncarries it.",
  tag: " Home ",
  unlockAt: NOW + 60 * 60 * 1000,
}, NOW);
assert(added.ok, "add city");
state = added.state;
eq(state.takes[0].title, "City vs Coast", "title clamped");
eq(state.takes[0].body, "The crowd carries it.", "body one line");
eq(state.takes[0].tag, "Home", "tag trim");
eq(state.takes[0].revealed, false, "starts sealed");
eq(TakeLock.phase(state.takes[0], NOW), "sealed", "future is sealed");
eq(TakeLock.publicFace(state.takes[0], NOW).body, "", "sealed face hides body");
const cityId = state.takes[0].id;

const past = TakeLock.addTake(state, {
  title: "Night game",
  body: "The visitor fades after the half.",
  tag: "Away",
  unlockAt: NOW - 5000,
}, NOW + 10);
assert(past.ok, "add past");
state = past.state;
eq(TakeLock.phase(state.takes[0], NOW + 10), "ready", "past is ready");
eq(TakeLock.publicFace(state.takes[0], NOW + 10).body, "", "ready hides body");
eq(TakeLock.revealTake(state, state.takes[0].id, NOW - 100000).reason, "locked", "early reveal blocked");
const revealed = TakeLock.revealTake(state, state.takes[0].id, NOW + 10);
assert(revealed.ok, "reveal");
state = revealed.state;
eq(TakeLock.phase(state.takes[0], NOW + 10), "exposed", "revealed is exposed");
eq(TakeLock.publicFace(state.takes[0], NOW + 10).body, "The visitor fades after the half.", "exposed body");
const nightId = state.takes[0].id;

const armed = TakeLock.exposeArmed(added.state, [cityId], NOW + 60 * 60 * 1000);
eq(armed.opened.length, 1, "watch cracks the seal");
eq(TakeLock.phase(armed.state.takes.find((take) => take.id === cityId), NOW + 60 * 60 * 1000), "exposed", "armed exposed");
eq(TakeLock.exposeArmed(added.state, [cityId], NOW + 1000).opened.length, 0, "early watch waits");

const edited = TakeLock.updateTake(state, cityId, {
  title: "City vs Coast",
  body: "Revised and still loud.",
  tag: "City",
  unlockAt: NOW + 2 * 60 * 60 * 1000,
}, NOW + 20);
assert(edited.ok, "edit");
state = edited.state;
eq(edited.take.id, cityId, "id stable");
eq(edited.take.created, NOW, "created kept");
eq(edited.take.revealed, false, "future edit reseals");
eq(TakeLock.phase(edited.take, NOW + 20), "sealed", "resealed phase");

const moved = TakeLock.updateTake(state, nightId, {
  title: "Night game",
  body: "The visitor fades after the half.",
  tag: "Away",
  unlockAt: NOW + 5 * 60 * 60 * 1000,
}, NOW + 30);
state = moved.state;
eq(moved.take.revealed, false, "exposed reseals when the clock moves");

const removed = TakeLock.removeTake(state, cityId);
assert(removed.ok, "remove");
state = removed.state;
eq(state.takes.some((take) => take.id === cityId), false, "gone");
const restored = TakeLock.restoreTake(state, removed.take, removed.index);
assert(restored.ok, "undo");
state = restored.state;
eq(state.takes.some((take) => take.id === cityId), true, "back");
eq(TakeLock.restoreTake(state, removed.take, 0).reason, "exists", "no double undo");

state = TakeLock.setFilter(state, "sealed");
const waiting = TakeLock.visibleTakes(state, NOW + 30);
assert(waiting.every((take) => TakeLock.phase(take, NOW + 30) !== "exposed"), "sealed filter");
state = TakeLock.setFilter(state, "exposed");
eq(TakeLock.visibleTakes(state, NOW + 30).length, 0, "none exposed after reseal");
state = TakeLock.setFilter(state, "nope");
eq(state.filter, "exposed", "bad filter ignored");
state = TakeLock.setFilter(state, "all");
const ordered = TakeLock.visibleTakes(state, NOW + 30);
eq(TakeLock.phase(ordered[0], NOW + 30), "sealed", "sealed sorts first");
eq(TakeLock.spotlight(state, NOW + 30).id, ordered[0].id, "spotlight");

let capped = TakeLock.emptyState();
for (let i = 0; i < TakeLock.TAKE_CAP; i += 1) {
  const next = TakeLock.addTake(capped, {
    title: "Game " + i,
    body: "Take " + i,
    unlockAt: NOW + i * 1000 + 1000,
  }, NOW + i);
  assert(next.ok, "fill " + i);
  capped = next.state;
}
eq(capped.takes.length, 24, "full");
eq(TakeLock.addTake(capped, { title: "One more", body: "Nope", unlockAt: NOW + 5000 }, NOW).reason, "cap", "cap blocks");

const card = TakeLock.shareCard(state.takes.find((take) => take.id === cityId));
eq(card.k, "card", "card kind");
eq(card.e.length, 1, "one card");
eq(TakeLock.parseShare(card).takes[0].title, "City vs Coast", "card title");
eq(TakeLock.parseShare({ k: "card", e: [{ title: "" }] }), null, "empty card dropped");
eq(TakeLock.parseShare({ k: "nope", e: [{ title: "A", body: "B", unlockAt: NOW }] }), null, "bad kind");
const two = TakeLock.parseShare({
  k: "card",
  e: [
    { id: "a", title: "First", body: "One", unlockAt: NOW + 1000 },
    { id: "b", title: "Second", body: "Two", unlockAt: NOW + 2000 },
  ],
});
eq(two.takes.length, 1, "card keeps one");
eq(two.takes[0].title, "First", "card keeps first");

const vault = TakeLock.shareVault(state);
eq(vault.k, "vault", "vault kind");
eq(vault.e.length, 2, "vault size");
const bare = TakeLock.shareCard({
  id: "x",
  title: "Bare",
  body: "Just the words.",
  tag: "",
  unlockAt: NOW + 1000,
  revealed: false,
  created: 5,
  updated: 5,
});
assert(!("tag" in bare.e[0]), "empty tag omitted");
assert(!("revealed" in bare.e[0]), "false revealed omitted");

const mine = TakeLock.addTake(TakeLock.emptyState(), {
  title: "Mine",
  body: "Local only.",
  unlockAt: NOW + 1000,
}, NOW).state;
const merged = TakeLock.mergeShare(mine, TakeLock.parseShare(vault));
eq(merged.added, 2, "merge adds");
eq(merged.state.takes.length, 3, "merge size");
const again = TakeLock.mergeShare(merged.state, TakeLock.parseShare(vault));
eq(again.added, 0, "merge skips ids");
eq(again.skipped, 2, "skipped both");
const replaced = TakeLock.replaceWithShare(mine, TakeLock.parseShare(vault));
eq(replaced.takes.length, 2, "replace drops mine");
eq(replaced.takes.some((take) => take.title === "Mine"), false, "mine gone");

const flagged = {
  id: "early",
  title: "Early",
  body: "Should stay hidden.",
  unlockAt: NOW + 60000,
  revealed: true,
  created: NOW,
  updated: NOW,
};
eq(TakeLock.phase(flagged, NOW), "sealed", "flag cannot open a future seal");
eq(TakeLock.publicFace(flagged, NOW).body, "", "future flag still hidden");

const reloaded = TakeLock.normalizeState(JSON.parse(JSON.stringify(state)));
eq(reloaded.takes.length, state.takes.length, "reload count");
eq(reloaded.filter, "all", "reload filter");
eq(reloaded.takes.find((take) => take.id === cityId).body, "Revised and still loud.", "reload body");

async function roundTrip() {
  const payload = TakeLock.shareVault(state);
  const token = await TakeLock.compressPayload(JSON.stringify(payload));
  assert(token.startsWith("z.") || token.startsWith("j."), "token prefix");
  assert(token.length < 8000, "token stays link-sized");
  const back = TakeLock.parseShare(JSON.parse(await TakeLock.decompressPayload(token)));
  eq(back.k, "vault", "decoded kind");
  eq(back.takes.map((take) => take.title).sort().join("|"), "City vs Coast|Night game", "decoded titles");
  eq(back.takes.find((take) => take.title === "City vs Coast").body, "Revised and still loud.", "decoded body");

  const manual = "j." + Buffer.from(JSON.stringify(card), "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  const fromJ = TakeLock.parseShare(JSON.parse(await TakeLock.decompressPayload(manual)));
  eq(fromJ.takes[0].title, "City vs Coast", "j. token");

  if (typeof CompressionStream !== "undefined") {
    const json = JSON.stringify(payload);
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("deflate"));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    const zipped = "z." + btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    eq(await TakeLock.decompressPayload(zipped), json, "z. token");
  }

  let bad = false;
  try { await TakeLock.decompressPayload("!!!"); } catch (_) { bad = true; }
  assert(bad, "bad token throws");

  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
  const sw = fs.readFileSync(path.join(__dirname, "sw.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "app.css"), "utf8");
  assert(html.indexOf("#t=") !== -1, "hash documented");
  assert(html.indexOf("take-lock-v1") !== -1, "storage name in page");
  assert(html.indexOf("take-lock-v2") !== -1, "cache name in page");
  assert(html.indexOf("tap Break the seal") !== -1, "seal hint matches the button");
  assert(html.indexOf("tap Reveal") === -1, "old reveal hint is gone");
  assert(html.indexOf(">Break the seal</strong>") !== -1, "feature map title");
  assert(html.indexOf(">Reveal</strong>") === -1, "old feature map title is gone");
  assert(html.indexOf("Feature Map") !== -1, "feature map");
  assert(html.indexOf("Not betting advice") !== -1, "honest footer");
  assert(html.indexOf("<details") !== -1, "feature map is details");
  assert(app.indexOf('"#t="') !== -1 && app.indexOf('"t"') !== -1, "app reads hash and query");
  assert(app.indexOf("take-lock-v1") === -1, "app uses the key from vault.js");
  assert(app.indexOf('"hashchange"') !== -1 && app.indexOf('"popstate"') !== -1, "later share navigation");
  const boot = app.slice(app.indexOf("async function boot"));
  assert(boot.indexOf("await pullShare()") !== -1 && boot.indexOf("await pullShare()") < boot.indexOf('addEventListener("hashchange"'), "listeners after first import");
  assert(sw.indexOf('const CACHE = "take-lock-v2"') !== -1, "cache name");
  assert(css.indexOf(".poster") !== -1, "share card styles");
  assert(css.indexOf(".stamp") !== -1, "seal stamp");
  console.log("take-lock tests ok");
}

roundTrip().catch((err) => {
  console.error(err);
  process.exit(1);
});
