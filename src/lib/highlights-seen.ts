import { useSyncExternalStore } from "react";

const KEY = "rmp-highlights-seen";

let cache: string[] | null = null;
let listeners: Array<() => void> = [];

function read(): string[] {
  if (cache) return cache;
  if (typeof window === "undefined") return (cache = []);
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function emit() {
  listeners.forEach(l => l());
}

export function markSeen(ids: string | string[]) {
  const add = Array.isArray(ids) ? ids : [ids];
  const current = read();
  const next = [...new Set([...current, ...add])];
  if (next.length === current.length) return;
  cache = next;
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  emit();
}

function subscribe(cb: () => void) {
  listeners.push(cb);
  return () => { listeners = listeners.filter(l => l !== cb); };
}

const EMPTY: string[] = [];

/** Reactive set of highlight ids the visitor has already viewed (stored locally). */
export function useSeenHighlights(): Set<string> {
  const ids = useSyncExternalStore(subscribe, read, () => EMPTY);
  return new Set(ids);
}

/** First unseen id in the given ordered list, or null when everything is seen. */
export function firstUnseen(ids: string[], seen: Set<string>): string | null {
  return ids.find(id => !seen.has(id)) ?? null;
}
