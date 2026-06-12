import { useAudio } from "../stores/audioStore";
import { Pause, Play, Stop, Volume } from "../components/icons";
import { IconButton } from "../components/ui";

/**
 * The quiet mixer at the bottom of the sidebar: whatever is sounding in the
 * room, it can always be paused, faded out, or killed from here.
 */
export function NowPlayingDock() {
  const audio = useAudio();

  return (
    <div className="border-t border-line bg-bg-deep/50 px-3.5 pb-3.5 pt-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-[0.14em] text-faint">Now playing</span>
        {audio.playing && (
          <span
            className={`h-1.5 w-1.5 rounded-full ${audio.paused ? "bg-faint" : "bg-ember pf-lantern"}`}
          />
        )}
      </div>

      {audio.playing ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-display text-sm text-ink" title={audio.presetName ?? ""}>
              {audio.presetName ?? "Ad-hoc mix"}
            </span>
            <div className="flex shrink-0 items-center">
              <IconButton title={audio.paused ? "Resume" : "Pause"} onClick={() => audio.togglePause()}>
                {audio.paused ? <Play size={13} /> : <Pause size={13} />}
              </IconButton>
              <IconButton title="Fade out and stop" onClick={() => audio.stop()}>
                <Stop size={13} />
              </IconButton>
            </div>
          </div>
          {audio.paused && <p className="text-[11px] text-faint mt-0.5">Held — the room is waiting.</p>}
        </>
      ) : (
        <p className="text-[12px] text-faint">The room is quiet.</p>
      )}

      <div className="mt-2 flex items-center gap-2">
        <Volume size={13} className="shrink-0 text-faint" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={audio.master}
          onChange={(e) => audio.setMaster(Number(e.target.value))}
          className="w-full"
          title="Master volume"
        />
      </div>

      <button
        onClick={() => audio.panic()}
        disabled={!audio.playing}
        className="mt-2.5 w-full rounded-md border border-danger/35 px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-danger/90 transition-colors hover:bg-danger/10 hover:border-danger/60 disabled:opacity-30 disabled:pointer-events-none"
        title="Stop all sound immediately"
      >
        Panic stop
      </button>
    </div>
  );
}
