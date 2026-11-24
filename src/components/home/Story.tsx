"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { VoiceOrderButton } from "@/components/ai/VoiceOrder";
import { ArrowRight, SparkIcon } from "@/components/ui/icons";
import { cls } from "@/lib/format";
import { CHAPTERS } from "./chapters";
import { sampleShape, type ShapeId } from "./shapes";

/**
 * The home story, 4:00 to 6:15 AM. One stage stays on screen while the
 * chapters scroll over it: the sky lightens from pre-dawn navy to morning
 * cream, the clock ticks forward, and a field of milk droplets regroups into
 * each chapter's shape (a drop, the cow, the can, 4°C, the lab flask, the
 * bottle, the route, the glass).
 */

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
};
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const NIGHT = ["#fbf8f1", "#f3e6c4", "#f3d58c", "#ffffff"];
const DAY = ["#23402d", "#4f7a4a", "#d9a636", "#87620f"];

export function Story() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const clockLabel = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current!;
    const st = stage.current!;
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wideQ = window.matchMedia("(min-width: 1024px)");
    const N = wideQ.matches ? 2600 : 1100;
    const fontVar = getComputedStyle(document.documentElement).getPropertyValue("--font-fraunces").trim() || "Georgia";
    const articles = Array.from(el.querySelectorAll<HTMLElement>("[data-chapter]"));
    const rails = Array.from(el.querySelectorAll<HTMLElement>("[data-rail]"));

    // ------------------------------------------------------------ shapes
    const cache = new Map<ShapeId, [number, number][]>();
    const shapePts = (id: ShapeId, i: number) => {
      if (!cache.has(id)) cache.set(id, sampleShape(id, N, fontVar, i + 3));
      return cache.get(id)!;
    };
    document.fonts?.ready.then(() => cache.delete("chill"));

    // ---------------------------------------------------------- particles
    let W = 0;
    let H = 0;
    let dpr = 1;
    const box = { x: 0, y: 0, size: 0 };
    const P = Array.from({ length: N }, (_, i) => ({
      x: Math.random() * window.innerWidth,
      y: window.innerHeight + 40 + Math.random() * 300,
      vx: 0,
      vy: 0,
      tx: 0.5,
      ty: 0.5,
      s: 1.2 + Math.random() * (wideQ.matches ? 1.8 : 1.4),
      a: 0.55 + Math.random() * 0.45,
      ph: Math.random() * Math.PI * 2,
      delay: 0,
      c: i % 4,
    }));
    const groups = [0, 1, 2, 3].map((g) => P.filter((p) => p.c === g));
    const stars = Array.from({ length: 160 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.75,
      r: Math.random() * 1.2 + 0.2,
      ph: Math.random() * Math.PI * 2,
    }));

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = st.clientWidth;
      H = st.clientHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cv.style.width = `${W}px`;
      cv.style.height = `${H}px`;
      if (wideQ.matches) {
        box.size = Math.min(W * 0.4, H * 0.62);
        box.x = W * 0.71 - box.size / 2;
        box.y = H * 0.53 - box.size / 2;
      } else {
        box.size = Math.min(W * 0.66, H * 0.33);
        box.x = W * 0.5 - box.size / 2;
        box.y = H * 0.27 - box.size / 2;
      }
    };
    resize();

    let shapeIdx = -1;
    const setShape = (i: number) => {
      if (i === shapeIdx) return;
      shapeIdx = i;
      const pts = shapePts(CHAPTERS[i].shape, i);
      const now = performance.now();
      P.forEach((p, k) => {
        p.tx = pts[k][0];
        p.ty = pts[k][1];
        p.delay = now + (reduced ? 0 : Math.random() * 320);
        if (!reduced) {
          p.vx += (Math.random() - 0.5) * 7;
          p.vy += (Math.random() - 0.5) * 7 - 1.5;
        } else {
          p.x = box.x + p.tx * box.size;
          p.y = box.y + p.ty * box.size;
        }
      });
    };

    // ------------------------------------------------------------ scroll
    let s = 0; // story time: 0 = first chapter centred, 7 = last
    const measure = () => {
      const ref = window.innerHeight * 0.55;
      let p = 0;
      for (let i = 0; i < articles.length; i++) {
        const r = articles[i].getBoundingClientRect();
        if (r.top <= ref) p = i + Math.min(1, (ref - r.top) / Math.max(1, r.height));
      }
      s = clamp(p - 0.55, 0, CHAPTERS.length - 1);
      return p;
    };

    let lastTone = "";
    let lastClock = "";
    let lastRail = -1;
    const applyScene = () => {
      const p = measure();
      setShape(clamp(Math.floor(p + 0.1), 0, CHAPTERS.length - 1));
      const i = Math.floor(s);
      const j = Math.min(CHAPTERS.length - 1, i + 1);
      const t = smooth(clamp(s - i));
      const A = CHAPTERS[i];
      const B = CHAPTERS[j];
      st.style.setProperty("--sky-a", mix(A.sky[0], B.sky[0], t));
      st.style.setProperty("--sky-b", mix(A.sky[1], B.sky[1], t));
      st.style.setProperty("--sky-c", mix(A.sky[2], B.sky[2], t));
      st.style.setProperty("--hills", mix(A.hills, B.hills, t));
      st.style.setProperty("--sun", `${(1 - smooth(clamp((s - 4.6) / 2.4))) * 70}%`);
      st.style.setProperty("--sun-o", `${smooth(clamp((s - 4.4) / 1.6))}`);
      const day = smooth(clamp((s - 6.3) / 0.7));
      st.style.setProperty("--ink", day > 0.5 ? "var(--color-ink)" : "var(--color-milk)");
      const tone = day > 0.5 ? "day" : "night";
      const inView = el.getBoundingClientRect().bottom > 80;
      const want = inView ? tone : "day";
      if (want !== lastTone) {
        lastTone = want;
        window.dispatchEvent(new CustomEvent("ks-tone", { detail: want }));
      }
      // clock ticks forward between chapter times
      const mins = Math.round(toMin(A.time) + (toMin(B.time) - toMin(A.time)) * clamp(s - i));
      const label = `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
      if (label !== lastClock && clock.current) {
        lastClock = label;
        clock.current.textContent = label;
      }
      const ri = Math.round(s);
      if (ri !== lastRail) {
        lastRail = ri;
        if (clockLabel.current) clockLabel.current.textContent = CHAPTERS[ri].label;
        rails.forEach((r, k) => r.toggleAttribute("data-on", k === ri));
      }
      return { day, starA: A.stars + (B.stars - A.stars) * t };
    };

    // ------------------------------------------------------------- mouse
    let mx = -9999;
    let my = -9999;
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
    };
    const onLeave = () => {
      mx = -9999;
      my = -9999;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    // -------------------------------------------------------------- loop
    let raf = 0;
    let running = false;
    const frame = (now: number) => {
      const { day, starA } = applyScene();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // stars
      if (starA > 0.01) {
        ctx.fillStyle = "#fbf8f1";
        stars.forEach((st2) => {
          ctx.globalAlpha = starA * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now * 0.0016 + st2.ph)));
          ctx.fillRect(st2.x * W, st2.y * H, st2.r * 1.4, st2.r * 1.4);
        });
      }

      // particles
      const colors = NIGHT.map((c, k) => mix(c, DAY[k], day));
      const R = 80;
      for (let g = 0; g < 4; g++) {
        ctx.fillStyle = colors[g];
        const list = groups[g];
        for (let k = 0; k < list.length; k++) {
          const p = list[k];
          const tx = box.x + p.tx * box.size + Math.sin(now * 0.0011 + p.ph) * 1.6;
          const ty = box.y + p.ty * box.size + Math.cos(now * 0.0009 + p.ph) * 1.6;
          if (!reduced) {
            if (now >= p.delay) {
              p.vx += (tx - p.x) * 0.016;
              p.vy += (ty - p.y) * 0.016;
            }
            const dx = p.x - mx;
            const dy = p.y - my;
            const d2 = dx * dx + dy * dy;
            if (d2 < R * R) {
              const d = Math.sqrt(d2) || 1;
              const f = (1 - d / R) * 2.4;
              p.vx += (dx / d) * f;
              p.vy += (dy / d) * f;
            }
            p.vx *= 0.86;
            p.vy *= 0.86;
            p.x += p.vx;
            p.y += p.vy;
          } else {
            p.x = tx;
            p.y = ty;
          }
          ctx.globalAlpha = p.a;
          ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : (stop(), applyScene())), { threshold: 0 });
    io.observe(el);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    const onResize = () => {
      resize();
      applyScene();
    };
    window.addEventListener("resize", onResize);
    const onScroll = () => {
      if (!running) {
        const { day } = applyScene();
        void day;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    applyScene();

    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.dispatchEvent(new CustomEvent("ks-tone", { detail: "day" }));
    };
  }, []);

  const jump = (i: number) => {
    const a = root.current?.querySelectorAll<HTMLElement>("[data-chapter]")[i];
    if (!a) return;
    const y = a.getBoundingClientRect().top + window.scrollY;
    const lenis = (window as unknown as { __lenis?: { scrollTo: (y: number, o?: object) => void } }).__lenis;
    if (lenis) lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <section ref={root} aria-label="From pasture to doorstep, 4 AM to 6 AM" className="relative">
      {/* The stage */}
      <div
        ref={stage}
        className="sticky top-0 h-svh overflow-hidden"
        style={
          {
            "--sky-a": CHAPTERS[0].sky[0],
            "--sky-b": CHAPTERS[0].sky[1],
            "--sky-c": CHAPTERS[0].sky[2],
            "--hills": CHAPTERS[0].hills,
            "--sun": "70%",
            "--sun-o": "0",
            "--ink": "var(--color-milk)",
          } as React.CSSProperties
        }
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(110% 70% at 75% 100%, var(--sky-c) 0%, transparent 62%), linear-gradient(180deg, var(--sky-a) 0%, var(--sky-b) 100%)",
          }}
        />
        {/* the sun */}
        <div
          aria-hidden
          className="absolute right-[18%] top-[58%] h-[38vmin] w-[38vmin] rounded-full"
          style={{
            transform: "translateY(var(--sun))",
            opacity: "var(--sun-o)",
            background: "radial-gradient(circle, #fff3d2 0%, #f8cf7c 38%, rgba(248,180,110,0.35) 62%, rgba(248,180,110,0) 72%)",
          }}
        />
        <canvas ref={canvas} aria-hidden className="absolute inset-0" />
        {/* hills */}
        <svg aria-hidden viewBox="0 0 1440 260" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[22vh] w-full">
          <path d="M0 150 C 180 90, 340 120, 520 110 S 860 60, 1040 96 S 1320 140, 1440 100 V260 H0Z" fill="var(--hills)" opacity="0.55" />
          <path d="M0 200 C 220 150, 420 190, 640 170 S 1020 140, 1220 170 S 1380 190, 1440 180 V260 H0Z" fill="var(--hills)" />
        </svg>

        {/* clock */}
        <div className="wrap pointer-events-none absolute inset-x-0 top-[calc(var(--header-h)+1rem)] flex justify-end" style={{ color: "var(--ink)" }}>
          <div className="text-right">
            <p className="font-mono text-[clamp(1.6rem,3.2vw,3rem)] leading-none tracking-tight tabular-nums">
              <span ref={clock}>04:00</span>
              <span className="ml-1.5 text-[0.4em] opacity-70">AM</span>
            </p>
            <p className="mono-label mt-2 opacity-70">
              <span ref={clockLabel}>{CHAPTERS[0].label}</span>
            </p>
          </div>
        </div>

        {/* chapter rail */}
        <nav aria-label="Story chapters" className="absolute right-[max(10px,calc(var(--margin)/2-6px))] top-1/2 hidden -translate-y-1/2 flex-col gap-3.5 lg:flex" style={{ color: "var(--ink)" }}>
          {CHAPTERS.map((c, i) => (
            <button
              key={c.id}
              type="button"
              data-rail
              onClick={() => jump(i)}
              aria-label={`${c.time} ${c.label}`}
              className="group relative grid h-3 w-3 place-items-center"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40 transition-all duration-500 group-data-[on]:h-3 group-data-[on]:w-3 group-data-[on]:opacity-100" />
              <span className="mono-label pointer-events-none absolute right-6 whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-80">
                {c.time} {c.label}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* The chapters, scrolling over the stage */}
      <div className="relative z-10 -mt-[100svh]">
        {CHAPTERS.map((c, i) => {
          const day = i === CHAPTERS.length - 1;
          const hero = i === 0;
          return (
            <article
              key={c.id}
              id={`story-${c.id}`}
              data-chapter
              className={cls(
                "wrap relative flex min-h-svh flex-col pb-[9svh] pt-[54svh] lg:justify-center lg:pb-0 lg:pt-[var(--header-h)]",
                day ? "text-ink" : "text-milk",
                hero && "lg:min-h-[108svh]",
              )}
            >
              <div className={cls("max-w-[38rem] lg:max-w-[min(44%,40rem)]", hero && "lg:max-w-[min(52%,48rem)]")}>
                <p className={cls("mono-label flex items-center gap-3", day ? "text-butter-ink" : "text-butter")}>
                  <span className="tabular-nums">{c.time} AM</span>
                  <span aria-hidden className="h-px w-8 bg-current opacity-50" />
                  {c.label}
                </p>
                {hero ? (
                  <h1 className="display-xxl mt-6 !text-[clamp(3.1rem,6.4vw,7.6rem)] lg:mt-8">
                    {c.headline}
                    <br />
                    <em className="display-em text-butter">{c.em}</em>
                  </h1>
                ) : (
                  <h2 className="display-l mt-5">
                    {c.headline} <em className={cls("display-em", day ? "text-pasture" : "text-butter")}>{c.em}</em>
                  </h2>
                )}
                <p className={cls("body-l mt-6 max-w-[46ch]", day ? "text-ink-2" : "text-milk/75")}>{c.body}</p>

                {c.ai && (
                  <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-butter/40 bg-butter/10 px-3.5 py-1.5 text-[0.78rem] font-semibold text-butter">
                    <SparkIcon size={14} /> {c.ai} · demo
                  </p>
                )}

                {hero && (
                  <div className="mt-9 flex flex-wrap items-center gap-3">
                    <Link href="/subscribe" className="btn btn-butter" data-cursor="Start">
                      Start a subscription <ArrowRight size={18} />
                    </Link>
                    <VoiceOrderButton className="btn btn-ghost text-milk" />
                    <Link href="/shop" className="btn btn-ghost text-milk" data-cursor="Shop">
                      Shop dairy
                    </Link>
                  </div>
                )}

                {c.photo && (
                  <figure className="mt-8 hidden w-full max-w-[25rem] sm:block lg:mt-10">
                    <div className={cls("relative aspect-[16/10] overflow-hidden rounded-[18px]", day ? "ring-1 ring-ink/10" : "ring-1 ring-white/15")}>
                      <Image
                        src={c.photo.src}
                        alt={c.photo.alt}
                        fill
                        sizes="(min-width: 1024px) 400px, 90vw"
                        className="object-cover"
                        style={{ objectPosition: c.photo.focus }}
                      />
                    </div>
                    <figcaption className={cls("mono-label mt-3", day ? "text-ink-3" : "text-milk/55")}>{c.photo.caption}</figcaption>
                  </figure>
                )}

                {day && (
                  <div className="mt-9 flex flex-wrap gap-3">
                    <Link href="/subscribe" className="btn btn-primary" data-cursor="Start">
                      Set up tomorrow&apos;s delivery <ArrowRight size={18} />
                    </Link>
                  </div>
                )}
              </div>
              {hero && (
                <div aria-hidden className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-milk/60 lg:flex">
                  <span className="mono-label">Scroll to sunrise</span>
                  <span className="h-10 w-px overflow-hidden bg-milk/20">
                    <span className="block h-4 w-px bg-milk" style={{ animation: "drip 1.8s ease-in-out infinite" }} />
                  </span>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
