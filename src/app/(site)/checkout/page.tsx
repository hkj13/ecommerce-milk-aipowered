"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ProductThumb } from "@/components/shop/ProductArt";
import { toast } from "@/components/ui/Toaster";
import { PageHead, Skeleton } from "@/components/ui/bits";
import { CheckIcon, PinIcon, ShieldIcon } from "@/components/ui/icons";
import { site } from "@/config/site";
import { DEMO_ACCOUNTS } from "@/data/seed";
import { login, placeOrder } from "@/lib/actions";
import { addDays, cls, fmtDay, money, ymd } from "@/lib/format";
import { useCatalogue, useDB, useSession } from "@/lib/store";
import type { Address, PaymentMethod } from "@/lib/types";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-6 md:p-8" aria-labelledby={`step-${n}`}>
      <h2 id={`step-${n}`} className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-pasture text-sm font-bold text-milk">{n}</span>
        <span className="h3">{title}</span>
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

/** A stand-in QR code for the UPI demo (not scannable). */
function DemoQR() {
  const finder = (x: number, y: number) => (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
  const cells: [number, number][] = [];
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) if (!finder(x, y) && (x * 7 + y * 13 + x * y) % 3 === 0) cells.push([x, y]);
  return (
    <svg viewBox="-1 -1 23 23" className="h-28 w-28 rounded-xl border border-rule bg-white p-1.5" role="img" aria-label="Demo UPI QR code">
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#1c1a16" />
      ))}
      {[
        [0, 0],
        [14, 0],
        [0, 14],
      ].map(([x, y]) => (
        <g key={`${x}${y}`}>
          <rect x={x} y={y} width={7} height={7} fill="#1c1a16" />
          <rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" />
          <rect x={x + 2} y={y + 2} width={3} height={3} fill="#1c1a16" />
        </g>
      ))}
    </svg>
  );
}

export default function CheckoutPage() {
  const db = useDB();
  const all = useCatalogue();
  const { user, ready } = useSession();
  const router = useRouter();
  const [addrEdit, setAddr] = useState<Address | null>(null);
  const addr = addrEdit ?? user?.address ?? null;
  const [day, setDay] = useState(ymd(addDays(new Date(), 1)));
  const [slot, setSlot] = useState<"morning" | "evening">("morning");
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [upiEdit, setUpi] = useState<string | null>(null);
  const upi = upiEdit ?? (user ? `${user.name.split(" ")[0].toLowerCase()}@okaxis` : "");
  const [cardEdit, setCard] = useState<{ number: string; exp: string; cvv: string; name: string } | null>(null);
  const card = cardEdit ?? { number: "", exp: "", cvv: "", name: user?.name ?? "" };
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);


  const lines = useMemo(
    () =>
      (db?.cart ?? []).map((l) => {
        const p = all.find((x) => x.slug === l.slug)!;
        const v = p?.variants.find((x) => x.id === l.variant);
        return { ...l, p, v, total: (v?.price ?? 0) * l.qty };
      }),
    [db, all],
  );
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const fee = subtotal >= site.freeDeliveryAbove ? 0 : site.deliveryFee;
  const days = Array.from({ length: 6 }, (_, i) => ymd(addDays(new Date(), i + 1)));

  const valid =
    !!addr?.line1 &&
    !!addr?.pincode &&
    (method !== "upi" || /^[\w.-]+@[\w]+$/.test(upi)) &&
    (method !== "card" || (card.number.replace(/\s/g, "").length >= 15 && /^\d{2}\/\d{2}$/.test(card.exp) && card.cvv.length >= 3));

  const submit = () => {
    if (!user || !addr || !valid) return;
    setBusy(true);
    window.setTimeout(() => {
      const order = placeOrder({ userId: user.id, method, deliveryDate: day, slot, address: addr, note: note || undefined });
      if (!order) {
        setBusy(false);
        toast("Your cart is empty", undefined, "warn");
        return;
      }
      if (order.payment.status === "review") toast("Order placed, payment held for a quick check", "Unusual for this account. A person will confirm shortly.", "warn");
      router.push(`/account/order?id=${order.id}&new=1`);
    }, 1400);
  };

  if (!ready) {
    return (
      <div className="wrap pb-24 pt-[calc(var(--header-h)+4rem)]">
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <PageHead label="Checkout" title="Almost" em="there." sub="Sign in so we know where to bring it." />
        <div className="wrap py-14">
          <div className="card max-w-xl p-8">
            <p className="h3">Sign in to place your order</p>
            <p className="mt-2 text-ink-2">Your cart is saved. For the demo, continue as the sample customer Priya, or create your own account.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  login(DEMO_ACCOUNTS.customer.email, DEMO_ACCOUNTS.customer.password, "customer");
                  toast("Signed in as Priya (demo customer)");
                }}
              >
                Continue as demo customer
              </button>
              <Link href="/login?next=/checkout" className="btn btn-ghost">
                Sign in
              </Link>
              <Link href="/register?next=/checkout" className="btn btn-ghost">
                Create account
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (lines.length === 0) {
    return (
      <>
        <PageHead label="Checkout" title="Nothing to" em="check out." />
        <div className="wrap py-14">
          <Link href="/shop" className="btn btn-primary">
            Go to the shop
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead label="Checkout" title="Almost" em="there." sub={`Signed in as ${user.name}. Demo payments only: nothing is charged.`} />
      <div className="wrap grid-12 gap-y-8 py-12 md:py-16">
        <div className="col-span-4 space-y-6 md:col-span-8 xl:col-span-7">
          <Step n={1} title="Delivery address">
            {addr && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-ink-2">House, street</span>
                  <input className="field" value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} />
                </label>
                <label>
                  <span className="mb-1.5 block text-sm font-medium text-ink-2">Area</span>
                  <input className="field" value={addr.area} onChange={(e) => setAddr({ ...addr, area: e.target.value })} />
                </label>
                <label>
                  <span className="mb-1.5 block text-sm font-medium text-ink-2">Pincode</span>
                  <input className="field" inputMode="numeric" maxLength={6} value={addr.pincode} onChange={(e) => setAddr({ ...addr, pincode: e.target.value.replace(/\D/g, "") })} />
                </label>
                <p className="flex items-center gap-2 text-sm text-ok sm:col-span-2">
                  <PinIcon size={16} /> We deliver to {addr.area}, {addr.city}.
                </p>
              </div>
            )}
          </Step>

          <Step n={2} title="Delivery day and time">
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {days.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDay(d)}
                  aria-pressed={day === d}
                  className={cls("flex-none rounded-2xl border px-4 py-3 text-left transition-colors", day === d ? "border-pasture bg-pasture text-milk" : "border-rule hover:border-ink-3")}
                >
                  <span className="block text-xs opacity-75">{d === days[0] ? "Tomorrow" : fmtDay(d).split(",")[0]}</span>
                  <span className="font-semibold">{fmtDay(d).split(", ")[1] ?? fmtDay(d)}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["morning", "Morning", "5:30 to 7:30 AM"],
                  ["evening", "Evening", "5 to 7 PM"],
                ] as const
              ).map(([id, label, time]) => (
                <label key={id} className={cls("flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3.5", slot === id ? "border-pasture ring-1 ring-pasture" : "border-rule")}>
                  <input type="radio" name="slot" className="sr-only" checked={slot === id} onChange={() => setSlot(id)} />
                  <span className="font-semibold">{label}</span>
                  <span className="text-sm text-ink-2">{time}</span>
                </label>
              ))}
            </div>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium text-ink-2">Note for the delivery partner (optional)</span>
              <input className="field" placeholder="e.g. Leave it in the basket by the gate, don't ring" value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
          </Step>

          <Step n={3} title="Payment">
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Payment method">
              {(
                [
                  ["upi", "UPI", "GPay, PhonePe, Paytm"],
                  ["card", "Card", "Debit or credit"],
                  ["cod", "Cash on delivery", "Pay the partner"],
                ] as const
              ).map(([id, label, sub]) => (
                <label key={id} className={cls("cursor-pointer rounded-2xl border px-4 py-3.5", method === id ? "border-pasture bg-pasture/[0.06] ring-1 ring-pasture" : "border-rule")}>
                  <input type="radio" name="pay" className="sr-only" checked={method === id} onChange={() => setMethod(id)} />
                  <span className="block font-semibold">{label}</span>
                  <span className="text-sm text-ink-3">{sub}</span>
                </label>
              ))}
            </div>
            {method === "upi" && (
              <div className="mt-5 flex flex-wrap items-center gap-6">
                <DemoQR />
                <label className="min-w-56 flex-1">
                  <span className="mb-1.5 block text-sm font-medium text-ink-2">Or pay to your UPI ID</span>
                  <input className="field" value={upi} onChange={(e) => setUpi(e.target.value.trim())} placeholder="name@bank" />
                  <span className="mt-1.5 block text-xs text-ink-3">Demo: a payment request is simulated, nothing is sent.</span>
                </label>
              </div>
            )}
            {method === "card" && (
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <label className="sm:col-span-4">
                  <span className="mb-1.5 block text-sm font-medium text-ink-2">Card number</span>
                  <input
                    className="field tabular-nums"
                    inputMode="numeric"
                    placeholder="4111 1111 1111 1111"
                    value={card.number}
                    onChange={(e) =>
                      setCard({
                        ...card,
                        number: e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 16)
                          .replace(/(.{4})/g, "$1 ")
                          .trim(),
                      })
                    }
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-ink-2">Name on card</span>
                  <input className="field" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
                </label>
                <label>
                  <span className="mb-1.5 block text-sm font-medium text-ink-2">Expiry</span>
                  <input
                    className="field"
                    placeholder="MM/YY"
                    value={card.exp}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setCard({ ...card, exp: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d });
                    }}
                  />
                </label>
                <label>
                  <span className="mb-1.5 block text-sm font-medium text-ink-2">CVV</span>
                  <input className="field" type="password" inputMode="numeric" maxLength={4} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "") })} />
                </label>
                <p className="text-xs text-ink-3 sm:col-span-4">Demo only. Use any test number such as 4111 1111 1111 1111. Card details are never stored.</p>
              </div>
            )}
            {method === "cod" && <p className="mt-5 rounded-2xl bg-cream p-4 text-sm text-ink-2">Pay {money(subtotal + fee)} in cash or by UPI to the delivery partner at your door.</p>}
            <p className="mt-5 flex items-start gap-2 text-xs text-ink-3">
              <ShieldIcon size={15} className="mt-px flex-none" /> Unusual payment patterns are flagged for a person to review. They are never rejected
              automatically (AI demo).
            </p>
          </Step>
        </div>

        <aside className="col-span-4 md:col-span-8 xl:col-span-4 xl:col-start-9">
          <div className="card sticky top-[calc(var(--header-h)+1rem)] p-6 md:p-7">
            <p className="h3">Your order</p>
            <ul className="mt-5 space-y-3">
              {lines.map((l) =>
                l.p && l.v ? (
                  <li key={l.slug + l.variant} className="flex items-center gap-3">
                    <span className="relative h-12 w-12 flex-none overflow-hidden rounded-xl" style={{ background: l.p.tint }}>
                      <ProductThumb product={l.p} sizes="48px" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block truncate font-semibold">{l.p.name}</span>
                      <span className="text-ink-3">
                        {l.qty} × {l.v.label}
                      </span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{money(l.total)}</span>
                  </li>
                ) : null,
              )}
            </ul>
            <dl className="mt-5 space-y-2 border-t border-rule pt-4 text-[0.95rem]">
              <div className="flex justify-between">
                <dt className="text-ink-2">Subtotal</dt>
                <dd className="tabular-nums">{money(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-2">Delivery</dt>
                <dd className="tabular-nums">{fee ? money(fee) : "Free"}</dd>
              </div>
              <div className="flex justify-between pt-2 text-lg">
                <dt className="font-semibold">Total</dt>
                <dd className="font-bold tabular-nums">{money(subtotal + fee)}</dd>
              </div>
            </dl>
            <p className="mt-4 rounded-2xl bg-cream p-3 text-sm text-ink-2">
              Arrives <span className="font-semibold text-ink">{day === days[0] ? "tomorrow" : fmtDay(day)}</span>, {slot === "morning" ? "5:30 to 7:30 AM" : "5 to 7 PM"}
            </p>
            <button type="button" disabled={!valid || busy} onClick={submit} className="btn btn-primary mt-5 w-full">
              {busy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-milk/40 border-t-milk" /> Confirming payment…
                </>
              ) : (
                <>
                  <CheckIcon size={18} /> {method === "cod" ? "Place order" : `Pay ${money(subtotal + fee)}`}
                </>
              )}
            </button>
            {!valid && <p className="mt-3 text-center text-xs text-clay">Check the address and payment details.</p>}
          </div>
        </aside>
      </div>
    </>
  );
}
