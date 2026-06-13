import type { Message } from "@anthropic-ai/sdk/resources/messages";
import type {
  CrossingProvider,
  CrossingStreamRequest,
  StreamChunk,
} from "./provider";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_OUTPUT_TOKENS = 1200;

export const anthropicModel =
  import.meta.env.VITE_ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;

export function hasAnthropicApiKey(): boolean {
  return Boolean(import.meta.env.VITE_ANTHROPIC_API_KEY?.trim());
}

export async function createAnthropicProvider(): Promise<CrossingProvider> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Solo Crossing is not enabled. Add VITE_ANTHROPIC_API_KEY to .env.local and restart Palefire."
    );
  }

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  return {
    model: anthropicModel,
    async *stream(request: CrossingStreamRequest): AsyncIterable<StreamChunk> {
      const stream = client.messages.stream(
        {
          model: anthropicModel,
          max_tokens: MAX_OUTPUT_TOKENS,
          cache_control: { type: "ephemeral" },
          thinking: { type: "adaptive" },
          output_config: { effort: "low" },
          system: request.system.map((block) => ({
            type: "text" as const,
            text: block.text,
          })),
          messages: request.messages.map((turn) => ({
            role: turn.role,
            content: turn.content,
          })),
        },
        { signal: request.signal }
      );

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield { type: "text", text: event.delta.text };
        }
      }

      const finalMessage = await stream.finalMessage();
      yield completeChunk(finalMessage);
    },
  };
}

export function describeAnthropicError(error: unknown): string {
  if (
    error instanceof Error &&
    error.message.startsWith("Solo Crossing is not enabled.")
  ) {
    return error.message;
  }

  const status = providerErrorStatus(error);
  if (status != null) {
    if (status === 401) {
      return "Anthropic did not accept the API key. Check .env.local and restart Palefire.";
    }
    if (status === 429) {
      return "Anthropic is asking this crossing to wait a little before trying again.";
    }
    if (status === 529) {
      return "Anthropic is presently overloaded. The passenger's words remain here for retry.";
    }
    if (status >= 500) {
      return "The narrator could not be reached just now. The passenger's words remain here for retry.";
    }
  }

  if (error instanceof Error && /network|fetch|connection/i.test(error.message)) {
    return "The network did not carry the message through. The passenger's words remain here for retry.";
  }

  return "The narrator fell silent before the reply was complete. The passenger's words remain here for retry.";
}

function providerErrorStatus(error: unknown): number | null {
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }
  return null;
}

function completeChunk(message: Message): StreamChunk {
  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  const cacheCreation = message.usage.cache_creation_input_tokens ?? 0;
  const cacheRead = message.usage.cache_read_input_tokens ?? 0;

  return {
    type: "complete",
    text,
    providerId: message.id,
    stopReason: message.stop_reason,
    inputTokens: message.usage.input_tokens + cacheCreation + cacheRead,
    outputTokens: message.usage.output_tokens,
  };
}
