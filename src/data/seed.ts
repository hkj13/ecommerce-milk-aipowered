import { productBySlug } from "@/data/products";
import { optimiseRoute } from "@/lib/ai";
import { addDays, demoHash, rng, ymd } from "@/lib/format";
import type {
  Address,
  DB,
  LoginEvent,
  Notice,
  Order,
  OrderLine,
  OrderStatus,
  PaymentMethod,
  QualityTest,
  Review,
  Subscription,
  User,
} from "@/lib/types";

/**
 * Sample data for the prototype. Everything is generated from a fixed seed
 * relative to today, so the demo always has yesterday's deliveries, today's
 * route and tomorrow's orders, and looks the same after "Reset demo data".
 */

export const DB_VERSION = 4;

export const DEMO_ACCOUNTS = {
  customer: { email: "priya@example.com", password: "demo123", label: "Customer" },
  admin: { email: "admin@ksheera.example", password: "admin123", label: "Admin" },
  staff: { email: "ravi@ksheera.example", password: "delivery123", label: "Delivery partner" },
} as const;

export const HUB = { name: "Ksheera city hub, Guindy", lat: 13.0067, lng: 80.2206 };

const AREAS: Record<string, { lat: number; lng: number; pin: string; zone: "south" | "central" | "north" }> = {
  Adyar: { lat: 13.0012, lng: 80.2565, pin: "600020", zone: "south" },
  "Besant Nagar": { lat: 12.999, lng: 80.2669, pin: "600090", zone: "south" },
  Thiruvanmiyur: { lat: 12.983, lng: 80.2594, pin: "600041", zone: "south" },
  Velachery: { lat: 12.9815, lng: 80.218, pin: "600042", zone: "south" },
  Perungudi: { lat: 12.9654, lng: 80.2461, pin: "600096", zone: "south" },
  Palavakkam: { lat: 12.9611, lng: 80.2567, pin: "600041", zone: "south" },
  Neelankarai: { lat: 12.9496, lng: 80.2585, pin: "600115", zone: "south" },
  Sholinganallur: { lat: 12.901, lng: 80.2279, pin: "600119", zone: "south" },
  Mylapore: { lat: 13.0368, lng: 80.2676, pin: "600004", zone: "central" },
  Alwarpet: { lat: 13.0336, lng: 80.255, pin: "600018", zone: "central" },
  Royapettah: { lat: 13.054, lng: 80.264, pin: "600014", zone: "central" },
  "T. Nagar": { lat: 13.0418, lng: 80.2341, pin: "600017", zone: "central" },
  Kotturpuram: { lat: 13.0186, lng: 80.2427, pin: "600085", zone: "central" },
  Saidapet: { lat: 13.0213, lng: 80.2231, pin: "600015", zone: "central" },
  Guindy: { lat: 13.0067, lng: 80.2206, pin: "600032", zone: "central" },
  Nungambakkam: { lat: 13.0569, lng: 80.2425, pin: "600006", zone: "north" },
  "Anna Nagar": { lat: 13.085, lng: 80.2101, pin: "600040", zone: "north" },
  Kilpauk: { lat: 13.0827, lng: 80.242, pin: "600010", zone: "north" },
};

const CUSTOMERS: [string, string, string, string][] = [
  // name, email local part, area, street
  ["Priya Raman", "priya", "Adyar", "14, 2nd Main Road, Gandhi Nagar"],
  ["Arjun Mehta", "arjun.m", "Besant Nagar", "7, 4th Avenue"],
  ["Lakshmi Narayanan", "lakshmi.n", "Mylapore", "22, Luz Church Road"],
  ["Karthik Subramanian", "karthik.s", "Velachery", "B-204, Taramani Link Road"],
  ["Fathima Nazeer", "fathima.n", "Royapettah", "9, Peters Road"],
  ["Rohan D'Souza", "rohan.d", "Thiruvanmiyur", "31, Kalakshetra Road"],
  ["Meena Venkatesh", "meena.v", "T. Nagar", "5, Thanikachalam Road"],
  ["Suresh Babu", "suresh.b", "Anna Nagar", "AE-41, 6th Avenue"],
  ["Divya Krishnan", "divya.k", "Alwarpet", "18, C.P. Ramaswamy Road"],
  ["Anand Iyer", "anand.i", "Kotturpuram", "3, Chitra Nagar"],
  ["Nisha Thomas", "nisha.t", "Perungudi", "Flat 12C, Seawards Road"],
  ["Vikram Reddy", "vikram.r", "Nungambakkam", "11, Haddows Road"],
  ["Kavya Shankar", "kavya.s", "Neelankarai", "2, Kapaleeswarar Nagar"],
  ["Harish Kumar", "harish.k", "Saidapet", "40, Jones Road"],
  ["Sangeetha Pillai", "sangeetha.p", "Palavakkam", "6, Beach Road"],
  ["Imran Sheikh", "imran.s", "Kilpauk", "27, Ormes Road"],
  ["Gayathri Rao", "gayathri.r", "Besant Nagar", "15, 2nd Avenue"],
  ["Prakash Natarajan", "prakash.n", "Sholinganallur", "C-501, Rajiv Gandhi Salai"],
  ["Revathi Sundaram", "revathi.s", "Adyar", "8, Kasturba Nagar 3rd Street"],
  ["Ajay Menon", "ajay.m", "Guindy", "12, Race View Colony"],
  ["Shalini Joseph", "shalini.j", "Thiruvanmiyur", "19, Valmiki Street"],
  ["Deepak Chandran", "deepak.c", "Mylapore", "4, Kutchery Road"],
];

/** Customers who used to order often and have gone quiet (for the behaviour insights demo). */
const QUIET = new Set(["karthik.s", "meena.v", "imran.s"]);

const STAFF: [string, string, string][] = [
  ["Ravi Kumar", "ravi", "south"],
  ["Senthil Murugan", "senthil", "central"],
  ["Arun Prakash", "arun", "north"],
];

const BASKETS: string[][] = [
  ["a2-desi-cow-milk", "clay-pot-curd", "malai-paneer", "neer-mor"],
  ["farm-toned-milk", "clay-pot-curd", "cultured-butter"],
  ["buffalo-milk", "clay-pot-curd", "fresh-malai", "a2-bilona-ghee"],
  ["a2-desi-cow-milk", "mango-lassi", "strawberry-yogurt", "cocoa-milkshake"],
  ["farm-toned-milk", "neer-mor", "malai-paneer"],
  ["a2-desi-cow-milk", "a2-bilona-ghee", "farmhouse-cheese", "cultured-butter"],
];

function iso(d: Date, h: number, m: number) {
  const x = new Date(d);
  x.setHours(h, m, 0, 0);
  return x.toISOString();
}

export function createSeed(): DB {
  const r = rng(20261124);
  const now = new Date();
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const jitter = () => (r() - 0.5) * 0.008;

  const created = addDays(now, -120).toISOString();

  const users: User[] = [
    {
      id: "U-ADMIN",
      role: "admin",
      name: "Sharmila",
      email: DEMO_ACCOUNTS.admin.email,
      phone: "+91 90000 00001",
      passwordHash: demoHash(DEMO_ACCOUNTS.admin.password),
      createdAt: created,
    },
  ];

  STAFF.forEach(([name, local, zone], i) => {
    users.push({
      id: `U-STAFF-${i + 1}`,
      role: "staff",
      name,
      email: `${local}@ksheera.example`,
      phone: `+91 90000 1000${i + 1}`,
      passwordHash: demoHash("delivery123"),
      zone,
      createdAt: created,
    });
  });
  const staffForZone = (zone: string) => users.find((u) => u.role === "staff" && u.zone === zone)!.id;

  CUSTOMERS.forEach(([name, local, area, street], i) => {
    const a = AREAS[area];
    const address: Address = {
      line1: street,
      area,
      city: "Chennai",
      pincode: a.pin,
      lat: a.lat + jitter(),
      lng: a.lng + jitter(),
    };
    users.push({
      id: i === 0 ? "U-PRIYA" : `U-C${String(i + 1).padStart(3, "0")}`,
      role: "customer",
      name,
      email: `${local}@example.com`,
      phone: `+91 9${String(8400000000 + Math.floor(r() * 99999999)).slice(0, 9)}`,
      passwordHash: demoHash("demo123"),
      address,
      createdAt: addDays(now, -Math.floor(60 + r() * 300)).toISOString(),
      reminders: { delivery: true, subscription: true },
    });
  });

  const customers = users.filter((u) => u.role === "customer");

  // ---------------------------------------------------------------- orders
  const orders: Order[] = [];
  let seq = 4100;

  const makeLines = (basket: string[], big = false): OrderLine[] => {
    const n = 1 + Math.floor(r() * (big ? 4 : 2.6));
    const chosen = new Set<string>();
    chosen.add(basket[0]);
    while (chosen.size < Math.min(n, basket.length)) chosen.add(pick(basket));
    return [...chosen].map((slug) => {
      const p = productBySlug(slug)!;
      const v = p.variants[Math.floor(r() * p.variants.length)];
      const qty = big ? 6 + Math.floor(r() * 10) : 1 + (r() < 0.25 ? 1 : 0);
      return { slug, variant: v.id, name: p.name, label: v.label, qty, price: v.price };
    });
  };

  const statusFor = (offset: number): OrderStatus => {
    if (offset < 0) return r() < 0.03 ? "cancelled" : "delivered";
    if (offset === 0) return r() < 0.22 ? "delivered" : r() < 0.2 ? "packed" : "out_for_delivery";
    return "placed";
  };

  const timelineFor = (status: OrderStatus, placed: string, day: Date) => {
    const t: { status: OrderStatus; at: string }[] = [{ status: "placed", at: placed }];
    if (status === "cancelled") return [...t, { status: "cancelled" as const, at: iso(addDays(day, -1), 22, 40) }];
    if (status === "placed") return t;
    t.push({ status: "packed", at: iso(day, 4, 55) });
    if (status === "packed") return t;
    t.push({ status: "out_for_delivery", at: iso(day, 5, 35) });
    if (status === "out_for_delivery") return t;
    t.push({ status: "delivered", at: iso(day, 6, Math.floor(r() * 50)) });
    return t;
  };

  customers.forEach((c, ci) => {
    const local = c.email.split("@")[0];
    const isPriya = c.id === "U-PRIYA";
    const basket = isPriya ? BASKETS[0] : BASKETS[ci % BASKETS.length];
    const rate = isPriya ? 0.36 : 0.12 + r() * 0.22;
    const zone = AREAS[c.address!.area].zone;
    for (let offset = -75; offset <= 1; offset++) {
      const quiet = QUIET.has(local) && offset > -16;
      if (quiet) continue;
      // Make sure the demo route has stops today in each zone.
      const force = offset === 0 && (isPriya || r() < 0.38);
      if (!force && r() > rate) continue;
      const day = addDays(now, offset);
      const lines = makeLines(basket);
      const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
      const fee = subtotal >= 299 ? 0 : 25;
      const status = isPriya && offset === 0 ? "out_for_delivery" : statusFor(offset);
      const method: PaymentMethod = r() < 0.55 ? "upi" : r() < 0.55 ? "cod" : "card";
      const placedHour = isPriya ? 21 : 18 + Math.floor(r() * 5);
      const placed = iso(addDays(day, -1), placedHour, isPriya ? 15 + Math.floor(r() * 30) : Math.floor(r() * 60));
      const timeline = timelineFor(status, placed, day);
      orders.push({
        id: `KS-${seq++}`,
        userId: c.id,
        lines,
        subtotal,
        deliveryFee: fee,
        total: subtotal + fee,
        status,
        payment: {
          method,
          status:
            status === "cancelled"
              ? method === "cod"
                ? "pending"
                : "refunded"
              : method === "cod"
                ? status === "delivered"
                  ? "paid"
                  : "pending"
                : "paid",
          ref: method === "cod" ? undefined : `${method.toUpperCase()}${Math.floor(r() * 1e10)}`,
        },
        placedAt: placed,
        deliveryDate: ymd(day),
        slot: r() < 0.88 ? "morning" : "evening",
        address: c.address!,
        staffId: staffForZone(zone),
        deliveredAt: status === "delivered" ? timeline[timeline.length - 1].at : undefined,
        timeline,
      });
    }
  });

  // Two payments the "unusual payment" rules flag for a human to review (never auto-rejected).
  const vikram = customers.find((c) => c.email.startsWith("vikram"))!;
  const bigLines = makeLines(BASKETS[5], true);
  const bigSub = bigLines.reduce((s, l) => s + l.price * l.qty, 0);
  orders.push({
    id: `KS-${seq++}`,
    userId: vikram.id,
    lines: bigLines,
    subtotal: bigSub,
    deliveryFee: 0,
    total: bigSub,
    status: "placed",
    payment: {
      method: "card",
      status: "review",
      ref: `CARD${Math.floor(r() * 1e10)}`,
      flag: "Order value is far above this customer's usual basket, and the card is new to the account.",
    },
    placedAt: iso(now, 1, 47),
    deliveryDate: ymd(addDays(now, 1)),
    slot: "morning",
    address: vikram.address!,
    staffId: staffForZone("north"),
    timeline: [{ status: "placed", at: iso(now, 1, 47) }],
  });
  const kavya = customers.find((c) => c.email.startsWith("kavya"))!;
  const kLines = makeLines(BASKETS[3]);
  const kSub = kLines.reduce((s, l) => s + l.price * l.qty, 0);
  orders.push({
    id: `KS-${seq++}`,
    userId: kavya.id,
    lines: kLines,
    subtotal: kSub,
    deliveryFee: kSub >= 299 ? 0 : 25,
    total: kSub + (kSub >= 299 ? 0 : 25),
    status: "placed",
    payment: {
      method: "upi",
      status: "review",
      ref: `UPI${Math.floor(r() * 1e10)}`,
      flag: "Three failed UPI attempts from different UPI IDs within four minutes before this one succeeded.",
    },
    placedAt: iso(now, 0, 12),
    deliveryDate: ymd(addDays(now, 1)),
    slot: "morning",
    address: kavya.address!,
    staffId: staffForZone("south"),
    timeline: [{ status: "placed", at: iso(now, 0, 12) }],
  });

  // Today: the first stops on each partner's optimised route are already delivered.
  const todayKey = ymd(now);
  users
    .filter((u) => u.role === "staff")
    .forEach((s) => {
      const mine = orders.filter((o) => o.staffId === s.id && o.deliveryDate === todayKey && o.status !== "cancelled");
      const route = optimiseRoute(HUB, mine.map((o) => ({ lat: o.address.lat, lng: o.address.lng, o })));
      let k = Math.floor(route.length * 0.3);
      const priya = route.findIndex((x) => x.o.userId === "U-PRIYA");
      if (priya >= 0) k = Math.min(k, priya);
      route.forEach(({ o }, i) => {
        const delivered = i < k;
        o.status = delivered ? "delivered" : "out_for_delivery";
        o.timeline = [
          o.timeline[0],
          { status: "packed", at: iso(now, 4, 55) },
          { status: "out_for_delivery", at: iso(now, 5, 35) },
          ...(delivered ? [{ status: "delivered" as const, at: iso(now, 5, 48 + i * 7) }] : []),
        ];
        o.deliveredAt = delivered ? iso(now, 5, 48 + i * 7) : undefined;
        if (o.payment.method === "cod") o.payment.status = delivered ? "paid" : "pending";
      });
    });

  orders.sort((a, b) => b.placedAt.localeCompare(a.placedAt));

  // --------------------------------------------------------- subscriptions
  const subscriptions: Subscription[] = [
    {
      id: "SUB-1001",
      userId: "U-PRIYA",
      slug: "a2-desi-cow-milk",
      variant: "1l",
      qty: 1,
      frequency: "daily",
      days: [],
      slot: "morning",
      startDate: ymd(addDays(now, -84)),
      status: "active",
      skips: [],
      createdAt: addDays(now, -85).toISOString(),
    },
    {
      id: "SUB-1002",
      userId: "U-PRIYA",
      slug: "clay-pot-curd",
      variant: "400g",
      qty: 1,
      frequency: "alternate",
      days: [],
      slot: "morning",
      startDate: ymd(addDays(now, -40)),
      status: "active",
      skips: [],
      createdAt: addDays(now, -41).toISOString(),
    },
  ];
  let subSeq = 1003;
  customers.slice(1).forEach((c) => {
    if (r() < 0.25) return;
    const milk = pick(["a2-desi-cow-milk", "farm-toned-milk", "buffalo-milk", "a2-desi-cow-milk"]);
    const freq = pick(["daily", "daily", "daily", "alternate", "weekly"] as const);
    const local = c.email.split("@")[0];
    subscriptions.push({
      id: `SUB-${subSeq++}`,
      userId: c.id,
      slug: milk,
      variant: r() < 0.6 ? "1l" : "500ml",
      qty: r() < 0.2 ? 2 : 1,
      frequency: freq,
      days: freq === "weekly" ? [0, 3, 6] : [],
      slot: "morning",
      startDate: ymd(addDays(now, -Math.floor(10 + r() * 150))),
      status: QUIET.has(local) ? "paused" : r() < 0.1 ? "paused" : "active",
      pausedUntil: QUIET.has(local) ? ymd(addDays(now, 9)) : undefined,
      skips: [],
      createdAt: addDays(now, -Math.floor(10 + r() * 150)).toISOString(),
    });
  });

  // ---------------------------------------------------------------- reviews
  const reviewTexts: [string, number, string, string][] = [
    ["a2-desi-cow-milk", 5, "Lakshmi N.", "The cream line on top every morning reminds me of my grandmother's house. Fresh, thick and lovely in coffee."],
    ["a2-desi-cow-milk", 5, "Arjun M.", "Switched from packet milk three months ago. My son finally drinks milk without fuss. Always on time."],
    ["a2-desi-cow-milk", 4, "Divya K.", "Excellent taste and the glass bottles are a nice touch. Price is a bit high but worth it."],
    ["a2-desi-cow-milk", 2, "Karthik S.", "Delivery was late twice this week, after 8 AM. Milk itself is good but I need it before I leave for work."],
    ["a2-desi-cow-milk", 4, "Revathi S.", "Very fresh. Once the bottle cap was loose and a little leaked, but they replaced it the next day."],
    ["farm-toned-milk", 4, "Nisha T.", "Good everyday milk for tea. Consistent quality."],
    ["farm-toned-milk", 3, "Harish K.", "Okay milk. Nothing special compared to the A2 one, but cheaper."],
    ["buffalo-milk", 5, "Deepak C.", "Makes the thickest curd I have ever set at home. Perfect for payasam."],
    ["buffalo-milk", 2, "Meena V.", "Milk turned sour by evening on a hot day. Maybe the bottle was not cold enough when it arrived."],
    ["clay-pot-curd", 5, "Priya R.", "Thick, creamy and just the right sourness. The clay pot keeps it cool. Love it."],
    ["clay-pot-curd", 5, "Sangeetha P.", "Best curd in Chennai, honestly. Tastes exactly like homemade."],
    ["clay-pot-curd", 4, "Ajay M.", "Lovely curd. Wish the clay pot pickup was more regular."],
    ["neer-mor", 5, "Rohan D.", "Perfect on a hot afternoon. The ginger and curry leaf flavour is spot on."],
    ["neer-mor", 3, "Gayathri R.", "Tasty but a bit too salty for me."],
    ["malai-paneer", 5, "Fathima N.", "Soft, fresh paneer that does not crumble in the curry. Fantastic quality."],
    ["malai-paneer", 4, "Vikram R.", "Very good paneer. Sometimes out of stock in the evening slot."],
    ["malai-paneer", 2, "Imran S.", "Paneer was out of stock three times when I tried to order. Disappointing."],
    ["cultured-butter", 5, "Anand I.", "Tastes like the butter I had in Europe. Brilliant on toast."],
    ["a2-bilona-ghee", 5, "Lakshmi N.", "Granular, aromatic, real ghee. The smell fills the kitchen. Worth every rupee."],
    ["a2-bilona-ghee", 4, "Shalini J.", "Excellent ghee but expensive. I use it only for special cooking."],
    ["fresh-malai", 4, "Kavya S.", "Fresh and rich. Whips well."],
    ["mango-lassi", 5, "Nisha T.", "Thick, not too sweet, real mango. My kids love it."],
    ["mango-lassi", 3, "Prakash N.", "Good but the bottle is small for the price."],
    ["cocoa-milkshake", 4, "Arjun M.", "Nice and thick. Less sugar than store brands which I like."],
    ["strawberry-yogurt", 5, "Divya K.", "Great for lunch boxes. Fresh fruit taste."],
    ["farmhouse-cheese", 4, "Anand I.", "Lovely mild cheese. Out of stock too often though."],
    ["malai-ice-cream", 5, "Revathi S.", "Tastes like real strawberries and cream. Amazing."],
    ["malai-ice-cream", 3, "Suresh B.", "Good flavour, but it arrived slightly melted."],
  ];
  const reviews: Review[] = reviewTexts.map(([slug, rating, name, text], i) => ({
    id: `RV-${200 + i}`,
    slug,
    name,
    rating,
    text,
    at: addDays(now, -Math.floor(r() * 40) - 1).toISOString(),
  }));

  // ------------------------------------------------------- quality readings
  const quality: QualityTest[] = [];
  for (let d = 9; d >= 0; d--) {
    for (const shift of ["AM", "PM"] as const) {
      if (d === 0 && shift === "PM") continue;
      const day = addDays(now, -d);
      const b = `B-${ymd(day).slice(5).replace("-", "")}-${shift}`;
      const t: QualityTest = {
        batch: b,
        at: iso(day, shift === "AM" ? 5 : 17, 10),
        shift,
        litres: Math.round(shift === "AM" ? 300 + r() * 40 : 130 + r() * 30),
        fat: +(4.0 + r() * 0.4).toFixed(2),
        snf: +(8.6 + r() * 0.3).toFixed(2),
        tempC: +(3.2 + r() * 0.9).toFixed(1),
        acidity: +(0.13 + r() * 0.02).toFixed(3),
        tpc: Math.round(18000 + r() * 26000),
        adulterants: "pass",
      };
      if (d === 6 && shift === "PM") t.tempC = 7.6;
      if (d === 3 && shift === "AM") t.snf = 8.12;
      if (d === 1 && shift === "PM") t.tpc = 212000;
      quality.push(t);
    }
  }

  // ----------------------------------------------------------- login events
  const ev = (email: string, dOff: number, h: number, m: number, success: boolean, device: string, place: string): LoginEvent => ({
    id: `LG-${Math.floor(r() * 1e6)}`,
    email,
    at: iso(addDays(now, dOff), h, m),
    success,
    device,
    place,
  });
  const loginEvents: LoginEvent[] = [
    ev("priya@example.com", -3, 21, 14, true, "Chrome on Android", "Chennai"),
    ev("priya@example.com", -1, 21, 32, true, "Chrome on Android", "Chennai"),
    ev("lakshmi.n@example.com", -2, 7, 5, true, "Safari on iPhone", "Chennai"),
    ev("arjun.m@example.com", -1, 20, 2, true, "Chrome on Windows", "Chennai"),
    ev("vikram.r@example.com", 0, 1, 31, false, "Firefox on Linux", "Bengaluru"),
    ev("vikram.r@example.com", 0, 1, 32, false, "Firefox on Linux", "Bengaluru"),
    ev("vikram.r@example.com", 0, 1, 32, false, "Firefox on Linux", "Bengaluru"),
    ev("vikram.r@example.com", 0, 1, 33, false, "Firefox on Linux", "Bengaluru"),
    ev("vikram.r@example.com", 0, 1, 34, true, "Firefox on Linux", "Bengaluru"),
    ev("kavya.s@example.com", 0, 0, 5, true, "Chrome on Android", "Chennai"),
    ev("divya.k@example.com", -1, 3, 12, true, "Edge on Windows", "Hyderabad"),
    ev("admin@ksheera.example", -1, 9, 2, true, "Chrome on macOS", "Chennai"),
    ev("ravi@ksheera.example", 0, 5, 18, true, "Chrome on Android", "Chennai"),
  ].sort((a, b) => b.at.localeCompare(a.at));

  // ---------------------------------------------------------------- notices
  const notices: Notice[] = [
    {
      id: "N-1",
      userId: "U-PRIYA",
      at: iso(now, 5, 41),
      title: "Out for delivery",
      body: "Ravi has your A2 milk and curd. You are stop 3 on today's route.",
      read: false,
      kind: "delivery",
    },
    {
      id: "N-2",
      userId: "U-PRIYA",
      at: iso(addDays(now, -1), 20, 55),
      title: "Order for tomorrow?",
      body: "You usually order around 9:20 PM. Orders close at 10 PM for tomorrow's 6 AM delivery.",
      read: true,
      kind: "subscription",
    },
    {
      id: "N-3",
      userId: "U-PRIYA",
      at: iso(addDays(now, -2), 10, 0),
      title: "New: Strawberry yogurt cups",
      body: "Since you enjoy our curd, you might like these lunch-box cups. 4 for ₹140.",
      read: true,
      kind: "offer",
    },
  ];

  return {
    version: DB_VERSION,
    seededAt: now.toISOString(),
    users,
    overrides: [],
    customProducts: [],
    orders,
    subscriptions,
    reviews,
    quality,
    loginEvents,
    notices,
    session: null,
    cart: [],
    viewed: [],
  };
}
