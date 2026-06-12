import { Check, Pause, Pencil, Play, Trash2, Volume2, X } from "lucide-react";
import { FormEvent, useState } from "react";
import type { AudioLayer } from "../types";

interface AudioLayerCardProps {
  layer: AudioLayer;
  isPlaying: boolean;
  onTogglePlayback: (layer: AudioLayer) => void;
  onUpdate: (id: string, patch: Partial<AudioLayer>) => void;
  onRename: (id: string, newName: string) => Promise<void>;
  onRemove: (id: string) => void;
}

function displayPath(filePath: string) {
  const parts = filePath.split(/[\\/]/);
  if (parts.length < 2 || filePath.startsWith("browser://")) {
    return "Palefire audio library";
  }

  return parts.slice(0, -1).join("\\");
}

function splitFileName(name: string) {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex <= 0) {
    return { stem: name, extension: "" };
  }

  return {
    stem: name.slice(0, dotIndex),
    extension: name.slice(dotIndex),
  };
}

export function AudioLayerCard({
  layer,
  isPlaying,
  onTogglePlayback,
  onUpdate,
  onRename,
  onRemove,
}: AudioLayerCardProps) {
  const { stem, extension } = splitFileName(layer.name);
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(stem);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  function beginRename() {
    setDraftName(splitFileName(layer.name).stem);
    setRenameError(null);
    setIsEditing(true);
  }

  function cancelRename() {
    setDraftName(splitFileName(layer.name).stem);
    setRenameError(null);
    setIsEditing(false);
  }

  async function submitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftName.trim()) {
      setRenameError("Enter a file name.");
      return;
    }

    setIsRenaming(true);
    setRenameError(null);
    try {
      await onRename(layer.id, draftName);
      setIsEditing(false);
    } catch (error) {
      setRenameError(
        error instanceof Error ? error.message : "Could not rename the file.",
      );
    } finally {
      setIsRenaming(false);
    }
  }

  return (
    <article className={`audio-layer ${layer.enabled ? "" : "disabled"}`}>
      <button
        className="play-button"
        type="button"
        disabled={!layer.enabled}
        aria-label={isPlaying ? `Pause ${layer.name}` : `Play ${layer.name}`}
        onClick={() => onTogglePlayback(layer)}
      >
        {isPlaying ? (
          <Pause size={17} fill="currentColor" />
        ) : (
          <Play size={17} fill="currentColor" />
        )}
      </button>

      <div className="layer-meta">
        {isEditing ? (
          <form className="rename-form" onSubmit={submitRename}>
            <div className="rename-field">
              <input
                className="rename-input"
                value={draftName}
                aria-label={`New file name for ${layer.name}`}
                autoFocus
                disabled={isRenaming}
                onChange={(event) => setDraftName(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    cancelRename();
                  }
                }}
              />
              <span className="rename-extension">{extension}</span>
            </div>
            <button
              className="rename-action confirm"
              type="submit"
              aria-label="Save file name"
              disabled={isRenaming}
            >
              <Check size={14} />
            </button>
            <button
              className="rename-action"
              type="button"
              aria-label="Cancel rename"
              disabled={isRenaming}
              onClick={cancelRename}
            >
              <X size={14} />
            </button>
          </form>
        ) : (
          <div className="layer-name" title={layer.name}>
            {layer.name}
          </div>
        )}
        {renameError ? (
          <div className="rename-error">{renameError}</div>
        ) : (
          <div
            className={`layer-path ${isPlaying ? "playing-label" : ""}`}
            title={layer.filePath}
          >
            {isPlaying ? "Playing in loop" : displayPath(layer.filePath)}
          </div>
        )}
      </div>

      <button
        className={`layer-toggle ${layer.enabled ? "on" : ""}`}
        type="button"
        role="switch"
        aria-checked={layer.enabled}
        aria-label={`${layer.enabled ? "Disable" : "Enable"} ${layer.name}`}
        onClick={() => onUpdate(layer.id, { enabled: !layer.enabled })}
      />

      <label className="volume-control">
        <Volume2 size={15} aria-hidden="true" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={layer.volume}
          disabled={!layer.enabled}
          aria-label={`${layer.name} volume`}
          onChange={(event) =>
            onUpdate(layer.id, { volume: Number(event.currentTarget.value) })
          }
        />
        <span className="volume-value">
          {Math.round(layer.volume * 100)}
        </span>
      </label>

      <div className="layer-actions">
        <button
          className="icon-button rename-button"
          type="button"
          aria-label={`Rename ${layer.name}`}
          disabled={isEditing}
          onClick={beginRename}
        >
          <Pencil size={14} />
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label={`Remove ${layer.name}`}
          onClick={() => onRemove(layer.id)}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  );
}
