"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { UsualBasket } from "@/components/ai/UsualBasket";
import { SignInPrompt } from "@/components/account/SignInPrompt";
import { ProductThumb } from "@/components/shop/ProductArt";
import { ProductCard } from "@/components/shop/ProductCard";
import { toast } from "@/components/ui/Toaster";
import { AiBadge, Empty, PageHead, Skeleton, StatusPill, Stepper } from "@/components/ui/bits";
import { BellIcon, CalendarIcon, DownloadIcon, PauseIcon, PlayIcon, RepeatIcon, TruckIcon } from "@/components/ui/icons";
import { milkEstimate, recommend, reminderTime } from "@/lib/ai";
import { eta } from "@/lib/ai-plus";
import {
  addToCart,
  deliversOn,
  logout,
  markNoticesRead,
  nextDeliveries,
  pauseSubscription,
  resumeSubscription,
  skipTomorrow,
  updateProfile,
  updateSubscription,
} from "@/lib/actions";
import { addDays, cls, fmtDateTime, fmtDay, money, relDay, tomorrow, ymd } from "@/lib/format";
import { useCatalogue, useDB, useSession } from "@/lib/store";
import type { Subscription } from "@/lib/types";

const TABS = [
  ["overview", "Overview"],
  ["orders", "Orders"],
  ["subscriptions", "Subscriptions"],
  ["notifications", "Notifications"],
  ["profile", "Profile"],
] as const;
type Tab = (typeof TABS)[number][0];

const FREQ: Record<Subscription["frequency"], string> = {
  daily: "Every day",
  alternate: "Alternate days",
  weekly: "Chosen days",
  monthly: "Monthly",
};
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const within = (iso: string, days: number) => Date.now() - new Date(iso).getTime() < days * 86400000;

export function AccountView() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get("tab") as Tab) || "overview";
  const db = useDB();
  const { user, ready } = useSession();
  const all = useCatalogue();

  const orders = useMemo(() => (db && user ? db.orders.filter((o) => o.userId === user.id) : []), [db, user]);
  const subs = useMemo(() => (db && user ? db.subscriptions.filter((s) => s.userId === user.id && s.status !== "cancelled") : []), [db, user]);
  const notices = useMemo(() => (db && user ? db.notices.filter((n) => n.userId === user.id) : []), [db, user]);

  if (!ready) {
    return (
      <div className="wrap pb-24 pt-[calc(var(--header-h)+4rem)]">
        <Skeleton className="h-[50vh]" />
      </div>
    );
  }
  if (!user) {
    return (
      <>
        <PageHead label="My account" title="Your" em="mornings." />
        <div className="wrap py-14">
          <SignInPrompt />
        </div>
      </>
    );
  }
  if (user.role !== "customer") {
    return (
      <>
        <PageHead label="My account" title={`Hello, ${user.name.split(" ")[0]}.`} />
        <div className="wrap py-14">
          <div className="card max-w-xl p-8">
            <p className="h3">This is a {user.role === "admin" ? "admin" : "delivery partner"} account</p>
            <p className="mt-2 text-ink-2">Customer pages are for customers. Your workspace is here:</p>
            <div className="mt-6 flex gap-3">
              <Link href={user.role === "admin" ? "/admin" : "/delivery"} className="btn btn-primary">
                Open {user.role === "admin" ? "admin dashboard" : "delivery app"}
              </Link>
              <button type="button" className="btn btn-ghost" onClick={() => logout()}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const go = (t: Tab) => router.replace(`/account?tab=${t}`, { scroll: false });
  const t = tomorrow();
  const tomorrowSubs = subs.filter((s) => deliversOn(s, t));
  const tomorrowOrders = orders.filter((o) => o.deliveryDate === t && o.status !== "cancelled");
  const live = orders.find((o) => o.deliveryDate === ymd(new Date()) && o.status !== "cancelled");
  const unread = notices.filter((n) => !n.read).length;
  const monthSpend = orders.filter((o) => o.status !== "cancelled" && within(o.placedAt, 30)).reduce((s, o) => s + o.total, 0);

  return (
    <>
      <PageHead
        label="My account"
        title={`Good morning, ${user.name.split(" ")[0]}.`}
        sub={
          live
            ? `Today's order ${live.id} is ${live.status.replace(/_/g, " ")}.`
            : tomorrowSubs.length || tomorrowOrders.length
              ? "Tomorrow's delivery is set. You can still change it until 10 PM."
              : "Nothing scheduled for tomorrow yet."
        }
      >
        <nav aria-label="Account" className="no-scrollbar -mx-1 mt-10 flex gap-2 overflow-x-auto px-1">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              aria-current={tab === id ? "page" : undefined}
              className={cls("chip flex-none border py-2.5 text-sm", tab === id ? "border-ink bg-ink text-milk" : "border-rule bg-milk text-ink-2 hover:border-ink")}
            >
              {label}
              {id === "notifications" && unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-butter px-1 text-[0.68rem] text-ink">{unread}</span>}
            </button>
          ))}
        </nav>
      </PageHead>

      <div className="wrap py-12 md:py-16">
        {tab === "overview" && (
          <div className="grid gap-[var(--gutter)] lg:grid-cols-3">
            {/* today */}
            <section className="card p-6 lg:col-span-2" aria-labelledby="today">
              <div className="flex items-center justify-between gap-3">
                <h2 id="today" className="h3">
                  {live ? "Today's delivery" : "Tomorrow morning"}
                </h2>
                {live && <StatusPill status={live.status} />}
              </div>
              {live ? (
                <div className="mt-5">
                  <OrderProgress status={live.status} />
                  {db && eta(live, db) && (
                    <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-butter/15 px-3 py-1.5 text-sm font-semibold text-butter-ink">
                      <TruckIcon size={16} /> Arriving around {eta(live, db)!.label} · AI estimate
                    </p>
                  )}
                  <p className="mt-4 text-sm text-ink-2">{live.lines.map((l) => `${l.qty} × ${l.name}`).join(", ")}</p>
                  <Link href={`/account/order?id=${live.id}`} className="btn btn-primary btn-sm mt-5">
                    Track order
                  </Link>
                </div>
              ) : (
                <ul className="mt-5 divide-y divide-rule">
                  {tomorrowSubs.map((s) => {
                    const p = all.find((x) => x.slug === s.slug);
                    return (
                      <li key={s.id} className="flex items-center gap-4 py-3">
                        <span className="relative h-12 w-12 flex-none overflow-hidden rounded-xl">{p && <ProductThumb product={p} sizes="48px" />}</span>
                        <span className="flex-1 text-sm">
                          <span className="block font-semibold">{p?.name}</span>
                          <span className="text-ink-3">
                            {s.qty} × {p?.variants.find((v) => v.id === s.variant)?.label} · subscription
                          </span>
                        </span>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => (skipTomorrow(s.id), toast("Skipped tomorrow", p?.name, "info"))}>
                          Skip
                        </button>
                      </li>
                    );
                  })}
                  {tomorrowOrders.map((o) => (
                    <li key={o.id} className="flex items-center justify-between py-3 text-sm">
                      <span>
                        <span className="block font-semibold">Order {o.id}</span>
                        <span className="text-ink-3">{o.lines.map((l) => l.name).join(", ")}</span>
                      </span>
                      <StatusPill status={o.status} />
                    </li>
                  ))}
                  {!tomorrowSubs.length && !tomorrowOrders.length && <li className="py-3 text-ink-2">Nothing yet. Order by 10 PM for tomorrow.</li>}
                </ul>
              )}
            </section>

            {/* reminder */}
            <ReminderCard userId={user.id} />

            <section className="card p-6">
              <p className="mono-label text-ink-3">Last 30 days</p>
              <p className="mt-3 font-display text-5xl">{money(monthSpend)}</p>
              <p className="mt-1 text-ink-2">{orders.filter((o) => within(o.placedAt, 30)).length} orders</p>
              <button type="button" onClick={() => go("orders")} className="mono-label link-draw mt-6 text-pasture">
                All orders →
              </button>
            </section>
            <section className="card p-6">
              <p className="mono-label text-ink-3">Subscriptions</p>
              <p className="mt-3 font-display text-5xl">{subs.filter((s) => s.status === "active").length} active</p>
              <p className="mt-1 text-ink-2">{subs.filter((s) => s.status === "paused").length} paused</p>
              <button type="button" onClick={() => go("subscriptions")} className="mono-label link-draw mt-6 text-pasture">
                Manage →
              </button>
            </section>
            <EstimateCard userId={user.id} />

            <UsualBasket userId={user.id} className="lg:col-span-3" />

            <ForYouRow userId={user.id} />
          </div>
        )}

        {tab === "orders" && (
          <section aria-label="Orders">
            {orders.length === 0 ? (
              <Empty title="No orders yet" body="Your first one is a few taps away." href="/shop" cta="Shop" />
            ) : (
              <ul className="space-y-3">
                {orders.slice(0, 40).map((o) => (
                  <li key={o.id} className="card flex flex-wrap items-center gap-x-6 gap-y-3 p-5">
                    <div className="min-w-40">
                      <p className="font-semibold">{o.id}</p>
                      <p className="text-sm text-ink-3">{relDay(o.deliveryDate)} · {o.slot}</p>
                    </div>
                    <p className="min-w-0 flex-1 truncate text-sm text-ink-2">{o.lines.map((l) => `${l.qty} × ${l.name}`).join(", ")}</p>
                    <p className="w-20 text-right font-semibold tabular-nums">{money(o.total)}</p>
                    <StatusPill status={o.payment.status === "review" ? "review" : o.status} />
                    <div className="flex gap-2">
                      <Link href={`/account/order?id=${o.id}`} className="btn btn-ghost btn-sm">
                        Track
                      </Link>
                      <Link href={`/account/invoice?id=${o.id}`} className="btn btn-ghost btn-sm" aria-label={`Invoice for ${o.id}`}>
                        <DownloadIcon size={15} /> Invoice
                      </Link>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          o.lines.forEach((l) => addToCart(l.slug, l.variant, l.qty));
                          toast("Added to cart", `${o.lines.length} item${o.lines.length > 1 ? "s" : ""} from ${o.id}`);
                        }}
                      >
                        <RepeatIcon size={15} /> Reorder
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === "subscriptions" && (
          <section aria-label="Subscriptions" className="space-y-[var(--gutter)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-ink-2">Changes made before 10 PM apply to the next morning.</p>
              <Link href="/subscribe" className="btn btn-primary btn-sm">
                New subscription
              </Link>
            </div>
            {subs.length === 0 && <Empty title="No subscriptions" body="Set your milk once and forget about it." href="/subscribe" cta="Start one" />}
            {subs.map((s) => (
              <SubCard key={s.id} s={s} />
            ))}
            <EstimateCard userId={user.id} wide />
          </section>
        )}

        {tab === "notifications" && (
          <section aria-label="Notifications" className="grid gap-[var(--gutter)] lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="h3">Updates</h2>
                {unread > 0 && (
                  <button type="button" className="mono-label link-draw text-pasture" onClick={() => markNoticesRead(user.id)}>
                    Mark all read
                  </button>
                )}
              </div>
              <ul className="mt-5 space-y-3">
                {notices.map((n) => (
                  <li key={n.id} className={cls("card flex gap-4 p-5", !n.read && "border-butter bg-butter/[0.06]")}>
                    <span className={cls("grid h-10 w-10 flex-none place-items-center rounded-full", n.kind === "delivery" ? "bg-pasture text-milk" : "bg-cream text-ink")}>
                      {n.kind === "delivery" ? <TruckIcon size={18} /> : n.kind === "subscription" ? <CalendarIcon size={18} /> : <BellIcon size={18} />}
                    </span>
                    <div>
                      <p className="font-semibold">{n.title}</p>
                      <p className="text-sm text-ink-2">{n.body}</p>
                      <p className="mt-1 text-xs text-ink-3">{fmtDateTime(n.at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <ReminderCard userId={user.id} />
          </section>
        )}

        {tab === "profile" && <Profile />}
      </div>
    </>
  );
}

function OrderProgress({ status }: { status: string }) {
  const steps = ["placed", "packed", "out_for_delivery", "delivered"];
  const idx = steps.indexOf(status);
  return (
    <ol className="grid grid-cols-4 gap-2">
      {["Placed", "Packed", "On the way", "Delivered"].map((l, i) => (
        <li key={l}>
          <div className={cls("h-1.5 rounded-full", i <= idx ? "bg-pasture" : "bg-rule")} />
          <p className={cls("mt-2 text-xs", i <= idx ? "font-semibold text-ink" : "text-ink-3")}>{l}</p>
        </li>
      ))}
    </ol>
  );
}

function SubCard({ s }: { s: Subscription }) {
  const all = useCatalogue();
  const p = all.find((x) => x.slug === s.slug);
  const v = p?.variants.find((x) => x.id === s.variant);
  const [until, setUntil] = useState(ymd(addDays(new Date(), 7)));
  const next = nextDeliveries(s, 6);
  const t = tomorrow();
  return (
    <article className="card grid gap-6 p-6 md:grid-cols-[auto_1fr_auto] md:items-center">
      <div className="relative h-24 w-24 overflow-hidden rounded-2xl" style={{ background: p?.tint }}>
        {p && <ProductThumb product={p} sizes="96px" />}
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="h3">{p?.name}</h3>
          <StatusPill status={s.status} />
        </div>
        <p className="mt-1 text-sm text-ink-2">
          {v?.label} · {FREQ[s.frequency]}
          {s.frequency === "weekly" && ` (${s.days.map((d) => DAYS[d]).join(", ")})`} · {s.slot} · {money((v?.price ?? 0) * s.qty)} per delivery
        </p>
        {s.status === "paused" && s.pausedUntil && <p className="mt-1 text-sm font-semibold text-clay">Paused until {fmtDay(s.pausedUntil)}</p>}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {next.map((d) => (
            <span key={d} className="chip border border-rule py-1 text-[0.72rem] text-ink-2">
              {relDay(d)}
            </span>
          ))}
          {s.skips.includes(t) && <span className="chip bg-dawn/20 py-1 text-[0.72rem] text-clay">Skipping tomorrow</span>}
        </div>
      </div>
      <div className="flex flex-col gap-3 md:items-end">
        <Stepper size="sm" value={s.qty} min={1} max={10} onChange={(q) => (updateSubscription(s.id, { qty: q }), toast("Quantity updated", `${q} × ${v?.label} from the next delivery`))} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => (skipTomorrow(s.id), toast(s.skips.includes(t) ? "Tomorrow restored" : "Skipped tomorrow", p?.name, "info"))}>
            {s.skips.includes(t) ? "Undo skip" : "Skip tomorrow"}
          </button>
          {s.status === "active" ? (
            <details className="relative">
              <summary className="btn btn-ghost btn-sm list-none">
                <PauseIcon size={15} /> Pause
              </summary>
              <div className="absolute right-0 z-10 mt-2 w-64 rounded-2xl border border-rule bg-milk p-4 shadow-xl">
                <label className="text-sm font-semibold">
                  Resume on
                  <input type="date" className="field mt-2" value={until} min={ymd(addDays(new Date(), 2))} onChange={(e) => setUntil(e.target.value)} />
                </label>
                <button type="button" className="btn btn-primary btn-sm mt-3 w-full" onClick={() => (pauseSubscription(s.id, ymd(addDays(new Date(until + "T00:00"), -1))), toast("Subscription paused", `Back on ${fmtDay(until)}`, "info"))}>
                  Pause deliveries
                </button>
              </div>
            </details>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => (resumeSubscription(s.id), toast("Subscription resumed"))}>
              <PlayIcon size={15} /> Resume
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm text-ink-3" onClick={() => (updateSubscription(s.id, { status: "cancelled" }), toast("Subscription cancelled", undefined, "info"))}>
            Cancel
          </button>
        </div>
      </div>
    </article>
  );
}

function ReminderCard({ userId }: { userId: string }) {
  const db = useDB();
  const user = db?.users.find((u) => u.id === userId);
  const rt = db ? reminderTime(db.orders, userId) : null;
  const rem = user?.reminders ?? { delivery: true, subscription: true };
  return (
    <section className="card p-6" aria-labelledby="rem">
      <AiBadge>Personalised timing · demo</AiBadge>
      <h2 id="rem" className="h3 mt-4">
        Reminders
      </h2>
      {rt ? (
        <p className="mt-2 text-ink-2">
          You usually order around <span className="font-semibold text-ink">{rt.usual}</span>, so we remind you at{" "}
          <span className="font-semibold text-ink">{rt.remindAt}</span>, before the 10 PM cut-off.
        </p>
      ) : (
        <p className="mt-2 text-ink-2">Once you&apos;ve placed a few orders, we&apos;ll time reminders to when you usually shop.</p>
      )}
      <div className="mt-5 space-y-3">
        {(
          [
            ["delivery", "Delivery updates"],
            ["subscription", "Order and subscription reminders"],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            {label}
            <input
              type="checkbox"
              className="h-5 w-5 accent-[var(--color-pasture)]"
              checked={rem[k]}
              onChange={(e) => updateProfile(userId, { reminders: { ...rem, [k]: e.target.checked } })}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function EstimateCard({ userId, wide = false }: { userId: string; wide?: boolean }) {
  const db = useDB();
  const est = db ? milkEstimate(db.orders, userId) : null;
  if (!est) return null;
  return (
    <section className={cls("card p-6", wide && "md:flex md:items-center md:justify-between md:gap-8")} aria-labelledby="est">
      <div>
        <AiBadge>Milk estimate · demo</AiBadge>
        <h2 id="est" className="h3 mt-4">
          About {est.suggestion} L per delivery suits you
        </h2>
        <p className="mt-2 text-sm text-ink-2">
          From your last 30 days: {est.litres.toFixed(1)} L of milk over {est.days} delivery days ({est.perDelivery.toFixed(2)} L each). Production: a regression model on your order history.
        </p>
      </div>
      <Link href={`/subscribe?litres=${est.suggestion}`} className={cls("btn btn-ghost btn-sm", wide ? "mt-4 md:mt-0" : "mt-5")}>
        Use this estimate
      </Link>
    </section>
  );
}

function ForYouRow({ userId }: { userId: string }) {
  const db = useDB();
  const all = useCatalogue();
  const recs = useMemo(
    () =>
      db
        ? recommend({ history: db.orders.filter((o) => o.userId === userId), viewed: db.viewed, available: (s) => (all.find((p) => p.slug === s)?.stock ?? 0) > 0, n: 3 })
        : [],
    [db, userId, all],
  );
  return (
    <section className="lg:col-span-3" aria-labelledby="fy">
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <h2 id="fy" className="display-m">
          You might also like
        </h2>
        <AiBadge>From your purchase history · demo</AiBadge>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-[var(--gutter)] lg:grid-cols-3">
        {recs.map((r) => {
          const p = all.find((x) => x.slug === r.slug);
          return p ? <ProductCard key={r.slug} product={p} reason={r.reason} size="sm" /> : null;
        })}
      </div>
    </section>
  );
}

function Profile() {
  const { user } = useSession();
  const [form, setForm] = useState(() => ({ name: user!.name, phone: user!.phone, line1: user!.address?.line1 ?? "", area: user!.address?.area ?? "", pincode: user!.address?.pincode ?? "" }));
  const router = useRouter();
  if (!user) return null;
  return (
    <form
      className="card max-w-2xl space-y-4 p-6 md:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        updateProfile(user.id, {
          name: form.name,
          phone: form.phone,
          address: { ...(user.address ?? { city: "Chennai", lat: 13.0, lng: 80.25 }), line1: form.line1, area: form.area, pincode: form.pincode } as never,
        });
        toast("Profile saved");
      }}
    >
      <h2 className="h3">Profile and address</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-1.5 block text-sm font-medium text-ink-2">Name</span>
          <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-ink-2">Phone</span>
          <input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-ink-2">House, street</span>
          <input className="field" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-ink-2">Area</span>
          <input className="field" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-ink-2">Pincode</span>
          <input className="field" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
        </label>
      </div>
      <p className="text-sm text-ink-3">Email: {user.email}. Password stored as a hash ({user.passwordHash.slice(0, 14)}…), never in plain text.</p>
      <div className="flex flex-wrap gap-3 pt-2">
        <button type="submit" className="btn btn-primary">
          Save changes
        </button>
        <Link href="/login?reset=1" className="btn btn-ghost">
          Change password
        </Link>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            logout();
            router.push("/");
          }}
        >
          Sign out
        </button>
      </div>
    </form>
  );
}
