const fs = require("fs");
const path = require("path");
const vm = require("vm");

const context = { console, crypto };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "round.js"), "utf8"), context);
const WhosRound = context.WhosRound;

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function eq(a, b, message) {
  if (a !== b) {
    throw new Error((message || "mismatch") + " expected " + JSON.stringify(b) + " got " + JSON.stringify(a));
  }
}

eq(WhosRound.STORAGE_KEY, "whos-round-v1", "storage key");
eq(WhosRound.HISTORY_CAP, 12, "history cap constant");
eq(WhosRound.PEOPLE_MIN, 2, "people min");

const empty = WhosRound.emptyState();
eq(empty.people.length, 0, "empty people");
eq(WhosRound.canTrack(empty), false, "cannot track empty");
eq(WhosRound.findDuePerson(empty.people), null, "no due when empty");

let state = WhosRound.sampleGroup();
eq(state.groupName, "Coffee", "sample group name");
eq(state.people.length, 3, "sample size");
eq(WhosRound.canTrack(state), true, "sample can track");

const dueBefore = WhosRound.findDuePerson(state.people);
assert(dueBefore, "due exists");
eq(dueBefore.name, "Alex", "alphabetical tie-break when nobody bought");

const t1 = 1_700_000_000_000;
const boughtAlex = WhosRound.recordBought(state, dueBefore.id, t1);
assert(boughtAlex.ok, "bought alex ok");
state = boughtAlex.state;
eq(state.history.length, 1, "history after first buy");
eq(state.history[0].personName, "Alex", "history name");

const dueAfterAlex = WhosRound.findDuePerson(state.people);
eq(dueAfterAlex.name, "Jordan", "next due after Alex bought (Jordan before Sam alpha)");

const boughtJordan = WhosRound.recordBought(state, dueAfterAlex.id, t1 + 1000);
assert(boughtJordan.ok, "bought jordan ok");
state = boughtJordan.state;

const dueAfterTwo = WhosRound.findDuePerson(state.people);
eq(dueAfterTwo.name, "Sam", "Sam due after Alex and Jordan bought");

const boughtSam = WhosRound.recordBought(state, dueAfterTwo.id, t1 + 2000);
state = boughtSam.state;
const dueCycle = WhosRound.findDuePerson(state.people);
eq(dueCycle.name, "Alex", "Alex due again after full cycle");

for (let i = 0; i < 15; i++) {
  const due = WhosRound.findDuePerson(state.people);
  const result = WhosRound.recordBought(state, due.id, t1 + 3000 + i * 1000);
  assert(result.ok, "buy " + i);
  state = result.state;
}
eq(state.history.length, 12, "history capped at 12");

const beforeUndo = state.history[0];
const undone = WhosRound.undoLastBought(state);
assert(undone.ok, "undo ok");
state = undone.state;
eq(state.history.length, 11, "history after undo");
eq(undone.undone.id, beforeUndo.id, "undone matches last");

const person = state.people.find((row) => row.id === beforeUndo.personId);
assert(person, "person still exists");
const prior = state.history.find((row) => row.personId === person.id);
eq(person.lastBoughtAt, prior ? prior.at : 0, "lastBoughtAt restored from prior history");

const renamed = WhosRound.renamePerson(state, state.people[0].id, "Alexandra");
assert(renamed.ok, "rename ok");
state = renamed.state;
eq(
  state.people.some((row) => row.name === "Alexandra"),
  true,
  "rename applied"
);

const added = WhosRound.addPerson(state, "Riley");
assert(added.ok, "add ok");
state = added.state;
eq(state.people.length, 4, "four people");

const dup = WhosRound.addPerson(state, "riley");
eq(dup.ok, false, "dup rejected");
eq(dup.reason, "dup", "dup reason");

const removed = WhosRound.removePerson(state, state.people.find((row) => row.name === "Riley").id);
assert(removed.ok, "remove ok");
state = removed.state;
eq(state.people.length, 3, "back to three");

state = WhosRound.setGroupName(state, "Drinks");
eq(state.groupName, "Drinks", "group name");

const payload = WhosRound.sharePayload(state);
const roundTrip = WhosRound.parseSharePayload(payload);
assert(roundTrip, "parse share");
eq(roundTrip.groupName, "Drinks", "share group");
eq(roundTrip.people.length, state.people.length, "share people count");
eq(
  roundTrip.people.map((p) => p.name).sort().join(","),
  state.people.map((p) => p.name).sort().join(","),
  "share names"
);
eq(roundTrip.history.length, state.history.length, "share history");

const dueShared = WhosRound.findDuePerson(roundTrip.people);
const dueLocal = WhosRound.findDuePerson(state.people);
eq(dueShared.name, dueLocal.name, "share preserves due");

eq(WhosRound.parseSharePayload({ v: 1, people: [{ name: "Only" }] }), null, "reject under min");
eq(WhosRound.parseSharePayload(null), null, "reject null");

const clearedHistory = WhosRound.clearHistory(state);
eq(clearedHistory.history.length, 0, "clear history");
assert(
  clearedHistory.people.every((person) => person.lastBoughtAt === 0),
  "clear resets timestamps"
);

const cleared = WhosRound.clearGroup(state);
eq(cleared.people.length, 0, "clear group");
eq(cleared.groupName, "", "clear group name");

const tieState = WhosRound.normalizeState({
  v: 1,
  groupName: "Lunch",
  people: [
    { id: "b", name: "Sam", lastBoughtAt: 10 },
    { id: "a", name: "Alex", lastBoughtAt: 10 },
    { id: "c", name: "Jordan", lastBoughtAt: 50 },
  ],
  history: [],
});
eq(WhosRound.findDuePerson(tieState.people).name, "Alex", "same timestamp ties break alpha");

const neverBought = WhosRound.normalizeState({
  v: 1,
  people: [
    { id: "1", name: "Zoe", lastBoughtAt: 0 },
    { id: "2", name: "Ann", lastBoughtAt: 99 },
  ],
});
eq(WhosRound.findDuePerson(neverBought.people).name, "Zoe", "never-bought beats recent");

console.log("whos-round tests ok");
