"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { toast } from "@/components/ui/Toaster";
import { LogoutIcon } from "@/components/ui/icons";
import { DEMO_ACCOUNTS } from "@/data/seed";
import { login, logout } from "@/lib/actions";
import { cls, initials } from "@/lib/format";
import { resetDemo } from "@/lib/store";
import type { Role, User } from "@/lib/types";

export type NavItem = { id: string; label: string; icon: React.ReactNode; badge?: number };

/** Chrome shared by the admin dashboard and the delivery app. */
export function PortalShell({
  user,
  title,
  nav,
  active,
  onNav,
  children,
  accent = "pasture",
}: {
  user: User;
  title: string;
  nav: NavItem[];
  active: string;
  onNav: (id: string) => void;
  children: React.ReactNode;
  accent?: "pasture" | "night";
}) {
  const router = useRouter();
  return (
    <div className="lg:grid lg:min-h-svh lg:grid-cols-[264px_1fr]">
      <aside className={cls("on-dark sticky top-0 z-40 text-milk lg:h-svh", accent === "night" ? "bg-night" : "bg-pasture-900")}>
        <div className="flex h-16 items-center justify-between px-5 lg:h-20">
          <Link href="/" aria-label="Back to the store">
            <Logo />
          </Link>
          <span className="mono-label rounded-full bg-white/10 px-2 py-1 text-[0.6rem] text-butter lg:hidden">{title}</span>
        </div>
        <p className="mono-label hidden px-6 pb-3 text-butter lg:block">{title}</p>
        <nav aria-label={title} className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-0">
          {nav.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => onNav(n.id)}
              aria-current={active === n.id ? "page" : undefined}
              className={cls(
                "flex flex-none items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                active === n.id ? "bg-white/12 text-milk" : "text-milk/65 hover:bg-white/[0.06] hover:text-milk",
              )}
            >
              <span className={cls(active === n.id ? "text-butter" : "")}>{n.icon}</span>
              <span className="whitespace-nowrap">{n.label}</span>
              {!!n.badge && <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-butter px-1 text-[0.68rem] font-bold text-ink">{n.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="absolute inset-x-0 bottom-0 hidden border-t border-white/10 p-4 lg:block">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-butter text-[0.8rem] font-bold text-ink">{initials(user.name)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-milk/55">{user.email}</p>
            </div>
            <button
              type="button"
              aria-label="Sign out"
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10"
            >
              <LogoutIcon size={17} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              resetDemo();
              toast("Demo data reset", "Sample orders regenerated for today");
            }}
            className="mono-label mt-4 text-[0.62rem] text-milk/45 hover:text-butter"
          >
            Reset demo data
          </button>
        </div>
      </aside>
      <main className="min-w-0 px-[clamp(16px,3vw,48px)] pb-20 pt-8">{children}</main>
    </div>
  );
}

export function PortalGate({ role, children }: { role: Role; children: React.ReactNode }) {
  const key = role === "admin" ? "admin" : "staff";
  const a = DEMO_ACCOUNTS[key];
  return (
    <div className="grid min-h-svh place-items-center bg-night p-6 text-milk">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="display-m mt-8">{role === "admin" ? "Admin dashboard" : "Delivery partner app"}</h1>
        <p className="mt-3 text-milk/65">{children}</p>
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            className="btn btn-butter"
            onClick={() => {
              const r = login(a.email, a.password, role);
              if (r.ok) toast(`Signed in as ${r.user.name}`);
            }}
          >
            Continue as demo {role === "admin" ? "admin" : "delivery partner"}
          </button>
          <Link href={`/login?role=${role}`} className="btn btn-ghost">
            Sign in with email
          </Link>
          <Link href="/" className="mono-label mt-2 text-milk/50 hover:text-milk">
            ← Back to the store
          </Link>
        </div>
        <p className="mt-8 font-mono text-xs text-milk/40">
          {a.email} / {a.password}
        </p>
      </div>
    </div>
  );
}

export function Tile({ label, value, delta, hint, tone }: { label: string; value: React.ReactNode; delta?: string; hint?: string; tone?: "up" | "down" | "flat" }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-ink-3">{label}</p>
      <p className="mt-2 text-[2rem] font-semibold leading-none tracking-tight">{value}</p>
      {(delta || hint) && (
        <p className="mt-2 text-xs">
          {delta && <span className={cls("font-semibold", tone === "up" ? "text-ok" : tone === "down" ? "text-alert" : "text-ink-2")}>{delta}</span>}
          {hint && <span className="text-ink-3"> {hint}</span>}
        </p>
      )}
    </div>
  );
}

export function Panel({ title, action, children, className = "" }: { title: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cls("card p-5 md:p-6", className)}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[1.05rem] font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function TopBar({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[clamp(1.8rem,3vw,2.6rem)] leading-tight [font-variation-settings:'opsz'_96,'SOFT'_100]">{title}</h1>
        {sub && <p className="mt-1 text-ink-2">{sub}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
