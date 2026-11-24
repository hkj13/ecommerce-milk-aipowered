"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Mark } from "@/components/brand/Logo";
import { SignInPrompt } from "@/components/account/SignInPrompt";
import { Skeleton } from "@/components/ui/bits";
import { DownloadIcon } from "@/components/ui/icons";
import { site } from "@/config/site";
import { fmtDate, fmtDateTime, money } from "@/lib/format";
import { useDB, useSession } from "@/lib/store";

function Invoice() {
  const id = useSearchParams().get("id");
  const db = useDB();
  const { user, ready } = useSession();
  if (!ready) return <Skeleton className="mx-auto h-[70vh] max-w-3xl" />;
  if (!user) return <SignInPrompt title="Sign in to download this invoice" />;
  const o = db?.orders.find((x) => x.id === id && (x.userId === user.id || user.role === "admin"));
  if (!o) return <p className="text-center text-ink-2">Invoice not found.</p>;
  const customer = db?.users.find((u) => u.id === o.userId);

  return (
    <>
      <div className="no-print mx-auto mb-6 flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <Link href={`/account/order?id=${o.id}`} className="mono-label link-draw text-ink-2">
          ← Back to order
        </Link>
        <button type="button" onClick={() => window.print()} className="btn btn-primary btn-sm">
          <DownloadIcon size={16} /> Download PDF / Print
        </button>
      </div>
      <article className="print-sheet mx-auto max-w-3xl rounded-[24px] border border-rule bg-white p-8 shadow-[0_40px_80px_-50px_rgba(0,0,0,0.4)] md:p-12">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-rule pb-8">
          <div className="flex items-center gap-3 text-pasture">
            <Mark className="h-10 w-auto" />
            <div>
              <p className="font-display text-2xl text-ink">{site.legalName}</p>
              <p className="text-sm text-ink-3">{site.farm} · {site.email}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="mono-label text-ink-3">Tax invoice</p>
            <p className="mt-1 text-xl font-bold">INV-{o.id.replace("KS-", "")}</p>
            <p className="text-sm text-ink-3">{fmtDate(o.placedAt)}</p>
          </div>
        </header>
        <section className="grid gap-6 py-8 sm:grid-cols-3">
          <div>
            <p className="mono-label text-ink-3">Billed to</p>
            <p className="mt-2 font-semibold">{customer?.name}</p>
            <p className="text-sm text-ink-2">
              {o.address.line1}
              <br />
              {o.address.area}, {o.address.city} {o.address.pincode}
            </p>
          </div>
          <div>
            <p className="mono-label text-ink-3">Order</p>
            <p className="mt-2 font-semibold">{o.id}</p>
            <p className="text-sm text-ink-2">Placed {fmtDateTime(o.placedAt)}</p>
            <p className="text-sm text-ink-2">Delivery {fmtDate(o.deliveryDate)}, {o.slot}</p>
          </div>
          <div>
            <p className="mono-label text-ink-3">Payment</p>
            <p className="mt-2 font-semibold">{o.payment.method === "cod" ? "Cash on delivery" : o.payment.method.toUpperCase()}</p>
            <p className="text-sm capitalize text-ink-2">{o.payment.status === "review" ? "Under review" : o.payment.status}</p>
            {o.payment.ref && <p className="text-xs text-ink-3">Ref {o.payment.ref}</p>}
          </div>
        </section>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-rule text-left text-ink-3">
              <th className="py-3 font-medium">Item</th>
              <th className="py-3 text-right font-medium">Qty</th>
              <th className="py-3 text-right font-medium">Rate</th>
              <th className="py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {o.lines.map((l) => (
              <tr key={l.slug + l.variant} className="border-b border-rule">
                <td className="py-3">
                  <span className="font-semibold">{l.name}</span>
                  <span className="block text-ink-3">{l.label}</span>
                </td>
                <td className="py-3 text-right tabular-nums">{l.qty}</td>
                <td className="py-3 text-right tabular-nums">{money(l.price)}</td>
                <td className="py-3 text-right font-semibold tabular-nums">{money(l.price * l.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="ml-auto mt-6 w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-2">Subtotal</dt>
            <dd className="tabular-nums">{money(o.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-2">Delivery</dt>
            <dd className="tabular-nums">{o.deliveryFee ? money(o.deliveryFee) : "Free"}</dd>
          </div>
          <div className="flex justify-between border-t border-ink pt-3 text-lg font-bold">
            <dt>Total</dt>
            <dd className="tabular-nums">{money(o.total)}</dd>
          </div>
        </dl>
        <footer className="mt-12 border-t border-rule pt-6 text-xs text-ink-3">
          Prices include applicable GST. Fresh milk and curd are GST-exempt. Generated from stored order data. Prototype invoice for a final-year
          project; not a valid tax document.
        </footer>
      </article>
    </>
  );
}

export default function InvoicePage() {
  return (
    <div className="bg-cream pb-24 pt-[calc(var(--header-h)+2.5rem)]">
      <div className="wrap">
        <Suspense>
          <Invoice />
        </Suspense>
      </div>
    </div>
  );
}
