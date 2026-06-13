import { execute, select } from "./db";
import { archive, campaigns, settings } from "./repo";
import type { ArchiveCategory } from "../types";

type SeedEntry = {
  category: ArchiveCategory;
  title: string;
  tags: string;
  body: string;
};

const entries: SeedEntry[] = [
  {
    category: "character",
    title: "Captain Maren",
    tags: "crew, captain, navigation, knows-things",
    body: `Maren has been at the helm long enough that nobody aboard agrees on her age. Her face is weathered, her voice is steady, and she has learned how to say difficult things without making them smaller.

She navigates by reading the water. This involves the color beneath a wave, the rhythm of spray against the glass, and instincts she does not explain. Her headings are given with total confidence. She is occasionally wrong, and the ferry quietly corrects for her.

Maren knows things about passengers that she should not know. She offers this knowledge gently, as if mentioning weather that may affect their plans.

She is patient with frightened people and impatient with people pretending not to be frightened. Her coffee is black. The cup is often full, though nobody sees her refill it.

### At the table

- Maren can point toward a truth without explaining it.
- She never gives a complete account of the ferry.
- Her mistakes should make her human, not incompetent.
- Her log is kept in a script that seems to be several languages at once.`,
  },
  {
    category: "character",
    title: "Bosun Halvard",
    tags: "crew, bosun, skeptic, charts, vessel",
    body: `Halvard is responsible for the physical truth of the ferry: ropes, hull, deck, fittings, weather seals, and everything else that ought to obey ordinary rules. He keeps the ship sound with professional pride and a devotion he would deny if named.

Not knowing their position bothers him in a practical way. A man responsible for a vessel should know which waters hold it. He keeps private charts covered in corrections, tide notes, doubtful coastlines, and terse remarks about landmarks that appeared twice.

His argument with Captain Maren about navigation has continued for years. Neither is winning. Both are often right about different things.

Halvard is kind to fear and blunt with theatrics. He accepts the uncanny without granting it dignity. This refusal to perform awe is one of the most reassuring things aboard.

### At the table

- Halvard can explain what should be happening.
- He notices material changes before anyone else.
- Genuine wonder from him means the sea has exceeded even his experience.`,
  },
  {
    category: "character",
    title: "Chief Engineer Elin",
    tags: "crew, engineer, notebooks, engines, investigation",
    body: `Elin keeps the ferry's engines running. By any reasonable mechanical assessment, they should have failed years ago. She has theories about why they have not, and the current theory is on its fifth revision.

She is precise, curious, and dryly funny once she has decided someone can follow the joke. Below deck she seems entirely at home. In the lounge she sits where she can hear the engine through the floor.

Her notebooks are cross-referenced records of wave behavior, compass anomalies, impossible weather, sounds below the waterline, and changes in fuel consumption that do not correspond to distance traveled. The evidence is careful. The conclusions remain open.

Elin gives the most coherent answers aboard because she distinguishes observation from interpretation. This can be comforting. It can also make the strangeness harder to dismiss.

### At the table

- Elin can provide facts without solving the mystery.
- She asks passengers to witness, measure, listen, or hold something steady.
- Her notebooks should contain contradictions she has not erased.`,
  },
  {
    category: "character",
    title: "The Ferry Cat",
    tags: "crew, cat, uncertain, open-thread",
    body: `The crew may have a cat.

There is a bowl near the galley that is cleaned every morning. Halvard complains about paw prints on newly painted surfaces. Elin once recorded a warm weight crossing an engine-room sensor where no person could have walked. Captain Maren says only that every proper vessel has something aboard that knows the way home.

Passengers glimpse a dark shape turning a corner or feel an animal settle against their legs beneath a table. Descriptions do not agree. Some insist the cat is grey, some black, some white around the face. One passenger may see it clearly while the person beside them sees nothing.

Do not decide too quickly whether it exists. If it appears, let it behave exactly like a cat.`,
  },
  {
    category: "location",
    title: "Nox Trajectus",
    tags: "ship, ferry, home-base, vessel",
    body: `The ship's formal name is **Nox Trajectus**, the Night Crossing or Night Transit. The name appears on old manifests, on the bell near the helm, and in faded lettering across the stern.

Everyone calls it the Night Ferry. People who have never read the name still seem to know it.

The vessel is the size of a working coastal passenger ferry. Its design suggests the middle of the twentieth century without belonging cleanly to any decade. It is maintained where maintenance matters and allowed to age where age is harmless. The paint is clean. The engines are tended. The lounge carpet has been replaced more than once.

Its ownership, registry, flag, and port of origin do not remain consistent. Any document found aboard looks credible until someone tries to trace it.

The Night Ferry is a real working ship. Its coffee is real. Its schedules matter. The strangeness is not a performance and the crew are not guides at an attraction.`,
  },
  {
    category: "location",
    title: "Passenger Lounge",
    tags: "ship, lounge, coffee, warmth, conversation",
    body: `The passenger lounge is warm-lit and slightly worn. Its chairs are arranged for conversations that may last longer than intended. The windows show water that is frequently beautiful and occasionally wrong.

A counter serves coffee, tea, bread when there is bread, and something the crew call the soup. The soup changes from crossing to crossing. Nobody aboard remembers seeing ingredients loaded.

This is the social heart of the ferry. Passengers arrive here carrying coats, bags, unfinished arguments, and reasons they have not yet remembered. Crew members pass through often enough to become part of the room without supervising it.

Use the lounge when a scene needs warmth, witness, or the quiet pressure of strangers sharing a long night.`,
  },
  {
    category: "location",
    title: "Observation Deck",
    tags: "ship, deck, sea, solitude, horizon",
    body: `The observation deck is open to the cold and usually damp at the rail. It is where passengers go when they need air, cannot sleep, or want to think without being asked whether they are all right.

The rail bears the smooth wear of many anxious hands. From here the perpetual half-light is most apparent. Stars may remain visible while the horizon brightens. Shadows sometimes disagree about the direction of dawn.

The deck is a good place for private conversation, solitary visions, and distant lights that Captain Maren calls nothing. Wind and engine vibration should always be present, even when the sea is perfectly calm.`,
  },
  {
    category: "location",
    title: "Engine Room",
    tags: "ship, engine-room, machinery, below-decks",
    body: `The engine room is loud, warm, and close with the smell of oil, hot metal, and another scent that never quite identifies itself.

It is Elin's domain. Tools are kept in exact places. Notebooks sit beneath improvised weights so the pages do not turn when the ferry rolls. Chalk marks track measurements on pipes whose routes do not fully match the ship's plans.

Passengers rarely come below decks, but the door is not locked. The machinery is old enough to be understood and strange enough to resist a complete account.

Events here should remain physical. Heat, vibration, pressure, failing light, and impossible readings are more effective than apparitions.`,
  },
  {
    category: "location",
    title: "Helm and Captain's Log",
    tags: "ship, helm, captain, compass, log",
    body: `The helm is separated from the passenger spaces by a door marked for crew. It is not guarded. The instruments are functional, though they do not always agree with one another.

The compass sometimes hesitates between headings. Radar may show a coastline that the windows do not. Captain Maren responds to these differences as information rather than failure.

Her log rests within reach. It is not hidden. The writing resembles several scripts layered into one another, with repeated marks that may indicate ports, passengers, weather, or something else entirely.

The log is an open door, not a puzzle with a prepared solution. It may be studied. It should not become fully legible.`,
  },
  {
    category: "location",
    title: "Crew Quarters",
    tags: "ship, crew, private, domestic",
    body: `The crew quarters are modest and private. They contain the small evidence of lives continuing between crossings: repaired clothes, well-read books, a needlework project, pressed flowers from an unnamed shore, a mug nobody else uses.

Nothing here explains the crew. That is what makes the rooms intimate.

Passengers enter only by invitation, accident, or genuine need. If they do, focus on ordinary belongings made strange by missing context. A postcard without a date. A photograph whose harbor has been carefully cut away. A shelf with space left for a book that has not yet been written.`,
  },
  {
    category: "location",
    title: "The Perpetual Sea",
    tags: "sea, dusk, weather, navigation, strange",
    body: `The Night Ferry travels beneath perpetual nautical dusk or pre-dawn. The sky is never fully dark and never fully light. Color remains in the water. The sun may approach the horizon without clearing it.

The sea changes quietly. It may become luminous from below, perfectly still without calm air, or crossed by waves moving against the wind. A horizon may seem closer than geometry permits. Then the condition passes and someone in the lounge finishes the sentence they began before it happened.

The ferry remains competent upon this water. The passengers should not fear an ordinary shipwreck. The danger, when there is danger, lies in attention, memory, choice, and what waits to be acknowledged.`,
  },
  {
    category: "location",
    title: "Ports of Unresolved Weight",
    tags: "ports, towns, destinations, episodic",
    body: `The Night Ferry docks where something has been carried too long by too few people.

This is not necessarily a crisis. It may be a town that agreed to misremember an event, a family that cannot stop performing its grief, a decision deferred until the delay became its own wound, or a place waiting for someone who will not return.

Most ports look ordinary. Their strangeness is specific. One custom, one absence, one arrangement everyone has learned not to question.

The ferry brings what is needed rather than what was requested. Sometimes that is a witness. Sometimes it is a stranger unbound by local loyalties. Sometimes it is someone carrying an object whose meaning has not yet become clear.`,
  },
  {
    category: "faction",
    title: "Crew of the Night Ferry",
    tags: "crew, permanent-cast, caretakers",
    body: `The crew have worked together long enough to stop asking the largest questions. This is not surrender. The work remains real: lines must be secured, engines heard, coffee made, frightened passengers treated with dignity.

They are warm in the way of people who have lived near grief and strangeness without making either into a spectacle. They disagree, tease, keep private habits, and protect one another's silences.

The crew know the ferry by experience rather than doctrine. Their explanations may conflict because each understands a different part of the vessel.

Players can become familiar to them, even beloved, but passengers do not become crew. Crew is a different kind of belonging, with a cost nobody names.`,
  },
  {
    category: "faction",
    title: "Passengers in Transit",
    tags: "passengers, player-characters, strangers, crossing",
    body: `Everyone aboard besides the crew is passing through, even those who have remained for several crossings.

Passengers are people caught mid-sentence. A relationship is under pressure. A return has been delayed. A message is being carried without full understanding. A grief has become a traveling companion. The ferry places these unfinished lives together and gives them time.

There is no obligation to help. The Night Ferry does not demand heroism. Still, confinement, darkness, warm drinks, and the suspicion of purpose make certain conversations difficult to avoid.

Player characters belong to this company. They may become regulars. They remain passengers.`,
  },
  {
    category: "note",
    title: "The Pull",
    tags: "core-concept, boarding, passengers",
    body: `Passengers do not book passage on the Night Ferry. They find themselves aboard it.

Some remember buying a ticket and walking to a quay. The sequence makes sense until examined too closely, when the memory begins to feel staged. Others remember following a direction without deciding to, or noticing water where no harbor should have been.

The pull is quiet rather than compulsive. It feels like remembering an appointment that mattered before you knew about it. Most people follow. Some resist and drift toward water by other routes.

Once underway, understanding arrives unevenly. A passenger may know their reason by the first coffee, discover it at the destination, or leave without ever naming it.`,
  },
  {
    category: "note",
    title: "Why the Ferry Docks",
    tags: "core-concept, ports, need, unresolved-weight",
    body: `The ferry docks when a place has reached a particular weight.

The through-line is not forgetting. Some places have forgotten, but others remember too much. Some are waiting for what has already happened. Some have made grief into custom. Some are outwardly fine because everyone is holding the same door shut.

The crew sense this like weather. They do not have a formula, and they can be wrong about which passenger was brought for which need.

The ferry offers arrival and opportunity. It does not guarantee repair. A port may be changed, complicated, witnessed, or left exactly as it was by people who now understand the cost.`,
  },
  {
    category: "note",
    title: "Player Characters",
    tags: "players, character-creation, campaign",
    body: `Player characters are passengers drawn aboard by the pull.

Ask each player for:

1. Something their character is carrying.
2. A place they left badly or never properly left.
3. A small comfort they accept from strangers.
4. A question they would rather answer later.

Their reason for boarding can remain unknown. It may have nothing to do with the first port. Over time they can become regular passengers with relationships among the crew and expectations about the ferry's rhythms.

Do not make them chosen heroes. The ferry may need their skill, their history, their ignorance, or simply their presence.`,
  },
  {
    category: "note",
    title: "Building a Port",
    tags: "gm, ports, preparation, episodic",
    body: `Build a port from three things.

### What it feels like

Choose the physical character of the place: wet stone, a declining cannery, bright houses under a low sky, a resort after the season, a river town where every clock runs slightly slow.

### What it is holding

Name the unresolved weight. Keep it specific enough to touch people and broad enough to permit different responses.

### What it needs

This is not always what the town wants. It may need an outsider, a witness, a refusal, a practical repair, a returned object, or permission to stop waiting.

Add one ordinary institution, one person who benefits from the current arrangement, one person exhausted by it, and one detail that is strange but treated as normal.`,
  },
  {
    category: "note",
    title: "Passenger Threads",
    tags: "gm, passengers, prompts, relationships",
    body: `Useful passengers arrive with motion already in their lives.

- Someone returning to a place they left badly.
- Two people traveling separately toward the same destination.
- Someone comfortable with the in-between, perhaps too comfortable.
- A person carrying an object, message, or fact they do not understand.
- Someone furious to be aboard and clearly in need of the crossing.
- A charming, capable person whose grief is present like another traveler.
- Someone expected at the next port who will not be leaving the ferry there.

Give each passenger a want they can state, a need they cannot, and one reason to speak with another person aboard.`,
  },
  {
    category: "note",
    title: "Events at Sea",
    tags: "gm, sea-events, sessions, prompts",
    body: `A crossing does not need a port to become a session.

- A passenger needs witness more than rescue.
- Something appears in the water or sky, visible only to some.
- The ferry becomes still in weather that should move it.
- A light keeps pace beyond the rail.
- Maren and Halvard genuinely disagree about their position.
- Elin needs help documenting a condition below decks.
- A familiar passenger cannot remember a previous crossing.
- The lounge contains one more coat than there are people aboard.

Let sea events alter relationships or understanding. They do not need to become threats.`,
  },
  {
    category: "note",
    title: "Running a Crossing",
    tags: "gm, structure, session, procedure",
    body: `A loose crossing structure:

1. **Boarding.** Establish what each passenger carries and what feels slightly arranged.
2. **Warmth.** Give them coffee, food, routine, and room to settle.
3. **Contact.** Introduce a passenger problem, crew concern, or quiet anomaly.
4. **The shift.** Let one detail reveal the emotional or strange weight beneath the crossing.
5. **Choice.** Offer action without demanding a correct solution.
6. **Arrival or continuation.** A port appears, fails to appear, or proves not to be the destination anyone expected.

Do not force every stage. Some sessions can remain almost entirely in warmth and contact. Others may begin with the shore already visible.`,
  },
  {
    category: "note",
    title: "Tone and Table Practice",
    tags: "gm, tone, cozy-horror, table-reference",
    body: `The register is cozy horror. The warmth is genuine. The strangeness is genuine. Neither exists to cancel the other.

### Reach for

- Texture over plot.
- Emotional accuracy.
- Crew routines as an anchor.
- Slow attention to small changes.
- People who want ordinary things in unusual circumstances.
- Questions that can remain open.

### Avoid

- Explaining the ferry too quickly.
- Turning every anomaly into danger.
- Treating the setting as a survival test.
- Making crew members cryptic for its own sake.
- Using grief as decoration.
- Resolving a mystery simply because it has appeared.

The horror should feel like being in the presence of something. The comfort should make that presence bearable.`,
  },
  {
    category: "note",
    title: "Open Doors",
    tags: "gm, mysteries, open-threads, canon",
    body: `Questions the campaign may carry without answering:

- What language is used in the Captain's log?
- Does the ferry cat exist, and where does it go?
- Who built the Nox Trajectus?
- Does anyone still own it?
- Why do some passengers return?
- What happens when someone refuses to disembark?
- Can the ferry dock somewhere with no living inhabitants?
- Can the pull be refused completely?
- Do the crew remember boarding?
- What would make a crew member leave?

Answers may emerge through play, but none are owed. Some doors are better left ajar.`,
  },
];

/**
 * Seeds Nox Trajectus on an empty database. The archive is the campaign
 * foundation; scenes, atmosphere presets, and logbook entries begin empty.
 */
export async function seedIfEmpty(): Promise<void> {
  if ((await settings.get("seeded")) === "1") return;
  const [{ n }] = await select<{ n: number }>("SELECT COUNT(*) AS n FROM campaigns");
  if (n > 0) {
    await settings.set("seeded", "1");
    return;
  }

  const campaignId = await campaigns.create({
    title: "Nox Trajectus",
    description:
      "The Night Ferry crosses a sea held in perpetual dusk, carrying passengers toward places burdened by unresolved weight. The coffee is real, the crew are kind, and nobody aboard can quite say where the ship came from.",
    cover_image: null,
  });

  for (const entry of entries) {
    await archive.create({
      campaign_id: campaignId,
      category: entry.category,
      title: entry.title,
      body: entry.body,
      tags: entry.tags,
      image: null,
    });
  }

  await settings.set("seeded", "1");
  await execute("UPDATE campaigns SET active_scene_id = NULL, updated_at = datetime('now') WHERE id = ?", [
    campaignId,
  ]);
}
