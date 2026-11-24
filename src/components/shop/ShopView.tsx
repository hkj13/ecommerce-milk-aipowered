"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/shop/ProductCard";
import { useSpeech } from "@/components/shop/useSpeech";
import { AiBadge, Empty, PageHead } from "@/components/ui/bits";
import { CloseIcon, MicIcon, SearchIcon } from "@/components/ui/icons";
import { CATEGORIES, type CategoryId } from "@/data/products";
import { recommend } from "@/lib/ai";
import { cls } from "@/lib/format";
import { useCatalogue, useDB } from "@/lib/store";

/** English, Tamil and Hindi words people actually type or say. */
const SYNONYMS: Record<string, string[]> = {
  milk: ["paal", "doodh", "dudh", "milk"],
  curd: ["thayir", "tayir", "dahi", "yogurt", "yoghurt", "curd"],
  buttermilk: ["mor", "moru", "chaas", "chhaas", "buttermilk"],
  butter: ["vennai", "makhan", "butter"],
  ghee: ["nei", "ney", "ghee", "ghi"],
  paneer: ["paneer", "cottage cheese"],
  cream: ["malai", "cream"],
  "ice cream": ["ice cream", "icecream", "kulfi"],
  lassi: ["lassi"],
};

function expand(q: string) {
  const t = q.toLowerCase().trim();
  const extra = Object.entries(SYNONYMS)
    .filter(([, words]) => words.some((w) => t.includes(w)))
    .map(([k]) => k);
  return [t, ...extra];
}

type Sort = "popular" | "price-asc" | "price-desc" | "rating";

export function ShopView() {
  const params = useSearchParams();
  const router = useRouter();
  const all = useCatalogue();
  const db = useDB();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [heard, setHeard] = useState("");
  const cat = (params.get("c") as CategoryId | null) ?? null;
  const [maxPrice, setMaxPrice] = useState(900);
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState<Sort>("popular");
  const speech = useSpeech((text) => {
    setHeard(text);
    setQ(text);
  });

  const setCat = (c: CategoryId | null) => {
    const sp = new URLSearchParams(params.toString());
    if (c) sp.set("c", c);
    else sp.delete("c");
    router.replace(`/shop${sp.toString() ? `?${sp}` : ""}`, { scroll: false });
  };

  const list = useMemo(() => {
    const terms = q ? expand(q) : [];
    let xs = all.filter((p) => p.active);
    if (cat) xs = xs.filter((p) => p.category === cat);
    if (terms.length) {
      xs = xs.filter((p) => {
        const hay = `${p.name} ${p.short} ${p.tags.join(" ")} ${p.category} ${p.slug.replace(/-/g, " ")}`.toLowerCase();
        return terms.some((t) => t.split(" ").every((w) => hay.includes(w)));
      });
    }
    xs = xs.filter((p) => p.variants[0].price <= maxPrice);
    if (inStock) xs = xs.filter((p) => p.stock > 0);
    const by: Record<Sort, (a: (typeof xs)[number], b: (typeof xs)[number]) => number> = {
      popular: (a, b) => b.rating * 10 + (b.tags.includes("Bestseller") ? 5 : 0) - (a.rating * 10 + (a.tags.includes("Bestseller") ? 5 : 0)),
      "price-asc": (a, b) => a.variants[0].price - b.variants[0].price,
      "price-desc": (a, b) => b.variants[0].price - a.variants[0].price,
      rating: (a, b) => b.rating - a.rating,
    };
    return [...xs].sort(by[sort]);
  }, [all, cat, q, maxPrice, inStock, sort]);

  const user = db?.session ? db.users.find((u) => u.id === db.session!.userId) : null;
  const recs = useMemo(() => {
    if (!db || !user || user.role !== "customer") return [];
    return recommend({
      history: db.orders.filter((o) => o.userId === user.id),
      viewed: db.viewed,
      cart: db.cart.map((c) => c.slug),
      available: (s) => (all.find((p) => p.slug === s)?.stock ?? 0) > 0,
      n: 4,
    });
  }, [db, user, all]);

  return (
    <>
      <PageHead
        label="The shop"
        title="Fresh from"
        em="this morning."
        sub="Milk, curd, paneer, butter and ghee from one farm. Order by 10 PM and it's at your door by 7:30 AM tomorrow."
      >
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="mt-10 flex max-w-2xl items-center gap-2 rounded-full border border-rule bg-milk p-1.5 pl-5 shadow-[0_20px_50px_-30px_rgba(28,26,22,0.4)]"
        >
          <SearchIcon className="flex-none text-ink-3" />
          <label htmlFor="shop-q" className="sr-only">
            Search products
          </label>
          <input
            id="shop-q"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setHeard("");
            }}
            placeholder={speech.listening ? "Listening… say “paneer” or “thayir”" : "Search milk, paneer, ghee… or thayir, nei, mor"}
            className="min-w-0 flex-1 bg-transparent py-2.5 outline-none placeholder:text-ink-3"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="grid h-10 w-10 place-items-center rounded-full hover:bg-cream">
              <CloseIcon size={17} />
            </button>
          )}
          <button
            type="button"
            onClick={speech.supported ? (speech.listening ? speech.stop : speech.start) : undefined}
            disabled={!speech.supported}
            title={speech.supported ? "Search by voice" : "Voice search needs Chrome, Edge or Safari"}
            aria-label="Search by voice"
            className={cls(
              "flex h-11 flex-none items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
              speech.listening ? "bg-clay text-milk" : "bg-pasture text-milk hover:bg-pasture-700",
              !speech.supported && "opacity-50",
            )}
          >
            <MicIcon size={17} />
            <span className="hidden sm:inline">{speech.listening ? "Listening" : "Voice"}</span>
          </button>
        </form>
        {heard && (
          <p className="mt-3 text-sm text-ink-2">
            Heard: <span className="font-semibold">“{heard}”</span> · AI voice search (browser speech recognition)
          </p>
        )}
      </PageHead>

      {recs.length > 0 && !q && !cat && (
        <section aria-labelledby="recs" className="wrap pt-14">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="recs" className="display-m">
              Recommended for you, <em className="display-em text-pasture">{user!.name.split(" ")[0]}</em>
            </h2>
            <AiBadge>Based on your orders · demo</AiBadge>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-[var(--gutter)] lg:grid-cols-4">
            {recs.map((r) => {
              const p = all.find((x) => x.slug === r.slug);
              return p ? <ProductCard key={r.slug} product={p} reason={r.reason} size="sm" /> : null;
            })}
          </div>
        </section>
      )}

      {/* filters */}
      <div className="relative z-10 mt-10 border-y border-rule bg-milk">
        <div className="wrap flex flex-wrap items-center gap-x-6 gap-y-3 py-3">
          <div className="no-scrollbar -mx-1 flex flex-1 gap-2 overflow-x-auto px-1">
            {[{ id: null, label: "All" }, ...CATEGORIES].map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => setCat(c.id as CategoryId | null)}
                aria-pressed={cat === c.id}
                className={cls("chip flex-none border py-2", cat === c.id ? "border-pasture bg-pasture text-milk" : "border-rule text-ink-2 hover:border-ink")}
              >
                {c.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-3 text-sm text-ink-2">
            Up to <span className="w-12 font-semibold text-ink tabular-nums">₹{maxPrice}</span>
            <input type="range" min={20} max={900} step={10} value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)} className="w-28 accent-[var(--color-pasture)]" aria-label="Maximum price" />
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="h-4 w-4 accent-[var(--color-pasture)]" />
            In stock
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-2">
            Sort
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-full border border-rule bg-transparent px-3 py-1.5 text-ink">
              <option value="popular">Most popular</option>
              <option value="rating">Top rated</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </label>
        </div>
      </div>

      <section className="wrap py-12 md:py-16" aria-live="polite">
        <p className="mb-8 text-sm text-ink-3">
          {list.length} product{list.length === 1 ? "" : "s"}
          {cat && ` in ${CATEGORIES.find((c) => c.id === cat)?.label}`}
          {q && ` matching “${q}”`}
        </p>
        {list.length ? (
          <div className="grid grid-cols-2 gap-x-[var(--gutter)] gap-y-12 md:grid-cols-3 xl:grid-cols-4">
            {list.map((p, i) => (
              <ProductCard key={p.slug} product={p} priority={i < 4} />
            ))}
          </div>
        ) : (
          <Empty title="Nothing matches that yet" body="Try another word: milk, curd, paneer, ghee. Tamil works too: paal, thayir, nei, mor." />
        )}
      </section>
    </>
  );
}
