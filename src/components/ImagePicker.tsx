import { importImage } from "../files";
import { Image as ImageIcon, X } from "./icons";
import { useStoredImage } from "./StoredImage";

export function ImagePicker({
  value,
  onChange,
  label = "Choose image…",
}: {
  value: string | null;
  onChange: (name: string | null) => void;
  label?: string;
}) {
  const url = useStoredImage(value);

  const pick = async () => {
    const stored = await importImage();
    if (stored) onChange(stored);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={pick}
        className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md border border-line bg-bg-deep/60 hover:border-line-strong transition-colors"
        title={label}
      >
        {url ? (
          <img src={url} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-faint">
            <ImageIcon size={18} />
          </span>
        )}
      </button>
      <div className="flex flex-col items-start gap-1">
        <button type="button" onClick={pick} className="text-sm text-sea hover:text-ink transition-colors">
          {value ? "Replace…" : label}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 text-xs text-faint hover:text-danger transition-colors"
          >
            <X size={10} /> Remove
          </button>
        )}
      </div>
    </div>
  );
}
