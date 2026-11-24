import { site } from "@/config/site";

/** The mark: a milk drop holding a sunrise. Milk at dawn. */
export function Mark({ className = "h-8 w-auto", sun = "var(--color-butter)" }: { className?: string; sun?: string }) {
  return (
    <svg viewBox="0 0 32 40" className={className} aria-hidden>
      <path d="M16 1.5C16 1.5 3.5 16.6 3.5 26.2a12.5 12.5 0 0 0 25 0C28.5 16.6 16 1.5 16 1.5Z" fill="currentColor" />
      <path d="M10 29.5a6 6 0 0 1 12 0Z" fill={sun} />
      <path d="M5.2 29.5h21.6" stroke={sun} strokeWidth="1.1" />
      <path d="M7.5 33.2h17M10.5 36.3h11" stroke={sun} strokeWidth="0.9" opacity="0.55" />
    </svg>
  );
}

export function Logo({ className = "", sun }: { className?: string; sun?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark className="h-8 w-auto" sun={sun} />
      <span className="font-display text-[1.6rem] leading-none tracking-[-0.02em] [font-variation-settings:'opsz'_72,'SOFT'_100]">
        {site.name}
      </span>
    </span>
  );
}
