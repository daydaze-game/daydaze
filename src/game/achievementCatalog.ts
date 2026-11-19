// The achievements catalog: handwritten titles and descriptions, one stat
// threshold each, grouped by activity family. A "secret" row stays masked in
// the book until it unlocks. Data only; the engine is achievements.ts.

import type { Achievement, StatKey, Tier } from "./achievements.ts";

type Row = readonly [
  id: string,
  stat: StatKey,
  atLeast: number,
  tier: Tier,
  title: string,
  description: string,
  secret?: true,
];

const B = "bronze";
const S = "silver";
const G = "gold";
const P = "platinum";

const ROWS: readonly Row[] = [
  // Minigames
  ["first-game", "gamesPlayed", 1, B, "Press Start", "Play your first minigame."],
  ["games-10", "gamesPlayed", 10, B, "Warming Up", "Play 10 minigames."],
  ["games-50", "gamesPlayed", 50, S, "Arcade Regular", "Play 50 minigames."],
  ["games-250", "gamesPlayed", 250, G, "Cabinet Cat", "Play 250 minigames."],
  ["games-1000", "gamesPlayed", 1000, P, "Lives at the Arcade", "Play 1,000 minigames."],
  ["first-win", "gamesWon", 1, B, "Beginner's Luck", "Win a minigame."],
  ["wins-10", "gamesWon", 10, B, "Streak Starter", "Win 10 minigames."],
  ["wins-50", "gamesWon", 50, S, "Table Runner", "Win 50 minigames."],
  ["wins-200", "gamesWon", 200, G, "Unbeaten-ish", "Win 200 minigames."],
  ["wins-500", "gamesWon", 500, P, "Hall of Fame Hands", "Win 500 minigames."],
  ["first-s", "gradesS", 1, S, "Top Marks", "Earn an S grade."],
  ["s-10", "gradesS", 10, G, "Perfectionist", "Earn 10 S grades."],
  ["s-40", "gradesS", 40, P, "Flawless Fridays", "Earn 40 S grades."],
  ["variety-3", "gameVariety", 3, B, "Sampler Platter", "Try 3 different minigames."],
  ["variety-10", "gameVariety", 10, S, "Jack of All Games", "Try 10 different minigames."],
  ["variety-25", "gameVariety", 25, G, "Whole Arcade", "Try 25 different minigames."],
  ["variety-all", "gameVariety", 40, P, "Cartridge Collector", "Try 40 different minigames."],
  ["gold-1", "goldStickers", 1, B, "Gold Star", "Earn a gold sticker in the sticker book."],
  ["gold-10", "goldStickers", 10, S, "Sticker Shiny", "Earn 10 gold stickers."],
  ["gold-25", "goldStickers", 25, G, "Page of Gold", "Earn 25 gold stickers."],
  ["gold-40", "goldStickers", 40, P, "Full Foil", "Earn 40 gold stickers."],

  // Places and collections
  ["first-place", "placesVisited", 1, B, "Wanderer", "Visit your first place."],
  ["places-5", "placesVisited", 5, B, "Out and About", "Visit 5 places."],
  ["places-15", "placesVisited", 15, S, "Neighborhood Fixture", "Visit 15 places."],
  ["places-30", "placesVisited", 30, S, "Local Legend", "Visit 30 places."],
  ["places-50", "placesVisited", 50, G, "Cartographer", "Visit 50 places."],
  ["places-80", "placesVisited", 80, P, "Every Door Opened", "Visit 80 places."],
  ["set-1", "closetSetsClaimed", 1, B, "Matching Set", "Claim your first closet set."],
  ["set-3", "closetSetsClaimed", 3, S, "Wardrobe Wins", "Claim 3 closet sets."],
  ["set-6", "closetSetsClaimed", 6, G, "Fully Dressed", "Claim 6 closet sets."],
  ["set-10", "closetSetsClaimed", 10, P, "Closet Curator", "Claim 10 closet sets."],

  // Karaoke
  ["karaoke-1", "karaokeSongs", 1, B, "Mic Check", "Sing your first karaoke song."],
  ["karaoke-5", "karaokeSongs", 5, B, "Warm Throat", "Sing 5 karaoke songs."],
  ["karaoke-25", "karaokeSongs", 25, S, "Booth Regular", "Sing 25 karaoke songs."],
  ["karaoke-100", "karaokeSongs", 100, G, "Encore Machine", "Sing 100 karaoke songs."],
  ["karaoke-300", "karaokeSongs", 300, P, "Last Call Diva", "Sing 300 karaoke songs."],
  ["karaoke-hi-1", "karaokeHighScores", 1, S, "On Pitch", "Hit a high karaoke score."],
  ["karaoke-hi-10", "karaokeHighScores", 10, G, "Golden Pipes", "Hit 10 high karaoke scores."],
  ["karaoke-hi-50", "karaokeHighScores", 50, P, "Chart Topper", "Hit 50 high karaoke scores."],
  ["duet-1", "karaokeDuets", 1, B, "Harmony", "Sing a duet."],
  ["duet-10", "karaokeDuets", 10, S, "Better Together", "Sing 10 duets."],
  ["duet-40", "karaokeDuets", 40, G, "Power Couple Energy", "Sing 40 duets."],
  ["karaoke-var-5", "karaokeVariety", 5, B, "Setlist", "Sing 5 different songs."],
  ["karaoke-var-20", "karaokeVariety", 20, S, "Deep Cuts", "Sing 20 different songs."],
  ["karaoke-var-50", "karaokeVariety", 50, G, "Songbook Complete-ish", "Sing 50 different songs."],

  // Fishing
  ["fish-1", "fishCaught", 1, B, "First Bite", "Catch your first fish."],
  ["fish-10", "fishCaught", 10, B, "Line in the Water", "Catch 10 fish."],
  ["fish-50", "fishCaught", 50, S, "Dock Sitter", "Catch 50 fish."],
  ["fish-200", "fishCaught", 200, G, "Tackle Box Full", "Catch 200 fish."],
  ["fish-1000", "fishCaught", 1000, P, "The Old Fisher", "Catch 1,000 fish."],
  ["species-3", "fishSpecies", 3, B, "Mixed Bucket", "Catch 3 kinds of fish."],
  ["species-8", "fishSpecies", 8, S, "Ichthyology Hobby", "Catch 8 kinds of fish."],
  ["species-15", "fishSpecies", 15, G, "Aquarium Brain", "Catch 15 kinds of fish."],
  ["species-25", "fishSpecies", 25, P, "Every Scale", "Catch 25 kinds of fish."],
  ["rare-1", "fishRare", 1, S, "Shimmer in the Deep", "Catch a rare fish."],
  ["rare-10", "fishRare", 10, G, "Lucky Hook", "Catch 10 rare fish."],
  ["rare-30", "fishRare", 30, P, "Legend of the Lagoon", "Catch 30 rare fish."],

  // Farming
  ["plant-1", "cropsPlanted", 1, B, "Dirt Under the Nails", "Plant your first seed."],
  ["plant-50", "cropsPlanted", 50, S, "Seed Spreader", "Plant 50 seeds."],
  ["plant-500", "cropsPlanted", 500, G, "Row After Row", "Plant 500 seeds."],
  ["harvest-1", "cropsHarvested", 1, B, "First Harvest", "Harvest your first crop."],
  ["harvest-25", "cropsHarvested", 25, B, "Basket Full", "Harvest 25 crops."],
  ["harvest-150", "cropsHarvested", 150, S, "Market Stall", "Harvest 150 crops."],
  ["harvest-600", "cropsHarvested", 600, G, "Barn Raiser", "Harvest 600 crops."],
  ["harvest-2000", "cropsHarvested", 2000, P, "Harvest Moon Hero", "Harvest 2,000 crops."],
  ["farmdays-3", "farmDaysTended", 3, B, "Green Thumb", "Tend the farm on 3 different days."],
  ["farmdays-14", "farmDaysTended", 14, S, "Fortnight Farmer", "Tend the farm on 14 different days."],
  ["farmdays-60", "farmDaysTended", 60, G, "Seasons Pass", "Tend the farm on 60 different days."],
  ["farmdays-200", "farmDaysTended", 200, P, "Roots Run Deep", "Tend the farm on 200 different days."],

  // Cars
  ["car-1", "carsOwned", 1, B, "Keys in Hand", "Own your first car."],
  ["car-3", "carsOwned", 3, S, "Small Garage", "Own 3 cars."],
  ["car-8", "carsOwned", 8, G, "Parking Problem", "Own 8 cars."],
  ["car-15", "carsOwned", 15, P, "Dealership's Favorite", "Own 15 cars."],
  ["miles-1", "milesDriven", 1, B, "Out of the Driveway", "Drive 1 mile."],
  ["miles-25", "milesDriven", 25, B, "Cruising", "Drive 25 miles."],
  ["miles-100", "milesDriven", 100, S, "Road Tripper", "Drive 100 miles."],
  ["miles-500", "milesDriven", 500, G, "Highway Hum", "Drive 500 miles."],
  ["miles-2500", "milesDriven", 2500, P, "Coast to Coast", "Drive 2,500 miles."],
  ["wreck-1", "carWrecks", 1, B, "Fender Bender", "Wreck a car."],
  ["wreck-10", "carWrecks", 10, S, "Insurance's Nightmare", "Wreck cars 10 times."],
  ["wreck-50", "carWrecks", 50, G, "Crumple Zone", "Wreck cars 50 times."],
  ["night-10", "nightMiles", 10, B, "Headlights On", "Drive 10 miles after dark."],
  ["night-100", "nightMiles", 100, S, "Night Owl Driver", "Drive 100 miles after dark."],
  ["night-500", "nightMiles", 500, G, "Streetlight Poet", "Drive 500 miles after dark."],

  // Events
  ["event-1", "eventsAttended", 1, B, "RSVP Yes", "Attend your first city event."],
  ["event-5", "eventsAttended", 5, B, "Social Calendar", "Attend 5 city events."],
  ["event-20", "eventsAttended", 20, S, "Never Misses One", "Attend 20 city events."],
  ["event-75", "eventsAttended", 75, G, "Guest of Honor", "Attend 75 city events."],
  ["event-200", "eventsAttended", 200, P, "The Whole Calendar", "Attend 200 city events."],
  ["evvar-3", "eventVariety", 3, B, "Taste of Everything", "Attend 3 different kinds of events."],
  ["evvar-6", "eventVariety", 6, S, "Event Sampler", "Attend 6 different kinds of events."],
  ["evvar-10", "eventVariety", 10, G, "Seen It All", "Attend 10 different kinds of events."],
  ["club-1", "clubNights", 1, B, "Doors Open", "Go to a club night."],
  ["club-10", "clubNights", 10, S, "On the List", "Go to 10 club nights."],
  ["club-40", "clubNights", 40, G, "Dance Floor Resident", "Go to 40 club nights."],

  // Crime
  ["crime-1", "crimesCommitted", 1, B, "Bad Decision", "Commit your first crime."],
  ["crime-10", "crimesCommitted", 10, B, "Small-Time", "Commit 10 crimes."],
  ["crime-50", "crimesCommitted", 50, S, "Known to the Block", "Commit 50 crimes."],
  ["crime-200", "crimesCommitted", 200, G, "Rap Sheet Poetry", "Commit 200 crimes."],
  ["crime-600", "crimesCommitted", 600, P, "Public Enemy Number One", "Commit 600 crimes."],
  ["arrest-1", "arrests", 1, B, "Caught", "Get arrested."],
  ["arrest-10", "arrests", 10, S, "Regular Customer", "Get arrested 10 times."],
  ["arrest-40", "arrests", 40, G, "Booked Solid", "Get arrested 40 times."],
  ["chase-1", "chasesEscaped", 1, S, "Lost Them", "Shake a police chase."],
  ["chase-10", "chasesEscaped", 10, G, "Ghost in the Mirror", "Shake 10 police chases."],
  ["chase-40", "chasesEscaped", 40, P, "Untouchable", "Shake 40 police chases."],
  ["jail-30", "minutesInJail", 30, B, "Cell Tour", "Spend 30 minutes in jail."],
  ["jail-240", "minutesInJail", 240, S, "Doing Time", "Spend 4 hours in jail."],
  ["jail-1500", "minutesInJail", 1500, G, "Lifer Energy", "Spend 25 hours in jail."],
  ["bail-1", "bailPaid", 1, B, "Friends With Money", "Pay bail once."],
  ["bail-15", "bailPaid", 15, S, "Bail Fund Donor", "Pay bail 15 times."],

  // City life
  ["coins-100", "coinsEarned", 100, B, "Pocket Change", "Earn 100 coins."],
  ["coins-2000", "coinsEarned", 2000, S, "Rent Covered", "Earn 2,000 coins."],
  ["coins-25000", "coinsEarned", 25000, G, "Comfortably Off", "Earn 25,000 coins."],
  ["coins-250000", "coinsEarned", 250000, P, "Penthouse Pockets", "Earn 250,000 coins."],
  ["buy-1", "itemsBought", 1, B, "Retail Therapy", "Buy something from a shop."],
  ["buy-25", "itemsBought", 25, S, "Shopping Bags", "Buy 25 things."],
  ["buy-150", "itemsBought", 150, G, "Boutique Owner's Dream", "Buy 150 things."],
  ["outfit-5", "outfitsChanged", 5, B, "Quick Change", "Change your outfit 5 times."],
  ["outfit-60", "outfitsChanged", 60, S, "Mirror Time", "Change your outfit 60 times."],
  ["outfit-400", "outfitsChanged", 400, G, "Fashion Week", "Change your outfit 400 times."],
  ["day-1", "daysPlayed", 1, B, "Moved In", "Spend your first day in the city."],
  ["day-7", "daysPlayed", 7, B, "One Week In", "Play on 7 different days."],
  ["day-30", "daysPlayed", 30, S, "Month of Daydaze", "Play on 30 different days."],
  ["day-100", "daysPlayed", 100, G, "Hundred Days", "Play on 100 different days."],
  ["day-365", "daysPlayed", 365, P, "Full Lap Around the Sun", "Play on 365 different days."],
  ["wave-1", "wavesSent", 1, B, "Hi There", "Wave at another player."],
  ["wave-50", "wavesSent", 50, S, "Friendly Face", "Wave 50 times."],
  ["wave-500", "wavesSent", 500, G, "Mayor of Hello", "Wave 500 times."],
  ["chat-1", "chatsHad", 1, B, "Small Talk", "Have a chat with a neighbor."],
  ["chat-40", "chatsHad", 40, S, "Chatterbox", "Have 40 chats."],
  ["chat-300", "chatsHad", 300, G, "Knows Everyone", "Have 300 chats."],

  // Secrets
  ["secret-1", "secretsFound", 1, S, "Curious", "Find a hidden spot in the city.", true],
  ["secret-5", "secretsFound", 5, G, "Sharp Eyes", "Find 5 hidden spots.", true],
  ["secret-15", "secretsFound", 15, P, "Nothing Gets Past You", "Find 15 hidden spots.", true],
  ["secret-wreck", "carWrecks", 100, G, "Demolition Darling", "Wreck cars 100 times.", true],
  ["secret-jail", "arrests", 100, P, "Cell Block Celebrity", "Get arrested 100 times.", true],
  ["secret-s", "gradesS", 100, P, "Too Good", "Earn 100 S grades.", true],
  ["secret-fish", "fishRare", 100, P, "The One That Didn't Get Away", "Catch 100 rare fish.", true],
  ["secret-farm", "cropsHarvested", 10000, P, "Farm Folklore", "Harvest 10,000 crops.", true],
  ["secret-wave", "wavesSent", 2000, G, "Wave Machine", "Wave 2,000 times.", true],
  ["secret-night", "nightMiles", 2000, P, "Never Sees the Sun", "Drive 2,000 miles after dark.", true],
  ["secret-karaoke", "karaokeSongs", 1000, P, "They Had to Cut the Power", "Sing 1,000 karaoke songs.", true],
  ["secret-chase", "chasesEscaped", 100, P, "Getaway Driver Hall of Fame", "Shake 100 police chases.", true],
  ["secret-day", "daysPlayed", 1000, P, "Founding Resident", "Play on 1,000 different days.", true],
];

export const ACHIEVEMENTS: readonly Achievement[] = ROWS.map(
  ([id, stat, atLeast, tier, title, description, secret]) => ({
    id,
    title,
    description,
    hidden: secret === true,
    tier,
    when: { stat, atLeast },
  }),
);
