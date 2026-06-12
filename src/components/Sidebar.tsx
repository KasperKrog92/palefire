import { AudioLines, BookOpen, Flame, Map } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ViewId } from "../types";

interface SidebarProps {
  activeView: ViewId;
  onChange: (view: ViewId) => void;
}

const navigation: Array<{
  id: ViewId;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "campaign", label: "Campaign", icon: BookOpen },
  { id: "scenes", label: "Scenes", icon: Map },
  { id: "audio", label: "Audio", icon: AudioLines },
];

export function Sidebar({ activeView, onChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">
          <Flame size={18} strokeWidth={2.2} />
        </span>
        <span className="brand-name">Palefire</span>
      </div>

      <p className="nav-label">Game master</p>
      <nav className="nav-list" aria-label="Main navigation">
        {navigation.map(({ id, label, icon: Icon }) => (
          <button
            className={`nav-item ${activeView === id ? "active" : ""}`}
            key={id}
            type="button"
            onClick={() => onChange(id)}
          >
            <Icon size={17} strokeWidth={1.8} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="status-dot" />
        <span>Saved locally</span>
      </div>
    </aside>
  );
}
