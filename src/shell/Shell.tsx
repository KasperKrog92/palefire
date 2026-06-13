import type { ReactNode } from "react";
import { useApp, type View } from "../stores/appStore";
import {
  Book,
  Cards,
  ChevronLeft,
  Gear,
  Lantern,
  Log,
  Passengers as PassengersIcon,
  Waves,
} from "../components/icons";
import { NowPlayingDock } from "./NowPlayingDock";
import { SceneBoard } from "../views/SceneBoard";
import { Archives } from "../views/Archives";
import { Passengers } from "../views/Passengers";
import { Atmosphere } from "../views/Atmosphere";
import { LiveTable } from "../views/LiveTable";
import { Logbook } from "../views/Logbook";
import { Settings } from "../views/Settings";
import { SoloCrossing } from "../views/SoloCrossing";
import palefireLogo from "../assets/palefire-logo.png";

const NAV: { view: View; label: string; icon: ReactNode }[] = [
  { view: "scenes", label: "Scene Board", icon: <Cards size={16} /> },
  { view: "archives", label: "Archives", icon: <Book size={16} /> },
  { view: "passengers", label: "Passengers", icon: <PassengersIcon size={16} /> },
  { view: "atmosphere", label: "Atmosphere", icon: <Waves size={16} /> },
  { view: "live", label: "Live Table", icon: <Lantern size={16} /> },
  { view: "logbook", label: "Logbook", icon: <Log size={16} /> },
  { view: "settings", label: "Settings", icon: <Gear size={16} /> },
];

export function Shell() {
  const { campaign, view, setView, closeCampaign } = useApp();

  return (
    <div className="flex h-full">
      <aside className="flex w-[218px] shrink-0 flex-col border-r border-line bg-panel/70 2xl:w-[240px]">
        <div className="px-4 pt-4 pb-1">
          <img src={palefireLogo} alt="Palefire" className="pf-brand-logo h-9 w-auto max-w-full" />
        </div>

        <button
          onClick={closeCampaign}
          className="group mx-3 mt-3 mb-1 rounded-lg border border-line bg-bg-deep/40 px-3 py-2.5 text-left hover:border-line-strong transition-colors"
          title="Switch campaign"
        >
          <span className="block text-[10px] uppercase tracking-[0.14em] text-faint mb-0.5">
            Campaign
          </span>
          <span className="flex items-center gap-1.5 text-sm text-ink leading-snug">
            <ChevronLeft size={12} className="text-faint group-hover:text-ember transition-colors shrink-0" />
            <span className="truncate font-display">{campaign?.title}</span>
          </span>
        </button>

        <nav className="flex flex-col gap-0.5 px-3 py-3">
          {NAV.map((item) => {
            const active = view === item.view;
            return (
              <button
                key={item.view}
                onClick={() => setView(item.view)}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors duration-150 ${
                  active
                    ? "bg-raised text-ink border border-line-strong shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                    : "text-muted hover:text-ink hover:bg-raised/60 border border-transparent"
                }`}
              >
                <span className={active ? "text-ember" : "text-faint"}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto">
          <NowPlayingDock />
        </div>
      </aside>

      <main className="relative flex-1 overflow-hidden bg-bg">
        {view === "scenes" && <SceneBoard />}
        {view === "archives" && <Archives />}
        {view === "passengers" && <Passengers />}
        {view === "atmosphere" && <Atmosphere />}
        {view === "live" && <LiveTable />}
        {view === "logbook" && <Logbook />}
        {view === "settings" && <Settings />}
        {view === "solo-crossing" && <SoloCrossing />}
      </main>
    </div>
  );
}
