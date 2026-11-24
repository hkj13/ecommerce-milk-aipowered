"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SignInPrompt } from "@/components/account/SignInPrompt";
import { ProductThumb } from "@/components/shop/ProductArt";
import { toast } from "@/components/ui/Toaster";
import { AiBadge, PageHead, Stepper } from "@/components/ui/bits";
import { CheckIcon } from "@/components/ui/icons";
import { householdEstimate, milkEstimate } from "@/lib/ai";
import { createSubscription, deliversOn } from "@/lib/actions";
import { addDays, cls, fmtDay, money, relDay, ymd } from "@/lib/format";
import { useCatalogue, useDB, useSession } from "@/lib/store";
import type { Frequency, Subscription } from "@/lib/types";

const FREQS: { id: Frequency; label: string; note: string }[] = [
  { id: "daily", label: "Daily", note: "Every morning" },
  { id: "alternate", label: "Alternate days", note: "Every other morning" },
  { id: "weekly", label: "Chosen days", note: "Pick the weekdays" },
  { id: "monthly", label: "Monthly", note: "Once a month" },
];
const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LITRES: Record<string, number> = { "500ml": 0.5, "1l": 1, "200ml": 0.2, "400g": 0.4, "1kg": 1 };

function Block({ n, title, children, aside }: { n: number; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="card p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-pasture text-sm font-bold text-milk">{n}</span>
          <span className="h3">{title}</span>
        </h2>
        {aside}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function previewOf(draft: Subscription | null) {
  if (!draft) return { next: [] as string[], month: 0 };
  const next: string[] = [];
  let month = 0;
  for (let i = 0; i < 60; i++) {
    const d = ymd(addDays(new Date(), i));
    if (deliversOn(draft, d)) {
      if (next.length < 6) next.push(d);
      if (i < 30) month++;
    }
  }
  return { next, month };
}

export function SubscribeView() {
  const params = useSearchParams();
  const router = useRouter();
  const db = useDB();
  const all = useCatalogue();
  const { user } = useSession();
  const options = all.filter((p) => p.subscribable && p.active);
  const [slug, setSlug] = useState(params.get("product") ?? "a2-desi-cow-milk");
  const p = options.find((x) => x.slug === slug) ?? options[0];
  // A litres hint (from the account page's estimate) sets the starting size and quantity.
  const hint = Number(params.get("litres")) || 0;
  const [variantPick, setVariant] = useState(params.get("variant") ?? (hint && !Number.isInteger(hint) ? "500ml" : "1l"));
  const [qty, setQty] = useState(hint ? (Number.isInteger(hint) ? hint : Math.round(hint / 0.5)) : 1);
  const variant = p?.variants.some((x) => x.id === variantPick) ? variantPick : (p?.variants[p.variants.length - 1].id ?? variantPick);
  const [freq, setFreq] = useState<Frequency>("daily");
  const [days, setDays] = useState<number[]>([1, 3, 5]);
  const [dom, setDom] = useState(1);
  const [start, setStart] = useState(ymd(addDays(new Date(), 1)));
  const [slot, setSlot] = useState<"morning" | "evening">("morning");
  const [adults, setAdults] = useState(2);
  const [kids, setKids] = useState(1);
  const [cups, setCups] = useState(4);

  const v = p?.variants.find((x) => x.id === variant) ?? p?.variants[0];

  const history = db && user ? milkEstimate(db.orders, user.id) : null;
  const household = householdEstimate(adults, kids, cups);

  const applyLitres = (litres: number) => {
    if (!p) return;
    const big = p.variants.find((x) => x.id === "1l");
    const small = p.variants.find((x) => x.id === "500ml");
    if (big && Number.isInteger(litres)) {
      setVariant(big.id);
      setQty(litres);
    } else if (small) {
      setVariant(small.id);
      setQty(Math.round(litres / 0.5));
    }
    toast("Estimate applied", `${litres} L per delivery`);
  };

  const draft: Subscription | null = p
    ? {
        id: "draft",
        userId: "",
        slug: p.slug,
        variant: v?.id ?? "",
        qty,
        frequency: freq,
        days: freq === "weekly" ? days : freq === "monthly" ? [dom] : [],
        slot,
        startDate: start,
        status: "active",
        skips: [],
        createdAt: "",
      }
    : null;

  const preview = previewOf(draft);

  const perDelivery = (v?.price ?? 0) * qty;
  const litresPer = (LITRES[v?.id ?? ""] ?? 0) * qty;

  const submit = () => {
    if (!user || !draft || !v) return;
    if (freq === "weekly" && days.length === 0) {
      toast("Pick at least one day", undefined, "warn");
      return;
    }
    createSubscription({ userId: user.id, slug: draft.slug, variant: v.id, qty, frequency: freq, days: draft.days, slot, startDate: start });
    toast("Subscription started", `First delivery ${relDay(preview.next[0] ?? start).toLowerCase()}`);
    router.push("/account?tab=subscriptions");
  };

  return (
    <>
      <PageHead
        label="Subscriptions"
        title="Set it once."
        em="Wake up to it daily."
        sub="Choose your milk, how much and how often. Pause, skip or change any day until 10 PM the night before. Billed once a month, no delivery fee."
      />
      <div className="wrap grid-12 gap-y-8 py-12 md:py-16">
        <div className="col-span-4 space-y-6 md:col-span-8 xl:col-span-7">
          <Block n={1} title="What should we bring?">
            <div className="grid gap-3 sm:grid-cols-2">
              {options.map((o) => (
                <label key={o.slug} className={cls("flex cursor-pointer items-center gap-4 rounded-2xl border p-3 transition-colors", slug === o.slug ? "border-pasture ring-1 ring-pasture" : "border-rule hover:border-ink-3")}>
                  <input type="radio" name="product" className="sr-only" checked={slug === o.slug} onChange={() => setSlug(o.slug)} />
                  <span className="relative h-16 w-16 flex-none overflow-hidden rounded-xl" style={{ background: o.tint }}>
                    <ProductThumb product={o} sizes="64px" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{o.name}</span>
                    <span className="text-sm text-ink-3">from {money(o.variants[0].price)}</span>
                  </span>
                  {slug === o.slug && <CheckIcon size={18} className="ml-auto flex-none text-pasture" />}
                </label>
              ))}
            </div>
          </Block>

          <Block n={2} title="How much?" aside={<AiBadge>Milk estimate · demo</AiBadge>}>
            <div className="flex flex-wrap items-center gap-3">
              {p?.variants.map((x) => (
                <button key={x.id} type="button" onClick={() => setVariant(x.id)} aria-pressed={variant === x.id} className={cls("chip border py-2.5", variant === x.id ? "border-pasture bg-pasture text-milk" : "border-rule hover:border-ink")}>
                  {x.label} · {money(x.price)}
                </button>
              ))}
              <Stepper value={qty} onChange={setQty} min={1} max={10} />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-butter/50 bg-butter/[0.08] p-4">
                <p className="text-sm font-semibold">From your order history</p>
                {history ? (
                  <>
                    <p className="mt-2 text-sm text-ink-2">
                      Last 30 days: {history.litres.toFixed(1)} L over {history.days} deliveries. Suggested:
                    </p>
                    <p className="mt-1 font-display text-3xl">{history.suggestion} L</p>
                    <button type="button" onClick={() => applyLitres(history.suggestion)} className="btn btn-ghost btn-sm mt-3">
                      Apply
                    </button>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-ink-2">{user ? "Not enough orders yet. Use the household estimate." : "Sign in and we'll suggest a quantity from your past orders."}</p>
                )}
              </div>
              <div className="rounded-2xl border border-rule p-4">
                <p className="text-sm font-semibold">Household estimate</p>
                <div className="mt-3 space-y-2 text-sm">
                  {(
                    [
                      ["Adults", adults, setAdults, 8],
                      ["Children", kids, setKids, 8],
                      ["Cups of tea / coffee a day", cups, setCups, 16],
                    ] as const
                  ).map(([l, val, set, max]) => (
                    <div key={l} className="flex items-center justify-between gap-3">
                      <span className="text-ink-2">{l}</span>
                      <Stepper size="sm" value={val} min={0} max={max} onChange={set} label={l} />
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="font-display text-3xl">{household} L</p>
                  <button type="button" onClick={() => applyLitres(household)} className="btn btn-ghost btn-sm">
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </Block>

          <Block n={3} title="How often?">
            <div className="grid gap-2 sm:grid-cols-4">
              {FREQS.map((f) => (
                <label key={f.id} className={cls("cursor-pointer rounded-2xl border px-4 py-3", freq === f.id ? "border-pasture bg-pasture/[0.06] ring-1 ring-pasture" : "border-rule")}>
                  <input type="radio" name="freq" className="sr-only" checked={freq === f.id} onChange={() => setFreq(f.id)} />
                  <span className="block font-semibold">{f.label}</span>
                  <span className="text-xs text-ink-3">{f.note}</span>
                </label>
              ))}
            </div>
            {freq === "weekly" && (
              <div className="mt-4 flex flex-wrap gap-2">
                {WEEK.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={days.includes(i)}
                    onClick={() => setDays((xs) => (xs.includes(i) ? xs.filter((x) => x !== i) : [...xs, i].sort()))}
                    className={cls("grid h-12 w-12 place-items-center rounded-full border text-sm font-semibold", days.includes(i) ? "border-pasture bg-pasture text-milk" : "border-rule")}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
            {freq === "monthly" && (
              <label className="mt-4 flex items-center gap-3 text-sm">
                Deliver on day
                <select className="field w-24" value={dom} onChange={(e) => setDom(+e.target.value)}>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                of each month
              </label>
            )}
          </Block>

          <Block n={4} title="Starting when?">
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-sm font-medium text-ink-2">First delivery</span>
                <input type="date" className="field" value={start} min={ymd(addDays(new Date(), 1))} onChange={(e) => setStart(e.target.value)} />
              </label>
              <div>
                <span className="mb-1.5 block text-sm font-medium text-ink-2">Time</span>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["morning", "5:30–7:30 AM"],
                      ["evening", "5–7 PM"],
                    ] as const
                  ).map(([id, label]) => (
                    <button key={id} type="button" aria-pressed={slot === id} onClick={() => setSlot(id)} className={cls("rounded-2xl border px-3 py-3 text-sm font-semibold", slot === id ? "border-pasture bg-pasture text-milk" : "border-rule")}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Block>
        </div>

        <aside className="col-span-4 md:col-span-8 xl:col-span-4 xl:col-start-9">
          <div className="card sticky top-[calc(var(--header-h)+1rem)] overflow-hidden">
            {p && (
              <div className="relative h-40" style={{ background: p.tint }}>
                <ProductThumb product={p} sizes="420px" />
              </div>
            )}
            <div className="p-6 md:p-7">
              <p className="h3">{p?.name}</p>
              <p className="mt-1 text-ink-2">
                {qty} × {v?.label} · {FREQS.find((f) => f.id === freq)?.label.toLowerCase()} · {slot}
              </p>
              <dl className="mt-5 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-2">Per delivery</dt>
                  <dd className="font-semibold tabular-nums">
                    {money(perDelivery)} {litresPer > 0 && <span className="font-normal text-ink-3">({litresPer} L)</span>}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-2">Deliveries in 30 days</dt>
                  <dd className="font-semibold tabular-nums">{preview.month}</dd>
                </div>
                <div className="flex justify-between border-t border-rule pt-3 text-lg">
                  <dt className="font-semibold">About a month</dt>
                  <dd className="font-bold tabular-nums">{money(perDelivery * preview.month)}</dd>
                </div>
              </dl>
              <p className="mono-label mt-5 text-ink-3">Next deliveries</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {preview.next.map((d) => (
                  <span key={d} className="chip border border-rule py-1 text-[0.72rem] text-ink-2">
                    {relDay(d) === fmtDay(d) ? fmtDay(d) : relDay(d)}
                  </span>
                ))}
              </div>
              {user ? (
                <button type="button" onClick={submit} className="btn btn-primary mt-6 w-full">
                  Start subscription
                </button>
              ) : (
                <div className="mt-6">
                  <SignInPrompt title="Sign in to start" next="/subscribe" />
                </div>
              )}
              <p className="mt-3 text-center text-xs text-ink-3">No lock-in. Billed monthly by UPI, card or cash.</p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
