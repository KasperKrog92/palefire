export type ViewId = "campaign" | "scenes" | "audio";

export interface AudioLayer {
  id: string;
  name: string;
  filePath: string;
  volume: number;
  enabled: boolean;
}

export interface AppState {
  version: number;
  audioLayers: AudioLayer[];
}

export interface ManagedAudioFile {
  name: string;
  path: string;
}
