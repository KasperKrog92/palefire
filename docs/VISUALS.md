# Optional visuals for Palefire

Palefire works fully without bitmap art: campaigns and scenes without images get a
deterministic night-sea gradient (see `src/components/cover.ts`), and the app icon is
generated procedurally. If you want real artwork, generate the images below and import
them through the app (campaign editor → cover image, scene editor → background image) —
imported files are copied into `%APPDATA%/com.palefire.app/images/` automatically, so
there is no need to place files in the repo.

A consistent prompt style keeps the app feeling handcrafted. Shared style suffix for
all prompts:

> muted painterly realism, late-night colour palette of deep blue-greys with one warm
> amber light source, soft film grain, quiet and melancholic, no people in focus, no
> text, no logos

## Campaign cover — The Night Ferry

- **Use as:** cover image of The Night Ferry campaign
- **Aspect:** 16:9, at least 1280×720
- **Prompt:** A mid-century car ferry seen from the quay at night, dark water, a single
  warm lit row of cabin windows reflected in the harbor, sodium lamps in fog, distant
  green starboard light, *(style suffix)*

## Scene backgrounds (16:9, ≥1280×720)

| Scene | Prompt seed |
| --- | --- |
| Boarding at Værtinge | wet asphalt quay at night, gangway lit by one caged bulb, queue of silhouetted foot passengers with old suitcases, closed café window still glowing |
| Setting Out | coastline lights shrinking across black water seen from a ferry stern rail, wake glowing faintly, low fog bank ahead |
| The Saloon After Midnight | empty ferry dining saloon, long table set with extra places, brass lamps, condensation on dark windows, a deck of cards mid-game |
| The Car Deck | enclosed ferry car deck in green-white fluorescent light, lashed vehicles, one car-shaped tarpaulin darker than the rest, chains and drips |
| The Radio Room | cramped 1970s ship radio room, warm valve glow, reel-to-reel tape, cold coffee, a single lit frequency dial in the dark |
| The Other Shore | ferry bow doors opening onto a dawn terminal in thin rain, gulls returning, pale gold light on wet steel |

## Archive portraits (optional, 1:1 or 4:5)

- **The Purser:** elderly ship's purser at the top of a gangway holding a green
  cloth-bound ledger, warm lamplight from below, face kind and unreadable
- **Agnes Vinter:** elderly woman in a grey wool coat in a ferry saloon seat, empty
  brass birdcage on her lap, looking toward the window
- **Lukas Brandt:** young radio officer asleep-awake at his station, headphones half
  on, valve glow, cold coffee

Keep subjects slightly turned away or shadowed — the campaign's tone prefers faces
that are almost legible.
