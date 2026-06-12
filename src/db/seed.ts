import { execute, select } from "./db";
import { archive, audioFiles, campaigns, logbook, presets, scenes, settings } from "./repo";
import type { ArchiveCategory } from "../types";

/**
 * Seeds the example campaign, "The Night Ferry", on first launch.
 * The built-in ambience loops referenced here ship with the app (public/audio).
 */
export async function seedIfEmpty(): Promise<void> {
  if ((await settings.get("seeded")) === "1") return;
  const [{ n }] = await select<{ n: number }>("SELECT COUNT(*) AS n FROM campaigns");
  if (n > 0) {
    await settings.set("seeded", "1");
    return;
  }

  /* ------------------------------ sound library ------------------------------ */
  const sound = async (name: string, file: string) => audioFiles.create(name, `builtin:${file}`);

  const engineHum = await sound("Engine Hum", "engine-hum.wav");
  const seaSwell = await sound("North Sea Swell", "north-sea-swell.wav");
  const rainSteel = await sound("Rain on Steel", "rain-on-steel.wav");
  const cabinDrone = await sound("Cabin Drone", "cabin-drone.wav");
  const radioStatic = await sound("Radio Static", "radio-static.wav");
  const dockWind = await sound("Dock Wind", "dock-wind.wav");

  /* -------------------------------- campaign --------------------------------- */
  const campaignId = await campaigns.create({
    title: "The Night Ferry",
    description:
      "The MS Aurelia makes the crossing every night, whether or not anyone needs to be carried. " +
      "Eight hours, quay to quay. She has never been late, and she has never arrived early, " +
      "and her passengers do not always disembark the way they boarded.",
    cover_image: null,
  });

  /* --------------------------------- presets --------------------------------- */
  const preset = async (
    name: string,
    description: string,
    fadeIn: number,
    fadeOut: number,
    layers: { file: number; volume: number }[]
  ) => {
    const id = await presets.create({
      campaign_id: campaignId,
      name,
      description,
      fade_in_ms: fadeIn,
      fade_out_ms: fadeOut,
    });
    await presets.setLayers(
      id,
      layers.map((l) => ({ audio_file_id: l.file, volume: l.volume, loop: 1 }))
    );
    return id;
  };

  const pDeparture = await preset(
    "Departure",
    "The gangway, the last cars, the terminal lights going small.",
    4000,
    3000,
    [
      { file: dockWind, volume: 0.6 },
      { file: seaSwell, volume: 0.3 },
    ]
  );
  const pUnderWay = await preset(
    "Under Way",
    "The ship at night, in open water. Nothing is wrong yet.",
    3500,
    3500,
    [
      { file: engineHum, volume: 0.7 },
      { file: seaSwell, volume: 0.45 },
    ]
  );
  const pSaloon = await preset(
    "The Saloon After Midnight",
    "Warm light, empty chairs, a kettle that is always just off the boil.",
    3000,
    3000,
    [
      { file: cabinDrone, volume: 0.55 },
      { file: engineHum, volume: 0.35 },
    ]
  );
  const pCarDeck = await preset(
    "The Car Deck",
    "Steel, fluorescence, things shifting under tarpaulins.",
    2500,
    2500,
    [
      { file: engineHum, volume: 0.85 },
      { file: cabinDrone, volume: 0.3 },
      { file: rainSteel, volume: 0.2 },
    ]
  );
  const pRadioRoom = await preset(
    "The Radio Room",
    "Someone is broadcasting. The frequency is not on the chart.",
    3000,
    2500,
    [
      { file: radioStatic, volume: 0.6 },
      { file: cabinDrone, volume: 0.35 },
    ]
  );
  const pStorm = await preset(
    "Storm Crossing",
    "The strait remembers what it is owed.",
    2000,
    4000,
    [
      { file: seaSwell, volume: 0.8 },
      { file: rainSteel, volume: 0.65 },
      { file: dockWind, volume: 0.5 },
      { file: engineHum, volume: 0.4 },
    ]
  );

  /* --------------------------------- archives --------------------------------- */
  const entry = (
    category: ArchiveCategory,
    title: string,
    tags: string,
    body: string
  ) => archive.create({ campaign_id: campaignId, category, title, body, tags, image: null });

  const ePurser = await entry(
    "character",
    "The Purser",
    "crew, knows-your-name",
    `He greets every passenger by name at the top of the gangway, including the ones travelling under names they have not used in years.

His ledger is bound in green cloth. The left-hand pages record tonight's crossing. The right-hand pages are already filled in, in the same hand, slightly smudged, for crossings that have not happened yet.

**If asked about it:** he closes the ledger, gently, the way you'd close a door to a room where someone is sleeping.

> "We carry everyone eventually, sir. The schedule only decides the order."`
  );

  const eAgnes = await entry(
    "character",
    "Agnes Vinter",
    "passenger, recurring, birdcage",
    `An elderly woman in a grey wool coat, always in seat 14F of the forward saloon, always with an empty birdcage on her lap.

The crew do not remember her boarding. The crew do not remember a crossing without her.

She is kind, lucid, and very good at card games. She will speak about anything except what the cage used to hold — and she watches the bow doors during docking with an attention that is not curiosity.

*She tips the bar steward in coins that stopped circulating in 1961. The steward keeps them in a separate jar.*`
  );

  const eRadioOfficer = await entry(
    "character",
    "Lukas Brandt, Radio Officer",
    "crew, radio-room",
    `Young for the job, or looks it. Drinks his coffee cold because he forgets it, every time, mid-sentence.

Lukas logs every transmission the Aurelia receives. Most are routine: traffic control, weather, the terminal at Sundholm. Some are from ships that were scrapped decades ago, transmitting in calm, procedural voices, asking for their berths.

He answers those too. He says it would be rude not to.

**What he wants:** someone to sit with him at 03:12, when the regular one comes through. He has never heard it end.`
  );

  const eAurelia = await entry(
    "location",
    "MS Aurelia",
    "ship, home-base",
    `Built 1971 at a yard that no longer exists, for a route that no longer appears on maps. Eleven decks, two bars, one cinema that plays the same film with small differences.

She is warm, well-kept, and quietly wrong in ways that resist photography. Corridor B is longer after midnight. The lifeboats number eighteen or nineteen, depending on who counts. The engine's pitch changes exactly once per crossing, and the crew go quiet when it does.

The Aurelia is not hostile. Several passengers have the distinct impression she is *protective* — the way a lantern is protective, by deciding how far the dark may come.`
  );

  const eVaertinge = await entry(
    "location",
    "Værtinge Terminal",
    "harbor, departure",
    `The departure harbor. Sodium lights, wet asphalt, a café that closes as the ferry boards, as if its only purpose is to be recently closed.

The ticket office prints tickets for the night crossing on older paper stock than the day crossings. Nobody at the counter can say why, or will.

The foot passengers queue in silence. Most of them have the look of people who have packed for longer than the crossing takes.`
  );

  const eStrait = await entry(
    "location",
    "The Strait",
    "open-water, rules",
    `Eight hours of black water between Værtinge and Sundholm. Charted depth: contested.

Fog arrives on no schedule the meteorologists can defend. In the fog there are sometimes lights that pace the ship, keeping perfect station off the beam — too steady for fishing boats, too patient for anything else.

The crew's advice, given freely and only once: *you may look at the lights, but do not let the lights notice you counting them.*`
  );

  const eCrew = await entry(
    "faction",
    "The Crew of the Aurelia",
    "crew, keepers",
    `Courteous, unhurried, permanently understaffed on paper and never in practice. They keep the schedule with a devotion that is not quite professionalism.

The crew know the ship's habits the way farmers know weather. They do not explain. Explanation, the bosun says, is a kind of counting.

**They will protect passengers** — quietly, and within the rules — but the schedule comes first. The schedule keeps something else, and they all know it.`
  );

  const eAuthority = await entry(
    "faction",
    "The Harbor Authority",
    "shore, paperwork",
    `The Authority issues the crossing's paperwork: manifests, berthing orders, tide tables. Its offices in Værtinge are open odd hours; its stamps are always slightly warm.

Lately it has been issuing tickets it has no record of printing — correct in every particular, for passengers it cannot find in any register. The Authority files these under *Miscellanea, Recurring* and asks no further questions, because the last clerk who asked was transferred, and his transfer paperwork was also correct in every particular.`
  );

  const eRules = await entry(
    "note",
    "Rules of the Crossing",
    "gm, table-reference",
    `The three quiet rules. Reveal them in play, never as a list:

1. **Do not count the lifeboats twice.** The second count is an invitation to be corrected.
2. **If the corridor is longer than it was, walk it anyway.** It is longer because something is being kept out of your way.
3. **The bar closes when the engine changes pitch.** Last orders are last orders. The steward will not serve after, and you should not want him to.

Breaking a rule is never instantly fatal. The ship simply becomes *less protective*, and the night becomes more attentive.`
  );

  await entry(
    "note",
    "Running the Tone",
    "gm, tone",
    `The Night Ferry is melancholy, not horror. Aim the dread low and slow.

- Prefer *almost* to *is*: the cinema's film is almost the same film. The coffee is almost warm.
- No jump scares. The ship does not startle; it **notices**.
- Let the players be comfortable. Warmth is what makes the wrongness legible.
- Every NPC wants something small and human: cold coffee company, a fourth for cards, someone to hear the 03:12 broadcast end.
- The crossing always arrives. What arrives with it is the question.`
  );

  /* ---------------------------------- scenes ---------------------------------- */
  const scene = async (
    title: string,
    presetId: number | null,
    notes: string,
    links: number[]
  ) => {
    const id = await scenes.create({
      campaign_id: campaignId,
      title,
      notes,
      preset_id: presetId,
      background_image: null,
    });
    await scenes.setLinkedEntries(id, links);
    return id;
  };

  const s1 = await scene(
    "Boarding at Værtinge",
    pDeparture,
    `Sodium light, wet asphalt, the café just closed. The Purser waits at the top of the gangway and greets each passenger **by name** — including names the players haven't given.

- Tickets are on the old paper stock. None of them list a return crossing.
- A dockworker recoils from the rail without explaining why.
- Agnes Vinter is already aboard. Nobody saw her board.

**Hook:** as the bow doors close, every gull on the quay goes silent at once.`,
    [ePurser, eVaertinge, eAgnes, eAuthority]
  );

  await scene(
    "Setting Out",
    pUnderWay,
    `The terminal lights go small, then doubtful, then gone. The players find their cabins; let them settle, order a drink, meet the night.

- Corridor B's room numbers run 12, 14, 15, 14a. The steward apologises for "the old numbering."
- The cinema is showing *The Crossing* (1958). Tonight, the lighthouse keeper's coat is blue. Last week it was certainly grey.
- First sight of the lights off the beam, if the fog allows.

*Keep this scene warm. It is the last fully ordinary hour.*`,
    [eAurelia, eStrait, eCrew]
  );

  await scene(
    "The Saloon After Midnight",
    pSaloon,
    `The forward saloon, 00:40. The long table is laid for **two more places than there are passengers awake**. The steward will not remove the extra settings; the kettle is always just off the boil.

- Agnes deals cards and asks gentle, surgical questions about who the players left ashore.
- The extra settings get used at some point when nobody is describing the room. Cutlery moved, a glass clouded.
- The engine's pitch has not changed yet tonight. The steward keeps checking his watch.`,
    [eAgnes, eAurelia, eRules]
  );

  await scene(
    "The Car Deck",
    pCarDeck,
    `Fluorescent half-light, lashing chains, the hull breathing somewhere below. Among the vehicles: a covered car that appears on no manifest. The tarpaulin is wet. The deck is enclosed.

- Water dripping from the tarp tastes of salt. Nothing aboard should.
- The shape beneath is car-sized, but the tarp settles wrong after each roll of the ship — a half-second late.
- The bosun, if fetched: reads the manifest twice, goes still, and says "We carry it every crossing. Leave it lashed."`,
    [eAurelia, eCrew, eRules]
  );

  await scene(
    "The Radio Room",
    pRadioRoom,
    `03:05. Lukas Brandt waves the players in, pours coffee nobody will drink, and shows them the log: a mayday, recorded clean as studio tape, from a ship lost in 1947. The timestamp on the recording is **tomorrow morning**.

- At 03:12 the regular broadcast begins. Calm voice, procedural, asking for a berth that doesn't exist.
- Lukas has never heard the broadcast end. If the players keep him company, tonight it ends — with their names in the sign-off.
- The engine changes pitch the moment the transmission stops. The bar, below, is closing.`,
    [eRadioOfficer, eAurelia, eRules]
  );

  await scene(
    "The Other Shore",
    pStorm,
    `The strait turns. Rain on steel, lines moaning, the Aurelia steady as a held breath. Then, all at once, calm water and the lights of Sundholm — or a terminal that calls itself that this morning.

- The disembarking queue is shorter than the boarding queue. Nobody comments. The Purser's ledger balances anyway.
- Agnes remains aboard, cage on her lap. "I'm carried on," she says, "not across."
- On the quay, a café is just opening. The players' tickets, checked now, list tonight's **return crossing** after all.

*End on the gangway: dawn, gulls returning one by one, and the Aurelia already taking on fuel for tonight.*`,
    [ePurser, eAgnes, eStrait]
  );

  await campaigns.setActiveScene(campaignId, s1);

  /* ---------------------------------- logbook --------------------------------- */
  await logbook.create(
    campaignId,
    "Session zero. The table agreed on slow dread, no gore, warmth before wrongness. " +
      "Mira's character boards with her brother's ashes; Tomas plays a sales rep who has made this crossing 'dozens of times' and is lying."
  );

  await settings.set("seeded", "1");
  await execute("UPDATE campaigns SET updated_at = datetime('now') WHERE id = ?", [campaignId]);
}
