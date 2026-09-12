# Fridge Raid

Campaign lunchbox arcade: pack a balanced lunch before the bus. Start with Scout, unlock more kids, earn **Fridge Magnets**, then ride **Bus rush**. Play at [bryanralston.github.io/fridge-raid](https://bryanralston.github.io/fridge-raid/). No signup.

## How to play

Tap or drag fridge items into a kid lunchbox, or into **TOSS**. A box seals only when its food-group pips are filled — not when four random slots are full. Treats are optional extras (pack them first). Spoiled leftovers and junk (keys, phone, remote) still wreck your score if they land in a box.

## Levels

Difficulty climbs after the teach stop. Timer tightens, leftovers climb, and fridge events show up more often.

| Level | Kids | Seal rule | Timer | Fridge |
| --- | --- | --- | --- | --- |
| L1 Scout's first lunch | Scout | Fruit + protein. Veg extra if packed first. | 1:20 | Teach: few spoiled / traps |
| L2 Two hungry | Scout + Pip | Fruit + veg + protein | 1:05 | More leftovers, more events |
| L3 Full house | Scout + Pip + Nori | Fruit + veg + protein + grain. Sandwich covers protein **and** grain. | 0:55 | Full plate, shelf fog, fast slides |
| Bus rush | All three | Same full rule. Leftovers rise every 20s. Score mult climbs with each seal. | 1:30 | Gets messier |

Beat a campaign level by feeding every kid on that stop at least one sealed lunch. Leftover time becomes a bonus, then **Next level**. After L3, free-play **Bus rush** unlocks on the title screen.

## Cravings

Each kid wants something different every run (a food group, or a specific snack). A yellow **😋** chip sits on their lunchbox. Pack that craving for a **YUM** bonus and a sparkle. After a seal, their next craving rerolls.

## Fridge events

L2+ throws short, telegraphed moments (banner ~1s):

- **Fresh delivery** — good food bursts onto shelves (never removes your last needed groups)
- **Shelf slide** — the same items shuffle places
- **Fast slide** — a quicker shuffle (L3+ / Bus rush)
- **Shelf fog** — items dim for ~2 seconds (L3+ / Bus rush)
- **Leftovers rising** — Bus rush only, every 20 seconds

L1 stays quiet so you can learn the lunch rule.

## Stars

A 3-star clear on the success screen:

1. **Sealed** — every kid on that stop got a balanced lunch
2. **Clean** — zero spoiled/junk packed this level
3. **Hustle** — time left above the level bar, or you scored past it

Best stars per level persist in localStorage.

## Ranks and Fridge Magnets

Career stars (and Bus rush score) set your rank: **Rookie → Packer → Lunch Hero → Bus Hero**.

Fridge Magnets are cosmetic stickers on the title fridge and play-door. Earn them from total stars and first 3-star clears. Open **Prize case** on the title screen. Between levels you see stars, new magnets, and the next unlock tease. Collection persists in localStorage.

## Art

If `fridge-raid/assets/` is present, the game uses `fridge.png` as the fridge backdrop and `{catalogId}.png` sprites (`apple.png`, `sandwich.png`, …). Missing PNGs keep the drawn fallback. Item sprites are transparent cutouts (`object-fit: contain`) overlaid on the fridge shelves — three large tap targets per shelf, scaled up in lunchbox pockets too. The play fridge uses `object-fit: contain` in a 3:4 box so the open door stays in frame.

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
