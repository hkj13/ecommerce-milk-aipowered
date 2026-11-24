"use client";

import { useMemo } from "react";
import { BarList, ForecastChart, SegmentBar } from "@/components/charts/Charts";
import { Panel, Tile, TopBar } from "@/components/admin/Shell";
import { AiBadge } from "@/components/ui/bits";
import { AlertIcon, ShieldIcon } from "@/components/ui/icons";
import { productBySlug } from "@/data/products";
import { QUALITY_LIMITS, forecastDemand, loginFlags, procurementPlan, qualityFlags, summariseFeedback } from "@/lib/ai";
import { cls, fmtDateTime, fmtDay } from "@/lib/format";
import { useDB } from "@/lib/store";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AdminInsights() {
  const db = useDB()!;
  const fc = useMemo(() => forecastDemand(14), []);
  const fb = useMemo(() => summariseFeedback(db.reviews), [db]);
  const lFlags = useMemo(() => loginFlags(db.loginEvents), [db]);
  const held = db.orders.filter((o) => o.payment.status === "review");
  const plan = procurementPlan(fc.forecast[0].litres);

  return (
    <>
      <TopBar title="AI insights" sub="Demand forecast, feedback, quality and security. Decision support: a person makes the call.">
        <AiBadge>Simulated in code · sample data</AiBadge>
      </TopBar>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Tile label="Tomorrow's milk demand" value={`${fc.forecast[0].litres} L`} hint={`90% range ${fc.forecast[0].lo}–${fc.forecast[0].hi} L`} />
        <Tile label="Next 7 days vs last 7" value={`${fc.weeklyGrowth >= 0 ? "+" : ""}${fc.weeklyGrowth.toFixed(1)}%`} hint={`trend ${fc.trendPerWeek >= 0 ? "+" : ""}${fc.trendPerWeek.toFixed(1)} L/day each week`} />
        <Tile label="Forecast error (back-test)" value={`${fc.mape.toFixed(1)}%`} hint="MAPE on the last 14 days" />
        <Tile label="Reviews that are positive" value={`${Math.round(fb.positiveShare * 100)}%`} hint={`${fb.total} reviews classified`} />
      </div>

      {/* demand */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Daily milk demand and 14-day forecast" className="xl:col-span-2">
          <ForecastChart history={fc.history} forecast={fc.forecast} />
          <p className="mt-4 text-xs text-ink-3">
            Demo model: day-of-week factors × linear trend, fitted on 120 days of sample orders. Production: Pandas + Scikit-learn regression with holiday and weather features.
          </p>
        </Panel>
        <Panel title="Next 7 days">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-3">
                <th className="py-1.5 font-medium">Day</th>
                <th className="py-1.5 text-right font-medium">Litres</th>
                <th className="py-1.5 text-right font-medium">Range</th>
              </tr>
            </thead>
            <tbody>
              {fc.forecast.slice(0, 7).map((d) => (
                <tr key={d.date} className="border-t border-rule">
                  <td className="py-2">{fmtDay(d.date)}</td>
                  <td className="py-2 text-right font-semibold tabular-nums">{d.litres}</td>
                  <td className="py-2 text-right tabular-nums text-ink-3">
                    {d.lo}–{d.hi}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mono-label mt-6 text-ink-3">Day-of-week pattern</p>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs">
            {fc.dowFactors.map((f, i) => (
              <div key={i}>
                <div className="mx-auto flex h-16 w-full items-end justify-center">
                  <div className="w-3 rounded-t-[4px]" style={{ height: `${Math.max(8, (f - 0.85) * 220)}%`, background: i === DOW.indexOf(fc.peakDay.slice(0, 3)) ? "#c27c12" : "#1f7a4a" }} title={`${DOW[i]}: ${(f * 100).toFixed(0)}% of average`} />
                </div>
                <p className="mt-1 text-ink-3">{DOW[i][0]}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-2">
            {fc.peakDay}s are {Math.round(fc.peakLift)}% above average; {fc.lowDay}s are the quietest.
          </p>
        </Panel>
      </div>

      <Panel title={`Procurement for tomorrow: ${fc.forecast[0].litres} L`} className="mt-4">
        <div className="grid gap-3 md:grid-cols-5">
          {plan.map((m) => (
            <div key={m.slug} className="rounded-2xl bg-cream p-4">
              <p className="text-sm font-semibold">{m.name}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{m.withBuffer} L</p>
              <p className="text-xs text-ink-3">{Math.round(m.share * 100)}% of mix · incl. 5% buffer</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* feedback */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Customer feedback, classified" action={<AiBadge>Sentiment analysis · demo</AiBadge>} className="xl:col-span-2">
          <SegmentBar
            parts={[
              { label: "Positive", value: fb.counts.positive, color: "#1f7a4a" },
              { label: "Neutral", value: fb.counts.neutral, color: "#8d8574" },
              { label: "Negative", value: fb.counts.negative, color: "#b3361f" },
            ]}
          />
          <p className="mono-label mt-8 text-ink-3">Needs attention</p>
          <ul className="mt-3 space-y-3">
            {fb.rows
              .filter((r) => r.s.label === "negative")
              .slice(0, 5)
              .map((r) => (
                <li key={r.id} className="rounded-2xl border border-rule p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">
                      {r.name} on {productBySlug(r.slug)?.name ?? r.slug}
                    </span>
                    <span className="chip bg-alert/10 py-0.5 text-[0.68rem] text-alert">negative · {r.rating}★</span>
                  </div>
                  <p className="mt-1.5 text-ink-2">{r.text}</p>
                  <p className="mt-1.5 text-xs text-ink-3">Signals: {r.s.hits.join(", ")}</p>
                </li>
              ))}
          </ul>
        </Panel>
        <Panel title="Most mentioned issues">
          <BarList data={fb.issues.map((i) => ({ label: i.label, value: i.count }))} format={(v) => `${v} review${v === 1 ? "" : "s"}`} color="#b3361f" />
          <p className="mono-label mt-8 text-ink-3">What people praise</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {fb.praise.map(([w, n]) => (
              <span key={w} className="chip bg-ok/10 text-ok">
                {w} · {n}
              </span>
            ))}
          </div>
          <p className="mt-6 text-xs text-ink-3">Demo: keyword lexicon with negation and star rating. Production: an NLP classifier or AI API, with summaries of recurring issues.</p>
        </Panel>
      </div>

      {/* quality */}
      <Panel title="Milk quality monitoring" action={<AiBadge>Flags unusual readings · demo</AiBadge>} className="mt-4">
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="text-left text-ink-3">
                <th className="px-2 py-2 font-medium">Batch</th>
                <th className="px-2 py-2 text-right font-medium">Litres</th>
                <th className="px-2 py-2 text-right font-medium">Fat %</th>
                <th className="px-2 py-2 text-right font-medium">SNF %</th>
                <th className="px-2 py-2 text-right font-medium">Temp °C</th>
                <th className="px-2 py-2 text-right font-medium">Acidity</th>
                <th className="px-2 py-2 text-right font-medium">Plate count</th>
                <th className="px-2 py-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {[...db.quality].reverse().map((q) => {
                const f = qualityFlags(q);
                const bad = (k: keyof typeof QUALITY_LIMITS) => {
                  const lim = QUALITY_LIMITS[k] as { min?: number; max?: number };
                  const v = q[k] as number;
                  return (lim.min !== undefined && v < lim.min) || (lim.max !== undefined && v > lim.max);
                };
                return (
                  <tr key={q.batch} className={cls("border-t border-rule", f.length > 0 && "bg-alert/[0.04]")}>
                    <td className="px-2 py-2.5">
                      <span className="font-mono font-semibold">{q.batch}</span>
                      <span className="block text-xs text-ink-3">{fmtDateTime(q.at)}</span>
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{q.litres}</td>
                    {(["fat", "snf", "tempC", "acidity", "tpc"] as const).map((k) => (
                      <td key={k} className={cls("px-2 py-2.5 text-right tabular-nums", bad(k) && "font-bold text-alert")}>
                        {k === "tpc" ? q[k].toLocaleString("en-IN") : q[k]}
                      </td>
                    ))}
                    <td className="px-2 py-2.5">
                      {f.length ? (
                        <span className="flex items-start gap-1.5 text-xs text-alert">
                          <AlertIcon size={14} className="mt-px flex-none" /> {f[0]}
                        </span>
                      ) : (
                        <span className="text-xs text-ok">Within limits</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-3">
          Limits: fat ≥ {QUALITY_LIMITS.fat.min}%, SNF ≥ {QUALITY_LIMITS.snf.min}%, chilled ≤ {QUALITY_LIMITS.tempC.max}°C, acidity ≤ {QUALITY_LIMITS.acidity.max}, plate count ≤{" "}
          {QUALITY_LIMITS.tpc.max.toLocaleString("en-IN")}. Decision support only: flagged batches are physically re-tested and released by the quality lead.
        </p>
      </Panel>

      {/* security */}
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title={<span className="flex items-center gap-2"><ShieldIcon size={17} /> Unusual sign-ins</span>} action={<AiBadge>Login pattern flags · demo</AiBadge>}>
          <ul className="space-y-3 text-sm">
            {lFlags.map((f, i) => (
              <li key={i} className={cls("rounded-2xl border p-3.5", f.severity === "high" ? "border-alert/30 bg-alert/[0.04]" : "border-dawn/40 bg-dawn/[0.06]")}>
                <p className="font-semibold">{f.email}</p>
                <p className="text-ink-2">{f.reason}</p>
                <p className="text-xs text-ink-3">{fmtDateTime(f.at)} · extra OTP check required on next sign-in</p>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={<span className="flex items-center gap-2"><ShieldIcon size={17} /> Payments held for review</span>}>
          {held.length === 0 ? (
            <p className="text-ink-2">Nothing waiting.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {held.map((o) => (
                <li key={o.id} className="rounded-2xl border border-alert/30 bg-alert/[0.04] p-3.5">
                  <p className="font-semibold">
                    {o.id} · {db.users.find((u) => u.id === o.userId)?.name}
                  </p>
                  <p className="text-ink-2">{o.payment.flag}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-ink-3">Approve or reject these on the Orders tab. The system never rejects a legitimate payment by itself.</p>
        </Panel>
      </div>
    </>
  );
}
