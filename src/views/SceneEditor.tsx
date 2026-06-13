import { useEffect, useMemo, useState } from "react";
import type { Scene } from "../types";
import { ARCHIVE_CATEGORIES } from "../types";
import { scenes as sceneRepo } from "../db/repo";
import { useApp } from "../stores/appStore";
import { useData } from "../stores/dataStore";
import { Modal } from "../components/Modal";
import { Markdown } from "../components/Markdown";
import { ImagePicker } from "../components/ImagePicker";
import { useStoredImage } from "../components/StoredImage";
import { Button, Field, Input, Select, TextArea } from "../components/ui";

export function SceneEditor({ scene, onClose }: { scene: Scene | null; onClose: () => void }) {
  const { campaign } = useApp();
  const { presets, entries, playerCharacters, reloadScenes } = useData();

  const [title, setTitle] = useState(scene?.title ?? "");
  const [notes, setNotes] = useState(scene?.notes ?? "");
  const [presetId, setPresetId] = useState<number | null>(scene?.preset_id ?? null);
  const [image, setImage] = useState<string | null>(scene?.background_image ?? null);
  const [linked, setLinked] = useState<Set<number>>(new Set());
  const [linkedPcs, setLinkedPcs] = useState<Set<number>>(new Set());
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (scene) {
      void Promise.all([
        sceneRepo.linkedEntryIds(scene.id),
        sceneRepo.linkedPcIds(scene.id),
      ]).then(([entryIds, pcIds]) => {
        setLinked(new Set(entryIds));
        setLinkedPcs(new Set(pcIds));
      });
    }
  }, [scene]);

  const grouped = useMemo(
    () =>
      ARCHIVE_CATEGORIES.map((c) => ({
        ...c,
        entries: entries.filter((e) => e.category === c.id),
      })).filter((g) => g.entries.length > 0),
    [entries]
  );

  const save = async () => {
    const t = title.trim();
    if (!t || !campaign) return;
    let id: number;
    if (scene) {
      await sceneRepo.update(scene.id, {
        title: t,
        notes,
        preset_id: presetId,
        background_image: image,
      });
      id = scene.id;
    } else {
      id = await sceneRepo.create({
        campaign_id: campaign.id,
        title: t,
        notes,
        preset_id: presetId,
        background_image: image,
      });
    }
    await sceneRepo.setLinkedEntries(id, [...linked]);
    await sceneRepo.setLinkedPcs(id, [...linkedPcs]);
    await reloadScenes();
    onClose();
  };

  return (
    <Modal
      wide
      title={scene ? "Edit scene" : "New scene"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={!title.trim()}>
            {scene ? "Save scene" : "Pin to board"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Title">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="The Saloon After Midnight"
            autoFocus
          />
        </Field>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
              Notes <span className="ml-1 normal-case tracking-normal font-normal">markdown</span>
            </span>
            <div className="flex gap-1 text-[11px]">
              <TabBtn active={!preview} onClick={() => setPreview(false)}>
                Write
              </TabBtn>
              <TabBtn active={preview} onClick={() => setPreview(true)}>
                Preview
              </TabBtn>
            </div>
          </div>
          {preview ? (
            <div className="min-h-[200px] max-h-[320px] overflow-y-auto rounded-md border border-line bg-bg-deep/40 px-4 py-3">
              <Markdown text={notes || "*Nothing yet.*"} />
            </div>
          ) : (
            <TextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={9}
              placeholder={"What happens here? What does the room feel like?\n\n- beats\n- secrets\n- **bolded warnings**"}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Atmosphere preset">
            <Select
              value={presetId ?? ""}
              onChange={(e) => setPresetId(e.target.value === "" ? null : Number(e.target.value))}
            >
              <option value="">— none —</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Background image" hint="optional">
            <ImagePicker value={image} onChange={setImage} />
          </Field>
        </div>

        {grouped.length > 0 && (
          <Field label="Linked archive entries">
            <div className="max-h-44 overflow-y-auto rounded-md border border-line bg-bg-deep/40 px-3 py-2">
              {grouped.map((g) => (
                <div key={g.id} className="py-1.5">
                  <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-faint">
                    {g.plural}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {g.entries.map((e) => {
                      const on = linked.has(e.id);
                      return (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => {
                            const next = new Set(linked);
                            if (on) next.delete(e.id);
                            else next.add(e.id);
                            setLinked(next);
                          }}
                          className={`rounded-full border px-2.5 py-1 text-[12px] transition-colors ${
                            on
                              ? "border-ember/50 bg-ember/15 text-ember"
                              : "border-line bg-raised text-muted hover:text-ink hover:border-line-strong"
                          }`}
                        >
                          {e.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Field>
        )}

        {playerCharacters.length > 0 && (
          <Field label="Cast in this scene">
            <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto rounded-md border border-line bg-bg-deep/40 px-3 py-3">
              {playerCharacters.map((passenger) => {
                const on = linkedPcs.has(passenger.id);
                return (
                  <PassengerToggle
                    key={passenger.id}
                    name={passenger.name}
                    image={passenger.image}
                    active={on}
                    onClick={() => {
                      const next = new Set(linkedPcs);
                      if (on) next.delete(passenger.id);
                      else next.add(passenger.id);
                      setLinkedPcs(next);
                    }}
                  />
                );
              })}
            </div>
          </Field>
        )}
      </div>
    </Modal>
  );
}

function PassengerToggle({
  name,
  image,
  active,
  onClick,
}: {
  name: string;
  image: string | null;
  active: boolean;
  onClick: () => void;
}) {
  const url = useStoredImage(image);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[12px] transition-colors ${
        active
          ? "border-ember/50 bg-ember/15 text-ember"
          : "border-line bg-raised text-muted hover:border-line-strong hover:text-ink"
      }`}
    >
      <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-bg-deep font-display text-[10px]">
        {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
      </span>
      {name}
    </button>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-0.5 transition-colors ${
        active ? "bg-raised text-ink border border-line-strong" : "text-faint hover:text-ink border border-transparent"
      }`}
    >
      {children}
    </button>
  );
}
