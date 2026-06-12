import { useMemo } from "react";
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const html = useMemo(() => marked.parse(text || "", { async: false }) as string, [text]);
  return <div className={`prose-pf text-[14px] text-muted ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
