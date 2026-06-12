import { useState } from "react";
import { X } from "./icons";

export function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const t = draft.trim().replace(/,+$/, "");
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setDraft("");
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-bg-deep/60 border border-line px-2 py-1.5 focus-within:border-ember-dim transition-colors">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full bg-raised border border-line px-2 py-0.5 text-[11px] text-muted"
        >
          {t}
          <button
            className="text-faint hover:text-danger transition-colors"
            onClick={() => onChange(tags.filter((x) => x !== t))}
            title={`Remove ${t}`}
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        className="flex-1 min-w-[90px] bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none py-0.5"
        placeholder={tags.length === 0 ? "Add tags…" : ""}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={add}
      />
    </div>
  );
}
