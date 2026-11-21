// Handwritten lines for the city's drivers, keyed by situation: rolled-down
// window small talk (greeting-first, tapped, idle, goodbye) and the shout out
// the window after their car knocks the player down because she stepped out
// too close to stop for (action-hit-walker, game/city/carHits.ts). Shaken
// and annoyed, never cruel: she always gets back up. Read through
// `pickLine`, never directly.

import type { RoleBank } from "./types.ts";

export const motoristBank: RoleBank = {
  "greeting-first": [
    "Hey! You need the road or just saying hi?",
    "Oh, hi. Light's red, so I've got a minute.",
    "Morning! Mind the bumper, it's newer than the rest of the car.",
    "Hello there. Don't worry, I'm parked. Mostly.",
    "Hi! You look like you know where the good parking is.",
    "Evening! You picked a busy corner to stand on.",
    "Hey, {name}! Didn't see you there. Kidding, I always check.",
    "Hi. If you're selling something, I already have two air fresheners.",
    "Oh! Hello. You startled me, but in a polite way.",
    "Hey there, sidewalk friend.",
    "Hi! Is this your street? It's a nice one.",
  ],
  tapped: [
    "Yes? Make it quick, the light's about to change.",
    "Need directions? I only know the way to my job and the beach.",
    "You're tapping on my window. That's new.",
    "What's up? I'm all ears, and a little bit of road rage.",
    "Can I help you? I've got snacks in the glove box, no promises.",
    "Hi again. Still here, still stuck in traffic.",
    "If you're looking for a ride, the cabs are the yellow ones.",
    "Hmm? Sorry, the radio was loud. Say that again?",
    "Don't lean on the mirror, it folds the wrong way.",
    "You want the scenic route or the fast one? I only do fast.",
    "Go ahead, {name}, I'm listening.",
  ],
  idle: [
    "Every light on this avenue is red the second I get to it.",
    "I swear the buses are bigger than they were last year.",
    "Somebody honked at me for going the speed limit. Rude.",
    "I've been circling this block for parking for ten minutes.",
    "This car makes a noise when I turn left. I've decided it's singing.",
    "Downtown traffic builds character. That's what I tell myself.",
    "Green means go, people! It's not a suggestion!",
    "I love this city. I do not love driving in it.",
    "Somebody painted the crosswalks again. They look great.",
    "If I see one more scooter cut me off, I'm writing a strongly worded song.",
    "The jeepneys always get the best paint jobs. I'm jealous.",
  ],
  goodbye: [
    "Light's green, gotta go! Stay off the asphalt!",
    "See you around. Look both ways, okay?",
    "Bye! Don't stand in the road, it's a whole thing.",
    "Take care, {name}. Sidewalks are your friend.",
    "Off I go. Wish me luck with parking.",
    "Later! Wave if you see me stuck at the next light.",
    "Bye now. Cross at the corner, the drivers expect you there.",
    "Gotta run, somebody behind me is honking.",
    "See you! And thanks for not leaning on my mirror.",
    "Have a good one. Mind the curb on your way.",
  ],
  "action-hit-walker": [
    "Whoa! Are you okay? You stepped right out in front of me!",
    "Hey! I couldn't stop that fast! Watch where you're walking!",
    "Oh no, oh no. You're up? Okay. Look before you step out next time!",
    "What were you thinking? Cars don't stop on a dime, you know!",
    "Are you hurt? No? Then use the crosswalk, please, my heart!",
    "You came out of nowhere! I hit the brakes as hard as I could!",
    "Hey! The road is for cars! Sidewalk, sidewalk, sidewalk!",
    "I'm so sorry, but also, seriously, look both ways!",
    "Easy, easy. Can you stand? Good. Now please don't do that again.",
    "You okay down there? You scared the life out of me!",
    "I was barely going the limit and still couldn't stop! Be careful!",
    "Ugh, my coffee's everywhere. Are you alright, at least?",
  ],
};
