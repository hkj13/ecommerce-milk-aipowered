"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProductAsk } from "@/components/ai/ProductAsk";
import { ProductCard, stockState } from "@/components/shop/ProductCard";
import { ProductThumb } from "@/components/shop/ProductArt";
import { toast } from "@/components/ui/Toaster";
import { AiBadge, Empty, Stepper } from "@/components/ui/bits";
import { CalendarIcon, CheckIcon, ClockIcon, LeafIcon, RepeatIcon, StarIcon, ThermoIcon, TruckIcon } from "@/components/ui/icons";
import { categoryLabel, productBySlug } from "@/data/products";
import { PAIRS, sentiment, summariseFeedback } from "@/lib/ai";
import { substituteFor } from "@/lib/ai-plus";
import { addReview, addToCart, markViewed } from "@/lib/actions";
import { addDays, cls, fmtDate, fmtDay, money } from "@/lib/format";
import { useCatalogue, useDB, useSession } from "@/lib/store";

export function ProductView({ slug }: { slug: string }) {
  const all = useCatalogue();
  const db = useDB();
  const { user } = useSession();
  const live = all.find((p) => p.slug === slug);
  const p = live ?? (productBySlug(slug) ? { ...productBySlug(slug)!, active: true } : undefined);
  const [variant, setVariant] = useState(p?.variants[p.variants.length > 1 ? 1 : 0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"about" | "nutrition" | "care">("about");

  useEffect(() => {
    if (db && p) markViewed(p.slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, !!db]);

  const reviews = useMemo(() => (db?.reviews ?? []).filter((r) => r.slug === slug), [db, slug]);
  const summary = useMemo(() => summariseFeedback(reviews), [reviews]);

  if (!p) {
    return (
      <div className="wrap pb-24 pt-[calc(var(--header-h)+4rem)]">
        {db ? <Empty title="We couldn't find that product" body="It may have been removed from the menu." href="/shop" cta="Back to the shop" /> : <div className="h-[60vh]" />}
      </div>
    );
  }

  const v = p.variants.find((x) => x.id === variant) ?? p.variants[0];
  const stock = stockState(p);
  const out = stock.tone === "out";
  const pairs = (PAIRS[p.slug] ?? []).map((x) => ({ ...x, p: all.find((y) => y.slug === x.slug) })).filter((x) => x.p && x.p.active);
  const bestBefore = fmtDate(addDays(new Date(), 1 + Math.min(p.expiresInDays, 400)).toISOString());

  return (
    <div className="pb-24 pt-[calc(var(--header-h)+1.5rem)]">
      <div className="wrap">
        <nav aria-label="Breadcrumb" className="mono-label flex flex-wrap gap-2 py-4 text-ink-3">
          <Link href="/shop" className="link-draw">
            Shop
          </Link>
          <span>/</span>
          <Link href={`/shop?c=${p.category}`} className="link-draw">
            {categoryLabel(p.category)}
          </Link>
          <span>/</span>
          <span className="text-ink">{p.name}</span>
        </nav>

        <div className="grid-12 mt-4 gap-y-10">
          {/* picture */}
          <div className="col-span-4 md:col-span-4 xl:col-span-6">
            <div className="sticky top-[calc(var(--header-h)+1.5rem)]">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[28px]" style={{ background: p.tint }}>
                <ProductThumb product={p} priority sizes="(min-width: 1280px) 46vw, (min-width: 768px) 48vw, 100vw" />
                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <span key={t} className="chip bg-milk/90 text-ink backdrop-blur">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* details */}
          <div className="col-span-4 md:col-span-4 xl:col-span-5 xl:col-start-8">
            <p className="mono-label text-butter-ink">{categoryLabel(p.category)}</p>
            <h1 className="display-l mt-4">{p.name}</h1>
            <p className="body-l mt-4 text-ink-2">{p.short}</p>
            <a href="#reviews" className="mt-4 inline-flex items-center gap-2 text-sm text-ink-2">
              <span className="flex text-butter">
                {Array.from({ length: 5 }, (_, i) => (
                  <StarIcon key={i} size={15} filled={i < Math.round(p.rating)} />
                ))}
              </span>
              <span className="font-semibold text-ink">{p.rating.toFixed(1)}</span>
              <span className="link-under">{reviews.length} reviews</span>
            </a>

            <fieldset className="mt-8">
              <legend className="mono-label mb-3 text-ink-3">Size</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {p.variants.map((x) => (
                  <label
                    key={x.id}
                    className={cls(
                      "flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 transition-colors",
                      variant === x.id ? "border-pasture bg-pasture/[0.06] ring-1 ring-pasture" : "border-rule hover:border-ink-3",
                    )}
                  >
                    <input type="radio" name="variant" value={x.id} checked={variant === x.id} onChange={() => setVariant(x.id)} className="sr-only" />
                    <span className="font-semibold">{x.label}</span>
                    <span className="text-right">
                      <span className="font-bold">{money(x.price)}</span>
                      {x.mrp && <span className="ml-1.5 text-xs text-ink-3 line-through">{money(x.mrp)}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Stepper value={qty} onChange={setQty} max={Math.max(1, Math.min(20, p.stock))} />
              <button
                type="button"
                disabled={out}
                onClick={() => {
                  addToCart(p.slug, v.id, qty);
                  toast(`${qty} × ${p.name} added`, v.label);
                }}
                className="btn btn-primary flex-1 sm:flex-none"
                data-cursor="Add"
              >
                {out ? "Out of stock" : `Add to cart · ${money(v.price * qty)}`}
              </button>
              {p.subscribable && (
                <Link href={`/subscribe?product=${p.slug}&variant=${v.id}`} className="btn btn-ghost">
                  <RepeatIcon size={17} /> Subscribe
                </Link>
              )}
            </div>

            {out && substituteFor(p.slug, all) && (
              <Link href={`/shop/${substituteFor(p.slug, all)!.slug}`} className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-butter/50 bg-butter/10 p-4 text-sm">
                <span>
                  <span className="block font-semibold text-butter-ink">AI suggests a substitute</span>
                  Out today. {substituteFor(p.slug, all)!.name} is in stock and customers often choose it instead.
                </span>
                <span className="font-semibold text-pasture">View →</span>
              </Link>
            )}

            <ul className="mt-8 grid gap-3 rounded-[22px] bg-cream p-5 text-[0.92rem] sm:grid-cols-2">
              <li className="flex gap-3">
                <TruckIcon className="flex-none text-pasture" />
                <span>
                  <span className="block font-semibold">Tomorrow by 7:30 AM</span>
                  <span className="text-ink-2">Order by 10 PM tonight</span>
                </span>
              </li>
              <li className="flex gap-3">
                <ClockIcon className="flex-none text-pasture" />
                <span>
                  <span className="block font-semibold">{stock.tone === "ok" ? `${p.stock} in today's batch` : stock.label}</span>
                  <span className="text-ink-2">Best before {bestBefore}</span>
                </span>
              </li>
              <li className="flex gap-3">
                <ThermoIcon className="flex-none text-pasture" />
                <span>
                  <span className="block font-semibold">Cold chain</span>
                  <span className="text-ink-2">{p.storage}</span>
                </span>
              </li>
              <li className="flex gap-3">
                <LeafIcon className="flex-none text-pasture" />
                <span>
                  <span className="block font-semibold">From</span>
                  <span className="text-ink-2">{p.source}</span>
                </span>
              </li>
            </ul>

            {/* details tabs */}
            <div className="mt-10">
              <div role="tablist" className="flex gap-6 border-b border-rule">
                {(
                  [
                    ["about", "About"],
                    ["nutrition", "Nutrition"],
                    ["care", "Storage"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={tab === id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={cls("-mb-px border-b-2 pb-3 text-sm font-semibold transition-colors", tab === id ? "border-pasture text-ink" : "border-transparent text-ink-3 hover:text-ink")}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="pt-6 text-ink-2" role="tabpanel">
                {tab === "about" && <p className="leading-relaxed">{p.description}</p>}
                {tab === "nutrition" && (
                  <table className="w-full text-sm">
                    <caption className="mono-label mb-3 text-left text-ink-3">Typical values {p.nutritionBasis}</caption>
                    <tbody>
                      {p.nutrition.map((n) => (
                        <tr key={n.label} className="border-b border-rule last:border-0">
                          <th className="py-2.5 text-left font-medium text-ink-2">{n.label}</th>
                          <td className="py-2.5 text-right font-semibold tabular-nums text-ink">{n.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {tab === "care" && (
                  <ul className="space-y-2">
                    <li>
                      <span className="font-semibold text-ink">Shelf life:</span> {p.shelfLife}
                    </li>
                    <li>
                      <span className="font-semibold text-ink">Storage:</span> {p.storage}
                    </li>
                    <li>
                      <span className="font-semibold text-ink">Packaging:</span> returnable glass or clay. Rinse and leave it out with
                      your next delivery.
                    </li>
                  </ul>
                )}
              </div>
            </div>
            <ProductAsk product={p} />
          </div>
        </div>

        {/* pairs */}
        {pairs.length > 0 && (
          <section aria-labelledby="pairs" className="mt-24">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 id="pairs" className="display-m">
                Pairs well <em className="display-em text-pasture">with</em>
              </h2>
              <AiBadge>Frequently bought together · demo</AiBadge>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-[var(--gutter)] lg:grid-cols-4">
              {pairs.slice(0, 4).map((x) => (
                <ProductCard key={x.slug} product={x.p!} reason={x.why} size="sm" />
              ))}
            </div>
          </section>
        )}

        {/* reviews */}
        <section id="reviews" aria-labelledby="reviews-title" className="mt-24 scroll-mt-28">
          <div className="grid-12 gap-y-10">
            <div className="col-span-4 md:col-span-8 xl:col-span-4">
              <h2 id="reviews-title" className="display-m">
                Reviews
              </h2>
              <div className="card mt-6 p-6">
                <AiBadge>Sentiment summary · demo</AiBadge>
                {summary.total ? (
                  <>
                    <p className="mt-4 font-display text-4xl">{Math.round(summary.positiveShare * 100)}% positive</p>
                    <div className="mt-4 flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full">
                      <div className="bg-ok" style={{ width: `${(summary.counts.positive / summary.total) * 100}%` }} />
                      <div className="bg-ink-3/50" style={{ width: `${(summary.counts.neutral / summary.total) * 100}%` }} />
                      <div className="bg-alert" style={{ width: `${(summary.counts.negative / summary.total) * 100}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-ink-3">
                      {summary.counts.positive} positive · {summary.counts.neutral} neutral · {summary.counts.negative} negative
                    </p>
                    {summary.praise.length > 0 && (
                      <p className="mt-4 text-sm text-ink-2">
                        People mention: {summary.praise.map(([w]) => `“${w}”`).join(", ")}
                      </p>
                    )}
                    {summary.issues.length > 0 && (
                      <p className="mt-2 text-sm text-ink-2">Issues raised: {summary.issues.map((i) => i.label.toLowerCase()).join(", ")}</p>
                    )}
                  </>
                ) : (
                  <p className="mt-4 text-ink-2">No reviews yet.</p>
                )}
              </div>
              <ReviewForm key={user?.id ?? "guest"} slug={p.slug} defaultName={user?.name ?? ""} userId={user?.id} />
            </div>
            <ul className="col-span-4 space-y-4 md:col-span-8 xl:col-span-7 xl:col-start-6">
              {reviews.map((r) => {
                const s = sentiment(r.text, r.rating);
                return (
                  <li key={r.id} className="card p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex text-butter" aria-label={`${r.rating} out of 5`}>
                          {Array.from({ length: 5 }, (_, i) => (
                            <StarIcon key={i} size={14} filled={i < r.rating} />
                          ))}
                        </span>
                        <span className="text-sm font-semibold">{r.name}</span>
                        <span className="text-xs text-ink-3">{fmtDay(r.at)}</span>
                      </div>
                      <SentimentChip label={s.label} />
                    </div>
                    <p className="mt-3 leading-relaxed text-ink-2">{r.text}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

export function SentimentChip({ label }: { label: "positive" | "neutral" | "negative" }) {
  return (
    <span className={cls("chip py-1 text-[0.7rem]", label === "positive" ? "bg-ok/10 text-ok" : label === "negative" ? "bg-alert/10 text-alert" : "bg-ink/5 text-ink-2")}>
      AI: {label}
    </span>
  );
}

function ReviewForm({ slug, defaultName, userId }: { slug: string; defaultName: string; userId?: string }) {
  const [name, setName] = useState(defaultName);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  const live = text.trim().length > 6 ? sentiment(text, rating) : null;
  if (done)
    return (
      <p className="mt-6 flex items-center gap-2 rounded-2xl bg-ok/10 p-4 text-sm font-semibold text-ok">
        <CheckIcon size={16} /> Thank you. Your review is live.
      </p>
    );
  return (
    <form
      className="card mt-6 space-y-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        addReview(slug, name.trim() || "Guest", rating, text.trim(), userId);
        setDone(true);
        toast("Review posted", live ? `Classified as ${live.label}` : undefined);
      }}
    >
      <p className="font-semibold">Write a review</p>
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} stars`} onClick={() => setRating(n)} className="text-butter">
            <StarIcon size={24} filled={n <= rating} />
          </button>
        ))}
      </div>
      <input className="field" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Your name" />
      <textarea className="field min-h-28" placeholder="How was it?" value={text} onChange={(e) => setText(e.target.value)} aria-label="Your review" />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-ink-3" aria-live="polite">
          {live ? (
            <>
              Live sentiment: <SentimentChip label={live.label} />
            </>
          ) : (
            "Sentiment is classified as you type (demo)."
          )}
        </p>
        <button type="submit" className="btn btn-primary btn-sm">
          Post
        </button>
      </div>
      <p className="flex items-center gap-1.5 text-[0.72rem] text-ink-3">
        <CalendarIcon size={13} /> Reviews from verified orders get a badge in the full system.
      </p>
    </form>
  );
}
