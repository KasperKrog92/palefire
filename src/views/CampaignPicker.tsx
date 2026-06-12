import { useState } from "react";
import type { Campaign } from "../types";
import { campaigns as repo } from "../db/repo";
import { useApp } from "../stores/appStore";
import { fallbackCover } from "../components/cover";
import { CoverImage } from "../components/StoredImage";
import { ImagePicker } from "../components/ImagePicker";
import { Modal } from "../components/Modal";
import { Confirm } from "../components/Confirm";
import { Button, Field, Input, TextArea } from "../components/ui";
import { Flame, Pencil, Plus, Trash } from "../components/icons";

export function CampaignPicker() {
  const { campaigns, openCampaign, loadCampaigns } = useApp();
  const [editing, setEditing] = useState<Campaign | "new" | null>(null);
  const [deleting, setDeleting] = useState<Campaign | null>(null);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-8 pb-16">
        <header className="flex flex-col items-center pt-16 pb-10 text-center pf-enter">
          <Flame size={30} className="text-ember mb-3" />
          <h1 className="font-display text-[34px] tracking-[0.04em] text-ink">Palefire</h1>
          <p className="mt-1 text-sm text-faint">
            Keep the lights low. Keep the table calm.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {campaigns.map((c) => (
            <article
              key={c.id}
              onClick={() => openCampaign(c)}
              className="group relative h-44 cursor-pointer overflow-hidden rounded-xl border border-line bg-panel shadow-[var(--shadow-card)] transition-all duration-200 hover:border-line-strong hover:shadow-[var(--shadow-lift)] hover:-translate-y-0.5 pf-enter"
            >
              <div className="absolute inset-0" style={{ background: fallbackCover(c.title) }} />
              <CoverImage name={c.cover_image} dim={0.25} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

              <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <CardAction
                  title="Edit campaign"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(c);
                  }}
                >
                  <Pencil size={13} />
                </CardAction>
                <CardAction
                  title="Delete campaign"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleting(c);
                  }}
                >
                  <Trash size={13} />
                </CardAction>
              </div>

              <div className="absolute inset-x-0 bottom-0 p-4">
                <h2 className="font-display text-xl text-white/95 leading-tight">{c.title}</h2>
                {c.description && (
                  <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-white/65">
                    {c.description}
                  </p>
                )}
              </div>
            </article>
          ))}

          <button
            onClick={() => setEditing("new")}
            className="flex h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line text-faint transition-colors hover:border-ember-dim hover:text-ember pf-enter"
          >
            <Plus size={20} />
            <span className="text-sm">New campaign</span>
          </button>
        </div>
      </div>

      {editing && (
        <CampaignEditor
          campaign={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await loadCampaigns();
          }}
        />
      )}

      {deleting && (
        <Confirm
          title="Delete campaign"
          message={`"${deleting.title}" and all of its scenes, archives, presets and logs will be removed. This cannot be undone.`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await repo.remove(deleting.id);
            setDeleting(null);
            await loadCampaigns();
          }}
        />
      )}
    </div>
  );
}

function CardAction({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md bg-black/55 text-white/75 backdrop-blur-sm transition-colors hover:bg-black/75 hover:text-white"
    >
      {children}
    </button>
  );
}

function CampaignEditor({
  campaign,
  onClose,
  onSaved,
}: {
  campaign: Campaign | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(campaign?.title ?? "");
  const [description, setDescription] = useState(campaign?.description ?? "");
  const [cover, setCover] = useState<string | null>(campaign?.cover_image ?? null);

  const save = async () => {
    const t = title.trim();
    if (!t) return;
    if (campaign) await repo.update(campaign.id, { title: t, description, cover_image: cover });
    else await repo.create({ title: t, description, cover_image: cover });
    onSaved();
  };

  return (
    <Modal
      title={campaign ? "Edit campaign" : "New campaign"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={!title.trim()}>
            {campaign ? "Save" : "Create"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Title">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="The Night Ferry"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
        </Field>
        <Field label="Description">
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="What is this crossing about?"
            className="!font-sans !text-sm"
          />
        </Field>
        <Field label="Cover image" hint="optional">
          <ImagePicker value={cover} onChange={setCover} />
        </Field>
      </div>
    </Modal>
  );
}
