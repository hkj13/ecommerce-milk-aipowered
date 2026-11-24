"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Mark } from "@/components/brand/Logo";
import { ProductThumb } from "@/components/shop/ProductArt";
import { toast } from "@/components/ui/Toaster";
import { CloseIcon, InfoIcon, MicIcon, PlusIcon, SendIcon, SparkIcon } from "@/components/ui/icons";
import { addToCart } from "@/lib/actions";
import { STARTER_QUESTIONS, reply, type ChatAnswer, type Match } from "@/lib/chat";
import { cls, money } from "@/lib/format";
import { getDB, useCatalogue, useSession } from "@/lib/store";
import { useSpeech } from "@/components/shop/useSpeech";

type Msg = { id: number; from: "user" | "bot"; text: string; answer?: ChatAnswer; match?: Match };

/** Open the assistant from anywhere, optionally asking a question. */
export function openChat(question?: string) {
  window.dispatchEvent(new CustomEvent("ks-chat", { detail: { q: question } }));
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [debug, setDebug] = useState(true);
  const list = useRef<HTMLDivElement>(null);
  const idRef = useRef(1);
  const { user } = useSession();
  const catalogue = useCatalogue();
  const speech = useSpeech((text) => {
    setInput(text);
    send(text);
  });

  const greet = () => {
    const name = user ? `, ${user.name.split(" ")[0]}` : "";
    setMsgs([
      {
        id: idRef.current++,
        from: "bot",
        text: `Vanakkam${name}! I'm the Ksheera assistant. Ask me about prices, delivery times, subscriptions or your orders.`,
        answer: { text: "", chips: STARTER_QUESTIONS.slice(0, 6) },
      },
    ]);
  };

  function send(text: string) {
    const q = text.trim();
    if (!q) return;
    setMsgs((m) => [...m, { id: idRef.current++, from: "user", text: q }]);
    setInput("");
    setTyping(true);
    const delay = 550 + Math.min(900, q.length * 18);
    window.setTimeout(() => {
      const db = getDB();
      const u = db?.session ? (db.users.find((x) => x.id === db.session!.userId) ?? null) : null;
      const { answer, match } = reply(q, db, u);
      setTyping(false);
      setMsgs((m) => [...m, { id: idRef.current++, from: "bot", text: answer.text, answer, match }]);
      if (answer.escalate) toast("Sent to the support team", "In the full system this opens a ticket.", "info");
    }, delay);
  }

  useEffect(() => {
    const on = (e: Event) => {
      const q = (e as CustomEvent).detail?.q as string | undefined;
      setOpen(true);
      if (q) window.setTimeout(() => send(q), 250);
    };
    window.addEventListener("ks-chat", on);
    const t = new URLSearchParams(window.location.search).get("chat") === "1" ? window.setTimeout(() => setOpen(true), 400) : 0;
    return () => {
      window.removeEventListener("ks-chat", on);
      window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (open && msgs.length === 0) greet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  return (
    <div className="no-print">
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close assistant" : "Open the Ksheera assistant"}
        className={cls(
          "fixed bottom-4 right-4 z-[65] flex items-center gap-2.5 rounded-full bg-night p-2 text-milk sm:bottom-5 sm:right-5 sm:py-3 sm:pl-3 sm:pr-5 shadow-[0_18px_40px_-14px_rgba(14,21,37,0.7)] transition-transform duration-500 ease-(--ease-settle) hover:-translate-y-0.5 md:bottom-7 md:right-7",
          open && "max-sm:hidden",
        )}
      >
        <span className="relative grid h-9 w-9 place-items-center rounded-full bg-butter text-ink">
          {!open && <span aria-hidden className="absolute inset-0 rounded-full bg-butter [animation:pulse-ring_2.4s_ease-out_infinite]" />}
          {open ? <CloseIcon size={18} /> : <SparkIcon size={19} />}
        </span>
        <span className="hidden text-sm font-semibold sm:inline">{open ? "Close" : "Ask Ksheera"}</span>
      </button>

      {/* Panel */}
      <section
        aria-label="Ksheera assistant"
        data-lenis-prevent
        className={cls(
          "fixed z-[66] flex flex-col overflow-hidden bg-milk shadow-[0_40px_90px_-30px_rgba(14,21,37,0.55)] transition-[opacity,transform,visibility] duration-500 ease-(--ease-settle)",
          "inset-0 sm:inset-auto sm:bottom-24 sm:right-5 sm:h-[min(680px,calc(100svh-8rem))] sm:w-[400px] sm:rounded-[28px] sm:border sm:border-rule md:right-7",
          open ? "visible translate-y-0 opacity-100" : "invisible translate-y-6 opacity-0",
        )}
      >
        <header className="on-dark relative bg-night px-5 pb-4 pt-4 text-milk">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-milk">
              <Mark className="h-6 w-auto" />
            </span>
            <div className="flex-1">
              <p className="font-display text-lg leading-tight">Ksheera Assistant</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[0.72rem] text-butter">
                <span className="h-1.5 w-1.5 rounded-full bg-butter" /> Demo mode · AI not connected
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
              <CloseIcon size={20} />
            </button>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-white/[0.06] p-3 text-[0.75rem] leading-snug text-milk/75">
            <InfoIcon size={15} className="mt-px flex-none text-butter" />
            <p>
              Answers come from sample questions written in code (<code className="text-milk">src/lib/chat.ts</code>). In the
              full system, this calls an NLP model or AI API.{" "}
              <button type="button" onClick={() => setDebug((d) => !d)} className="underline underline-offset-2">
                {debug ? "Hide" : "Show"} how it matched
              </button>
            </p>
          </div>
        </header>

        <div ref={list} className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
          {msgs.map((m) =>
            m.from === "user" ? (
              <div key={m.id} className="flex justify-end">
                <p className="max-w-[82%] rounded-[18px] rounded-br-md bg-pasture px-4 py-2.5 text-[0.92rem] text-milk">{m.text}</p>
              </div>
            ) : (
              <div key={m.id} className="animate-slide-up max-w-[92%]">
                {m.text && (
                  <div className="rounded-[18px] rounded-bl-md bg-cream px-4 py-3 text-[0.92rem] leading-relaxed text-ink">
                    {m.text.split("\n").map((line, i) => (line ? <p key={i}>{line}</p> : <div key={i} className="h-2" />))}
                  </div>
                )}
                {m.answer?.products && m.answer.products.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {m.answer.products.map((slug) => {
                      const p = catalogue.find((x) => x.slug === slug);
                      if (!p) return null;
                      const v = p.variants[0];
                      return (
                        <div key={slug} className="flex items-center gap-3 rounded-2xl border border-rule bg-white/70 p-2 pr-3">
                          <Link href={`/shop/${p.slug}`} className="h-14 w-14 flex-none overflow-hidden rounded-xl">
                            <ProductThumb product={p} sizes="56px" />
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link href={`/shop/${p.slug}`} className="block truncate text-sm font-semibold">
                              {p.name}
                            </Link>
                            <p className="text-xs text-ink-3">
                              {v.label} · {money(v.price)}
                            </p>
                          </div>
                          <button
                            type="button"
                            aria-label={`Add ${p.name} to cart`}
                            disabled={p.stock <= 0}
                            onClick={() => {
                              addToCart(p.slug, v.id);
                              toast(`${p.name} added`, v.label);
                            }}
                            className="grid h-9 w-9 place-items-center rounded-full bg-pasture text-milk disabled:opacity-40"
                          >
                            <PlusIcon size={17} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {m.answer?.links && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.answer.links.map((l) => (
                      <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="chip border border-pasture/25 bg-white text-pasture hover:bg-pasture hover:text-milk">
                        {l.label} →
                      </Link>
                    ))}
                  </div>
                )}
                {m.answer?.escalate && (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-dawn/20 px-3 py-1 text-[0.72rem] font-semibold text-clay">
                    Handed over to a person
                  </p>
                )}
                {m.answer?.chips && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {m.answer.chips.map((c) => (
                      <button key={c} type="button" onClick={() => send(c)} className="chip border border-rule bg-white text-ink-2 hover:border-pasture hover:text-pasture">
                        {c}
                      </button>
                    ))}
                  </div>
                )}
                {debug && m.match && (
                  <p className="mono-label mt-1.5 text-[0.6rem] text-ink-3">
                    {m.match.intent === "fallback"
                      ? "No sample question matched · fallback reply"
                      : `Matched intent: ${m.match.intent} · confidence ${Math.round(m.match.confidence * 100)}%`}
                  </p>
                )}
              </div>
            ),
          )}
          {typing && (
            <div className="flex w-16 items-center justify-center gap-1 rounded-[18px] rounded-bl-md bg-cream px-4 py-3.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-ink-3" style={{ animation: `typing 1s ${i * 0.15}s infinite` }} />
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-rule bg-milk p-3"
        >
          <label htmlFor="chat-input" className="sr-only">
            Your question
          </label>
          <input
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={speech.listening ? "Listening…" : "Ask about milk, delivery, orders…"}
            autoComplete="off"
            className="field flex-1 rounded-full py-3"
          />
          {speech.supported && (
            <button
              type="button"
              onClick={speech.listening ? speech.stop : speech.start}
              aria-label="Ask by voice"
              className={cls("grid h-11 w-11 flex-none place-items-center rounded-full border border-rule", speech.listening && "bg-clay text-milk")}
            >
              <MicIcon size={18} />
            </button>
          )}
          <button type="submit" aria-label="Send" className="grid h-11 w-11 flex-none place-items-center rounded-full bg-pasture text-milk">
            <SendIcon size={18} />
          </button>
        </form>
      </section>
    </div>
  );
}

