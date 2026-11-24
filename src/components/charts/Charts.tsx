"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { cls } from "@/lib/format";

/**
 * Small hand-built SVG charts for the dashboard. Thin marks, recessive
 * hairline grid, one baseline, a hover layer on every chart, and values that
 * are always also reachable as text (labels or the table beside them).
 *
 * Series colours (validated for colour-blind separation on the card surface):
 *   series-1 #1f7a4a pasture green · series-2 #c27c12 amber · series-3 #b3361f
 */
export const SERIES = ["#1f7a4a", "#c27c12", "#b3361f"];
const GRID = "#ebe3d1";
const AXIS = "#736b5e";

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * p;
}
const compact = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)}K` : n.toLocaleString("en-IN"));

function useWidth<T extends HTMLElement>() {
  const ro = useRef<ResizeObserver | null>(null);
  const [w, setW] = useState(640);
  const set = useCallback((el: T | null) => {
    ro.current?.disconnect();
    if (!el) return;
    ro.current = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.current.observe(el);
  }, []);
  return [set, w] as const;
}

function Tooltip({ x, y, children, width }: { x: number; y: number; children: React.ReactNode; width: number }) {
  const left = Math.min(Math.max(x, 70), width - 70);
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-ink px-3 py-2 text-[0.78rem] text-milk shadow-lg"
      style={{ left, top: y - 10 }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------- columns */

export function ColumnChart({
  data,
  format = (v) => String(v),
  height = 220,
  label,
  highlightLast = false,
}: {
  data: { label: string; short?: string; value: number }[];
  format?: (v: number) => string;
  height?: number;
  label: string;
  highlightLast?: boolean;
}) {
  const [setRef, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const padL = 44;
  const padB = 26;
  const padT = 10;
  const H = height;
  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const band = (W - padL) / data.length;
  const bw = Math.min(24, band * 0.62);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  const every = Math.ceil(data.length / Math.max(4, Math.floor(W / 70)));

  return (
    <div ref={setRef} className="relative w-full">
      <svg width={W} height={H} role="img" aria-label={label} onPointerLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
            <text x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={AXIS} className="tabular-nums">
              {compact(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = padL + band * i + (band - bw) / 2;
          const top = y(d.value);
          const h = Math.max(0, H - padB - top);
          const r = Math.min(4, h);
          const last = highlightLast && i === data.length - 1;
          return (
            <g key={d.label}>
              <path
                d={`M${x},${H - padB} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${H - padB} Z`}
                fill={last ? SERIES[1] : SERIES[0]}
                opacity={hover === null || hover === i ? 1 : 0.45}
              />
              <rect
                x={padL + band * i}
                y={padT}
                width={band}
                height={H - padT - padB}
                fill="transparent"
                tabIndex={0}
                aria-label={`${d.label}: ${format(d.value)}`}
                onPointerEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              />
              {i % every === 0 && (
                <text x={padL + band * i + band / 2} y={H - 8} textAnchor="middle" fontSize={11} fill={AXIS}>
                  {d.short ?? d.label}
                </text>
              )}
            </g>
          );
        })}
        <line x1={padL} x2={W} y1={H - padB} y2={H - padB} stroke="#cfc4ac" />
      </svg>
      {hover !== null && (
        <Tooltip x={padL + band * hover + band / 2} y={y(data[hover].value)} width={W}>
          <p className="font-semibold tabular-nums">{format(data[hover].value)}</p>
          <p className="text-milk/70">{data[hover].label}</p>
        </Tooltip>
      )}
    </div>
  );
}

/* ----------------------------------------------------- forecast (line) */

export function ForecastChart({
  history,
  forecast,
  height = 280,
}: {
  history: { date: string; litres: number }[];
  forecast: { date: string; litres: number; lo: number; hi: number }[];
  height?: number;
}) {
  const [setRef, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const all = useMemo(
    () => [
      ...history.map((h) => ({ ...h, kind: "actual" as const, lo: 0, hi: 0 })),
      ...forecast.map((f) => ({ ...f, kind: "forecast" as const })),
    ],
    [history, forecast],
  );
  const padL = 44;
  const padR = 64;
  const padB = 26;
  const padT = 12;
  const H = height;
  const vals = all.flatMap((d) => (d.kind === "forecast" ? [d.hi, d.lo] : [d.litres]));
  const minV = Math.floor(Math.min(...vals) / 50) * 50;
  const maxV = Math.ceil(Math.max(...vals) / 50) * 50;
  const x = (i: number) => padL + ((W - padL - padR) * i) / (all.length - 1);
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - minV) / (maxV - minV));
  const hn = history.length;
  const histPath = history.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.litres).toFixed(1)}`).join(" ");
  const fcPath = [`M${x(hn - 1)},${y(history[hn - 1].litres)}`, ...forecast.map((d, i) => `L${x(hn + i).toFixed(1)},${y(d.litres).toFixed(1)}`)].join(" ");
  const band =
    `M${x(hn - 1)},${y(history[hn - 1].litres)} ` +
    forecast.map((d, i) => `L${x(hn + i).toFixed(1)},${y(d.hi).toFixed(1)}`).join(" ") +
    " " +
    [...forecast]
      .map((d, i) => ({ d, i }))
      .reverse()
      .map(({ d, i }) => `L${x(hn + i).toFixed(1)},${y(d.lo).toFixed(1)}`)
      .join(" ") +
    " Z";
  const ticks = Array.from({ length: 5 }, (_, i) => minV + ((maxV - minV) * i) / 4);
  const months = all
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d.date.endsWith("-01") || d.date.endsWith("-15"));
  const last = forecast[forecast.length - 1];

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = Math.round(((px - padL) / (W - padL - padR)) * (all.length - 1));
    setHover(Math.max(0, Math.min(all.length - 1, i)));
  };
  const h = hover !== null ? all[hover] : null;

  return (
    <div ref={setRef} className="relative w-full">
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[0.8rem] text-ink-2">
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-5 rounded" style={{ background: SERIES[0] }} /> Actual litres
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-5 rounded" style={{ background: `repeating-linear-gradient(90deg, ${SERIES[1]} 0 5px, transparent 5px 8px)` }} /> Forecast
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-5 rounded-sm" style={{ background: SERIES[1], opacity: 0.16 }} /> 90% range
        </span>
      </div>
      <svg width={W} height={H} role="img" aria-label="Daily milk demand: last 120 days and 14-day forecast" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <defs>
          <clipPath id={`c${uid}`}>
            <rect x={padL} y={0} width={W - padL - padR + 4} height={H} />
          </clipPath>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={GRID} />
            <text x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={AXIS} className="tabular-nums">
              {Math.round(t)}
            </text>
          </g>
        ))}
        {months.map(({ d, i }) => (
          <text key={d.date} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill={AXIS}>
            {new Date(d.date + "T00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </text>
        ))}
        <line x1={x(hn - 1)} x2={x(hn - 1)} y1={padT} y2={H - padB} stroke="#cfc4ac" />
        <text x={x(hn - 1) + 6} y={padT + 10} fontSize={11} fill={AXIS}>
          Today
        </text>
        <g clipPath={`url(#c${uid})`}>
          <path d={band} fill={SERIES[1]} opacity={0.14} />
          <path d={histPath} fill="none" stroke={SERIES[0]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <path d={fcPath} fill="none" stroke={SERIES[1]} strokeWidth={2} strokeDasharray="5 3" strokeLinejoin="round" strokeLinecap="round" />
        </g>
        <circle cx={x(all.length - 1)} cy={y(last.litres)} r={4.5} fill={SERIES[1]} stroke="#fffdf8" strokeWidth={2} />
        <text x={x(all.length - 1) + 8} y={y(last.litres)} dy="0.32em" fontSize={12} fill="#1c1a16" fontWeight={600}>
          {last.litres} L
        </text>
        {h && hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} stroke="#1c1a16" strokeOpacity={0.35} />
            <circle cx={x(hover)} cy={y(h.litres)} r={4.5} fill={h.kind === "actual" ? SERIES[0] : SERIES[1]} stroke="#fffdf8" strokeWidth={2} />
          </g>
        )}
      </svg>
      {h && hover !== null && (
        <Tooltip x={x(hover)} y={y(h.kind === "forecast" ? h.hi : h.litres)} width={W}>
          <p className="font-semibold tabular-nums">
            {h.litres} L{h.kind === "forecast" && <span className="font-normal text-milk/70"> ({h.lo} to {h.hi})</span>}
          </p>
          <p className="text-milk/70">
            {new Date(h.date + "T00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} ·{" "}
            {h.kind === "actual" ? "actual" : "forecast"}
          </p>
        </Tooltip>
      )}
    </div>
  );
}

/* --------------------------------------------------- horizontal bars */

export function BarList({
  data,
  format = (v) => String(v),
  color = SERIES[0],
}: {
  data: { label: string; value: number; note?: string }[];
  format?: (v: number) => string;
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-3.5">
      {data.map((d) => (
        <li key={d.label} className="group" tabIndex={0} aria-label={`${d.label}: ${format(d.value)}`}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[0.85rem]">
            <span className="truncate text-ink-2">{d.label}</span>
            <span className="flex-none font-semibold tabular-nums">{format(d.value)}</span>
          </div>
          <div className="h-2.5 w-full">
            <div
              className="h-full rounded-r-[4px] transition-opacity group-hover:opacity-80"
              style={{ width: `${(d.value / max) * 100}%`, background: color }}
            />
          </div>
          {d.note && <p className="mt-1 text-[0.75rem] text-ink-3">{d.note}</p>}
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------- segmented bar */

export function SegmentBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div>
      <div className="flex h-7 w-full gap-[2px]" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}>
        {parts.map((p, i) =>
          p.value > 0 ? (
            <div
              key={p.label}
              tabIndex={0}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className={cls("flex items-center rounded-[4px] px-2 text-[0.72rem] font-semibold text-white transition-opacity", hover !== null && hover !== i && "opacity-60")}
              style={{ width: `${(p.value / total) * 100}%`, background: p.color }}
            >
              {p.value / total > 0.12 && `${Math.round((p.value / total) * 100)}%`}
            </div>
          ) : null,
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[0.8rem] text-ink-2">
        {parts.map((p, i) => (
          <span key={p.label} className={cls("inline-flex items-center gap-2", hover === i && "font-semibold text-ink")}>
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
            {p.label} · {p.value}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------- sparkline */

export function Sparkline({
  values,
  split,
  width = 260,
  height = 70,
  stroke = "#f3d58c",
  forecastStroke = "#f0a47c",
}: {
  values: number[];
  /** index where the forecast begins */
  split?: number;
  width?: number;
  height?: number;
  stroke?: string;
  forecastStroke?: string;
}) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = (i: number) => (width * i) / (values.length - 1);
  const y = (v: number) => 4 + (height - 8) * (1 - (v - min) / (max - min || 1));
  const s = split ?? values.length;
  const a = values.slice(0, s).map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const b = values
    .slice(s - 1)
    .map((v, i) => `${i ? "L" : "M"}${x(s - 1 + i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" aria-hidden>
      <path d={a} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {split && <path d={b} fill="none" stroke={forecastStroke} strokeWidth={2} strokeDasharray="4 3" strokeLinecap="round" />}
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={4} fill={split ? forecastStroke : stroke} />
    </svg>
  );
}
