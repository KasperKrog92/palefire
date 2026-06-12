import { Layers3, Plus, Sparkles } from "lucide-react";

export function ScenesView() {
  return (
    <section className="view">
      <header className="view-header">
        <div>
          <p className="eyebrow">Scenes</p>
          <h1>Set the next moment</h1>
          <p className="view-description">
            Prepare the people, places, and pressure behind each encounter.
          </p>
        </div>
        <button className="primary-button" type="button" disabled>
          <Plus size={15} />
          New scene
        </button>
      </header>

      <div className="empty-state">
        <div className="empty-state-content">
          <span className="empty-icon">
            <Layers3 size={23} />
          </span>
          <h2>Scenes are coming next</h2>
          <p>
            This prototype leaves room for scene cards, quick notes, and
            encounter cues without committing to a workflow too early.
          </p>
          <span className="sidebar-footer" style={{ justifyContent: "center" }}>
            <Sparkles size={12} />
            Planned for a future pass
          </span>
        </div>
      </div>
    </section>
  );
}
