import type {
  ArchiveEntry,
  Campaign,
  PcConnection,
  PlayerCharacter,
} from "../types";
import type { Crossing, CrossingMessage } from "./types";
import type { ChatTurn, SystemBlock } from "./provider";
import { buildSettingBible } from "./bible";
import { NARRATOR_PROMPT } from "./prompts";

const RECENT_TURN_LIMIT = 30;

interface CrossingContextInput {
  campaign: Campaign;
  crossing: Crossing;
  passenger: PlayerCharacter;
  passengers: PlayerCharacter[];
  entries: ArchiveEntry[];
  connections: PcConnection[];
  messages: CrossingMessage[];
}

export interface CrossingContext {
  system: SystemBlock[];
  messages: ChatTurn[];
}

export function buildCrossingContext(input: CrossingContextInput): CrossingContext {
  return {
    system: [
      { text: NARRATOR_PROMPT },
      { text: buildSettingBible(input.campaign, input.entries) },
      {
        text: buildPassengerDossier(
          input.crossing,
          input.passenger,
          input.passengers,
          input.entries,
          input.connections
        ),
      },
    ],
    messages: input.messages
      .filter(
        (message) =>
          message.in_context === 1 &&
          message.status === "complete" &&
          message.body.trim().length > 0
      )
      .slice(-RECENT_TURN_LIMIT)
      .map((message) => ({
        role: message.role === "narrator" ? "assistant" : "user",
        content:
          message.role === "aside"
            ? `[Private GM aside]\n${message.body.trim()}`
            : message.body.trim(),
      })),
  };
}

function buildPassengerDossier(
  crossing: Crossing,
  passenger: PlayerCharacter,
  passengers: PlayerCharacter[],
  entries: ArchiveEntry[],
  connections: PcConnection[]
): string {
  const archiveById = new Map(entries.map((entry) => [entry.id, entry]));
  const passengerById = new Map(passengers.map((item) => [item.id, item]));
  const linkedEntries: string[] = [];
  const linkedPassengers = new Map<number, string>();

  for (const connection of connections.filter((item) => item.pc_id === passenger.id)) {
    if (connection.target_kind === "archive") {
      const entry = archiveById.get(connection.target_id);
      if (entry) {
        linkedEntries.push(
          `## ${entry.title} (${entry.category})\nRelationship: ${
            connection.relationship.trim() || "Linked to this passenger."
          }\n${entry.body.trim()}`
        );
      }
      continue;
    }

    const related = passengerById.get(connection.target_id);
    if (related) {
      linkedPassengers.set(
        related.id,
        formatRelatedPassenger(related, connection.relationship)
      );
    }
  }

  for (const connection of connections.filter(
    (item) => item.target_kind === "pc" && item.target_id === passenger.id
  )) {
    const related = passengerById.get(connection.pc_id);
    if (related && !linkedPassengers.has(related.id)) {
      linkedPassengers.set(
        related.id,
        formatRelatedPassenger(related, connection.relationship)
      );
    }
  }

  const summary = crossing.summary.trim()
    ? `# Story so far\n${crossing.summary.trim()}\n\n`
    : "";

  return `# Passenger being played

${formatPassenger(passenger)}

${summary}# Relevant Archive records

${linkedEntries.join("\n\n") || "No Archive records are linked to this passenger."}

# Relevant passengers

${
  [...linkedPassengers.values()].join("\n\n") ||
  "No other passengers are linked to this passenger."
}

The dossier intentionally excludes private GM-only secrets and what the ferry may need. Do not infer or ask for omitted fields.`;
}

function formatPassenger(passenger: PlayerCharacter): string {
  return [
    `Name: ${passenger.name}`,
    line("Pronouns", passenger.pronouns),
    line("Age", passenger.age),
    line("Concept", passenger.concept),
    line("Expertise", passenger.expertise),
    `Attributes: Body ${passenger.body}, Wits ${passenger.wits}, Heart ${passenger.heart}, Resolve ${passenger.resolve}`,
    line("Conditions", passenger.conditions),
    line("Carrying", passenger.carrying),
    line("Left behind", passenger.left_behind),
    line("Accepts as comfort", passenger.comfort),
    line("Question deferred", passenger.question),
    line("The pull", passenger.the_pull),
    line("Overview", passenger.overview),
  ]
    .filter(Boolean)
    .join("\n");
}

function formatRelatedPassenger(
  passenger: PlayerCharacter,
  relationship: string
): string {
  return [
    `## ${passenger.name}`,
    line("Relationship", relationship),
    line("Pronouns", passenger.pronouns),
    line("Concept", passenger.concept),
    line("Overview", passenger.overview),
  ]
    .filter(Boolean)
    .join("\n");
}

function line(label: string, value: string): string {
  const clean = value.trim();
  return clean ? `${label}: ${clean}` : "";
}
