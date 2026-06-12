import { useEffect, useMemo, useState } from "react";
import type { ArchiveEntry } from "../types";
import { ARCHIVE_CATEGORIES } from "../types";
import { useApp } from "../stores/appStore";
import { useData } from "../stores/dataStore";
import { useAudio } from "../stores/audioStore";
import { useActivateScene } from "../hooks/useActivateScene";
import { fallbackCover } from "../components/cover";
import { CoverImage } from "../components/StoredImage";
import { Markdown } from "../components/Markdown";
import { Button, EmptyState } from "../components/ui";
import {
  ChevronLeft,
  ChevronRight,
  Lantern,
  Pause,
  Play,
  Waves,
  X,
} from "../components/icons";

export function LiveTable() {
  const { campaign, defaultFadeMs } = useApp();
  const { scenes, links, entries, presets, layersByPreset, audioFiles } = useData();
  const audio = useAudio();
  const activate = useActivateScene();
  const [openEntry, setOpenEntry] = useState<ArchiveEntry | null>(null);

  const activeIndex = scenes.findIndex((s) => s.id === campaign?.active_scene_id);
  const scene = activeIndex >= 0 ? scenes[activeIndex] : null;

  const scenePreset = useMemo(
    () => (scene?.preset_id != null ? presets.find((p) => p.id === scene.preset_id) ?? null : null),
    [scene, presets]
  );

  const linkedEntries = useMemo(() => {
    if (!scene) return [];
    const ids = new Set(links.filter((l) => l.scene_id === scene.id).map((l) => l.entry_id));
    return entries.filter((e) => ids.has(e.id));
  }, [scene, links, entries]);

  const go = async (dir: -1 | 1) => {
    if (scenes.length === 0) return;
    const next = activeIndex < 0 ? 0 : Math.min(scenes.length - 1, Math.max(0, activeIndex + dir));
    if (next !== activeIndex) await activate(scenes[next]);
  };

  // session keyboard: arrows move scenes, space holds the air
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      if (openEntry) return;
      if (e.key === "ArrowRight") void go(1);
      else if (e.key === "ArrowLeft") void go(-1);
      else if (e.key === " ") {
        e.preventDefault();
        if (audio.playing) void audio.togglePause();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!scene) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={<Lantern size={36} />} title="No scene is lit">
          Activate a scene on the board, or light the first one now.
          {scenes.length > 0 && (
            <div className="mt-4">
              <Button variant="primary" onClick={() => activate(scenes[0])}>
                <Lantern size={14} /> Light “{scenes[0].title}”
              </Button>
            </div>
          )}
        </EmptyState>
      </div>
    );
  }

  const playingThisPreset = scenePreset != null && audio.presetId === scenePreset.id;

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* backdrop */}
      <div className="absolute inset-0 opacity-50" style={{ background: fallbackCover(scene.title) }} />
      <CoverImage name={scene.background_image} dim={0.62} />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-transparent" />

      {/* content */}
      <div className="relative flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-10 pb-12 pt-14 pf-enter" key={scene.id}>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
            Scene {activeIndex + 1} of {scenes.length}
          </div>
          <h1 className="mt-2 font-display text-[38px] font-medium leading-[1.15] text-ink">
            {scene.title}
          </h1>

          {linkedEntries.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {linkedEntries.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setOpenEntry(e)}
                  className="rounded-full border border-line bg-panel/70 px-3 py-1 text-[12px] text-muted backdrop-blur-sm transition-colors hover:border-ember/40 hover:text-ink"
                  title={ARCHIVE_CATEGORIES.find((c) => c.id === e.category)?.label}
                >
                  {e.title}
                </button>
              ))}
            </div>
          )}

          <div className="mt-7">
            <Markdown text={scene.notes || "*No notes — sail by feel.*"} className="!text-[15.5px] leading-[1.7]" />
          </div>
        </div>
      </div>

      {/* the helm */}
      <div className="relative border-t border-line bg-panel/85 px-6 py-4 backdrop-blur-md">
        {/* crossing strip */}
        <div className="mb-3.5 flex items-center justify-center gap-1.5">
          {scenes.map((s, i) => (
            <button
              key={s.id}
              title={s.title}
              onClick={() => activate(s)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex ? "w-7 bg-ember" : "w-3 bg-line-strong hover:bg-faint"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-4">
          <HelmButton onClick={() => go(-1)} disabled={activeIndex <= 0} title="Previous scene (←)">
            <ChevronLeft size={18} />
            <span className="hidden md:inline">Previous</span>
          </HelmButton>

          <div className="flex min-w-0 items-center justify-center gap-2.5">
            {scenePreset ? (
              <>
                <button
                  onClick={() =>
                    audio.playPreset(
                      scenePreset,
                      layersByPreset.get(scenePreset.id) ?? [],
                      audioFiles,
                      defaultFadeMs
                    )
                  }
                  title={playingThisPreset ? "Restart preset" : "Play this scene's atmosphere"}
                  className={`flex h-11 items-center gap-2.5 rounded-full border px-5 transition-colors ${
                    playingThisPreset && !audio.paused
                      ? "border-ember/60 bg-ember/15 text-ember"
                      : "border-line bg-raised/60 text-muted hover:border-ember/50 hover:text-ember"
                  }`}
                >
                  <Waves size={15} />
                  <span className="max-w-44 truncate text-sm">{scenePreset.name}</span>
                  {playingThisPreset && !audio.paused ? null : <Play size={12} />}
                </button>
                {audio.playing && (
                  <button
                    onClick={() => audio.togglePause()}
                    title={audio.paused ? "Resume (space)" : "Hold (space)"}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-raised/60 text-muted transition-colors hover:text-ink hover:border-line-strong"
                  >
                    {audio.paused ? <Play size={15} /> : <Pause size={15} />}
                  </button>
                )}
              </>
            ) : (
              <span className="text-[12.5px] italic text-faint">This scene carries no atmosphere.</span>
            )}

            <button
              onClick={() => audio.panic()}
              disabled={!audio.playing}
              title="Panic stop — silence, immediately"
              className="flex h-11 items-center gap-2 rounded-full border border-danger/40 px-5 text-[12px] font-medium uppercase tracking-[0.12em] text-danger/90 transition-colors hover:bg-danger/10 hover:border-danger/70 disabled:opacity-25 disabled:pointer-events-none"
            >
              Panic
            </button>
          </div>

          <HelmButton onClick={() => go(1)} disabled={activeIndex >= scenes.length - 1} title="Next scene (→)">
            <span className="hidden md:inline">Next</span>
            <ChevronRight size={18} />
          </HelmButton>
        </div>
      </div>

      {/* entry drawer */}
      {openEntry && (
        <div className="absolute inset-0 z-40 flex justify-end bg-black/40" onMouseDown={(e) => e.target === e.currentTarget && setOpenEntry(null)}>
          <div className="h-full w-[420px] overflow-y-auto border-l border-line-strong bg-panel shadow-[var(--shadow-lift)] pf-modal-in">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-faint">
                  {ARCHIVE_CATEGORIES.find((c) => c.id === openEntry.category)?.label}
                </div>
                <h2 className="font-display text-lg text-ink">{openEntry.title}</h2>
              </div>
              <button onClick={() => setOpenEntry(null)} className="text-faint hover:text-ink transition-colors" title="Close">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4">
              <Markdown text={openEntry.body || "*The page is blank.*"} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HelmButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-line bg-raised/60 px-5 text-sm text-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-25 disabled:pointer-events-none"
    >
      {children}
    </button>
  );
}
