"use client";

import { useState } from "react";
import { AiBadge } from "@/components/ui/bits";
import { SendIcon, SparkIcon } from "@/components/ui/icons";
import { DATA_QUESTIONS, askData, type DataAnswer } from "@/lib/ai-plus";
import { liveCatalogue, useDB } from "@/lib/store";

/** Admin: ask the business a question in plain words. */
export function AskData() {
  const db = useDB()!;
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ q: string; a: DataAnswer } | null>(null);
  const [busy, setBusy] = useState(false);
  const ask = (question: string) => {
    const t = question.trim();
    if (!t) return;
    setQ(t);
    setBusy(true);
    window.setTimeout(() => {
      setRes({ q: t, a: askData(t, db, liveCatalogue(db)) });
      setBusy(false);
    }, 450);
  };
  return (
    <section aria-labelledby="askdata" className="on-dark mb-4 rounded-[22px] bg-night p-5 text-milk md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="askdata" className="flex items-center gap-2 text-[1.05rem] font-semibold">
          <SparkIcon size={18} className="text-butter" /> Ask your data
        </h2>
        <AiBadge dark>Plain-English analytics · demo</AiBadge>
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <label htmlFor="askdata-q" className="sr-only">
          Question about the business
        </label>
        <input
          id="askdata-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. Which product sells the most?"
          className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/[0.06] px-5 py-3 text-milk outline-none placeholder:text-milk/40 focus:border-butter"
        />
        <button type="submit" aria-label="Ask" className="grid h-12 w-12 flex-none place-items-center rounded-full bg-butter text-ink">
          <SendIcon size={18} />
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {DATA_QUESTIONS.slice(0, 6).map((x) => (
          <button key={x} type="button" onClick={() => ask(x)} className="chip border border-white/15 py-1.5 text-[0.78rem] text-milk/75 hover:border-butter hover:text-butter">
            {x}
          </button>
        ))}
      </div>
      {(busy || res) && (
        <div className="mt-5 rounded-2xl bg-white/[0.06] p-4" aria-live="polite">
          {busy ? (
            <p className="text-sm text-milk/60">Reading orders, products and reviews…</p>
          ) : (
            res && (
              <>
                <p className="text-sm text-milk/55">{res.q}</p>
                <p className="mt-1 text-lg font-semibold">{res.a.text}</p>
                {res.a.rows && res.a.rows.length > 0 && (
                  <table className="mt-3 w-full max-w-xl text-sm">
                    <tbody>
                      {res.a.rows.map(([k, v]) => (
                        <tr key={k} className="border-t border-white/10">
                          <td className="py-1.5 pr-4 text-milk/80">{k}</td>
                          <td className="py-1.5 text-right font-semibold tabular-nums">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <p className="mt-3 break-words font-mono text-[0.7rem] text-milk/45">Query it would run: {res.a.query}</p>
              </>
            )
          )}
        </div>
      )}
    </section>
  );
}
