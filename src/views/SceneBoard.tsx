import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Scene } from "../types";
import { scenes as sceneRepo } from "../db/repo";
import { useApp } from "../stores/appStore";
import { useData } from "../stores/dataStore";
import { useActivateScene } from "../hooks/useActivateScene";
import { stripMarkdown } from "../lib/text";
import { fallbackCover } from "../components/cover";
import { CoverImage } from "../components/StoredImage";
import { Confirm } from "../components/Confirm";
import { Button, Chip, EmptyState, ViewHeader } from "../components/ui";
import { Cards, Copy, Grip, Lantern, LinkIcon, Pencil, Plus, Trash, Waves } from "../components/icons";
import { SceneEditor } from "./SceneEditor";

export function SceneBoard() {
  const { campaign } = useApp();
  const { scenes, links, presets, reloadScenes, setScenesOptimistic } = useData();
  const [editing, setEditing] = useState<Scene | "new" | null>(null);
  const [deleting, setDeleting] = useState<Scene | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const linkCounts = useMemo(() => {
    const m = new Map<number, number>();
    for (const l of links) m.set(l.scene_id, (m.get(l.scene_id) ?? 0) + 1);
    return m;
  }, [links]);

  const presetNames = useMemo(() => new Map(presets.map((p) => [p.id, p.name])), [presets]);

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = scenes.findIndex((s) => s.id === active.id);
    const newIndex = scenes.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(scenes, oldIndex, newIndex);
    setScenesOptimistic(next);
    await sceneRepo.reorder(next.map((s) => s.id));
    await reloadScenes();
  };

  return (
    <div className="flex h-full flex-col">
      <ViewHeader title="Scene Board" sub={`${scenes.length} scene${scenes.length === 1 ? "" : "s"} prepared for the crossing`}>
        <Button variant="primary" onClick={() => setEditing("new")}>
          <Plus size={14} /> New scene
        </Button>
      </ViewHeader>

      <div className="flex-1 overflow-y-auto px-8 pb-10">
        {scenes.length === 0 ? (
          <EmptyState icon={<Cards size={36} />} title="The board is bare">
            Scenes are your index cards for the night — notes, atmosphere, and the people in the
            room. Pin the first one.
          </EmptyState>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={scenes.map((s) => s.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {scenes.map((s, i) => (
                  <SceneCard
                    key={s.id}
                    scene={s}
                    index={i}
                    active={campaign?.active_scene_id === s.id}
                    presetName={s.preset_id != null ? presetNames.get(s.preset_id) ?? null : null}
                    linkCount={linkCounts.get(s.id) ?? 0}
                    onEdit={() => setEditing(s)}
                    onDelete={() => setDeleting(s)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {editing && (
        <SceneEditor scene={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}

      {deleting && (
        <Confirm
          title="Delete scene"
          message={`Take "${deleting.title}" off the board? Its notes go with it.`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await sceneRepo.remove(deleting.id);
            setDeleting(null);
            await reloadScenes();
          }}
        />
      )}
    </div>
  );
}

function SceneCard({
  scene,
  index,
  active,
  presetName,
  linkCount,
  onEdit,
  onDelete,
}: {
  scene: Scene;
  index: number;
  active: boolean;
  presetName: string | null;
  linkCount: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const activate = useActivateScene();
  const reloadScenes = useData((s) => s.reloadScenes);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: scene.id,
  });

  // each card leans a little, like it was pinned by hand
  const lean = ((scene.id * 37) % 5) * 0.45 - 0.9;

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        rotate: isDragging ? "0deg" : `${lean}deg`,
        zIndex: isDragging ? 30 : undefined,
      }}
      className={`group relative flex min-h-[176px] flex-col overflow-hidden rounded-lg border bg-panel shadow-[var(--shadow-card)] transition-shadow duration-200 pf-enter ${
        isDragging ? "opacity-80 shadow-[var(--shadow-lift)]" : "hover:shadow-[var(--shadow-lift)]"
      } ${active ? "border-ember/60" : "border-line hover:border-line-strong"}`}
    >
      {scene.background_image && (
        <div className="absolute inset-0 opacity-25">
          <CoverImage name={scene.background_image} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-panel" />
        </div>
      )}

      {/* the pin */}
      <span
        className={`absolute left-1/2 top-2 h-2 w-2 -translate-x-1/2 rounded-full border ${
          active ? "bg-ember border-ember-bright pf-lantern" : "bg-overlay border-line-strong"
        }`}
      />

      <div
        className="absolute left-1.5 top-1.5 cursor-grab touch-none rounded p-1 text-faint opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing hover:text-muted"
        title="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <Grip size={14} />
      </div>

      <div className="relative flex flex-1 flex-col px-5 pb-4 pt-7">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[11px] text-faint">{String(index + 1).padStart(2, "0")}</span>
          <h3 className="font-display text-[17px] leading-snug text-ink">{scene.title}</h3>
        </div>

        {scene.notes && (
          <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-muted">
            {stripMarkdown(scene.notes)}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
          {active && <Chip tone="ember">● active</Chip>}
          {presetName && (
            <Chip tone="sea">
              <Waves size={11} /> {presetName}
            </Chip>
          )}
          {linkCount > 0 && (
            <Chip>
              <LinkIcon size={11} /> {linkCount}
            </Chip>
          )}
        </div>
      </div>

      <div className="relative flex items-center justify-between border-t border-line/70 bg-bg-deep/30 px-3 py-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <button
          onClick={() => activate(scene)}
          className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-[12px] transition-colors ${
            active ? "text-ember" : "text-muted hover:text-ember"
          }`}
          title={scene.preset_id ? "Activate scene and start its atmosphere" : "Activate scene"}
        >
          <Lantern size={13} /> {active ? "Active" : "Activate"}
        </button>
        <div className="flex items-center gap-0.5">
          <CardBtn title="Edit" onClick={onEdit}>
            <Pencil size={13} />
          </CardBtn>
          <CardBtn
            title="Duplicate"
            onClick={async () => {
              await sceneRepo.duplicate(scene.id);
              await reloadScenes();
            }}
          >
            <Copy size={13} />
          </CardBtn>
          <CardBtn title="Delete" onClick={onDelete} danger>
            <Trash size={13} />
          </CardBtn>
        </div>
      </div>

      {active && (
        <div
          className="pointer-events-none absolute inset-0 rounded-lg"
          style={{ boxShadow: "inset 0 0 32px rgba(217, 146, 75, 0.07)" }}
        />
      )}
      {!scene.background_image && active && (
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ background: fallbackCover(scene.title) }} />
      )}
    </article>
  );
}

function CardBtn({
  title,
  onClick,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex h-6.5 w-6.5 items-center justify-center rounded p-1 transition-colors ${
        danger ? "text-faint hover:text-danger" : "text-faint hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
