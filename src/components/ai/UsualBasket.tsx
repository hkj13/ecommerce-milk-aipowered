"use client";

import { useMemo } from "react";
import { ProductThumb } from "@/components/shop/ProductArt";
import { toast } from "@/components/ui/Toaster";
import { AiBadge } from "@/components/ui/bits";
import { predictBasket } from "@/lib/ai-plus";
import { addToCart } from "@/lib/actions";
import { cls, money } from "@/lib/format";
import { useCatalogue, useDB } from "@/lib/store";

/** The customer's predicted basket for tomorrow, one tap to add. */
export function UsualBasket({ userId, className = "" }: { userId: string; className?: string }) {
  const db = useDB();
  const all = useCatalogue();
  const items = useMemo(() => (db ? predictBasket(db.orders, userId) : []), [db, userId]);
  const rows = items
    .map((i) => {
      const p = all.find((x) => x.slug === i.slug);
      const v = p?.variants.find((x) => x.id === i.variant);
      return p && v ? { ...i, p, v } : null;
    })
    .filter(Boolean) as (ReturnType<typeof predictBasket>[number] & { p: (typeof all)[number]; v: (typeof all)[number]["variants"][number] })[];
  if (!rows.length) return null;
  const total = rows.reduce((s, r) => s + r.v.price * r.qty, 0);
  return (
    <section aria-labelledby="usual" className={cls("card p-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="usual" className="h3">
          Your usual, for tomorrow?
        </h2>
        <AiBadge>Predicted basket · demo</AiBadge>
      </div>
      <p className="mt-1 text-sm text-ink-2">Predicted from your last 30 orders. Tap once instead of picking everything again.</p>
      <ul className="mt-5 space-y-3">
        {rows.map((r) => (
          <li key={r.slug} className="flex items-center gap-3">
            <span className="relative h-11 w-11 flex-none overflow-hidden rounded-xl" style={{ background: r.p.tint }}>
              <ProductThumb product={r.p} sizes="44px" />
            </span>
            <span className="min-w-0 flex-1 text-sm">
              <span className="block truncate font-semibold">
                {r.qty} × {r.p.name}
              </span>
              <span className="text-ink-3">
                {r.v.label} · in {Math.round(r.likelihood * 100)}% of your orders
              </span>
            </span>
            <span className="w-16 flex-none">
              <span className="block h-1.5 overflow-hidden rounded-full bg-cream-2">
                <span className="block h-full rounded-full bg-pasture" style={{ width: `${Math.round(r.likelihood * 100)}%` }} />
              </span>
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn btn-primary btn-sm mt-6"
        onClick={() => {
          rows.forEach((r) => addToCart(r.slug, r.variant, r.qty));
          toast("Your usual is in the cart", money(total));
        }}
      >
        Add all · {money(total)}
      </button>
    </section>
  );
}
