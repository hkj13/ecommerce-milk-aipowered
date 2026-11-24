"use client";

import { site } from "@/config/site";
import type { Product } from "@/data/products";
import { getDB, liveCatalogue, mutate } from "@/lib/store";
import { addDays, demoHash, today, tomorrow, uid, ymd } from "@/lib/format";
import { flagPayment } from "@/lib/ai";
import type { Address, Frequency, Order, PaymentMethod, Role, Subscription, User } from "@/lib/types";

/* ---------------------------------------------------------------- auth */

export type LoginResult =
  | { ok: true; user: User }
  | { ok: false; error: string; failures: number; needsOtp?: boolean };

const failureCount: Record<string, number> = {};

export function login(email: string, password: string, role?: Role): LoginResult {
  const d = getDB();
  if (!d) return { ok: false, error: "Still loading, try again.", failures: 0 };
  const key = email.trim().toLowerCase();
  const user = d.users.find((u) => u.email.toLowerCase() === key);
  const success = !!user && user.passwordHash === demoHash(password) && (!role || user.role === role);
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const device = /Android/i.test(ua)
    ? "Chrome on Android"
    : /iPhone|iPad/i.test(ua)
      ? "Safari on iPhone"
      : /Mac/i.test(ua)
        ? "Browser on macOS"
        : /Windows/i.test(ua)
          ? "Browser on Windows"
          : "Browser on Linux";
  mutate((x) => {
    x.loginEvents.unshift({ id: uid("LG"), email: key, at: new Date().toISOString(), success, device, place: "Chennai" });
    if (success) x.session = { userId: user!.id };
  });
  if (success) {
    failureCount[key] = 0;
    return { ok: true, user: user! };
  }
  failureCount[key] = (failureCount[key] ?? 0) + 1;
  const f = failureCount[key];
  if (user && role && user.role !== role) {
    return { ok: false, error: `This account is a ${user.role === "staff" ? "delivery partner" : user.role} account. Choose that tab.`, failures: f };
  }
  return {
    ok: false,
    error: "That email and password don't match.",
    failures: f,
    needsOtp: f >= 3,
  };
}

export function logout() {
  mutate((x) => {
    x.session = null;
  });
}

export function register(input: { name: string; email: string; phone: string; password: string; address: Address }): LoginResult {
  const d = getDB();
  if (!d) return { ok: false, error: "Still loading.", failures: 0 };
  if (d.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    return { ok: false, error: "An account with this email already exists. Sign in instead.", failures: 0 };
  }
  const user: User = {
    id: uid("U"),
    role: "customer",
    name: input.name,
    email: input.email.trim().toLowerCase(),
    phone: input.phone,
    passwordHash: demoHash(input.password),
    address: input.address,
    createdAt: new Date().toISOString(),
    reminders: { delivery: true, subscription: true },
  };
  mutate((x) => {
    x.users.push(user);
    x.session = { userId: user.id };
    x.notices.unshift({
      id: uid("N"),
      userId: user.id,
      at: new Date().toISOString(),
      title: `Welcome to ${site.name}`,
      body: "Your first delivery is free. Order by 10 PM for tomorrow morning.",
      read: false,
      kind: "system",
    });
  });
  return { ok: true, user };
}

export function resetPassword(email: string, password: string) {
  const d = getDB();
  const u = d?.users.find((x) => x.email.toLowerCase() === email.toLowerCase());
  if (!u) return false;
  mutate((x) => {
    const t = x.users.find((y) => y.id === u.id)!;
    t.passwordHash = demoHash(password);
  });
  return true;
}

export function updateProfile(userId: string, patch: Partial<Pick<User, "name" | "phone" | "address" | "reminders">>) {
  mutate((x) => {
    const u = x.users.find((y) => y.id === userId);
    if (u) Object.assign(u, patch);
  });
}

/* ---------------------------------------------------------------- cart */

export function addToCart(slug: string, variant: string, qty = 1) {
  mutate((x) => {
    const line = x.cart.find((l) => l.slug === slug && l.variant === variant);
    if (line) line.qty = Math.min(20, line.qty + qty);
    else x.cart.push({ slug, variant, qty });
  });
}

export function setCartQty(slug: string, variant: string, qty: number) {
  mutate((x) => {
    if (qty <= 0) x.cart = x.cart.filter((l) => !(l.slug === slug && l.variant === variant));
    else {
      const line = x.cart.find((l) => l.slug === slug && l.variant === variant);
      if (line) line.qty = Math.min(20, qty);
    }
  });
}

export function clearCart() {
  mutate((x) => {
    x.cart = [];
  });
}

export function markViewed(slug: string) {
  mutate((x) => {
    x.viewed = [slug, ...x.viewed.filter((s) => s !== slug)].slice(0, 12);
  });
}

/* --------------------------------------------------------------- orders */

export function placeOrder(input: {
  userId: string;
  method: PaymentMethod;
  deliveryDate: string;
  slot: "morning" | "evening";
  address: Address;
  note?: string;
}): Order | null {
  const d = getDB();
  if (!d || d.cart.length === 0) return null;
  const cat = liveCatalogue(d);
  const lines = d.cart.map((l) => {
    const p = cat.find((x) => x.slug === l.slug)!;
    const v = p.variants.find((x) => x.id === l.variant)!;
    return { slug: p.slug, variant: v.id, name: p.name, label: v.label, qty: l.qty, price: v.price };
  });
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const fee = subtotal >= site.freeDeliveryAbove ? 0 : site.deliveryFee;
  const history = d.orders.filter((o) => o.userId === input.userId);
  const flag = flagPayment({ total: subtotal + fee, method: input.method, history });
  const staff = d.users.find((u) => u.role === "staff");
  const now = new Date().toISOString();
  const order: Order = {
    id: `KS-${Math.max(4100, ...d.orders.map((o) => Number(o.id.slice(3)) || 0)) + 1}`,
    userId: input.userId,
    lines,
    subtotal,
    deliveryFee: fee,
    total: subtotal + fee,
    status: "placed",
    payment: {
      method: input.method,
      status: flag ? "review" : input.method === "cod" ? "pending" : "paid",
      ref: input.method === "cod" ? undefined : `${input.method.toUpperCase()}${Date.now()}`,
      flag: flag ?? undefined,
    },
    placedAt: now,
    deliveryDate: input.deliveryDate,
    slot: input.slot,
    address: input.address,
    staffId: staff?.id,
    timeline: [{ status: "placed", at: now }],
    note: input.note,
  };
  mutate((x) => {
    x.orders.unshift(order);
    x.cart = [];
    // stock goes down as soon as an order is placed
    for (const l of lines) {
      const base = liveCatalogue(x).find((p) => p.slug === l.slug);
      if (!base) continue;
      const o = x.overrides.find((y) => y.slug === l.slug);
      const nextStock = Math.max(0, base.stock - l.qty);
      if (o) o.stock = nextStock;
      else x.overrides.push({ slug: l.slug, stock: nextStock });
    }
    x.notices.unshift({
      id: uid("N"),
      userId: input.userId,
      at: now,
      title: `Order ${order.id} confirmed`,
      body: `Arriving ${input.deliveryDate === tomorrow() ? "tomorrow" : input.deliveryDate} between ${input.slot === "morning" ? "5:30 and 7:30 AM" : "5 and 7 PM"}.`,
      read: false,
      kind: "delivery",
    });
  });
  return order;
}

export function cancelOrder(id: string) {
  mutate((x) => {
    const o = x.orders.find((y) => y.id === id);
    if (!o || o.status === "delivered") return;
    o.status = "cancelled";
    o.timeline.push({ status: "cancelled", at: new Date().toISOString() });
    if (o.payment.method !== "cod") o.payment.status = "refunded";
  });
}

export function setOrderStatus(id: string, status: Order["status"]) {
  mutate((x) => {
    const o = x.orders.find((y) => y.id === id);
    if (!o) return;
    o.status = status;
    o.timeline.push({ status, at: new Date().toISOString() });
    if (status === "delivered") {
      o.deliveredAt = new Date().toISOString();
      if (o.payment.method === "cod") o.payment.status = "paid";
      x.notices.unshift({
        id: uid("N"),
        userId: o.userId,
        at: new Date().toISOString(),
        title: "Delivered",
        body: `Order ${o.id} was left at your door. Enjoy!`,
        read: false,
        kind: "delivery",
      });
    }
  });
}

export function assignStaff(id: string, staffId: string) {
  mutate((x) => {
    const o = x.orders.find((y) => y.id === id);
    if (o) o.staffId = staffId;
  });
}

export function clearPaymentFlag(id: string, approve: boolean) {
  mutate((x) => {
    const o = x.orders.find((y) => y.id === id);
    if (!o) return;
    o.payment.status = approve ? (o.payment.method === "cod" ? "pending" : "paid") : "refunded";
    if (!approve) {
      o.status = "cancelled";
      o.timeline.push({ status: "cancelled", at: new Date().toISOString() });
    }
    o.payment.flag = undefined;
  });
}

/* --------------------------------------------------------- subscriptions */

export function createSubscription(input: {
  userId: string;
  slug: string;
  variant: string;
  qty: number;
  frequency: Frequency;
  days: number[];
  slot: "morning" | "evening";
  startDate: string;
}): Subscription {
  const sub: Subscription = {
    id: uid("SUB"),
    ...input,
    status: "active",
    skips: [],
    createdAt: new Date().toISOString(),
  };
  mutate((x) => {
    x.subscriptions.unshift(sub);
    x.notices.unshift({
      id: uid("N"),
      userId: input.userId,
      at: new Date().toISOString(),
      title: "Subscription started",
      body: `Your first delivery is on ${input.startDate}. You can pause or change it any time before 10 PM the night before.`,
      read: false,
      kind: "subscription",
    });
  });
  return sub;
}

export function updateSubscription(id: string, patch: Partial<Subscription>) {
  mutate((x) => {
    const s = x.subscriptions.find((y) => y.id === id);
    if (s) Object.assign(s, patch);
  });
}

export function pauseSubscription(id: string, until?: string) {
  updateSubscription(id, { status: "paused", pausedUntil: until });
}

export function resumeSubscription(id: string) {
  updateSubscription(id, { status: "active", pausedUntil: undefined });
}

export function skipTomorrow(id: string) {
  mutate((x) => {
    const s = x.subscriptions.find((y) => y.id === id);
    if (!s) return;
    const t = tomorrow();
    s.skips = s.skips.includes(t) ? s.skips.filter((d) => d !== t) : [...s.skips, t];
  });
}

/** Does this subscription deliver on the given day? */
export function deliversOn(s: Subscription, day: string) {
  if (s.status !== "active" && !(s.status === "paused" && s.pausedUntil && day > s.pausedUntil)) return false;
  if (day < s.startDate || s.skips.includes(day)) return false;
  const [y, m, dd] = day.split("-").map(Number);
  const date = new Date(y, m - 1, dd);
  const [sy, sm, sd] = s.startDate.split("-").map(Number);
  const diff = Math.round((date.getTime() - new Date(sy, sm - 1, sd).getTime()) / 86400000);
  switch (s.frequency) {
    case "daily":
      return true;
    case "alternate":
      return diff % 2 === 0;
    case "weekly":
      return s.days.includes(date.getDay());
    case "monthly":
      return date.getDate() === (s.days[0] ?? 1);
  }
}

export function nextDeliveries(s: Subscription, n = 5) {
  const out: string[] = [];
  for (let i = 1; i < 70 && out.length < n; i++) {
    const day = ymd(addDays(new Date(), i));
    if (deliversOn(s, day)) out.push(day);
  }
  return out;
}

/* -------------------------------------------------------------- products */

export function updateProduct(slug: string, patch: { stock?: number; prices?: Record<string, number>; active?: boolean; expiresInDays?: number }) {
  mutate((x) => {
    const o = x.overrides.find((y) => y.slug === slug);
    if (o) {
      Object.assign(o, { ...patch, prices: { ...(o.prices ?? {}), ...(patch.prices ?? {}) } });
    } else x.overrides.push({ slug, ...patch });
  });
}

export function addProduct(p: Product) {
  mutate((x) => {
    x.customProducts.push(p);
  });
}

export function removeProduct(slug: string) {
  mutate((x) => {
    const custom = x.customProducts.find((p) => p.slug === slug);
    if (custom) x.customProducts = x.customProducts.filter((p) => p.slug !== slug);
    else {
      const o = x.overrides.find((y) => y.slug === slug);
      if (o) o.active = false;
      else x.overrides.push({ slug, active: false });
    }
  });
}

/* -------------------------------------------------------------- reviews */

export function addReview(slug: string, name: string, rating: number, text: string, userId?: string) {
  mutate((x) => {
    x.reviews.unshift({ id: uid("RV"), slug, name, rating, text, userId, at: new Date().toISOString() });
  });
}

/* ------------------------------------------------------------- notices */

export function markNoticesRead(userId: string) {
  mutate((x) => {
    x.notices.forEach((n) => {
      if (n.userId === userId) n.read = true;
    });
  });
}

export { today };
