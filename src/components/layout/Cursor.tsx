"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A soft milk-drop cursor follower for mouse users. Grows and shows a word
 * over anything marked [data-cursor="Word"].
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let x = -100;
    let y = -100;
    let cx = -100;
    let cy = -100;
    let raf = 0;
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      const t = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-cursor]");
      setLabel(t?.dataset.cursor ?? "");
    };
    const loop = () => {
      cx += (x - cx) * 0.2;
      cy += (y - cy) * 0.2;
      if (dot.current) dot.current.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", move);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={dot} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[90] hidden motion-reduce:!hidden [@media(pointer:fine)]:block" style={{ transform: "translate3d(-100px,-100px,0)" }}>
      <div
        className={`-translate-x-1/2 -translate-y-1/2 rounded-full transition-[width,height,background-color,opacity] duration-300 ease-(--ease-settle) ${
          label ? "grid h-[74px] w-[74px] place-items-center bg-butter/95 opacity-100" : "h-3 w-3 bg-butter opacity-70"
        }`}
      >
        {label && <span className="mono-label text-[0.62rem] font-medium text-ink">{label}</span>}
      </div>
    </div>
  );
}
