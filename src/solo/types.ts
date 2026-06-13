export type CrossingStatus = "open" | "adrift" | "ashore";
export type CrossingMessageRole = "passenger" | "narrator" | "aside";
export type CrossingMessageStatus = "streaming" | "complete" | "failed";
export type CrossingMemoryKind =
  | "person"
  | "place"
  | "relationship"
  | "thread"
  | "lore"
  | "object";
export type CrossingMemoryStatus = "proposed" | "kept" | "archived";
export type CrossingSuggestionKind = "atmosphere" | "image";
export type CrossingSuggestionStatus = "pending" | "applied" | "dismissed";

export interface Crossing {
  id: number;
  campaign_id: number;
  pc_id: number;
  title: string;
  status: CrossingStatus;
  summary: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  created_at: string;
  updated_at: string;
}

export interface CrossingMessage {
  id: number;
  crossing_id: number;
  role: CrossingMessageRole;
  body: string;
  status: CrossingMessageStatus;
  reply_to_message_id: number | null;
  provider_id: string | null;
  stop_reason: string | null;
  in_context: number;
  created_at: string;
}

export interface CrossingMemory {
  id: number;
  crossing_id: number | null;
  campaign_id: number;
  pc_id: number | null;
  kind: CrossingMemoryKind;
  title: string;
  body: string;
  status: CrossingMemoryStatus;
  source_message_id: number | null;
  promoted_to: string | null;
  created_at: string;
}

export interface CrossingSuggestion {
  id: number;
  crossing_id: number;
  source_message_id: number;
  kind: CrossingSuggestionKind;
  payload_json: string;
  status: CrossingSuggestionStatus;
  created_at: string;
}
