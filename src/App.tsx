import { useEffect, useState } from "react";
import { AudioView } from "./components/AudioView";
import { CampaignView } from "./components/CampaignView";
import { ScenesView } from "./components/ScenesView";
import { Sidebar } from "./components/Sidebar";
import { useAudioLayers } from "./hooks/useAudioLayers";
import { importAudioFiles, renameAudioFile } from "./services/audioFiles";
import { loadAppState, saveAppState } from "./services/persistence";
import type { AppState, AudioLayer, ViewId } from "./types";
import "./App.css";

const initialState: AppState = {
  version: 1,
  audioLayers: [],
};

function App() {
  const [activeView, setActiveView] = useState<ViewId>("audio");
  const [appState, setAppState] = useState<AppState>(initialState);
  const [isHydrated, setIsHydrated] = useState(false);
  const [canPersist, setCanPersist] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  const audio = useAudioLayers(appState.audioLayers);

  useEffect(() => {
    loadAppState()
      .then((state) => {
        setAppState(state);
        setCanPersist(true);
      })
      .catch((error: unknown) => {
        setStorageError(
          error instanceof Error ? error.message : "Could not load saved data.",
        );
      })
      .finally(() => setIsHydrated(true));
  }, []);

  useEffect(() => {
    if (!isHydrated || !canPersist) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      saveAppState(appState)
        .then(() => setStorageError(null))
        .catch((error: unknown) => {
          setStorageError(
            error instanceof Error
              ? error.message
              : "Could not save local data.",
          );
        });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [appState, canPersist, isHydrated]);

  async function addAudioLayers() {
    try {
      const files = await importAudioFiles();
      if (files.length === 0) {
        return;
      }

      setAppState((current) => {
        const additions: AudioLayer[] = files.map((file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          filePath: file.path,
          volume: 0.7,
          enabled: true,
        }));

        return {
          ...current,
          audioLayers: [...current.audioLayers, ...additions],
        };
      });
      setStorageError(null);
    } catch (error) {
      setStorageError(
        error instanceof Error ? error.message : "Could not import audio.",
      );
    }
  }

  function updateLayer(id: string, patch: Partial<AudioLayer>) {
    setAppState((current) => ({
      ...current,
      audioLayers: current.audioLayers.map((layer) =>
        layer.id === id ? { ...layer, ...patch } : layer,
      ),
    }));
  }

  function removeLayer(id: string) {
    audio.stopLayer(id);
    setAppState((current) => ({
      ...current,
      audioLayers: current.audioLayers.filter((layer) => layer.id !== id),
    }));
  }

  async function renameLayer(id: string, newName: string) {
    const layer = appState.audioLayers.find((item) => item.id === id);
    if (!layer) {
      return;
    }

    try {
      audio.stopLayer(id);
      const renamed = await renameAudioFile(layer.filePath, newName);
      updateLayer(id, {
        name: renamed.name,
        filePath: renamed.path,
      });
      setStorageError(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not rename audio.";
      setStorageError(message);
      throw new Error(message);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onChange={setActiveView} />

      <main className="main-content">
        {storageError && (
          <div className="status-banner" role="alert">
            {storageError}
          </div>
        )}

        {activeView === "campaign" && <CampaignView />}
        {activeView === "scenes" && <ScenesView />}
        {activeView === "audio" && (
          <AudioView
            layers={appState.audioLayers}
            playingIds={audio.playingIds}
            playbackError={audio.error}
            isLoading={!isHydrated}
            onAdd={addAudioLayers}
            onTogglePlayback={audio.togglePlayback}
            onUpdate={updateLayer}
            onRename={renameLayer}
            onRemove={removeLayer}
            onStopAll={audio.stopAll}
          />
        )}
      </main>
    </div>
  );
}

export default App;
