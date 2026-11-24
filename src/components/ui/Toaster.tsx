"use client";

import { useEffect, useState } from "react";

type Toast = { id: number; title: string; body?: string; tone?: "ok" | "info" | "warn" };

/** Show a short message at the bottom of the screen. */
export function toast(title: string, body?: string, tone: Toast["tone"] = "ok") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("ks-toast", { detail: { title, body, tone } }));
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    let n = 0;
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail as Omit<Toast, "id">;
      const id = ++n;
      setItems((xs) => [...xs.slice(-2), { id, ...d }]);
      window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3600);
    };
    window.addEventListener("ks-toast", on);
    return () => window.removeEventListener("ks-toast", on);
  }, []);
  return (
    <div
      aria-live="polite"
      className="no-print pointer-events-none fixed inset-x-0 bottom-5 z-[80] flex flex-col items-center gap-2 px-4"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className="animate-slide-up pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl bg-ink px-5 py-3.5 text-milk shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]"
        >
          <span
            aria-hidden
            className={`mt-1.5 h-2 w-2 flex-none rounded-full ${t.tone === "warn" ? "bg-dawn" : t.tone === "info" ? "bg-milk/70" : "bg-butter"}`}
          />
          <div>
            <p className="text-sm font-semibold">{t.title}</p>
            {t.body && <p className="mt-0.5 text-[0.8rem] text-milk/70">{t.body}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
