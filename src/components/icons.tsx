import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 16, ...props }: P, children: React.ReactNode) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export const Flame = (p: P) =>
  base(
    p,
    <path d="M12 21c-3.9 0-6.5-2.5-6.5-6 0-2.6 1.7-4.6 3-6.2.9-1.1 1.9-2.5 2.4-4.3.2-.8 1-.8 1.3-.1.6 1.5 1.5 2.7 2.6 4 1.4 1.7 3.7 3.8 3.7 6.6 0 3.5-2.6 6-6.5 6Zm0 0c-1.8 0-3-1.2-3-2.9 0-1.6 1.2-2.6 2-3.7.4-.5.7-1 .9-1.6.1-.3.5-.3.6 0 .3.8.8 1.4 1.3 2 .7.8 1.2 1.9 1.2 3.3 0 1.7-1.2 2.9-3 2.9Z" />
  );

export const Cards = (p: P) =>
  base(
    p,
    <>
      <rect x="3" y="5" width="13" height="15" rx="1.5" />
      <path d="M16.5 7.5 19 7a1.5 1.5 0 0 1 1.7 1.2l1.6 9a1.5 1.5 0 0 1-1.3 1.8l-3.5.6" />
      <path d="M6.5 9h6M6.5 12.5h6M6.5 16h4" />
    </>
  );

export const Book = (p: P) =>
  base(
    p,
    <>
      <path d="M4 19.5V5a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 18.5Z" />
      <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
      <path d="M9 7h7" />
    </>
  );

export const Waves = (p: P) =>
  base(
    p,
    <>
      <path d="M2 8c2.2 0 2.8-1.5 5-1.5S9.8 8 12 8s2.8-1.5 5-1.5S19.8 8 22 8" />
      <path d="M2 13c2.2 0 2.8-1.5 5-1.5s2.8 1.5 5 1.5 2.8-1.5 5-1.5 2.8 1.5 5 1.5" />
      <path d="M2 18c2.2 0 2.8-1.5 5-1.5s2.8 1.5 5 1.5 2.8-1.5 5-1.5 2.8 1.5 5 1.5" />
    </>
  );

export const Lantern = (p: P) =>
  base(
    p,
    <>
      <path d="M12 2v2M9 4h6" />
      <path d="M8 9a4 4 0 0 1 8 0v6a4 4 0 0 1-8 0V9Z" />
      <path d="M12 9v6M8 12h8" />
      <path d="M10 19h4l-.5 3h-3L10 19Z" />
    </>
  );

export const Log = (p: P) =>
  base(
    p,
    <>
      <path d="M5 3h11a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H5V3Z" />
      <path d="M5 3a2 2 0 0 0 0 4M8.5 9H15M8.5 12.5h5M8.5 16h6" />
    </>
  );

export const Gear = (p: P) =>
  base(
    p,
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5l1.2 2.7 2.9-.6 1 2.8 2.9.7-.7 2.9 2.2 2-2.2 2 .7 2.9-2.9.7-1 2.8-2.9-.6L12 21.5l-1.2-2.7-2.9.6-1-2.8-2.9-.7.7-2.9-2.2-2 2.2-2-.7-2.9 2.9-.7 1-2.8 2.9.6L12 2.5Z" />
    </>
  );

export const Play = (p: P) => base(p, <path d="M7 4.5v15l12-7.5L7 4.5Z" fill="currentColor" stroke="none" />);

export const Pause = (p: P) =>
  base(
    p,
    <>
      <rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
      <rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
    </>
  );

export const Stop = (p: P) =>
  base(p, <rect x="5.5" y="5.5" width="13" height="13" rx="2" fill="currentColor" stroke="none" />);

export const Plus = (p: P) => base(p, <path d="M12 5v14M5 12h14" />);

export const Trash = (p: P) =>
  base(
    p,
    <>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 13a1.5 1.5 0 0 0 1.5 1.4h7A1.5 1.5 0 0 0 17 20l1-13" />
      <path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2" />
    </>
  );

export const Copy = (p: P) =>
  base(
    p,
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 3h9A1.5 1.5 0 0 1 14.5 4.5V5" />
    </>
  );

export const Pencil = (p: P) =>
  base(
    p,
    <>
      <path d="M4 20l4.5-1L20 7.5a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z" />
      <path d="M14.5 6.5l3 3" />
    </>
  );

export const Grip = (p: P) =>
  base(
    p,
    <>
      <circle cx="9" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1" fill="currentColor" stroke="none" />
    </>
  );

export const X = (p: P) => base(p, <path d="M6 6l12 12M18 6 6 18" />);

export const Image = (p: P) =>
  base(
    p,
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="M3.5 18.5 9 13l3.5 3.5L17 12l3.5 4" />
    </>
  );

export const LinkIcon = (p: P) =>
  base(
    p,
    <>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M11 6.5 13 4.5a4 4 0 0 1 6 6l-2.5 2.5" />
      <path d="M13 17.5 11 19.5a4 4 0 0 1-6-6l2.5-2.5" />
    </>
  );

export const ChevronLeft = (p: P) => base(p, <path d="M14.5 5 8 12l6.5 7" />);
export const ChevronRight = (p: P) => base(p, <path d="M9.5 5 16 12l-6.5 7" />);

export const Music = (p: P) =>
  base(
    p,
    <>
      <path d="M9 18.5V6l11-2.5V16" />
      <circle cx="6.5" cy="18.5" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </>
  );

export const Upload = (p: P) =>
  base(
    p,
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v3a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-3" />
    </>
  );

export const Check = (p: P) => base(p, <path d="M5 12.5 10 18 19 6.5" />);

export const Dots = (p: P) =>
  base(
    p,
    <>
      <circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  );

export const Volume = (p: P) =>
  base(
    p,
    <>
      <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4Z" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />
    </>
  );

export const VolumeX = (p: P) =>
  base(
    p,
    <>
      <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4Z" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </>
  );

export const Repeat = (p: P) =>
  base(
    p,
    <>
      <path d="M17 2.5 20 5.5l-3 3" />
      <path d="M4 11V9.5a4 4 0 0 1 4-4h12" />
      <path d="M7 21.5 4 18.5l3-3" />
      <path d="M20 13v1.5a4 4 0 0 1-4 4H4" />
    </>
  );

export const Anchor = (p: P) =>
  base(
    p,
    <>
      <circle cx="12" cy="5.5" r="2.5" />
      <path d="M12 8v13" />
      <path d="M4 13c0 5 3.5 8 8 8s8-3 8-8" />
      <path d="M2.5 13H7M17 13h4.5M9 11h6" />
    </>
  );

export const Search = (p: P) =>
  base(
    p,
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 21 21" />
    </>
  );

export const Radio = (p: P) =>
  base(
    p,
    <>
      <rect x="3" y="9" width="18" height="11" rx="2" />
      <path d="M7 9 17.5 3.5" />
      <circle cx="8.5" cy="14.5" r="2.3" />
      <path d="M14 12.5h4M14 16h4" />
    </>
  );
