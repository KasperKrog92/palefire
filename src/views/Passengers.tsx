import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  ArchiveEntry,
  PcAttribute,
  PcConnection,
  PcConnectionKind,
  PcLogEntry,
  PlayerCharacter,
} from "../types";
import {
  ARCHIVE_CATEGORIES,
  PC_ATTRIBUTES,
  PC_CONDITIONS,
  isOvercome,
  joinTags,
  parseTags,
} from "../types";
import {
  pcConnections as connectionRepo,
  pcLog as logRepo,
  playerCharacters as passengerRepo,
} from "../db/repo";
import { useApp } from "../stores/appStore";
import { useData } from "../stores/dataStore";
import { splitTimestamp } from "../lib/text";
import { fallbackCover } from "../components/cover";
import { Confirm } from "../components/Confirm";
import { ImagePicker } from "../components/ImagePicker";
import { Markdown } from "../components/Markdown";
import { Modal } from "../components/Modal";
import { TagInput } from "../components/TagInput";
import { useStoredImage } from "../components/StoredImage";
import { Button, Chip, EmptyState, Field, Input, Select, TextArea, ViewHeader } from "../components/ui";
import {
  Cards,
  ChevronRight,
  Grip,
  LinkIcon,
  Log,
  Passengers as PassengersIcon,
  Pencil,
  Plus,
  Trash,
} from "../components/icons";

export function Passengers() {
  const {
    playerCharacters,
    pcConnections,
    pcLinks,
    scenes,
    reloadPlayerCharacters,
    reloadPcConnections,
  } = useData();
  const { pendingFocus, clearFocus } = useApp();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [ordered, setOrdered] = useState(playerCharacters);
  const [editing, setEditing] = useState<PlayerCharacter | "new" | null>(null);
  const [deleting, setDeleting] = useState<PlayerCharacter | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => setOrdered(playerCharacters), [playerCharacters]);

  useEffect(() => {
    if (pendingFocus?.view !== "passengers") return;
    if (playerCharacters.some((pc) => pc.id === pendingFocus.id)) setSelectedId(pendingFocus.id);
    clearFocus();
  }, [pendingFocus, playerCharacters, clearFocus]);

  useEffect(() => {
    if (playerCharacters.length > 0 && !playerCharacters.some((pc) => pc.id === selectedId)) {
      setSelectedId(playerCharacters[0].id);
    } else if (playerCharacters.length === 0) {
      setSelectedId(null);
    }
  }, [playerCharacters, selectedId]);

  const selected = playerCharacters.find((pc) => pc.id === selectedId) ?? null;
  const selectedConnections = selected
    ? pcConnections.filter((connection) => connection.pc_id === selected.id)
    : [];
  const linkedSceneIds = selected
    ? new Set(pcLinks.filter((link) => link.pc_id === selected.id).map((link) => link.scene_id))
    : new Set<number>();
  const linkedScenes = scenes.filter((scene) => linkedSceneIds.has(scene.id));

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = ordered.findIndex((pc) => pc.id === active.id);
    const newIndex = ordered.findIndex((pc) => pc.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(ordered, oldIndex, newIndex);
    setOrdered(next);
    await passengerRepo.reorder(next.map((pc) => pc.id));
    await reloadPlayerCharacters();
  };

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title="Passengers"
        sub="The player characters drawn aboard, and the ties they carry with them"
      >
        <Button variant="primary" onClick={() => setEditing("new")}>
          <Plus size={14} /> New passenger
        </Button>
      </ViewHeader>

      <div className="flex flex-1 overflow-hidden border-t border-line">
        <div className="flex w-[300px] shrink-0 flex-col border-r border-line bg-panel/40">
          <div className="px-4 pb-2 pt-4 text-[10px] uppercase tracking-[0.16em] text-faint">
            {ordered.length} aboard
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext
                items={ordered.map((pc) => pc.id)}
                strategy={verticalListSortingStrategy}
              >
                {ordered.map((pc) => (
                  <PassengerRow
                    key={pc.id}
                    passenger={pc}
                    selected={pc.id === selectedId}
                    onSelect={() => setSelectedId(pc.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {ordered.length === 0 && (
              <div className="px-5 py-10 text-center text-[12.5px] leading-relaxed text-faint">
                The manifest is quiet. The pull will bring the first passenger aboard.
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {selected ? (
            <PassengerSheet
              passenger={selected}
              connections={selectedConnections}
              linkedScenes={linkedScenes.map((scene) => scene.title)}
              onEdit={() => setEditing(selected)}
              onDelete={() => setDeleting(selected)}
            />
          ) : (
            <EmptyState icon={<PassengersIcon size={36} />} title="No one has boarded yet">
              Passenger sheets hold the people at the heart of the crossing. Begin with a name;
              the rest can arrive in its own time.
            </EmptyState>
          )}
        </div>
      </div>

      {editing && (
        <PassengerEditor
          passenger={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(id) => {
            setEditing(null);
            setSelectedId(id);
          }}
        />
      )}

      {deleting && (
        <Confirm
          title="Delete passenger"
          message={`Remove "${deleting.name}" from the manifest? Their scene links, connections, and GM log will go with them.`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await passengerRepo.remove(deleting.id);
            setDeleting(null);
            await Promise.all([
              reloadPlayerCharacters(),
              reloadPcConnections(),
              useData.getState().reloadScenes(),
            ]);
          }}
        />
      )}
    </div>
  );
}

function PassengerRow({
  passenger,
  selected,
  onSelect,
}: {
  passenger: PlayerCharacter;
  selected: boolean;
  onSelect: () => void;
}) {
  const image = useStoredImage(passenger.image);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: passenger.id,
  });
  const subtitle = [passenger.player, passenger.concept].filter(Boolean).join(" · ");

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group mb-1 flex items-center rounded-md border transition-colors ${
        selected
          ? "border-line-strong bg-raised"
          : "border-transparent hover:bg-raised/50"
      } ${isDragging ? "z-20 opacity-80 shadow-[var(--shadow-lift)]" : ""}`}
    >
      <button
        className="cursor-grab touch-none px-1.5 py-4 text-faint opacity-0 group-hover:opacity-100 active:cursor-grabbing"
        title="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <Grip size={13} />
      </button>
      <button onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pr-2 text-left">
        <Portrait name={passenger.name} image={image} className="h-10 w-10 text-sm" />
        <span className="min-w-0">
          <span className="block truncate text-sm text-ink">{passenger.name}</span>
          {subtitle && <span className="mt-0.5 block truncate text-[11px] text-faint">{subtitle}</span>}
        </span>
      </button>
    </div>
  );
}

function PassengerSheet({
  passenger,
  connections,
  linkedScenes,
  onEdit,
  onDelete,
}: {
  passenger: PlayerCharacter;
  connections: PcConnection[];
  linkedScenes: string[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { entries, playerCharacters } = useData();
  const image = useStoredImage(passenger.image);
  const [curtainOpen, setCurtainOpen] = useState(false);

  useEffect(() => setCurtainOpen(false), [passenger.id]);

  return (
    <div className="mx-auto max-w-3xl px-8 py-8 pf-enter" key={passenger.id}>
      <div className="flex items-start gap-5">
        <Portrait name={passenger.name} image={image} className="h-24 w-24 text-2xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-[28px] leading-tight text-ink">{passenger.name}</h2>
              {[passenger.pronouns, passenger.age].some(Boolean) && (
                <p className="mt-1 text-[13px] text-faint">
                  {[passenger.pronouns, passenger.age].filter(Boolean).join(" · ")}
                </p>
              )}
              {passenger.concept && <p className="mt-2 text-sm text-muted">{passenger.concept}</p>}
              {passenger.player && (
                <p className="mt-1 text-[12px] text-faint">Played by {passenger.player}</p>
              )}
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button variant="ghost" onClick={onEdit}>
                <Pencil size={13} /> Edit
              </Button>
              <Button variant="danger" onClick={onDelete} title="Delete passenger">
                <Trash size={13} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Stats passenger={passenger} />

      <SheetSection title="Overview">
        <Markdown
          text={passenger.overview || "*There is room here for who they are, and what binds them to the crossing.*"}
          className="text-[14.5px]"
        />
      </SheetSection>

      <Boarding passenger={passenger} />

      <Connections
        passenger={passenger}
        connections={connections}
        entries={entries}
        passengers={playerCharacters}
      />

      {linkedScenes.length > 0 && (
        <SheetSection title="Appears in" icon={<Cards size={12} />}>
          <div className="flex flex-wrap gap-1.5">
            {linkedScenes.map((title) => (
              <Chip key={title} tone="sea">
                {title}
              </Chip>
            ))}
          </div>
        </SheetSection>
      )}

      {(passenger.secret || passenger.ferry_needs) && (
        <section className="mt-8 overflow-hidden rounded-lg border border-ember/20 bg-ember/[0.035]">
          <button
            onClick={() => setCurtainOpen((open) => !open)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span>
              <span className="block text-[10px] uppercase tracking-[0.16em] text-ember">
                Behind the curtain
              </span>
              <span className="mt-0.5 block text-[12px] text-faint">GM-only notes, hidden by default</span>
            </span>
            <ChevronRight
              size={15}
              className={`text-faint transition-transform ${curtainOpen ? "rotate-90" : ""}`}
            />
          </button>
          {curtainOpen && (
            <div className="grid gap-5 border-t border-ember/15 px-4 py-4 md:grid-cols-2">
              {passenger.secret && <QuietFact label="Secret" value={passenger.secret} />}
              {passenger.ferry_needs && (
                <QuietFact label="What the ferry may need" value={passenger.ferry_needs} />
              )}
            </div>
          )}
        </section>
      )}

      <PassengerLog passengerId={passenger.id} />
    </div>
  );
}

function Stats({ passenger }: { passenger: PlayerCharacter }) {
  const reload = useData((state) => state.reloadPlayerCharacters);
  const conditions = parseTags(passenger.conditions);

  const writeStats = async (
    patch: Partial<Record<PcAttribute, number>> & { conditions?: string[] }
  ) => {
    await passengerRepo.setStats(passenger.id, {
      body: patch.body ?? passenger.body,
      wits: patch.wits ?? passenger.wits,
      heart: patch.heart ?? passenger.heart,
      resolve: patch.resolve ?? passenger.resolve,
      conditions: joinTags(patch.conditions ?? conditions),
    });
    await reload();
  };

  const toggleCondition = (key: string) => {
    const next = conditions.includes(key)
      ? conditions.filter((condition) => condition !== key)
      : [...conditions, key];
    void writeStats({ conditions: next });
  };

  return (
    <section className="mt-8 rounded-lg border border-line bg-panel/45 p-5">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PC_ATTRIBUTES.map((attribute) => (
          <div key={attribute.key}>
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
              {attribute.label}
            </div>
            <div className="mt-2 flex gap-1" title={attribute.blurb}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => void writeStats({ [attribute.key]: value })}
                  className={`h-3.5 w-3.5 rounded-full border transition-colors ${
                    value <= passenger[attribute.key]
                      ? "border-ember bg-ember"
                      : "border-line-strong bg-bg-deep hover:border-ember-dim"
                  }`}
                  title={`${attribute.label} ${value}`}
                  aria-label={`Set ${attribute.label} to ${value}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
        {(["body", "nerve"] as const).map((track) => (
          <div key={track}>
            <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-faint">
              The {track} gives
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PC_CONDITIONS.filter((condition) => condition.track === track).map((condition) => {
                const active = conditions.includes(condition.key);
                return (
                  <button
                    key={condition.key}
                    onClick={() => toggleCondition(condition.key)}
                    title={condition.meaning}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                      active
                        ? "border-ember/45 bg-ember/12 text-ember"
                        : "border-line bg-bg-deep/40 text-faint hover:border-line-strong hover:text-muted"
                    }`}
                  >
                    {condition.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {isOvercome(conditions) && <Chip tone="ember">Overcome</Chip>}
        {parseTags(passenger.expertise).map((tag) => (
          <Chip key={tag}>{tag}</Chip>
        ))}
        {!passenger.expertise && conditions.length === 0 && (
          <span className="text-[11px] italic text-faint">No expertise or conditions marked.</span>
        )}
      </div>
    </section>
  );
}

function Boarding({ passenger }: { passenger: PlayerCharacter }) {
  const facts = [
    ["They carry", passenger.carrying],
    ["They left behind", passenger.left_behind],
    ["They accept", passenger.comfort],
    ["They would rather answer later", passenger.question],
    ["The pull", passenger.the_pull],
  ].filter(([, value]) => value);

  if (facts.length === 0) return null;
  return (
    <SheetSection title="Boarding">
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {facts.map(([label, value]) => (
          <QuietFact key={label} label={label} value={value} />
        ))}
      </div>
    </SheetSection>
  );
}

function Connections({
  passenger,
  connections,
  entries,
  passengers,
}: {
  passenger: PlayerCharacter;
  connections: PcConnection[];
  entries: ArchiveEntry[];
  passengers: PlayerCharacter[];
}) {
  const focus = useApp((state) => state.focus);
  const reload = useData((state) => state.reloadPcConnections);
  const [adding, setAdding] = useState(false);
  const resolved = connections.flatMap((connection) => {
    if (connection.target_kind === "pc") {
      const target = passengers.find((pc) => pc.id === connection.target_id);
      return target
        ? [{ connection, label: target.name, group: "Other passengers", category: "pc" }]
        : [];
    }
    const target = entries.find((entry) => entry.id === connection.target_id);
    if (!target) return [];
    const category = ARCHIVE_CATEGORIES.find((item) => item.id === target.category);
    return [
      {
        connection,
        label: target.title,
        group: category?.plural ?? "Archive",
        category: target.category,
      },
    ];
  });
  const groups = Array.from(new Set(resolved.map((item) => item.group)));

  return (
    <SheetSection title="Connections" icon={<LinkIcon size={12} />}>
      {resolved.length > 0 ? (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group}>
              <div className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-faint">{group}</div>
              <div className="space-y-1">
                {resolved
                  .filter((item) => item.group === group)
                  .map(({ connection, label }) => (
                    <div
                      key={connection.id}
                      className="group flex items-start gap-2 rounded-md border border-transparent px-2 py-1.5 hover:border-line hover:bg-panel/50"
                    >
                      <button
                        onClick={() =>
                          focus(connection.target_kind === "pc" ? "passengers" : "archives", connection.target_id)
                        }
                        className="shrink-0 text-[13px] text-ink hover:text-ember"
                      >
                        {label}
                      </button>
                      <span className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-muted">
                        {connection.relationship || "The nature of this tie is unwritten."}
                      </span>
                      <button
                        title="Remove connection"
                        onClick={async () => {
                          await connectionRepo.remove(connection.id);
                          await reload();
                        }}
                        className="pt-0.5 text-faint opacity-0 hover:text-danger group-hover:opacity-100"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[13px] italic text-faint">No ties have been written down yet.</p>
      )}
      <Button variant="ghost" onClick={() => setAdding(true)} className="mt-4">
        <Plus size={13} /> Add connection
      </Button>
      {adding && (
        <ConnectionEditor
          passenger={passenger}
          existing={connections}
          entries={entries}
          passengers={passengers}
          onClose={() => setAdding(false)}
        />
      )}
    </SheetSection>
  );
}

function ConnectionEditor({
  passenger,
  existing,
  entries,
  passengers,
  onClose,
}: {
  passenger: PlayerCharacter;
  existing: PcConnection[];
  entries: ArchiveEntry[];
  passengers: PlayerCharacter[];
  onClose: () => void;
}) {
  const reload = useData((state) => state.reloadPcConnections);
  const targets = [
    ...passengers
      .filter((pc) => pc.id !== passenger.id)
      .map((pc) => ({ kind: "pc" as const, id: pc.id, label: pc.name, group: "Passengers" })),
    ...entries.map((entry) => ({
      kind: "archive" as const,
      id: entry.id,
      label: entry.title,
      group: ARCHIVE_CATEGORIES.find((category) => category.id === entry.category)?.plural ?? "Archive",
    })),
  ].filter(
    (target) =>
      !existing.some(
        (connection) =>
          connection.target_kind === target.kind && connection.target_id === target.id
      )
  );
  const [targetKey, setTargetKey] = useState(targets[0] ? `${targets[0].kind}:${targets[0].id}` : "");
  const [relationship, setRelationship] = useState("");

  const save = async () => {
    const [kind, id] = targetKey.split(":");
    if (!id || (kind !== "pc" && kind !== "archive")) return;
    await connectionRepo.add({
      pc_id: passenger.id,
      target_kind: kind as PcConnectionKind,
      target_id: Number(id),
      relationship: relationship.trim(),
    });
    await reload();
    onClose();
  };

  return (
    <Modal
      title="Add connection"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={!targetKey}>Add connection</Button>
        </>
      }
    >
      {targets.length > 0 ? (
        <div className="flex flex-col gap-4">
          <Field label="Connected to">
            <Select value={targetKey} onChange={(event) => setTargetKey(event.target.value)}>
              {Array.from(new Set(targets.map((target) => target.group))).map((group) => (
                <optgroup key={group} label={group}>
                  {targets.filter((target) => target.group === group).map((target) => (
                    <option key={`${target.kind}:${target.id}`} value={`${target.kind}:${target.id}`}>
                      {target.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          <Field label="Relationship" hint="optional">
            <Input
              value={relationship}
              onChange={(event) => setRelationship(event.target.value)}
              placeholder="Owes a debt; trusts them with the truth…"
              autoFocus
            />
          </Field>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-faint">
          Every available passenger and Archive entry is already connected.
        </p>
      )}
    </Modal>
  );
}

function PassengerLog({ passengerId }: { passengerId: number }) {
  const [logs, setLogs] = useState<PcLogEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = async () => setLogs(await logRepo.forPc(passengerId));

  useEffect(() => {
    let current = true;
    setLoading(true);
    void logRepo.forPc(passengerId).then((items) => {
      if (!current) return;
      setLogs(items);
      setLoading(false);
    });
    return () => {
      current = false;
    };
  }, [passengerId]);

  const add = async () => {
    const body = draft.trim();
    if (!body) return;
    await logRepo.create(passengerId, body);
    setDraft("");
    await reload();
  };

  const grouped = useMemo(() => {
    const result: { date: string; items: PcLogEntry[] }[] = [];
    for (const log of logs) {
      const { date } = splitTimestamp(log.created_at);
      const last = result[result.length - 1];
      if (last?.date === date) last.items.push(log);
      else result.push({ date, items: [log] });
    }
    return result;
  }, [logs]);

  return (
    <SheetSection title="GM log" icon={<Log size={12} />}>
      <div className="flex items-end gap-3">
        <TextArea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void add();
            }
          }}
          rows={2}
          placeholder="A private note about this passenger…"
          className="!font-sans !text-sm"
        />
        <Button variant="primary" onClick={add} disabled={!draft.trim()} className="mb-0.5">
          Log it
        </Button>
      </div>
      {!loading && logs.length === 0 && (
        <p className="mt-3 text-[12px] italic text-faint">Nothing has been logged for them yet.</p>
      )}
      <div className="mt-4">
        {grouped.map((group) => (
          <div key={group.date} className="mb-4">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
              {group.date}
            </div>
            {group.items.map((log) => {
              const { time } = splitTimestamp(log.created_at);
              return (
                <article key={log.id} className="group flex gap-3 border-l border-line py-2 pl-3">
                  <span className="w-11 shrink-0 font-mono text-[11px] text-brass">{time}</span>
                  <p className="min-w-0 flex-1 whitespace-pre-wrap text-[13px] leading-relaxed text-muted">
                    {log.body}
                  </p>
                  <button
                    title="Delete note"
                    onClick={async () => {
                      await logRepo.remove(log.id);
                      await reload();
                    }}
                    className="text-faint opacity-0 hover:text-danger group-hover:opacity-100"
                  >
                    <Trash size={12} />
                  </button>
                </article>
              );
            })}
          </div>
        ))}
      </div>
    </SheetSection>
  );
}

function PassengerEditor({
  passenger,
  onClose,
  onSaved,
}: {
  passenger: PlayerCharacter | null;
  onClose: () => void;
  onSaved: (id: number) => void;
}) {
  const campaign = useApp((state) => state.campaign);
  const reload = useData((state) => state.reloadPlayerCharacters);
  const [form, setForm] = useState({
    name: passenger?.name ?? "",
    player: passenger?.player ?? "",
    concept: passenger?.concept ?? "",
    pronouns: passenger?.pronouns ?? "",
    age: passenger?.age ?? "",
    image: passenger?.image ?? null as string | null,
    expertise: passenger ? parseTags(passenger.expertise) : [],
    carrying: passenger?.carrying ?? "",
    left_behind: passenger?.left_behind ?? "",
    comfort: passenger?.comfort ?? "",
    question: passenger?.question ?? "",
    the_pull: passenger?.the_pull ?? "",
    overview: passenger?.overview ?? "",
    secret: passenger?.secret ?? "",
    ferry_needs: passenger?.ferry_needs ?? "",
  });
  const [preview, setPreview] = useState(false);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    const name = form.name.trim();
    if (!name || !campaign) return;
    const values = { ...form, name, expertise: joinTags(form.expertise) };
    let id: number;
    if (passenger) {
      await passengerRepo.update(passenger.id, values);
      id = passenger.id;
    } else {
      id = await passengerRepo.create({ campaign_id: campaign.id, ...values });
    }
    await reload();
    onSaved(id);
  };

  return (
    <Modal
      wide
      title={passenger ? "Edit passenger" : "New passenger"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={!form.name.trim()}>
            {passenger ? "Save passenger" : "Add to manifest"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input value={form.name} onChange={(event) => set("name", event.target.value)} autoFocus />
          </Field>
          <Field label="Player" hint="optional">
            <Input value={form.player} onChange={(event) => set("player", event.target.value)} />
          </Field>
          <Field label="Concept" hint="one line">
            <Input value={form.concept} onChange={(event) => set("concept", event.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pronouns">
              <Input value={form.pronouns} onChange={(event) => set("pronouns", event.target.value)} />
            </Field>
            <Field label="Age">
              <Input value={form.age} onChange={(event) => set("age", event.target.value)} />
            </Field>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Portrait" hint="optional">
            <ImagePicker value={form.image} onChange={(value) => set("image", value)} />
          </Field>
          <Field label="Expertise" hint="comma-separated tags">
            <TagInput tags={form.expertise} onChange={(value) => set("expertise", value)} />
          </Field>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
              Overview <span className="ml-1 font-normal normal-case tracking-normal">markdown</span>
            </span>
            <div className="flex gap-1 text-[11px]">
              {(["Write", "Preview"] as const).map((label) => {
                const active = label === "Preview" ? preview : !preview;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setPreview(label === "Preview")}
                    className={`rounded border px-2 py-0.5 ${
                      active
                        ? "border-line-strong bg-raised text-ink"
                        : "border-transparent text-faint hover:text-ink"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          {preview ? (
            <div className="min-h-[180px] rounded-md border border-line bg-bg-deep/40 px-4 py-3">
              <Markdown text={form.overview || "*The page is blank.*"} />
            </div>
          ) : (
            <TextArea
              value={form.overview}
              onChange={(event) => set("overview", event.target.value)}
              rows={7}
              placeholder="Who are they? What do they want, and how are they tied to the crossing?"
            />
          )}
        </div>

        <div>
          <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
            Boarding
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <PromptField label="Something they carry" value={form.carrying} onChange={(value) => set("carrying", value)} />
            <PromptField label="A place left behind" value={form.left_behind} onChange={(value) => set("left_behind", value)} />
            <PromptField label="A small comfort" value={form.comfort} onChange={(value) => set("comfort", value)} />
            <PromptField label="A question for later" value={form.question} onChange={(value) => set("question", value)} />
          </div>
          <div className="mt-4">
            <PromptField label="The pull" value={form.the_pull} onChange={(value) => set("the_pull", value)} />
          </div>
        </div>

        <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          <PromptField label="GM-only secret" value={form.secret} onChange={(value) => set("secret", value)} rows={3} />
          <PromptField label="What the ferry may need" value={form.ferry_needs} onChange={(value) => set("ferry_needs", value)} rows={3} />
        </div>
      </div>
    </Modal>
  );
}

function PromptField({
  label,
  value,
  onChange,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <Field label={label}>
      <TextArea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} />
    </Field>
  );
}

function Portrait({
  name,
  image,
  className,
}: {
  name: string;
  image: string | null;
  className: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line-strong bg-raised font-display text-ember shadow-[var(--shadow-card)] ${className}`}
      style={image ? undefined : { background: fallbackCover(name) }}
    >
      {image ? (
        <img src={image} alt="" className="h-full w-full object-cover" draggable={false} />
      ) : (
        name.trim().charAt(0).toUpperCase() || "?"
      )}
    </span>
  );
}

function SheetSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 border-t border-line pt-5">
      <div className="mb-3 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-faint">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function QuietFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.13em] text-faint">{label}</div>
      <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-muted">{value}</p>
    </div>
  );
}
