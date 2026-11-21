# Light high modifiers for minigames

## Intent

Make a cannabis high add a small playful assist to existing minigames. The assist may improve offline scores and prizes, but must never affect online play.

## Decisions and approaches

The chosen approach is to adjust existing timing windows and meter speeds using the local cannabis meter. This keeps the effect tied to the existing dose curve and avoids changing game rules or adding assets. Cosmetic-only flourishes would not meet the decision that effects can help scores. A global score multiplier was rejected because it rewards play unrelated to the high and is difficult to keep fair.

Modifiers apply only when `ADULT_OK` is true and `ONLINE` is false. They scale with the local cannabis meter and are zero while sober. Karaoke widens timing grades, Bassline widens judgment windows, and bowling and mini-golf slow their aim or power sweeps. The roller rink has no scored minigame, so it receives no scoring modifier in this issue.

## Goals and constraints

- Use the local meter in `src/client/effects/high.ts`; no network or persistence changes.
- Apply only the cannabis `high` meter, not other substances.
- Never change timing or score behavior online, including adult preview.
- Keep the public 13+ experience unchanged through `ADULT_OK`.
- Keep pure modifier math tested and deterministic.
- Cap timing windows at 25% wider and sweep periods at 15% longer.
- Do not add score multipliers or bonus points.
