import { useMemo, useState } from "react";
import type { AudioFile, Preset } from "../types";
import { audioFiles as audioRepo, presets as presetRepo } from "../db/repo";
import { useApp } from "../stores/appStore";
import { useData } from "../stores/dataStore";
import { useAudio } from "../stores/audioStore";
import { engine } from "../audio/engine";
import { deleteAudio, importAudioFiles } from "../files";
import { Modal } from "../components/Modal";
import { Confirm } from "../components/Confirm";
import { Button, Chip, EmptyState, Field, Input, Select, TextArea, ViewHeader } from "../components/ui";
import {
  Music,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat,
  Stop,
  Trash,
  Upload,
  Volume,
  VolumeX,
  Waves,
} from "../components/icons";

export function Atmosphere() {
  const { defaultFadeMs } = useApp();
  const { presets, layersByPreset, audioFiles, reloadPresets, reloadAudioFiles } = useData();
  const audio = useAudio();
  const [editing, setEditing] = useState<Preset | "new" | null>(null);
  const [deleting, setDeleting] = useState<Preset | null>(null);
  const [deletingFile, setDeletingFile] = useState<AudioFile | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");

  const fileNames = useMemo(() => new Map(audioFiles.map((f) => [f.id, f.name])), [audioFiles]);

  const startRename = (f: AudioFile) => {
    setRenamingId(f.id);
    setDraftName(f.name);
  };

  const commitRename = async () => {
    if (renamingId === null) return;
    const id = renamingId;
    setRenamingId(null);
    const name = draftName.trim();
    const current = audioFiles.find((f) => f.id === id);
    if (name && current && name !== current.name) {
      await audioRepo.rename(id, name);
      await reloadAudioFiles();
    }
  };

  const importAudio = async () => {
    const imported = await importAudioFiles();
    for (const f of imported) {
      await audioRepo.create(f.display, `file:${f.stored}`);
    }
    if (imported.length) await reloadAudioFiles();
  };

  return (
    <div className="flex h-full flex-col">
      <ViewHeader title="Atmosphere" sub="Layered sound for the emotional weather of the room">
        <Button variant="ghost" onClick={importAudio}>
          <Upload size={14} /> Import audio
        </Button>
        <Button variant="primary" onClick={() => setEditing("new")}>
          <Plus size={14} /> New preset
        </Button>
      </ViewHeader>

      <div className="flex-1 overflow-y-auto px-8 pb-10 2xl:px-10">
        {/* live mixer for whatever is currently sounding */}
        {audio.playing && (
          <section className="mb-7 rounded-xl border border-ember/30 bg-panel p-5 shadow-[var(--shadow-card)] pf-enter">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`h-2 w-2 rounded-full ${audio.paused ? "bg-faint" : "bg-ember pf-lantern"}`} />
                <h2 className="font-display text-lg text-ink">{audio.presetName ?? "Ad-hoc mix"}</h2>
                <span className="text-[11px] uppercase tracking-[0.14em] text-faint">
                  {audio.paused ? "held" : "in the air"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" onClick={() => audio.togglePause()}>
                  {audio.paused ? <Play size={13} /> : <Pause size={13} />}
                  {audio.paused ? "Resume" : "Pause"}
                </Button>
                <Button variant="ghost" onClick={() => audio.stop()}>
                  <Stop size={13} /> Fade out
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              {audio.layers.map((l) => (
                <div key={l.key} className="flex items-center gap-3">
                  <button
                    onClick={() => audio.toggleMute(l.key)}
                    title={l.muted ? "Unmute" : "Mute"}
                    className={`shrink-0 transition-colors ${l.muted ? "text-danger" : "text-faint hover:text-ink"}`}
                  >
                    {l.muted ? <VolumeX size={15} /> : <Volume size={15} />}
                  </button>
                  <span className={`w-44 truncate text-[13px] ${l.muted ? "text-faint line-through" : "text-muted"}`}>
                    {l.name}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={l.volume}
                    onChange={(e) => audio.setLayerVolume(l.key, Number(e.target.value))}
                    className="flex-1"
                  />
                  <button
                    onClick={() => audio.toggleLoop(l.key)}
                    title={l.loop ? "Looping — click to play once" : "Play once — click to loop"}
                    className={`shrink-0 transition-colors ${l.loop ? "text-sea" : "text-faint hover:text-ink"}`}
                  >
                    <Repeat size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* presets */}
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-faint">Presets</h2>
        {presets.length === 0 ? (
          <EmptyState icon={<Waves size={34} />} title="No moods prepared">
            A preset is a saved mix — several loops at chosen volumes, with fade timings. Scenes can
            carry one, so the room changes when the story does.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3 2xl:gap-5">
            {presets.map((p) => {
              const layers = layersByPreset.get(p.id) ?? [];
              const isActive = audio.presetId === p.id;
              return (
                <article
                  key={p.id}
                  className={`group rounded-lg border bg-panel p-4 shadow-[var(--shadow-card)] transition-colors pf-enter ${
                    isActive ? "border-ember/50" : "border-line hover:border-line-strong"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-[16px] text-ink leading-snug">{p.name}</h3>
                      {p.description && (
                        <p className="mt-0.5 text-[12.5px] italic leading-snug text-faint">{p.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        title={isActive ? "Restart preset" : "Play preset"}
                        onClick={() => audio.playPreset(p, layers, audioFiles, defaultFadeMs)}
                        disabled={layers.length === 0}
                        className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:opacity-30 ${
                          isActive
                            ? "border-ember/60 bg-ember/15 text-ember"
                            : "border-line text-muted hover:border-ember/50 hover:text-ember"
                        }`}
                      >
                        <Play size={13} />
                      </button>
                      <button
                        title="Edit preset"
                        onClick={() => setEditing(p)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-faint opacity-0 transition-all hover:text-ink group-hover:opacity-100"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        title="Delete preset"
                        onClick={() => setDeleting(p)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-faint opacity-0 transition-all hover:text-danger group-hover:opacity-100"
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {layers.map((l) => (
                      <Chip key={l.id} tone={isActive ? "ember" : "default"}>
                        <Music size={10} /> {fileNames.get(l.audio_file_id) ?? "?"} ·{" "}
                        {Math.round(l.volume * 100)}%
                      </Chip>
                    ))}
                    {layers.length === 0 && <Chip>empty preset</Chip>}
                  </div>
                  <div className="mt-2.5 font-mono text-[10.5px] text-faint">
                    fade in {(p.fade_in_ms / 1000).toFixed(1)}s · fade out {(p.fade_out_ms / 1000).toFixed(1)}s
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* sound library */}
        <h2 className="mb-3 mt-9 text-[11px] font-medium uppercase tracking-[0.16em] text-faint">
          Sound library
        </h2>
        <div className="overflow-hidden rounded-lg border border-line bg-panel/60">
          {audioFiles.map((f, i) => {
            const previewing = audio.presetId === null && audio.playing && audio.layers.some((l) => l.fileId === f.id);
            return (
              <div
                key={f.id}
                className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-line/60" : ""}`}
              >
                <button
                  title={previewing ? "Stop preview" : "Preview"}
                  onClick={() => (previewing ? audio.stop() : audio.preview(f))}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    previewing
                      ? "border-ember/60 bg-ember/15 text-ember"
                      : "border-line text-muted hover:border-ember/50 hover:text-ember"
                  }`}
                >
                  {previewing ? <Stop size={11} /> : <Play size={11} />}
                </button>
                {renamingId === f.id ? (
                  <Input
                    autoFocus
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      else if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="min-w-0 flex-1 py-1 text-sm"
                  />
                ) : (
                  <button
                    title="Rename"
                    onDoubleClick={() => startRename(f)}
                    className="min-w-0 flex-1 truncate text-left text-sm text-ink"
                  >
                    {f.name}
                  </button>
                )}
                <button
                  title="Rename"
                  onClick={() => startRename(f)}
                  className="shrink-0 text-faint transition-colors hover:text-ember"
                >
                  <Pencil size={13} />
                </button>
                <button
                  title="Remove from library"
                  onClick={() => setDeletingFile(f)}
                  className="shrink-0 text-faint transition-colors hover:text-danger"
                >
                  <Trash size={13} />
                </button>
              </div>
            );
          })}
          {audioFiles.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-faint">
              No sounds yet — import some audio files to begin.
            </p>
          )}
        </div>
      </div>

      {editing && (
        <PresetEditor preset={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}

      {deleting && (
        <Confirm
          title="Delete preset"
          message={`Delete "${deleting.name}"? Scenes that use it will fall silent.`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await presetRepo.remove(deleting.id);
            setDeleting(null);
            await reloadPresets();
            await useData.getState().reloadScenes();
          }}
        />
      )}

      {deletingFile && (
        <Confirm
          title="Remove sound"
          message={`Remove "${deletingFile.name}" from the library? Presets using it will lose this layer.`}
          onCancel={() => setDeletingFile(null)}
          onConfirm={async () => {
            await audioRepo.remove(deletingFile.id);
            if (deletingFile.source.startsWith("file:")) {
              try {
                await deleteAudio(deletingFile.source.slice("file:".length));
              } catch {
                // the file may already be gone; the library row is what matters
              }
            }
            engine.forget(deletingFile.id);
            setDeletingFile(null);
            await reloadAudioFiles();
            await reloadPresets();
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------- preset editor -------------------------------- */

interface DraftLayer {
  audio_file_id: number;
  volume: number;
  loop: boolean;
}

function PresetEditor({ preset, onClose }: { preset: Preset | null; onClose: () => void }) {
  const { campaign, defaultFadeMs } = useApp();
  const { audioFiles, layersByPreset, reloadPresets } = useData();

  const [name, setName] = useState(preset?.name ?? "");
  const [description, setDescription] = useState(preset?.description ?? "");
  const [fadeIn, setFadeIn] = useState(preset?.fade_in_ms ?? defaultFadeMs);
  const [fadeOut, setFadeOut] = useState(preset?.fade_out_ms ?? defaultFadeMs);
  const [layers, setLayers] = useState<DraftLayer[]>(() =>
    (preset ? layersByPreset.get(preset.id) ?? [] : []).map((l) => ({
      audio_file_id: l.audio_file_id,
      volume: l.volume,
      loop: l.loop !== 0,
    }))
  );

  const fileNames = useMemo(() => new Map(audioFiles.map((f) => [f.id, f.name])), [audioFiles]);
  const unusedFiles = audioFiles.filter((f) => !layers.some((l) => l.audio_file_id === f.id));

  const save = async () => {
    const n = name.trim();
    if (!n || !campaign) return;
    let id: number;
    if (preset) {
      await presetRepo.update(preset.id, {
        name: n,
        description,
        fade_in_ms: fadeIn,
        fade_out_ms: fadeOut,
      });
      id = preset.id;
    } else {
      id = await presetRepo.create({
        campaign_id: campaign.id,
        name: n,
        description,
        fade_in_ms: fadeIn,
        fade_out_ms: fadeOut,
      });
    }
    await presetRepo.setLayers(
      id,
      layers.map((l) => ({ audio_file_id: l.audio_file_id, volume: l.volume, loop: l.loop ? 1 : 0 }))
    );
    await reloadPresets();
    onClose();
  };

  return (
    <Modal
      wide
      title={preset ? "Edit preset" : "New preset"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={!name.trim()}>
            {preset ? "Save preset" : "Create preset"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Storm Crossing" autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fade in" hint="seconds">
              <Input
                type="number"
                min={0}
                step={0.5}
                value={fadeIn / 1000}
                onChange={(e) => setFadeIn(Math.max(0, Number(e.target.value)) * 1000)}
              />
            </Field>
            <Field label="Fade out" hint="seconds">
              <Input
                type="number"
                min={0}
                step={0.5}
                value={fadeOut / 1000}
                onChange={(e) => setFadeOut(Math.max(0, Number(e.target.value)) * 1000)}
              />
            </Field>
          </div>
        </div>

        <Field label="Description" hint="optional">
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What does this mood do to the room?"
            className="!font-sans !text-sm"
          />
        </Field>

        <Field label="Layers">
          <div className="flex flex-col gap-2">
            {layers.map((l, i) => (
              <div key={i} className="flex items-center gap-3 rounded-md border border-line bg-bg-deep/40 px-3 py-2">
                <Music size={13} className="shrink-0 text-faint" />
                <span className="w-40 truncate text-[13px] text-ink">
                  {fileNames.get(l.audio_file_id) ?? "missing sound"}
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={l.volume}
                  onChange={(e) =>
                    setLayers(layers.map((x, j) => (j === i ? { ...x, volume: Number(e.target.value) } : x)))
                  }
                  className="flex-1"
                />
                <span className="w-9 shrink-0 text-right font-mono text-[11px] text-faint">
                  {Math.round(l.volume * 100)}%
                </span>
                <button
                  title={l.loop ? "Looping" : "Plays once"}
                  onClick={() => setLayers(layers.map((x, j) => (j === i ? { ...x, loop: !x.loop } : x)))}
                  className={`shrink-0 transition-colors ${l.loop ? "text-sea" : "text-faint hover:text-ink"}`}
                >
                  <Repeat size={14} />
                </button>
                <button
                  title="Remove layer"
                  onClick={() => setLayers(layers.filter((_, j) => j !== i))}
                  className="shrink-0 text-faint transition-colors hover:text-danger"
                >
                  <Trash size={13} />
                </button>
              </div>
            ))}

            {unusedFiles.length > 0 ? (
              <Select
                value=""
                onChange={(e) => {
                  const id = Number(e.target.value);
                  if (id) setLayers([...layers, { audio_file_id: id, volume: 0.7, loop: true }]);
                }}
              >
                <option value="">+ Add a layer…</option>
                {unusedFiles.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            ) : (
              layers.length === 0 && (
                <p className="text-[12.5px] text-faint">Import audio in the library first, then layer it here.</p>
              )
            )}
          </div>
        </Field>
      </div>
    </Modal>
  );
}
