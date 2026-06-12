import { useEffect, useState } from "react";
import { imageUrl } from "../files";

export function useStoredImage(name: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!name) {
      setUrl(null);
      return;
    }
    imageUrl(name).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [name]);
  return url;
}

/** Renders a stored image as an absolutely-positioned cover layer, or nothing. */
export function CoverImage({ name, dim = 0 }: { name: string | null; dim?: number }) {
  const url = useStoredImage(name);
  if (!url) return null;
  return (
    <>
      <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      {dim > 0 && <div className="absolute inset-0" style={{ background: `rgba(10, 12, 16, ${dim})` }} />}
    </>
  );
}
