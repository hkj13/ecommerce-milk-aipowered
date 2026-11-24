"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { BarList, ColumnChart } from "@/components/charts/Charts";
import { AdminCatalog, AdminInventory } from "@/components/admin/AdminCatalog";
import { AdminInsights } from "@/components/admin/AdminInsights";
import { AdminCustomers, AdminDelivery, AdminOrders, AdminSubscriptions } from "@/components/admin/AdminOps";
import { Panel, PortalGate, PortalShell, Tile, TopBar } from "@/components/admin/Shell";
import { AiBadge, StatusPill } from "@/components/ui/bits";
import { AlertIcon, BoxIcon, ChartIcon, GridIcon, RepeatIcon, ShieldIcon, SparkIcon, TruckIcon, UsersIcon } from "@/components/ui/icons";
import { CATEGORIES } from "@/data/products";
import { behaviourInsights, forecastDemand, loginFlags, qualityFlags } from "@/lib/ai";
import { addDays, cls, money, today, ymd } from "@/lib/format";
import { liveCatalogue, useDB, useSession } from "@/lib/store";

const NAV = [
  { id: "overview", label: "Overview", icon: <GridIcon size={18} /> },
  { id: "orders", label: "Orders", icon: <TruckIcon size={18} /> },
  { id: "products", label: "Products", icon: <BoxIcon size={18} /> },
  { id: "inventory", label: "Inventory", icon: <AlertIcon size={18} /> },
  { id: "subscriptions", label: "Subscriptions", icon: <RepeatIcon size={18} /> },
  { id: "customers", label: "Customers", icon: <UsersIcon size={18} /> },
  { id: "delivery", label: "Delivery staff", icon: <ChartIcon size={18} /> },
  { id: "insights", label: "AI insights", icon: <SparkIcon size={18} /> },
];

export function AdminView() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get("tab") ?? "overview";
  const db = useDB();
  const { user, ready } = useSession();

  if (!ready || !db) return <div className="min-h-svh bg-night" />;
  if (!user || user.role !== "admin") {
    return (
      <PortalGate role="admin">
        {user ? `You're signed in as ${user.name}, who isn't an admin. ` : ""}Manage products, orders, subscriptions, delivery staff and the AI analytics.
      </PortalGate>
    );
  }

  const flaggedPayments = db.orders.filter((o) => o.payment.status === "review").length;
  const nav = NAV.map((n) => (n.id === "orders" ? { ...n, badge: flaggedPayments } : n.id === "inventory" ? { ...n, badge: liveCatalogue(db).filter((p) => p.stock <= 15).length } : n));

  return (
    <PortalShell user={user} title="Admin" nav={nav} active={tab} onNav={(id) => router.replace(`/admin?tab=${id}`, { scroll: false })}>
      {tab === "overview" && <Overview go={(t) => router.replace(`/admin?tab=${t}`, { scroll: false })} />}
      {tab === "orders" && <AdminOrders />}
      {tab === "products" && <AdminCatalog />}
      {tab === "inventory" && <AdminInventory />}
      {tab === "subscriptions" && <AdminSubscriptions />}
      {tab === "customers" && <AdminCustomers />}
      {tab === "delivery" && <AdminDelivery />}
      {tab === "insights" && <AdminInsights />}
    </PortalShell>
  );
}

function Overview({ go }: { go: (t: string) => void }) {
  const db = useDB()!;
  const me = db.users.find((u) => u.id === db.session?.userId);
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const t = today();
  const live = db.orders.filter((o) => o.status !== "cancelled");
  const todays = live.filter((o) => o.deliveryDate === t);
  const delivered = todays.filter((o) => o.status === "delivered").length;
  const since = ymd(addDays(new Date(), -range + 1));
  const prevSince = ymd(addDays(new Date(), -range * 2 + 1));
  const inRange = live.filter((o) => o.deliveryDate >= since && o.deliveryDate <= t);
  const prev = live.filter((o) => o.deliveryDate >= prevSince && o.deliveryDate < since);
  const revenue = inRange.reduce((s, o) => s + o.total, 0);
  const prevRevenue = prev.reduce((s, o) => s + o.total, 0);
  const change = prevRevenue ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
  const activeSubs = db.subscriptions.filter((s) => s.status === "active").length;
  const customers = db.users.filter((u) => u.role === "customer").length;

  const series = useMemo(() => {
    const out: { label: string; short: string; value: number }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = addDays(new Date(), -i);
      const key = ymd(d);
      out.push({
        label: d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
        short: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        value: live.filter((o) => o.deliveryDate === key).reduce((s, o) => s + o.total, 0),
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, range]);

  const byCategory = useMemo(() => {
    const cat = liveCatalogue(db);
    const m = new Map<string, number>();
    inRange.forEach((o) =>
      o.lines.forEach((l) => {
        const c = cat.find((p) => p.slug === l.slug)?.category ?? "milk";
        m.set(c, (m.get(c) ?? 0) + l.price * l.qty);
      }),
    );
    return CATEGORIES.map((c) => ({ label: c.label, value: m.get(c.id) ?? 0 })).sort((a, b) => b.value - a.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, range]);

  const fc = useMemo(() => forecastDemand(7), []);
  const low = liveCatalogue(db).filter((p) => p.stock <= 15);
  const qFlags = db.quality.filter((q) => qualityFlags(q).length > 0);
  const quiet = behaviourInsights(db.users, db.orders);
  const lFlags = loginFlags(db.loginEvents);
  const staff = db.users.filter((u) => u.role === "staff");

  return (
    <>
      <TopBar title={`Good morning, ${me?.name.split(" ")[0] ?? "admin"}.`} sub={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}>
        <div className="flex rounded-full border border-rule bg-white/60 p-1" role="group" aria-label="Date range">
          {([7, 30, 90] as const).map((r) => (
            <button key={r} type="button" onClick={() => setRange(r)} aria-pressed={range === r} className={cls("rounded-full px-3.5 py-1.5 text-sm font-semibold", range === r ? "bg-ink text-milk" : "text-ink-2")}>
              {r} days
            </button>
          ))}
        </div>
        <AiBadge>Sample data</AiBadge>
      </TopBar>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <Tile
          label={`Revenue, last ${range} days`}
          value={money(revenue)}
          delta={range < 90 ? `${change >= 0 ? "+" : ""}${change.toFixed(1)}%` : undefined}
          hint={range < 90 ? `vs previous ${range} days` : `${inRange.length} orders`}
          tone={change >= 0 ? "up" : "down"}
        />
        <Tile label="Orders today" value={todays.length} hint={`${delivered} delivered so far`} />
        <Tile label="Active subscriptions" value={activeSubs} hint={`${db.subscriptions.filter((s) => s.status === "paused").length} paused`} />
        <Tile label="Customers" value={customers} hint={`${quiet.length} going quiet`} />
        <Tile label="Tomorrow's milk forecast" value={`${fc.forecast[0].litres} L`} hint={`${fc.forecast[0].lo}–${fc.forecast[0].hi} L range`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title={`Revenue by delivery day, last ${range} days`} className="xl:col-span-2">
          <ColumnChart data={series} format={money} label={`Revenue per day for the last ${range} days`} highlightLast />
          <p className="mt-3 text-xs text-ink-3">Amber: today (deliveries still in progress).</p>
        </Panel>
        <Panel title="Sales by category">
          <BarList data={byCategory} format={money} />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title={<span className="flex items-center gap-2"><SparkIcon size={17} className="text-butter-ink" /> AI insights for today</span>} action={<button type="button" onClick={() => go("insights")} className="mono-label link-draw text-pasture">Open →</button>} className="xl:col-span-2">
          <ul className="grid gap-3 md:grid-cols-2">
            <Insight tone="info" title={`Plan ${fc.forecast[0].litres} L for tomorrow`} body={`${fc.peakDay}s run ${Math.round(fc.peakLift)}% above average. Weekly demand is ${fc.weeklyGrowth >= 0 ? "up" : "down"} ${Math.abs(fc.weeklyGrowth).toFixed(1)}%.`} onClick={() => go("insights")} />
            <Insight tone={low.length ? "warn" : "ok"} title={low.length ? `${low.length} products low or out of stock` : "Stock is healthy"} body={low.map((p) => `${p.name} (${p.stock})`).join(", ") || "Nothing below 15 units."} onClick={() => go("inventory")} />
            <Insight tone={qFlags.length ? "warn" : "ok"} title={`${qFlags.length} batches flagged for re-test`} body={qFlags.map((q) => q.batch).join(", ") || "All readings within limits."} onClick={() => go("insights")} />
            <Insight tone={lFlags.length ? "warn" : "ok"} title={`${lFlags.length} unusual sign-ins, ${db.orders.filter((o) => o.payment.status === "review").length} payments held`} body="Flags for a person to review. Nothing is blocked automatically." onClick={() => go("insights")} />
            <Insight tone="info" title={`${quiet.length} customers ordering less`} body={quiet.map((q) => q.user.name).join(", ") || "No drop-offs this fortnight."} onClick={() => go("customers")} />
            <Insight tone="info" title="Routes optimised overnight" body="Today's three routes were re-ordered by the route planner. See the delivery staff tab." onClick={() => go("delivery")} />
          </ul>
        </Panel>
        <Panel title="Deliveries right now" action={<StatusPill status="out_for_delivery" />}>
          <ul className="space-y-5">
            {staff.map((s) => {
              const mine = todays.filter((o) => o.staffId === s.id);
              const done = mine.filter((o) => o.status === "delivered").length;
              return (
                <li key={s.id}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-semibold">{s.name}</span>
                    <span className="tabular-nums text-ink-2">
                      {done}/{mine.length} stops
                    </span>
                  </div>
                  <p className="text-xs capitalize text-ink-3">{s.zone} zone</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream-2">
                    <div className="h-full rounded-full bg-pasture" style={{ width: `${mine.length ? (done / mine.length) * 100 : 0}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={() => go("delivery")} className="btn btn-ghost btn-sm mt-6">
            Manage staff
          </button>
        </Panel>
      </div>

      <Panel title="Latest orders" action={<button type="button" onClick={() => go("orders")} className="mono-label link-draw text-pasture">All orders →</button>} className="mt-4">
        <OrdersMini />
      </Panel>
    </>
  );
}

function Insight({ title, body, tone, onClick }: { title: string; body: string; tone: "ok" | "warn" | "info"; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className={cls("h-full w-full rounded-2xl border p-4 text-left transition-colors hover:border-ink-3", tone === "warn" ? "border-dawn/60 bg-dawn/[0.08]" : tone === "ok" ? "border-ok/25 bg-ok/[0.04]" : "border-rule bg-white/50")}>
        <p className="flex items-center gap-2 font-semibold">
          {tone === "warn" ? <AlertIcon size={16} className="text-clay" /> : tone === "ok" ? <ShieldIcon size={16} className="text-ok" /> : <SparkIcon size={16} className="text-butter-ink" />}
          {title}
        </p>
        <p className="mt-1 text-sm text-ink-2">{body}</p>
      </button>
    </li>
  );
}

function OrdersMini() {
  const db = useDB()!;
  const rows = db.orders.slice(0, 8);
  return (
    <div className="-mx-2 overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-left text-ink-3">
            <th className="px-2 py-2 font-medium">Order</th>
            <th className="px-2 py-2 font-medium">Customer</th>
            <th className="px-2 py-2 font-medium">Delivery</th>
            <th className="px-2 py-2 text-right font-medium">Total</th>
            <th className="px-2 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-t border-rule">
              <td className="px-2 py-2.5 font-semibold">{o.id}</td>
              <td className="px-2 py-2.5">{db.users.find((u) => u.id === o.userId)?.name}</td>
              <td className="px-2 py-2.5 text-ink-2">{o.deliveryDate === today() ? "Today" : o.deliveryDate}</td>
              <td className="px-2 py-2.5 text-right tabular-nums">{money(o.total)}</td>
              <td className="px-2 py-2.5">
                <StatusPill status={o.payment.status === "review" ? "review" : o.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
