const fs = require("fs");
const path = require("path");
const vm = require("vm");

const context = { console };
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, "mission.js"), "utf8") + "\nthis.ExportedMission = Mission;",
  context
);
const Mission = context.ExportedMission;

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function eq(a, b, message) {
  if (a !== b) throw new Error((message || "mismatch") + " expected " + b + " got " + a);
}

eq(Mission.countWeekdays("2026-09-21", "2026-09-28", 1), 2, "two Mondays");
eq(Mission.countWeekdays("2026-09-18", "2026-09-21", 1), 1, "Friday to Monday");
eq(Mission.countWeekdays("2026-09-18", "2026-09-20", 1), 0, "no Monday");
eq(Mission.countWeekdays("2026-09-18", "2026-09-18", 5), 1, "today Friday");
eq(Mission.cadenceRemaining(7, 10, 1, "weeks"), 10, "10 coffees / week");
eq(Mission.cadenceRemaining(21, 1, 3, "weeks"), 1, "haircut every 3 weeks");
eq(Mission.cadenceRemaining(365, 2, 1, "years"), 2, "two oil changes");
assert(Mission.daysInclusive("2026-09-18", "2026-09-24") === 7, "inclusive week");
eq(Mission.retireDateFromAge("1978-06-15", 65), "2043-06-15", "retire by age");
eq(Mission.ageOn("1978-06-15", "2026-09-18"), 48, "age now");

const summer = Mission.countSeasonOverlaps("2026-09-18", "2028-07-01", 6, 1, 8, 31);
eq(summer, 2, "summers 2027 and 2028");

const holidays = Mission.countSeasonOverlaps("2026-09-18", "2026-12-20", 11, 15, 12, 31);
eq(holidays, 1, "this holiday season");

assert(Mission.countPaychecks("2026-09-18", "2026-12-31") > 0, "paychecks exist");

const state = Mission.sampleState();
state.birth = "1978-06-15";
state.retireDate = "2043-06-15";
state.briefed = true;
const asOf = "2026-09-18";
let view = Mission.board(state, asOf);
assert(view.ready, "board ready after dates");
assert(view.mondays > 800, "big Mondays number, got " + view.mondays);
assert(view.rows.length >= 18, "active starter rows");
const mondaysRow = view.rows.find((row) => row.marker.id === "mondays");
eq(mondaysRow.remaining, view.mondays, "hero matches row");

Mission.upsertMarker(state, {
  id: "custom-fade",
  name: "Fade appointments",
  kind: "cadence",
  count: 1,
  per: 3,
  unit: "weeks",
  category: "custom",
  active: true,
});
view = Mission.board(state, asOf);
const fade = view.rows.find((row) => row.marker.id === "custom-fade");
assert(fade && fade.remaining > 0, "custom haircut cadence remains");

Mission.upsertGoal(state, {
  id: "g-401k",
  name: "401k runway",
  target: 100000,
  current: 80000,
  monthly: 2000,
  returnPct: 5,
});
view = Mission.board(state, asOf);
const goal = view.goals.find((row) => row.goal.id === "g-401k");
assert(goal, "401k goal on board");
assert(goal.projection.reachable, "401k projects a hit date");
assert(goal.earlier, "401k hits before official extraction");
const beforeMondays = view.mondays;
assert(Mission.applyEarlyRetire(state, goal.projection.hitDate), "early shift applied");
view = Mission.board(state, asOf);
assert(view.early, "early extraction flag");
assert(view.mondays < beforeMondays, "Mondays drop after early shift " + view.mondays + " vs " + beforeMondays);

const json = JSON.stringify(state);
const reloaded = Mission.normalizeState(JSON.parse(json));
eq(reloaded.goals[0].name, "401k runway", "reload keeps goal");
eq(reloaded.earlyRetireDate, state.earlyRetireDate, "reload keeps early date");
eq(reloaded.markers.find((row) => row.id === "custom-fade").name, "Fade appointments", "reload keeps custom");
eq(Mission.board(reloaded, asOf).mondays, view.mondays, "reload Mondays match");

assert(Mission.shareOmitsMoney(reloaded), "share omits $");
const payload = Mission.sharePayload(reloaded);
assert(!payload.goals, "share has no goals array");
assert(JSON.stringify(payload).indexOf("$") < 0, "share JSON has no $");
assert(!Object.prototype.hasOwnProperty.call(payload, "target"), "share has no target");
eq(payload.earlyLabel, "Early extraction", "share keeps early label");

const imported = Mission.normalizeState(payload);
eq(imported.goals.length, 0, "import does not invent balances");
assert(Mission.board(imported, asOf).mondays === view.mondays, "shared board Mondays match");

console.log("mission.test.js ok — Mondays " + view.mondays + " after early shift");
