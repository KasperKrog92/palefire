export interface SystemBlock {
  text: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface CrossingStreamRequest {
  system: SystemBlock[];
  messages: ChatTurn[];
  signal: AbortSignal;
}

export type StreamChunk =
  | { type: "text"; text: string }
  | {
      type: "complete";
      text: string;
      providerId: string;
      stopReason: string | null;
      inputTokens: number;
      outputTokens: number;
    };

export interface CrossingProvider {
  readonly model: string;
  stream(request: CrossingStreamRequest): AsyncIterable<StreamChunk>;
}
