import { campaigns as campaignRepo } from "../db/repo";
import { useApp } from "../stores/appStore";
import { useAudio } from "../stores/audioStore";
import { useData } from "../stores/dataStore";
import type { Scene } from "../types";

/**
 * Activating a scene is the app's central gesture: it marks the scene on the
 * board, and if the scene carries an atmosphere preset, the room crossfades
 * to it in the same motion.
 */
export function useActivateScene() {
  const { campaign, refreshCampaign, defaultFadeMs } = useApp();
  const { presets, layersByPreset, audioFiles } = useData();
  const playPreset = useAudio((s) => s.playPreset);

  return async (scene: Scene, withAtmosphere = true) => {
    if (!campaign) return;
    await campaignRepo.setActiveScene(campaign.id, scene.id);
    await refreshCampaign();

    if (withAtmosphere && scene.preset_id != null) {
      const preset = presets.find((p) => p.id === scene.preset_id);
      const layers = layersByPreset.get(scene.preset_id) ?? [];
      if (preset && layers.length > 0) {
        await playPreset(preset, layers, audioFiles, defaultFadeMs);
      }
    }
  };
}
