"use client";

import Link from "next/link";
import { MinusIcon, PlusIcon, SparkIcon } from "@/components/ui/icons";
import { cls } from "@/lib/format";

export function PageHead({
  label,
  title,
  em,
  sub,
  children,
  tone = "cream",
}: {
  label: string;
  title: string;
  em?: string;
  sub?: React.ReactNode;
  children?: React.ReactNode;
  tone?: "cream" | "night";
}) {
  const dark = tone === "night";
  return (
    <section className={cls("relative overflow-hidden pb-12 pt-[calc(var(--header-h)+3.5rem)] md:pb-16 md:pt-[calc(var(--header-h)+5rem)]", dark ? "on-dark bg-night text-milk" : "bg-cream")}>
      <div className="wrap relative">
        <p className={cls("mono-label flex items-center gap-3", dark ? "text-butter" : "text-butter-ink")}>
          <span aria-hidden className="h-px w-8 bg-current" />
          {label}
        </p>
        <h1 className="display-xl mt-6 max-w-[18ch]">
          {title} {em && <em className={cls("display-em", dark ? "text-butter" : "text-pasture")}>{em}</em>}
        </h1>
        {sub && <div className={cls("body-l mt-5 max-w-[56ch]", dark ? "text-milk/70" : "text-ink-2")}>{sub}</div>}
        {children}
      </div>
    </section>
  );
}

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 20,
  size = "md",
  label = "Quantity",
  step = 1,
  format,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  label?: string;
  step?: number;
  format?: (v: number) => string;
}) {
  const s = size === "sm" ? "h-8 w-8" : "h-11 w-11";
  return (
    <div className="inline-flex items-center rounded-full border border-rule bg-white/70" role="group" aria-label={label}>
      <button type="button" aria-label={`Decrease ${label.toLowerCase()}`} onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))} disabled={value <= min} className={cls("grid place-items-center rounded-full hover:bg-cream disabled:opacity-35", s)}>
        <MinusIcon size={size === "sm" ? 14 : 17} />
      </button>
      <span className={cls("text-center font-semibold tabular-nums", size === "sm" ? "min-w-8 text-sm" : "min-w-10")} aria-live="polite">
        {format ? format(value) : value}
      </span>
      <button type="button" aria-label={`Increase ${label.toLowerCase()}`} onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))} disabled={value >= max} className={cls("grid place-items-center rounded-full hover:bg-cream disabled:opacity-35", s)}>
        <PlusIcon size={size === "sm" ? 14 : 17} />
      </button>
    </div>
  );
}

/** The marker on anything powered by the (simulated) AI. */
export function AiBadge({ children = "AI demo", className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <span className={cls("inline-flex items-center gap-1.5 rounded-full border border-butter/50 bg-butter/10 px-3 py-1 text-[0.74rem] font-semibold text-butter-ink", className)}>
      <SparkIcon size={13} /> {children}
    </span>
  );
}

export function Empty({ title, body, href, cta }: { title: string; body: string; href?: string; cta?: string }) {
  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      <svg viewBox="0 0 64 80" className="h-16 w-auto text-cream-2" aria-hidden>
        <path d="M32 3S7 33 7 52a25 25 0 0 0 50 0C57 33 32 3 32 3Z" fill="currentColor" />
      </svg>
      <p className="h3 mt-6">{title}</p>
      <p className="mt-2 max-w-[40ch] text-ink-2">{body}</p>
      {href && cta && (
        <Link href={href} className="btn btn-primary mt-7">
          {cta}
        </Link>
      )}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    placed: ["Placed", "bg-ink/5 text-ink-2"],
    packed: ["Packed", "bg-butter/20 text-butter-ink"],
    out_for_delivery: ["Out for delivery", "bg-dawn/25 text-clay"],
    delivered: ["Delivered", "bg-ok/10 text-ok"],
    cancelled: ["Cancelled", "bg-alert/10 text-alert"],
    active: ["Active", "bg-ok/10 text-ok"],
    paused: ["Paused", "bg-dawn/25 text-clay"],
    paid: ["Paid", "bg-ok/10 text-ok"],
    pending: ["Pending", "bg-ink/5 text-ink-2"],
    refunded: ["Refunded", "bg-ink/5 text-ink-2"],
    review: ["Held for review", "bg-alert/10 text-alert"],
  };
  const [label, c] = map[status] ?? [status, "bg-ink/5 text-ink-2"];
  return <span className={cls("chip whitespace-nowrap py-1 text-[0.72rem]", c)}>{label}</span>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={cls("animate-pulse rounded-2xl bg-cream-2/60", className)} />;
}
