import { BookMarked, Compass, Users } from "lucide-react";

export function CampaignView() {
  return (
    <section className="view">
      <header className="view-header">
        <div>
          <p className="eyebrow">Campaign</p>
          <h1>The story at a glance</h1>
          <p className="view-description">
            A quiet home for the notes and touchstones that keep your campaign
            moving.
          </p>
        </div>
      </header>

      <div className="placeholder-grid">
        <article className="placeholder-card">
          <BookMarked size={22} />
          <h2>Campaign notes</h2>
          <p>Session history, truths, and open questions will live here.</p>
        </article>
        <article className="placeholder-card">
          <Users size={22} />
          <h2>Cast</h2>
          <p>Keep player characters and recurring faces within reach.</p>
        </article>
        <article className="placeholder-card">
          <Compass size={22} />
          <h2>World</h2>
          <p>Collect important places, factions, and threads to revisit.</p>
        </article>
      </div>
    </section>
  );
}
