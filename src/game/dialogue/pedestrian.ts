// Handwritten lines for the people walking the city's sidewalks, keyed by
// situation: passing small talk (greeting-first, tapped, idle, goodbye), the
// dazed, annoyed line she says once she is back on her feet after your car
// knocked her down (action-knocked-down), and a bystander's gasp when she
// sees someone hit (action-saw-hit; game/city/streetKnocks.ts). Nobody is
// ever hurt for real: the game is 13+. Read through `pickLine`, never
// directly.

import type { RoleBank } from "./types.ts";

export const pedestrianBank: RoleBank = {
  "greeting-first": [
    "Oh, hi! Lovely day for a walk, isn't it?",
    "Hey! Sorry, I'm walking and looking at my phone. Bad habit.",
    "Hello! You heading downtown too?",
    "Hi there. I like your outfit, by the way.",
    "Morning! The bakery on the corner just put out fresh rolls.",
    "Hey, {name}! Fancy running into you here.",
    "Oh! Hi. I almost walked right into you.",
    "Hello! It's a good day to be out, isn't it?",
    "Hi! Watch the uneven bit of sidewalk up ahead.",
    "Hey there, neighbor.",
    "Evening! The streetlights make everything look like a movie.",
  ],
  tapped: [
    "Yes? Oh, did I drop something?",
    "Need directions? I know this neighborhood pretty well.",
    "Hi! I'm just on my way to meet a friend.",
    "Can I help you? I've got a minute.",
    "Hmm? Sorry, I had my headphones in.",
    "The beach? Just keep heading south, you'll smell it first.",
    "If you're looking for food, follow the crowd. It never lies.",
    "You again! Small city, huh?",
    "Oh, hey. Love your hair, by the way.",
    "What's up, {name}?",
    "I'm walking off a very big lunch. Don't mind me.",
  ],
  idle: [
    "I could walk this city all day and still find new things.",
    "Ten thousand steps, here I come.",
    "Somebody's playing music on that balcony again. I love it.",
    "The traffic's wild today. I'll stick to my feet, thanks.",
    "I keep meaning to try that noodle place.",
    "I think that pigeon has been following me for three blocks.",
    "Every shop window in this street is a whole mood.",
    "Okay, which way was the park again?",
    "I should've worn the comfy shoes. Lesson learned.",
    "Nothing beats a walk with nowhere to be.",
    "Is it just me, or are the crosswalk lights getting faster?",
  ],
  goodbye: [
    "Okay, see you around!",
    "Bye! Enjoy your walk.",
    "Take care, {name}!",
    "Gotta keep moving, I'm running late. Bye!",
    "Nice running into you. See you on the next block!",
    "Bye now! Stay on the sidewalk, the drivers are wild today.",
    "Later! Say hi to the pigeons for me.",
    "See you! Have a good one.",
    "Off I go. Bye!",
    "Catch you later!",
  ],
  "action-knocked-down": [
    "Ow. Okay. I'm fine. Were you even looking at the road?",
    "Hey! That's a sidewalk, not a parking spot!",
    "Whoa, my head's spinning. Slow down, would you?",
    "Did you seriously just drive into me? Unbelievable.",
    "I'm okay, I'm okay. No thanks to you!",
    "You could at least honk first! Ugh, my knees.",
    "That's it, I'm taking the bus from now on.",
    "Watch where you're driving! People walk here!",
    "Seeing stars. Little ones. Thanks a lot.",
    "Do you have your license, or did you win it somewhere?",
    "Wow. Okay. I'm getting up. Very slowly. Very annoyed.",
    "My shoes! I just got these! Drive like a person!",
  ],
  "action-saw-hit": [
    "Oh my gosh! Are they okay?",
    "Whoa! Did you see that?",
    "Hey! Somebody check on them!",
    "Oh no, oh no, oh no.",
    "That car came out of nowhere!",
    "Yikes! Are you alright over there?",
    "Somebody call somebody!",
    "Whoa, they're getting up. Thank goodness.",
    "Did that car just hit someone?",
    "Slow down! People walk here!",
    "I saw that! I'm a witness!",
  ],
};
