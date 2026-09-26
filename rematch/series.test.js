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
vm.runInContext(fs.readFileSync(path.join(__dirname, "series.js"), "utf8"), context);
const Rematch = context.Rematch;

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function eq(a, b, message) {
  if (a !== b) {
    throw new Error((message || "mismatch") + " expected " + JSON.stringify(b) + " got " + JSON.stringify(a));
  }
}

eq(Rematch.STORAGE_KEY, "rematch-v1", "storage key");
eq(Rematch.SERIES_CAP, 24, "cap");
eq(Rematch.winsNeeded(3), 2, "best of 3");
eq(Rematch.winsNeeded(5), 3, "best of 5");
eq(Rematch.winsNeeded(7), 4, "best of 7");
eq(Rematch.winsNeeded(21), 11, "best of 21");
eq(Rematch.winsNeeded(1), 1, "best of 1");
eq(Rematch.normalizeBestOf(4), null, "even rejected");
eq(Rematch.normalizeBestOf(0), null, "zero rejected");
eq(Rematch.normalizeBestOf(23), null, "too big");
eq(Rematch.normalizeBestOf("5"), 5, "string five");
eq(Rematch.normalizeBestOf(""), null, "blank best of");

const empty = Rematch.normalizeState(null);
eq(empty.series.length, 0, "null state");
eq(empty.you, "You", "default you");
eq(empty.rival, "Rival", "default rival");
eq(Rematch.normalizeState({ series: "nope" }).series.length, 0, "bad series");

let state = Rematch.emptyState();
let started = Rematch.startSeries(state, { title: "   ", bestOf: 5 }, 1000);
eq(started.ok, false, "blank title");
eq(started.reason, "title", "title reason");

started = Rematch.startSeries(state, { title: "FIFA 25", bestOf: 4 }, 1000);
eq(started.ok, false, "even best of");
eq(started.reason, "bestOf", "best of reason");

state = Rematch.setNames(state, "  Alex  ", " Jordan ").state;
eq(state.you, "Alex", "you trimmed");
eq(state.rival, "Jordan", "rival trimmed");

started = Rematch.startSeries(state, {
  title: "  FIFA\n25  ",
  bestOf: 5,
  stakes: " Loser\nbuys wings ",
}, 2000);
assert(started.ok, "start fifa");
state = started.state;
eq(state.series[0].title, "FIFA 25", "title clamped");
eq(state.series[0].bestOf, 5, "best of 5");
eq(state.series[0].stakes, "Loser buys wings", "stakes one line");
eq(state.series[0].you, "Alex", "series you");
eq(state.series[0].rival, "Jordan", "series rival");
eq(state.activeId, state.series[0].id, "on the glass");
const fifaId = state.series[0].id;

let sum = Rematch.summary(state.series[0]);
eq(sum.status, "active", "open status");
eq(sum.headline, "Series open", "open headline");
eq(sum.youLeft, 3, "you need 3");
eq(sum.rivalLeft, 3, "they need 3");
eq(sum.detail, "First to 3 · Alex needs 3 · Jordan needs 3", "open detail");

function log(winner, note, at) {
  const result = Rematch.logGame(state, fifaId, winner, note, at);
  assert(result.ok, "log " + winner);
  state = result.state;
  return result.series;
}

log("you", "Early counter", 3000);
log("rival", "", 4000);
let mid = log("you", "OT\nnailbiter", 5000);
eq(mid.games[2].note, "OT nailbiter", "note one line");
sum = Rematch.summary(mid);
eq(sum.you, 2, "you 2");
eq(sum.rival, 1, "rival 1");
eq(sum.status, "active", "lead is active");
eq(sum.headline, "Alex leads", "lead headline");
eq(sum.youLeft, 1, "one to clinch");
eq(sum.rivalLeft, 2, "they need two");
eq(sum.clinched, false, "not clinched yet");

log("rival", "", 6000);
sum = Rematch.summary(state.series.find((series) => series.id === fifaId));
eq(sum.status, "tied", "tied mid series");
eq(sum.headline, "Tied", "tied headline");
eq(sum.detail, "First to 3 · Alex needs 1 · Jordan needs 1", "tied detail");

const clinch = log("you", "", 7000);
sum = Rematch.summary(clinch);
eq(sum.status, "you", "you clinched");
eq(sum.headline, "Alex clinched", "clinch headline");
eq(sum.you, 3, "final 3");
eq(sum.rival, 2, "final 2");
eq(sum.youLeft, 0, "nothing left for you");
eq(sum.detail, "Final · Best of 5", "final line");
eq(sum.clinched, true, "clinched flag");

const blocked = Rematch.logGame(state, fifaId, "rival", "too late", 8000);
eq(blocked.ok, false, "no games after clinch");
eq(blocked.reason, "clinched", "clinched reason");
eq(blocked.state.series[0].games.length, 5, "games unchanged");

const undone = Rematch.undoLastGame(state, fifaId);
assert(undone.ok, "undo clincher");
state = undone.state;
eq(Rematch.summary(undone.series).status, "tied", "back to tied");
eq(undone.series.games.length, 4, "four games");

const emptyUndo = Rematch.undoLastGame(
  Rematch.startSeries(Rematch.emptyState(), { title: "Pool", bestOf: 3 }, 1).state,
  "missing"
);
eq(emptyUndo.ok, false, "missing undo");

let rivalState = Rematch.startSeries(Rematch.emptyState(), { title: "Smash", bestOf: 3 }, 1).state;
const smashId = rivalState.series[0].id;
["rival", "you", "rival"].forEach(function (winner, index) {
  const result = Rematch.logGame(rivalState, smashId, winner, "", index + 2);
  assert(result.ok, "smash log");
  rivalState = result.state;
});
const smash = Rematch.summary(rivalState.series[0]);
eq(smash.status, "rival", "they clinched");
eq(smash.headline, "They clinched", "default they clinched");
eq(smash.you, 1, "smash you");
eq(smash.rival, 2, "smash rival");
eq(Rematch.logGame(rivalState, smashId, "you", "", 9).ok, false, "smash closed");

const best7 = Rematch.startSeries(Rematch.emptyState(), { title: "2K", bestOf: 7 }, 1).state;
eq(Rematch.summary(best7.series[0]).need, 4, "best of 7 first to 4");
eq(Rematch.summary(best7.series[0]).detail, "First to 4 · You need 4 · They need 4", "default need line");

const custom = Rematch.startSeries(Rematch.setNames(Rematch.emptyState(), "Sam", "Riley").state, {
  title: "Mario Kart",
  bestOf: 9,
}, 1).state;
eq(Rematch.summary(custom.series[0]).need, 5, "custom first to 5");
assert(Rematch.summary(custom.series[0]).detail.indexOf("Sam needs 5") !== -1, "custom you");
assert(Rematch.summary(custom.series[0]).detail.indexOf("Riley needs 5") !== -1, "custom rival");

const messy = Rematch.normalizeState({
  you: "Alex",
  rival: "Jordan",
  activeId: "keep",
  series: [{
    id: "keep",
    title: "Pool",
    bestOf: 3,
    you: "Alex",
    rival: "Jordan",
    games: [
      { winner: "you", note: "one", at: 1 },
      { winner: "you", note: "clincher", at: 2 },
      { winner: "rival", note: "should drop", at: 3 },
      { winner: "nope" },
    ],
  }],
});
eq(messy.series[0].games.length, 2, "stops at clinch");
eq(messy.series[0].games[1].note, "clincher", "kept clincher");
eq(Rematch.summary(messy.series[0]).status, "you", "normalized clinch");

state = Rematch.setNames(state, "Sam", "Riley").state;
const fifa = state.series.find((series) => series.id === fifaId);
eq(fifa.you, "Sam", "glass name follows");
eq(fifa.rival, "Riley", "glass rival follows");
eq(state.series[0].id, fifaId, "fifa still active before next start");
eq(state.you, "Sam", "house you updated");
eq(state.series.find((series) => series.id === state.activeId).you, "Sam", "active series renamed");

const second = Rematch.startSeries(state, { title: "Mario Kart", bestOf: 3, stakes: "" }, 9000);
assert(second.ok, "second series");
state = second.state;
eq(state.activeId, state.series[0].id, "new series on the glass");
eq(state.series[1].id, fifaId, "fifa shelved");
eq(state.series[1].you, "Sam", "fifa was still active when names changed");

const named = Rematch.setNames(state, "Alex", "Jordan").state;
eq(named.series[0].you, "Alex", "active renamed");
eq(named.series[1].you, "Sam", "shelved name frozen");
state = named;

let packed = state;
for (let n = state.series.length; n < Rematch.SERIES_CAP; n += 1) {
  const added = Rematch.startSeries(packed, { title: "Game " + n, bestOf: 3 }, n);
  assert(added.ok, "fill " + n);
  packed = added.state;
}
eq(packed.series.length, 24, "at the cap");
const overflow = Rematch.startSeries(packed, { title: "One more", bestOf: 3 }, 99);
eq(overflow.ok, false, "cap blocks start");
eq(overflow.reason, "cap", "cap reason");

const removed = Rematch.removeSeries(state, fifaId);
assert(removed.ok, "remove fifa");
eq(removed.wasActive, false, "fifa was not active");
eq(removed.index, 1, "fifa index");
const putBack = Rematch.restoreSeries(removed.state, removed.removed, removed.index, removed.wasActive);
assert(putBack.ok, "undo remove");
eq(putBack.state.series[1].id, fifaId, "restored index");
eq(putBack.state.activeId, state.activeId, "active untouched");
eq(Rematch.summary(putBack.state.series[1]).you, 2, "restored score");

const cleared = Rematch.clearSeries(state);
eq(cleared.state.series.length, 0, "cleared");
eq(cleared.state.activeId, "", "glass empty");
eq(cleared.state.you, "Alex", "names survive clear");
eq(cleared.state.rival, "Jordan", "rival survives clear");
const restoredAll = Rematch.restoreAll(cleared.state, cleared.previous, cleared.activeId);
eq(restoredAll.state.series.length, state.series.length, "undo clear count");
eq(restoredAll.state.activeId, state.activeId, "undo clear active");
eq(restoredAll.state.series.some((series) => series.id === fifaId), true, "fifa returned");

const reloaded = Rematch.normalizeState(JSON.parse(JSON.stringify(state)));
eq(reloaded.activeId, state.activeId, "reload active");
eq(reloaded.you, "Alex", "reload you");
const reloadedFifa = reloaded.series.find((series) => series.id === fifaId);
eq(reloadedFifa.games.length, 4, "reload games");
eq(reloadedFifa.stakes, "Loser buys wings", "reload stakes");
eq(reloadedFifa.games[2].note, "OT nailbiter", "reload note");

const sample = Rematch.loadSample(Rematch.emptyState(), 10000);
assert(sample.ok, "sample");
eq(sample.series.title, "FIFA 25", "sample title");
eq(sample.series.stakes, "Loser buys wings", "sample stakes");
eq(sample.series.games[2].note, "OT nailbiter", "sample note");
const sampleSum = Rematch.summary(sample.series);
eq(sampleSum.you, 2, "sample 2");
eq(sampleSum.rival, 1, "sample 1");
eq(sampleSum.headline, "You lead", "sample lead");
eq(sampleSum.detail, "First to 3 · You need 1 · They need 2", "sample remain");
const again = Rematch.loadSample(sample.state, 11000);
eq(again.already, true, "sample once");
eq(again.state.series.length, 1, "sample not duplicated");

const payload = Rematch.shareSeries(reloadedFifa);
eq(payload.k, "series", "share kind");
eq(payload.s.bo, 5, "share best of");
eq(payload.s.g.length, 4, "share games");
eq(payload.s.g[2].n, "OT nailbiter", "share note");
eq(payload.s.g[0].w, "y", "share you win");
const parsed = Rematch.parseShare(payload);
eq(parsed.series.title, "FIFA 25", "parsed title");
eq(Rematch.summary(parsed.series).status, "tied", "parsed still tied");

const kept = Rematch.keepShare(Rematch.emptyState(), parsed);
assert(kept.ok, "keep");
eq(kept.becameActive, true, "keep takes the glass");
eq(kept.state.you, "Sam", "keep adopts you");
eq(kept.state.series[0].id, fifaId, "keep id");

const house = Rematch.startSeries(
  Rematch.setNames(Rematch.emptyState(), "You", "Rival").state,
  { title: "Pool", bestOf: 1 },
  1
).state;
const beside = Rematch.keepShare(house, parsed);
assert(beside.ok, "keep beside a live series");
eq(beside.becameActive, false, "live series stays");
eq(beside.state.activeId, house.activeId, "glass unchanged");
eq(beside.state.series[0].id, fifaId, "kept at the front of history");
const duplicate = Rematch.keepShare(beside.state, parsed);
eq(duplicate.ok, false, "duplicate keep");
eq(duplicate.reason, "exists", "exists reason");

let full = packed;
const extraShare = Rematch.parseShare(Rematch.shareSeries(reloadedFifa));
const madeRoom = Rematch.keepShare(full, {
  v: 1,
  k: "series",
  series: {
    id: "incoming-room",
    title: "Incoming",
    bestOf: 3,
    you: "Ace",
    rival: "Bay",
    games: [],
    created: 1,
    updated: 1,
  },
});
assert(madeRoom.ok, "keep at cap");
eq(madeRoom.state.series.length, 24, "still 24");
assert(madeRoom.dropped, "dropped oldest");
eq(madeRoom.state.series[0].id, "incoming-room", "incoming kept");
eq(madeRoom.becameActive, false, "cap keep leaves the glass");

async function roundTrip() {
  const token = await Rematch.compressPayload(JSON.stringify(payload));
  assert(token.startsWith("z.") || token.startsWith("j."), "token prefix");
  assert(token.length < 4000, "token stays link-sized");
  const back = Rematch.parseShare(JSON.parse(await Rematch.decompressPayload(token)));
  eq(back.k, "series", "decoded kind");
  eq(back.series.title, "FIFA 25", "decoded title");
  eq(back.series.games[2].note, "OT nailbiter", "decoded note");
  eq(Rematch.summary(back.series).you + "-" + Rematch.summary(back.series).rival, "2-2", "decoded score");

  const manual = "j." + Buffer.from(JSON.stringify(payload), "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  const fromJ = Rematch.parseShare(JSON.parse(await Rematch.decompressPayload(manual)));
  eq(fromJ.series.stakes, "Loser buys wings", "j. token");

  if (typeof CompressionStream !== "undefined") {
    const json = JSON.stringify(payload);
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("deflate"));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    const zipped = "z." + btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    eq(await Rematch.decompressPayload(zipped), json, "z. token");
  }

  let threw = false;
  try {
    await Rematch.decompressPayload("!!!");
  } catch (_) {
    threw = true;
  }
  assert(threw, "bad token throws");

  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
  const sw = fs.readFileSync(path.join(__dirname, "sw.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "app.css"), "utf8");
  assert(html.indexOf("#r=") !== -1, "hash documented");
  assert(html.indexOf("?r=") !== -1, "query documented");
  assert(html.indexOf("rematch-v1") !== -1, "storage name in page");
  assert(html.indexOf("Feature Map") !== -1, "feature map");
  assert(html.indexOf("<details") !== -1, "feature map collapsed");
  assert(app.indexOf('"#r="') !== -1 && app.indexOf('"r"') !== -1, "app reads hash and query");
  assert(app.indexOf("rematch-v1") === -1, "app uses the key from series.js");
  assert(sw.indexOf('const CACHE = "rematch-v1"') !== -1, "cache name");
  assert(sw.indexOf("./series.js") !== -1, "series module cached");
  assert(css.indexOf(".num") !== -1, "scoreboard styles");
  console.log("rematch tests ok");
}

roundTrip().catch((err) => {
  console.error(err);
  process.exit(1);
});
