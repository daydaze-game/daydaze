# Daydaze 18+ tier: substance effects research

Compiled 2026-11-17 for game design (animation, post-processing, mood, hints).
All dose figures from PsychonautWiki are user-reported ranges, not recommendations;
they are given only so the game can model "light / common / strong" tiers.
Times are typical adult ranges; real people vary widely (weight, tolerance, food, batch).

Primary sources (cited per section by key):

- [PW-ALC] https://psychonautwiki.org/wiki/Alcohol
- [PW-CAN] https://psychonautwiki.org/wiki/Cannabis
- [PW-PSI] https://psychonautwiki.org/wiki/Psilocybin_mushrooms
- [PW-LSD] https://psychonautwiki.org/wiki/LSD
- [PW-MDMA] https://psychonautwiki.org/wiki/MDMA
- [PW-COC] https://psychonautwiki.org/wiki/Cocaine
- [PW-KET] https://psychonautwiki.org/wiki/Ketamine
- [PW-N2O] https://psychonautwiki.org/wiki/Nitrous
- [ADF-CAN] https://adf.org.au/drug-facts/cannabis/
- [ADF-COC] https://adf.org.au/drug-facts/cocaine/
- [ADF-KET] https://adf.org.au/drug-facts/ketamine/
- [ADF-MDMA] https://adf.org.au/drug-facts/mdma/
- [TS-KET] https://wiki.tripsit.me/wiki/Ketamine
- [CDC-EDIBLE] https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4584864/ (MMWR, Colorado edible death, 2014)
- [JHU-EDIBLE] https://cdn.clinicaltrials.gov/large-docs/95/NCT04931095/Prot_SAP_000.pdf (Johns Hopkins oral cannabis protocol; cites Schlienz 2020, Spindle 2018)
- [MEDSCAPE-BAC] https://emedicine.medscape.com/article/2090019-overview (ethanol level clinical stages)
- [WIKI-BAC] https://en.wikipedia.org/wiki/Blood_alcohol_content (NHTSA-style BAC table)
- [ROBERTS-2007] https://www.researchgate.net/publication/6118923 (Roberts & Robinson 2007, J Forensic Leg Med, PMID 17720590: carbonation/dilution and absorption)
- [HGN-ROMANO] https://physoc.onlinelibrary.wiley.com/doi/full/10.1113/JP273204 (alcohol gaze-evoked nystagmus, J Physiol 2017)
- [HGN-CITEK] https://cdn.ymaws.com/mcaa-mn.org/resource/resmgr/files/tsrp/Resources/Horizontal_Gaze_Nystagmus_Te.pdf
- [SWAY-2018] https://www.tandfonline.com/doi/abs/10.1080/15389588.2018.1423561 (BrAC and postural control)
- [HANGOVER-2020] https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7141232/ (Verster et al., updated hangover definition)
- [DRE-MATRIX] https://www.massdre.org/forms/Drug%20Matrix%202015.pdf and https://www.drugdetection.net/dre-matrix-drug-recognition-seven-categories.htm (police Drug Recognition Expert sign matrix: observable signs per drug class)
- [ELIM] https://www.bgsu.edu/recwell/wellness-connection/alcohol-education/alcohol-metabolism.html (BAC elimination ~0.015%/h; secondary source citing NIAAA)
- [LEMON] https://recovered.org/hallucinogens/psilocybin/lemon-tekking (lemon tek: user-reported only, no clinical data)
- [MDMA-WATER] https://mixmag.asia/feature/high-strength-ecstasy-pills-mdma-dangers-protection (Cranstoun advice: ~500 ml/h dancing, 250 ml/h resting)

---

## 1. Alcohol (beer / cocktail / shot)

### Timeline (oral) [PW-ALC] [ELIM] [ROBERTS-2007]

| Phase           | Time                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------- |
| Onset           | 2-5 min (warmth, first loosening)                                                                  |
| Come-up         | 15-45 min                                                                                          |
| Peak BAC        | 30-90 min after the last drink (faster on an empty stomach; 97% of fasted subjects peak by 75 min) |
| Offset          | BAC falls ~0.015%/h (range 0.010-0.020); one US standard drink (14 g) is cleared in ~1.3-2 h       |
| Total per drink | 1.5-5 h depending on amount                                                                        |
| Hangover        | Starts as BAC nears zero; up to ~20-24 h [HANGOVER-2020]                                           |

By drink type (game-relevant): a **shot** is concentrated (40% ABV); diluted drinks
are absorbed faster than neat spirits in 20/21 subjects, and a **carbonated mixer** sped
absorption in 2/3 of subjects [ROBERTS-2007]. So: shot = quick spike if chased by more; a
fizzy **cocktail** or highball = fast rise; **beer** = slower, bulkier, more steady rise (and
more bathroom trips). Food slows and lowers the peak. Nothing (coffee, cold shower)
speeds elimination.

### Dose progression (BAC) [MEDSCAPE-BAC] [WIKI-BAC]

- **0.02-0.03 (1 drink):** relaxed, slight warmth, mild euphoria, less shy; no visible coordination loss. Smooth eye tracking already slightly degraded [HGN-CITEK].
- **0.05 (2-3 drinks):** exaggerated behavior, louder, lowered inhibition, "usually good feeling", reduced small-muscle control (eye focus), worse judgment.
- **0.08-0.10:** balance, speech, vision, reaction time impaired; slurred speech starts ~0.10; flushing; many still feel "fine" (PW calls this "delusions of sobriety").
- **0.15:** gross motor impairment, major loss of balance, blurred vision, vomiting possible; euphoria fades, dysphoria begins.
- **0.16-0.20:** "sloppy drunk", nausea, anxious/restless mood.
- **0.25:** needs help walking, total confusion, vomiting. **0.30+:** loss of consciousness, alcohol poisoning (breathing depression).

### Perception / vision

- Real: **gaze nystagmus** (eyes jerk when looking sideways; onset angle moves closer to center as BAC rises, clearly measurable at 0.06) [HGN-ROMANO]; loss of smooth pursuit from ~0.02-0.04 [HGN-CITEK]; **blurred vision** at moderate-high BAC; **double vision** rising with dose [PW-ALC]; reduced peripheral awareness and slower visual tracking; muffled/slower processing of sound.
- Spinning room ("the spins") when lying down at high BAC: real, a vestibular effect of nystagmus.
- Myth/overstated: double vision at one or two drinks (it is a high-BAC effect); "beer goggles" is at most a small effect.

### Body & movement

- Low: looser posture, bigger gestures, louder laugh, leaning on things.
- Moderate: slower reactions, wider stance; standing sway is mostly unaffected below ~0.08 in larger studies [SWAY-2018], so visible sway is a 0.08+ effect.
- High: staggering, wide-based ataxic gait, overcorrecting steps, stumbling on obstacles/turns, slurred speech, drooping eyelids, flushed face, sweating, needs to sit/lean, head lolling, vomiting.
- Temperature: feels warm (peripheral vasodilation) while core temp actually drops.

### Mood & social

Disinhibited, chatty, flirty, louder, more confident; at higher doses irritable,
argumentative or weepy, repetitive speech, poor judgment; memory blackouts at high doses [PW-ALC].

### Comedown / hangover

Drowsiness and poor concentration dominate; headache, thirst/dry mouth, nausea, light and
noise sensitivity, fatigue, anxiety ("hangxiety"), sweating; up to ~20-24 h [HANGOVER-2020].

### Dangerous combos & hints

- With **GHB/GBL, benzodiazepines, opioids, ketamine, nitrous**: additive sedation, vomiting while unconscious, respiratory depression [PW-ALC].
- With **cocaine**: forms cocaethylene (extra heart strain); stimulants mask drunkenness so people drink more [PW-COC].
- With MDMA: more dehydration and overheating [PW-MDMA].
- Hints: "Alternate with water." "Eat first: food slows the rise." "Peak hits up to 90 minutes after your last drink." "Coffee doesn't sober you up; only time does." "Passed out? Recovery position."

---

## 2. Cannabis (smoked joint vs edible)

### Timeline [PW-CAN] [ADF-CAN] [CDC-EDIBLE] [JHU-EDIBLE]

| Phase         | Smoked joint                                  | Edible                                               |
| ------------- | --------------------------------------------- | ---------------------------------------------------- |
| Onset         | seconds-10 min                                | 20-60 min (up to 2 h)                                |
| Come-up       | 5-10 min                                      | 30-60 min                                            |
| Peak          | 15-45 min (felt ~10 min, blood peak 5-10 min) | 1-2 h per PW; controlled studies ~1.5-3 h; ADF 1-4 h |
| Total         | 2.5-5 h                                       | 4-10 h (some effects to 12 h)                        |
| After effects | 45-180 min (sleepy, foggy)                    | 6-12 h                                               |

Key gameplay truth: an edible's delay is the classic trap; people redose before it lands,
then get far higher than intended [CDC-EDIBLE]. Edible peak strength can be similar to
smoked but lasts much longer [JHU-EDIBLE].

### Dose progression (THC) [PW-CAN]

- Smoked: light 0.4-2 mg, common 2-4 mg, strong 4-10 mg. Edible: light 2.5-5 mg, common 5-10 mg, strong 10-25 mg.
- Light: relaxed, giggly, music/food enjoyment, mild time stretch, may sharpen focus.
- Common: munchies, dry mouth, red eyes, short-term memory gaps, wandering thoughts, body heaviness.
- Strong: couch-lock, dizziness, racing heart, anxiety/paranoia, "impending doom" possible, nausea (passes in 30-40 min), mild visual effects with eyes closed, sense of being pulled backward at extreme doses.

### Perception / vision

- Real: **red eyes** (dilated conjunctival vessels), light sensitivity, faint color enhancement, slight blur for some, time expansion ("a minute feels like ten"), enhanced music/taste/touch; **lack of convergence** (eyes cannot cross on a near target) and **eyelid tremors**; **no** horizontal nystagmus [DRE-MATRIX].
- Mild tracers/patterns only at high doses; hypnagogic imagery in the dark [PW-CAN].
- Myth: real hallucinations at normal doses; cannabis is not a psychedelic in that sense.

### Body & movement

- Relaxed, slumped or reclined posture; slow, deliberate walking; heavy eyelids, squinting, slow blinking.
- Partial motor loss rising with dose; full inability to walk is rare [PW-CAN]; body tremors possible [DRE-MATRIX].
- Gestures: giggling fits, rubbing/dabbing eyes, licking lips/drinking (cotton mouth), snacking, staring at objects/hands, zoning out mid-sentence, sinking into sofas.
- Heart rate up (blood pressure down), occasionally feeling cold or dizzy on standing.

### Mood & social

Giggly, mellow, chatty-then-quiet, introspective; amplifies whatever mood is present;
at high dose self-conscious, paranoid, withdrawn. Smoked in a group: passing, laughing, snacking.

### Comedown

Sleepiness, mild fog, hunger; edible "hangover" grogginess into next morning [PW-CAN].

### Dangerous combos & hints

- With **alcohol** (drinking first then smoking): nausea, spins, vomiting ("greening out") [PW-CAN].
- With **psychedelics**: intensifies trips, raises panic/paranoia risk [PW-CAN].
- With **stimulants**: anxiety, racing heart [PW-CAN].
- Hints: "Edibles take up to 2 hours. Don't take another one yet." "Start low, go slow." "Panicking? Sit, breathe, have a snack and some water; it passes." "Weed then drink is gentler than drink then weed."

---

## 3. Psilocybin mushrooms (tea)

### Timeline [PW-PSI] [LEMON]

| Phase         | Eaten dried        | Tea / lemon tek (user reports) |
| ------------- | ------------------ | ------------------------------ |
| Onset         | 20-45 min          | ~10-30 min                     |
| Come-up       | 1-1.5 h            | shorter, more abrupt           |
| Peak          | 2-2.5 h            | stronger, earlier              |
| Offset        | 2.5-3.5 h          |                                |
| Total         | 6-8 h              | ~3-6 h                         |
| After effects | 4-24 h (afterglow) | similar                        |

Tea/lemon tek effects are anecdotal; no clinical study confirms them [LEMON]. Tea is also
commonly reported to cause less nausea than chewing dried caps.

### Dose progression (dried P. cubensis) [PW-PSI]

- Light 0.5-1 g: brighter colors, giggles, sharper vision, mild body buzz, sociable.
- Common 1-2.5 g: breathing/drifting surfaces, color shifting, closed-eye patterns, deep emotion, time distortion, waves of intensity every 20-60 min.
- Strong 2.5-5 g: open-eye geometry, morphing scenery, confusion, language difficulty, ego loss possible; need to lie down.
- Heavy 5 g+: full hallucinatory states, ego death; not something to do in a club.

### Perception / vision

- Real [PW-PSI]: saturated colors; **breathing, drifting, morphing surfaces** (walls, floors, wood grain, foliage); color tinting/shifting; slight haze; **tracers and afterimages**; depth/perspective distortion; recursion; organic, smooth, flowing geometry (more natural/earthy than LSD); hallucinations mostly in the dark and at high doses. Time dilation. Sound feels richer.
- Myth: seeing fully realistic people/pink elephants at normal doses; most effects are distortions of real things, and people know they are on a drug.

### Body & movement

- **Excessive yawning with watery eyes** (signature), dilated pupils, nausea in the come-up, body heaviness/sedation in the first half, warm "body glow", tingling, runny nose, frequent urination, muscle twitches [PW-PSI].
- Movement: slow, wandering, stopping to stare and touch textures; sitting or lying down in nature; hugging self or wrapping in blankets; giggling fits; unsteady when the room "breathes" at high doses.

### Mood & social

Emotional, giggly, awe-struck, introspective, spiritual/connected; confusion more often than
with LSD; come-up "impending doom" feelings that usually pass; language can fail at high doses [PW-PSI].
Usually less social than MDMA; small groups and nature.

### Comedown

Gentle; catharsis and calm afterglow up to ~24 h; tired [PW-PSI]. Tolerance halves in ~3 days.

### Dangerous combos & hints

- **Lithium**: seizure risk, strictly avoid; **tramadol**: seizures [PW-PSI].
- **Cannabis**: can tip a trip into panic [PW-PSI]. **Stimulants**: anxiety, thought loops.
- Hints: "Set and setting: be somewhere calm with people you trust." "Wait two hours before thinking about more." "A bad moment passes; change the music, change the room." "Go easy on weed while tripping."

---

## 4. LSD (tab)

### Timeline (sublingual) [PW-LSD]

| Phase         | Time                                  |
| ------------- | ------------------------------------- |
| Onset         | 15-30 min (some report up to 60 min)  |
| Come-up       | 45-90 min                             |
| Peak          | 3-5 h                                 |
| Offset        | 3-5 h                                 |
| Total         | 8-12 h                                |
| After effects | 12-48 h (often can't sleep for 10+ h) |

### Dose progression [PW-LSD]

- Light 15-75 µg ("microdose" to half-tab): energy, brighter colors, giggles, enhanced music, mild visuals.
- Common 75-150 µg (one typical tab ~100 µg): drifting/breathing surfaces, color shifting, tracers, geometry on surfaces, time distortion, deep thought connections.
- Strong 150-300 µg: dense fast geometry, scenery transformations, ego loss, thought loops, déjà vu.
- Heavy 300+: overwhelming geometry, delusions, white void possible.

### Perception / vision

- Real [PW-LSD]: very bright, "radiant" colors; sharper acuity; **drifting (melting, breathing, flowing) surfaces**; color shifting; **tracers** behind moving objects/hands; afterimages; depth/perspective distortion; recursion; symmetrical texture repetition; **intricate, fast, sharp-edged, colorful, "digital" geometry** (more synthetic than mushrooms); hallucinations less common than visual distortion.
- Sound: tinny/"alien" sound, flanging, echo, reverb at higher doses; music feels more meaningful.
- Time: hours feel like days or vanish.
- Myths: frequent fully realistic hallucinations; "people think they can fly" (urban legend); LSD "stays in your spine" (false). Flashbacks/HPPD exist but are rare.

### Body & movement

- **Energetic**, urge to walk, explore, climb, dance (unlike mushrooms' heaviness) [PW-LSD].
- **Dilated pupils**, yawning in the come-up, mild jaw tension/teeth grinding, muscle twitches, goosebumps/tingling, body lightness, sweating or chills, cold hands, nausea for some.
- Gestures: staring at hands, waving hands to watch tracers, touching textures, laughing fits, wide eyes, stopping mid-walk to look at something.

### Mood & social

Curious, creative, philosophical, laughter fits; some anxiety/paranoia possible; very long
day, so people get tired of socializing late in the trip.

### Comedown

Long tail: wired-but-tired, can't sleep, slight stimulant-like comedown; next day usually fine [PW-LSD].

### Dangerous combos & hints

- **Lithium**: psychosis/seizures; **tricyclics**; **tramadol** [PW-LSD].
- **Cannabis**: can intensify into panic. **Stimulants**: anxiety, thought loops.
- Hints: "It lasts 8 to 12 hours: start early." "One tab is plenty; it can take 90 minutes." "Stuck in a loop? Change rooms, drink water, find a friend."

---

## 5. MDMA (molly)

### Timeline (oral) [PW-MDMA] [ADF-MDMA]

| Phase         | Time                                                                   |
| ------------- | ---------------------------------------------------------------------- |
| Onset         | 30-45 min (ADF: 20 min-1 h)                                            |
| Come-up       | 15-30 min (the "rush": tingles, nausea, nervous energy)                |
| Peak          | 1.5-2.5 h                                                              |
| Offset        | 1-1.5 h                                                                |
| Total         | 3-6 h                                                                  |
| After effects | 12-48 h; low mood can last up to a week (often called "Tuesday blues") |

### Dose progression [PW-MDMA]

- Light 20-80 mg: warm, talkative, mild stimulation.
- Common 80-120 mg: full empathy and euphoria, music feels amazing, jaw clenching, sweating, dilated pupils.
- Strong 120-150 mg+: intense gurning, eye wiggles, more heat and sweating, confusion; at heavy doses hallucinations, anxiety, vomiting, overheating, seizures risk [ADF-MDMA].

### Perception / vision

- Real [PW-MDMA]: **nystagmus ("eye wiggles")** at higher doses, blurring vision; strongly **dilated pupils** and light sensitivity; brighter, glowier colors (neon/glow sticks especially); mild tracers; music and touch intensely enhanced; time compression (the night flies).
- Not a psychedelic: geometry/hallucinations are uncommon and mainly at toxic doses.

### Body & movement

- **Jaw clenching and teeth grinding ("gurning")**, chewing gum, lip/cheek biting [PW-MDMA] [ADF-MDMA].
- **Urge to dance**, rhythmic swaying, restless energy, involuntary shakes/shivers, reduced hand steadiness.
- **Touchy-feely**: hugging, stroking hair, rubbing own arms/skin, enjoying fabrics, massages.
- Hot, **sweating**, thirsty, dry mouth, flushed; nausea during come-up; little appetite; trouble urinating.
- Face: huge pupils, wide smile, gurning jaw, eye wiggle.

### Mood & social

Signature: **empathy, affection, openness**, euphoria, talkative, "I love you all", music
appreciation, anxiety drops [PW-MDMA]. Compulsive redosing urge late in the night.

### Comedown

Tired, low, irritable, anxious, poor concentration, poor sleep and vivid dreams; 1-3 days,
sometimes up to a week [PW-MDMA] [ADF-MDMA].

### Dangerous combos & hints

- **SSRIs/SNRIs, MAOIs, DXM, tramadol, other serotonergic drugs**: serotonin syndrome [PW-MDMA] [ADF-MDMA].
- **Alcohol**: dehydration and overheating. **Cocaine/stimulants**: heart strain, weaker MDMA effect. **GHB**: sudden unconsciousness.
- Two opposite dangers: **overheating** and **drinking too much water (hyponatremia)**.
- Hints: "Sip water: about 500 ml an hour if dancing, less if resting; not more." "Take breaks to cool down." "Wait two hours before redosing, or better, don't." "Confused and vomiting isn't always dehydration; get medical help." [MDMA-WATER]

---

## 6. Cocaine (insufflated bump / line)

### Timeline (insufflated) [PW-COC] [ADF-COC]

| Phase         | Time                                                                     |
| ------------- | ------------------------------------------------------------------------ |
| Onset         | 3-10 min                                                                 |
| Come-up       | 5-12 min (initial rush 5-10 min)                                         |
| Peak          | ~7-16 min after onset; main effect ~15-30 min                            |
| Offset        | 10-25 min                                                                |
| Total         | ~10-90 min (ADF: about 90 min)                                           |
| After effects | crash and cravings within the hour; comedown days (irritable, exhausted) |

### Dose progression [PW-COC]

- A "bump" ~10-30 mg (light): alert, confident, chatty for ~30-45 min.
- A "line" ~30-60 mg (common): rush, euphoria, ego boost, fast talking, jaw tension.
- Strong 60-90 mg+: jittery, anxious, racing heart, grinding jaw, shaky hands, paranoia, irritability; prolonged use: tactile hallucinations ("coke bugs").

### Perception / vision

- Real: **dilated pupils** and light sensitivity; heightened alertness; time compression; numb nose/throat/front teeth [PW-COC]. Essentially **no visual distortions** at normal doses.
- Myths: superhuman strength (it's confidence, not strength); being "sharper" (focus drops at higher doses).

### Body & movement

- **Sniffing, nose rubbing/touching, runny or red nose**, wiping nostrils, tilting head back; occasional nosebleed [PW-COC] [DRE-MATRIX].
- **Restless, fidgety**, rapid gestures, foot tapping, pacing, fast walk, upright and puffed-up posture; jaw clenching (less than MDMA); eyelid and body tremors; exaggerated reflexes; rigid muscles [DRE-MATRIX].
- Hot and sweaty but cold hands (vasoconstriction); dry mouth; no appetite; frequent bathroom trips (also a social cliché).
- Face: wide pupils, intense stare, clenched jaw, rapid speech.

### Mood & social

Talkative (often talking over people), overconfident, euphoric, flirty/libido up; turns
irritable, anxious, argumentative or paranoid as doses stack; strong urge to redose (more than other common stimulants) [PW-COC] [ADF-COC].

### Comedown

Fast crash as each dose fades: flat mood, anxiety, irritability, cravings; next day
exhausted, low, mood swings; days of "come down" [ADF-COC].

### Dangerous combos & hints

- **Alcohol**: cocaethylene (more cardiotoxic), and you drink more because you feel sober [PW-COC] [ADF-COC].
- **MDMA / other stimulants**: heart strain, heart attack risk. **Opioids/GHB**: sedation takes over as coke wears off.
- **Psychedelics/cannabis**: paranoia.
- Hints: "Don't share straws or notes." "Every bump fades in about half an hour; the craving is the drug talking." "Coke plus booze is harder on your heart than either alone." "Chest pain is an emergency."

---

## 7. Ketamine (insufflated; sub-hole vs k-hole)

### Timeline (insufflated) [PW-KET] [ADF-KET] [TS-KET]

| Phase         | Time                                                            |
| ------------- | --------------------------------------------------------------- |
| Onset         | 1-3 min (ADF: 5-15 min)                                         |
| Come-up       | 5-15 min                                                        |
| Peak          | 15-45 min                                                       |
| Offset        | 30-60 min                                                       |
| Total         | 1-2 h (main effect ~1 h)                                        |
| After effects | 2-12 h; coordination and senses may be off up to 24 h [ADF-KET] |

### Dose progression [PW-KET] [TS-KET]

- Light 10-30 mg (party bump, sub-hole): drunk-like disinhibition, floaty, numb, wobbly, mild detachment, music feels 3D.
- Common 30-75 mg: clear dissociation, double vision, slurred/slow speech, robotic movement, time distortion, wants to sit.
- Strong 75-150 mg: heavy disconnection; **k-hole** often above ~100 mg insufflated [TS-KET]: can't move or talk meaningfully, out-of-body/void experiences, while appearing unresponsive.
- K-hole people are usually conscious inside, not asleep; they come back in ~30-60 min.

### Perception / vision

- Real [PW-KET]: **double vision** (common at moderate doses); **nystagmus** at higher doses (horizontal and vertical) [DRE-MATRIX]; reduced acuity and blur [ADF-KET]; **frame-rate suppression** (choppy, stuttering vision); perspective distortion (things look far away, rooms stretch, tunnel-like); scenery slicing; at k-hole doses holes/voids/tunnels with a white glow, internal scenes.
- Sound distorts and feels distant; spatial disorientation (getting lost is a real risk).

### Body & movement

- **Ataxia**: wobbly, wide or stiff stepping, overcautious/high-stepping gait (police DRE note "moon walking" for this class), arms out for balance, bumping into things; "sit down before it hits" [PW-KET] [DRE-MATRIX].
- **Numb** body, especially hands/feet; heavy, slow or rigid movements; slumping, sitting or lying very still at higher doses.
- **Blank stare**, cyclic/repetitive behavior, incomplete answers, slurred speech, non-communicative [DRE-MATRIX].
- Drooling/salivation, nausea near peak, sweating, raised blood pressure [PW-KET].

### Mood & social

Low dose: giggly, chill, disinhibited, "floaty". Higher: withdrawn, detached, hard to talk to,
introspective or confused; k-hole: alone in their head [PW-KET].

### Comedown

Short: groggy, clumsy, foggy, memory gaps for a few hours; next day memory loss, poor
judgment, irritability, aches [ADF-KET]. Some report a mood afterglow.

### Dangerous combos & hints

- **Alcohol, GHB/GBL, opioids, benzos**: vomiting while unconscious, breathing problems [PW-KET] [ADF-KET].
- **Stimulants**: higher blood pressure; walking around while dissociated causes injuries.
- Hints: "Sit down before it hits." "Mixing K with drink is how people choke on vomit." "Small bumps; wait for each one to land." "If a friend k-holes, keep them seated, safe and on their side if they vomit."

---

## 8. Nitrous oxide (balloon)

### Timeline (inhaled) [PW-N2O]

| Phase           | Time                          |
| --------------- | ----------------------------- |
| Onset + come-up | 5-10 s                        |
| Peak            | 15-30 s                       |
| Offset          | 1-5 min                       |
| Total           | 1-5 min                       |
| After effects   | 15-30 min (possible headache) |

### Dose progression [PW-N2O]

- One small balloon (~8 g charger): tingling, rushing euphoria, laughter, muffled/phasing sound, dizziness.
- 2-5 chargers (strong): blurred-to-blackout vision, deep dissociation, body melting/stretching, strong sound distortion.
- Heavy: ego dissolution and amnesia ("I was gone"), static geometric walls (interlocking circles).

### Perception / vision

- Real: **rhythmic, pulsing sound distortion** (phaser/flanging, pitch shift, echo, stuttering; the "wah-wah" effect) and muffled outside sound; **blurred vision**, double vision, vision "freezing" (frame-rate suppression), tunnel/near-blackout at stronger doses [PW-N2O].

### Body & movement

- **Sudden loss of balance**: people fall over, so they sit (standing balloon use is a classic injury) [PW-N2O].
- Numb, tingling limbs; body feels light or stretched; slack face; then **uncontrollable laughing**.
- Gestures: sitting, holding balloon to lips, deep inhale/exhale, eyes unfocused, slow-motion head bob, burst of giggles, "whoa" recovery in a minute.
- Repeated use: B12 depletion, numbness/tingling, walking problems (nerve damage) [PW-N2O].

### Mood & social

Giggly, euphoric, dreamy, briefly detached; social as a group ritual; very short.

### Comedown

Back to baseline in minutes; light headache or dizziness; lingering fog at high doses [PW-N2O].

### Dangerous combos & hints

- **Alcohol, GHB, opioids**: sudden unconsciousness and vomiting [PW-N2O].
- Hypoxia: never from a bag over the head or straight from a tank; take breaths of air between hits.
- Hints: "Sit down before you inhale." "Breathe normal air between balloons." "Never straight from the canister: it's freezing cold." "Lots of balloons, often? It eats your B12."

---

## Cross-substance animation notes (observed-sign summary from DRE matrix + PW)

| Sign                                               | Who shows it                                                                                        |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Horizontal gaze nystagmus (eyes jerk at side gaze) | alcohol, ketamine/dissociatives, nitrous; MDMA "eye wiggles" at high dose                           |
| Lack of convergence (can't cross eyes)             | alcohol, ketamine, cannabis                                                                         |
| Dilated pupils                                     | MDMA (marked), cocaine, LSD, psilocybin                                                             |
| Red eyes                                           | cannabis (strong), alcohol (later)                                                                  |
| Jaw clench / grinding                              | MDMA (strong), cocaine, LSD (mild)                                                                  |
| Sniffing / nose rubbing                            | cocaine, ketamine (insufflated)                                                                     |
| Yawning + watery eyes                              | psilocybin (strong), LSD come-up                                                                    |
| Giggling fits                                      | cannabis, nitrous, mushrooms, LSD                                                                   |
| Unsteady gait                                      | alcohol (stagger), ketamine (robotic/stiff/high-step), nitrous (sudden fall), cannabis (slow, mild) |
| Energized / dancing                                | MDMA, cocaine, LSD                                                                                  |
| Sedated / slumped                                  | cannabis (couch-lock), ketamine, high-dose alcohol, mushrooms (first half)                          |
| Sweating / heat                                    | MDMA, cocaine, LSD (impaired thermoregulation)                                                      |
| Touching skin, hugging                             | MDMA                                                                                                |
| Blank stare                                        | ketamine, nitrous, high-dose alcohol                                                                |

---

## Other nightlife candidates (not researched in depth)

- **Poppers (alkyl nitrites):** sniffed from a small bottle; ~1-2 min head rush, flushing, warmth, muscle relaxation, giggles; danger with Viagra-type drugs (blood pressure crash). Very common in queer nightlife; fits the sapphic/club setting.
- **GHB/GBL ("G"):** dosed in drinks; euphoric, sexy, drunk-like; extremely narrow dose margin, deadly with alcohol; also the drink-spiking drug, which is a sensitive theme.
- **2C-B:** club psychedelic, ~4-6 h; MDMA-like body plus colorful visuals; mellower than LSD.
- **Mephedrone (4-MMC/3-MMC):** MDMA/cocaine-like stimulant popular in Europe; short, strong redosing urge.
- **Amphetamine ("speed"):** long-lasting stimulant, 4-8 h, all-night dancing, jaw clench, no appetite.
- **Nicotine (cigarettes, vapes):** ubiquitous outside clubs; head rush, calmer, smoking-area social spot (no real brands).
- **Caffeine / energy drinks:** legal stimulant; good for the 13+ tier too.
- **Benzodiazepines (e.g. alprazolam):** used for comedowns; sedation, amnesia, dangerous with alcohol and opioids.
- **DMT (vaped):** 10-15 min, intense breakthrough visuals; niche, not a club drug.
- **Mescaline / San Pedro:** long (10-12 h) psychedelic; festival/desert vibe rather than club.
- **Kava:** legal, mildly relaxing, social "kava bar" option, numbing mouth.
- **CBD / low-THC drinks:** legal, mild; good filler for a cannabis dispensary.
- **DXM:** dissociative cough syrup; uncommon in nightlife; serotonin risk with MDMA.
- **Salvia divinorum:** brief, overwhelming, generally disliked; probably skip.
