const fs = require("fs");
const path = require("path");
const vm = require("vm");

const context = { console, crypto };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "parlay.js"), "utf8"), context);
const Parlay = context.Parlay;

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function eq(a, b, message) {
  if (a !== b) {
    throw new Error((message || "mismatch") + " expected " + JSON.stringify(b) + " got " + JSON.stringify(a));
  }
}

function close(a, b, message) {
  if (!Number.isFinite(a) || Math.abs(a - b) > 1e-12) {
    throw new Error((message || "not close") + " expected " + b + " got " + a);
  }
}

eq(Parlay.STORAGE_KEY, "doom-parlay-v1", "storage key");
eq(Parlay.HISTORY_CAP, 12, "history cap");
eq(Parlay.MIN_LEGS, 2, "min legs");
eq(Parlay.MAX_LEGS, 8, "max legs");

close(Parlay.americanToProb(-110), 110 / 210, "-110 implied");
close(Parlay.americanToProb(200), 100 / 300, "+200 implied");
close(Parlay.americanToProb(150), 0.4, "+150 implied");
close(Parlay.americanToProb(-150), 0.6, "-150 implied");
close(Parlay.americanToProb(-100), 0.5, "-100 even");
close(Parlay.americanToProb(100), 0.5, "+100 even");
eq(Parlay.americanToProb(0), null, "zero odds");
eq(Parlay.americanToProb(50), null, "short american");
eq(Parlay.americanToProb(-99), null, "minus 99");
eq(Parlay.americanToProb(NaN), null, "nan odds");
eq(Parlay.americanToProb(100001), null, "too long");

eq(Parlay.probToAmerican(110 / 210), -110, "round trip -110");
eq(Parlay.probToAmerican(1 / 3), 200, "round trip +200");
eq(Parlay.probToAmerican(0.4), 150, "round trip +150");
eq(Parlay.probToAmerican(0.6), -150, "round trip -150");
eq(Parlay.probToAmerican(0.5), -100, "even money prints -100");
eq(Parlay.probToAmerican(0), null, "zero prob");
eq(Parlay.probToAmerican(1), null, "certain prob");
eq(Parlay.probToAmerican(NaN), null, "nan prob");

const sampleP = (110 / 210) * (110 / 210) * (1 / 3);
close(Parlay.compound([110 / 210, 110 / 210, 1 / 3]), sampleP, "three-leg product");
eq(Parlay.compound([]), null, "empty product");
eq(Parlay.compound([0.5, NaN]), null, "nan leg");
eq(Parlay.compound([0.5, 0]), null, "zero leg");
eq(Parlay.probToAmerican(sampleP), 993, "sample american");

const sample = Parlay.sampleState();
const view = Parlay.evaluate(sample);
assert(view.ready, "sample ready");
eq(view.validCount, 3, "three valid legs");
close(view.parlayP, sampleP, "sample compound");
eq(view.american, 993, "sample +993");
eq(Parlay.formatWin(view.parlayP), "9.15%", "hero percent");
eq(Parlay.formatWin(110 / 210, 2), "52.38%", "leg percent");
eq(view.band.id, "doom", "sample doom band");
eq(view.band.label, "DOOM", "sample doom label");
eq(view.formula, "-110 × -110 × +200", "formula line");
assert(view.band.roast.indexOf("Single digits") !== -1, "roast copy");

const two = Parlay.evaluate({
  legs: [
    { id: "a", label: "", raw: "-110", mode: "american" },
    { id: "b", label: "", raw: "-110", mode: "american" },
  ],
});
eq(two.band.id, "fuse", "two favorites light the fuse");

eq(Parlay.doomBand(0.9, 1).id, "standby", "one leg stays standby");
eq(Parlay.formatWin(NaN), "—", "nan win");
eq(Parlay.formatWin(null), "—", "null win");
eq(Parlay.formatAmerican(null), "—", "null american");
eq(Parlay.formatAmerican(NaN), "—", "nan american");
eq(Parlay.formatAmerican(993), "+993", "plus american");
eq(Parlay.formatDoom(sampleP), "90.9%", "doom percent");

const smart = Parlay.parseLegInput("+200", "percent");
assert(smart.ok && smart.mode === "american", "signed odds stay american");
close(smart.p, 1 / 3, "smart +200");
const pct = Parlay.parseLegInput("45%", "american");
assert(pct.ok && pct.mode === "percent", "percent sign wins");
close(pct.p, 0.45, "45 percent");
eq(Parlay.parseLegInput("45", "american").ok, false, "bare 45 is not american");
eq(Parlay.parseLegInput("", "american").reason, "empty", "blank leg");
eq(Parlay.parseLegInput("nope", "percent").reason, "percent", "junk percent");
eq(Parlay.parseLegInput("0", "percent").ok, false, "zero percent");
eq(Parlay.parseLegInput("100", "percent").ok, false, "certain percent");
eq(Parlay.parseLegInput("200", "american").odds, 200, "unsigned dog");

const minus = Parlay.parseLegInput("−110", "american");
assert(minus.ok, "unicode minus");
eq(minus.odds, -110, "unicode odds");

eq(Parlay.convertRaw("-110", "american", "percent"), "52.38", "convert to percent");
eq(Parlay.convertRaw("33.33", "percent", "american"), "+200", "convert to american");

const junk = Parlay.evaluate(
  Parlay.normalizeState({
    legs: [
      { raw: "nope", mode: "american" },
      { raw: "", mode: "percent" },
      { raw: "0", mode: "percent" },
    ],
  })
);
eq(junk.ready, false, "junk slip not ready");
eq(junk.parlayP, null, "junk has no product");
assert(JSON.stringify(junk).indexOf("NaN") === -1, "ui payload has no NaN");

let state = Parlay.sampleState();
assert(Parlay.addLeg(state), "add fourth");
eq(state.legs.length, 4, "four legs");
while (state.legs.length < Parlay.MAX_LEGS) Parlay.addLeg(state);
eq(state.legs.length, 8, "capped at eight");
assert(!Parlay.addLeg(state), "ninth refused");

const removed = state.legs[0].id;
assert(Parlay.removeLeg(state, removed), "remove leg");
eq(state.legs.length, 7, "seven remain");

state = Parlay.sampleState();
Parlay.pushHistory(state, 1700000000000);
eq(state.history.length, 1, "history keeps a ready slip");
eq(state.history[0].american, 993, "history stores american");
Parlay.pushHistory(state, 1700000001000);
eq(state.history.length, 1, "same slip refreshes instead of duplicating");
eq(state.history[0].at, 1700000001000, "history timestamp updates");

for (let i = 0; i < 14; i++) {
  state.legs[2].raw = "+" + (200 + i);
  Parlay.pushHistory(state, 1700000002000 + i);
}
eq(state.history.length, 12, "history caps at 12");

const cleared = Parlay.startOver(state);
eq(cleared.legs.length, 2, "start over leaves two blanks");
eq(cleared.legs[0].raw, "", "start over clears odds");
eq(cleared.history.length, 12, "start over keeps history");

const reloaded = Parlay.normalizeState(JSON.parse(JSON.stringify(state)));
eq(reloaded.history.length, 12, "reload keeps history");
close(Parlay.evaluate(reloaded).parlayP, Parlay.evaluate(state).parlayP, "reload compound matches");

const payload = Parlay.sharePayload(state);
assert(!Object.prototype.hasOwnProperty.call(payload, "history"), "share omits history");
const parsed = Parlay.parseShare(payload);
assert(parsed && parsed.legs.length === state.legs.length, "share round trip count");
eq(parsed.legs[0].raw, state.legs[0].raw, "share keeps raw odds");
eq(parsed.legs[0].label, state.legs[0].label, "share keeps label");
const sharedView = Parlay.evaluate({ legs: parsed.legs });
close(sharedView.parlayP, Parlay.evaluate(state).parlayP, "shared compound matches");
eq(sharedView.american, Parlay.evaluate(state).american, "shared american matches");
eq(Parlay.parseShare({ v: 1, history: state.history }), null, "history alone is not a slip");

const tooMany = [];
for (let i = 0; i < 10; i++) tooMany.push({ raw: "-110", mode: "american", label: "L" + i });
eq(Parlay.normalizeState({ legs: tooMany }).legs.length, 8, "normalize caps legs");
eq(Parlay.normalizeState({ legs: [] }).legs.length, 0, "empty slip persists");

const sw = fs.readFileSync(path.join(__dirname, "sw.js"), "utf8");
assert(sw.indexOf('"doom-parlay-v1"') !== -1, "cache name");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
assert(html.indexOf("#p=") !== -1, "hash snapshot documented");
assert(html.indexOf("?p=") !== -1, "query snapshot documented");
assert(html.indexOf("doom-parlay-v1") !== -1, "storage name documented");
assert(html.indexOf("not live sync") !== -1, "snapshot honesty");
assert(html.indexOf("Not advice") !== -1, "not advice");
assert(html.indexOf("No real money") !== -1, "no real money");
assert(html.indexOf("<details") !== -1, "feature map details");
const app = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
assert(app.indexOf("Parlay.STORAGE_KEY") !== -1, "app uses storage key");
assert(app.indexOf('"#p="') !== -1 && app.indexOf('"p"') !== -1, "app reads hash and query");
assert(app.indexOf("private mode") !== -1, "private mode copy");

console.log("parlay.test.js ok — sample " + Parlay.formatWin(view.parlayP) + " " + Parlay.formatAmerican(view.american));
