const fs = require("fs");
const path = require("path");
const vm = require("vm");

const context = { console, crypto };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "meter.js"), "utf8"), context);
const LeaveBy = context.LeaveBy;

function assert(cond, message) {
  if (!cond) throw new Error(message || "assertion failed");
}

function eq(a, b, message) {
  if (a !== b) {
    throw new Error((message || "mismatch") + " expected " + JSON.stringify(b) + " got " + JSON.stringify(a));
  }
}

eq(LeaveBy.STORAGE_KEY, "leave-by-v1", "storage key");
eq(LeaveBy.HISTORY_CAP, 12, "history cap");
eq(LeaveBy.EXTEND_MIN, 15, "extend step");
eq(LeaveBy.CHIPS.join(","), "15,30,45,60,90,120", "chips");
eq(LeaveBy.NOTE_MAX, 80, "note max");
eq(LeaveBy.MAX_AHEAD_MIN, 960, "16 hour cap");

eq(LeaveBy.parsePaid("").paid, null, "blank paid");
eq(LeaveBy.parsePaid("2.50").paid, 2.5, "paid dollars");
eq(LeaveBy.parsePaid("$1,234.50").ok, false, "paid over cap rejected");
eq(LeaveBy.parsePaid("$2.50").paid, 2.5, "dollar sign");
eq(LeaveBy.parsePaid("nope").ok, false, "junk paid");
eq(LeaveBy.parsePaid("-1").ok, false, "negative paid");
eq(LeaveBy.parsePaid("0").paid, 0, "zero paid");
eq(LeaveBy.formatPaid(2.5), "$2.50", "format paid");
eq(LeaveBy.formatDuration(45), "45 min", "45");
eq(LeaveBy.formatDuration(60), "1 hr", "hour");
eq(LeaveBy.formatDuration(75), "1 hr 15 min", "hour plus");
eq(LeaveBy.formatTick(0), "00:00", "tick zero");
eq(LeaveBy.formatTick(90000), "01:30", "tick 90s");
eq(LeaveBy.formatTick((2 * 3600 + 3 * 60 + 4) * 1000), "2:03:04", "tick hours");
eq(LeaveBy.spokenRemaining(5 * 60000), "5 minutes remaining.", "spoken");
eq(LeaveBy.formatRemaining(90 * 1000), "1 min", "remaining floors minutes");

const afternoon = new Date(2026, 8, 23, 14, 0, 0, 0).getTime();
const chip = LeaveBy.startFromChip(45, "  block 4  ", "", afternoon);
assert(chip.ok, "chip starts");
eq(chip.session.leaveAt, afternoon + 45 * 60000, "chip leaveAt");
eq(chip.session.note, "block 4", "note trimmed");
eq(chip.session.durationMin, 45, "chip duration");
eq(chip.session.extendedMin, 0, "no extend yet");
eq(chip.session.source, "chip", "chip source");
eq(chip.session.paid, null, "paid omitted");
eq(LeaveBy.startFromChip(10, "", "", afternoon).reason, "chip", "reject unknown chip");

const clock = LeaveBy.startFromClock(15, 45, "lot C", "2.50", afternoon);
assert(clock.ok, "clock starts");
eq(clock.session.leaveAt, new Date(2026, 8, 23, 15, 45, 0, 0).getTime(), "clock leaveAt");
eq(clock.session.paid, 2.5, "clock paid");
eq(clock.session.source, "clock", "clock source");
eq(clock.session.note, "lot C", "clock note");
eq(LeaveBy.startFromClock(13, 15, "", "", afternoon).reason, "past", "past clock");

const almost = new Date(2026, 8, 23, 14, 0, 30, 0).getTime();
eq(LeaveBy.startFromClock(14, 1, "", "", almost).reason, "short", "under a minute");

const midnight = new Date(2026, 8, 23, 0, 0, 0, 0).getTime();
assert(LeaveBy.startFromClock(16, 0, "", "", midnight).ok, "exactly 16 hours");
eq(LeaveBy.startFromClock(16, 1, "", "", midnight).reason, "long", "over 16 hours");
eq(LeaveBy.parseClockInput("15:45").hours, 15, "parse clock");
eq(LeaveBy.parseClockInput("nope"), null, "bad clock");

const longNote = LeaveBy.startFromChip(15, "x".repeat(120), "", afternoon);
eq(longNote.session.note.length, 80, "note cap");

const replay = LeaveBy.startFromMinutes(75, "spot 12", "1", afternoon);
assert(replay.ok, "replay length");
eq(replay.session.source, "replay", "replay source");
eq(replay.session.durationMin, 75, "replay minutes");
eq(LeaveBy.remainingMs(replay.session, afternoon + 10 * 60000), 65 * 60000, "remaining after 10");

const extended = LeaveBy.extendSession(replay.session, afternoon + 1000);
assert(extended.ok, "extend");
eq(extended.session.extendedMin, 15, "extend count");
eq(extended.session.leaveAt, replay.session.leaveAt + 15 * 60000, "extend leaveAt");
eq(extended.session.id, replay.session.id, "extend keeps id");

let running = LeaveBy.adoptSession(LeaveBy.emptyState(), replay.session, afternoon);
assert(running.ok, "adopt");
running = LeaveBy.endEarly(running.state, afternoon + 5000);
assert(running.ok, "end early");
eq(LeaveBy.remainingMs(running.state.current, afternoon + 5000), 0, "ended remaining is zero");
assert(running.state.current.leaveAt > afternoon + 5000, "leave-by stays");
eq(LeaveBy.endedCopy(running.state.current), "You closed this meter with time still on it.", "early copy");
eq(LeaveBy.extendSession(running.state.current, afternoon + 5000).reason, "ended", "no extend after end");
eq(running.state.history.length, 1, "ended lands in history");
eq(running.state.history[0].note, "spot 12", "history note");
eq(running.state.history[0].paid, 1, "history keeps paid locally");

const again = LeaveBy.endEarly(running.state, afternoon + 8000);
assert(again.already, "second end is a no-op");
eq(again.state.history.length, 1, "no duplicate history");

const cleared = LeaveBy.clearCurrent(running.state, afternoon + 9000);
eq(cleared.current, null, "clear drops hero");
eq(cleared.history.length, 1, "clear keeps one history row");
eq(LeaveBy.clearCurrent(cleared, afternoon + 10000).history.length, 1, "clear twice stays one");

const meter15 = LeaveBy.startFromChip(15, "", "", afternoon).session;
eq(LeaveBy.statusOf(meter15, afternoon + 15 * 60000), "ended", "expires on the minute");
const fin = LeaveBy.finishIfExpired({ v: 1, current: meter15, history: [] }, afternoon + 15 * 60000);
assert(fin.changed, "expiry changes state");
eq(fin.state.current.endedAt, meter15.leaveAt, "expiry stamp");
eq(fin.state.history.length, 1, "expiry history");
eq(LeaveBy.endedCopy(fin.state.current), "Time's up.", "time's up");
const fin2 = LeaveBy.finishIfExpired(fin.state, afternoon + 16 * 60000);
eq(fin2.changed, false, "expiry once");
eq(fin2.state.history.length, 1, "expiry does not duplicate");

const half = LeaveBy.startFromChip(30, "", "", afternoon).session;
assert(Math.abs(LeaveBy.drainRatio(half, afternoon + 15 * 60000) - 0.5) < 0.001, "drain half");
eq(LeaveBy.urgency(half, afternoon + 21 * 60000), "short", "short window");
eq(LeaveBy.urgency(half, afternoon + 29 * 60000), "urgent", "urgent window");
eq(LeaveBy.urgency(half, afternoon), "calm", "calm window");

const payload = LeaveBy.sharePayload(Object.assign({}, clock.session, { paid: 3 }));
assert(payload && !Object.prototype.hasOwnProperty.call(payload, "paid"), "share omits paid");
eq(payload.leaveAt, clock.session.leaveAt, "share leaveAt");
eq(payload.note, "lot C", "share note");
const back = LeaveBy.parseSharePayload(Object.assign({}, payload, { paid: 9 }));
eq(back.paid, null, "parse strips paid");
eq(back.leaveAt, clock.session.leaveAt, "parse leaveAt");
eq(back.note, "lot C", "parse note");
eq(LeaveBy.parseSharePayload({ nope: true }), null, "bad share");
eq(LeaveBy.sharePayload(null), null, "empty share");

let pile = LeaveBy.emptyState();
const t0 = new Date(2026, 8, 23, 8, 0, 0, 0).getTime();
for (let i = 0; i < 13; i++) {
  const started = LeaveBy.startFromChip(15, "n" + i, "", t0 + i * 1000);
  const adopted = LeaveBy.adoptSession(pile, started.session, t0 + i * 1000);
  pile = LeaveBy.clearCurrent(adopted.state, t0 + i * 1000 + 10);
}
eq(pile.history.length, 12, "history cap 12");
eq(pile.history[0].note, "n12", "newest first");
eq(pile.history[11].note, "n1", "oldest kept is n1");
eq(LeaveBy.historyMeta(pile.history[0]), "15 min · n12", "history meta");

const wiped = LeaveBy.clearHistory(pile);
eq(wiped.history.length, 0, "clear history");

const sameDay = LeaveBy.formatLeaveBy(
  new Date(2026, 8, 23, 15, 45).getTime(),
  new Date(2026, 8, 23, 14, 0).getTime()
);
assert(sameDay.indexOf("45") !== -1, "leave-by shows minutes");
assert(sameDay.indexOf("·") === -1, "same day hides weekday");
const nextDay = LeaveBy.formatLeaveBy(
  new Date(2026, 8, 24, 0, 15).getTime(),
  new Date(2026, 8, 23, 22, 0).getTime()
);
assert(nextDay.indexOf("15") !== -1 && nextDay.indexOf("·") !== -1, "next day labels weekday");

let replaced = LeaveBy.adoptSession(LeaveBy.emptyState(), chip.session, afternoon).state;
const other = LeaveBy.startFromChip(30, "other", "", afternoon + 1000).session;
replaced = LeaveBy.adoptSession(replaced, other, afternoon + 1000).state;
eq(replaced.current.note, "other", "new meter is current");
eq(replaced.history.length, 1, "previous meter archived");
eq(replaced.history[0].note, "block 4", "archived note");

const sw = fs.readFileSync(path.join(__dirname, "sw.js"), "utf8");
assert(sw.indexOf('"leave-by-v1"') !== -1, "cache name");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
assert(html.indexOf("#m=") !== -1, "hash snapshot documented");
assert(html.indexOf("?m=") !== -1, "query snapshot documented");
assert(html.indexOf("leave-by-v1") !== -1, "storage name documented");
assert(html.indexOf("not live sync") !== -1, "snapshot honesty");
const app = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
assert(app.indexOf("LeaveBy.STORAGE_KEY") !== -1, "app uses storage key");
assert(app.indexOf('"#m="') !== -1 && app.indexOf('"m"') !== -1, "app reads hash and query");

console.log("leave-by tests ok");
