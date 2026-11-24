/**
 * Ksheera Assistant: the chatbot's brain, for the prototype.
 *
 * AI IS NOT CONNECTED. The assistant matches what the customer types against
 * a fixed list of sample questions (intents) below and returns the answer
 * written for that intent. Some answers read live data from the store
 * (prices, the customer's last order, their subscriptions) so they feel real.
 *
 * In the full system, `reply()` sends the message (plus the same context) to
 * an NLP model or AI API through the Flask backend, and this list becomes
 * its training examples and fallback.
 */

import { site } from "@/config/site";
import { liveCatalogue } from "@/lib/store";
import { recommend } from "@/lib/ai";
import { findProduct, parseOrder, productAnswer, type ParsedOrder } from "@/lib/ai-plus";
import { fmtDay, money, relDay } from "@/lib/format";
import type { DB, User } from "@/lib/types";

export type ChatLink = { href: string; label: string };
export type ChatAnswer = {
  text: string;
  links?: ChatLink[];
  products?: string[];
  chips?: string[];
  escalate?: boolean;
  order?: ParsedOrder;
};

type Ctx = { db: DB | null; user: User | null; message: string };

type Intent = {
  id: string;
  /** Example questions: shown as suggestions, and matched as whole phrases. */
  examples: string[];
  /** Words that point to this intent. */
  keywords: string[];
  answer: (ctx: Ctx) => ChatAnswer;
};

const STATUS_WORDS: Record<string, string> = {
  placed: "placed and waiting to be packed",
  packed: "packed at the hub",
  out_for_delivery: "out for delivery",
  delivered: "delivered",
  cancelled: "cancelled",
};

export const INTENTS: Intent[] = [
  {
    id: "greeting",
    examples: ["Hi", "Hello", "Vanakkam"],
    keywords: ["hi", "hello", "hey", "vanakkam", "namaste", "morning", "evening"],
    answer: ({ user }) => ({
      text: `Vanakkam${user ? `, ${user.name.split(" ")[0]}` : ""}! I'm the ${site.name} assistant. I can help with prices, delivery times, subscriptions, payments and your orders. What would you like to know?`,
      chips: ["When will my milk arrive?", "What is A2 milk?", "How do I pause my subscription?"],
    }),
  },
  {
    id: "delivery_time",
    examples: ["When will my milk arrive?", "What time do you deliver?"],
    keywords: ["when", "time", "arrive", "deliver", "delivery", "morning", "early", "reach", "slot"],
    answer: () => ({
      text: `Morning deliveries reach your door between 5:30 and 7:30 AM, every day of the year, including Sundays and holidays. There is also an evening slot from 5 to 7 PM.\n\nOrder by ${site.orderCutoff} for the next morning.`,
      chips: ["Do you deliver to Velachery?", "Track my order"],
    }),
  },
  {
    id: "delivery_area",
    examples: ["Do you deliver to Velachery?", "Which areas do you cover?"],
    keywords: ["area", "areas", "pincode", "location", "cover", "velachery", "adyar", "tambaram", "omr", "anna", "nagar", "where", "city", "deliver to"],
    answer: ({ message }) => {
      const m = message.toLowerCase();
      const far = ["tambaram", "avadi", "ponneri", "chengalpattu", "kanchipuram"].find((a) => m.includes(a));
      return {
        text: far
          ? `We don't deliver to ${far[0].toUpperCase() + far.slice(1)} yet. We're adding new areas every month: leave your pincode on the sign-up page and we'll tell you first.`
          : `Yes. We deliver across central and south Chennai: Adyar, Besant Nagar, Thiruvanmiyur, Velachery, Perungudi, OMR up to Sholinganallur, Mylapore, Alwarpet, T. Nagar, Nungambakkam, Anna Nagar, Kilpauk and nearby. Enter your pincode at checkout to confirm.`,
        links: [{ href: "/register", label: "Create an account" }],
      };
    },
  },
  {
    id: "a2",
    examples: ["What is A2 milk?", "A2 vs regular milk"],
    keywords: ["a2", "a1", "desi", "gir", "sahiwal", "beta", "casein", "difference", "breed"],
    answer: () => ({
      text: "A2 milk comes from cows that produce only the A2 type of beta-casein protein. Indian breeds like our Gir and Sahiwal cows naturally do. Many people find it gentler to digest than milk from crossbred cows, which contains A1 protein too.\n\nOur A2 milk is unhomogenised and bottled in glass the morning it's milked.",
      products: ["a2-desi-cow-milk", "a2-bilona-ghee"],
    }),
  },
  {
    id: "price",
    examples: ["How much is a litre of milk?", "What's the price of paneer?"],
    keywords: ["price", "cost", "rate", "how much", "rs", "rupees", "₹", "cheap", "expensive", "charges"],
    answer: ({ db, message }) => {
      const cat = liveCatalogue(db);
      const m = message.toLowerCase();
      const hit = cat.find(
        (p) => m.includes(p.name.toLowerCase()) || p.slug.split("-").some((w) => w.length > 3 && m.includes(w)),
      );
      if (hit) {
        return {
          text: `${hit.name}: ${hit.variants.map((v) => `${v.label} ${money(v.price)}`).join(", ")}.${hit.stock <= 0 ? " It's out of stock today, but back tomorrow." : ""}`,
          products: [hit.slug],
        };
      }
      const milk = cat.filter((p) => p.category === "milk");
      return {
        text: `Our milk prices for a 1 litre glass bottle:\n${milk.map((p) => `• ${p.name}: ${money(p.variants.find((v) => v.id === "1l")?.price ?? p.variants[0].price)}`).join("\n")}\n\nDelivery is free on orders above ${money(site.freeDeliveryAbove)}, otherwise ${money(site.deliveryFee)}. Subscriptions have no delivery fee.`,
        links: [{ href: "/shop", label: "See all prices" }],
      };
    },
  },
  {
    id: "subscribe",
    examples: ["How do subscriptions work?", "I want daily milk"],
    keywords: ["subscribe", "subscription", "daily", "weekly", "monthly", "alternate", "regular", "every day", "plan"],
    answer: () => ({
      text: "Pick your milk, quantity and how often: daily, alternate days, chosen days of the week, or once a month. We deliver automatically and bill you once a month. You can pause, skip a day or change quantity until 10 PM the night before.\n\nTip: the subscription page estimates how much milk your family usually needs from your past orders.",
      links: [{ href: "/subscribe", label: "Start a subscription" }],
    }),
  },
  {
    id: "pause",
    examples: ["How do I pause my subscription?", "I'm travelling next week"],
    keywords: ["pause", "stop", "vacation", "travel", "travelling", "holiday", "skip", "away", "out of town", "resume", "hold"],
    answer: ({ db, user }) => {
      const subs = db && user ? db.subscriptions.filter((s) => s.userId === user.id && s.status !== "cancelled") : [];
      return {
        text: `Go to My account → Subscriptions and tap Pause. Choose a date to resume, or skip just tomorrow. Changes made before 10 PM apply to the next morning.${subs.length ? `\n\nYou have ${subs.length} subscription${subs.length > 1 ? "s" : ""} right now: ${subs.map((s) => `${liveCatalogue(db).find((p) => p.slug === s.slug)?.name} (${s.status})`).join(", ")}.` : ""}`,
        links: [{ href: "/account?tab=subscriptions", label: "Manage subscriptions" }],
      };
    },
  },
  {
    id: "change_qty",
    examples: ["Change my milk quantity", "Increase to 2 litres"],
    keywords: ["change", "increase", "reduce", "decrease", "more", "less", "quantity", "litres", "extra", "modify"],
    answer: () => ({
      text: "In My account → Subscriptions, use the + and − buttons next to each subscription. The new quantity starts from the next delivery if you change it before 10 PM. For a one-off extra bottle, just place a regular order for tomorrow.",
      links: [{ href: "/account?tab=subscriptions", label: "Change quantity" }],
    }),
  },
  {
    id: "track",
    examples: ["Track my order", "Where is my order?"],
    keywords: ["track", "where", "status", "order", "my order", "arrived", "reached", "not received", "come"],
    answer: ({ db, user }) => {
      if (!user) {
        return {
          text: "Sign in and I can tell you exactly where your order is. You can also see every order and its status under My account.",
          links: [{ href: "/login", label: "Sign in" }],
        };
      }
      const last = db?.orders.find((o) => o.userId === user.id);
      if (!last) return { text: "You haven't placed an order yet. Shall I show you our bestsellers?", links: [{ href: "/shop", label: "Shop now" }] };
      const staff = db?.users.find((u) => u.id === last.staffId);
      return {
        text: `Your latest order ${last.id} (${last.lines.map((l) => l.name).join(", ")}) is ${STATUS_WORDS[last.status]}. Delivery: ${relDay(last.deliveryDate)}, ${last.slot === "morning" ? "5:30 to 7:30 AM" : "5 to 7 PM"}.${last.status === "out_for_delivery" && staff ? ` ${staff.name.split(" ")[0]} is on the way.` : ""}`,
        links: [{ href: `/account/order?id=${last.id}`, label: "See tracking" }],
      };
    },
  },
  {
    id: "payment",
    examples: ["Which payment methods do you accept?", "Can I pay cash?"],
    keywords: ["pay", "payment", "upi", "gpay", "phonepe", "paytm", "card", "credit", "debit", "cash", "cod", "bill", "invoice"],
    answer: () => ({
      text: "You can pay by UPI (GPay, PhonePe, Paytm and others), debit or credit card, or cash on delivery. Subscriptions are billed once a month, and every order has a downloadable invoice in My account.",
      chips: ["How do subscriptions work?"],
    }),
  },
  {
    id: "cancel",
    examples: ["Cancel my order"],
    keywords: ["cancel", "cancellation", "dont want", "wrong order"],
    answer: () => ({
      text: "You can cancel any order from My account until it's packed (about 4:30 AM on the delivery day). Prepaid orders are refunded to the same UPI or card within 2 to 3 working days.",
      links: [{ href: "/account", label: "My orders" }],
    }),
  },
  {
    id: "complaint",
    examples: ["My milk was sour", "The bottle leaked"],
    keywords: ["sour", "spoiled", "spoilt", "bad", "smell", "leak", "leaked", "broken", "damaged", "complaint", "refund", "missing", "wrong", "problem", "issue", "curdled"],
    answer: () => ({
      text: "I'm sorry about that. This needs a person, so I've marked it for our support team: they'll call you within 30 minutes (6 AM to 10 PM) and replace or refund it. Please keep the bottle so we can check the batch.",
      escalate: true,
      links: [{ href: `tel:${site.phone.tel}`, label: `Call ${site.phone.display}` }],
    }),
  },
  {
    id: "storage",
    examples: ["How long does the milk last?", "Should I boil A2 milk?"],
    keywords: ["shelf", "life", "last", "store", "storage", "boil", "fridge", "refrigerate", "expire", "expiry", "days"],
    answer: () => ({
      text: "Keep milk at 4°C and use it within 3 days (buffalo milk within 2). It's pasteurised, so boiling is optional, but many families still boil it once out of habit. Curd keeps 4 days, paneer 3 days in water, and ghee up to 9 months at room temperature.",
    }),
  },
  {
    id: "purity",
    examples: ["Is your milk adulterated?", "Do you use hormones?"],
    keywords: ["organic", "hormone", "hormones", "antibiotic", "antibiotics", "adulteration", "adulterated", "preservative", "preservatives", "pure", "water", "test", "tested", "quality", "safe"],
    answer: () => ({
      text: "No hormones, no preservatives, nothing added. Every batch goes through 12 checks before it's bottled: fat, SNF, temperature, acidity, bacterial count and adulterant strips among them. The readings are recorded and our system flags anything unusual for a re-test, but a person always makes the final call.",
      links: [{ href: "/farm", label: "How we test" }],
    }),
  },
  {
    id: "bottles",
    examples: ["Do I need to return the glass bottles?"],
    keywords: ["bottle", "bottles", "glass", "return", "deposit", "pot", "clay", "plastic", "packaging"],
    answer: () => ({
      text: "Yes please! Rinse the glass bottles and clay pots and leave them out with your next delivery. There's no deposit. We wash and sterilise them at 85°C and use each bottle about 30 times.",
    }),
  },
  {
    id: "recommend",
    examples: ["Suggest something for me", "What should I try?"],
    keywords: ["suggest", "recommend", "recommendation", "try", "best", "popular", "new", "what should", "good for"],
    answer: ({ db, user }) => {
      const history = db && user ? db.orders.filter((o) => o.userId === user.id) : [];
      const recs = recommend({ history, cart: db?.cart.map((c) => c.slug), viewed: db?.viewed, n: 3 });
      return {
        text: user
          ? `Based on what you usually order, you might like these. ${recs[0]?.reason ?? ""}.`
          : "Our most-loved products this week. Sign in and I'll tailor suggestions to your past orders.",
        products: recs.map((r) => r.slug),
      };
    },
  },
  {
    id: "cutoff",
    examples: ["What's the last time to order for tomorrow?"],
    keywords: ["cutoff", "cut off", "last time", "latest", "deadline", "tomorrow", "tonight", "before"],
    answer: () => ({
      text: `Orders and subscription changes made before ${site.orderCutoff} arrive the next morning between 5:30 and 7:30 AM. After that, they go to the following day.`,
    }),
  },
  {
    id: "kids",
    examples: ["Is it good for kids?", "Lactose intolerant?"],
    keywords: ["kid", "kids", "child", "children", "baby", "infant", "lactose", "intolerant", "allergy", "diabetic", "health", "pregnant"],
    answer: () => ({
      text: "Many families give our A2 and toned milk to children every day. For infants, allergies, lactose intolerance or any medical condition, please check with your doctor first: I can't give medical advice. Our buttermilk and curd are naturally lower in lactose than milk.",
    }),
  },
  {
    id: "human",
    examples: ["Talk to a person"],
    keywords: ["human", "person", "agent", "call", "phone", "support", "customer care", "speak", "talk", "contact", "number", "email"],
    answer: () => ({
      text: `Our team is available from 6 AM to 10 PM on ${site.phone.display} and ${site.email}. I've also flagged this chat so someone can follow up.`,
      escalate: true,
      links: [{ href: `tel:${site.phone.tel}`, label: "Call us" }],
    }),
  },
  {
    id: "thanks",
    examples: ["Thanks!"],
    keywords: ["thanks", "thank", "nandri", "great", "ok", "okay", "bye", "cool", "super"],
    answer: () => ({ text: "Happy to help. See you tomorrow morning! 🥛" }),
  },
];

export const STARTER_QUESTIONS = [
  "Add 2 litres of A2 milk and a paneer",
  "When will my milk arrive?",
  "What is A2 milk?",
  "How do I pause my subscription?",
  "Track my order",
  "How much is a litre of milk?",
  "Which payment methods do you accept?",
  "Do you deliver to Velachery?",
  "Suggest something for me",
  "What can I make with paneer?",
  "How long does ghee last?",
  "Is buffalo milk good for kids?",
  "My milk was sour",
];

/** Questions the assistant handles beyond the fixed intents (ordering, recipes, product doubts). */
export const SMART_EXAMPLES = [
  "Add 2 litres of A2 milk and a paneer",
  "Send half litre buffalo milk and 1 kg curd tomorrow",
  "What can I make with paneer?",
  "How long does ghee last?",
  "Is buffalo milk good for kids?",
  "Is curd lactose free?",
];

const ORDER_VERB = /\b(add|order|send|deliver|i want|i need|get me|buy|book|put|need)\b/;
const QTY = /\b(\d+(\.\d+)?\s*(l|ml|kg|g|litres?|liters?)|one|two|three|four|five|half|a|an|oru|rendu|moonu)\b/;
const QUESTION = /^(how|what|is|are|does|do|can|should|why|when|which|where)\b|\?\s*$/;

const norm = (s: string) =>
  ` ${s
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9₹\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;

export type Match = { intent: string; confidence: number; scores: { id: string; score: number }[] };

export function classify(message: string): Match {
  const m = norm(message);
  const scores = INTENTS.map((intent) => {
    let score = 0;
    intent.examples.forEach((ex) => {
      const e = norm(ex);
      if (m === e) score += 6;
      else if (m.includes(e.trim()) || e.includes(m.trim())) score += m.trim().length > 4 ? 3 : 0;
    });
    intent.keywords.forEach((k) => {
      if (m.includes(` ${k} `) || (k.includes(" ") && m.includes(k))) score += k.length > 4 ? 1.3 : 1;
    });
    return { id: intent.id, score };
  }).sort((a, b) => b.score - a.score);
  const [top, second] = scores;
  const margin = top.score - (second?.score ?? 0);
  const confidence = top.score <= 0 ? 0 : Math.min(0.98, 0.42 + top.score * 0.09 + margin * 0.06);
  return { intent: top.score >= 1 ? top.id : "fallback", confidence, scores: scores.slice(0, 3) };
}

export function reply(message: string, db: DB | null, user: User | null): { answer: ChatAnswer; match: Match } {
  const m = message.toLowerCase().trim();
  const cat = liveCatalogue(db);

  // 1. "Add 2 litres of milk and a paneer": an order in plain words.
  if (ORDER_VERB.test(m) || (QTY.test(m) && !QUESTION.test(m))) {
    const parsed = parseOrder(message, cat);
    if (parsed.lines.length && !QUESTION.test(m.replace(/^(can|could) you\b/, ""))) {
      return {
        match: { intent: "order", confidence: parsed.confidence, scores: [] },
        answer: {
          text: "Here's the order as I understood it. Tap Add to cart to confirm, or change anything in the cart.",
          order: parsed,
        },
      };
    }
  }

  // 2. A question about one product: answer from that product's data.
  const product = findProduct(m, cat);
  if (product && QUESTION.test(m)) {
    const a = productAnswer(product, message);
    if (a.topic !== "unknown" && a.topic !== "price") {
      return {
        match: { intent: `product_${a.topic.replace(/\s/g, "_")}`, confidence: 0.88, scores: [] },
        answer: { text: `${product.name}: ${a.text}`, products: [product.slug] },
      };
    }
  }

  const match = classify(message);
  const intent = INTENTS.find((i) => i.id === match.intent);
  if (!intent) {
    return {
      match,
      answer: {
        text: "I'm running in demo mode, so I only understand a set of sample questions for now. Try one of these, or call us and a person will help.",
        chips: STARTER_QUESTIONS.slice(0, 5),
      },
    };
  }
  return { match, answer: intent.answer({ db, user, message }) };
}

export const nextDeliveryText = (day: string) => `${relDay(day)} (${fmtDay(day)})`;
