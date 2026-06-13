import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/* ---------------------------------- buttons ---------------------------------- */

type ButtonVariant = "primary" | "ghost" | "subtle" | "danger";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-ember/90 text-bg-deep font-medium hover:bg-ember-bright active:bg-ember border border-transparent",
  ghost:
    "bg-transparent text-muted hover:text-ink hover:bg-raised border border-line hover:border-line-strong",
  subtle: "bg-raised text-ink hover:bg-overlay border border-line hover:border-line-strong",
  danger:
    "bg-transparent text-danger hover:bg-danger/10 border border-danger/40 hover:border-danger/70",
};

export function Button({
  variant = "subtle",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none ${buttonStyles[variant]} ${className}`}
      {...props}
    />
  );
}

export function IconButton({
  title,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { title: string }) {
  return (
    <button
      title={title}
      aria-label={title}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-muted hover:text-ink hover:bg-overlay transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none ${className}`}
      {...props}
    />
  );
}

/* ----------------------------------- fields ---------------------------------- */

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium uppercase tracking-[0.12em] text-faint mb-1.5">
        {label}
        {hint && <span className="ml-2 normal-case tracking-normal text-faint/80 font-normal">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const inputBase =
  "w-full rounded-md bg-bg-deep/60 border border-line px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:border-ember-dim focus:ring-1 focus:ring-ember-dim/50 transition-colors";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${inputBase} leading-relaxed resize-none font-mono text-[13px] ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputBase} appearance-none ${props.className ?? ""}`} />;
}

/* ----------------------------------- chips ----------------------------------- */

export function Chip({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "ember" | "sea" }) {
  const tones = {
    default: "bg-raised text-muted border-line",
    ember: "bg-ember/10 text-ember border-ember/25",
    sea: "bg-sea/10 text-sea border-sea/25",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-4 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/* --------------------------------- empty state -------------------------------- */

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-8 pf-enter">
      {icon && <div className="text-faint mb-4 opacity-70">{icon}</div>}
      <h3 className="font-display text-lg text-muted">{title}</h3>
      {children && <div className="mt-2 text-sm text-faint max-w-sm leading-relaxed">{children}</div>}
    </div>
  );
}

/* ------------------------------- section header ------------------------------- */

export function ViewHeader({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-4 px-8 pt-7 pb-5 2xl:px-10 2xl:pt-8 2xl:pb-6">
      <div>
        <h1 className="font-display text-[26px] leading-tight text-ink font-medium 2xl:text-[30px]">{title}</h1>
        {sub && <p className="text-sm text-faint mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">{children}</div>
    </header>
  );
}
