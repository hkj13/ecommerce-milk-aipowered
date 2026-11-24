"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Sparkline } from "@/components/charts/Charts";
import { openChat } from "@/components/chat/ChatWidget";
import { UsualBasket } from "@/components/ai/UsualBasket";
import { VoiceOrderButton } from "@/components/ai/VoiceOrder";
import { ProductCard } from "@/components/shop/ProductCard";
import { ArrowLeft, ArrowRight, CheckIcon, MinusIcon, PlusIcon, SparkIcon, StarIcon } from "@/components/ui/icons";
import { site } from "@/config/site";
import { forecastDemand, householdEstimate, optimiseRoute, recommend, routeLength, sentiment, summariseFeedback } from "@/lib/ai";
import { addDays, cls } from "@/lib/format";
import { useCatalogue, useDB } from "@/lib/store";

export function SectionLabel({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p className={cls("mono-label flex items-center gap-3", dark ? "text-butter" : "text-butter-ink")}>
      <span aria-hidden className="h-px w-8 bg-current" />
      {children}
    </p>
  );
}

/* ------------------------------------------------------------ the menu */

export function MenuSection() {
  const all = useCatalogue();
  const featured = all.filter((p) => p.active);
  const track = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  return (
    <section id="menu" aria-labelledby="menu-title" className="relative bg-milk py-24 md:py-32">
      <div className="wrap flex flex-wrap items-end justify-between gap-8">
        <div>
          <SectionLabel>Today&apos;s churn</SectionLabel>
          <h2 id="menu-title" data-reveal className="display-xl mt-6 max-w-[14ch]">
            Everything we made <em className="display-em text-pasture">this morning.</em>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <p className="mr-2 hidden max-w-[30ch] text-ink-2 md:block">
            Fourteen things from one farm. All of it in glass or clay, all of it delivered by 7:30 AM.
          </p>
          <button type="button" onClick={() => scroll(-1)} aria-label="Scroll products left" className="grid h-12 w-12 place-items-center rounded-full border border-rule hover:border-ink">
            <ArrowLeft />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="Scroll products right" className="grid h-12 w-12 place-items-center rounded-full border border-rule hover:border-ink">
            <ArrowRight />
          </button>
        </div>
      </div>
      <div
        ref={track}
        data-lenis-prevent-wheel
        className="no-scrollbar mt-14 flex snap-x snap-mandatory gap-[var(--gutter)] overflow-x-auto scroll-px-[var(--margin)] px-[var(--margin)] pb-4"
      >
        {featured.map((p, i) => (
          <div key={p.slug} className="w-[72vw] flex-none snap-start sm:w-[42vw] md:w-[31vw] lg:w-[23vw] 2xl:w-[19vw]">
            <ProductCard product={p} priority={i < 2} />
          </div>
        ))}
      </div>
      <div className="wrap mt-10">
        <Link href="/shop" className="btn btn-primary" data-cursor="Shop">
          Browse the full shop <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------- for you */

export function ForYou() {
  const db = useDB();
  const all = useCatalogue();
  const user = db?.session ? db.users.find((u) => u.id === db.session!.userId) : null;
  const recs = useMemo(() => {
    if (!db || !user || user.role !== "customer") return [];
    const history = db.orders.filter((o) => o.userId === user.id);
    return recommend({
      history,
      viewed: db.viewed,
      available: (slug) => (all.find((p) => p.slug === slug)?.stock ?? 0) > 0,
      n: 4,
    });
  }, [db, user, all]);
  if (!user || recs.length === 0) return null;
  return (
    <section aria-labelledby="foryou-title" className="bg-milk pt-24 md:pt-32">
      <div className="wrap">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <SectionLabel>Picked for you</SectionLabel>
            <h2 id="foryou-title" className="display-l mt-5">
              Good morning, <em className="display-em text-pasture">{user.name.split(" ")[0]}.</em>
            </h2>
          </div>
          <p className="inline-flex items-center gap-2 rounded-full border border-butter/50 bg-butter/10 px-3.5 py-1.5 text-[0.78rem] font-semibold text-butter-ink">
            <SparkIcon size={14} /> Recommendations from your order history · demo
          </p>
        </div>
        <div className="mt-10 grid gap-[var(--gutter)] lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <UsualBasket userId={user.id} className="self-start" />
          <div className="grid grid-cols-2 gap-[var(--gutter)] lg:grid-cols-3">
            {recs.slice(0, 3).map((r) => {
              const p = all.find((x) => x.slug === r.slug);
              return p ? <ProductCard key={r.slug} product={p} reason={r.reason} size="sm" /> : null;
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------- subscriptions */

const PLANS = [
  { id: "daily", label: "Daily", note: "Every morning" },
  { id: "alternate", label: "Alternate days", note: "Every other morning" },
  { id: "weekly", label: "Chosen days", note: "Mon, Wed, Fri, Sun" },
  { id: "monthly", label: "Monthly", note: "1st of each month" },
] as const;

export function PlansSection() {
  const [plan, setPlan] = useState<(typeof PLANS)[number]["id"]>("daily");
  const [away, setAway] = useState(false);
  const [adults, setAdults] = useState(2);
  const [kids, setKids] = useState(2);
  const est = householdEstimate(adults, kids, adults * 2);
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1)), []);
  const on = (d: Date, i: number) => {
    if (away && i >= 5 && i <= 8) return false;
    if (plan === "daily") return true;
    if (plan === "alternate") return i % 2 === 0;
    if (plan === "weekly") return [0, 1, 3, 5].includes(d.getDay());
    return d.getDate() === 1 || i === 0;
  };

  return (
    <section aria-labelledby="plans-title" className="relative overflow-hidden bg-cream py-24 md:py-32">
      <div className="wrap grid-12 items-center gap-y-14">
        <div className="col-span-4 md:col-span-8 xl:col-span-5">
          <SectionLabel>Subscriptions</SectionLabel>
          <h2 id="plans-title" data-reveal className="display-xl mt-6">
            Milk on your schedule, <em className="display-em text-pasture">not ours.</em>
          </h2>
          <ul data-reveal-group className="mt-10 space-y-5">
            {[
              ["Daily, alternate days, chosen weekdays or monthly", "Set it once. We bring it until you say stop."],
              ["Pause for a trip, skip a morning", "Change anything until 10 PM the night before."],
              ["One bill a month", "UPI, card or cash. No delivery fee on subscriptions."],
              ["Glass bottles, collected next morning", "Rinse and leave them out. That's it."],
            ].map(([t, d]) => (
              <li key={t} data-reveal className="flex gap-4">
                <span className="mt-1 grid h-6 w-6 flex-none place-items-center rounded-full bg-pasture text-milk">
                  <CheckIcon size={14} />
                </span>
                <div>
                  <p className="font-semibold">{t}</p>
                  <p className="text-ink-2">{d}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/subscribe" className="btn btn-primary" data-cursor="Start">
              Build my subscription <ArrowRight size={18} />
            </Link>
          </div>
        </div>

        {/* interactive preview */}
        <div className="col-span-4 md:col-span-8 xl:col-span-6 xl:col-start-7">
          <div data-reveal className="card p-6 shadow-[0_40px_80px_-50px_rgba(28,26,22,0.45)] md:p-8">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Delivery plan">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  role="tab"
                  aria-selected={plan === p.id}
                  type="button"
                  onClick={() => setPlan(p.id)}
                  className={cls("chip border py-2", plan === p.id ? "border-pasture bg-pasture text-milk" : "border-rule bg-transparent text-ink-2 hover:border-ink")}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="mt-6 text-sm text-ink-3">Your next two weeks · {PLANS.find((p) => p.id === plan)!.note}</p>
            <div className="mt-3 grid grid-cols-7 gap-1.5">
              {days.map((d, i) => {
                const yes = on(d, i);
                const paused = away && i >= 5 && i <= 8;
                return (
                  <div
                    key={i}
                    className={cls(
                      "flex aspect-[4/5] flex-col items-center justify-between rounded-xl border p-1.5 text-center transition-colors duration-300",
                      yes ? "border-pasture/30 bg-pasture/[0.07]" : paused ? "border-dashed border-dawn bg-dawn/10" : "border-rule",
                    )}
                  >
                    <span className="text-[0.62rem] font-semibold uppercase text-ink-3">{d.toLocaleDateString("en-IN", { weekday: "short" })}</span>
                    <span className="text-sm font-semibold tabular-nums">{d.getDate()}</span>
                    <span className={cls("h-3 w-2.5 transition-transform duration-500", yes ? "scale-100" : "scale-0")} aria-hidden>
                      <svg viewBox="0 0 12 16" className="h-full w-full text-pasture">
                        <path d="M6 0S0 7 0 10.5a6 6 0 0 0 12 0C12 7 6 0 6 0Z" fill="currentColor" />
                      </svg>
                    </span>
                  </div>
                );
              })}
            </div>
            <label className="mt-6 flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-cream px-4 py-3">
              <span>
                <span className="block font-semibold">Going away?</span>
                <span className="text-sm text-ink-2">Pause for four days and we&apos;ll pick up when you&apos;re back.</span>
              </span>
              <input type="checkbox" checked={away} onChange={(e) => setAway(e.target.checked)} className="peer sr-only" />
              <span aria-hidden className="relative h-7 w-12 flex-none rounded-full bg-rule transition-colors peer-checked:bg-dawn peer-focus-visible:ring-2 peer-focus-visible:ring-pasture">
                <span className={cls("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300", away ? "translate-x-6" : "translate-x-1")} />
              </span>
            </label>

            <div className="mt-4 rounded-2xl border border-butter/50 bg-butter/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-butter-ink">
                <SparkIcon size={15} /> How much milk do you need? · AI estimate (demo)
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
                {[
                  ["Adults", adults, setAdults],
                  ["Children", kids, setKids],
                ].map(([l, v, set]) => (
                  <div key={l as string} className="flex items-center gap-2">
                    <span className="w-16 text-sm text-ink-2">{l as string}</span>
                    <button type="button" aria-label={`Fewer ${l}`} onClick={() => (set as (n: number) => void)(Math.max(0, (v as number) - 1))} className="grid h-8 w-8 place-items-center rounded-full border border-rule bg-white">
                      <MinusIcon size={14} />
                    </button>
                    <span className="w-5 text-center font-semibold tabular-nums">{v as number}</span>
                    <button type="button" aria-label={`More ${l}`} onClick={() => (set as (n: number) => void)(Math.min(8, (v as number) + 1))} className="grid h-8 w-8 place-items-center rounded-full border border-rule bg-white">
                      <PlusIcon size={14} />
                    </button>
                  </div>
                ))}
                <p className="ml-auto text-2xl font-semibold tabular-nums">
                  {est} L <span className="text-sm font-normal text-ink-2">a day</span>
                </p>
              </div>
              <p className="mt-2 text-xs text-ink-3">Signed-in customers get this from their own order history instead.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- farm */

export function FarmSection() {
  return (
    <section aria-labelledby="farm-title" className="relative bg-milk py-24 md:py-32">
      <div className="wrap">
        <div className="grid-12 gap-y-10">
          <div className="col-span-4 md:col-span-6 xl:col-span-6">
            <SectionLabel>{site.farm}</SectionLabel>
            <h2 id="farm-title" data-reveal className="display-xl mt-6">
              One farm. <em className="display-em text-pasture">One herd.</em> Your doorstep.
            </h2>
          </div>
          <p data-reveal className="body-l col-span-4 self-end text-ink-2 md:col-span-6 md:col-start-7 xl:col-span-4 xl:col-start-9">
            We don&apos;t buy milk from collection centres. Every bottle traces back to a cow on our pasture, a can, a chiller
            reading and a lab test, and you can ask for any of them.
          </p>
        </div>

        <div data-reveal-group className="mt-14 grid grid-cols-6 gap-[var(--gutter)] md:grid-rows-[22rem_18rem]">
          <figure data-reveal className="relative col-span-6 aspect-[16/10] overflow-hidden rounded-[24px] md:col-span-4 md:row-span-1 md:aspect-auto">
            <Image src="/photos/cows-hill.jpg" alt="Two cows grazing on a green hillside" fill sizes="(min-width: 768px) 66vw, 100vw" className="object-cover" />
            <figcaption className="mono-label absolute bottom-4 left-4 rounded-full bg-milk/90 px-3 py-1.5 text-ink">Open pasture, 6 hours a day</figcaption>
          </figure>
          <figure data-reveal className="relative col-span-3 aspect-square overflow-hidden rounded-[24px] md:col-span-2 md:aspect-auto">
            <Image src="/photos/cow-face.jpg" alt="A cow looking straight at the camera" fill sizes="(min-width: 768px) 33vw, 50vw" className="object-cover" />
          </figure>
          <figure data-reveal className="relative col-span-3 aspect-square overflow-hidden rounded-[24px] md:col-span-2 md:aspect-auto">
            <Image src="/photos/calf-barn.jpg" alt="A calf standing in a clean, airy shed" fill sizes="(min-width: 768px) 33vw, 50vw" className="object-cover" style={{ objectPosition: "50% 60%" }} />
          </figure>
          <figure data-reveal className="relative col-span-6 aspect-[16/9] overflow-hidden rounded-[24px] md:col-span-4 md:aspect-auto">
            <Image src="/photos/green-fields.jpg" alt="Green paddy fields below a range of hills" fill sizes="(min-width: 768px) 66vw, 100vw" className="object-cover" />
            <figcaption className="mono-label absolute bottom-4 left-4 rounded-full bg-milk/90 px-3 py-1.5 text-ink">Fodder grown on our own fields</figcaption>
          </figure>
        </div>

        <dl data-reveal-group className="mt-16 grid grid-cols-2 gap-x-[var(--gutter)] gap-y-10 border-t border-rule pt-10 lg:grid-cols-4">
          {site.stats.map((s) => (
            <div key={s.label} data-reveal>
              <dt className="sr-only">{s.label}</dt>
              <dd className="font-display text-[clamp(3rem,6vw,5.5rem)] leading-none tracking-[-0.03em] text-pasture [font-variation-settings:'opsz'_144,'SOFT'_100]">
                {s.value}
              </dd>
              <dd className="mt-3 max-w-[22ch] text-ink-2">{s.label}</dd>
            </div>
          ))}
        </dl>
        <Link href="/farm" className="btn btn-ghost mt-12" data-cursor="Read">
          Read the whole morning, from pasture to pour <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ AI */

const ROUTE_PTS = [
  { lat: 13.0012, lng: 80.2565 },
  { lat: 12.9496, lng: 80.2585 },
  { lat: 12.999, lng: 80.2669 },
  { lat: 12.9815, lng: 80.218 },
  { lat: 12.983, lng: 80.2594 },
  { lat: 12.9654, lng: 80.2461 },
  { lat: 12.9611, lng: 80.2567 },
];
const HUB = { lat: 13.0067, lng: 80.2206 };

export function AISection() {
  const fc = useMemo(() => forecastDemand(14), []);
  const spark = useMemo(() => [...fc.history.slice(-28).map((p) => p.litres), ...fc.forecast.slice(0, 7).map((p) => p.litres)], [fc]);
  const db = useDB();
  const fb = useMemo(() => summariseFeedback(db?.reviews ?? []), [db]);
  const before = routeLength(HUB, ROUTE_PTS);
  const opt = optimiseRoute(HUB, ROUTE_PTS);
  const after = routeLength(HUB, opt);
  const proj = (p: { lat: number; lng: number }) => ({ x: ((p.lng - 80.21) / 0.065) * 220 + 20, y: ((13.012 - p.lat) / 0.066) * 120 + 10 });
  const path = (pts: { lat: number; lng: number }[]) => [HUB, ...pts].map((p, i) => `${i ? "L" : "M"}${proj(p).x.toFixed(0)},${proj(p).y.toFixed(0)}`).join(" ");

  const card = "card-dark flex flex-col p-6 md:p-7";
  return (
    <section aria-labelledby="ai-title" className="on-dark relative overflow-hidden bg-night py-24 text-milk md:py-32">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_60%_at_85%_0%,rgba(240,164,124,0.16),transparent_60%),radial-gradient(60%_50%_at_0%_100%,rgba(232,184,74,0.1),transparent_60%)]" />
      <div className="wrap relative">
        <div className="grid-12 gap-y-8">
          <div className="col-span-4 md:col-span-8 xl:col-span-7">
            <SectionLabel dark>AI, quietly at work</SectionLabel>
            <h2 id="ai-title" data-reveal className="display-xl mt-6">
              A little intelligence, <em className="display-em text-butter">before sunrise.</em>
            </h2>
          </div>
          <div className="col-span-4 self-end md:col-span-8 xl:col-span-4 xl:col-start-9">
            <p data-reveal className="text-milk/70">
              Nine AI features, working end to end on sample data. In this prototype the AI is simulated in
              code so every screen can be demonstrated; the comments in <code className="text-butter">src/lib/ai.ts</code> say
              which model replaces each one.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-butter/30 px-3 py-1.5 text-[0.75rem] font-semibold text-butter">
              <span className="h-1.5 w-1.5 rounded-full bg-butter" /> Demo mode · AI not connected
            </p>
          </div>
        </div>

        <div data-reveal-group className="mt-14 grid gap-[var(--gutter)] md:grid-cols-2 xl:grid-cols-3">
          {/* chatbot */}
          <article data-reveal className={card}>
            <p className="mono-label text-butter">01 · Assistant</p>
            <h3 className="h3 mt-3">Answers at 4 AM, in plain words.</h3>
            <div className="mt-6 space-y-2 text-[0.85rem]">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-pasture px-3.5 py-2">I&apos;m travelling next week</p>
              <p className="w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-white/10 px-3.5 py-2 text-milk/85">
                Go to My account → Subscriptions and tap Pause. Pick the day you&apos;re back…
              </p>
            </div>
            <div className="mt-auto pt-6">
              <button type="button" onClick={() => openChat("How do I pause my subscription?")} className="btn btn-butter btn-sm">
                Try the assistant
              </button>
            </div>
          </article>

          {/* recommendations */}
          <article data-reveal className={card}>
            <p className="mono-label text-butter">02 · Recommendations</p>
            <h3 className="h3 mt-3">Bought curd? You&apos;ll probably want buttermilk.</h3>
            <div className="mt-6 flex items-center gap-3">
              {["/photos/p-curd.jpg", "/photos/p-buttermilk.jpg", "/photos/p-lassi.jpg"].map((src, i) => (
                <div key={src} className="flex items-center gap-3">
                  <div className="relative h-16 w-16 overflow-hidden rounded-2xl ring-1 ring-white/15">
                    <Image src={src} alt="" fill sizes="64px" className="object-cover" />
                  </div>
                  {i < 2 && <ArrowRight size={16} className="text-milk/40" />}
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm text-milk/65">Suggestions on the home page, product pages and in the cart, from purchase history and what&apos;s in the basket.</p>
          </article>

          {/* demand forecast */}
          <article data-reveal className={card}>
            <p className="mono-label text-butter">03 · Demand prediction</p>
            <h3 className="h3 mt-3">Tomorrow: {fc.forecast[0].litres} litres.</h3>
            <div className="mt-5">
              <Sparkline values={spark} split={28} />
            </div>
            <p className="mt-4 text-sm text-milk/65">
              {fc.peakDay}s run {Math.round(fc.peakLift)}% above average. Back-tested error on the last two weeks: {fc.mape.toFixed(1)}%.
            </p>
          </article>

          {/* routes */}
          <article data-reveal className={card}>
            <p className="mono-label text-butter">04 · Route optimisation</p>
            <h3 className="h3 mt-3">
              {before.toFixed(1)} km → <span className="text-butter">{after.toFixed(1)} km</span>
            </h3>
            <svg viewBox="0 0 260 140" className="mt-4 h-auto w-full" aria-label="Delivery route before and after optimisation">
              <path d={path(ROUTE_PTS)} fill="none" stroke="#fbf8f1" strokeOpacity={0.25} strokeWidth={1.5} strokeDasharray="3 4" />
              <path d={path(opt)} fill="none" stroke="#e8b84a" strokeWidth={2} strokeLinejoin="round" />
              {ROUTE_PTS.map((p, i) => (
                <circle key={i} cx={proj(p).x} cy={proj(p).y} r={4} fill="#fbf8f1" stroke="#0e1525" strokeWidth={2} />
              ))}
              <rect x={proj(HUB).x - 5} y={proj(HUB).y - 5} width={10} height={10} rx={2} fill="#e8b84a" />
            </svg>
            <p className="mt-3 text-sm text-milk/65">Dashed: stops in the order they were booked. Gold: the loop the planner suggests.</p>
          </article>

          {/* quality */}
          <article data-reveal className={card}>
            <p className="mono-label text-butter">05 · Quality watch</p>
            <h3 className="h3 mt-3">Flags the odd reading. A person decides.</h3>
            <ul className="mt-5 space-y-2 text-sm">
              {[
                ["B-AM", "Fat 4.2% · SNF 8.7% · 3.6°C", true],
                ["B-PM", "Fat 4.1% · SNF 8.8% · 7.6°C", false],
                ["B-AM", "Fat 4.3% · SNF 8.6% · 3.9°C", true],
              ].map(([b, r, ok], i) => (
                <li key={i} className={cls("flex items-center justify-between gap-3 rounded-xl px-3 py-2", ok ? "bg-white/[0.05]" : "bg-clay/25")}>
                  <span className="font-mono text-[0.78rem] text-milk/70">{b as string}</span>
                  <span className="flex-1 text-milk/85">{r as string}</span>
                  <span className={cls("text-[0.72rem] font-semibold", ok ? "text-milk/50" : "text-dawn")}>{ok ? "OK" : "Re-test"}</span>
                </li>
              ))}
            </ul>
          </article>

          {/* sentiment */}
          <article data-reveal className={card}>
            <p className="mono-label text-butter">06 · Review sentiment</p>
            <h3 className="h3 mt-3">{Math.round(fb.positiveShare * 100)}% of reviews are happy ones.</h3>
            <p className="mt-4 text-sm text-milk/65">Most mentioned problems:</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {fb.issues.slice(0, 4).map((i) => (
                <li key={i.id} className="chip bg-white/[0.08] text-milk/85">
                  {i.label} · {i.count}
                </li>
              ))}
            </ul>
            <Link href="/admin?tab=insights" className="mono-label mt-auto pt-6 text-butter link-draw w-fit">
              See the admin AI dashboard →
            </Link>
          </article>

          {/* voice ordering */}
          <article data-reveal className={card}>
            <p className="mono-label text-butter">07 · Voice ordering</p>
            <h3 className="h3 mt-3">Say it. It&apos;s in the cart.</h3>
            <p className="mt-5 rounded-2xl bg-white/[0.06] px-4 py-3 text-milk/85">“Rendu litre paal and oru thayir”</p>
            <p className="mt-2 text-sm text-milk/65">→ 2 × A2 milk (1 L) and 1 × clay pot curd, ready to check out. English, Tamil and Hindi number words.</p>
            <div className="mt-auto pt-6">
              <VoiceOrderButton className="btn btn-butter btn-sm" label="Try voice ordering" />
            </div>
          </article>

          {/* product Q&A */}
          <article data-reveal className={card}>
            <p className="mono-label text-butter">08 · Ask about a product</p>
            <h3 className="h3 mt-3">Doubts answered on the product page.</h3>
            <div className="mt-6 space-y-2 text-[0.85rem]">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-pasture px-3.5 py-2">Is the ghee lactose free?</p>
              <p className="w-fit max-w-[92%] rounded-2xl rounded-bl-md bg-white/10 px-3.5 py-2 text-milk/85">Ghee is almost entirely fat, so it has only traces of lactose…</p>
            </div>
            <Link href="/shop/a2-bilona-ghee#ask-title" className="mono-label link-draw mt-auto w-fit pt-6 text-butter">
              Ask a question →
            </Link>
          </article>

          {/* ask your data */}
          <article data-reveal className={card}>
            <p className="mono-label text-butter">09 · Ask your data</p>
            <h3 className="h3 mt-3">The owner asks in plain English.</h3>
            <p className="mt-5 rounded-2xl bg-white/[0.06] px-4 py-3 text-milk/85">“Which product sells the most?”</p>
            <p className="mt-2 text-sm text-milk/65">Answered from orders, with the query it would run against MySQL shown underneath.</p>
            <Link href="/admin" className="mono-label link-draw mt-auto w-fit pt-6 text-butter">
              Open the admin dashboard →
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ voices */

export function VoicesSection() {
  const db = useDB();
  const picks = (db?.reviews ?? []).filter((r) => r.rating >= 4).slice(0, 6);
  return (
    <section aria-labelledby="voices-title" className="relative bg-milk py-24 md:py-32">
      <div className="wrap">
        <SectionLabel>From the doorsteps</SectionLabel>
        <h2 id="voices-title" data-reveal className="display-l mt-6 max-w-[18ch]">
          What Chennai says <em className="display-em text-pasture">over breakfast.</em>
        </h2>
        <div data-reveal-group className="mt-14 columns-1 gap-[var(--gutter)] md:columns-2 xl:columns-3">
          {(picks.length ? picks : []).map((r) => {
            const s = sentiment(r.text, r.rating);
            return (
              <figure key={r.id} data-reveal className="card mb-[var(--gutter)] break-inside-avoid p-7">
                <div className="flex items-center justify-between">
                  <div className="flex gap-0.5 text-butter" aria-label={`${r.rating} out of 5`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <StarIcon key={i} size={15} filled={i < r.rating} />
                    ))}
                  </div>
                  <span className={cls("chip py-1 text-[0.68rem]", s.label === "positive" ? "bg-ok/10 text-ok" : s.label === "negative" ? "bg-alert/10 text-alert" : "bg-ink/5 text-ink-2")}>
                    AI: {s.label}
                  </span>
                </div>
                <blockquote className="mt-5 font-display text-[1.3rem] leading-snug [font-variation-settings:'opsz'_36,'SOFT'_100]">
                  “{r.text}”
                </blockquote>
                <figcaption className="mt-5 text-sm text-ink-3">{r.name}</figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- final CTA */

export function FinalCTA() {
  return (
    <section aria-labelledby="cta-title" className="on-dark relative overflow-hidden text-milk">
      <Image src="/photos/barn-sunrise.jpg" alt="" fill sizes="100vw" className="object-cover" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-night via-night/70 to-night/30" />
      <div className="wrap relative flex min-h-[80svh] flex-col justify-end py-20 md:py-28">
        <SectionLabel dark>Tomorrow, 6 AM</SectionLabel>
        <h2 id="cta-title" data-reveal className="display-xxl mt-6 max-w-[12ch]">
          Your first bottle is <em className="display-em text-butter">on us.</em>
        </h2>
        <p data-reveal className="body-l mt-6 max-w-[48ch] text-milk/80">
          Order before 10 PM tonight and it arrives before your alarm. No delivery fee on your first order, no lock-in on
          subscriptions.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/subscribe" className="btn btn-butter" data-cursor="Start">
            Start a subscription <ArrowRight size={18} />
          </Link>
          <Link href="/shop" className="btn btn-ghost">
            Order just once
          </Link>
        </div>
      </div>
    </section>
  );
}
