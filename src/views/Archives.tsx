import { useEffect, useMemo, useState } from "react";
import type { ArchiveCategory, ArchiveEntry } from "../types";
import { ARCHIVE_CATEGORIES, joinTags, parseTags } from "../types";
import { archive as repo } from "../db/repo";
import { useApp } from "../stores/appStore";
import { useData } from "../stores/dataStore";
import { Markdown } from "../components/Markdown";
import { Modal } from "../components/Modal";
import { Confirm } from "../components/Confirm";
import { ImagePicker } from "../components/ImagePicker";
import { TagInput } from "../components/TagInput";
import { useStoredImage } from "../components/StoredImage";
import { Button, Chip, EmptyState, Field, Input, Select, TextArea, ViewHeader } from "../components/ui";
import { Book, Cards, Pencil, Plus, Search, Trash } from "../components/icons";

type Filter = ArchiveCategory | "all";

export function Archives() {
  const { entries, links, scenes } = useData();
  const { pendingFocus, clearFocus } = useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<ArchiveEntry | "new" | null>(null);
  const [deleting, setDeleting] = useState<ArchiveEntry | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (filter !== "all" && e.category !== filter) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.tags.toLowerCase().includes(q) ||
        e.body.toLowerCase().includes(q)
      );
    });
  }, [entries, filter, query]);

  const selected = entries.find((e) => e.id === selectedId) ?? null;

  useEffect(() => {
    if (pendingFocus?.view !== "archives") return;
    if (entries.some((entry) => entry.id === pendingFocus.id)) {
      setFilter("all");
      setQuery("");
      setSelectedId(pendingFocus.id);
    }
    clearFocus();
  }, [pendingFocus, entries, clearFocus]);

  useEffect(() => {
    if (pendingFocus?.view === "archives") return;
    if (filtered.length > 0 && !filtered.some((e) => e.id === selectedId)) {
      setSelectedId(filtered[0].id);
    } else if (filtered.length === 0) {
      setSelectedId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, pendingFocus]);

  const linkedScenes = useMemo(() => {
    if (!selected) return [];
    const sceneIds = new Set(links.filter((l) => l.entry_id === selected.id).map((l) => l.scene_id));
    return scenes.filter((s) => sceneIds.has(s.id));
  }, [selected, links, scenes]);

  return (
    <div className="flex h-full flex-col">
      <ViewHeader title="Archives" sub="The campaign's notebook — who, where, and what must not be forgotten">
        <Button variant="primary" onClick={() => setEditing("new")}>
          <Plus size={14} /> New entry
        </Button>
      </ViewHeader>

      <div className="flex flex-1 gap-0 overflow-hidden border-t border-line">
        {/* index column */}
        <div className="flex w-[300px] shrink-0 flex-col border-r border-line bg-panel/40">
          <div className="flex flex-wrap gap-1 px-3 pt-3">
            {(["all", ...ARCHIVE_CATEGORIES.map((c) => c.id)] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full border px-2.5 py-1 text-[11.5px] transition-colors ${
                  filter === f
                    ? "border-ember/50 bg-ember/12 text-ember"
                    : "border-line text-faint hover:text-ink hover:border-line-strong"
                }`}
              >
                {f === "all" ? "All" : ARCHIVE_CATEGORIES.find((c) => c.id === f)?.plural}
              </button>
            ))}
          </div>

          <div className="relative px-3 pt-3 pb-2">
            <Search size={13} className="absolute left-6 top-1/2 mt-0.5 -translate-y-1/2 text-faint" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the archive…"
              className="!pl-8 !py-1.5 text-[13px]"
            />
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {filtered.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className={`mb-0.5 block w-full rounded-md px-3 py-2 text-left transition-colors ${
                  selectedId === e.id ? "bg-raised border border-line-strong" : "border border-transparent hover:bg-raised/50"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm text-ink">{e.title}</span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wider text-faint">
                    {ARCHIVE_CATEGORIES.find((c) => c.id === e.category)?.label}
                  </span>
                </div>
                {e.tags && (
                  <div className="mt-0.5 truncate text-[11px] text-faint">{parseTags(e.tags).join(" · ")}</div>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-6 text-center text-[12.5px] text-faint">Nothing filed here yet.</p>
            )}
          </div>
        </div>

        {/* reading pane */}
        <div className="flex-1 overflow-y-auto">
          {selected ? (
            <EntryView
              entry={selected}
              linkedScenes={linkedScenes.map((s) => s.title)}
              onEdit={() => setEditing(selected)}
              onDelete={() => setDeleting(selected)}
            />
          ) : (
            <EmptyState icon={<Book size={36} />} title="The archive is open">
              Characters, locations, factions and loose notes live here. Everything is markdown;
              nothing is mandatory.
            </EmptyState>
          )}
        </div>
      </div>

      {editing && (
        <EntryEditor
          entry={editing === "new" ? null : editing}
          defaultCategory={filter === "all" ? "character" : filter}
          onClose={() => setEditing(null)}
          onSaved={(id) => {
            setEditing(null);
            setSelectedId(id);
          }}
        />
      )}

      {deleting && (
        <Confirm
          title="Delete entry"
          message={`Remove "${deleting.title}" from the archive? Scenes that reference it will simply forget it.`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await repo.remove(deleting.id);
            setDeleting(null);
            await useData.getState().reloadEntries();
            await useData.getState().reloadScenes();
          }}
        />
      )}
    </div>
  );
}

function EntryView({
  entry,
  linkedScenes,
  onEdit,
  onDelete,
}: {
  entry: ArchiveEntry;
  linkedScenes: string[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const img = useStoredImage(entry.image);
  return (
    <div className="mx-auto max-w-2xl px-8 py-8 pf-enter" key={entry.id}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-faint">
            {ARCHIVE_CATEGORIES.find((c) => c.id === entry.category)?.label}
          </div>
          <h2 className="mt-1 font-display text-[26px] leading-tight text-ink">{entry.title}</h2>
          {entry.tags && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {parseTags(entry.tags).map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5 pt-1">
          <Button variant="ghost" onClick={onEdit}>
            <Pencil size={13} /> Edit
          </Button>
          <Button variant="danger" onClick={onDelete}>
            <Trash size={13} />
          </Button>
        </div>
      </div>

      {img && (
        <div className="mt-5 overflow-hidden rounded-lg border border-line shadow-[var(--shadow-card)]">
          <img src={img} alt="" className="max-h-72 w-full object-cover" draggable={false} />
        </div>
      )}

      <div className="mt-5">
        <Markdown text={entry.body || "*The page is blank.*"} className="text-[14.5px]" />
      </div>

      {linkedScenes.length > 0 && (
        <div className="mt-8 border-t border-line pt-4">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-faint">
            <Cards size={12} /> Appears in
          </div>
          <div className="flex flex-wrap gap-1.5">
            {linkedScenes.map((t) => (
              <Chip key={t} tone="sea">
                {t}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EntryEditor({
  entry,
  defaultCategory,
  onClose,
  onSaved,
}: {
  entry: ArchiveEntry | null;
  defaultCategory: ArchiveCategory;
  onClose: () => void;
  onSaved: (id: number) => void;
}) {
  const { campaign } = useApp();
  const reloadEntries = useData((s) => s.reloadEntries);

  const [title, setTitle] = useState(entry?.title ?? "");
  const [category, setCategory] = useState<ArchiveCategory>(entry?.category ?? defaultCategory);
  const [body, setBody] = useState(entry?.body ?? "");
  const [tags, setTags] = useState<string[]>(entry ? parseTags(entry.tags) : []);
  const [image, setImage] = useState<string | null>(entry?.image ?? null);
  const [preview, setPreview] = useState(false);

  const save = async () => {
    const t = title.trim();
    if (!t || !campaign) return;
    let id: number;
    if (entry) {
      await repo.update(entry.id, { category, title: t, body, tags: joinTags(tags), image });
      id = entry.id;
    } else {
      id = await repo.create({
        campaign_id: campaign.id,
        category,
        title: t,
        body,
        tags: joinTags(tags),
        image,
      });
    }
    await reloadEntries();
    onSaved(id);
  };

  return (
    <Modal
      wide
      title={entry ? "Edit entry" : "New entry"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={!title.trim()}>
            {entry ? "Save entry" : "File entry"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-[1fr_180px] gap-4">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Agnes Vinter" autoFocus />
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value as ArchiveCategory)}>
              {ARCHIVE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
              Notes <span className="ml-1 normal-case tracking-normal font-normal">markdown</span>
            </span>
            <div className="flex gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => setPreview(false)}
                className={`rounded px-2 py-0.5 transition-colors ${!preview ? "bg-raised text-ink border border-line-strong" : "text-faint hover:text-ink border border-transparent"}`}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setPreview(true)}
                className={`rounded px-2 py-0.5 transition-colors ${preview ? "bg-raised text-ink border border-line-strong" : "text-faint hover:text-ink border border-transparent"}`}
              >
                Preview
              </button>
            </div>
          </div>
          {preview ? (
            <div className="min-h-[220px] max-h-[340px] overflow-y-auto rounded-md border border-line bg-bg-deep/40 px-4 py-3">
              <Markdown text={body || "*The page is blank.*"} />
            </div>
          ) : (
            <TextArea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder={"Who are they? What do they want?\n\nUse **bold**, *italics*, lists, > quotes…"}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Tags">
            <TagInput tags={tags} onChange={setTags} />
          </Field>
          <Field label="Image" hint="optional">
            <ImagePicker value={image} onChange={setImage} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
