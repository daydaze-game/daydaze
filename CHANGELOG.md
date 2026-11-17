# Changelog

All notable changes to Daydaze are recorded here, in the
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format, summarized
from the Conventional Commits history. Dates are commit dates; no versions
are released yet. Until the first release, the newest work (2026-11-10 on)
sits under [Unreleased] and older history is grouped by month instead of by
version.

## [Unreleased]

### Added

- Dev tools: an in-game dev panel in development builds (press `` ` `` while
  running `npm run dev`). It shows FPS, draw calls, triangles, memory, light
  and object counts and the camera position. It has switches for wireframe,
  a free camera, a grid and axes, half resolution and pause, and jumps to any
  room, minigame or club night. A live hour slider and event triggers cover
  fireworks, the parade, Pride night and dance-offs. You can teleport, and
  shift+click picks an object with an outline. An inspector edits the
  object's transform, visibility and material, and a searchable scene tree
  browses the scene. Render controls cover exposure, fog, field of view and
  each light. It also takes PNG screenshots, hands out coins, dumps the save
  and logs online WebSocket frames. Sections fold, the panel drags, and its
  state is remembered. Production builds exclude it entirely.
- Walking: she strolls in her chosen walk style and hurries into a jog on long
  trips. Start, stop and turn clips play over the walk, and Space jumps in the
  city (others see the jump too).
- Streets: a street kit from the Downtown City MegaKit adds crosswalks,
  corners, center lines, manholes and drains. Road and sidewalk wear works at
  three scales, the sidewalks are warm concrete slabs, and the avenue under
  the El is worn.
- Night lighting: lamp halos and headlight pools; lit shop boards spill
  colored light onto the wall and pavement; traffic and your car brighten with
  the night.
- Nature: stylized street trees, palms, birches and maples, livelier lawns,
  tall dune grass, and butterfly flocks over the park, Larkspur Forest and the
  garden.
- Districts: shop lots from the Ultimate Textured Building Pack line the
  streets of Little Manila, Chinatown, Koreatown and the Arts District, each
  with a named shop board. Block yards, alleys, infill rows and mixed roofs
  fill the empty blocks.
- Vending machines: snack machines along the avenues and soda machines in
  Skyline Supply, Player 2 and the Boardwalk Arcade, with made-up brands.
- Interiors: House Interior Pack furniture in the haunted escape hall, the
  jail, Glow Bowl and more; Bread pack trays and pies in the bakeries and the
  farmers market.
- Rivals: tag-game rivals are clothed Universal Base Characters that read in
  laser tag's dark.
- Seats: sit and stand transitions ease onto chairs, plus seated emotes, clap
  and cheer.
- Gestures and reactions: 17 conversation clips, plus flinches, trips, falls
  and get-ups.
- Dance: a breaking, uprock and footwork pack, a grouped Dance picker and
  dancing venue crowds.
- Karaoke: the songbook grows to 72 public-domain songs in 19 genres, with
  year and composer.
- Club nights: night decor in the rooms, mall-rave lasers and confetti
  cannons, UV-night blacklight, and a stargazing sky with the Milky Way and
  shooting stars.
- Camera: a portrait lens that centers her face when zoomed in, swings round
  to her front and comes down to eye level. Keyboard zoom is added.
- HUD: the dock's contextual actions fold into one pill and a More actions
  menu.
- Showroom: saloon and concept-car showpieces in Daydaze Motors.
- Waterfront: an offshore fleet at Starboard Marina and on Beachside's
  horizon; sun beds, umbrellas and towels at the water park and hotel
  rooftop.
- Aquarium: eight more fish species and a lit tank with caustics and light
  shafts.
- Kiddie Land: a toy steam train east of the fairground.
- Art and food: paintings in Gallery 44 and as home print looks, Filipino
  dishes on the Little Manila counters, museum pieces, a boodle-table feast,
  posters and Daydaze merch.

### Changed

- City events: fireworks now run hourly and the parade every 90 minutes.
- Performance: the city overview draws less undergrowth and fewer props.
  Furniture models fetch only when first needed, and plan reloads reuse
  known buildings. Far boxes drop out sooner, and shaders link off the main
  thread in production. More panels load lazily.

### Removed

- The fireworks and parade countdowns on the city HUD.

### Fixed

- City: no skyline ring over the sea. The sea, ground and fog run past the
  far plane, with grass beyond the city's edge, and asphalt no longer
  z-fights.
- Doll: skin no longer shows through clothing at bent knees or close cloth,
  and hair shine follows the strand texture.
- Seats: you walk up to a seat from the front or side, and changing chairs
  stands you up first.
- The El: riders board once the doors open, even after a slow frame, and the
  station stairs no longer block shop doors.
- Taxis start up the street, past a corner, not inside it.
- Driving keeps pace on slow devices.
- A part that fails to load shows a Reload card instead of a blank page, and
  a failed painting or model drops out instead of blanking the room.
- Games end only when their panel really closes.
- The event calendar scrolls.

## 2026-11

Work from 2026-11-01 to 2026-11-09.

### Added

- Doll: vitiligo, birthmarks and a monolid eye option. Hijab, head wrap and
  turban styles, bindi and hearing aids. A wheelchair walk style, prosthetic
  legs, and a plus-size figure that every outfit and hair follows.
- Hair: 22 hair-card styles (12 long and tied, 10 short) with low-poly twins
  and closet tiles, plus refitted short cuts (buzz, shaved sides, edges).
- Animation: clip packs with 278 baked clips per skeleton (Mixamo and CC0
  Quaternius). Idle rotation, sit joins, an emote row and talking gestures.
  The walk is a brisk 2.6 m/s.
- Boardwalk: an Ocean City-style boardwalk with pastel storefronts, weathered
  deck planks, a continuous row of shops and joggers. Palm Court has pastel
  motels with neon VACANCY signs.
- City life: a far crowd, cyclists and kiosks. A dog park, a farmers market,
  street-food trucks and carts, and club queues. Hail a taxi with a fare by
  distance. Seasonal dressings (fairy lights, a Plaza tree, pumpkins,
  lanterns, autumn leaves). Wood benches.
- Cars: downloaded car bodies for traffic, your car and the dealership, plus
  curb-parked cars.
- Zoo: tigers, a woods habitat with bear and elk, a Labrador to adopt, a
  blue whale offshore and park wildlife.
- Places: Orbit 9, a space-station club on Gallery Row; the Starlight yacht
  with a hot tub; Larkspur Forest; the park band shell; Clay Day pottery;
  Petal & Stem florist with a bouquet builder; and a community garden with
  plots to grow.
- Mermaid Cove: animated mermaids that swim, lounge and sing, and shells for
  Siren Song.
- Home: apartment furniture from the Quaternius interior packs, furniture
  looks, wall pieces and TVs that show a picture.
- Food: modeled food in the grocery store and restaurants; rebuilt sushi and
  ramen interiors with counter curtains.

### Changed

- Performance: window panes, sills and lane paint merge into one mesh; static
  kinds are baked; restaurant curtains are instanced. The mermaid skeleton is
  cut from 956 bones to 174, the vendor cart is decimated, and hair styles
  shrink to 13.7 MB. Painted faces are shared, and late-streamed shaders
  compile ahead of time.

### Fixed

- Mermaids no longer stand in a T-pose; the parade and deck strollers keep to
  the open deck lane; string lights are round bulbs on a cord; ground textures
  sample by world position; the museum keeps the picked exhibit across a
  remount; low-detail cars look richer.

## 2026-10

### Added

- Foundation (2026-10-14):
  - Pure, tested game logic: looks and moods, versioned saves, walkable
    floors, portals, rooms.
  - A Cloudflare Worker with Durable Objects and a D1 schema: PBKDF2
    passwords, rate limits, a chat filter, origin checks, a strict
    Content-Security-Policy, reports, blocks and admin bans.
  - A reconnecting browser client.
- First places: the Plaza night street, a lounge, the Amusement Park with
  rideable rides and a midway, the Water Park with slides and swimsuits, and
  the Speedway with racing and bumper cars.
- Minigames: Bassline (a DJ rhythm game), Mango Mixology at the bar, Gem Glam
  match-three, Star Siege, Throwback Trivia, Skee-Ball, Ramen Rush, Sushi
  Catch, curling, a zoo photo hunt and feeding time, a jet-ski race,
  volleyball, cliff dives, speed slides, water-gun battles, a laser-tag
  target range, a Filipino cook-off, a haunted-house escape and karaoke.
  Most are played in the world, not in a dialog, with prizes, personal bests
  and daily challenges.
- The city: a streamed city with neighborhoods (Downtown, Nightlife Row,
  Beachside and its pier, Little Manila, the Arts District, Chinatown and
  Koreatown, Uptown and its park, Suburbia and the Fairground). It has
  traffic with lights, people on the sidewalks, a map with fast travel and a
  venue directory, jeepneys, a night market, fireworks, a Pride parade, bus
  rides and the El.
- Venues:
  - Clubs: Pulse with its dance-offs, The Violet Hour, the Skylark, Sugar
    Rush, Bassline, the Karaoke Loft, La Noche and the Back Room.
  - Shops, food and culture: Skyline Supply, the Starlight Galleria,
    100 food venues with menus and courier orders, Kamayan Hall and the
    Museo.
  - Sports: Glow Bowl, Lagoon Links, the Dome, Seaside Stadium, the Gridiron,
    the Courtside Club, the ice rink and the Roller Disco.
  - Leisure: the aquarium, the zoo, Starboard Marina and Mermaid Cove.
  - The Arts District: Player 2, Photon Zone, Loft Studios, Gallery 44,
    Vinyl Vault, Thrift Temple and Espresso Lab.
  - More: the Midnight Horn, Cellar 214, Lune, Sucre and Dog-Ear Books.
- Doll: a 3D doll built in Blender from a CC0 base, with a full character
  creator for face, body, makeup and piercings. Strand and sculpted hair,
  freckles and glasses, outfits, swimsuits and shoes. Walk styles and
  motion-capture dances. Men get their own doll with masculine builds, cuts,
  beards and menswear. The doll is rigged on Mixamo's skeleton with baked
  clips.
- Life sim: a coins wallet, shops and wardrobe ownership, an apartment with
  furniture, shoplifting with arrests, jail and bail, Crazy Eights, a photo
  album, closet sets and a sticker book.
- Cars: drive your own car with 12 road cars, gas stations, rims, underglow,
  tint and wraps, a horn, radio and headlights, plus a dealership and garage.
- Online play (behind `?online=1`): see other players and their dances,
  seats, cars and buzz. Mute, block and report; friends, parties, invite
  links and ride-alongs. Hugs, held hands and slow dances, duets, apartment
  visits, sign-up and cloud saves, room copies, admin moderation and a strict
  chat filter.
- Events: Pride night in the clubs and weekly club nights with music, glow,
  NPC talk and a calendar.
- Age tiers: a 13+ content gate, so drinks and 18+ venues exist only behind
  the adult check; 13+ menus and mocktail lines.
- World: day and night on the player's clock, real wall materials and
  weathering, street trees and furniture, New York facade bays and fire
  escapes, Uptown Park with a pond and boat, animated zoo and aquarium
  animals, pets to adopt, swimming and a reef dive, Sunny Acres Farm and a
  race-day Speedway oval.
- Audio: procedural Web Audio with room music, ambience and footsteps, plus
  generated and recorded sound files.
- Profiles: optional pronouns from a fixed list, and a first-visit walkthrough
  with starter looks.
- A service worker caches the game for return visits.

### Changed

- Performance:
  - Instanced decor and batched statics cut the Plaza to 162 draw calls.
  - Scenes, panels, motion capture and NPC lines load lazily.
  - Far-off dolls get low-poly twins.
  - The game is a third faster to playable, with a lighter city and a
    cheaper high tier.
  - The low tier never downloads full-detail trees.

### Fixed

- A Sparkles shader NaN no longer blacks out the high-tier canvas.
- Walking and driving keys stay out of open dialogs and text fields.
- Hair no longer breaks into specks, and feet plant with a walking pace that
  fits the mocap.
- Animated animals stand on their idle pose and free their resources on
  unmount.
- Cloud saves load before syncing and flush before logout.
- Slurred chat stays within the chat limit.
- The apartment and jail stay solo online.
