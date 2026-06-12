/** Flattens markdown to plain text for card excerpts. */
export function stripMarkdown(md: string): string {
  return md
    .replace(/`{1,3}[^`]*`{1,3}/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/[*_~]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** "2026-06-12 21:48:03" → { date: "12 June 2026", time: "21:48" } */
export function splitTimestamp(ts: string): { date: string; time: string } {
  const d = new Date(ts.includes("T") ? ts : ts.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return { date: ts, time: "" };
  return {
    date: d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}
