"use client";

import Image from "next/image";
import { useId } from "react";
import type { Product } from "@/data/products";

/**
 * A product's picture: its photograph, or for products without one (ghee),
 * an illustration drawn in code in the same mood.
 */
export function ProductThumb({
  product,
  sizes = "(min-width: 1024px) 25vw, 50vw",
  priority = false,
  className = "",
}: {
  product: Pick<Product, "photo" | "name" | "focus" | "art" | "tint">;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  if (product.photo) {
    return (
      <Image
        src={product.photo}
        alt={product.name}
        fill
        sizes={sizes}
        priority={priority}
        className={`object-cover ${className}`}
        style={{ objectPosition: product.focus ?? "50% 50%" }}
      />
    );
  }
  return <GheeArt className={className} />;
}

/** A jar of granular bilona ghee on a dark wood ground, with a brass spoon. */
export function GheeArt({ className = "" }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (n: string) => `${n}-${uid}`;
  const grains = Array.from({ length: 90 }, (_, i) => {
    const a = (i * 137.5 * Math.PI) / 180;
    const r = Math.sqrt(i / 90) * 64;
    return { x: Math.round((200 + Math.cos(a) * r * 1.25) * 10) / 10, y: Math.round((236 + Math.sin(a) * r * 0.32) * 10) / 10, o: Math.round((0.25 + ((i * 7) % 10) / 22) * 100) / 100 };
  });
  return (
    <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" className={`absolute inset-0 h-full w-full ${className}`} role="img" aria-label="A glass jar of golden bilona ghee">
      <defs>
        <radialGradient id={id("g-bg")} cx="50%" cy="38%" r="75%">
          <stop offset="0" stopColor="#4a3216" />
          <stop offset="0.55" stopColor="#24170b" />
          <stop offset="1" stopColor="#120c06" />
        </radialGradient>
        <linearGradient id={id("g-ghee")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7d77e" />
          <stop offset="0.35" stopColor="#eab94a" />
          <stop offset="1" stopColor="#b87a17" />
        </linearGradient>
        <linearGradient id={id("g-glass")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.18" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="0.8" stopColor="#fff" stopOpacity="0.02" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id={id("g-wood")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b2513" />
          <stop offset="1" stopColor="#1d1209" />
        </linearGradient>
        <radialGradient id={id("g-glow")} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#f3c55a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#f3c55a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="500" fill={`url(#${id("g-bg")})`} />
      <ellipse cx="200" cy="300" rx="190" ry="150" fill={`url(#${id("g-glow")})`} />
      {/* table */}
      <rect y="392" width="400" height="108" fill={`url(#${id("g-wood")})`} />
      <path d="M0 410 C 120 404, 280 418, 400 408" stroke="#5a3a1c" strokeOpacity="0.5" fill="none" />
      <path d="M0 448 C 140 440, 260 456, 400 446" stroke="#5a3a1c" strokeOpacity="0.35" fill="none" />
      <ellipse cx="200" cy="398" rx="118" ry="14" fill="#000" opacity="0.45" />
      {/* jar body */}
      <path d="M100 188 Q100 170 118 166 H282 Q300 170 300 188 V378 Q300 398 278 398 H122 Q100 398 100 378 Z" fill={`url(#${id("g-ghee")})`} />
      {/* granular texture */}
      {grains.map((g, i) => (
        <circle key={i} cx={g.x} cy={Math.round((g.y + (i % 5) * 26) * 10) / 10} r={Math.round((1.6 + (i % 3) * 0.6) * 10) / 10} fill="#fff4cf" opacity={Math.round(g.o * 55) / 100} />
      ))}
      {/* top surface */}
      <ellipse cx="200" cy="196" rx="96" ry="14" fill="#f9e2a0" />
      <ellipse cx="200" cy="196" rx="96" ry="14" fill="none" stroke="#c98d22" strokeOpacity="0.5" />
      {/* glass */}
      <path d="M100 188 Q100 170 118 166 H282 Q300 170 300 188 V378 Q300 398 278 398 H122 Q100 398 100 378 Z" fill={`url(#${id("g-glass")})`} stroke="#fff" strokeOpacity="0.28" strokeWidth="2" />
      <path d="M114 196 V370" stroke="#fff" strokeOpacity="0.4" strokeWidth="5" strokeLinecap="round" />
      {/* neck and lid */}
      <rect x="118" y="132" width="164" height="36" rx="6" fill="#2a1a0c" />
      <rect x="112" y="118" width="176" height="22" rx="8" fill="#c9922e" />
      <rect x="112" y="118" width="176" height="8" rx="4" fill="#f0c766" opacity="0.6" />
      {/* label */}
      <rect x="138" y="262" width="124" height="70" rx="6" fill="#fbf8f1" />
      <text x="200" y="288" textAnchor="middle" fontFamily="Georgia, serif" fontSize="17" fill="#23402d">
        Bilona Ghee
      </text>
      <text x="200" y="308" textAnchor="middle" fontFamily="monospace" fontSize="8.5" letterSpacing="1.5" fill="#87620f">
        A2 · WOOD-FIRED
      </text>
      <path d="M160 318 H240" stroke="#e2d7bf" />
      {/* brass spoon */}
      <g transform="rotate(-18 330 420)">
        <ellipse cx="300" cy="430" rx="30" ry="15" fill="#d7a443" />
        <ellipse cx="300" cy="428" rx="22" ry="9" fill="#f2c24e" />
        <rect x="326" y="425" width="86" height="7" rx="3.5" fill="#c9922e" />
      </g>
    </svg>
  );
}
