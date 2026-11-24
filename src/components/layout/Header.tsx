"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { openVoiceOrder } from "@/components/ai/VoiceOrder";
import { CartIcon, CloseIcon, LogoutIcon, MenuIcon, MicIcon, UserIcon } from "@/components/ui/icons";
import { mainNav, site } from "@/config/site";
import { logout } from "@/lib/actions";
import { cls, initials } from "@/lib/format";
import { useCartCount, useSession } from "@/lib/store";

/** Pages that open on a dark picture, so the header starts light-on-dark. */
const NIGHT_PAGES = ["/", "/farm", "/project"];

/**
 * Transparent over the dark top of the home page, cream once anything
 * scrolls beneath it. Slides away while scrolling down and comes back on
 * the way up.
 */
export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const { user, ready } = useSession();
  const count = useCartCount();
  const menuRef = useRef<HTMLDivElement>(null);
  const [tone, setTone] = useState<"day" | "night">(NIGHT_PAGES.includes(pathname) ? "night" : "day");
  const overDark = tone === "night";

  useEffect(() => {
    const on = (e: Event) => setTone((e as CustomEvent).detail === "night" ? "night" : "day");
    window.addEventListener("ks-tone", on);
    return () => window.removeEventListener("ks-tone", on);
  }, []);

  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      setSolid(y > 24);
      if (Math.abs(y - last) > 6) {
        setHidden(y > last && y > 240);
        last = y;
      }
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  // Close menus and reset the tone when the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
    setMenu(false);
    setTone(NIGHT_PAGES.includes(pathname) ? "night" : "day");
  }

  useEffect(() => {
    if (!menu) return;
    const off = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener("click", off);
    return () => window.removeEventListener("click", off);
  }, [menu]);

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const portal = user?.role === "admin" ? { href: "/admin", label: "Admin dashboard" } : user?.role === "staff" ? { href: "/delivery", label: "Delivery app" } : null;

  return (
    <>
      <header
        className={cls(
          "no-print fixed inset-x-0 top-0 z-50 transition-[transform,background-color,color,box-shadow] duration-500 ease-(--ease-settle)",
          hidden && !open ? "-translate-y-full" : "translate-y-0",
          overDark
            ? solid
              ? "bg-night/55 text-milk shadow-[0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl"
              : "bg-transparent text-milk"
            : "bg-milk/85 text-ink shadow-[0_1px_0_var(--color-rule)] backdrop-blur-xl",
        )}
      >
        <div className="wrap flex h-[var(--header-h)] items-center justify-between gap-6">
          <Link href="/" aria-label={`${site.name} home`} className="flex-none">
            <Logo />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isCurrent(item.href) ? "page" : undefined}
                className={cls(
                  "link-draw py-1 text-[0.95rem] font-medium",
                  isCurrent(item.href) && "[background-size:100%_1px]",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openVoiceOrder()}
              aria-label="Order by voice (AI)"
              title="Order by voice (AI)"
              className="hidden h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold transition-colors hover:bg-current/10 sm:flex"
            >
              <MicIcon size={19} /> <span className="hidden xl:inline">Order by voice</span>
            </button>
            <Link
              href="/cart"
              aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
              className="relative grid h-11 w-11 place-items-center rounded-full transition-colors hover:bg-current/10"
            >
              <CartIcon size={22} />
              {count > 0 && (
                <span className="absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-butter px-1 text-[0.7rem] font-bold text-ink">
                  {count}
                </span>
              )}
            </Link>

            <div className="relative hidden sm:block" ref={menuRef}>
              {!ready ? (
                <span className="block h-11 w-24" />
              ) : user ? (
                <button
                  type="button"
                  onClick={() => setMenu((m) => !m)}
                  aria-expanded={menu}
                  className="flex h-11 items-center gap-2 rounded-full pl-1 pr-3 transition-colors hover:bg-current/10"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-pasture text-[0.8rem] font-bold text-milk">
                    {initials(user.name)}
                  </span>
                  <span className="max-w-[9ch] truncate text-sm font-semibold">{user.name.split(" ")[0]}</span>
                </button>
              ) : (
                <Link href="/login" className="btn btn-sm btn-ghost">
                  <UserIcon size={17} /> Sign in
                </Link>
              )}
              {menu && user && (
                <div className="animate-slide-up absolute right-0 top-[calc(100%+8px)] w-60 overflow-hidden rounded-2xl border border-rule bg-milk p-2 text-ink shadow-[0_30px_60px_-30px_rgba(0,0,0,0.45)]">
                  <p className="px-3 pb-2 pt-1.5 text-xs text-ink-3">
                    Signed in as
                    <br />
                    <span className="text-sm font-semibold text-ink">{user.email}</span>
                  </p>
                  {portal && (
                    <Link href={portal.href} className="block rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-cream">
                      {portal.label}
                    </Link>
                  )}
                  {user.role === "customer" && (
                    <>
                      <Link href="/account" className="block rounded-xl px-3 py-2.5 text-sm hover:bg-cream">
                        My account
                      </Link>
                      <Link href="/account?tab=subscriptions" className="block rounded-xl px-3 py-2.5 text-sm hover:bg-cream">
                        Subscriptions
                      </Link>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      router.push("/");
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-cream"
                  >
                    <LogoutIcon size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="grid h-11 w-11 place-items-center rounded-full hover:bg-current/10 lg:hidden"
            >
              <MenuIcon size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        className={cls(
          "fixed inset-0 z-[60] flex flex-col bg-night text-milk transition-[opacity,visibility] duration-500 lg:hidden",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <div className="wrap flex h-[var(--header-h)] items-center justify-between">
          <Logo />
          <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10">
            <CloseIcon size={24} />
          </button>
        </div>
        <nav className="wrap mt-8 flex flex-1 flex-col gap-1" aria-label="Mobile">
          {[{ href: "/", label: "Home" }, ...mainNav, { href: "/cart", label: `Cart${count ? ` (${count})` : ""}` }].map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className="display-m border-b border-white/10 py-4"
              style={{ transitionDelay: `${i * 40}ms` }}
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setOpen(false);
                openVoiceOrder();
              }}
            >
              <MicIcon size={18} /> Order by voice
            </button>
            {user ? (
              <>
                <Link href={portal?.href ?? "/account"} className="btn btn-butter">
                  {portal?.label ?? "My account"}
                </Link>
                <button type="button" onClick={() => logout()} className="btn btn-ghost">
                  Sign out
                </button>
              </>
            ) : (
              <Link href="/login" className="btn btn-butter">
                Sign in
              </Link>
            )}
          </div>
        </nav>
        <p className="wrap pb-8 text-sm text-milk/60">{site.hours}</p>
      </div>
    </>
  );
}
