# Short shifts: paid jobs at existing venues (#208)

## Why

The wallet (`wallet.ts`, `save.coins`) and six order-station "shifts" already
exist (barista, boba, ramen, halo-halo, feeding, plus the cook-off contest),
but a shift is just a minigame with a prize card. #208 wants jobs: work a
shift, get paid for the work, and have it count toward the Hustle ladder
(#273) and, later, careers (#261).

## Decisions (agent's calls, no owner Q&A was possible; flag in review)

- A **shift** is one finished order-station shift at a workplace. Jobs map
  1:1 to the station's `PrizeGame` id: `barista`, `boba`, `ramen`, `halo-halo`,
  `feeding`. The cook-off is a contest, not a job.
- **Wage**, paid at the last ticket, separate from the grade prize card:
  `WAGE_PER_ORDER` (4) per right order, tips 1:1 in coins, and a
  `CLEAN_BONUS` (10) when every ticket was right. Hustle XP is
  `XP_PER_ORDER` (5) per right order.
- **Slow hours:** the first `FULL_PAY_SHIFTS` (3) shifts of a UTC day
  (`challenges.dayOf`) pay in full; later ones pay half, rounded down. This
  caps grinding without locking anything (progression never locks play).
- **Save:** `save.shifts = { day, today, worked }`: the day `today` counts,
  how many shifts were paid that day, and lifetime shifts per job (the
  rank base for #261). Validated on load; older saves start empty.
  Server-owned progress (#272) can treat it as one more validated record.
- **Age tiers:** every job here is non-alcohol, so all are 13+. Bartending
  (mocktail for 13+, wine behind `ADULT_OK`) is out of scope: the wine
  bar's minigame is a pour game, not an order station.
- Pay goes through `earn` (cap respected) and `rewardXp` (rank coins stay
  atomic with the XP). The pay slip shows on the panel after the shift.

## Not in this slice (follow-ups)

Taxi, delivery and the karaoke desk need their own shift mechanics; bartending
needs the age-tiered station; ranks and uniforms are #261.
