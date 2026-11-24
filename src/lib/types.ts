/**
 * The shapes of the prototype's data. Each one mirrors a MySQL table in the
 * full system (users, products, orders, order_items, payments,
 * subscriptions, reviews, quality_tests, login_events), so the browser store
 * can later be swapped for Flask API calls without touching the pages.
 */

export type Role = "customer" | "admin" | "staff";

export type Address = {
  line1: string;
  area: string;
  city: string;
  pincode: string;
  lat: number;
  lng: number;
};

export type User = {
  id: string;
  role: Role;
  name: string;
  email: string;
  phone: string;
  /** Demo hash: never the plain password. Production uses Werkzeug / bcrypt. */
  passwordHash: string;
  address?: Address;
  /** Delivery staff only: their zone. */
  zone?: string;
  createdAt: string;
  /** Reminder preference (customer). */
  reminders?: { delivery: boolean; subscription: boolean; time?: string };
};

export type ProductOverride = {
  slug: string;
  stock?: number;
  prices?: Record<string, number>;
  active?: boolean;
  expiresInDays?: number;
};

export type CartLine = { slug: string; variant: string; qty: number };

export type OrderStatus = "placed" | "packed" | "out_for_delivery" | "delivered" | "cancelled";
export type PaymentMethod = "upi" | "card" | "cod";
export type PaymentStatus = "paid" | "pending" | "refunded" | "review";

export type OrderLine = { slug: string; variant: string; name: string; label: string; qty: number; price: number };

export type Order = {
  id: string;
  userId: string;
  lines: OrderLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  payment: { method: PaymentMethod; status: PaymentStatus; ref?: string; flag?: string };
  placedAt: string;
  /** Delivery date, YYYY-MM-DD */
  deliveryDate: string;
  slot: "morning" | "evening";
  address: Address;
  staffId?: string;
  deliveredAt?: string;
  timeline: { status: OrderStatus; at: string }[];
  fromSubscription?: string;
  note?: string;
};

export type Frequency = "daily" | "alternate" | "weekly" | "monthly";

export type Subscription = {
  id: string;
  userId: string;
  slug: string;
  variant: string;
  qty: number;
  frequency: Frequency;
  /** Weekly: days of week 0 (Sun) to 6. Monthly: day of month in days[0]. */
  days: number[];
  slot: "morning" | "evening";
  startDate: string;
  status: "active" | "paused" | "cancelled";
  pausedUntil?: string;
  /** Dates (YYYY-MM-DD) skipped one at a time. */
  skips: string[];
  createdAt: string;
};

export type Review = {
  id: string;
  slug: string;
  userId?: string;
  name: string;
  rating: number;
  text: string;
  at: string;
};

export type QualityTest = {
  batch: string;
  at: string;
  shift: "AM" | "PM";
  litres: number;
  fat: number;
  snf: number;
  tempC: number;
  acidity: number;
  tpc: number;
  adulterants: "pass" | "fail";
};

export type LoginEvent = {
  id: string;
  email: string;
  at: string;
  success: boolean;
  device: string;
  place: string;
};

export type Notice = {
  id: string;
  userId: string;
  at: string;
  title: string;
  body: string;
  read: boolean;
  kind: "delivery" | "subscription" | "offer" | "system";
};

export type DB = {
  version: number;
  seededAt: string;
  users: User[];
  overrides: ProductOverride[];
  customProducts: import("@/data/products").Product[];
  orders: Order[];
  subscriptions: Subscription[];
  reviews: Review[];
  quality: QualityTest[];
  loginEvents: LoginEvent[];
  notices: Notice[];
  session: { userId: string } | null;
  cart: CartLine[];
  viewed: string[];
};
