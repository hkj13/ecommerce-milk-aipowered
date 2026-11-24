"use client";

import { useState } from "react";
import { AiBadge } from "@/components/ui/bits";
import { SendIcon } from "@/components/ui/icons";
import { productAnswer, productQuestions } from "@/lib/ai-plus";
import type { LiveProduct } from "@/lib/store";

/** "Ask about this product": answers drawn from the product's own data. */
export function ProductAsk({ product }: { product: LiveProduct }) {
  const [q, setQ] = useState("");
  const [log, setLog] = useState<{ q: string; a: string; topic: string }[]>([]);
  const ask = (question: string) => {
    const text = question.trim();
    if (!text) return;
    const a = productAnswer(product, text);
    setLog((l) => [...l.slice(-3), { q: text, a: a.text, topic: a.topic }]);
    setQ("");
  };
  return (
    <section aria-labelledby="ask-title" className="mt-10 rounded-[22px] border border-rule bg-white/60 p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="ask-title" className="text-lg font-semibold">
          Ask about this product
        </h2>
        <AiBadge>Product Q&amp;A · demo</AiBadge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {productQuestions(product).map((x) => (
          <button key={x} type="button" onClick={() => ask(x)} className="chip border border-rule py-1.5 text-[0.8rem] text-ink-2 hover:border-pasture hover:text-pasture">
            {x}
          </button>
        ))}
      </div>
      {log.length > 0 && (
        <ul className="mt-5 space-y-3" aria-live="polite">
          {log.map((m, i) => (
            <li key={i} className="animate-slide-up">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-pasture px-3.5 py-2 text-sm text-milk">{m.q}</p>
              <p className="mt-2 w-fit max-w-[92%] rounded-2xl rounded-bl-md bg-cream px-3.5 py-2.5 text-sm leading-relaxed text-ink">{m.a}</p>
              <p className="mono-label mt-1 text-[0.6rem] text-ink-3">Answered from product data · topic: {m.topic}</p>
            </li>
          ))}
        </ul>
      )}
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <label htmlFor="ask-q" className="sr-only">
          Your question about {product.name}
        </label>
        <input id="ask-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`e.g. Is ${product.name.toLowerCase()} good for kids?`} className="field flex-1 rounded-full py-2.5" />
        <button type="submit" aria-label="Ask" className="grid h-11 w-11 flex-none place-items-center rounded-full bg-pasture text-milk">
          <SendIcon size={17} />
        </button>
      </form>
    </section>
  );
}
