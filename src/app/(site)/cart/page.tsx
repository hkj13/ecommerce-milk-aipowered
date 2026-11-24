"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ProductThumb } from "@/components/shop/ProductArt";
import { ProductCard } from "@/components/shop/ProductCard";
import { AiBadge, Empty, PageHead, Skeleton, Stepper } from "@/components/ui/bits";
import { ArrowRight, TrashIcon, TruckIcon } from "@/components/ui/icons";
import { site } from "@/config/site";
import { recommend } from "@/lib/ai";
import { setCartQty } from "@/lib/actions";
import { money } from "@/lib/format";
import { useCatalogue, useDB } from "@/lib/store";

export default function CartPage() {
  const db = useDB();
  const all = useCatalogue();
  const lines = useMemo(
    () =>
      (db?.cart ?? [])
        .map((l) => {
          const p = all.find((x) => x.slug === l.slug);
          const v = p?.variants.find((x) => x.id === l.variant);
          return p && v ? { ...l, p, v, total: v.price * l.qty } : null;
        })
        .filter(Boolean) as { slug: string; variant: string; qty: number; p: (typeof all)[number]; v: (typeof all)[number]["variants"][number]; total: number }[],
    [db, all],
  );
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const fee = subtotal === 0 || subtotal >= site.freeDeliveryAbove ? 0 : site.deliveryFee;
  const toFree = Math.max(0, site.freeDeliveryAbove - subtotal);
  const user = db?.session ? db.users.find((u) => u.id === db.session!.userId) : null;
  const recs = useMemo(
    () =>
      recommend({
        cart: lines.map((l) => l.slug),
        history: db && user ? db.orders.filter((o) => o.userId === user.id) : [],
        available: (s) => (all.find((p) => p.slug === s)?.stock ?? 0) > 0,
        n: 4,
      }),
    [lines, db, user, all],
  );

  return (
    <>
      <PageHead label="Your cart" title="Tomorrow's" em="delivery." sub={`Order by ${site.orderCutoff} and it's at your door between 5:30 and 7:30 AM.`} />
      <div className="wrap grid-12 gap-y-10 py-12 md:py-16">
        <section aria-label="Items" className="col-span-4 md:col-span-8 xl:col-span-7">
          {!db ? (
            <div className="space-y-4">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          ) : lines.length === 0 ? (
            <Empty title="Your cart is empty" body="Start with a bottle of A2 milk and some clay pot curd. Most mornings begin that way." href="/shop" cta="Go to the shop" />
          ) : (
            <ul className="divide-y divide-rule border-y border-rule">
              {lines.map((l) => (
                <li key={l.slug + l.variant} className="flex gap-4 py-5 sm:gap-6">
                  <Link href={`/shop/${l.slug}`} className="relative h-24 w-20 flex-none overflow-hidden rounded-2xl sm:h-28 sm:w-24" style={{ background: l.p.tint }}>
                    <ProductThumb product={l.p} sizes="96px" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/shop/${l.slug}`} className="h3 block truncate">
                          {l.p.name}
                        </Link>
                        <p className="text-sm text-ink-3">
                          {l.v.label} · {money(l.v.price)} each
                        </p>
                      </div>
                      <p className="font-bold tabular-nums">{money(l.total)}</p>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <Stepper size="sm" value={l.qty} min={0} onChange={(q) => setCartQty(l.slug, l.variant, q)} />
                      <button type="button" onClick={() => setCartQty(l.slug, l.variant, 0)} className="flex items-center gap-1.5 text-sm text-ink-3 hover:text-alert">
                        <TrashIcon size={16} /> Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="col-span-4 md:col-span-8 xl:col-span-4 xl:col-start-9">
          <div className="card sticky top-[calc(var(--header-h)+1rem)] p-6 md:p-7">
            <p className="h3">Summary</p>
            <dl className="mt-5 space-y-3 text-[0.95rem]">
              <div className="flex justify-between">
                <dt className="text-ink-2">Subtotal</dt>
                <dd className="font-semibold tabular-nums">{money(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-2">Delivery</dt>
                <dd className="font-semibold tabular-nums">{fee ? money(fee) : "Free"}</dd>
              </div>
              <div className="flex justify-between border-t border-rule pt-3 text-lg">
                <dt className="font-semibold">Total</dt>
                <dd className="font-bold tabular-nums">{money(subtotal + fee)}</dd>
              </div>
            </dl>
            {subtotal > 0 && (
              <div className="mt-5 rounded-2xl bg-cream p-4 text-sm">
                <p className="flex items-center gap-2 font-semibold">
                  <TruckIcon size={17} className="text-pasture" />
                  {toFree > 0 ? `Add ${money(toFree)} more for free delivery` : "Free delivery unlocked"}
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-rule">
                  <div className="h-full rounded-full bg-pasture transition-[width] duration-700" style={{ width: `${Math.min(100, (subtotal / site.freeDeliveryAbove) * 100)}%` }} />
                </div>
              </div>
            )}
            <Link href={lines.length ? "/checkout" : "/shop"} className="btn btn-primary mt-6 w-full" aria-disabled={!lines.length}>
              {lines.length ? "Checkout" : "Add something first"} <ArrowRight size={18} />
            </Link>
            <p className="mt-4 text-center text-xs text-ink-3">UPI, cards or cash on delivery. Demo payments only.</p>
          </div>
        </aside>
      </div>

      {db && recs.length > 0 && (
        <section aria-labelledby="cart-recs" className="wrap pb-24">
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-12">
            <h2 id="cart-recs" className="display-m">
              {lines.length ? "People who buy these also add" : "Popular this week"}
            </h2>
            <AiBadge>Smart cart suggestions · demo</AiBadge>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-[var(--gutter)] lg:grid-cols-4">
            {recs.map((r) => {
              const p = all.find((x) => x.slug === r.slug);
              return p ? <ProductCard key={r.slug} product={p} reason={r.reason} size="sm" /> : null;
            })}
          </div>
        </section>
      )}
    </>
  );
}
