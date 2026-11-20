// Achievement vocabulary shared by the engine (achievements.ts) and the catalog
// (achievementCatalog.ts): the stat keys, tiers and the achievement shape. Kept
// in its own module so those two never import each other. Pure.

/** Every counter the achievements read. All are non-negative integers. */
export const STAT_KEYS = [
  // Minigames
  "gamesPlayed",
  "gamesWon",
  "gradesS",
  "gameVariety",
  // Places and collections
  "placesVisited",
  "closetSetsClaimed",
  "goldStickers",
  // Karaoke
  "karaokeSongs",
  "karaokeHighScores",
  "karaokeDuets",
  "karaokeVariety",
  // Fishing
  "fishCaught",
  "fishSpecies",
  "fishRare",
  // Farming
  "cropsPlanted",
  "cropsHarvested",
  "farmDaysTended",
  // Cars
  "carsOwned",
  "milesDriven",
  "carWrecks",
  "nightMiles",
  // Events
  "eventsAttended",
  "eventVariety",
  "clubNights",
  // Crime
  "crimesCommitted",
  "arrests",
  "chasesEscaped",
  "minutesInJail",
  "bailPaid",
  // City life
  "coinsEarned",
  "itemsBought",
  "outfitsChanged",
  "daysPlayed",
  "wavesSent",
  "chatsHad",
  "secretsFound",
] as const;

export type StatKey = (typeof STAT_KEYS)[number];
export type Tier = "bronze" | "silver" | "gold" | "platinum";

/** Unlocks when `stat` reaches `atLeast`. */
export type Condition = { stat: StatKey; atLeast: number };

export type Achievement = {
  id: string;
  title: string;
  description: string;
  /** Hidden ones show as "???" in the book until unlocked. */
  hidden: boolean;
  tier: Tier;
  when: Condition;
};
