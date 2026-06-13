import { useEffect, useState } from "react";
import { Confirm } from "../components/Confirm";
import { Markdown } from "../components/Markdown";
import {
  Anchor,
  ChevronLeft,
  Plus,
  Repeat,
  Stop,
  Trash,
} from "../components/icons";
import {
  Button,
  Chip,
  EmptyState,
  TextArea,
  ViewHeader,
} from "../components/ui";
import { useApp } from "../stores/appStore";
import { useData } from "../stores/dataStore";
import { useSolo } from "../stores/soloStore";
import type {
  Crossing,
  CrossingMessage,
  CrossingStatus,
} from "../solo/types";

const STATUS_LABELS: Record<CrossingStatus, string> = {
  open: "Under way",
  adrift: "Adrift",
  ashore: "Ashore",
};

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function SoloCrossing() {
  const campaign = useApp((state) => state.campaign);
  const soloTarget = useApp((state) => state.soloTarget);
  const focus = useApp((state) => state.focus);
  const openSoloCrossing = useApp((state) => state.openSoloCrossing);
  const passengers = useData((state) => state.playerCharacters);
  const {
    crossings,
    activeCrossing,
    messages,
    disclosureAcknowledged,
    providerConfigured,
    providerModel,
    streaming,
    loading,
    error,
    load,
    createCrossing,
    selectCrossing,
    setStatus,
    removeCrossing,
    acknowledgeDisclosure,
    send,
    retry,
    abort,
  } = useSolo();
  const [ending, setEnding] = useState<Crossing | null>(null);
  const [deleting, setDeleting] = useState<Crossing | null>(null);

  const passenger = soloTarget
    ? passengers.find((item) => item.id === soloTarget.passengerId) ?? null
    : null;

  useEffect(() => {
    if (!campaign || !soloTarget) return;
    void load(campaign.id, soloTarget.passengerId, soloTarget.crossingId);
  }, [campaign, load, soloTarget]);

  useEffect(() => () => useSolo.getState().abort(), []);

  const returnToPassenger = () => {
    if (soloTarget) focus("passengers", soloTarget.passengerId);
    else useApp.getState().setView("passengers");
  };

  if (!campaign || !soloTarget || !passenger) {
    return (
      <div className="flex h-full flex-col">
        <ViewHeader
          title="Solo Crossing"
          sub="This passenger is no longer on the manifest"
        >
          <Button variant="ghost" onClick={returnToPassenger}>
            <ChevronLeft size={13} /> Back to Passengers
          </Button>
        </ViewHeader>
        <EmptyState
          icon={<Anchor size={36} />}
          title="The crossing has lost its passenger"
        >
          Return to the manifest and choose someone aboard.
        </EmptyState>
      </div>
    );
  }

  const create = async () => {
    const id = await createCrossing(campaign.id, passenger.id);
    if (id != null) openSoloCrossing(passenger.id, id);
  };

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title="Solo Crossing"
        sub={`${passenger.name}, between one shore and the next`}
      >
        <Button variant="ghost" onClick={returnToPassenger}>
          <ChevronLeft size={13} /> Back to passenger
        </Button>
        <Button
          variant="primary"
          onClick={() => void create()}
          disabled={streaming}
        >
          <Plus size={13} /> New crossing
        </Button>
      </ViewHeader>

      <div className="flex flex-1 overflow-hidden border-t border-line">
        <aside className="flex w-[280px] shrink-0 flex-col border-r border-line bg-panel/40 2xl:w-[330px]">
          <div className="px-5 pb-2 pt-4 text-[10px] uppercase tracking-[0.16em] text-faint">
            {crossings.length}{" "}
            {crossings.length === 1 ? "crossing" : "crossings"}
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {crossings.map((crossing) => (
              <CrossingRow
                key={crossing.id}
                crossing={crossing}
                active={crossing.id === activeCrossing?.id}
                disabled={streaming}
                onSelect={() => {
                  void selectCrossing(crossing.id);
                  openSoloCrossing(passenger.id, crossing.id);
                }}
              />
            ))}
            {!loading && crossings.length === 0 && (
              <p className="px-5 py-10 text-center text-[12.5px] italic leading-relaxed text-faint">
                No private crossings have begun for {passenger.name}.
              </p>
            )}
          </div>
        </aside>

        <section
          className="min-w-0 flex-1 overflow-hidden"
          aria-label="Selected crossing"
        >
          {loading ? (
            <EmptyState
              icon={<Anchor size={34} />}
              title="Opening the private log"
            >
              The page turns quietly.
            </EmptyState>
          ) : error && !activeCrossing ? (
            <EmptyState
              icon={<Anchor size={34} />}
              title="The private log would not open"
            >
              <span className="text-danger">{error}</span>
            </EmptyState>
          ) : activeCrossing ? (
            <CrossingDetail
              key={activeCrossing.id}
              crossing={activeCrossing}
              passengerName={passenger.name}
              messages={messages}
              disclosureAcknowledged={disclosureAcknowledged}
              providerConfigured={providerConfigured}
              providerModel={providerModel}
              streaming={streaming}
              error={error}
              onAcknowledge={() => void acknowledgeDisclosure()}
              onSend={send}
              onRetry={retry}
              onAbort={abort}
              onStatus={(status) =>
                void setStatus(activeCrossing.id, status)
              }
              onEnd={() => setEnding(activeCrossing)}
              onDelete={() => setDeleting(activeCrossing)}
            />
          ) : (
            <EmptyState
              icon={<Anchor size={36} />}
              title="The page is waiting"
            >
              Begin a crossing when {passenger.name} feels the pull.
              <div className="mt-5">
                <Button variant="primary" onClick={() => void create()}>
                  <Plus size={13} /> Begin a crossing
                </Button>
              </div>
            </EmptyState>
          )}
        </section>
      </div>

      {ending && (
        <Confirm
          title="Bring this crossing ashore"
          message="End this crossing? Its private log will remain here and can be reopened later."
          confirmLabel="Bring ashore"
          onCancel={() => setEnding(null)}
          onConfirm={async () => {
            await setStatus(ending.id, "ashore");
            setEnding(null);
          }}
        />
      )}

      {deleting && (
        <Confirm
          title="Delete crossing"
          message="Remove this private crossing and everything remembered within it? This cannot be undone."
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await removeCrossing(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}

function CrossingRow({
  crossing,
  active,
  disabled,
  onSelect,
}: {
  crossing: Crossing;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`mb-1 w-full rounded-md border px-3 py-3 text-left transition-colors disabled:opacity-45 ${
        active
          ? "border-line-strong bg-raised"
          : "border-transparent hover:bg-raised/50"
      }`}
    >
      <span className="block truncate text-sm text-ink">
        {crossingTitle(crossing)}
      </span>
      <span className="mt-1 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-faint">
          {formatDate(crossing.updated_at)}
        </span>
        <span className="text-[10px] text-brass">
          {STATUS_LABELS[crossing.status]}
        </span>
      </span>
    </button>
  );
}

function CrossingDetail({
  crossing,
  passengerName,
  messages,
  disclosureAcknowledged,
  providerConfigured,
  providerModel,
  streaming,
  error,
  onAcknowledge,
  onSend,
  onRetry,
  onAbort,
  onStatus,
  onEnd,
  onDelete,
}: {
  crossing: Crossing;
  passengerName: string;
  messages: CrossingMessage[];
  disclosureAcknowledged: boolean;
  providerConfigured: boolean;
  providerModel: string;
  streaming: boolean;
  error: string | null;
  onAcknowledge: () => void;
  onSend: (body: string) => Promise<void>;
  onRetry: (messageId: number) => Promise<void>;
  onAbort: () => void;
  onStatus: (status: CrossingStatus) => void;
  onEnd: () => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState("");
  const canSend =
    crossing.status === "open" &&
    providerConfigured &&
    disclosureAcknowledged &&
    !streaming;

  const submit = () => {
    const body = draft.trim();
    if (!body || !canSend) return;
    setDraft("");
    void onSend(body);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line bg-panel/25 px-7 py-4 2xl:px-10">
        <div className="mx-auto flex max-w-3xl items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <Chip tone={crossing.status === "open" ? "ember" : "default"}>
                {STATUS_LABELS[crossing.status]}
              </Chip>
              <span className="font-mono text-[10px] text-faint">
                Begun {formatDate(crossing.created_at)}
              </span>
              <span className="text-[10px] text-sea">
                Cloud narrator · {providerModel}
              </span>
            </div>
            <h2 className="truncate font-display text-[24px] leading-tight text-ink">
              {crossingTitle(crossing)}
            </h2>
            <p className="mt-1 text-[11px] text-faint">
              {formatTokenCount(
                crossing.input_tokens + crossing.output_tokens
              )}{" "}
              tokens used in this private crossing
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {crossing.status === "open" && !streaming && (
              <>
                <Button variant="ghost" onClick={() => onStatus("adrift")}>
                  Leave adrift
                </Button>
                <Button variant="subtle" onClick={onEnd}>
                  Bring ashore
                </Button>
              </>
            )}
            {crossing.status === "adrift" && (
              <>
                <Button variant="primary" onClick={() => onStatus("open")}>
                  Resume
                </Button>
                <Button variant="subtle" onClick={onEnd}>
                  Bring ashore
                </Button>
              </>
            )}
            {crossing.status === "ashore" && (
              <Button variant="ghost" onClick={() => onStatus("open")}>
                Reopen
              </Button>
            )}
            <Button
              variant="danger"
              onClick={onDelete}
              disabled={streaming}
              title="Delete crossing"
              aria-label="Delete crossing"
            >
              <Trash size={13} />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-7 2xl:px-10">
        <div className="mx-auto max-w-3xl py-8">
          {!providerConfigured && <MissingKey />}
          {providerConfigured && !disclosureAcknowledged && (
            <Disclosure onAcknowledge={onAcknowledge} />
          )}

          {messages.length === 0 ? (
            <div className="py-14 text-center">
              <Anchor size={28} className="mx-auto text-ember-dim" />
              <h3 className="mt-4 font-display text-xl text-muted">
                The page is waiting
              </h3>
              <p className="mx-auto mt-2 max-w-md text-[13px] italic leading-relaxed text-faint">
                The engines settle into their patient rhythm. Somewhere beyond
                the glass, one shore has gone and the next has not yet appeared.
              </p>
            </div>
          ) : (
            <div className="space-y-7">
              {messages.map((message) => (
                <CrossingTurn
                  key={message.id}
                  message={message}
                  passengerName={passengerName}
                  streaming={streaming}
                  canRetry={canSend}
                  onRetry={() => void onRetry(message.id)}
                />
              ))}
            </div>
          )}

          {error && (
            <div className="mt-7 rounded-md border border-danger/35 bg-danger/5 px-4 py-3 text-[12.5px] leading-relaxed text-danger">
              {error}
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-line bg-panel/70 px-7 py-4 2xl:px-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-2 flex items-center justify-between gap-4 text-[10px] text-faint">
            <span>
              This message and the crossing context leave the device for
              Anthropic.
            </span>
            {streaming && (
              <span className="text-brass">The narrator is writing…</span>
            )}
          </div>
          <div className="flex items-end gap-3">
            <TextArea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
              rows={2}
              disabled={!canSend}
              placeholder={composePlaceholder(
                crossing,
                providerConfigured,
                disclosureAcknowledged
              )}
              className="!font-sans !text-sm"
            />
            {streaming ? (
              <Button
                variant="danger"
                onClick={onAbort}
                className="mb-0.5"
              >
                <Stop size={12} /> Stop
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={submit}
                disabled={!draft.trim() || !canSend}
                className="mb-0.5"
              >
                Send
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

function CrossingTurn({
  message,
  passengerName,
  streaming,
  canRetry,
  onRetry,
}: {
  message: CrossingMessage;
  passengerName: string;
  streaming: boolean;
  canRetry: boolean;
  onRetry: () => void;
}) {
  if (message.role === "passenger") {
    return (
      <article className="ml-6 border-l border-brass/40 pl-5 2xl:ml-10">
        <div className="mb-1.5 text-[10px] uppercase tracking-[0.15em] text-brass">
          {passengerName}
        </div>
        <p className="whitespace-pre-wrap text-[14px] leading-7 text-muted select-text">
          {message.body}
        </p>
      </article>
    );
  }

  if (message.role === "aside") {
    return (
      <article className="rounded-md border border-line bg-panel/40 px-4 py-3">
        <div className="mb-1 text-[10px] uppercase tracking-[0.15em] text-faint">
          Private aside
        </div>
        <p className="whitespace-pre-wrap text-[13px] italic leading-relaxed text-faint select-text">
          {message.body}
        </p>
      </article>
    );
  }

  const failed = message.status === "failed";
  const isWriting = message.status === "streaming";

  return (
    <article>
      <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-faint">
        <span>The crossing</span>
        {isWriting && <span className="normal-case tracking-normal text-brass">writing</span>}
        {failed && (
          <span className="normal-case tracking-normal text-danger">
            interrupted
          </span>
        )}
      </div>
      {message.body ? (
        <Markdown
          text={escapeRawHtml(message.body)}
          className={`solo-narration text-[15px] leading-7 ${
            isWriting ? "solo-ink-arriving" : ""
          }`}
        />
      ) : (
        <p className="text-[13px] italic text-faint">
          {isWriting
            ? "The ink has not reached the page yet."
            : "The reply ended before any ink reached the page."}
        </p>
      )}
      {failed && (
        <div className="mt-3">
          <Button
            variant="ghost"
            onClick={onRetry}
            disabled={streaming || !canRetry}
          >
            <Repeat size={12} /> Retry this reply
          </Button>
        </div>
      )}
    </article>
  );
}

function MissingKey() {
  return (
    <section className="mb-8 rounded-lg border border-line bg-panel/55 px-5 py-4">
      <h3 className="font-display text-lg text-ink">
        The narrator has not boarded
      </h3>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        Add <code>VITE_ANTHROPIC_API_KEY</code> to the gitignored{" "}
        <code>.env.local</code> file, then restart Palefire. The key is read
        only from that local environment file and is never written to either
        database.
      </p>
    </section>
  );
}

function Disclosure({ onAcknowledge }: { onAcknowledge: () => void }) {
  return (
    <section className="mb-8 rounded-lg border border-sea/30 bg-sea/5 px-5 py-4">
      <h3 className="font-display text-lg text-ink">
        Before the first message leaves the ferry
      </h3>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        Solo Crossing sends the campaign setting bible, this passenger's sheet,
        linked campaign records, and the recent private transcript to Anthropic.
        GM-only secrets and what the ferry may need are excluded. Anthropic
        handles the content under the API account's current data terms.
      </p>
      <div className="mt-4">
        <Button variant="primary" onClick={onAcknowledge}>
          I understand. Allow sending.
        </Button>
      </div>
    </section>
  );
}

function crossingTitle(crossing: Crossing): string {
  return crossing.title || `Crossing of ${formatDateTime(crossing.created_at)}`;
}

function composePlaceholder(
  crossing: Crossing,
  providerConfigured: boolean,
  disclosureAcknowledged: boolean
): string {
  if (!providerConfigured) return "Add the local API key to invite the narrator.";
  if (!disclosureAcknowledged) return "Acknowledge what leaves the device before writing.";
  if (crossing.status !== "open") return "Resume or reopen the crossing to continue.";
  return "What does the passenger say or do?  (Enter to send, Shift+Enter for a new line)";
}

function formatTokenCount(tokens: number): string {
  return new Intl.NumberFormat("en-GB").format(tokens);
}

function escapeRawHtml(markdown: string): string {
  return markdown.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function formatDate(timestamp: string): string {
  const parsed = parseTimestamp(timestamp);
  if (Number.isNaN(parsed.getTime())) return timestamp;
  return DATE_FORMAT.format(parsed);
}

function formatDateTime(timestamp: string): string {
  const parsed = parseTimestamp(timestamp);
  if (Number.isNaN(parsed.getTime())) return timestamp;
  return DATE_TIME_FORMAT.format(parsed);
}

function parseTimestamp(timestamp: string): Date {
  return new Date(`${timestamp.replace(" ", "T")}Z`);
}
