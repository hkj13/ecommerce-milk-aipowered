"use client";

import { useMemo, useState } from "react";
import { Panel, TopBar } from "@/components/admin/Shell";
import { ProductThumb } from "@/components/shop/ProductArt";
import { toast } from "@/components/ui/Toaster";
import { AiBadge } from "@/components/ui/bits";
import { PlusIcon, TrashIcon } from "@/components/ui/icons";
import { CATEGORIES, categoryLabel, type CategoryId, type Product } from "@/data/products";
import { forecastDemand, procurementPlan } from "@/lib/ai";
import { writeDescription } from "@/lib/ai-plus";
import { SparkIcon } from "@/components/ui/icons";
import { addProduct, removeProduct, updateProduct } from "@/lib/actions";
import { addDays, cls, fmtDate, money } from "@/lib/format";
import { liveCatalogue, useDB } from "@/lib/store";

const weekAgo = () => Date.now() - 7 * 86400000;

const PHOTOS = ["p-a2-milk", "p-toned-milk", "p-buffalo-milk", "p-curd", "p-buttermilk", "p-paneer", "p-butter", "p-cream", "p-lassi", "p-milkshake", "p-fruit-yogurt", "p-cheese", "p-ice-cream"];

export function AdminCatalog() {
  const db = useDB()!;
  const all = liveCatalogue(db);
  const [adding, setAdding] = useState(false);
  return (
    <>
      <TopBar title="Products" sub={`${all.filter((p) => p.active).length} on the menu · changes show on the store immediately`}>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setAdding((a) => !a)}>
          <PlusIcon size={16} /> Add product
        </button>
      </TopBar>
      {adding && <AddProduct onDone={() => setAdding(false)} />}
      <Panel title="Catalogue">
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-left text-ink-3">
                <th className="px-2 py-2 font-medium">Product</th>
                <th className="px-2 py-2 font-medium">Prices</th>
                <th className="px-2 py-2 font-medium">Stock</th>
                <th className="px-2 py-2 font-medium">On menu</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {all.map((p) => (
                <tr key={p.slug} className={cls("border-t border-rule align-middle", !p.active && "opacity-50")}>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-3">
                      <span className="relative h-12 w-12 flex-none overflow-hidden rounded-xl" style={{ background: p.tint }}>
                        <ProductThumb product={p} sizes="48px" />
                      </span>
                      <span>
                        <span className="block font-semibold">{p.name}</span>
                        <span className="text-xs text-ink-3">{categoryLabel(p.category)}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex flex-wrap gap-2">
                      {p.variants.map((v) => (
                        <label key={v.id} className="flex items-center gap-1.5 rounded-xl border border-rule bg-white/60 px-2 py-1">
                          <span className="text-xs text-ink-3">{v.label.replace(" bottle", "")}</span>
                          <span className="text-xs">₹</span>
                          <input
                            type="number"
                            min={1}
                            defaultValue={v.price}
                            onBlur={(e) => {
                              const n = +e.target.value;
                              if (n > 0 && n !== v.price) {
                                updateProduct(p.slug, { prices: { [v.id]: n } });
                                toast("Price updated", `${p.name}, ${v.label}: ${money(n)}`);
                              }
                            }}
                            className="w-16 bg-transparent font-semibold tabular-nums outline-none"
                            aria-label={`${p.name} ${v.label} price`}
                          />
                        </label>
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <input
                      type="number"
                      min={0}
                      defaultValue={p.stock}
                      key={p.stock}
                      onBlur={(e) => {
                        const n = Math.max(0, +e.target.value);
                        if (n !== p.stock) {
                          updateProduct(p.slug, { stock: n });
                          toast("Stock updated", `${p.name}: ${n}`);
                        }
                      }}
                      className={cls("field w-24 py-1.5 tabular-nums", p.stock <= 15 && "border-dawn")}
                      aria-label={`${p.name} stock`}
                    />
                  </td>
                  <td className="px-2 py-3">
                    <input type="checkbox" checked={p.active} onChange={(e) => updateProduct(p.slug, { active: e.target.checked })} className="h-5 w-5 accent-[var(--color-pasture)]" aria-label={`${p.name} on menu`} />
                  </td>
                  <td className="px-2 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Remove ${p.name} from the menu?`)) {
                          removeProduct(p.slug);
                          toast("Product removed", p.name, "info");
                        }
                      }}
                      className="grid h-9 w-9 place-items-center rounded-full text-ink-3 hover:bg-alert/10 hover:text-alert"
                      aria-label={`Remove ${p.name}`}
                    >
                      <TrashIcon size={16} />
                    </button>
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

function AddProduct({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ name: "", short: "", description: "", category: "milk" as CategoryId, label: "500 ml bottle", price: 50, stock: 50, photo: PHOTOS[0], subscribable: false });
  return (
    <Panel title="New product" className="mb-4">
      <form
        className="grid gap-4 md:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!f.name.trim()) return;
          const slug = `${f.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36).slice(-3)}`;
          const p: Product = {
            slug,
            name: f.name.trim(),
            short: f.short.trim() || "New on the menu.",
            description: f.description.trim() || f.short.trim() || "Freshly added by the dairy team.",
            category: f.category,
            photo: `/photos/${f.photo}.jpg`,
            variants: [{ id: "std", label: f.label, price: f.price }],
            subscribable: f.subscribable,
            tags: ["New"],
            source: "Ksheera dairy kitchen",
            shelfLife: "3 days refrigerated",
            storage: "Keep at 4°C.",
            nutrition: [],
            nutritionBasis: "per 100 g",
            stock: f.stock,
            expiresInDays: 3,
            rating: 5,
            tint: "#efe8d8",
          };
          addProduct(p);
          toast("Product added", `${p.name} is live on the shop`);
          onDone();
        }}
      >
        <label>
          <span className="mb-1.5 block text-sm font-medium text-ink-2">Name</span>
          <input className="field" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Rose Badam Milk" />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-ink-2">Category</span>
          <select className="field" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as CategoryId })}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-ink-2">Size label</span>
          <input className="field" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
        </label>
        <label className="md:col-span-2">
          <span className="mb-1.5 flex items-center justify-between gap-2 text-sm font-medium text-ink-2">
            One-line description
            <button
              type="button"
              onClick={() => {
                const d = writeDescription(f.name, f.category);
                setF({ ...f, short: d.short, description: d.description });
                toast("Description drafted", "Review it before saving (AI demo)");
              }}
              className="chip border border-butter/50 bg-butter/10 py-1 text-[0.72rem] text-butter-ink"
            >
              <SparkIcon size={12} /> Write with AI
            </button>
          </span>
          <input className="field" value={f.short} onChange={(e) => setF({ ...f, short: e.target.value })} />
          {f.description && <textarea className="field mt-2 min-h-20 text-sm" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} aria-label="Full description" />}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="mb-1.5 block text-sm font-medium text-ink-2">Price ₹</span>
            <input className="field" type="number" min={1} value={f.price} onChange={(e) => setF({ ...f, price: +e.target.value })} />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-ink-2">Stock</span>
            <input className="field" type="number" min={0} value={f.stock} onChange={(e) => setF({ ...f, stock: +e.target.value })} />
          </label>
        </div>
        <fieldset className="md:col-span-3">
          <legend className="mb-2 text-sm font-medium text-ink-2">Photo</legend>
          <div className="flex flex-wrap gap-2">
            {PHOTOS.map((ph) => (
              <button key={ph} type="button" onClick={() => setF({ ...f, photo: ph })} aria-pressed={f.photo === ph} className={cls("relative h-14 w-14 overflow-hidden rounded-xl", f.photo === ph ? "ring-2 ring-pasture ring-offset-2" : "opacity-70")}>
                <ProductThumb product={{ photo: `/photos/${ph}.jpg`, name: ph, tint: "#eee" }} sizes="56px" />
              </button>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.subscribable} onChange={(e) => setF({ ...f, subscribable: e.target.checked })} className="h-4 w-4 accent-[var(--color-pasture)]" /> Available on subscription
        </label>
        <div className="flex gap-2 md:col-span-2 md:justify-end">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-sm">
            Save product
          </button>
        </div>
      </form>
    </Panel>
  );
}

export function AdminInventory() {
  const db = useDB()!;
  const all = liveCatalogue(db).filter((p) => p.active);
  const fc = useMemo(() => forecastDemand(7), []);
  const plan = procurementPlan(fc.forecast[0].litres);
  const sales = useMemo(() => {
    const since = weekAgo();
    const m = new Map<string, number>();
    db.orders
      .filter((o) => o.status !== "cancelled" && new Date(o.placedAt).getTime() >= since)
      .forEach((o) => o.lines.forEach((l) => m.set(l.slug, (m.get(l.slug) ?? 0) + l.qty)));
    return m;
  }, [db]);

  const rows = all
    .map((p) => {
      const perDay = (sales.get(p.slug) ?? 0) / 7;
      const cover = perDay ? p.stock / perDay : Infinity;
      const flags: { tone: "warn" | "alert" | "info"; text: string }[] = [];
      if (p.stock <= 0) flags.push({ tone: "alert", text: "Out of stock" });
      else if (p.stock <= 15) flags.push({ tone: "warn", text: "Low stock" });
      if (p.expiresInDays <= 2) flags.push({ tone: "warn", text: "Expires soon: sell first" });
      if (cover < 2 && p.stock > 0) flags.push({ tone: "info", text: `About ${cover.toFixed(1)} days of cover` });
      const suggest = Math.max(0, Math.ceil(perDay * 3 * 1.1) - p.stock);
      return { p, perDay, cover, flags, suggest };
    })
    .sort((a, b) => b.flags.length - a.flags.length || a.cover - b.cover);

  return (
    <>
      <TopBar title="Inventory" sub="Stock levels, batch expiry and AI reorder suggestions">
        <AiBadge>Reorder suggestions · demo</AiBadge>
      </TopBar>
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Stock and expiry" className="xl:col-span-2">
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-ink-3">
                  <th className="px-2 py-2 font-medium">Product</th>
                  <th className="px-2 py-2 text-right font-medium">Stock</th>
                  <th className="px-2 py-2 text-right font-medium">Sold / day</th>
                  <th className="px-2 py-2 font-medium">Best before</th>
                  <th className="px-2 py-2 font-medium">Flags</th>
                  <th className="px-2 py-2 text-right font-medium">Suggested reorder</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ p, perDay, flags, suggest }) => (
                  <tr key={p.slug} className="border-t border-rule">
                    <td className="px-2 py-2.5 font-semibold">{p.name}</td>
                    <td className={cls("px-2 py-2.5 text-right font-semibold tabular-nums", p.stock <= 15 && "text-clay")}>{p.stock}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-ink-2">{perDay.toFixed(1)}</td>
                    <td className="px-2 py-2.5 text-ink-2">{fmtDate(addDays(new Date(), p.expiresInDays).toISOString())}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {flags.map((f) => (
                          <span key={f.text} className={cls("chip py-0.5 text-[0.68rem]", f.tone === "alert" ? "bg-alert/10 text-alert" : f.tone === "warn" ? "bg-dawn/25 text-clay" : "bg-ink/5 text-ink-2")}>
                            {f.text}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      {suggest > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            updateProduct(p.slug, { stock: p.stock + suggest });
                            toast("Restocked", `${p.name} +${suggest}`);
                          }}
                          className="chip border border-pasture/30 py-1 text-[0.75rem] text-pasture hover:bg-pasture hover:text-milk"
                        >
                          +{suggest} · restock
                        </button>
                      ) : (
                        <span className="text-xs text-ink-3">Enough for 3 days</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-ink-3">Reorder = 3 days of last week&apos;s average sales plus a 10% buffer, minus stock on hand. A person approves every purchase.</p>
        </Panel>
        <Panel title={`Milk to collect for tomorrow: ${fc.forecast[0].litres} L`}>
          <ul className="space-y-3 text-sm">
            {plan.map((m) => (
              <li key={m.slug} className="flex items-baseline justify-between gap-3 border-b border-rule pb-3 last:border-0">
                <span>
                  <span className="font-semibold">{m.name}</span>
                  {m.note && <span className="block text-xs text-ink-3">{m.note}</span>}
                </span>
                <span className="text-right tabular-nums">
                  <span className="font-semibold">{m.withBuffer} L</span>
                  <span className="block text-xs text-ink-3">{m.litres} L + 5% buffer</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-3">From the demand forecast (AI insights tab), split by last month&apos;s product mix.</p>
        </Panel>
      </div>
    </>
  );
}
