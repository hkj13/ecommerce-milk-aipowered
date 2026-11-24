/**
 * The "AI" of the prototype.
 *
 * Every function here is a small, transparent stand-in for a model in the
 * full system. They run on the sample data in the browser so the screens
 * can be demonstrated end to end. The comment on each says what replaces it
 * in production (Python, Pandas, Scikit-learn, an NLP model or AI API).
 *
 * None of these make decisions on their own: flags go to a person for review.
 */

import { productBySlug } from "@/data/products";
import { addDays, rng, ymd } from "@/lib/format";
import type { LoginEvent, Order, QualityTest, Review, User } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* 1. Product recommendations                                          */
/* Production: item-based collaborative filtering (Scikit-learn        */
/* NearestNeighbors on a customer x product matrix from MySQL).        */
/* ------------------------------------------------------------------ */

/** "Customers who bought X also bought Y" — association rules mined from sample orders. */
export const PAIRS: Record<string, { slug: string; why: string }[]> = {
  "a2-desi-cow-milk": [
    { slug: "clay-pot-curd", why: "Most A2 milk customers also take our clay pot curd" },
    { slug: "a2-bilona-ghee", why: "Made from the same A2 milk" },
    { slug: "fresh-malai", why: "Skimmed from this milk every morning" },
  ],
  "farm-toned-milk": [
    { slug: "neer-mor", why: "A popular pairing for everyday households" },
    { slug: "clay-pot-curd", why: "Customers who buy toned milk often add curd" },
  ],
  "buffalo-milk": [
    { slug: "fresh-malai", why: "For payasam and sweets" },
    { slug: "a2-bilona-ghee", why: "Often bought together for festival cooking" },
  ],
  "clay-pot-curd": [
    { slug: "neer-mor", why: "Customers who buy curd often add buttermilk" },
    { slug: "strawberry-yogurt", why: "Curd lovers rate these cups highly" },
    { slug: "mango-lassi", why: "Made with the same curd" },
  ],
  "neer-mor": [{ slug: "clay-pot-curd", why: "Bought together in 6 of 10 baskets" }],
  "malai-paneer": [
    { slug: "fresh-malai", why: "For a richer gravy" },
    { slug: "cultured-butter", why: "Paneer butter masala, sorted" },
  ],
  "cultured-butter": [{ slug: "farmhouse-cheese", why: "For the breakfast table" }],
  "a2-bilona-ghee": [{ slug: "a2-desi-cow-milk", why: "From the same herd" }],
  "fresh-malai": [{ slug: "malai-paneer", why: "Often cooked together" }],
  "mango-lassi": [
    { slug: "cocoa-milkshake", why: "Kids' afternoon favourites" },
    { slug: "malai-ice-cream", why: "Customers who like lassi also pick this" },
  ],
  "cocoa-milkshake": [{ slug: "mango-lassi", why: "Bought together for lunch boxes" }],
  "strawberry-yogurt": [{ slug: "mango-lassi", why: "Popular with the same customers" }],
  "farmhouse-cheese": [{ slug: "cultured-butter", why: "A breakfast pairing" }],
  "malai-ice-cream": [{ slug: "mango-lassi", why: "Weekend treats" }],
};

export type Recommendation = { slug: string; reason: string };

export function recommend(opts: {
  cart?: string[];
  history?: Order[];
  viewed?: string[];
  exclude?: string[];
  available?: (slug: string) => boolean;
  n?: number;
}): Recommendation[] {
  const { cart = [], history = [], viewed = [], exclude = [], n = 4 } = opts;
  const ok = opts.available ?? (() => true);
  const score = new Map<string, { s: number; reason: string }>();
  const bump = (slug: string, s: number, reason: string) => {
    if (exclude.includes(slug) || cart.includes(slug) || !ok(slug)) return;
    const cur = score.get(slug);
    if (!cur || cur.s < s) score.set(slug, { s: (cur?.s ?? 0) + s, reason });
    else cur.s += s * 0.5;
  };

  // From the cart: strongest signal.
  cart.forEach((c) => PAIRS[c]?.forEach((p, i) => bump(p.slug, 3 - i * 0.4, p.why)));

  // From purchase history: frequency of each product, and what pairs with it.
  const freq = new Map<string, number>();
  history.forEach((o) => o.lines.forEach((l) => freq.set(l.slug, (freq.get(l.slug) ?? 0) + 1)));
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  top.slice(0, 4).forEach(([slug, count]) => {
    PAIRS[slug]?.forEach((p) => {
      if (!freq.has(p.slug)) bump(p.slug, 1.5, `Because you often order ${productBySlug(slug)?.name ?? slug}`);
    });
    if (count >= 3) bump(slug, 1.2, `You've ordered this ${count} times`);
  });

  // From browsing.
  viewed.slice(0, 4).forEach((v, i) => bump(v, 0.8 - i * 0.15, "You looked at this recently"));

  // Fill with bestsellers.
  ["a2-desi-cow-milk", "clay-pot-curd", "malai-paneer", "a2-bilona-ghee", "neer-mor", "mango-lassi"].forEach((s) =>
    bump(s, 0.3, "A bestseller this week"),
  );

  return [...score.entries()]
    .sort((a, b) => b[1].s - a[1].s)
    .slice(0, n)
    .map(([slug, v]) => ({ slug, reason: v.reason }));
}

/* ------------------------------------------------------------------ */
/* 2. Milk demand prediction                                           */
/* Production: Pandas + Scikit-learn regression on daily order history */
/* with day-of-week, holiday and weather features.                     */
/* ------------------------------------------------------------------ */

export type DemandPoint = { date: string; litres: number };
export type ForecastPoint = DemandPoint & { lo: number; hi: number };

const DOW_TRUE = [1.12, 0.95, 0.97, 0.98, 0.99, 1.02, 1.08];

/** 120 days of sample daily milk demand (litres, all channels). */
export function demandHistory(days = 120): DemandPoint[] {
  const r = rng(77);
  const out: DemandPoint[] = [];
  const now = new Date();
  for (let i = days; i >= 1; i--) {
    const d = addDays(now, -i);
    const t = days - i;
    let v = (372 + 0.42 * t) * DOW_TRUE[d.getDay()] * (1 + (r() - 0.5) * 0.11);
    if (i === 41 || i === 40) v *= 0.84; // heavy rain days
    if (i === 23) v *= 1.15; // festival
    out.push({ date: ymd(d), litres: Math.round(v) });
  }
  return out;
}

function fit(series: DemandPoint[]) {
  // day-of-week factors as ratio to the overall mean
  const mean = series.reduce((s, p) => s + p.litres, 0) / series.length;
  const sums = Array(7).fill(0);
  const counts = Array(7).fill(0);
  series.forEach((p) => {
    const dow = new Date(p.date + "T00:00").getDay();
    sums[dow] += p.litres;
    counts[dow]++;
  });
  const dow = sums.map((s, i) => s / counts[i] / mean);
  // linear trend on the de-seasonalised series
  const ys = series.map((p) => p.litres / dow[new Date(p.date + "T00:00").getDay()]);
  const n = ys.length;
  const xm = (n - 1) / 2;
  const ym = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  ys.forEach((y, x) => {
    num += (x - xm) * (y - ym);
    den += (x - xm) ** 2;
  });
  const slope = num / den;
  const intercept = ym - slope * xm;
  const resid = ys.map((y, x) => y - (intercept + slope * x));
  const sd = Math.sqrt(resid.reduce((s, e) => s + e * e, 0) / (n - 2));
  return { dow, slope, intercept, sd, n };
}

export function forecastDemand(horizon = 14) {
  const history = demandHistory();
  const model = fit(history);
  const start = new Date(history[history.length - 1].date + "T00:00");
  const forecast: ForecastPoint[] = [];
  for (let h = 1; h <= horizon; h++) {
    const d = addDays(start, h);
    const f = model.dow[d.getDay()];
    const base = model.intercept + model.slope * (model.n - 1 + h);
    const band = 1.64 * model.sd * Math.sqrt(1 + h / 30) * f;
    forecast.push({ date: ymd(d), litres: Math.round(base * f), lo: Math.round(base * f - band), hi: Math.round(base * f + band) });
  }
  // Back-test: fit on all but the last 14 days, score on those 14.
  const train = history.slice(0, -14);
  const test = history.slice(-14);
  const m2 = fit(train);
  const ape = test.map((p, i) => {
    const f = m2.dow[new Date(p.date + "T00:00").getDay()];
    const pred = (m2.intercept + m2.slope * (m2.n + i)) * f;
    return Math.abs(pred - p.litres) / p.litres;
  });
  const mape = (ape.reduce((a, b) => a + b, 0) / ape.length) * 100;
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const peak = model.dow.indexOf(Math.max(...model.dow));
  const low = model.dow.indexOf(Math.min(...model.dow));
  const last7 = history.slice(-7).reduce((s, p) => s + p.litres, 0);
  const next7 = forecast.slice(0, 7).reduce((s, p) => s + p.litres, 0);
  return {
    history,
    forecast,
    mape,
    peakDay: days[peak],
    peakLift: (model.dow[peak] - 1) * 100,
    lowDay: days[low],
    weeklyGrowth: ((next7 - last7) / last7) * 100,
    trendPerWeek: model.slope * 7,
    dowFactors: model.dow,
  };
}

/** Split tomorrow's total milk forecast into products, with a safety buffer. */
export function procurementPlan(tomorrowLitres: number) {
  const mix = [
    { slug: "a2-desi-cow-milk", share: 0.46 },
    { slug: "farm-toned-milk", share: 0.31 },
    { slug: "buffalo-milk", share: 0.13 },
    { slug: "clay-pot-curd", share: 0.06, note: "milk for curd setting" },
    { slug: "malai-paneer", share: 0.04, note: "milk for paneer" },
  ];
  return mix.map((m) => ({
    ...m,
    name: productBySlug(m.slug)?.name ?? m.slug,
    litres: Math.round(tomorrowLitres * m.share),
    withBuffer: Math.round(tomorrowLitres * m.share * 1.05),
  }));
}

/* ------------------------------------------------------------------ */
/* 3. Review sentiment analysis                                        */
/* Production: a fine-tuned NLP classifier or an AI API.               */
/* ------------------------------------------------------------------ */

const POS = ["love", "lovely", "fresh", "excellent", "best", "great", "amazing", "brilliant", "fantastic", "perfect", "thick", "creamy", "good", "nice", "worth", "favourite", "consistent", "on time", "well", "real", "aromatic", "rich"];
const NEG = ["late", "sour", "leak", "leaked", "out of stock", "disappointing", "expensive", "melted", "salty", "small", "loose", "not cold", "bad", "worst", "spoiled", "damaged", "missing", "high", "rude", "never came"];
const NEGATORS = ["not", "never", "no", "hardly"];

export type Sentiment = "positive" | "neutral" | "negative";

export function sentiment(text: string, rating?: number): { label: Sentiment; score: number; hits: string[] } {
  const t = ` ${text.toLowerCase().replace(/[^a-z\s]/g, " ")} `;
  let s = 0;
  const hits: string[] = [];
  POS.forEach((w) => {
    const i = t.indexOf(` ${w} `);
    if (i >= 0) {
      const before = t.slice(Math.max(0, i - 12), i);
      const negated = NEGATORS.some((n) => before.includes(` ${n} `));
      s += negated ? -1 : 1;
      hits.push(w);
    }
  });
  NEG.forEach((w) => {
    if (t.includes(` ${w} `)) {
      s -= 1.4;
      hits.push(w);
    }
  });
  if (rating) s += (rating - 3) * 1.2;
  const label: Sentiment = s > 0.8 ? "positive" : s < -0.6 ? "negative" : "neutral";
  return { label, score: Math.max(-1, Math.min(1, s / 5)), hits };
}

const ISSUES: { id: string; label: string; words: string[] }[] = [
  { id: "late", label: "Late delivery", words: ["late", "after 8"] },
  { id: "stock", label: "Out of stock", words: ["out of stock"] },
  { id: "spoil", label: "Sour or spoiled", words: ["sour", "spoiled", "melted", "not cold"] },
  { id: "pack", label: "Packaging or leaks", words: ["leak", "leaked", "loose", "damaged"] },
  { id: "price", label: "Price", words: ["expensive", "price", "high", "small for the price"] },
];

export function summariseFeedback(reviews: Review[]) {
  const rows = reviews.map((r) => ({ ...r, s: sentiment(r.text, r.rating) }));
  const counts = { positive: 0, neutral: 0, negative: 0 };
  rows.forEach((r) => counts[r.s.label]++);
  const issues = ISSUES.map((i) => ({
    ...i,
    count: rows.filter((r) => i.words.some((w) => r.text.toLowerCase().includes(w))).length,
  }))
    .filter((i) => i.count > 0)
    .sort((a, b) => b.count - a.count);
  const praise = new Map<string, number>();
  rows
    .filter((r) => r.s.label === "positive")
    .forEach((r) => r.s.hits.filter((h) => POS.includes(h)).forEach((h) => praise.set(h, (praise.get(h) ?? 0) + 1)));
  return {
    rows,
    counts,
    total: rows.length,
    positiveShare: rows.length ? counts.positive / rows.length : 0,
    issues,
    praise: [...praise.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
  };
}

/* ------------------------------------------------------------------ */
/* 4. Milk quality monitoring                                          */
/* Production: anomaly detection (Isolation Forest) on lab readings.   */
/* Decision support only: physical re-testing and a qualified person   */
/* decide.                                                             */
/* ------------------------------------------------------------------ */

export const QUALITY_LIMITS = {
  fat: { min: 3.5, label: "Fat %" },
  snf: { min: 8.5, label: "SNF %" },
  tempC: { max: 4.5, label: "Chilling temperature °C" },
  acidity: { max: 0.16, label: "Acidity (% lactic acid)" },
  tpc: { max: 100000, label: "Total plate count (cfu/ml)" },
};

export function qualityFlags(t: QualityTest): string[] {
  const f: string[] = [];
  if (t.fat < QUALITY_LIMITS.fat.min) f.push(`Fat ${t.fat}% is below ${QUALITY_LIMITS.fat.min}%`);
  if (t.snf < QUALITY_LIMITS.snf.min) f.push(`SNF ${t.snf}% is below ${QUALITY_LIMITS.snf.min}%. Possible dilution: re-test before dispatch.`);
  if (t.tempC > QUALITY_LIMITS.tempC.max) f.push(`Chilled to ${t.tempC}°C, above ${QUALITY_LIMITS.tempC.max}°C. Check the bulk chiller.`);
  if (t.acidity > QUALITY_LIMITS.acidity.max) f.push(`Acidity ${t.acidity} is high`);
  if (t.tpc > QUALITY_LIMITS.tpc.max) f.push(`Plate count ${t.tpc.toLocaleString("en-IN")} is above the limit. Hold the batch for re-test.`);
  if (t.adulterants === "fail") f.push("Adulterant strip test failed");
  return f;
}

/* ------------------------------------------------------------------ */
/* 5. Unusual login and payment patterns                               */
/* Production: rules plus an anomaly model. Flags go to a person;      */
/* legitimate payments are never rejected automatically.               */
/* ------------------------------------------------------------------ */

export function loginFlags(events: LoginEvent[]) {
  const out: { email: string; at: string; reason: string; severity: "high" | "medium" }[] = [];
  const byEmail = new Map<string, LoginEvent[]>();
  events.forEach((e) => byEmail.set(e.email, [...(byEmail.get(e.email) ?? []), e]));
  byEmail.forEach((list, email) => {
    const sorted = [...list].sort((a, b) => a.at.localeCompare(b.at));
    // burst of failures
    for (let i = 0; i < sorted.length; i++) {
      const windowEnd = new Date(sorted[i].at).getTime() + 5 * 60000;
      const fails = sorted.filter((e) => !e.success && new Date(e.at).getTime() >= new Date(sorted[i].at).getTime() && new Date(e.at).getTime() <= windowEnd);
      if (fails.length >= 3) {
        out.push({ email, at: sorted[i].at, reason: `${fails.length} failed sign-ins within 5 minutes from ${fails[0].place}`, severity: "high" });
        break;
      }
    }
    // unusual place or hour on a successful sign-in
    sorted
      .filter((e) => e.success)
      .forEach((e) => {
        const h = new Date(e.at).getHours();
        if (e.place !== "Chennai") out.push({ email, at: e.at, reason: `Sign-in from ${e.place}, outside the usual city`, severity: "medium" });
        else if (h >= 0 && h < 5 && !email.endsWith("ksheera.example")) out.push({ email, at: e.at, reason: `Sign-in at ${new Date(e.at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}, unusual for this account`, severity: "medium" });
      });
  });
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

export function flagPayment(opts: { total: number; method: string; history: Order[] }): string | null {
  const past = opts.history.filter((o) => o.status !== "cancelled");
  const avg = past.length ? past.reduce((s, o) => s + o.total, 0) / past.length : 0;
  if (past.length >= 3 && opts.total > Math.max(2500, avg * 5)) {
    return `Order value is ${Math.round(opts.total / avg)}× this customer's usual basket. Held for a quick review, not rejected.`;
  }
  if (past.length === 0 && opts.total > 5000) {
    return "First order from a new account with an unusually high value. Held for a quick review, not rejected.";
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* 6. Customer behaviour insights                                      */
/* Production: frequency / recency features in Pandas, simple churn    */
/* model. No sensitive attributes are used.                            */
/* ------------------------------------------------------------------ */

export function behaviourInsights(users: User[], orders: Order[]) {
  const now = Date.now();
  const day = 86400000;
  return users
    .filter((u) => u.role === "customer")
    .map((u) => {
      const mine = orders.filter((o) => o.userId === u.id && o.status !== "cancelled");
      const recent = mine.filter((o) => now - new Date(o.placedAt).getTime() <= 14 * day).length;
      const before = mine.filter((o) => {
        const age = now - new Date(o.placedAt).getTime();
        return age > 14 * day && age <= 45 * day;
      }).length;
      const rateBefore = before / 31;
      const rateNow = recent / 14;
      const drop = rateBefore > 0 ? 1 - rateNow / rateBefore : 0;
      const last = mine[0]?.placedAt;
      return { user: u, recent, before, drop, last, orders: mine.length, spend: mine.reduce((s, o) => s + o.total, 0) };
    })
    .filter((x) => x.before >= 3 && x.drop >= 0.6)
    .sort((a, b) => b.drop - a.drop)
    .map((x) => ({
      ...x,
      suggestion:
        x.recent === 0
          ? "Send a friendly 'we miss you' note with their usual basket ready to reorder."
          : "Remind them before the 10 PM cut-off on the days they usually order.",
    }));
}

/* ------------------------------------------------------------------ */
/* 7. Subscription milk estimate and reminder timing                   */
/* ------------------------------------------------------------------ */

const LITRES: Record<string, number> = { "500ml": 0.5, "1l": 1 };

export function milkEstimate(orders: Order[], userId: string) {
  const since = Date.now() - 30 * 86400000;
  const mine = orders.filter((o) => o.userId === userId && o.status !== "cancelled" && new Date(o.placedAt).getTime() >= since);
  const litres = mine.reduce(
    (s, o) => s + o.lines.filter((l) => l.slug.includes("milk") && LITRES[l.variant]).reduce((a, l) => a + LITRES[l.variant] * l.qty, 0),
    0,
  );
  const days = new Set(mine.map((o) => o.deliveryDate)).size;
  if (!mine.length) return null;
  const perDay = litres / 30;
  const perDelivery = days ? litres / days : 0;
  const suggestion = Math.max(0.5, Math.round(perDelivery * 2) / 2);
  return { orders: mine.length, litres, perDay, perDelivery, suggestion, days };
}

export function householdEstimate(adults: number, children: number, tea: number) {
  // ~250 ml per adult, ~400 ml per child, ~60 ml per cup of tea or coffee
  const litres = adults * 0.25 + children * 0.4 + tea * 0.06;
  return Math.max(0.5, Math.round(litres * 2) / 2);
}

export function reminderTime(orders: Order[], userId: string) {
  const mine = orders.filter((o) => o.userId === userId).slice(0, 20);
  if (mine.length < 3) return null;
  const mins = mine.map((o) => {
    const d = new Date(o.placedAt);
    return d.getHours() * 60 + d.getMinutes();
  });
  mins.sort((a, b) => a - b);
  const median = mins[Math.floor(mins.length / 2)];
  const at = Math.max(18 * 60, median - 20);
  const fmt = (m: number) => {
    const h = Math.floor(m / 60);
    const mm = String(m % 60).padStart(2, "0");
    return `${((h + 11) % 12) + 1}:${mm} ${h >= 12 ? "PM" : "AM"}`;
  };
  return { usual: fmt(median), remindAt: fmt(at) };
}

/* ------------------------------------------------------------------ */
/* 8. Delivery route optimisation                                      */
/* Production: a maps / routing API with live traffic. Here: nearest-   */
/* neighbour, improved with 2-opt, on straight-line distances.         */
/* ------------------------------------------------------------------ */

export type Point = { lat: number; lng: number };

export function km(a: Point, b: Point) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  // road distance is roughly 1.35x straight-line in Chennai
  return 2 * R * Math.asin(Math.sqrt(s)) * 1.35;
}

export function routeLength(hub: Point, stops: Point[]) {
  let d = 0;
  let cur = hub;
  stops.forEach((s) => {
    d += km(cur, s);
    cur = s;
  });
  return d;
}

export function optimiseRoute<T extends Point>(hub: Point, stops: T[]): T[] {
  // nearest neighbour
  const left = [...stops];
  const route: T[] = [];
  let cur: Point = hub;
  while (left.length) {
    let bi = 0;
    let bd = Infinity;
    left.forEach((s, i) => {
      const d = km(cur, s);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    cur = left[bi];
    route.push(left.splice(bi, 1)[0]);
  }
  // 2-opt
  let improved = true;
  let best = routeLength(hub, route);
  while (improved) {
    improved = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let k = i + 1; k < route.length; k++) {
        const next = [...route.slice(0, i), ...route.slice(i, k + 1).reverse(), ...route.slice(k + 1)];
        const len = routeLength(hub, next);
        if (len + 0.001 < best) {
          best = len;
          route.splice(0, route.length, ...next);
          improved = true;
        }
      }
    }
  }
  return route;
}
