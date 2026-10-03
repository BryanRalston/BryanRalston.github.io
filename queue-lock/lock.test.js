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
vm.runInContext(fs.readFileSync(path.join(__dirname, "lock.js"), "utf8"), context);
const QueueLock = context.QueueLock;

function assert(cond, message) {
  if (!cond) throw new Error(message || "assertion failed");
}

function eq(a, b, message) {
  if (a !== b) {
    throw new Error((message || "mismatch") + " expected " + JSON.stringify(b) + " got " + JSON.stringify(a));
  }
}

const NOW = Date.UTC(2026, 8, 29, 18, 0, 0);

eq(QueueLock.STORAGE_KEY, "queue-lock-v1", "storage key");
eq(QueueLock.STORAGE_BACKUP_KEY, "queue-lock-v1-corrupt", "corrupt backup key");
eq(QueueLock.LOCK_CAP, 24, "cap");
eq(QueueLock.formatCountdown(0), "00:00", "zero");
eq(QueueLock.formatCountdown(1000), "00:01", "one second");
eq(QueueLock.formatCountdown(15 * 60 * 1000), "15:00", "fifteen minutes");
eq(QueueLock.formatCountdown(60 * 60 * 1000), "01:00:00", "one hour");
eq(QueueLock.presetUnlock("5", NOW), NOW + 5 * 60 * 1000, "+5m");
eq(QueueLock.presetUnlock("15", NOW), NOW + 15 * 60 * 1000, "+15m");
eq(QueueLock.presetUnlock("30", NOW), NOW + 30 * 60 * 1000, "+30m");
eq(QueueLock.presetUnlock("60", NOW), NOW + 60 * 60 * 1000, "+60m");
eq(QueueLock.stampLines("locked").join(" "), "LOCKED FROM QUEUE", "locked stamp");
eq(QueueLock.phaseBadge("waited"), "Waited", "waited badge");
eq(QueueLock.phaseBadge("broke"), "Broke", "broke badge");
eq(QueueLock.reasonLabel("bad-call"), "Bad call", "reason label");

let threw = false;
try { QueueLock.presetUnlock("night", NOW); } catch (_) { threw = true; }
assert(threw, "bad preset throws");

const empty = QueueLock.normalizeState(null);
eq(empty.locks.length, 0, "null state");
eq(empty.filter, "all", "default filter");

let state = QueueLock.emptyState();
let added = QueueLock.addLock(state, { game: "  ", unlockAt: NOW + 1000 }, NOW);
eq(added.ok, false, "blank game");
eq(added.reason, "game", "game reason");
added = QueueLock.addLock(state, { game: "Ranked", unlockAt: "nope" }, NOW);
eq(added.reason, "unlock", "bad unlock");
added = QueueLock.addLock(state, {
  game: "Ranked",
  unlockAt: NOW + QueueLock.MAX_AHEAD_MS + 86400000,
}, NOW);
eq(added.reason, "far", "too far");

added = QueueLock.addLock(state, {
  game: "  Ranked \n — Control  ",
  reasons: ["just-salty", "lag", "lag", "nope"],
  note: " Walk it off. ",
  unlockAt: NOW + 15 * 60 * 1000,
}, NOW);
assert(added.ok, "lock");
state = added.state;
eq(state.locks[0].game, "Ranked — Control", "game clamped");
eq(state.locks[0].reasons.join(","), "lag,just-salty", "reasons ordered");
eq(state.locks[0].note, "Walk it off.", "note");
eq(state.locks[0].broke, false, "future stays locked");
eq(QueueLock.phase(state.locks[0], NOW), "locked", "phase locked");
eq(QueueLock.publicFace(state.locks[0], NOW).stamp, "LOCKED FROM QUEUE", "face stamp");
const gameId = state.locks[0].id;

const early = QueueLock.breakLock(state, gameId, NOW + 10);
assert(early.ok, "break early");
assert(!early.already, "first break");
state = early.state;
eq(QueueLock.phase(early.lock, NOW + 10), "broke", "early is broke");
eq(early.lock.brokeAt, NOW + 10, "break records when");
assert(early.lock.brokeAt < early.lock.unlockAt, "break is earlier than unlock");
eq(QueueLock.publicFace(early.lock, NOW + 10).badge, "Broke", "broke badge");
eq(QueueLock.breakLock(state, gameId, NOW + 11).already, true, "second break is quiet");

const undone = QueueLock.undoBreak(state, gameId, NOW + 12);
assert(undone.ok, "undo break");
state = undone.state;
eq(undone.lock.broke, false, "undo clears broke");
eq(QueueLock.phase(undone.lock, NOW + 12), "locked", "undo returns to locked");

const again = QueueLock.breakLock(state, gameId, NOW + 20);
state = again.state;
eq(QueueLock.undoBreak(state, gameId, again.lock.unlockAt).reason, "open", "undo after the clock refuses");

const other = QueueLock.addLock(state, {
  id: "short",
  game: "Arena",
  reasons: ["cheese"],
  unlockAt: NOW + 5 * 60 * 1000,
}, NOW + 30);
assert(other.ok, "second lock");
state = other.state;
const due = QueueLock.settleDue(state, NOW + 5 * 60 * 1000);
eq(due.opened.indexOf("short") !== -1, true, "short cool-down ends");
eq(due.opened.indexOf(gameId), -1, "broken lock is not waited");
eq(QueueLock.phase(due.state.locks.find((lock) => lock.id === "short"), NOW + 5 * 60 * 1000), "waited", "auto unlock is waited");
eq(due.state.locks.find((lock) => lock.id === "short").waitedAt, NOW + 5 * 60 * 1000, "waited uses unlock time");
eq(QueueLock.publicFace(due.state.locks.find((lock) => lock.id === "short"), NOW + 5 * 60 * 1000).badge, "Waited", "waited badge");
eq(QueueLock.settleDue(due.state, NOW + 5 * 60 * 1000).opened.length, 0, "settle once");
state = due.state;

const past = QueueLock.addLock(QueueLock.emptyState(), {
  game: "Already over",
  unlockAt: NOW - 1000,
}, NOW);
eq(past.lock.waitedAt, NOW - 1000, "a past unlock records the unlock time");
eq(past.lock.arrivedOpen, true, "a past unlock did not wait on this phone");
eq(QueueLock.phase(past.lock, NOW), "waited", "past opens as waited");
eq(past.lock.broke, false, "past is not a break");
eq(QueueLock.settleDue(past.state, NOW).opened.length, 0, "a past unlock does not toast later");

const starred = QueueLock.setStar(state, "short", true, NOW + 40);
assert(starred.ok, "star");
state = starred.state;
eq(QueueLock.visibleLocks(state, NOW + 40)[0].id, "short", "star sorts first");

const removed = QueueLock.removeLock(state, gameId);
assert(removed.ok, "remove");
state = removed.state;
const restored = QueueLock.restoreLock(state, removed.lock, removed.index);
assert(restored.ok, "undo remove");
state = restored.state;
eq(QueueLock.restoreLock(state, removed.lock, 0).reason, "exists", "no double restore");

const afterShort = NOW + 5 * 60 * 1000;
state = QueueLock.setFilter(state, "done");
assert(QueueLock.visibleLocks(state, afterShort).every((lock) => QueueLock.phase(lock, afterShort) !== "locked"), "done filter");
eq(QueueLock.visibleLocks(state, afterShort).length, 2, "both locks are done");
state = QueueLock.setFilter(state, "active");
eq(QueueLock.visibleLocks(state, afterShort).length, 0, "none active after the short one waited and the other broke");
state = QueueLock.setFilter(state, "nope");
eq(state.filter, "active", "bad filter ignored");
state = QueueLock.setFilter(state, "all");

let capped = QueueLock.emptyState();
for (let i = 0; i < QueueLock.LOCK_CAP; i += 1) {
  const next = QueueLock.addLock(capped, {
    id: "n" + i,
    game: "Game " + i,
    unlockAt: NOW + (i + 1) * 60 * 1000,
  }, NOW + i);
  assert(next.ok, "fill " + i);
  capped = next.state;
}
eq(QueueLock.addLock(capped, { game: "One more", unlockAt: NOW + 5000 }, NOW).reason, "cap", "cap blocks");
eq(QueueLock.loadSample(capped, NOW).reason, "cap", "sample blocked at cap");

const sample = QueueLock.loadSample(QueueLock.emptyState(), NOW);
assert(sample.ok, "sample");
assert(sample.lock.id, "sample id");
eq(sample.lock.game, "Ranked — Control", "sample game");
eq(sample.lock.note, "One more queue will not fix it.", "sample note");
eq(sample.lock.reasons.join(","), "bad-call,lag", "sample reasons");
eq(QueueLock.phase(sample.lock, NOW), "locked", "sample locked");
const sampleAgain = QueueLock.loadSample(sample.state, NOW + 1);
assert(sampleAgain.ok, "second sample");
assert(sampleAgain.lock.id !== sample.lock.id, "each sample has its own id");

const card = QueueLock.shareCard(state.locks.find((lock) => lock.id === gameId));
eq(card.k, "card", "card kind");
assert(card.e[0].broke === undefined, "share omits broke");
assert(card.e[0].brokeAt === undefined, "share omits brokeAt");
assert(card.e[0].waitedAt === undefined, "share omits waitedAt");
assert(card.e[0].starred === undefined, "share omits star");
const fromSender = QueueLock.parseShare(card);
eq(fromSender.locks[0].broke, false, "sender's broken lock arrives locked");
eq(QueueLock.phase(fromSender.locks[0], NOW + 40), "locked", "recipient follows unlock");
eq(QueueLock.publicFace(fromSender.locks[0], NOW + 40).stamp, "LOCKED FROM QUEUE", "recipient stamp");
eq(QueueLock.phase(fromSender.locks[0], fromSender.locks[0].unlockAt), "waited", "recipient opens when the clock hits");

const poisoned = QueueLock.parseShare({
  v: 1,
  k: "card",
  e: [{
    id: "early-share",
    game: "Ranked — Control",
    unlockAt: NOW + 15 * 60 * 1000,
    broke: true,
    brokeAt: NOW + 1000,
    waitedAt: NOW,
    starred: true,
  }],
});
eq(poisoned.locks[0].broke, false, "parse drops broke");
eq(poisoned.locks[0].brokeAt, 0, "parse drops brokeAt");
eq(poisoned.locks[0].waitedAt, 0, "parse drops waitedAt");
eq(poisoned.locks[0].starred, false, "parse drops star");
eq(QueueLock.phase(poisoned.locks[0], NOW + 1000), "locked", "poisoned share stays locked");
const keptEarly = QueueLock.keepShare(QueueLock.emptyState(), poisoned, "", NOW);
eq(keptEarly.state.locks[0].broke, false, "keep drops broke");
eq(keptEarly.state.locks[0].arrivedOpen, false, "future keep is not already open");

const vaultPacked = QueueLock.shareVault(state);
assert(vaultPacked.e.every((row) => row.broke === undefined && row.brokeAt === undefined), "vault share omits broke");
eq(QueueLock.parseShare(vaultPacked).locks.find((lock) => lock.id === gameId).broke, false, "vault link stays locked");

const mine = QueueLock.addLock(QueueLock.emptyState(), {
  game: "Mine",
  unlockAt: NOW + 1000,
}, NOW).state;
const kept = QueueLock.keepShare(mine, QueueLock.parseShare(vaultPacked), "", NOW);
assert(kept.ok, "keep adds");
eq(QueueLock.keepShare(kept.state, QueueLock.parseShare(card), "", NOW).reason, "exists", "duplicate card");

const extra = QueueLock.parseShare({
  v: 1,
  k: "card",
  e: [{ id: "new-lock", game: "New queue", unlockAt: NOW + 60000, created: NOW, updated: NOW }],
});
const refusedActive = QueueLock.keepShare(capped, extra, "", NOW);
eq(refusedActive.ok, false, "active shelf is not evicted");
eq(refusedActive.reason, "cap", "cap when nothing finished can go");
eq(refusedActive.state.locks.length, 24, "active shelf unchanged");
assert(refusedActive.state.locks.some((lock) => lock.id === "n0"), "oldest active stays");

const mixed = [];
for (let i = 0; i < 22; i += 1) {
  mixed.push({
    id: "f" + i,
    game: "Finished " + i,
    unlockAt: NOW - 60 * 1000,
    created: NOW + i,
    updated: NOW + i,
    waitedAt: NOW - 60 * 1000,
  });
}
mixed.push({
  id: "star-done",
  game: "Starred done",
  unlockAt: NOW - 60 * 1000,
  created: NOW - 50,
  updated: NOW,
  waitedAt: NOW - 60 * 1000,
  starred: true,
});
mixed.push({
  id: "still-locked",
  game: "Still locked",
  unlockAt: NOW + 60 * 60 * 1000,
  created: NOW - 80,
  updated: NOW,
  starred: true,
});
const mixedState = QueueLock.normalizeState({ v: 1, filter: "all", locks: mixed });
eq(mixedState.locks.length, 24, "mixed shelf is full");
const madeRoom = QueueLock.keepShare(mixedState, extra, "", NOW);
assert(madeRoom.ok, "keep at cap drops a finished lock");
eq(madeRoom.dropped.length, 1, "one eviction");
eq(madeRoom.dropped[0].lock.id, "f0", "oldest finished unstarred evicted");
eq(madeRoom.state.locks[0].id, "new-lock", "kept lock is first");
eq(madeRoom.state.locks.length, 24, "cap holds");
assert(!madeRoom.state.locks.some((lock) => lock.id === "f0"), "oldest finished is gone");
assert(madeRoom.state.locks.some((lock) => lock.id === "star-done"), "starred finished stays");
assert(madeRoom.state.locks.some((lock) => lock.id === "still-locked"), "active lock stays");

const protectedKeep = QueueLock.keepShare(mixedState, QueueLock.parseShare({
  v: 1,
  k: "card",
  e: [{ id: "newer", game: "Newer", unlockAt: NOW + 60000, created: NOW, updated: NOW }],
}), "f0", NOW);
eq(protectedKeep.dropped[0].lock.id, "f1", "open lock is not the first eviction");
assert(protectedKeep.state.locks.some((lock) => lock.id === "f0"), "open lock stays");

const onlyStarred = QueueLock.normalizeState({
  v: 1,
  filter: "all",
  locks: mixed.map((lock) => Object.assign({}, lock, { starred: true })),
});
eq(QueueLock.keepShare(onlyStarred, extra, "", NOW).reason, "cap", "starred shelf is not evicted");

const expiredShare = QueueLock.parseShare({
  v: 1,
  k: "card",
  e: [{ id: "already-open", game: "Old queue", unlockAt: NOW - 60000, created: NOW - 120000, updated: NOW - 120000 }],
});
const keptOld = QueueLock.keepShare(QueueLock.emptyState(), expiredShare, "", NOW);
assert(keptOld.ok, "keep an expired lock");
eq(keptOld.state.locks[0].waitedAt, NOW - 60000, "expired import is already waited");
eq(keptOld.state.locks[0].arrivedOpen, true, "expired import did not wait here");
eq(keptOld.state.locks[0].broke, false, "expired import is not a break");
eq(QueueLock.settleDue(keptOld.state, NOW + 1000).opened.length, 0, "expired import does not open again");
assert(QueueLock.shareCard(keptOld.state.locks[0]).e[0].arrivedOpen === undefined, "share omits arrivedOpen");

const corrupt = QueueLock.readStored("{not-json");
eq(corrupt.corrupt, true, "bad json is corrupt");
eq(corrupt.backup, "{not-json", "bad json is kept for backup");
eq(corrupt.state.locks.length, 0, "corrupt read starts empty");
const sound = QueueLock.readStored(JSON.stringify({ v: 1, filter: "active", locks: [] }));
eq(sound.corrupt, false, "valid json is not corrupt");
eq(sound.state.filter, "active", "valid json keeps the filter");
eq(QueueLock.readStored("").corrupt, false, "empty storage is not corrupt");

const cleared = QueueLock.clearLocks(state);
eq(cleared.locks.length, 0, "clear");
eq(cleared.filter, state.filter, "clear keeps filter");
const broughtBack = QueueLock.restoreAll(cleared, state.locks);
assert(broughtBack.ok, "restore all");
eq(broughtBack.state.locks.length, state.locks.length, "restored size");
eq(QueueLock.restoreAll(broughtBack.state, state.locks).reason, "exists", "restore all refuses a full shelf");

async function roundTrip() {
  const payload = QueueLock.shareVault(state);
  const token = await QueueLock.compressPayload(JSON.stringify(payload));
  assert(token.startsWith("z.") || token.startsWith("j."), "token prefix");
  assert(token.length < 8000, "token stays link-sized");
  const back = QueueLock.parseShare(JSON.parse(await QueueLock.decompressPayload(token)));
  eq(back.k, "vault", "decoded kind");
  eq(back.locks.find((lock) => lock.id === gameId).broke, false, "decoded stays locked");
  eq(back.locks.find((lock) => lock.id === gameId).game, "Ranked — Control", "decoded game");

  let bad = false;
  try { await QueueLock.decompressPayload("!!!"); } catch (_) { bad = true; }
  assert(bad, "bad token throws");

  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
  const sw = fs.readFileSync(path.join(__dirname, "sw.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "app.css"), "utf8");
  const icon = fs.readFileSync(path.join(__dirname, "icon.svg"), "utf8");
  const manifest = fs.readFileSync(path.join(__dirname, "manifest.webmanifest"), "utf8");
  assert(html.indexOf("<title>Queue Lock</title>") !== -1, "title");
  assert(html.indexOf("#q=") !== -1 && html.indexOf("?q=") !== -1, "hash and query documented");
  assert(html.indexOf(">queue-lock-v1<") !== -1, "storage key in the feature map");
  assert(html.indexOf("Feature Map") !== -1, "feature map");
  assert(html.indexOf("<details") !== -1, "feature map is details");
  assert(html.indexOf('class="feature-map" open') === -1, "feature map stays collapsed");
  assert(html.indexOf("Break the lock") !== -1, "break copy");
  assert(html.indexOf("Load a sample") !== -1, "sample button");
  assert(html.indexOf("Not a game launcher") !== -1, "honest footer");
  assert(html.indexOf("novalidate") !== -1, "form does not use native constraint traps");
  assert(html.indexOf("LOCKED FROM QUEUE") !== -1, "stamp is in the page");
  assert(html.indexOf("follows the unlock time") !== -1, "share follows unlock");
  assert(html.indexOf("does not travel") !== -1, "break does not travel");
  assert(html.indexOf("Lock stops when the shelf is full.") !== -1, "cap is up front");
  assert(app.indexOf('"#q="') !== -1 && app.indexOf('"q"') !== -1, "app reads hash and query");
  assert(app.indexOf("Already on this phone.") !== -1, "duplicate copy");
  assert(app.indexOf("A finished lock made room.") !== -1, "evict copy");
  assert(app.indexOf('"hashchange"') !== -1 && app.indexOf('"popstate"') !== -1, "later share navigation");
  const boot = app.slice(app.indexOf("async function boot"));
  assert(boot.indexOf("await pullShare()") !== -1 && boot.indexOf("await pullShare()") < boot.indexOf('addEventListener("hashchange"'), "listeners after first import");
  const openAddFn = app.slice(app.indexOf("function openAdd"), app.indexOf("function readDraft"));
  const capAt = openAddFn.indexOf("LOCK_CAP");
  const viewAt = openAddFn.indexOf('setView("form")');
  assert(capAt !== -1 && viewAt !== -1 && capAt < viewAt, "full shelf blocks the form");
  assert(sw.indexOf('const CACHE = "queue-lock-v3"') !== -1, "cache name");
  assert(sw.indexOf("url.pathname + url.search") !== -1, "versioned assets keep the query");
  assert(sw.indexOf("function networkFirst") !== -1, "html is network-first");
  assert(sw.indexOf("pathname") !== -1, "cache key is the pathname");
  assert(html.indexOf("queue-lock-v3") !== -1, "cache name in the feature map");
  assert(html.indexOf("The card is the screenshot") === -1, "screenshot line is gone");
  assert(html.indexOf("It is the screenshot") === -1, "feature map screenshot line is gone");
  assert(app.indexOf("This counts as a break.") !== -1, "active remove counts as a break");
  assert(app.indexOf("preserveUndo") !== -1, "automatic toast keeps an undo");
  assert(app.indexOf("Unlocked ") !== -1, "arrived-open copy");
  assert(app.indexOf("keepDraft") !== -1, "share keeps a half-filled draft");
  assert(app.indexOf("STORAGE_BACKUP_KEY") !== -1, "corrupt value is backed up");
  assert(app.indexOf("chosenUnlock") !== -1, "presets resolve when lock is pressed");
  const tickFn = app.slice(app.indexOf("function tick"), app.indexOf("function scheduleTick"));
  assert(tickFn.indexOf("preserveUndo") !== -1, "tick will not cover an undo toast");
  const pullFn = app.slice(app.indexOf("async function pullShare"), app.indexOf("function onShareNav"));
  assert(pullFn.indexOf('view === "form"') !== -1, "share on an open form stays put");
  assert(sw.indexOf("localStorage") === -1, "worker does not touch storage");
  assert(css.indexOf(".lock-card") !== -1, "lock card");
  assert(css.indexOf(".stamp-plate") !== -1, "stamp");
  assert(css.indexOf("overflow-x: hidden") !== -1, "no horizontal scroll");
  assert(icon.startsWith("<svg"), "icon is svg");
  assert(!/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(icon), "icon has no control bytes");
  assert(icon.indexOf("<script") === -1, "icon has no script");
  assert(manifest.indexOf("Queue Lock") !== -1, "manifest name");
  const manifestJson = JSON.parse(manifest);
  eq(manifestJson.start_url, "./", "start url");
  eq(manifestJson.display, "standalone", "standalone");
  console.log("queue-lock tests ok");
}

roundTrip().catch((err) => {
  console.error(err);
  process.exit(1);
});
