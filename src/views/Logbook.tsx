import { useMemo, useState } from "react";
import { logbook as repo } from "../db/repo";
import { useApp } from "../stores/appStore";
import { useData } from "../stores/dataStore";
import { splitTimestamp } from "../lib/text";
import { Button, EmptyState, TextArea, ViewHeader } from "../components/ui";
import { Log, Trash } from "../components/icons";

export function Logbook() {
  const { campaign } = useApp();
  const { logs, reloadLogs } = useData();
  const [draft, setDraft] = useState("");

  const add = async () => {
    const body = draft.trim();
    if (!body || !campaign) return;
    await repo.create(campaign.id, body);
    setDraft("");
    await reloadLogs();
  };

  const grouped = useMemo(() => {
    const groups: { date: string; items: typeof logs }[] = [];
    for (const l of logs) {
      const { date } = splitTimestamp(l.created_at);
      const last = groups[groups.length - 1];
      if (last && last.date === date) last.items.push(l);
      else groups.push({ date, items: [l] });
    }
    return groups;
  }, [logs]);

  return (
    <div className="flex h-full flex-col">
      <ViewHeader title="Logbook" sub="What actually happened, while it is still warm" />

      <div className="flex-1 overflow-y-auto px-8 2xl:px-10">
        <div className="mx-auto max-w-2xl pb-8 2xl:max-w-3xl">
          {logs.length === 0 ? (
            <EmptyState icon={<Log size={34} />} title="The log is unopened">
              During play, jot what happened — decisions, surprises, promises the table made.
              Each note is stamped with the time.
            </EmptyState>
          ) : (
            grouped.map((g) => (
              <section key={g.date} className="pt-2 pb-4">
                <h2 className="sticky top-0 z-10 -mx-2 bg-bg/95 px-2 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-faint backdrop-blur-sm">
                  {g.date}
                </h2>
                <div className="flex flex-col">
                  {g.items.map((l) => {
                    const { time } = splitTimestamp(l.created_at);
                    return (
                      <article
                        key={l.id}
                        className="group flex gap-4 border-l border-line py-2.5 pl-4 transition-colors hover:border-ember-dim"
                      >
                        <span className="w-12 shrink-0 pt-0.5 font-mono text-[12px] text-brass">{time}</span>
                        <p className="min-w-0 flex-1 whitespace-pre-wrap text-[14px] leading-relaxed text-muted select-text cursor-auto">
                          {l.body}
                        </p>
                        <button
                          title="Delete note"
                          onClick={async () => {
                            await repo.remove(l.id);
                            await reloadLogs();
                          }}
                          className="h-6 shrink-0 self-start text-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                        >
                          <Trash size={13} />
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      <div className="border-t border-line bg-panel/70 px-8 py-4">
        <div className="mx-auto flex max-w-2xl items-end gap-3 2xl:max-w-3xl">
          <TextArea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void add();
              }
            }}
            rows={2}
            placeholder="What just happened at the table?  (Enter to log, Shift+Enter for a new line)"
            className="!font-sans !text-sm"
          />
          <Button variant="primary" onClick={add} disabled={!draft.trim()} className="mb-0.5">
            Log it
          </Button>
        </div>
      </div>
    </div>
  );
}
