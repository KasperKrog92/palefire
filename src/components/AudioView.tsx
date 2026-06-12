import { CircleStop, Music2, Plus } from "lucide-react";
import type { AudioLayer } from "../types";
import { AudioLayerCard } from "./AudioLayerCard";

interface AudioViewProps {
  layers: AudioLayer[];
  playingIds: Set<string>;
  playbackError: string | null;
  isLoading: boolean;
  onAdd: () => void;
  onTogglePlayback: (layer: AudioLayer) => void;
  onUpdate: (id: string, patch: Partial<AudioLayer>) => void;
  onRename: (id: string, newName: string) => Promise<void>;
  onRemove: (id: string) => void;
  onStopAll: () => void;
}

export function AudioView({
  layers,
  playingIds,
  playbackError,
  isLoading,
  onAdd,
  onTogglePlayback,
  onUpdate,
  onRename,
  onRemove,
  onStopAll,
}: AudioViewProps) {
  const playingCount = playingIds.size;

  return (
    <section className="view">
      <header className="view-header">
        <div>
          <p className="eyebrow">Audio</p>
          <h1>Shape the atmosphere</h1>
          <p className="view-description">
            Layer music and ambience, then tune each source without breaking
            the scene.
          </p>
        </div>
        <div className="header-actions">
          <button
            className="secondary-button"
            type="button"
            disabled={playingCount === 0}
            onClick={onStopAll}
          >
            <CircleStop size={15} />
            Stop all
          </button>
          <button className="primary-button" type="button" onClick={onAdd}>
            <Plus size={15} />
            Add audio
          </button>
        </div>
      </header>

      {playbackError && (
        <div className="playback-error" role="alert">
          {playbackError}
        </div>
      )}

      {isLoading ? (
        <div className="loading-state">Loading your audio layers...</div>
      ) : layers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-content">
            <span className="empty-icon">
              <Music2 size={23} />
            </span>
            <h2>No audio layers yet</h2>
            <p>
              Add local music or ambience files. Each one becomes an
              independent, looping layer.
            </p>
            <button className="primary-button" type="button" onClick={onAdd}>
              <Plus size={15} />
              Add your first layer
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="section-heading">
            <h2>Layers</h2>
            <span className="layer-count">
              {playingCount > 0
                ? `${playingCount} playing`
                : `${layers.length} ${layers.length === 1 ? "layer" : "layers"}`}
            </span>
          </div>
          <div className="layer-list">
            {layers.map((layer) => (
              <AudioLayerCard
                key={layer.id}
                layer={layer}
                isPlaying={playingIds.has(layer.id)}
                onTogglePlayback={onTogglePlayback}
                onUpdate={onUpdate}
                onRename={onRename}
                onRemove={onRemove}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
