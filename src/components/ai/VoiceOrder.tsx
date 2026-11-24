"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSpeech } from "@/components/shop/useSpeech";
import { ProductThumb } from "@/components/shop/ProductArt";
import { toast } from "@/components/ui/Toaster";
import { AiBadge } from "@/components/ui/bits";
import { CloseIcon, MicIcon, RepeatIcon, TrashIcon } from "@/components/ui/icons";
import { ORDER_EXAMPLES, parseOrder, type ParsedLine } from "@/lib/ai-plus";
import { addToCart } from "@/lib/actions";
import { cls, fmtDay, money } from "@/lib/format";
import { useCatalogue } from "@/lib/store";

/** Open the voice order panel from anywhere, optionally with a sentence ready. */
export function openVoiceOrder(text?: string) {
  window.dispatchEvent(new CustomEvent("ks-voice", { detail: { text } }));
}

export function VoiceOrderButton({ className = "", label = "Say your order" }: { className?: string; label?: string }) {
  return (
    <button type="button" onClick={() => openVoiceOrder()} className={className} data-cursor="Speak">
      <MicIcon size={18} /> {label}
    </button>
  );
}

/** Add parsed lines to the cart. */
export function addParsed(lines: ParsedLine[]) {
  lines.forEach((l) => addToCart(l.slug, l.variant, l.qty));
}

export function VoiceOrder() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [removed, setRemoved] = useState<string[]>([]);
  const catalogue = useCatalogue();
  const router = useRouter();
  const speech = useSpeech((t) => {
    setText(t);
    setRemoved([]);
  });

  useEffect(() => {
    const on = (e: Event) => {
      const t = (e as CustomEvent).detail?.text as string | undefined;
      setOpen(true);
      setRemoved([]);
      if (t) setText(t);
    };
    window.addEventListener("ks-voice", on);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("ks-voice", on);
      window.removeEventListener("keydown", esc);
    };
  }, []);

  const parsed = useMemo(() => parseOrder(text, catalogue), [text, catalogue]);
  const lines = parsed.lines.filter((l) => !removed.includes(l.slug + l.variant));
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);

  const done = (go: boolean) => {
    addParsed(lines);
    toast(`${lines.length} item${lines.length > 1 ? "s" : ""} added by voice`, `${money(total)} · arriving ${fmtDay(parsed.day)}`);
    setOpen(false);
    setText("");
    if (go) router.push("/checkout");
  };

  if (!open) return null;
  return (
    <div className="no-print fixed inset-0 z-[75] flex items-end justify-center bg-night/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Order by voice" onClick={() => setOpen(false)}>
      <div className="animate-slide-up max-h-[92svh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] bg-milk p-6 shadow-2xl sm:rounded-[28px] md:p-8" data-lenis-prevent onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <AiBadge>AI voice ordering · demo</AiBadge>
            <h2 className="display-m mt-4">
              Just say <span className="display-em text-pasture">your order.</span>
            </h2>
            <p className="mt-2 text-ink-2">Speak or type it the way you&apos;d tell the milkman. English, Tamil and Hindi number words work.</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-10 w-10 flex-none place-items-center rounded-full hover:bg-cream">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button
            type="button"
            onClick={speech.listening ? speech.stop : speech.start}
            disabled={!speech.supported}
            aria-label={speech.listening ? "Stop listening" : "Start speaking"}
            className={cls("relative grid h-20 w-20 flex-none place-items-center rounded-full text-milk transition-colors", speech.listening ? "bg-clay" : "bg-pasture hover:bg-pasture-700", !speech.supported && "opacity-50")}
          >
            {speech.listening && (
              <>
                <span aria-hidden className="absolute inset-0 rounded-full bg-clay [animation:pulse-ring_1.6s_ease-out_infinite]" />
                <span aria-hidden className="absolute inset-0 rounded-full bg-clay [animation:pulse-ring_1.6s_0.5s_ease-out_infinite]" />
              </>
            )}
            <MicIcon size={30} className="relative" />
          </button>
          <div className="min-w-0 flex-1">
            <label htmlFor="voice-text" className="text-sm font-semibold">
              {speech.listening ? "Listening… speak now" : speech.supported ? "Tap the mic, or type below" : "Type your order (voice needs Chrome, Edge or Safari)"}
            </label>
            <textarea
              id="voice-text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setRemoved([]);
              }}
              rows={2}
              placeholder="e.g. Two litres of A2 milk and one paneer"
              className="field mt-2 resize-none"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {ORDER_EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => (setText(ex), setRemoved([]))} className="chip border border-rule py-1.5 text-[0.78rem] text-ink-2 hover:border-pasture hover:text-pasture">
              “{ex}”
            </button>
          ))}
        </div>

        {text.trim() && (
          <div className="mt-6 rounded-[22px] border border-rule bg-white/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">What I understood</p>
              <p className="mono-label text-ink-3">Confidence {Math.round(parsed.confidence * 100)}%</p>
            </div>
            {lines.length === 0 ? (
              <p className="mt-3 text-ink-2">I couldn&apos;t find a product in that. Try “one litre of milk and a curd”.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {lines.map((l) => {
                  const p = catalogue.find((x) => x.slug === l.slug);
                  return (
                    <li key={l.slug + l.variant} className="flex items-center gap-3">
                      <span className="relative h-12 w-12 flex-none overflow-hidden rounded-xl" style={{ background: p?.tint }}>
                        {p && <ProductThumb product={p} sizes="48px" />}
                      </span>
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="block font-semibold">
                          {l.qty} × {l.name}
                        </span>
                        <span className="text-ink-3">
                          {l.label} · heard “{l.heard}”
                        </span>
                      </span>
                      <span className="text-sm font-semibold tabular-nums">{money(l.price * l.qty)}</span>
                      <button type="button" aria-label={`Remove ${l.name}`} onClick={() => setRemoved((r) => [...r, l.slug + l.variant])} className="grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-alert/10 hover:text-alert">
                        <TrashIcon size={15} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {parsed.unknown.length > 0 && <p className="mt-3 text-sm text-clay">Didn&apos;t catch: {parsed.unknown.map((u) => `“${u}”`).join(", ")}</p>}
            {lines.length > 0 && (
              <p className="mt-4 border-t border-rule pt-3 text-sm text-ink-2">
                Delivery {fmtDay(parsed.day)}, {parsed.slot === "morning" ? "5:30 to 7:30 AM" : "5 to 7 PM"} · Total <span className="font-semibold text-ink">{money(total)}</span>
                {parsed.dayNote && <span className="block text-xs text-ink-3">{parsed.dayNote}</span>}
              </p>
            )}
            {parsed.subscribe && (
              <Link
                href={`/subscribe?product=${parsed.subscribe.slug}${parsed.subscribe.litres ? `&litres=${parsed.subscribe.litres}` : ""}`}
                onClick={() => setOpen(false)}
                className="mt-4 flex items-center gap-3 rounded-2xl bg-butter/15 p-3 text-sm font-semibold text-butter-ink"
              >
                <RepeatIcon size={17} /> You said “{parsed.subscribe.frequency === "daily" ? "every day" : parsed.subscribe.frequency}”. Make it a subscription instead →
              </Link>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" disabled={!lines.length} onClick={() => done(false)} className="btn btn-primary">
            Add to cart
          </button>
          <button type="button" disabled={!lines.length} onClick={() => done(true)} className="btn btn-butter">
            Add and check out
          </button>
          <p className="text-xs text-ink-3">Speech to text by your browser; text to items by rules in code. Production: an AI model with function calling.</p>
        </div>
      </div>
    </div>
  );
}
