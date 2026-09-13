# Fridge Raid

Campaign lunchbox arcade: pack a balanced lunch before the bus. Start with Scout, unlock more kids, earn **Fridge Magnets**, then ride **Bus rush**. Play at [bryanralston.github.io/fridge-raid](https://bryanralston.github.io/fridge-raid/). No signup.

## How to play

Tap a fridge item, then tap a kid lunchbox (or **TOSS**). Drag works too. A box seals only when its food-group pips are filled — not when four random slots are full. First L1 pauses the bus and shows **one** coach bubble (tap food, then tap the box). After that, the pips are the teacher — no stacked guide strip or box-status tutorial. Treats are optional extras (pack them first). Spoiled leftovers and junk (keys, phone, remote) still wreck your score if they land in a box. Item names appear on select and in the held chip, not under every shelf sprite. Leftovers look wilted instead of wearing a **TOSS** stamp.

## Levels

Difficulty climbs after the teach stop. Timer tightens, leftovers climb, and fridge events show up more often.

| Level | Kids | Seal rule | Timer | Fridge |
| --- | --- | --- | --- | --- |
| L1 Scout's first lunch | Scout | Fruit + protein. Veg extra if packed first. | 1:35 + pause-first teach | Soft leftovers, extra fruit/protein on the shelf |
| L2 Two hungry | Scout + Pip | Fruit + veg + protein | 1:20 | More leftovers, shelves can interrupt |
| L3 Full house | Scout + Pip + Nori | Fruit + veg + protein + grain. Sandwich covers protein **and** grain. | 0:55 | Full plate, shelf fog, fast slides |
| Bus rush | All three | Same full rule. Leftovers rise every 20s. Score mult climbs with each seal. | 1:30 | Gets messier |

Beat a campaign level by feeding every kid on that stop at least one sealed lunch. Leftover time becomes a bonus, then **Next level**. After L3, free-play **Bus rush** unlocks on the title screen.

## Cravings

Each kid wants something different every run (a food group, or a specific snack). A yellow **😋** chip sits on their lunchbox. Group cravings read **any fruit** (any fruit yums). Item cravings read **Apple** (only that item yums). L1 stays on group cravings so grapes count as fruit. After a seal, their next craving rerolls.

## Fridge events

L2+ throws short, telegraphed moments. The L2 intro warns that **shelves can interrupt** before the first event. Fresh delivery, Shelf slide, Fast slide, and Shelf fog cover the fridge: the bus clock pauses until you tap **Ready** (or the dimmed cover). Leftovers rising stays a small notice.

- **Fresh delivery** — good food bursts onto shelves (never removes your last needed groups)
- **Shelf slide** — the same items shuffle places
- **Fast slide** — a quicker shuffle (L3+ / Bus rush)
- **Shelf fog** — items dim for ~2 seconds (L3+ / Bus rush)
- **Leftovers rising** — Bus rush only, every 20 seconds

L1 stays quiet so you can learn the lunch rule. Per-box need pips stay large and high-contrast (empty pips keep a dark dashed ring and a group tint). Prize-case locked tiles and unlock captions stay ink-on-slate, not pale grey on white. Desktop play uses a wide stage so the fridge is not a phone-sized case on a 1280 canvas.

## Stars

A 3-star clear on the success screen:

1. **Sealed** — every kid on that stop got a balanced lunch
2. **Clean** — zero spoiled/junk packed this level
3. **Hustle** — time left above the level bar, or you scored past it

Best stars per level persist in localStorage.

## Ranks and Fridge Magnets

Career stars (and Bus rush score) set your rank: **Rookie → Packer → Lunch Hero → Bus Hero**.

Fridge Magnets are cosmetic stickers on the title fridge. Earn them from total stars and first 3-star clears. The title shows **🧲 count** and **Prize case · n/10**. Open the case to see locked slots (ink captions, dashed slate tiles) and the next unlock. Between levels you see stars, new magnets, and the next unlock tease. Collection persists in localStorage.

The play HUD is one row (score, bus-timer, sealed count). The old need-guide strip stays hidden except for a Bus rush multiplier. Per-box pips carry the seal rule; a box that is one group short says **need protein** (not a bare almost). Protein pips use a **P** mark so cheese, yogurt, and milk still read as protein. Packing only refills the empty shelf slot — the rest of the fridge stays put until a named event. A fail screen shows **this stop** points, who still needs what, one short hint (pack visible groups before the next cover, then tap Ready), and **Try again**.

## Art

If `fridge-raid/assets/` is present, the game uses `fridge.png` as the fridge backdrop and `{catalogId}.png` sprites (`apple.png`, `sandwich.png`, …). Missing PNGs keep the drawn fallback. Item sprites are transparent cutouts (`object-fit: contain`) overlaid on the four glass lips — three tap targets per row. Lunchbox docks stay compact so the fridge keeps most of the play viewport; Scout, Pip, Nori, and TOSS stay on-screen together. The play fridge uses `object-fit: contain` in a 3:4 box so the open door stays in frame.

## Food groups

- **Fruit:** apple, grapes, banana, strawberries
- **Veg:** carrot, broccoli, cucumber
- **Protein:** cheddar, yogurt, milk, sandwich
- **Grain:** roll, sandwich (sandwich counts as both protein and grain)
- **Treat (optional):** cookie, chips, juice
- **No group (toss these):** spoiled leftovers and junk

## Score

- Fresh food: +100, builds combo (caps at x6)
- Treat: +35
- Seal a balanced lunch: +250 (Bus rush multiplies this)
- Perfect plate (all needs, zero treats): +120
- L1 veg extra credit on seal: +75
- Craving YUM: +80
- No-yuck bonus if you packed zero spoiled/junk: +150
- Time leftover after a campaign clear: +12 per second
- Toss spoiled or junk: +75
- Pack spoiled: −200, shake, combo dies
- Pack junk: −250, shake, combo dies
- Toss fresh food: −50
