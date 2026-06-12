import { useCallback, useEffect, useRef, useState } from "react";
import type { AudioLayer } from "../types";
import {
  createPlayableUrl,
  releasePlayableUrl,
} from "../services/audioFiles";

interface Player {
  audio: HTMLAudioElement;
  filePath: string;
  url: string;
}

export function useAudioLayers(layers: AudioLayer[]) {
  const players = useRef(new Map<string, Player>());
  const [playingIds, setPlayingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const markPlaying = useCallback((id: string, playing: boolean) => {
    setPlayingIds((current) => {
      const next = new Set(current);
      if (playing) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const disposePlayer = useCallback(
    (id: string) => {
      const player = players.current.get(id);
      if (!player) {
        return;
      }

      player.audio.pause();
      player.audio.src = "";
      releasePlayableUrl(player.filePath, player.url);
      players.current.delete(id);
      markPlaying(id, false);
    },
    [markPlaying],
  );

  const stopLayer = useCallback(
    (id: string) => {
      const player = players.current.get(id);
      if (!player) {
        return;
      }

      player.audio.pause();
      player.audio.currentTime = 0;
      markPlaying(id, false);
    },
    [markPlaying],
  );

  const stopAll = useCallback(() => {
    players.current.forEach((player, id) => {
      player.audio.pause();
      player.audio.currentTime = 0;
      markPlaying(id, false);
    });
  }, [markPlaying]);

  const togglePlayback = useCallback(
    async (layer: AudioLayer) => {
      if (!layer.enabled) {
        return;
      }

      setError(null);
      let player = players.current.get(layer.id);

      try {
        if (!player) {
          const url = await createPlayableUrl(layer.filePath);
          const audio = new Audio(url);
          audio.loop = true;
          audio.volume = layer.volume;
          audio.addEventListener("play", () => markPlaying(layer.id, true));
          audio.addEventListener("pause", () => markPlaying(layer.id, false));
          audio.addEventListener("error", () => {
            markPlaying(layer.id, false);
            setError(`Could not play "${layer.name}".`);
          });

          player = { audio, filePath: layer.filePath, url };
          players.current.set(layer.id, player);
        }

        if (player.audio.paused) {
          await player.audio.play();
        } else {
          player.audio.pause();
        }
      } catch (playbackError) {
        setError(
          playbackError instanceof Error
            ? playbackError.message
            : `Could not play "${layer.name}".`,
        );
      }
    },
    [markPlaying],
  );

  useEffect(() => {
    const currentIds = new Set(layers.map((layer) => layer.id));

    players.current.forEach((_, id) => {
      if (!currentIds.has(id)) {
        disposePlayer(id);
      }
    });

    layers.forEach((layer) => {
      const player = players.current.get(layer.id);
      if (!player) {
        return;
      }

      if (player.filePath !== layer.filePath) {
        disposePlayer(layer.id);
        return;
      }

      player.audio.volume = layer.volume;
      if (!layer.enabled) {
        stopLayer(layer.id);
      }
    });
  }, [disposePlayer, layers, stopLayer]);

  useEffect(
    () => () => {
      players.current.forEach((_, id) => disposePlayer(id));
    },
    [disposePlayer],
  );

  return {
    playingIds,
    error,
    togglePlayback,
    stopLayer,
    stopAll,
  };
}
