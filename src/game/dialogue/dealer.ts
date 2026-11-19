// Handwritten lines for the corner regular on Downtown's avenue, keyed by
// situation. At 13+ she is just someone who hangs out and watches the street;
// the lines tagged `tier: "adult"` are what she says on 18+ servers, where she
// sells weed (src/game/city/dealer.ts). Read through `pickLine`, never
// directly.

import type { RoleBank } from "./types.ts";

export const dealerBank: RoleBank = {
  "greeting-first": [
    "Hey, new face. I'm on this corner most afternoons, come say hi.",
    "Oh, hi! Pull up a bit of sidewalk, the people-watching is free.",
    "Welcome to the avenue. I know every pigeon by name, ask me anything.",
    "Hey there. If you need directions, I'm basically a walking map.",
    "Hi! Don't mind me, I'm just here soaking up the street.",
    "New in town? The best tacos are two blocks that way, trust me.",
    "Hello, stranger. Nice shoes. Nobody on this corner has better taste.",
    "Hey! Stay a minute. The traffic show is better than any movie.",
    "Hi, friend. I'm usually here, leaning on this exact spot.",
    "Oh, a new one! Welcome. The corner's quiet today, enjoy it.",
    "Hey you. Looking for something to do? Everything's walkable from here.",
    {
      text: "Hey, I'm Dex. If you're looking for something to unwind with, I've got a little of everything.",
      when: { tier: "adult" },
    },
    {
      text: "Psst, over here. Friendly stuff only: joints, vapes, edibles. Take a look.",
      when: { tier: "adult" },
    },
  ],
  tapped: [
    "Just counting clouds. Fourteen so far, a personal best.",
    "You know the bus is always late at this stop? Always.",
    "This corner gets the best sunset, no joke. Come back around six.",
    "I once saw a parade go by here. Marching band and everything.",
    "People-watching is a real hobby. I'm very serious about it.",
    "See that building? The roof has a secret garden. Allegedly.",
    "Got any good music? I'm always collecting songs for the walk home.",
    "The city never gets boring, you just have to stand still long enough.",
    "I keep a tally of every orange car that passes. Today's at nine.",
    "Funny how a corner can feel like a living room if you stay long enough.",
    "If it rains, the awning two doors down is the best shelter.",
    {
      text: "Take your time. Anything on the list is fair, and I never rush a friend.",
      when: { tier: "adult" },
    },
    {
      text: "Sativa for chatting, indica for the couch, edibles if you're patient. What's the mood?",
      when: { tier: "adult" },
    },
    {
      text: "Cheaper than the shop, better than the gas station. That's the deal.",
      when: { tier: "adult" },
    },
    {
      text: "Different stock every day. If you don't see it, check back tomorrow.",
      when: { tier: "adult" },
    },
  ],
  idle: [
    "Watching a pigeon argue with a paper bag. It's winning.",
    "Somebody's wind chime is playing the same three notes. I love it.",
    "The crosswalk timer is my favorite kind of suspense.",
    "A stroller just went by with a very serious baby in sunglasses.",
    "Humming a song I can't name. It'll come to me eventually.",
    "The streetlights flicker on one at a time. I never get tired of that.",
    "Some days the whole avenue smells like fresh bread. Today's one.",
    "A skateboard just rolled by with nobody on it. Mystery of the day.",
    "I'm timing how long the red light lasts. Forty seconds, give or take.",
    "Leaning here until someone interesting walks by. That's the whole plan.",
    "Every window on that block has a plant in it. Good neighborhood.",
  ],
  goodbye: [
    "Catch you later! I'll be right here, same corner.",
    "Take care out there. The avenue's friendly if you are.",
    "See you around, friend. Say hi to the pigeons for me.",
    "Bye for now! Come back when you want to chat.",
    "Walk safe. The crosswalk guy is a little slow, be patient.",
    "Later! Don't be a stranger. I'm not hard to find.",
    "Off you go. Bring me a good story next time.",
    "Bye! The sunset's soon, you'll want to be outside for it.",
    "Take it easy. I'll keep your spot on the corner warm.",
    "See you, friend. Mind the bikes, they don't brake.",
    "Go on, have a good one. I'll be here counting clouds.",
    {
      text: "Pace yourself, friend. Start low, go slow, and drink some water.",
      when: { tier: "adult" },
    },
  ],
};
