# Daydaze: Vision and Decisions

Daydaze is a multiplayer open-city game for adults: a GTA-style city to drive, explore and get into trouble in, full of glam places to dress up and hang out with people. It is made to entertain grown-ups, not to recreate the kids' games its players grew up on (that nostalgia framing was dropped on 2026-11-17). The game is rated for 13 and older, with separate 18+ servers for adult content.

The name is a mix of daydream, a buzzed daze, and "the good old days".

## The one-line pitch

GTA meets IMVU: an open city you drive, explore and get into trouble in (GTA), where you dress up and hang out with people in glam 3D spaces (IMVU). GTA leads.

## The GTA feel

The city is the game, not a hallway between rooms. It should feel alive, a little dangerous and unpredictable:

- Things happen without you: city-wide events like heists in progress, police chases, blackouts and storms, at different times and places, so every visit can turn into a story.
- Driving is central: your own car, traffic, street races, cruising the strip at night.
- Trouble has consequences: police, getting caught, City Jail.
- Secrets reward exploring: hidden spots, after-hours parties you have to track down.
- Guns only in game zones and in your own home.
- Repeating scheduled shows (fireworks, the Pride parade) stay rare so they don't wear out; variety beats frequency.

## Who it is for

- Adults, and older teens on the 13+ servers, who want an open city to mess around in with friends and strangers.
- Not for children under 13 (no accounts under 13, so no COPPA data from children).

## What it feels like

- An adult social nightlife hangout in the spirit of IMVU and Habbo: lounges, clubs, bars, VIP rooms, dressed-up avatars, neon interiors, people posing and chatting.
- Maximalist: dense, layered scenes, rich color, ornament, glow and constant small ambient motion.
- Avatars are glamorous people with natural-looking faces and customizable features, hair, bodies, clothes, and optional makeup. Start with an understated face; bold liner, eyeshadow, glossy lips, and platform shoes are style choices. Never use the name or logo of the doll brand that inspired them (it is a trademark of MGA Entertainment).
- Players should be able to make a likeness of themselves across facial features, natural skin tones and undertones, hair textures, and body builds. Hair, eyes, makeup, and clothing colors accept the full RGB range; skin stays within a natural palette. The dressing room isolates the character in a neutral studio for editing.
- Places to hang out plus a variety of minigames, with the open city tying them together.
- Pet lions and a subtle lion theme are optional and low priority.
- Subtle mango references wherever they fit.
- No AI-generated dialogue.

## Age tiers

Decided 2026-10-26 (replaces the 16+ main world of 2026-10-14):

- 13+ servers (the default): the whole city and its games, dress-up, pets, sports, nightlife venues as dance clubs. Bars serve mocktails and sodas; no alcohol, no drunk effects, no weed, shrooms or 18+ venues. Teen safety applies: chat filter, block, mute and report, moderation.
- 18+ servers: the same city plus alcohol with drunk effects, Green Haze (weed and shrooms), the strip club and the other 18+ venues. Suggestive, no nudity. Only age-checked players 18 and older can join; under-18s can never join an 18+ server, so teens never share chat or rooms with 18+ content.
- Age confirmation is deferred. When it ships: birthdate entered at signup and locked, stored only on the server; under 13 cannot create an account; 18+ servers unlock on the player's 18th birthday.
- Rule: no 18+ content (alcohol, drugs, 18+ venues) reaches real players before the age check and 18+ servers ship; until then it stays behind the development flag.
- Drinks, venues and brands in the game are made up; no real alcohol or tobacco brands.

## Platform

- Web game.
- Multiplayer on Cloudflare Workers, Durable Objects and D1. See `docs/specs/2026-10-14-online-foundation-design.md`.
- $0 hosting until real players arrive. Expected scale is 50 to 500 concurrent players at first.
- The owner is building this as a passion project for fun, without a profit goal. Include assets offered for noncommercial projects when their specific terms permit the game's intended use and customization.
- Anonymous guest play, plus optional accounts.
- Coins and purchases stay client-owned until trading or online leaderboards exist.

## Renderer: 3D (decided 2026-10-14)

Two throwaway prototypes of the same neon lounge were compared: 3D in the style of IMVU, and 2D in the style of Club Penguin and Fantage. The 2D version was polished but felt too flat, so Daydaze is 3D:

- React Three Fiber and three.js world, orbit camera, click-to-walk.
- Human avatars built from the MakeHuman base in `art/doll/blender/`, with natural-looking faces, tintable hair and outfits, and optional painted makeup. Downloaded hairstyles and accessories complement the reproducible Blender assets.
- Minigames may stay as 2D overlays launched from the 3D world.
- The network protocol moves from 2D `x, y, heading` to a 3D position and rotation.

## World scenery (decided 2026-11-14)

The city is another world: alluring, glamorous and fantastical, with a sense
of discovery from the first arrival view. Ordinary interchangeable apartment
blocks, Sims-like suburbia and toy-like Roblox scenery miss the target.
Every street needs its own recognizable composition of architecture, heights,
rooflines, greenery and focal points. Color changes and shop signs alone are
not enough. Use high-quality 3D scenery and retain distinct silhouettes in the
distant skyline. The owner permits customizing free downloaded assets,
searching for more, and creating bespoke scenery in Blender; search existing
free assets first. The initial art direction is a celestial garden city (see
`docs/specs/2026-11-14-dream-city.md`).

## What came from Club Lion

- `src/net/`: the network protocol and room server, with tests.
- `src/audio/`: procedural Web Audio synthesis (shared audio bus, instruments, jukebox), with tests. Sound files are allowed too (owner, 2026-10-26) where synthesis falls short: ambience, effects, voices.
- `art/doll/`: the layered 2D doll art (skin-tone bases, hair, brows, lips, makeup, clothes, jewelry) and its browser compositor (`art/doll/compositor.html`).
- `docs/specs/`: the online foundation design.
