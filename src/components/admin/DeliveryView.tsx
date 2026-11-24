"use client";

import { useMemo, useState } from "react";
import { Panel, PortalGate, PortalShell, Tile, TopBar } from "@/components/admin/Shell";
import { toast } from "@/components/ui/Toaster";
import { AiBadge, StatusPill } from "@/components/ui/bits";
import { CalendarIcon, CheckIcon, PhoneIcon, PinIcon, RouteIcon } from "@/components/ui/icons";
import { HUB } from "@/data/seed";
import { optimiseRoute, routeLength } from "@/lib/ai";
import { setOrderStatus } from "@/lib/actions";
import { addDays, cls, fmtDay, fmtTime, money, today, ymd } from "@/lib/format";
import { useDB, useSession } from "@/lib/store";
import type { Order } from "@/lib/types";

type Stop = Order & { lat: number; lng: number };

export function DeliveryView() {
  const db = useDB();
  const { user, ready } = useSession();
  const [tab, setTab] = useState("route");
  const [compare, setCompare] = useState(false);

  const mine = useMemo<Stop[]>(
    () =>
      db && user
        ? db.orders
            .filter((o) => o.staffId === user.id && o.deliveryDate === today() && o.status !== "cancelled")
            .map((o) => ({ ...o, lat: o.address.lat, lng: o.address.lng }))
        : [],
    [db, user],
  );
  const booked = useMemo(() => [...mine].sort((a, b) => a.placedAt.localeCompare(b.placedAt)), [mine]);
  const route = useMemo(() => optimiseRoute(HUB, booked), [booked]);

  if (!ready || !db) return <div className="min-h-svh bg-night" />;
  if (!user || user.role !== "staff") {
    return (
      <PortalGate role="staff">
        {user ? `You're signed in as ${user.name}, who isn't a delivery partner. ` : ""}See today&apos;s stops in the order the route planner suggests, and mark each one delivered.
      </PortalGate>
    );
  }

  const before = routeLength(HUB, booked);
  const after = routeLength(HUB, route);
  const done = mine.filter((o) => o.status === "delivered").length;
  const cod = mine.filter((o) => o.payment.method === "cod" && o.payment.status !== "paid").reduce((s, o) => s + o.total, 0);
  const nextIdx = route.findIndex((o) => o.status !== "delivered");

  const nav = [
    { id: "route", label: "Today's route", icon: <RouteIcon size={18} />, badge: mine.length - done },
    { id: "history", label: "History", icon: <CalendarIcon size={18} /> },
  ];

  return (
    <PortalShell user={user} title="Delivery" nav={nav} active={tab} onNav={setTab} accent="night">
      {tab === "route" ? (
        <>
          <TopBar title={`Good morning, ${user.name.split(" ")[0]}.`} sub={`${fmtDay(today())} · ${user.zone} zone · leave the hub by 5:30 AM`}>
            <AiBadge>Route optimised · demo</AiBadge>
          </TopBar>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Tile label="Stops" value={mine.length} hint={`${done} done`} />
            <Tile label="Route" value={`${after.toFixed(1)} km`} hint={`vs ${before.toFixed(1)} km in booking order`} />
            <Tile label="Saved" value={`${before ? Math.round((1 - after / before) * 100) : 0}%`} hint={`${(before - after).toFixed(1)} km less driving`} />
            <Tile label="Cash to collect" value={money(cod)} hint="Cash on delivery" />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-5">
            <Panel
              title="Suggested route"
              action={
                <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
                  <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} className="h-4 w-4 accent-[var(--color-pasture)]" />
                  Show booking order
                </label>
              }
              className="xl:col-span-2"
            >
              <RouteMap stops={route} booked={booked} compare={compare} />
              <p className="mt-3 text-xs text-ink-3">
                Nearest-neighbour route improved with 2-opt on straight-line distances. Production: a maps / routing API with live traffic.
              </p>
            </Panel>
            <Panel title="Stops, in order" className="xl:col-span-3">
              <ol className="space-y-3">
                {route.map((o, i) => {
                  const c = db.users.find((u) => u.id === o.userId);
                  const isDone = o.status === "delivered";
                  return (
                    <li key={o.id} className={cls("rounded-2xl border p-4 transition-colors", isDone ? "border-ok/25 bg-ok/[0.04]" : i === nextIdx ? "border-pasture ring-1 ring-pasture" : "border-rule")}>
                      <div className="flex flex-wrap items-start gap-4">
                        <span className={cls("grid h-9 w-9 flex-none place-items-center rounded-full text-sm font-bold", isDone ? "bg-ok text-milk" : "bg-night text-milk")}>{isDone ? <CheckIcon size={16} /> : i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{c?.name}</p>
                            {i === nextIdx && <span className="chip bg-butter/30 py-0.5 text-[0.68rem] text-butter-ink">Next</span>}
                            <StatusPill status={o.status} />
                          </div>
                          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-2">
                            <PinIcon size={14} /> {o.address.line1}, {o.address.area}
                          </p>
                          <p className="mt-1 text-sm">{o.lines.map((l) => `${l.qty} × ${l.name} (${l.label})`).join(", ")}</p>
                          {o.note && <p className="mt-1 text-sm text-clay">Note: {o.note}</p>}
                          <p className="mt-1 text-xs text-ink-3">
                            {o.payment.method === "cod" ? `Collect ${money(o.total)} cash` : `Prepaid by ${o.payment.method.toUpperCase()}`}
                            {o.deliveredAt && ` · delivered ${fmtTime(o.deliveredAt)}`}
                          </p>
                        </div>
                        <div className="flex w-full gap-2 pl-[3.25rem] sm:w-auto sm:pl-0">
                          <a href={`tel:${c?.phone}`} className="grid h-10 w-10 place-items-center rounded-full border border-rule" aria-label={`Call ${c?.name}`}>
                            <PhoneIcon size={16} />
                          </a>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${o.address.lat},${o.address.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="grid h-10 w-10 place-items-center rounded-full border border-rule"
                            aria-label="Navigate"
                          >
                            <RouteIcon size={16} />
                          </a>
                          {!isDone && (
                            <button
                              type="button"
                              onClick={() => {
                                setOrderStatus(o.id, "delivered");
                                toast(`Stop ${i + 1} delivered`, c?.name);
                              }}
                              className="btn btn-primary btn-sm"
                            >
                              Delivered
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
                {route.length === 0 && <li className="text-ink-2">No stops assigned for today.</li>}
              </ol>
            </Panel>
          </div>
        </>
      ) : (
        <History userId={user.id} />
      )}
    </PortalShell>
  );
}

function RouteMap({ stops, booked, compare }: { stops: Stop[]; booked: Stop[]; compare: boolean }) {
  const pts = [HUB, ...stops];
  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const pad = 0.006;
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats) - pad, Math.max(...lats) + pad, Math.min(...lngs) - pad, Math.max(...lngs) + pad];
  const W = 400;
  const H = Math.max(260, Math.min(460, (W * (maxLat - minLat)) / (maxLng - minLng)));
  const x = (lng: number) => ((lng - minLng) / (maxLng - minLng)) * W;
  const y = (lat: number) => ((maxLat - lat) / (maxLat - minLat)) * H;
  const path = (list: { lat: number; lng: number }[]) => [HUB, ...list].map((p, i) => `${i ? "L" : "M"}${x(p.lng).toFixed(1)},${y(p.lat).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-2xl bg-[#eef0e6]" role="img" aria-label="Map of today's stops and the suggested route">
      {/* soft grid as streets */}
      {Array.from({ length: 9 }, (_, i) => (
        <g key={i} stroke="#dfe3d3" strokeWidth={1}>
          <line x1={(W / 8) * i} x2={(W / 8) * i} y1={0} y2={H} />
          <line y1={(H / 8) * i} y2={(H / 8) * i} x1={0} x2={W} />
        </g>
      ))}
      {/* the coast */}
      <path d={`M${W - 18},0 C ${W - 6},${H * 0.4} ${W - 30},${H * 0.7} ${W - 10},${H} L${W},${H} L${W},0 Z`} fill="#cfe0e6" />
      {compare && <path d={path(booked)} fill="none" stroke="#736b5e" strokeWidth={1.5} strokeDasharray="4 4" />}
      <path d={path(stops)} fill="none" stroke="#1f7a4a" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <rect x={x(HUB.lng) - 8} y={y(HUB.lat) - 8} width={16} height={16} rx={4} fill="#0e1525" />
      <text x={x(HUB.lng) + 12} y={y(HUB.lat) + 4} fontSize={11} fill="#1c1a16" fontWeight={600}>
        Hub
      </text>
      {stops.map((s, i) => (
        <g key={s.id}>
          <circle cx={x(s.lng)} cy={y(s.lat)} r={10} fill={s.status === "delivered" ? "#2f7a44" : "#fffdf8"} stroke="#1f7a4a" strokeWidth={2} />
          <text x={x(s.lng)} y={y(s.lat) + 3.5} fontSize={10} textAnchor="middle" fontWeight={700} fill={s.status === "delivered" ? "#fffdf8" : "#1c1a16"}>
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}

function History({ userId }: { userId: string }) {
  const db = useDB()!;
  const days = Array.from({ length: 7 }, (_, i) => ymd(addDays(new Date(), -i - 1)));
  return (
    <>
      <TopBar title="Delivery history" sub="The last seven days" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {days.map((d) => {
          const list = db.orders.filter((o) => o.staffId === userId && o.deliveryDate === d);
          const ok = list.filter((o) => o.status === "delivered");
          const firstLast = ok.map((o) => o.deliveredAt!).sort();
          return (
            <Panel key={d} title={fmtDay(d)} action={<span className="text-sm text-ink-3">{ok.length}/{list.length} delivered</span>}>
              <p className="text-sm text-ink-2">{firstLast.length ? `First drop ${fmtTime(firstLast[0])}, last ${fmtTime(firstLast[firstLast.length - 1])}` : "No deliveries"}</p>
              <ul className="mt-3 space-y-1 text-sm">
                {list.slice(0, 6).map((o) => (
                  <li key={o.id} className="flex justify-between gap-2">
                    <span className="truncate">{db.users.find((u) => u.id === o.userId)?.name}</span>
                    <span className="text-ink-3">{o.address.area}</span>
                  </li>
                ))}
                {list.length > 6 && <li className="text-xs text-ink-3">+{list.length - 6} more</li>}
              </ul>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
