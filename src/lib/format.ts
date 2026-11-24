const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

export const money = (n: number) => inr.format(Math.round(n));
export const number = (n: number) => num.format(n);

/** YYYY-MM-DD in local time. */
export function ymd(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function parseYmd(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const today = () => ymd(new Date());
export const tomorrow = () => ymd(addDays(new Date(), 1));

const dayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });

export const fmtDay = (s: string) => dayFmt.format(s.length === 10 ? parseYmd(s) : new Date(s));
export const fmtDate = (s: string) => dateFmt.format(s.length === 10 ? parseYmd(s) : new Date(s));
export const fmtTime = (s: string) => timeFmt.format(new Date(s));
export const fmtDateTime = (s: string) => `${fmtDate(s)}, ${fmtTime(s)}`;

export function relDay(s: string) {
  const t = today();
  if (s === t) return "Today";
  if (s === tomorrow()) return "Tomorrow";
  if (s === ymd(addDays(new Date(), -1))) return "Yesterday";
  return fmtDay(s);
}

/** Small deterministic PRNG, so seeded demo data looks the same every reset. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/** Demo-only password hash (FNV-1a with a salt). Production: Werkzeug's generate_password_hash. */
export function demoHash(password: string) {
  let h = 0x811c9dc5;
  const s = `ksheera::${password}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `fnv1a$${(h >>> 0).toString(16).padStart(8, "0")}`;
}

export const initials = (name: string) =>
  name
    .replace(/[^A-Za-z\s]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export const cls = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");
