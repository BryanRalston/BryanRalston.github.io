const fs = require("fs");
const path = require("path");
const vm = require("vm");

const context = { console, crypto };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "tip.js"), "utf8"), context);
const TipMath = context.TipMath;

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function eq(a, b, message) {
  if (a !== b) {
    throw new Error((message || "mismatch") + " expected " + JSON.stringify(b) + " got " + JSON.stringify(a));
  }
}

eq(TipMath.parseMoney("86.40"), 8640, "plain money");
eq(TipMath.parseMoney("$1,234.56"), 123456, "comma money");
eq(TipMath.parseMoney("12.5"), 1250, "one decimal");
eq(TipMath.parseMoney(""), null, "empty money");
eq(TipMath.parseMoney("nope"), null, "junk money");
eq(TipMath.parseMoney("-4"), null, "negative");
eq(TipMath.formatMoney(8640), "$86.40", "format");
eq(TipMath.formatMoney(100), "$1.00", "format dollar");
eq(TipMath.parsePercent("18.5"), 18.5, "percent decimal");
eq(TipMath.parsePercent("101"), null, "percent too high");
eq(TipMath.clampPeople(0), 1, "people floor");
eq(TipMath.clampPeople(99), 20, "people cap");

const fair = TipMath.splitFair(10000, 3);
eq(fair.shares.reduce((sum, n) => sum + n, 0), 10000, "penny split sums");
eq(fair.shares.join(","), "3334,3333,3333", "first seats take leftover pennies");
assert(fair.shares.every((n) => n === 3333 || n === 3334), "only two amounts");

const odd = TipMath.splitFair(1001, 2);
eq(odd.shares.join(","), "501,500", "one extra penny");
eq(odd.shares.reduce((sum, n) => sum + n, 0), 1001, "odd split sums");

const onSub = TipMath.compute({
  subtotalCents: 8640,
  taxCents: 756,
  tipPercent: 20,
  tipOn: "subtotal",
  people: 3,
  roundUp: false,
});
eq(onSub.tipCents, 1728, "20% of subtotal");
eq(onSub.billTotalCents, 8640 + 756 + 1728, "bill total");
eq(onSub.shares.reduce((sum, n) => sum + n, 0), onSub.tableTotalCents, "shares cover the table");

const onTotal = TipMath.compute({
  subtotalCents: 8640,
  taxCents: 756,
  tipPercent: 20,
  tipOn: "total",
  people: 3,
  roundUp: false,
});
eq(onTotal.tipCents, Math.round((8640 + 756) * 20 / 100), "20% of subtotal+tax");
assert(onTotal.tipCents > onSub.tipCents, "tax-on tip is larger");

const even = TipMath.compute({
  subtotalCents: 9000,
  taxCents: 0,
  tipPercent: 20,
  tipOn: "subtotal",
  people: 3,
  roundUp: false,
});
eq(even.shares.join(","), "3600,3600,3600", "even split");

const rounded = TipMath.compute({
  subtotalCents: 10000,
  taxCents: 0,
  tipPercent: 18,
  tipOn: "subtotal",
  people: 3,
  roundUp: true,
});
assert(rounded.shares.every((n) => n % 100 === 0), "round up to dollars");
eq(rounded.shares.reduce((sum, n) => sum + n, 0), rounded.tableTotalCents, "round-up shares sum");
assert(rounded.tableTotalCents >= rounded.billTotalCents, "round-up never short");
assert(rounded.paidTipCents >= rounded.tipCents, "extra lands in tip");

const one = TipMath.compute({
  subtotalCents: 2500,
  taxCents: 0,
  tipPercent: 15,
  tipOn: "subtotal",
  people: 1,
  roundUp: false,
});
eq(one.shares.length, 1, "solo share");
eq(one.shares[0], one.tableTotalCents, "solo is the total");

const draft = TipMath.computeDraft({
  subtotal: "86.40",
  tax: "7.56",
  tipPercent: 20,
  tipOn: "subtotal",
  people: 3,
  roundUp: false,
});
eq(draft.ok, true, "draft ok");
eq(draft.subtotalCents, 8640, "draft subtotal");

const empty = TipMath.computeDraft({ subtotal: "", tipPercent: 20, people: 2 });
eq(empty.ok, false, "empty draft");

const state = TipMath.emptyState();
for (let i = 0; i < 12; i++) {
  TipMath.pushHistory(
    state,
    TipMath.compute({
      subtotalCents: 1000 + i * 100,
      taxCents: 0,
      tipPercent: 20,
      tipOn: "subtotal",
      people: 2,
      roundUp: false,
    })
  );
}
eq(state.history.length, 10, "history cap");

const first = TipMath.compute({
  subtotalCents: 5000,
  taxCents: 0,
  tipPercent: 20,
  tipOn: "subtotal",
  people: 2,
});
TipMath.pushHistory(state, first);
TipMath.pushHistory(state, first);
const samePrint = state.history.filter((row) => TipMath.fingerprint(row) === TipMath.fingerprint(first));
eq(samePrint.length, 1, "history dedupes");

const loaded = TipMath.normalizeState({
  v: 1,
  draft: { subtotal: "40", tipPercent: 18, people: 4, tipOn: "total", roundUp: true },
  history: [{ subtotalCents: 4000, taxCents: 0, tipPercent: 18, tipOn: "total", people: 4, roundUp: true, at: 1 }],
});
eq(loaded.draft.people, 4, "normalize people");
eq(loaded.history.length, 1, "normalize history");

console.log("tip-math tests ok");
