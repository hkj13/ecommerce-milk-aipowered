"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Panel, Tile, TopBar } from "@/components/admin/Shell";
import { toast } from "@/components/ui/Toaster";
import { AiBadge, StatusPill } from "@/components/ui/bits";
import { SearchIcon, ShieldIcon } from "@/components/ui/icons";
import { HUB } from "@/data/seed";
import { behaviourInsights, optimiseRoute, routeLength } from "@/lib/ai";
import { assignStaff, clearPaymentFlag, deliversOn, pauseSubscription, resumeSubscription, setOrderStatus } from "@/lib/actions";
import { addDays, cls, fmtDate, fmtDateTime, money, relDay, today, tomorrow, ymd } from "@/lib/format";
import { liveCatalogue, useDB } from "@/lib/store";
import type { OrderStatus } from "@/lib/types";

const STATUSES: OrderStatus[] = ["placed", "packed", "out_for_delivery", "delivered", "cancelled"];

/* --------------------------------------------------------------- orders */

export function AdminOrders() {
  const db = useDB()!;
  const [day, setDay] = useState<"today" | "tomorrow" | "all">("today");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [q, setQ] = useState("");
  const staff = db.users.filter((u) => u.role === "staff");
  const flagged = db.orders.filter((o) => o.payment.status === "review");
  const rows = useMemo(() => {
    let xs = db.orders;
    if (day === "today") xs = xs.filter((o) => o.deliveryDate === today());
    if (day === "tomorrow") xs = xs.filter((o) => o.deliveryDate === tomorrow());
    if (status !== "all") xs = xs.filter((o) => o.status === status);
    if (q) {
      const t = q.toLowerCase();
      xs = xs.filter((o) => o.id.toLowerCase().includes(t) || db.users.find((u) => u.id === o.userId)?.name.toLowerCase().includes(t) || o.address.area.toLowerCase().includes(t));
    }
    return xs.slice(0, 80);
  }, [db, day, status, q]);

  return (
    <>
      <TopBar title="Orders" sub="Update status, assign delivery partners, review flagged payments" />
      {flagged.length > 0 && (
        <Panel
          title={
            <span className="flex items-center gap-2">
              <ShieldIcon size={17} className="text-alert" /> Payments held for review ({flagged.length})
            </span>
          }
          action={<AiBadge>Unusual payment patterns · demo</AiBadge>}
          className="mb-4 border-alert/30"
        >
          <ul className="space-y-3">
            {flagged.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-alert/[0.04] p-4">
                <div className="min-w-48">
                  <p className="font-semibold">
                    {o.id} · {db.users.find((u) => u.id === o.userId)?.name}
                  </p>
                  <p className="text-sm text-ink-3">
                    {money(o.total)} by {o.payment.method.toUpperCase()} · {fmtDateTime(o.placedAt)}
                  </p>
                </div>
                <p className="min-w-0 flex-1 text-sm text-ink-2">{o.payment.flag}</p>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => (clearPaymentFlag(o.id, true), toast("Payment approved", o.id))}>
                    Approve
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => (clearPaymentFlag(o.id, false), toast("Order cancelled and refunded", o.id, "info"))}>
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-3">The model only flags. A person approves or rejects; legitimate payments are never declined automatically.</p>
        </Panel>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-full border border-rule bg-white/60 p-1">
          {(["today", "tomorrow", "all"] as const).map((d) => (
            <button key={d} type="button" onClick={() => setDay(d)} aria-pressed={day === d} className={cls("rounded-full px-3.5 py-1.5 text-sm font-semibold capitalize", day === d ? "bg-ink text-milk" : "text-ink-2")}>
              {d === "all" ? "All dates" : d}
            </button>
          ))}
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | "all")} className="rounded-full border border-rule bg-white/60 px-3 py-2 text-sm" aria-label="Status">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <label className="flex min-w-60 flex-1 items-center gap-2 rounded-full border border-rule bg-white/60 px-4 py-2 md:max-w-sm">
          <SearchIcon size={16} className="text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order, customer or area" className="flex-1 bg-transparent text-sm outline-none" aria-label="Search orders" />
        </label>
        <p className="text-sm text-ink-3">{rows.length} orders</p>
      </div>

      <Panel title="Order list">
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="text-left text-ink-3">
                <th className="px-2 py-2 font-medium">Order</th>
                <th className="px-2 py-2 font-medium">Customer · area</th>
                <th className="px-2 py-2 font-medium">Items</th>
                <th className="px-2 py-2 text-right font-medium">Total</th>
                <th className="px-2 py-2 font-medium">Payment</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Delivery partner</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-t border-rule align-middle">
                  <td className="px-2 py-2.5">
                    <Link href={`/account/order?id=${o.id}`} className="font-semibold hover:underline">
                      {o.id}
                    </Link>
                    <span className="block text-xs text-ink-3">
                      {relDay(o.deliveryDate)} · {o.slot}
                    </span>
                  </td>
                  <td className="px-2 py-2.5">
                    {db.users.find((u) => u.id === o.userId)?.name}
                    <span className="block text-xs text-ink-3">{o.address.area}</span>
                  </td>
                  <td className="max-w-56 truncate px-2 py-2.5 text-ink-2">{o.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}</td>
                  <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{money(o.total)}</td>
                  <td className="px-2 py-2.5">
                    <span className="mr-1.5 text-xs uppercase text-ink-3">{o.payment.method}</span>
                    <StatusPill status={o.payment.status} />
                  </td>
                  <td className="px-2 py-2.5">
                    <select
                      value={o.status}
                      onChange={(e) => {
                        setOrderStatus(o.id, e.target.value as OrderStatus);
                        toast(`${o.id} → ${e.target.value.replace(/_/g, " ")}`);
                      }}
                      className="rounded-full border border-rule bg-white px-2.5 py-1 text-xs font-semibold"
                      aria-label={`Status of ${o.id}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2.5">
                    <select
                      value={o.staffId ?? ""}
                      onChange={(e) => {
                        assignStaff(o.id, e.target.value);
                        toast("Delivery partner assigned", `${o.id} → ${staff.find((s) => s.id === e.target.value)?.name}`);
                      }}
                      className="rounded-full border border-rule bg-white px-2.5 py-1 text-xs"
                      aria-label={`Delivery partner for ${o.id}`}
                    >
                      <option value="">Unassigned</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

/* -------------------------------------------------------- subscriptions */

const LITRES: Record<string, number> = { "500ml": 0.5, "1l": 1 };

export function AdminSubscriptions() {
  const db = useDB()!;
  const cat = liveCatalogue(db);
  const subs = db.subscriptions.filter((s) => s.status !== "cancelled");
  const t = tomorrow();
  const tomorrowLitres = subs.filter((s) => deliversOn(s, t)).reduce((sum, s) => sum + (LITRES[s.variant] ?? 0) * s.qty, 0);
  const revenueMonth = subs
    .filter((s) => s.status === "active")
    .reduce((sum, s) => {
      const price = cat.find((p) => p.slug === s.slug)?.variants.find((v) => v.id === s.variant)?.price ?? 0;
      let n = 0;
      for (let i = 1; i <= 30; i++) if (deliversOn(s, ymd(addDays(new Date(), i)))) n++;
      return sum + price * s.qty * n;
    }, 0);
  return (
    <>
      <TopBar title="Subscriptions" sub="Recurring deliveries generate orders automatically each morning" />
      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Tile label="Active" value={subs.filter((s) => s.status === "active").length} />
        <Tile label="Paused" value={subs.filter((s) => s.status === "paused").length} />
        <Tile label="Milk committed for tomorrow" value={`${tomorrowLitres.toFixed(1)} L`} />
        <Tile label="Next 30 days, booked" value={money(revenueMonth)} />
      </div>
      <Panel title="All subscriptions">
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="text-left text-ink-3">
                <th className="px-2 py-2 font-medium">Customer</th>
                <th className="px-2 py-2 font-medium">Product</th>
                <th className="px-2 py-2 font-medium">Plan</th>
                <th className="px-2 py-2 font-medium">Since</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => {
                const p = cat.find((x) => x.slug === s.slug);
                return (
                  <tr key={s.id} className="border-t border-rule">
                    <td className="px-2 py-2.5 font-semibold">{db.users.find((u) => u.id === s.userId)?.name}</td>
                    <td className="px-2 py-2.5">
                      {s.qty} × {p?.name} <span className="text-ink-3">({p?.variants.find((v) => v.id === s.variant)?.label})</span>
                    </td>
                    <td className="px-2 py-2.5 capitalize text-ink-2">
                      {s.frequency}
                      {s.frequency === "weekly" && ` · ${s.days.map((d) => ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d]).join(" ")}`}
                    </td>
                    <td className="px-2 py-2.5 text-ink-2">{fmtDate(s.startDate)}</td>
                    <td className="px-2 py-2.5">
                      <StatusPill status={s.status} />
                      {s.pausedUntil && s.status === "paused" && <span className="ml-2 text-xs text-ink-3">until {fmtDate(s.pausedUntil)}</span>}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      {s.status === "active" ? (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => (pauseSubscription(s.id, ymd(addDays(new Date(), 7))), toast("Paused for a week"))}>
                          Pause
                        </button>
                      ) : (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => (resumeSubscription(s.id), toast("Resumed"))}>
                          Resume
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------ customers */

export function AdminCustomers() {
  const db = useDB()!;
  const quiet = useMemo(() => behaviourInsights(db.users, db.orders), [db]);
  const customers = db.users.filter((u) => u.role === "customer");
  return (
    <>
      <TopBar title="Customers" sub={`${customers.length} households`} />
      <Panel title="Ordering less than usual" action={<AiBadge>Customer behaviour insights · demo</AiBadge>} className="mb-4">
        {quiet.length === 0 ? (
          <p className="text-ink-2">No noticeable drop-offs in the last two weeks.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-3">
            {quiet.map((x) => (
              <li key={x.user.id} className="rounded-2xl border border-dawn/50 bg-dawn/[0.07] p-4">
                <p className="font-semibold">{x.user.name}</p>
                <p className="text-sm text-ink-2">
                  {x.before} orders in the 31 days before, {x.recent} in the last 14 ({Math.round(x.drop * 100)}% drop).
                </p>
                <p className="mt-2 text-sm">{x.suggestion}</p>
                <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={() => toast("Reminder scheduled", `${x.user.name} · 8:45 PM tonight`)}>
                  Send reminder
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-ink-3">Based only on order frequency and recency. No sensitive attributes are used, and offers are never personalised on assumptions.</p>
      </Panel>
      <Panel title="All customers">
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="text-left text-ink-3">
                <th className="px-2 py-2 font-medium">Name</th>
                <th className="px-2 py-2 font-medium">Area</th>
                <th className="px-2 py-2 text-right font-medium">Orders</th>
                <th className="px-2 py-2 text-right font-medium">Spend</th>
                <th className="px-2 py-2 font-medium">Last order</th>
                <th className="px-2 py-2 font-medium">Subscription</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const mine = db.orders.filter((o) => o.userId === c.id && o.status !== "cancelled");
                const sub = db.subscriptions.find((s) => s.userId === c.id && s.status !== "cancelled");
                return (
                  <tr key={c.id} className="border-t border-rule">
                    <td className="px-2 py-2.5">
                      <span className="font-semibold">{c.name}</span>
                      <span className="block text-xs text-ink-3">{c.email}</span>
                    </td>
                    <td className="px-2 py-2.5 text-ink-2">{c.address?.area}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{mine.length}</td>
                    <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{money(mine.reduce((s, o) => s + o.total, 0))}</td>
                    <td className="px-2 py-2.5 text-ink-2">{mine[0] ? relDay(mine[0].deliveryDate) : "–"}</td>
                    <td className="px-2 py-2.5">{sub ? <StatusPill status={sub.status} /> : <span className="text-xs text-ink-3">None</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------- delivery */

export function AdminDelivery() {
  const db = useDB()!;
  const staff = db.users.filter((u) => u.role === "staff");
  const todays = db.orders.filter((o) => o.deliveryDate === today() && o.status !== "cancelled");
  const unassigned = todays.filter((o) => !o.staffId);
  return (
    <>
      <TopBar title="Delivery staff" sub="Assignments and live progress for today's routes">
        <Link href="/delivery" className="btn btn-ghost btn-sm">
          Open the delivery app
        </Link>
      </TopBar>
      <div className="grid gap-4 xl:grid-cols-3">
        {staff.map((s) => {
          const mine = todays.filter((o) => o.staffId === s.id);
          const done = mine.filter((o) => o.status === "delivered").length;
          const asBooked = [...mine].sort((a, b) => a.placedAt.localeCompare(b.placedAt)).map((o) => o.address);
          const before = routeLength(HUB, asBooked);
          const after = routeLength(HUB, optimiseRoute(HUB, asBooked));
          const cod = mine.filter((o) => o.payment.method === "cod").reduce((x, o) => x + o.total, 0);
          return (
            <Panel key={s.id} title={s.name} action={<span className="chip bg-ink/5 py-1 text-xs capitalize text-ink-2">{s.zone} zone</span>}>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-cream p-3">
                  <p className="text-2xl font-semibold tabular-nums">{mine.length}</p>
                  <p className="text-xs text-ink-3">stops</p>
                </div>
                <div className="rounded-2xl bg-cream p-3">
                  <p className="text-2xl font-semibold tabular-nums">{done}</p>
                  <p className="text-xs text-ink-3">delivered</p>
                </div>
                <div className="rounded-2xl bg-cream p-3">
                  <p className="text-2xl font-semibold tabular-nums">{money(cod)}</p>
                  <p className="text-xs text-ink-3">cash to collect</p>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-cream-2">
                <div className="h-full rounded-full bg-pasture" style={{ width: `${mine.length ? (done / mine.length) * 100 : 0}%` }} />
              </div>
              <p className="mt-4 text-sm text-ink-2">
                Route: <span className="font-semibold text-ink">{after.toFixed(1)} km</span> optimised, down from {before.toFixed(1)} km in booking order (
                {before ? Math.round((1 - after / before) * 100) : 0}% shorter).
              </p>
              <ul className="mt-4 max-h-56 space-y-1.5 overflow-y-auto text-sm" data-lenis-prevent>
                {mine.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3">
                    <span className="truncate">
                      {db.users.find((u) => u.id === o.userId)?.name} · <span className="text-ink-3">{o.address.area}</span>
                    </span>
                    <StatusPill status={o.status} />
                  </li>
                ))}
              </ul>
            </Panel>
          );
        })}
      </div>
      {unassigned.length > 0 && (
        <Panel title={`Unassigned today (${unassigned.length})`} className="mt-4">
          <ul className="space-y-2">
            {unassigned.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>
                  {o.id} · {o.address.area}
                </span>
                <select onChange={(e) => (assignStaff(o.id, e.target.value), toast("Assigned"))} defaultValue="" className="rounded-full border border-rule px-3 py-1.5">
                  <option value="" disabled>
                    Assign to…
                  </option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
