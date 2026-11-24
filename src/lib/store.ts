"use client";

import { useMemo, useSyncExternalStore } from "react";
import { products as baseProducts, type Product } from "@/data/products";
import { DB_VERSION, createSeed } from "@/data/seed";
import type { DB, User } from "@/lib/types";

/**
 * The prototype's "database": one JSON document in localStorage, seeded with
 * sample data on first visit. Every page reads it through these hooks and
 * changes it through the actions in actions.ts. In the full system the same
 * calls go to the Flask API and MySQL instead.
 */

const KEY = "ksheera-db";
let db: DB | null = null;
const listeners = new Set<() => void>();

function read(): DB {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed && parsed.version === DB_VERSION) return parsed;
    }
  } catch {
    /* private mode or corrupt data: fall through to a fresh seed */
  }
  const fresh = createSeed();
  write(fresh);
  return fresh;
}

function write(next: DB) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked: the demo keeps working in memory */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function getDB(): DB | null {
  if (typeof window === "undefined") return null;
  if (!db) db = read();
  return db;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      db = null;
      getDB();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

/** Apply a change to the store and notify every component. */
export function mutate(fn: (draft: DB) => void) {
  const current = getDB();
  if (!current) return;
  const draft = structuredClone(current);
  fn(draft);
  db = draft;
  write(draft);
  emit();
}

export function resetDemo() {
  db = createSeed();
  write(db);
  emit();
}

/** The whole store, or null during server render and the first paint. */
export function useDB(): DB | null {
  return useSyncExternalStore(subscribe, getDB, () => null);
}

export function useSession(): { user: User | null; ready: boolean } {
  const d = useDB();
  return useMemo(() => {
    if (!d) return { user: null, ready: false };
    const u = d.session ? (d.users.find((x) => x.id === d.session!.userId) ?? null) : null;
    return { user: u, ready: true };
  }, [d]);
}

export type LiveProduct = Product & { active: boolean };

/** Merge the static catalogue with admin edits (stock, prices, new products). */
export function liveCatalogue(d: DB | null): LiveProduct[] {
  const all = [...baseProducts, ...(d?.customProducts ?? [])];
  return all.map((p) => {
    const o = d?.overrides.find((x) => x.slug === p.slug);
    if (!o) return { ...p, active: true };
    return {
      ...p,
      stock: o.stock ?? p.stock,
      expiresInDays: o.expiresInDays ?? p.expiresInDays,
      variants: p.variants.map((v) => ({ ...v, price: o.prices?.[v.id] ?? v.price })),
      active: o.active ?? true,
    };
  });
}

export function useCatalogue(): LiveProduct[] {
  const d = useDB();
  return useMemo(() => liveCatalogue(d), [d]);
}

export function useProduct(slug: string): LiveProduct | undefined {
  const all = useCatalogue();
  return all.find((p) => p.slug === slug);
}

export function useCartCount() {
  const d = useDB();
  return d ? d.cart.reduce((s, l) => s + l.qty, 0) : 0;
}
