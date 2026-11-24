"use client";

import Link from "next/link";
import { ProductThumb } from "@/components/shop/ProductArt";
import { toast } from "@/components/ui/Toaster";
import { PlusIcon, RepeatIcon, StarIcon } from "@/components/ui/icons";
import { addToCart } from "@/lib/actions";
import { cls, money } from "@/lib/format";
import type { LiveProduct } from "@/lib/store";

export function stockState(p: { stock: number }) {
  if (p.stock <= 0) return { label: "Back tomorrow", tone: "out" as const };
  if (p.stock <= 15) return { label: `Only ${p.stock} left`, tone: "low" as const };
  return { label: "In stock", tone: "ok" as const };
}

export function ProductCard({
  product: p,
  reason,
  size = "md",
  priority = false,
}: {
  product: LiveProduct;
  reason?: string;
  size?: "md" | "sm";
  priority?: boolean;
}) {
  const v = p.variants[0];
  const stock = stockState(p);
  const out = stock.tone === "out";
  return (
    <article className="group relative flex h-full flex-col">
      <Link
        href={`/shop/${p.slug}`}
        data-cursor="View"
        className="relative block overflow-hidden rounded-[22px]"
        style={{ background: p.tint }}
      >
        <div className={cls("relative w-full", size === "sm" ? "aspect-[4/4.2]" : "aspect-[4/5]")}>
          <ProductThumb
            product={p}
            priority={priority}
            sizes={size === "sm" ? "(min-width: 1024px) 18vw, 45vw" : "(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw"}
            className="transition-transform duration-[1.2s] ease-(--ease-settle) group-hover:scale-[1.05]"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-80" />
        </div>
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {p.tags.slice(0, 2).map((t) => (
            <span key={t} className="chip bg-milk/90 py-1 text-[0.7rem] text-ink backdrop-blur">
              {t}
            </span>
          ))}
        </div>
        {p.subscribable && (
          <span className="chip absolute bottom-3 left-3 bg-night/75 py-1 text-[0.7rem] text-milk backdrop-blur">
            <RepeatIcon size={12} /> Subscribe
          </span>
        )}
        {out && (
          <span className="absolute inset-0 grid place-items-center bg-milk/55 backdrop-blur-[2px]">
            <span className="chip bg-ink text-milk">Out of stock · back tomorrow</span>
          </span>
        )}
      </Link>

      <div className="mt-4 flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/shop/${p.slug}`} className="min-w-0">
            <h3 className="h3 truncate">{p.name}</h3>
          </Link>
          <span className="mt-1 inline-flex flex-none items-center gap-1 text-[0.8rem] font-semibold text-ink-2">
            <StarIcon size={13} className="text-butter" /> {p.rating.toFixed(1)}
          </span>
        </div>
        {reason ? (
          <p className="mt-1.5 text-[0.85rem] font-medium leading-snug text-pasture">{reason}</p>
        ) : (
          size === "md" && <p className="mt-1.5 line-clamp-2 text-[0.92rem] leading-snug text-ink-2">{p.short}</p>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <p className="text-lg font-bold">
              {money(v.price)}
              {v.mrp && <span className="ml-2 text-sm font-medium text-ink-3 line-through">{money(v.mrp)}</span>}
            </p>
            <p className={cls("text-[0.78rem]", stock.tone === "low" ? "font-semibold text-clay" : "text-ink-3")}>
              {v.label}
              {stock.tone === "low" && ` · ${stock.label}`}
            </p>
          </div>
          <button
            type="button"
            disabled={out}
            onClick={() => {
              addToCart(p.slug, v.id);
              toast(`${p.name} added to cart`, v.label);
            }}
            aria-label={`Add ${p.name}, ${v.label}, to cart`}
            data-cursor="Add"
            className="grid h-11 w-11 flex-none place-items-center rounded-full bg-pasture text-milk transition-[transform,background-color] duration-300 hover:scale-105 hover:bg-pasture-700 disabled:bg-ink-3"
          >
            <PlusIcon size={20} />
          </button>
        </div>
      </div>
    </article>
  );
}
