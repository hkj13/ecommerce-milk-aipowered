"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SignInPrompt } from "@/components/account/SignInPrompt";
import { ProductThumb } from "@/components/shop/ProductArt";
import { toast } from "@/components/ui/Toaster";
import { Empty, Skeleton, StatusPill } from "@/components/ui/bits";
import { CheckIcon, DownloadIcon, PhoneIcon, PinIcon, ShieldIcon, TruckIcon } from "@/components/ui/icons";
import { HUB } from "@/data/seed";
import { eta } from "@/lib/ai-plus";
import { optimiseRoute } from "@/lib/ai";
import { cancelOrder } from "@/lib/actions";
import { cls, fmtDateTime, fmtTime, money, relDay } from "@/lib/format";
import { useCatalogue, useDB, useSession } from "@/lib/store";

const STEPS = [
  { id: "placed", label: "Order placed", note: "We've got it" },
  { id: "packed", label: "Packed at the hub", note: "Chilled crates, around 4:55 AM" },
  { id: "out_for_delivery", label: "Out for delivery", note: "Left the hub around 5:35 AM" },
  { id: "delivered", label: "Delivered", note: "At your door" },
] as const;

export function OrderView() {
  const params = useSearchParams();
  const id = params.get("id");
  const isNew = params.get("new") === "1";
  const db = useDB();
  const all = useCatalogue();
  const { user, ready } = useSession();

  if (!ready) {
    return (
      <div className="wrap pb-24 pt-[calc(var(--header-h)+4rem)]">
        <Skeleton className="h-[60vh]" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="wrap pb-24 pt-[calc(var(--header-h)+4rem)]">
        <SignInPrompt title="Sign in to track this order" next={`/account/order?id=${id}`} />
      </div>
    );
  }
  const o = db?.orders.find((x) => x.id === id && (x.userId === user.id || user.role !== "customer"));
  if (!o) {
    return (
      <div className="wrap pb-24 pt-[calc(var(--header-h)+4rem)]">
        <Empty title="Order not found" body="It may belong to another account." href="/account?tab=orders" cta="My orders" />
      </div>
    );
  }
  const staff = db?.users.find((u) => u.id === o.staffId);
  const run = db ? db.orders.filter((x) => x.staffId === o.staffId && x.deliveryDate === o.deliveryDate && x.status !== "cancelled") : [];
  const route = optimiseRoute(HUB, run.map((x) => ({ lat: x.address.lat, lng: x.address.lng, id: x.id })));
  const stopNo = route.findIndex((x) => x.id === o.id) + 1;
  const ahead = route.slice(0, stopNo - 1).filter((x) => run.find((r) => r.id === x.id)?.status !== "delivered").length;
  const idx = STEPS.findIndex((s) => s.id === o.status);
  const at = (s: string) => o.timeline.find((t) => t.status === s)?.at;
  const cancellable = o.status === "placed";

  return (
    <div className="pb-24 pt-[calc(var(--header-h)+2rem)]">
      <div className="wrap">
        {isNew && (
          <div className="animate-slide-up mb-10 overflow-hidden rounded-[28px] bg-pasture p-8 text-milk md:p-12">
            <p className="mono-label flex items-center gap-2 text-butter">
              <CheckIcon size={16} /> Order confirmed
            </p>
            <h1 className="display-l mt-4">
              See you {relDay(o.deliveryDate).toLowerCase()}, <em className="display-em text-butter">{o.slot === "morning" ? "before sunrise." : "this evening."}</em>
            </h1>
            <p className="mt-4 max-w-[52ch] text-milk/75">
              {o.payment.status === "review"
                ? "Your order is placed. The payment looked unusual for your account, so a person will confirm it shortly. Nothing has been rejected."
                : `Payment ${o.payment.method === "cod" ? "on delivery" : "received (demo)"}. We'll send an update when it's out for delivery.`}
            </p>
          </div>
        )}

        <div className="grid-12 gap-y-8">
          <div className="col-span-4 md:col-span-8 xl:col-span-7">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="display-m">Order {o.id}</h2>
              <StatusPill status={o.status} />
              {o.payment.status === "review" && <StatusPill status="review" />}
            </div>
            <p className="mt-2 text-ink-2">
              Placed {fmtDateTime(o.placedAt)} · Delivery {relDay(o.deliveryDate)}, {o.slot === "morning" ? "5:30 to 7:30 AM" : "5 to 7 PM"}
            </p>
            {db && eta(o, db) && (
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-butter/15 px-3.5 py-2 text-sm font-semibold text-butter-ink">
                <TruckIcon size={16} /> Expected around {eta(o, db)!.label} {relDay(o.deliveryDate).toLowerCase()} · AI ETA from the optimised route
              </p>
            )}

            {o.status !== "cancelled" ? (
              <ol className="card mt-8 p-6 md:p-8">
                {STEPS.map((s, i) => {
                  const done = i <= idx;
                  const current = i === idx;
                  return (
                    <li key={s.id} className="relative flex gap-5 pb-8 last:pb-0">
                      {i < STEPS.length - 1 && <span aria-hidden className={cls("absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5", i < idx ? "bg-pasture" : "bg-rule")} />}
                      <span className={cls("relative grid h-8 w-8 flex-none place-items-center rounded-full", done ? "bg-pasture text-milk" : "border-2 border-rule bg-milk")}>
                        {done && <CheckIcon size={16} />}
                        {current && o.status !== "delivered" && <span aria-hidden className="absolute inset-0 rounded-full bg-pasture [animation:pulse-ring_2s_ease-out_infinite]" />}
                      </span>
                      <div className="pt-0.5">
                        <p className={cls("font-semibold", !done && "text-ink-3")}>{s.label}</p>
                        <p className="text-sm text-ink-3">{at(s.id) ? fmtTime(at(s.id)!) : s.note}</p>
                        {s.id === "out_for_delivery" && current && staff && (
                          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-cream p-3 text-sm">
                            <TruckIcon size={18} className="text-pasture" />
                            <span>
                              <span className="font-semibold">{staff.name}</span> is on the way · you are stop {stopNo} of {route.length}
                              {ahead > 0 ? `, ${ahead} stop${ahead > 1 ? "s" : ""} before you` : ", you're next"}
                            </span>
                            <a href={`tel:${staff.phone}`} className="btn btn-ghost btn-sm ml-auto">
                              <PhoneIcon size={15} /> Call
                            </a>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="card mt-8 p-6 text-ink-2">This order was cancelled{o.payment.method !== "cod" ? " and refunded to the original payment method" : ""}.</p>
            )}

            <div className="card mt-6 p-6">
              <p className="flex items-center gap-2 font-semibold">
                <PinIcon size={17} className="text-pasture" /> Delivering to
              </p>
              <p className="mt-1 text-ink-2">
                {o.address.line1}, {o.address.area}, {o.address.city} {o.address.pincode}
              </p>
              {o.note && <p className="mt-2 text-sm text-ink-3">Note: {o.note}</p>}
            </div>
          </div>

          <aside className="col-span-4 md:col-span-8 xl:col-span-4 xl:col-start-9">
            <div className="card p-6">
              <p className="h3">Items</p>
              <ul className="mt-4 space-y-3">
                {o.lines.map((l) => {
                  const p = all.find((x) => x.slug === l.slug);
                  return (
                    <li key={l.slug + l.variant} className="flex items-center gap-3">
                      <span className="relative h-12 w-12 flex-none overflow-hidden rounded-xl" style={{ background: p?.tint }}>
                        {p && <ProductThumb product={p} sizes="48px" />}
                      </span>
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="block truncate font-semibold">{l.name}</span>
                        <span className="text-ink-3">
                          {l.qty} × {l.label}
                        </span>
                      </span>
                      <span className="text-sm font-semibold tabular-nums">{money(l.price * l.qty)}</span>
                    </li>
                  );
                })}
              </ul>
              <dl className="mt-5 space-y-2 border-t border-rule pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-2">Subtotal</dt>
                  <dd>{money(o.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-2">Delivery</dt>
                  <dd>{o.deliveryFee ? money(o.deliveryFee) : "Free"}</dd>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <dt>Total</dt>
                  <dd>{money(o.total)}</dd>
                </div>
                <div className="flex justify-between pt-2">
                  <dt className="text-ink-2">Payment</dt>
                  <dd className="flex items-center gap-2">
                    {o.payment.method === "cod" ? "Cash on delivery" : o.payment.method.toUpperCase()} <StatusPill status={o.payment.status} />
                  </dd>
                </div>
              </dl>
              {o.payment.flag && (
                <p className="mt-4 flex gap-2 rounded-2xl bg-alert/[0.06] p-3 text-xs text-alert">
                  <ShieldIcon size={15} className="flex-none" /> {o.payment.flag}
                </p>
              )}
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href={`/account/invoice?id=${o.id}`} className="btn btn-primary btn-sm">
                  <DownloadIcon size={15} /> Invoice
                </Link>
                {cancellable && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => (cancelOrder(o.id), toast("Order cancelled", o.payment.method === "cod" ? undefined : "Refund on its way (demo)", "info"))}>
                    Cancel order
                  </button>
                )}
                <Link href="/account?tab=orders" className="btn btn-ghost btn-sm">
                  All orders
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
