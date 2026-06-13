import { useEffect, useState } from "react";
import { Confirm } from "../components/Confirm";
import { Anchor, ChevronLeft, Plus, Trash } from "../components/icons";
import { Button, Chip, EmptyState, ViewHeader } from "../components/ui";
import { useApp } from "../stores/appStore";
import { useData } from "../stores/dataStore";
import { useSolo } from "../stores/soloStore";
import type { Crossing, CrossingStatus } from "../solo/types";

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
    loading,
    error,
    load,
    createCrossing,
    selectCrossing,
    setStatus,
    removeCrossing,
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

  const returnToPassenger = () => {
    if (soloTarget) focus("passengers", soloTarget.passengerId);
    else useApp.getState().setView("passengers");
  };

  if (!campaign || !soloTarget || !passenger) {
    return (
      <div className="flex h-full flex-col">
        <ViewHeader title="Solo Crossing" sub="This passenger is no longer on the manifest">
          <Button variant="ghost" onClick={returnToPassenger}>
            <ChevronLeft size={13} /> Back to Passengers
          </Button>
        </ViewHeader>
        <EmptyState icon={<Anchor size={36} />} title="The crossing has lost its passenger">
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
        <Button variant="primary" onClick={() => void create()}>
          <Plus size={13} /> New crossing
        </Button>
      </ViewHeader>

      <div className="flex flex-1 overflow-hidden border-t border-line">
        <aside className="flex w-[300px] shrink-0 flex-col border-r border-line bg-panel/40 2xl:w-[340px]">
          <div className="px-5 pb-2 pt-4 text-[10px] uppercase tracking-[0.16em] text-faint">
            {crossings.length} {crossings.length === 1 ? "crossing" : "crossings"}
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {crossings.map((crossing) => (
              <CrossingRow
                key={crossing.id}
                crossing={crossing}
                active={crossing.id === activeCrossing?.id}
                onSelect={() => {
                  selectCrossing(crossing.id);
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

        <section className="min-w-0 flex-1 overflow-y-auto" aria-label="Selected crossing">
          {loading ? (
            <EmptyState icon={<Anchor size={34} />} title="Opening the private log">
              The page turns quietly.
            </EmptyState>
          ) : error ? (
            <EmptyState icon={<Anchor size={34} />} title="The private log would not open">
              <code className="text-danger">{error}</code>
            </EmptyState>
          ) : activeCrossing ? (
            <CrossingDetail
              crossing={activeCrossing}
              passengerName={passenger.name}
              onStatus={(status) => void setStatus(activeCrossing.id, status)}
              onEnd={() => setEnding(activeCrossing)}
              onDelete={() => setDeleting(activeCrossing)}
            />
          ) : (
            <EmptyState icon={<Anchor size={36} />} title="The page is waiting">
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
  onSelect,
}: {
  crossing: Crossing;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`mb-1 w-full rounded-md border px-3 py-3 text-left transition-colors ${
        active
          ? "border-line-strong bg-raised"
          : "border-transparent hover:bg-raised/50"
      }`}
    >
      <span className="block truncate text-sm text-ink">{crossingTitle(crossing)}</span>
      <span className="mt-1 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-faint">{formatDate(crossing.updated_at)}</span>
        <span className="text-[10px] text-brass">{STATUS_LABELS[crossing.status]}</span>
      </span>
    </button>
  );
}

function CrossingDetail({
  crossing,
  passengerName,
  onStatus,
  onEnd,
  onDelete,
}: {
  crossing: Crossing;
  passengerName: string;
  onStatus: (status: CrossingStatus) => void;
  onEnd: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="mx-auto max-w-3xl px-8 py-10 pf-enter 2xl:px-10 2xl:py-12">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Chip tone={crossing.status === "open" ? "ember" : "default"}>
              {STATUS_LABELS[crossing.status]}
            </Chip>
            <span className="font-mono text-[10px] text-faint">
              Begun {formatDate(crossing.created_at)}
            </span>
          </div>
          <h2 className="font-display text-[30px] leading-tight text-ink">
            {crossingTitle(crossing)}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            A private passage for {passengerName}. Conversation arrives in Phase 2;
            for now, this page keeps the crossing itself.
          </p>
        </div>
        <Button
          variant="danger"
          onClick={onDelete}
          title="Delete crossing"
          aria-label="Delete crossing"
        >
          <Trash size={13} />
        </Button>
      </div>

      <section className="mt-10 rounded-lg border border-line bg-panel/45 px-6 py-10 text-center">
        <Anchor size={28} className="mx-auto text-ember-dim" />
        <h3 className="mt-4 font-display text-lg text-muted">The narrator has not boarded yet</h3>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-faint">
          This crossing is stored locally in <code className="font-mono">data/solo.db</code>.
          No campaign record has been changed.
        </p>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {crossing.status === "open" && (
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
              Resume crossing
            </Button>
            <Button variant="subtle" onClick={onEnd}>
              Bring ashore
            </Button>
          </>
        )}
        {crossing.status === "ashore" && (
          <Button variant="ghost" onClick={() => onStatus("open")}>
            Reopen crossing
          </Button>
        )}
      </div>
    </article>
  );
}

function crossingTitle(crossing: Crossing): string {
  return crossing.title || `Crossing of ${formatDateTime(crossing.created_at)}`;
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
