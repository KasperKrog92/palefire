import type { ArchiveEntry, Campaign } from "../types";

const BIBLE_TITLES = [
  "The Pull",
  "Why the Ferry Docks",
  "Running a Crossing",
  "Tone and Table Practice",
  "Open Doors",
] as const;

const FALLBACK_BIBLE = `The Night Ferry draws passengers aboard through a quiet pull. It docks where a place has acquired unresolved weight, offering arrival and opportunity rather than guaranteed repair.

A crossing may move through boarding, warmth, contact, a subtle shift, choice, and arrival or continuation, but no stage must be forced. Texture matters more than plot. Questions are allowed to remain open.`;

export function buildSettingBible(campaign: Campaign, entries: ArchiveEntry[]): string {
  const byTitle = new Map(entries.map((entry) => [entry.title, entry]));
  const canon = BIBLE_TITLES.map((title) => byTitle.get(title))
    .filter((entry): entry is ArchiveEntry => Boolean(entry))
    .map((entry) => `## ${entry.title}\n${entry.body.trim()}`)
    .join("\n\n");

  return `# Campaign setting

Campaign: ${campaign.title}
${campaign.description.trim() || "Aboard the Night Ferry, between one shore and the next."}

# Narrator's setting bible

${canon || FALLBACK_BIBLE}`;
}
