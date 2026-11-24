/**
 * More of the prototype's simulated AI: ordering in plain words (typed or
 * spoken), answering questions about a product, predicting a customer's
 * usual basket, estimating arrival time, and answering an admin's questions
 * about the business. Rules and small calculations, so every screen can be
 * demonstrated without a model. Production replacements are noted on each.
 */

import { HUB } from "@/data/seed";
import type { Product } from "@/data/products";
import { forecastDemand, optimiseRoute, qualityFlags, summariseFeedback } from "@/lib/ai";
import { addDays, fmtDay, money, today, tomorrow, ymd } from "@/lib/format";
import type { DB, Order } from "@/lib/types";

type P = Product & { active?: boolean };

/* ------------------------------------------------------------------ */
/* 1. Order in plain words: "two litres of A2 milk and a paneer"        */
/* Production: an LLM with function calling, or an NER model, mapping   */
/* the sentence to catalogue items. Speech-to-text from the browser.    */
/* ------------------------------------------------------------------ */

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, oru: 1, onnu: 1, ek: 1, single: 1,
  two: 2, rendu: 2, irandu: 2, couple: 2, pair: 2,
  three: 3, moonu: 3, teen: 3,
  four: 4, naalu: 4, char: 4,
  five: 5, anju: 5, paanch: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, dozen: 12,
  half: 0.5, arai: 0.5, aadha: 0.5,
};

/** Most specific first: "buttermilk" before "butter" and "milk". */
const PRODUCT_WORDS: [RegExp, string][] = [
  [/\b(neer ?mor|buttermilk|butter milk|mor|moru|chaas|chhaas)\b/, "neer-mor"],
  [/\b(ice ?cream|kulfi)\b/, "malai-ice-cream"],
  [/\b(milk ?shake|shake|cocoa|chocolate)\b/, "cocoa-milkshake"],
  [/\b(lassi)\b/, "mango-lassi"],
  [/\b(yog(h)?urt|yoghurt cups?)\b/, "strawberry-yogurt"],
  [/\b(toned)\b/, "farm-toned-milk"],
  [/\b(buffalo|erumai|full cream)\b/, "buffalo-milk"],
  [/\b(a2|a 2|desi|gir|sahiwal|cow milk)\b/, "a2-desi-cow-milk"],
  [/\b(curd|thayir|tayir|dahi)\b/, "clay-pot-curd"],
  [/\b(paneer|cottage cheese)\b/, "malai-paneer"],
  [/\b(ghee|nei|ney|ghi)\b/, "a2-bilona-ghee"],
  [/\b(butter|vennai|makhan)\b/, "cultured-butter"],
  [/\b(cream|malai)\b/, "fresh-malai"],
  [/\b(cheese)\b/, "farmhouse-cheese"],
  [/\b(milk|paal|doodh|dudh)\b/, "a2-desi-cow-milk"],
];

/** The product a sentence is about, if any. */
export function findProduct(text: string, catalogue: P[]): P | undefined {
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9\s]/g, " ")} `;
  const hit = PRODUCT_WORDS.find(([re]) => re.test(t));
  return hit ? catalogue.find((p) => p.slug === hit[1]) : undefined;
}

export type ParsedLine = { slug: string; variant: string; qty: number; name: string; label: string; price: number; heard: string };
export type ParsedOrder = {
  lines: ParsedLine[];
  unknown: string[];
  day: string;
  dayNote?: string;
  slot: "morning" | "evening";
  subscribe?: { frequency: "daily" | "alternate" | "weekly"; slug: string; litres?: number };
  confidence: number;
};

/** Size of a variant in litres or kilograms, read from its id ("500ml", "1l", "400g", "1kg", "4x200ml"). */
function sizeOf(id: string): { amount: number; kind: "l" | "kg" | "count" } {
  const m = id.match(/^(\d+x)?(\d+(?:\.\d+)?)(ml|l|g|kg)$/);
  if (!m || m[1]) return { amount: 1, kind: "count" };
  const n = parseFloat(m[2]);
  if (m[3] === "ml") return { amount: n / 1000, kind: "l" };
  if (m[3] === "l") return { amount: n, kind: "l" };
  if (m[3] === "g") return { amount: n / 1000, kind: "kg" };
  return { amount: n, kind: "kg" };
}

function readNumber(raw: string): number | null {
  const seg = raw.replace(/\ba ?2\b/g, " ");
  const d = seg.match(/(\d+(?:\.\d+)?)/);
  if (d) return parseFloat(d[1]);
  if (/\b(one and a half|ondra|dedh)\b/.test(seg)) return 1.5;
  if (/\b(half|arai|aadha)\b/.test(seg)) return 0.5;
  for (const [w, n] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${w}\\b`).test(seg)) return n;
  }
  return null;
}

function readAmount(raw: string): { value: number; unit: "l" | "kg" | "count" } | null {
  const seg = raw.replace(/\ba ?2\b/g, " ");
  // "3 paneer 500g": an explicit size, times any other number as the count
  const tok = seg.match(/(\d+(?:\.\d+)?)\s*(ml|millilit(?:re|er)s?|kg|kilos?|kilograms?|g|gm|gms|grams?|l|litres?|liters?|ltrs?)\b/);
  if (tok) {
    const v = parseFloat(tok[1]);
    const u = tok[2];
    const size = /^m/.test(u) ? { value: v / 1000, unit: "l" as const } : /^k/.test(u) ? { value: v, unit: "kg" as const } : /^g/.test(u) ? { value: v / 1000, unit: "kg" as const } : { value: v, unit: "l" as const };
    const times = readNumber(seg.replace(tok[0], " ")) ?? 1;
    return { value: size.value * times, unit: size.unit };
  }
  const n = readNumber(seg);
  if (/\b(\d+(?:\.\d+)?)\s*(ml|millilit(re|er)s?)\b/.test(seg) || /\bml\b/.test(seg)) return { value: (n ?? 500) / 1000, unit: "l" };
  if (/\b(litres?|liters?|ltrs?|l)\b/.test(seg)) return { value: n ?? 1, unit: "l" };
  if (/\b(kg|kilos?|kilograms?)\b/.test(seg)) return { value: n ?? 1, unit: "kg" };
  if (/\b(\d+)\s*(g|gm|gms|grams?)\b/.test(seg)) return { value: (n ?? 200) / 1000, unit: "kg" };
  if (n !== null) return { value: n, unit: "count" };
  return null;
}

/** Split an amount into the product's sizes, largest first. */
function fit(p: P, amount: { value: number; unit: "l" | "kg" | "count" } | null): { variant: string; qty: number }[] {
  const sized = p.variants.map((v) => ({ v, s: sizeOf(v.id) })).filter((x) => x.s.kind !== "count");
  if (!amount || amount.unit === "count" || sized.length === 0 || sized[0].s.kind !== amount.unit) {
    // "two paneer", "a ghee": that many of the everyday size (1 litre for milk, otherwise the smallest)
    const def = (p.category === "milk" ? p.variants.find((v) => v.id === "1l") : undefined) ?? p.variants[0];
    const qty = Math.max(1, Math.round(amount?.value ?? 1));
    return [{ variant: def.id, qty }];
  }
  const sizes = [...sized].sort((a, b) => b.s.amount - a.s.amount);
  let left = Math.round(amount.value * 1000) / 1000;
  const out: { variant: string; qty: number }[] = [];
  for (const { v, s } of sizes) {
    const q = Math.floor((left + 1e-9) / s.amount);
    if (q > 0) {
      out.push({ variant: v.id, qty: q });
      left = Math.round((left - q * s.amount) * 1000) / 1000;
    }
  }
  if (left > 0.001) {
    const smallest = sizes[sizes.length - 1];
    const q = Math.ceil(left / smallest.s.amount);
    const ex = out.find((o) => o.variant === smallest.v.id);
    if (ex) ex.qty += q;
    else out.push({ variant: smallest.v.id, qty: q });
  }
  return out.length ? out : [{ variant: sizes[sizes.length - 1].v.id, qty: 1 }];
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export function parseOrder(text: string, catalogue: P[]): ParsedOrder {
  const t = ` ${text.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9.\s,&+]/g, " ").replace(/\s+/g, " ")} `;
  let day = tomorrow();
  let dayNote: string | undefined;
  if (/\btoday\b/.test(t)) dayNote = "Today's deliveries have already left, so this is set for tomorrow morning.";
  const wd = WEEKDAYS.findIndex((w) => t.includes(` ${w}`));
  if (wd >= 0) {
    for (let i = 1; i <= 7; i++) {
      const d = addDays(new Date(), i);
      if (d.getDay() === wd) {
        day = ymd(d);
        break;
      }
    }
  }
  const slot: "morning" | "evening" = /\bevening|night|after ?noon\b/.test(t) ? "evening" : "morning";

  const cleaned = t
    .replace(/\b(please|pls|kindly|i want|i need|i would like|id like|can you|could you|send|deliver|get me|order|add|buy|me|for|tomorrow|today|morning|evening|night|of|some|in|the|at|on|by|next|this|my|our|to|us|bottles? of|packets? of)\b/g, " ")
    .replace(new RegExp(`\\b(${WEEKDAYS.join("|")})\\b`, "g"), " ");
  const segments = cleaned
    .split(/,|&|\+|\band\b|\bplus\b|\balso\b|\bwith\b|\bmattrum\b|\baur\b/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const lines: ParsedLine[] = [];
  const unknown: string[] = [];
  for (const seg of segments) {
    const hit = PRODUCT_WORDS.find(([re]) => re.test(seg));
    if (!hit) {
      if (/[a-z]{3,}/.test(seg) && !/^(every ?day|daily|alternate days?|weekly|every week)$/.test(seg)) unknown.push(seg);
      continue;
    }
    const p = catalogue.find((x) => x.slug === hit[1] && x.active !== false);
    if (!p) continue;
    const parts = fit(p, readAmount(seg));
    for (const part of parts) {
      const v = p.variants.find((x) => x.id === part.variant)!;
      const ex = lines.find((l) => l.slug === p.slug && l.variant === v.id);
      if (ex) ex.qty += part.qty;
      else lines.push({ slug: p.slug, variant: v.id, qty: part.qty, name: p.name, label: v.label, price: v.price, heard: seg });
    }
  }

  let subscribe: ParsedOrder["subscribe"];
  const freq = /\b(every ?day|daily|each day|dhinamum|roj)\b/.test(t) ? "daily" : /\balternate\b/.test(t) ? "alternate" : /\b(weekly|every week)\b/.test(t) ? "weekly" : null;
  const milk = lines.find((l) => catalogue.find((p) => p.slug === l.slug)?.subscribable);
  if (freq && milk) {
    const litres = lines
      .filter((l) => l.slug === milk.slug)
      .reduce((s, l) => {
        const z = sizeOf(l.variant);
        return z.kind === "l" ? s + z.amount * l.qty : s;
      }, 0);
    subscribe = { frequency: freq, slug: milk.slug, litres: litres || undefined };
  }

  const confidence = segments.length ? Math.min(0.97, 0.45 + (lines.length / Math.max(1, segments.length)) * 0.5 - unknown.length * 0.08) : 0;
  return { lines, unknown, day, dayNote, slot, subscribe, confidence: Math.max(0, confidence) };
}

export const ORDER_EXAMPLES = [
  "Two litres of A2 milk and one paneer",
  "Half litre buffalo milk, 1 kg curd and a ghee for Sunday",
  "Rendu litre paal and oru thayir",
  "1.5 litres of toned milk every day",
  "Four buttermilk and a mango lassi in the evening",
];

/* ------------------------------------------------------------------ */
/* 2. Questions about a product                                        */
/* Production: retrieval-augmented answers from the product database   */
/* with an LLM, falling back to support.                               */
/* ------------------------------------------------------------------ */

const RECIPES: Record<string, string[]> = {
  milk: ["Filter coffee and masala chai", "Rice payasam with cardamom", "Set your own curd overnight", "Badam milk for the evening"],
  curd: ["Curd rice with a mustard-seed tempering", "Raita with cucumber and roasted cumin", "Mor kuzhambu", "Overnight-marinated paneer tikka"],
  paneer: ["Paneer butter masala", "Palak paneer", "Paneer tikka on the grill", "Paneer bhurji for breakfast"],
  butter: ["Ghee rice and dal tadka", "Pongal with a spoon of ghee on top", "Mysore pak for Deepavali", "Butter on hot dosa"],
  cream: ["Malai kofta gravy", "Whipped cream on fruit", "Creamy tomato soup", "Rabri"],
  treats: ["Chill and serve as is", "Blend with ice for a thicker shake", "Pair with a slice of cake", "Freeze into popsicles"],
};

export function productQuestions(p: P): string[] {
  const base = ["How long does it last?", "How should I store it?", "What can I make with it?"];
  if (p.category === "milk") return ["Is it good for kids?", "Do I need to boil it?", "Is it A2?", ...base, "Can I subscribe?"];
  if (p.slug === "a2-bilona-ghee") return ["How is bilona ghee made?", "Is it lactose free?", ...base];
  if (p.category === "curd") return ["Is it good for digestion?", "Is it lactose free?", ...base];
  if (p.category === "paneer") return ["Is it vegetarian?", "How much protein?", ...base];
  return ["Is there added sugar?", "Is it good for kids?", ...base];
}

const has = (q: string, ...w: string[]) => w.some((x) => q.includes(x));

export function productAnswer(p: P, question: string): { text: string; topic: string } {
  const q = question.toLowerCase();
  const n = (label: string) => p.nutrition.find((x) => x.label.toLowerCase().includes(label))?.value;
  const best = fmtDay(ymd(addDays(new Date(), 1 + Math.min(p.expiresInDays, 400))));
  if (has(q, "kid", "child", "baby", "toddler", "infant"))
    return {
      topic: "kids",
      text:
        p.category === "milk"
          ? `Yes, many families give ${p.name} to children every day. For babies under one year, or any allergy, please ask your paediatrician first.`
          : n("added sugar")
            ? `It's a treat: ${n("added sugar")} of added sugar ${p.nutritionBasis}. Fine now and then for children over two.`
            : `Yes, it's made only from milk${p.category === "curd" ? " and live cultures" : ""}. For allergies or babies under one, check with your doctor first.`,
    };
  if (has(q, "boil", "pasteuri", "raw"))
    return { topic: "boil", text: "It's gently pasteurised (72°C for 15 seconds), so boiling is optional. Many families still boil it once out of habit. It's not homogenised, so the cream rises." };
  if (has(q, "a2", "a1", "casein"))
    return {
      topic: "a2",
      text: p.tags.includes("A2") ? `Yes. ${p.name} comes only from our Gir and Sahiwal cows, which produce the A2 type of beta-casein protein.` : `This one isn't sold as A2. Our A2 products are A2 Desi Cow Milk and A2 Bilona Ghee.`,
    };
  if (has(q, "last", "shelf", "expire", "expiry", "how long", "fresh until", "best before"))
    return { topic: "shelf life", text: `${p.shelfLife}. Today's batch is best before ${best}.` };
  if (has(q, "store", "fridge", "keep", "refrigerat", "freeze"))
    return { topic: "storage", text: p.storage };
  if (has(q, "lactose"))
    return {
      topic: "lactose",
      text:
        p.slug === "a2-bilona-ghee"
          ? "Ghee is almost entirely fat, so it has only traces of lactose. Most people who avoid lactose tolerate it, but check with your doctor."
          : p.category === "curd" || p.slug === "farmhouse-cheese"
            ? "Fermentation uses up much of the lactose, so it's usually easier to digest than milk. It isn't lactose-free, though."
            : "It contains lactose, like all milk. Our curd and buttermilk are easier on the stomach.",
    };
  if (has(q, "digest", "gut", "probiotic"))
    return { topic: "digestion", text: p.category === "curd" ? "Yes, it's set with live cultures, which many people find good for digestion." : "It's simple, fresh dairy with nothing added. For digestion, our curd and buttermilk have live cultures." };
  if (has(q, "vegetarian", "vegan", "rennet", "veg"))
    return { topic: "vegetarian", text: p.category === "paneer" ? "Vegetarian, yes: paneer is set with lemon juice and the cheese with vegetarian (microbial) rennet. Not vegan, as it's dairy." : "Vegetarian, yes. Not vegan, as it's made from milk." };
  if (has(q, "protein", "fat", "calorie", "kcal", "nutrition", "calcium", "carb", "energy"))
    return { topic: "nutrition", text: `${p.nutritionBasis[0].toUpperCase()}${p.nutritionBasis.slice(1)}: ${p.nutrition.map((x) => `${x.label.toLowerCase()} ${x.value}`).join(", ")}.` };
  if (has(q, "sugar", "sweet"))
    return { topic: "sugar", text: n("added sugar") ? `${n("added sugar")} added sugar ${p.nutritionBasis}.` : "No added sugar. Any sweetness is the milk's own." };
  if (has(q, "make", "recipe", "cook", "use it", "dish", "with it"))
    return { topic: "recipes", text: `Ideas: ${(RECIPES[p.category] ?? RECIPES.treats).join(", ")}.` };
  if (has(q, "bilona", "how is", "made", "process"))
    return { topic: "how it's made", text: p.description };
  if (has(q, "subscri", "daily", "every day", "regular"))
    return { topic: "subscription", text: p.subscribable ? "Yes: daily, alternate days, chosen weekdays or monthly. Pause or skip any day before 10 PM." : "This one isn't on subscription, but you can order it any day by 10 PM for the next morning." };
  if (has(q, "price", "cost", "how much", "size", "pack"))
    return { topic: "price", text: p.variants.map((v) => `${v.label}: ${money(v.price)}`).join(" · ") };
  if (has(q, "where", "source", "farm", "from"))
    return { topic: "source", text: `From ${p.source}. Every batch is tested before it's packed.` };
  if (has(q, "preserv", "additive", "chemical", "pure", "adulter", "hormone"))
    return { topic: "purity", text: "Nothing added: no preservatives, no thickeners, no hormones. Every batch passes 12 lab checks before it leaves the farm." };
  if (has(q, "bottle", "glass", "plastic", "pack", "return"))
    return { topic: "packaging", text: "Returnable glass or clay. Rinse it and leave it out with your next delivery; there's no deposit." };
  if (has(q, "stock", "available", "when", "deliver", "arrive"))
    return { topic: "delivery", text: p.stock > 0 ? `In stock. Order by 10 PM and it arrives tomorrow between 5:30 and 7:30 AM.` : "Out of stock today. The next batch is made tomorrow morning." };
  return { topic: "unknown", text: "I don't have that detail in demo mode. Try one of the suggested questions, or ask the main assistant and a person will follow up." };
}

/* ------------------------------------------------------------------ */
/* 3. Predicted usual basket                                           */
/* Production: a next-basket model on order history (frequency,        */
/* recency, day of week).                                              */
/* ------------------------------------------------------------------ */

export function predictBasket(orders: Order[], userId: string) {
  const mine = orders.filter((o) => o.userId === userId && o.status !== "cancelled").slice(0, 30);
  if (mine.length < 3) return [];
  const count = new Map<string, { n: number; variants: Map<string, number>; qty: number[] }>();
  mine.forEach((o) =>
    o.lines.forEach((l) => {
      const c = count.get(l.slug) ?? { n: 0, variants: new Map<string, number>(), qty: [] as number[] };
      c.n++;
      c.variants.set(l.variant, (c.variants.get(l.variant) ?? 0) + 1);
      c.qty.push(l.qty);
      count.set(l.slug, c);
    }),
  );
  return [...count.entries()]
    .map(([slug, c]) => {
      const variant = [...c.variants.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const qty = c.qty.sort((a, b) => a - b)[Math.floor(c.qty.length / 2)];
      return { slug, variant, qty, likelihood: c.n / mine.length };
    })
    .filter((x) => x.likelihood >= 0.2)
    .sort((a, b) => b.likelihood - a.likelihood)
    .slice(0, 4);
}

/* ------------------------------------------------------------------ */
/* 4. Arrival time                                                     */
/* Production: routing API with live traffic and the rider's GPS.       */
/* ------------------------------------------------------------------ */

export function eta(order: Order, db: DB): { label: string; stop: number; of: number; ahead: number } | null {
  if (order.status === "cancelled" || order.status === "delivered") return null;
  if (order.deliveryDate !== today() && order.deliveryDate !== tomorrow()) return null;
  const run = db.orders.filter((x) => x.staffId === order.staffId && x.deliveryDate === order.deliveryDate && x.status !== "cancelled");
  const route = optimiseRoute(
    HUB,
    run.map((x) => ({ lat: x.address.lat, lng: x.address.lng, id: x.id, done: x.status === "delivered" })),
  );
  const idx = route.findIndex((x) => x.id === order.id);
  if (idx < 0) return null;
  const minutes = 5 * 60 + 45 + idx * 7 + (order.slot === "evening" ? 12 * 60 : 0);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const label = `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  return { label, stop: idx + 1, of: route.length, ahead: route.slice(0, idx).filter((x) => !x.done).length };
}

/* ------------------------------------------------------------------ */
/* 5. Ask your data (admin)                                            */
/* Production: an LLM that writes SQL against MySQL (text-to-SQL), with */
/* read-only access and the query shown for checking.                  */
/* ------------------------------------------------------------------ */

export const DATA_QUESTIONS = [
  "What was revenue last week?",
  "Which product sells the most?",
  "How much milk do we need tomorrow?",
  "Who are our top customers?",
  "What are customers complaining about?",
  "Which batches failed quality checks?",
  "How many subscriptions are paused?",
  "Which area orders the most?",
  "What's low on stock?",
  "How much cash will riders collect today?",
];

export type DataAnswer = { text: string; rows?: [string, string][]; query: string };

export function askData(question: string, db: DB, catalogue: P[]): DataAnswer {
  const q = question.toLowerCase();
  const live = db.orders.filter((o) => o.status !== "cancelled");
  const t = today();
  const daysAgo = (n: number) => ymd(addDays(new Date(), -n));
  const sum = (xs: Order[]) => xs.reduce((s, o) => s + o.total, 0);
  const name = (id: string) => db.users.find((u) => u.id === id)?.name ?? id;

  if (has(q, "revenue", "sales", "earn", "income", "turnover")) {
    const period = has(q, "today") ? 0 : has(q, "yesterday") ? 1 : has(q, "month", "30") ? 30 : 7;
    const from = period === 1 ? daysAgo(1) : daysAgo(Math.max(0, period - 1));
    const to = period === 1 ? daysAgo(1) : t;
    const xs = live.filter((o) => o.deliveryDate >= from && o.deliveryDate <= to);
    const label = period === 0 ? "today" : period === 1 ? "yesterday" : period === 30 ? "in the last 30 days" : "in the last 7 days";
    return {
      text: `Revenue ${label}: ${money(sum(xs))} from ${xs.length} orders (average ${money(xs.length ? sum(xs) / xs.length : 0)} per order).`,
      query: `SELECT SUM(total), COUNT(*) FROM orders WHERE delivery_date BETWEEN '${from}' AND '${to}' AND status <> 'cancelled';`,
    };
  }
  if (has(q, "sell", "best", "popular", "top product", "most ordered")) {
    const m = new Map<string, { qty: number; rev: number }>();
    live.filter((o) => o.deliveryDate >= daysAgo(29)).forEach((o) => o.lines.forEach((l) => {
      const c = m.get(l.name) ?? { qty: 0, rev: 0 };
      c.qty += l.qty;
      c.rev += l.qty * l.price;
      m.set(l.name, c);
    }));
    const rows = [...m.entries()].sort((a, b) => b[1].rev - a[1].rev).slice(0, 5);
    return {
      text: `${rows[0]?.[0]} leads the last 30 days with ${money(rows[0]?.[1].rev ?? 0)} in sales.`,
      rows: rows.map(([n, c]) => [n, `${money(c.rev)} · ${c.qty} units`]),
      query: "SELECT p.name, SUM(i.qty*i.price) AS revenue FROM order_items i JOIN products p USING(product_id) GROUP BY p.name ORDER BY revenue DESC LIMIT 5;",
    };
  }
  if (has(q, "milk", "demand", "forecast", "tomorrow", "litre", "need")) {
    const fc = forecastDemand(7);
    return {
      text: `About ${fc.forecast[0].litres} litres tomorrow (likely range ${fc.forecast[0].lo}–${fc.forecast[0].hi} L). ${fc.peakDay}s are the busiest day of the week.`,
      rows: fc.forecast.slice(0, 7).map((d) => [fmtDay(d.date), `${d.litres} L`]),
      query: "-- forecast model: day-of-week factors × trend on daily litres from orders",
    };
  }
  if (has(q, "customer", "who", "loyal", "spend")) {
    const m = new Map<string, number>();
    live.filter((o) => o.deliveryDate >= daysAgo(29)).forEach((o) => m.set(o.userId, (m.get(o.userId) ?? 0) + o.total));
    const rows = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return {
      text: `${name(rows[0][0])} is the top customer this month, at ${money(rows[0][1])}.`,
      rows: rows.map(([id, v]) => [name(id), money(v)]),
      query: "SELECT u.name, SUM(o.total) FROM orders o JOIN users u USING(user_id) WHERE o.delivery_date >= CURDATE() - INTERVAL 30 DAY GROUP BY u.name ORDER BY 2 DESC LIMIT 5;",
    };
  }
  if (has(q, "complain", "issue", "problem", "feedback", "review", "unhappy")) {
    const fb = summariseFeedback(db.reviews);
    return {
      text: `${Math.round(fb.positiveShare * 100)}% of ${fb.total} reviews are positive. The most common problems: ${fb.issues.slice(0, 3).map((i) => `${i.label.toLowerCase()} (${i.count})`).join(", ")}.`,
      rows: fb.issues.map((i) => [i.label, `${i.count} review${i.count > 1 ? "s" : ""}`]),
      query: "-- sentiment model over reviews.text, grouped by issue keywords",
    };
  }
  if (has(q, "quality", "batch", "test", "lab", "failed")) {
    const bad = db.quality.filter((x) => qualityFlags(x).length);
    return {
      text: bad.length ? `${bad.length} batches were flagged in the last 10 days. Each was held for a re-test.` : "No batches flagged in the last 10 days.",
      rows: bad.map((b) => [b.batch, qualityFlags(b)[0]]),
      query: "SELECT batch, fat, snf, temp_c, tpc FROM quality_tests WHERE snf < 8.5 OR temp_c > 4.5 OR tpc > 100000;",
    };
  }
  if (has(q, "subscription", "paused", "subscribers")) {
    const act = db.subscriptions.filter((s) => s.status === "active").length;
    const pau = db.subscriptions.filter((s) => s.status === "paused");
    return {
      text: `${act} active and ${pau.length} paused subscriptions.`,
      rows: pau.map((s) => [name(s.userId), s.pausedUntil ? `until ${fmtDay(s.pausedUntil)}` : "paused"]),
      query: "SELECT status, COUNT(*) FROM subscriptions GROUP BY status;",
    };
  }
  if (has(q, "area", "where", "locality", "region", "zone")) {
    const m = new Map<string, number>();
    live.filter((o) => o.deliveryDate >= daysAgo(29)).forEach((o) => m.set(o.address.area, (m.get(o.address.area) ?? 0) + 1));
    const rows = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return {
      text: `${rows[0][0]} places the most orders this month (${rows[0][1]}).`,
      rows: rows.map(([a, n]) => [a, `${n} orders`]),
      query: "SELECT area, COUNT(*) FROM orders WHERE delivery_date >= CURDATE() - INTERVAL 30 DAY GROUP BY area ORDER BY 2 DESC;",
    };
  }
  if (has(q, "stock", "inventory", "run out", "low")) {
    const low = catalogue.filter((p) => p.active !== false && p.stock <= 15);
    return {
      text: low.length ? `${low.length} products are low or out of stock.` : "Nothing is below 15 units.",
      rows: low.map((p) => [p.name, `${p.stock} left`]),
      query: "SELECT name, stock FROM products WHERE stock <= 15;",
    };
  }
  if (has(q, "cash", "cod", "collect")) {
    const cod = live.filter((o) => o.deliveryDate === t && o.payment.method === "cod" && o.payment.status !== "paid");
    return {
      text: `${money(sum(cod))} in cash still to collect today, across ${cod.length} stops.`,
      rows: cod.map((o) => [name(o.userId), money(o.total)]),
      query: "SELECT SUM(total) FROM orders o JOIN payments p USING(order_id) WHERE delivery_date = CURDATE() AND method='cod' AND p.status <> 'paid';",
    };
  }
  if (has(q, "deliver", "pending", "route", "rider", "staff")) {
    const todays = live.filter((o) => o.deliveryDate === t);
    const done = todays.filter((o) => o.status === "delivered").length;
    return { text: `${done} of ${todays.length} deliveries done today.`, query: "SELECT status, COUNT(*) FROM orders WHERE delivery_date = CURDATE() GROUP BY status;" };
  }
  return {
    text: "In demo mode I can answer questions about revenue, best sellers, tomorrow's milk, top customers, complaints, quality, subscriptions, areas, stock and cash to collect.",
    query: "-- no matching question",
  };
}

/* ------------------------------------------------------------------ */
/* 6. Small helpers: substitutes and product copy                      */
/* ------------------------------------------------------------------ */

const SUBSTITUTE: Record<string, string[]> = {
  "farmhouse-cheese": ["malai-paneer", "cultured-butter"],
  "strawberry-yogurt": ["clay-pot-curd", "mango-lassi"],
  "malai-paneer": ["farmhouse-cheese", "fresh-malai"],
  "buffalo-milk": ["a2-desi-cow-milk", "farm-toned-milk"],
  "a2-desi-cow-milk": ["farm-toned-milk", "buffalo-milk"],
  "farm-toned-milk": ["a2-desi-cow-milk"],
  "clay-pot-curd": ["strawberry-yogurt", "neer-mor"],
  "a2-bilona-ghee": ["cultured-butter"],
  "cultured-butter": ["a2-bilona-ghee", "fresh-malai"],
  "mango-lassi": ["cocoa-milkshake", "neer-mor"],
};

export function substituteFor(slug: string, catalogue: P[]) {
  const id = (SUBSTITUTE[slug] ?? []).find((s) => (catalogue.find((p) => p.slug === s)?.stock ?? 0) > 0);
  return id ? catalogue.find((p) => p.slug === id) : undefined;
}

/** "Write with AI" for the admin's new-product form. Production: an LLM with the brand's tone guide. */
export function writeDescription(name: string, category: string) {
  const n = name.trim() || "This product";
  const lines: Record<string, string> = {
    milk: `${n}, from our own herd near Kanchipuram, chilled to 4°C within twenty minutes and bottled in glass the same morning.`,
    curd: `${n}, set overnight from our whole milk with our own culture. Thick, mildly sour, and best within four days.`,
    paneer: `${n}, made fresh from whole milk each morning. No starch, no preservatives, just milk and patience.`,
    butter: `${n}, slow-churned in small batches from ripened cream. Rich, golden and made the old way.`,
    cream: `${n}, skimmed from the morning's milk and jarred straight away. Nothing added.`,
    treats: `${n}, made in our dairy kitchen with our own milk and real ingredients. Less sugar than the shop kind.`,
  };
  return { short: `Fresh ${n.toLowerCase()} from the Ksheera farm.`, description: lines[category] ?? lines.treats };
}

/** Simulated weather for tomorrow, used to nudge buttermilk and lassi stock. */
export function weatherNudge() {
  const temp = 34;
  return { temp, text: `Tomorrow looks hot (${temp}°C, simulated forecast). On days above 33°C, buttermilk and lassi orders rise about 20%: plan extra.` };
}
