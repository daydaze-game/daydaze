# Progression, Goals and Status: Why You Come Back

Status: proposed 2026-11-19, waiting on the owner's approval.

## Context and intent

The owner (2026-11-19): "We need some more stuff to make this game actually
fun to play. Where are the addictive game elements? People get addicted to
games like Roblox or GTA." Asked which direction, the owner chose **some of
everything**: the GTA crime climb, the social and fame side, and the rest.

Then: **forget the vision doc, a whole lot of everything.** So this design
doesn't hold back to `docs/VISION.md`'s scope; it keeps only two hard lines
(below) that protect players.

Daydaze has breadth: 100+ activities, minigames graded S to C (`prizes.ts`),
coins (`wallet.ts`), three daily challenges (`challenges.ts`), collections (a
place album, closet sets and a sticker book, `collections.ts`) and 35 weekly
event nights (`events.ts`). What it lacks is the loop that turns breadth into
"one more": a long climb, a clear next thing to do, status other people can
see, chaos with consequences, and other players. This design adds those as
one system, so every activity feeds the same climb.

## Goals

- **One climb, many paths:** an overall **level** plus three **ladders**
  that every activity feeds, so playing anything moves you forward.
- **Always a next thing:** daily and weekly goals, a contracts board, short
  story chains, and city events that come to you.
- **Status you can show:** titles on your name tag, rank-locked and
  limited items, your apartment and garage to visit, weekly leaderboards
  (once online scores are trusted).
- **Chaos with consequences:** heat, police, crashes and fights (#70, #205,
  #220, #227) become the Street ladder's core.
- **A reason to return:** a daily streak, rotating weekly events, and rare
  finds, all fair.

## Non-goals and anti-goals

Two hard lines that stay no matter the scope:

- **No real-money loot boxes, gambling or pay-to-win.** Players are 13+;
  paid random rewards are unethical for teens and illegal in several
  countries. Nothing in this design is bought with real money. (A casino
  with play coins can exist on 18+ servers only.)
- **The 13+ protections stay:** 18+ content only on age-checked 18+ servers,
  chat safety, and no player-versus-player harm without consent.

And:

- **No dark patterns:** no energy timers, no punishing streak loss (a streak
  freeze exists), no fear-of-missing-out pressure beyond the normal rotation
  of event nights.
- A failure even if it works: progression that makes the 100 activities feel
  like chores, or that locks the fun stuff (driving, dressing up, the city)
  behind grinding. **The city stays open from minute one:** driving,
  dressing up, every venue and every minigame. Progression adds goals and
  status, and ranks unlock extras on top (the DJ booth, VIP rooms, owning a
  business, bigger heists), never the base game.

## The system

### 1. Level and ladders

- **XP** comes from everything: finishing a minigame (more for better
  grades, a bonus for a personal best), a job shift, a contract, a daily
  challenge, an event night, a heist, a race, discovering a place.
- **Overall level** (1 to 100, a gentle curve; the first levels come fast)
  is the number on your name tag.
- **Three ladders,** each with 10 named ranks, fed by the XP of their own
  activities:

| Ladder             | Fed by                                                                               | Ranks (draft)                                                                          | Unlocks (examples)                                               |
| ------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Street** (GTA)   | heists, street races, fights won (#227), escaping the police (#70), shoplifting      | Nobody, Corner kid, Hustler, Runner, Crew, Shot caller, Boss, Kingpin, Legend, Myth    | the hideout, faster cars, bigger heists, crew jackets            |
| **Fame** (IMVU)    | event nights, karaoke, catwalk, dance-offs, photos, best-dressed votes, the DJ booth | Unknown, Local, Regular, It girl, Influencer, Headliner, Icon, Star, Superstar, Legend | VIP rooms, the DJ booth, designer clothes, a red carpet entrance |
| **Hustle** (money) | jobs (#208), shops and businesses, investments, property                             | Broke, Getting by, Steady, Comfortable, Rich, Mogul...                                 | bigger apartments, a business of your own, the penthouse         |

- Ranks give **titles** (shown on the name tag; the player picks which),
  **unlocks** and a one-time coin bonus. A rank never takes away play: the
  city, clothes basics, driving and all minigames stay open.

### 2. Goals: always a next thing

- **Daily:** the existing three challenges, plus a **daily streak** (day 7
  and day 30 rewards; one free **streak freeze** a week).
- **Weekly:** each event night (`events.ts`) gets a goal and a limited item;
  a weekly "headline" goal per ladder.
- **Contracts board** (a phone app): 3 to 5 short jobs at a time, each
  pointing at an activity the player hasn't done much ("win a race in the
  Harbor District", "get an A at Ramen Rush", "attend Y2K Night in a Y2K
  outfit"). It refreshes as contracts complete. This is the "what next"
  engine and quietly shows off the 100 activities.
- **Story chains:** short handwritten arcs per ladder (3 to 6 steps each,
  NPC lines in `src/game/dialogue/`, never AI-generated): the first heist
  crew, a DJ's rise, opening a boba shop.
- **City events** that come to you (`docs/VISION.md`, "the GTA feel"): a
  heist in progress, a police chase, a street race forming, a flash mob, a
  celebrity sighting, a blackout. A popup offers to join; joining pays XP.

### 3. Status: being seen

- **Titles and badges** on name tags (online, visible to everyone).
- **Rare items:** rank-locked and event-limited clothes and cars; "first to"
  badges. Rarity comes from playing, never from paying.
- **Your places:** others can visit your apartment, garage and business
  (online); a "best place" vote at event nights.
- **Leaderboards:** weekly per minigame and per ladder. These need trusted,
  server-owned scores, which `docs/VISION.md` defers until online
  leaderboards exist; they wait for that server work.

### 4. Fair surprises

Rare finds while playing (a mystery gift on streak milestones, a rare
collectible in a hidden spot, a bonus drop after an S grade), at known odds,
never bought.

## A whole lot of everything: the big list

Every system below feeds XP and at least one ladder, so each one is also
progress. Each is its own issue (see the tracking issue).

- **Careers you can rank up in:** cop (patrol, chases, arrests: play the other
  side of the Street ladder), firefighter and EMT (city emergencies), taxi and
  delivery driver, DJ, chef, stylist and salon, bartender (18+) or barista,
  photographer, real estate agent, pro racer.
- **Crime and the law:** a wanted level (1 to 5 stars), police that chase and
  arrest, jail and bail (`src/game/jail/`), heists with a crew, car theft, a
  chop shop, bounties, turf for crews.
- **Racing:** street races that form in the city, a race league with seasons,
  drift and drag events, time trials on every road, car tuning that matters.
- **Money, property and business:** buy apartments, houses and a penthouse;
  own businesses (boba shop, club, boutique, garage) that earn while you play;
  hire NPC staff; upgrade them.
- **Social:** friends and a friend list, crews (player groups with a name,
  colors, a hideout and crew goals), a phone to message and call, parties you
  host at your place.
- **Relationships:** friendship levels with players and NPCs, dating
  (consent-based, 13+-appropriate), becoming partners, a wedding at the chapel
  or beach, moving in together; break-ups too.
- **Social media and fame:** an in-game feed for photos (`src/game/photo.ts`),
  likes and followers that feed the Fame ladder, trending looks, influencer
  sponsorships with clothing brands (made up).
- **Fashion:** runway contests and best-dressed votes at event nights, a
  designer career (make and sell your own colorways), limited drops.
- **Hobbies and collections:** fishing, farming, gardening, pet raising and
  pet shows, cooking, crafting, a museum to donate finds to, hundreds of
  collectibles hidden in the city.
- **Achievements:** hundreds, across every activity, with badges for the
  name tag.
- **Seasons:** a free season track (no paid tier) every 6 to 8 weeks with a
  theme, a story chain, season clothes and cars, and a season leaderboard.
  Season rewards come back in a later rerun, so missing a season never
  loses them for good.
- **Tournaments:** weekly brackets for minigames, races, dance-offs and
  karaoke, with trophies for your apartment.
- **City life:** weather (rain, storms, snow events), a day and night
  economy (night shifts pay more, clubs open late), random events, and a
  city news ticker that reports what players did ("Kai won Friday's street
  race").

## Constraints

- Pure, tested logic in `src/game/` (XP, level curve, ladders, ranks,
  contracts, streaks, unlocks), test-first; the save (`save.ts`) gains
  versioned fields and migrates old saves.
- Client-owned until accounts: progress lives in the save, as coins do now.
  Leaderboards and visible titles online need the server to own the numbers
  (anti-cheat), a follow-up to the online foundation
  (`docs/specs/2026-10-14-online-foundation-design.md`).
- 13+ and 18+ tiers: 18+ activities (alcohol, Green Haze, 18+ venues, the
  casino) feed XP only on 18+ servers; nothing 13+ is gated behind them.
- No AI-generated dialogue; titles, contracts and story lines are written by
  hand.
- UI: a level badge and XP bar in the HUD (the city screen keeps only the
  essentials), a ladder panel in the menu, the contracts board on the phone.

## Phases

1. **The climb (single-player):** XP, level, the three ladders and their
   ranks, titles, rank-up moments, the daily streak, the contracts board. All
   client-owned.
2. **Things to chase:** story chains, city events, rank and event unlocks,
   rare finds.
3. **Status online:** titles on name tags, place visits, best-dressed votes
   (needs the game online).
4. **Leaderboards:** server-owned scores and weekly boards.

**Going online is the biggest single multiplier** (other players are the
main reason people stay in Roblox and GTA Online); it needs the owner's deploy
approval and is tracked separately.

## Open questions for the owner

- Rank names and the three ladders' themes: keep the drafts above, or
  rename?
- Should levels unlock **anything** players currently have free, or only add
  new things? (This design: only add.)
- How much should getting caught by the police cost: coins, a jail timer
  (`src/game/jail/`), lost Street XP?
