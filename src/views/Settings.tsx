import { useEffect, useState } from "react";
import { appConfigDir } from "@tauri-apps/api/path";
import { getDataDir } from "../files";
import { useApp } from "../stores/appStore";
import { Field, ViewHeader } from "../components/ui";
import { Flame } from "../components/icons";

export function Settings() {
  const { theme, setTheme, defaultFadeMs, setDefaultFadeMs } = useApp();
  const [dataDir, setDataDir] = useState("…");
  const [configDir, setConfigDir] = useState("…");

  useEffect(() => {
    getDataDir().then(setDataDir);
    appConfigDir().then(setConfigDir);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <ViewHeader title="Settings" sub="A short page, on purpose" />

      <div className="flex-1 overflow-y-auto px-8 pb-10">
        <div className="mx-auto flex max-w-xl flex-col gap-6">
          <section className="rounded-lg border border-line bg-panel p-5">
            <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[0.16em] text-faint">
              Appearance
            </h2>
            <Field label="Theme">
              <div className="flex gap-2">
                {(["dark", "light"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`flex-1 rounded-md border px-4 py-3 text-sm transition-colors ${
                      theme === t
                        ? "border-ember/50 bg-ember/10 text-ember"
                        : "border-line text-muted hover:border-line-strong hover:text-ink"
                    }`}
                  >
                    {t === "dark" ? "Night crossing" : "Day cabin"}
                  </button>
                ))}
              </div>
            </Field>
          </section>

          <section className="rounded-lg border border-line bg-panel p-5">
            <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[0.16em] text-faint">
              Atmosphere
            </h2>
            <Field label="Default fade duration" hint="used when a preset has no timing of its own">
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={10000}
                  step={250}
                  value={defaultFadeMs}
                  onChange={(e) => setDefaultFadeMs(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="w-14 shrink-0 text-right font-mono text-sm text-brass">
                  {(defaultFadeMs / 1000).toFixed(2).replace(/\.?0+$/, "")}s
                </span>
              </div>
            </Field>
          </section>

          <section className="rounded-lg border border-line bg-panel p-5">
            <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[0.16em] text-faint">
              Storage
            </h2>
            <div className="flex flex-col gap-3 text-[13px]">
              <PathRow label="Images & audio" path={dataDir} />
              <PathRow label="Database" path={`${configDir}\\palefire.db`} />
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-faint">
              Everything Palefire knows lives in these folders, on this machine. Copy them and
              you have copied the whole harbor.
            </p>
          </section>

          <div className="flex items-center justify-center gap-2 pb-4 pt-2 text-faint">
            <Flame size={13} className="text-ember-dim" />
            <span className="text-[12px]">Palefire 0.1.0 — built for slow crossings</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PathRow({ label, path }: { label: string; path: string }) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-faint">{label}</div>
      <code className="block select-text cursor-auto truncate rounded bg-bg-deep/60 px-2.5 py-1.5 font-mono text-[11.5px] text-muted" title={path}>
        {path}
      </code>
    </div>
  );
}
