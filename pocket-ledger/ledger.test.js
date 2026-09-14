const fs = require("fs");
const path = require("path");
const vm = require("vm");

const context = { crypto, console };
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, "ledger.js"), "utf8") + "\nthis.ExportedLedger = Ledger;",
  context
);
const Ledger = context.ExportedLedger;

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function eq(a, b, message) {
  if (a !== b) throw new Error((message || "mismatch") + " expected " + b + " got " + a);
}

eq(Ledger.parseMoney("1,240.50"), 124050, "comma money");
eq(Ledger.parseMoney("$12.5"), 1250, "short cents");
eq(Ledger.parseMoney("(20)"), -2000, "parens");
eq(Ledger.parseMoney("nope"), null, "junk");
eq(Ledger.formatMoney(124050), "$1,240.50", "format");
eq(Ledger.formatMoney(-500, { signed: true }), "−$5.00", "neg format");
eq(Ledger.shiftMonth("2026-01", -1), "2025-12", "year wrap");
eq(Ledger.monthLabel("2026-09").includes("2026"), true, "month label year");

const state = Ledger.emptyState();
state.currentMonth = "2026-09";
Ledger.addStarterEnvelopes(state);
eq(state.categories.length, Ledger.STARTER_ENVELOPES.length, "starter count");

Ledger.upsertTransaction(state, {
  type: "income",
  payee: "Paycheck",
  amountCents: 300000,
  date: "2026-09-01",
});
let sum = Ledger.summarize(state, "2026-09");
eq(sum.income, 300000, "income");
eq(sum.leftover, 300000, "all leftover");

const groc = state.categories.find((c) => c.name === "Groceries");
Ledger.setAssigned(state, "2026-09", groc.id, 60000);
sum = Ledger.summarize(state, "2026-09");
eq(sum.assignedTotal, 60000, "assigned");
eq(sum.leftover, 240000, "leftover after assign");

Ledger.upsertTransaction(state, {
  type: "expense",
  payee: "Store",
  amountCents: 15000,
  date: "2026-09-04",
  categoryId: groc.id,
});
sum = Ledger.summarize(state, "2026-09");
eq(sum.byCat[groc.id].remaining, 45000, "remaining");
eq(sum.spentTotal, 15000, "spent");

const before = sum.leftover;
const split = Ledger.splitLeftover(state, "2026-09");
eq(split.added, before, "split uses leftover");
sum = Ledger.summarize(state, "2026-09");
eq(sum.leftover, 0, "zero after split");
eq(sum.assignedTotal, 300000, "all income assigned");

state.currentMonth = "2026-10";
const rolled = Ledger.copyForward(state, "2026-10");
assert(rolled.copied > 0, "copy forward");
eq(Ledger.assignedOf(state, "2026-10", groc.id), Ledger.assignedOf(state, "2026-09", groc.id), "rolled groceries");

const fresh = Ledger.emptyState();
fresh.currentMonth = "2026-09";
Ledger.addStarterEnvelopes(fresh);
Ledger.upsertTransaction(fresh, {
  type: "income",
  payee: "Pay",
  amountCents: 200000,
  date: "2026-09-01",
});
const filled = Ledger.fillPlans(fresh, "2026-09");
assert(filled.added > 0, "fill plans added");
const afterFill = Ledger.summarize(fresh, "2026-09");
const grocFresh = fresh.categories.find((c) => c.name === "Groceries");
eq(afterFill.byCat[grocFresh.id].assigned, grocFresh.planCents, "groceries filled to plan");

const csv = Ledger.transactionsCsv(state);
assert(csv.startsWith("date,type,payee,category,amount,note"), "csv header");
assert(csv.includes("Paycheck"), "csv income");

const roundTrip = Ledger.sanitizeState(Ledger.exportPayload(state));
eq(roundTrip.transactions.length, state.transactions.length, "import txns");
eq(roundTrip.categories.length, state.categories.length, "import cats");

console.log("ledger.test.js ok");
