import { useEffect } from "react";
import { getDb, inTauri } from "./db/db";
import { seedIfEmpty } from "./db/seed";
import { ensureDirs } from "./files";
import { useApp } from "./stores/appStore";
import { useData } from "./stores/dataStore";
import { Shell } from "./shell/Shell";
import { CampaignPicker } from "./views/CampaignPicker";
import { Flame } from "./components/icons";
import palefireLogo from "./assets/palefire-logo.png";

// Boot exactly once, even under StrictMode's doubled dev effects.
let bootPromise: Promise<void> | null = null;

export default function App() {
  const { booted, bootError, campaign, setBooted, loadCampaigns, hydrateSettings } = useApp();
  const loadAll = useData((s) => s.loadAll);
  const clearData = useData((s) => s.clear);

  useEffect(() => {
    if (!inTauri()) {
      setBooted("browser");
      return;
    }
    bootPromise ??= (async () => {
      await getDb(); // applies migrations
      await seedIfEmpty();
      await ensureDirs();
      await hydrateSettings();
      await loadCampaigns();
    })();
    bootPromise.then(
      () => setBooted(),
      (e) => {
        console.error(e);
        setBooted(String(e));
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (campaign) loadAll(campaign.id);
    else clearData();
  }, [campaign, loadAll, clearData]);

  if (!booted) {
    return (
      <div className="flex h-full items-center justify-center">
        <Flame size={28} className="text-ember-dim pf-lantern rounded-full" />
      </div>
    );
  }

  if (bootError === "browser") {
    return (
      <Harbor>
        Palefire is a desktop application — its database and audio live on your machine.
        <br />
        Run <code className="font-mono text-ember">npm run tauri dev</code> to come aboard.
      </Harbor>
    );
  }

  if (bootError) {
    return (
      <Harbor>
        Something went wrong while preparing the crossing:
        <br />
        <code className="font-mono text-danger text-xs">{bootError}</code>
      </Harbor>
    );
  }

  return campaign ? <Shell /> : <CampaignPicker />;
}

function Harbor({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-8">
      <img src={palefireLogo} alt="Palefire" className="pf-brand-logo h-20 w-auto max-w-[80vw]" />
      <p className="text-sm text-muted leading-relaxed max-w-md">{children}</p>
    </div>
  );
}
